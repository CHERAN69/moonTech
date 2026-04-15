import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runMatchingEngine } from '@/lib/matching/engine'
import { parseFile, validateFile } from '@/lib/matching/file-parser'
import { explainAnomalies } from '@/lib/openai/analyze'
import { rateLimit, getIP, API_LIMIT } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const ip = getIP(req)
  const rl = rateLimit(`${ip}:/api/reconcile`, API_LIMIT)
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const bankFile    = formData.get('bank')    as File | null
  const invoiceFile = formData.get('invoice') as File | null
  const name        = (formData.get('name') as string || 'Reconciliation').slice(0, 200)

  if (!bankFile) return NextResponse.json({ error: 'Bank file required' }, { status: 400 })

  // Server-side file validation (fixes audit issue S3-2)
  const bankValidationError = validateFile(bankFile)
  if (bankValidationError) return NextResponse.json({ error: bankValidationError }, { status: 400 })

  if (invoiceFile) {
    const invValidationError = validateFile(invoiceFile)
    if (invValidationError) return NextResponse.json({ error: invValidationError }, { status: 400 })
  }

  // Idempotency: check for in-progress session with same name to prevent double-click duplicates
  const { data: existingSession } = await supabase
    .from('reconciliation_sessions')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('name', name)
    .eq('status', 'processing')
    .maybeSingle()

  if (existingSession) {
    return NextResponse.json({ error: 'A reconciliation with this name is already processing.' }, { status: 409 })
  }

  // Parse files (CSV or XLSX)
  const bankResult    = await parseFile(bankFile)
  const invoiceResult = invoiceFile ? await parseFile(invoiceFile) : null

  if (bankResult.errors.length > 0) {
    return NextResponse.json({ error: bankResult.errors[0], warnings: bankResult.warnings }, { status: 400 })
  }

  // Fetch historical averages for vendor anomaly detection (fixes audit issue S3-6)
  const { data: vendorMappings } = await supabase
    .from('vendor_mappings')
    .select('canonical_name, gl_category')
    .eq('user_id', user.id)

  const historicalAverages = new Map<string, number>()
  // Derive averages from the last 90 days of matched pairs for this user
  const { data: recentPairs } = await supabase
    .from('match_pairs')
    .select('bank_transaction')
    .eq('user_id', user.id)
    .eq('status', 'matched')
    .gte('created_at', new Date(Date.now() - 90 * 86_400_000).toISOString())
    .limit(500)

  if (recentPairs) {
    const vendorAmounts = new Map<string, number[]>()
    for (const pair of recentPairs) {
      const tx     = pair.bank_transaction as { vendor?: string; description?: string; amount?: number }
      const vendor = (tx.vendor || tx.description || '').toLowerCase().trim()
      const amt    = tx.amount || 0
      if (vendor && amt > 0) {
        if (!vendorAmounts.has(vendor)) vendorAmounts.set(vendor, [])
        vendorAmounts.get(vendor)!.push(amt)
      }
    }
    for (const [vendor, amounts] of vendorAmounts) {
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length
      historicalAverages.set(vendor, avg)
    }
  }

  // Run matching engine with real historical averages
  const matchingResult = runMatchingEngine(
    bankResult.transactions,
    invoiceResult?.transactions || [],
    historicalAverages,
  )

  // Get company name for AI context
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_name')
    .eq('id', user.id)
    .single()
  const companyName = profile?.company_name || 'your company'

  let pairsWithExplanations = matchingResult.pairs
  try {
    pairsWithExplanations = await explainAnomalies(matchingResult.pairs, companyName)
  } catch (aiErr) {
    console.error('[reconcile] AI explanation skipped:', aiErr)
    // Continue without AI explanations rather than failing the whole request
  }

  // Determine period from transaction dates
  const allDates   = bankResult.transactions.map(t => t.date).sort()
  const periodStart = allDates[0]
  const periodEnd   = allDates[allDates.length - 1]

  // Create session first
  const { data: session, error: sessionError } = await supabase
    .from('reconciliation_sessions')
    .insert({
      user_id:                    user.id,
      name,
      period_start:               periodStart,
      period_end:                 periodEnd,
      status:                     'processing',
      close_confidence_score:     matchingResult.close_confidence_score,
      total_bank_transactions:    bankResult.transactions.length,
      total_invoice_transactions: invoiceResult?.transactions.length || 0,
      matched_count:              matchingResult.stats.matched,
      unmatched_count:            matchingResult.stats.unmatched,
      flagged_count:              matchingResult.stats.flagged,
      duplicate_count:            matchingResult.stats.duplicates,
      total_matched_amount:       matchingResult.stats.total_matched_amount,
      total_unmatched_amount:     matchingResult.stats.total_unmatched_amount,
    })
    .select()
    .single()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Failed to save session' }, { status: 500 })
  }

  // Insert match pairs with proper error handling (fixes audit issue S3-4)
  const pairRows = pairsWithExplanations.map(p => ({
    session_id:          session.id,
    user_id:             user.id,
    bank_transaction:    p.bank_transaction,
    invoice_transaction: p.invoice_transaction || null,
    status:              p.status,
    confidence:          p.confidence,
    match_method:        p.match_method,
    explanation:         p.explanation || null,
    suggested_action:    p.suggested_action || null,
    gl_category:         p.gl_category || null,
    flags:               p.flags,
  }))

  const BATCH_SIZE = 100
  let insertedCount = 0
  const insertErrors: string[] = []

  for (let i = 0; i < pairRows.length; i += BATCH_SIZE) {
    const batch = pairRows.slice(i, i + BATCH_SIZE)
    const { error: insertError } = await supabase.from('match_pairs').insert(batch)
    if (insertError) {
      insertErrors.push(insertError.message)
    } else {
      insertedCount += batch.length
    }
  }

  // Update session status based on insert results
  const finalStatus = insertErrors.length > 0 && insertedCount === 0 ? 'error' : 'complete'
  await supabase
    .from('reconciliation_sessions')
    .update({ status: finalStatus })
    .eq('id', session.id)

  // Update vendor mappings for future historical averages
  if (vendorMappings && bankResult.transactions.length > 0) {
    const newMappings = bankResult.transactions
      .filter(t => t.vendor)
      .map(t => ({
        user_id:        user.id,
        raw_name:       t.vendor!,
        canonical_name: t.vendor!.toLowerCase().trim(),
        confidence:     80,
      }))
    if (newMappings.length > 0) {
      await supabase.from('vendor_mappings').upsert(newMappings, {
        onConflict: 'user_id,raw_name',
        ignoreDuplicates: true,
      })
    }
  }

  // Audit
  await supabase.from('audit_log').insert({
    user_id:     user.id,
    entity_type: 'reconciliation_session',
    entity_id:   session.id,
    action:      'created',
    changes: {
      name,
      close_confidence_score: matchingResult.close_confidence_score,
      matched: matchingResult.stats.matched,
      unmatched: matchingResult.stats.unmatched,
      flagged: matchingResult.stats.flagged,
      pair_insert_errors: insertErrors.length,
    },
    ai_involved: pairsWithExplanations.some(p => p.explanation),
    ip_address:  ip,
  })

  return NextResponse.json({
    session_id:             session.id,
    close_confidence_score: matchingResult.close_confidence_score,
    stats:                  matchingResult.stats,
    warnings:               [...(bankResult.warnings || []), ...insertErrors],
  })
}

export async function GET(req: NextRequest) {
  const ip = getIP(req)
  const rl = rateLimit(`${ip}:/api/reconcile`, API_LIMIT)
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit  = Math.min(parseInt(searchParams.get('limit')  || '20'), 100)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

  const { data, count } = await supabase
    .from('reconciliation_sessions')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  return NextResponse.json({ sessions: data || [], total: count ?? 0, limit, offset })
}
