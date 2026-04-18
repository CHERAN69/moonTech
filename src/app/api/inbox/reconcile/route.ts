/**
 * POST /api/inbox/reconcile
 *
 * Takes two confirmed uploads (bank + optional invoice) and runs
 * the matching engine to create a reconciliation session.
 *
 * Replaces the current file-upload-in-POST pattern of /api/reconcile.
 * Files are uploaded once to Inbox, then reconciled on demand.
 *
 * Input:  { bank_upload_id: string, invoice_upload_id?: string, name?: string }
 * Output: { session_id, stats, close_confidence_score }
 *
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runMatchingEngine } from '@/lib/matching/engine'
import { explainAnomalies } from '@/lib/openai/analyze'
import { rateLimit, getIP, API_LIMIT } from '@/lib/rate-limit'
import type { RawTransaction } from '@/types'

export async function POST(req: NextRequest) {
  const ip = getIP(req)
  const rl = rateLimit(`${ip}:/api/inbox/reconcile`, API_LIMIT)
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
    })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { bank_upload_id?: string; invoice_upload_id?: string; name?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { bank_upload_id, invoice_upload_id, name } = body

  if (!bank_upload_id) {
    return NextResponse.json({ error: 'bank_upload_id is required' }, { status: 400 })
  }

  // Fetch bank upload
  const { data: bankUpload, error: bankErr } = await supabase
    .from('uploads')
    .select('id, filename, parsed_data, classification, status, transactions_count')
    .eq('id', bank_upload_id)
    .eq('user_id', user.id)
    .single()

  if (bankErr || !bankUpload) {
    return NextResponse.json({ error: 'Bank upload not found' }, { status: 404 })
  }
  if (bankUpload.status === 'error') {
    return NextResponse.json({ error: 'Bank upload has errors and cannot be reconciled' }, { status: 400 })
  }
  if (bankUpload.classification !== 'bank_statement') {
    return NextResponse.json({ error: 'The selected file is not classified as a bank statement. Please confirm the correct file.' }, { status: 400 })
  }
  if (!bankUpload.parsed_data || (bankUpload.parsed_data as RawTransaction[]).length === 0) {
    return NextResponse.json({ error: 'Bank upload has no parsed transactions' }, { status: 400 })
  }

  // Fetch invoice upload (optional)
  type UploadRow = { id: string; filename: string; parsed_data: RawTransaction[] | null; classification: string; status: string }
  let invoiceUpload: UploadRow | null = null
  if (invoice_upload_id) {
    const { data: inv, error: invErr } = await supabase
      .from('uploads')
      .select('id, filename, parsed_data, classification, status')
      .eq('id', invoice_upload_id)
      .eq('user_id', user.id)
      .single()
    if (invErr || !inv) {
      return NextResponse.json({ error: 'Invoice upload not found' }, { status: 404 })
    }
    invoiceUpload = inv as unknown as UploadRow
  }

  const bankTransactions    = (bankUpload.parsed_data as unknown as RawTransaction[]) ?? []
  const invoiceTransactions = (invoiceUpload?.parsed_data as RawTransaction[] | null) ?? []

  // Session name
  const rawSessionName = name || bankUpload.filename.replace(/\.[^.]+$/, '')
  const sessionName = rawSessionName.slice(0, 200)
  const nameWarning = rawSessionName.length > 200 ? ['Session name was truncated to 200 characters.'] : []

  // Prevent duplicate sessions (processing or already complete)
  const { data: existingSession } = await supabase
    .from('reconciliation_sessions')
    .select('id, status, close_confidence_score, matched_count, unmatched_count, flagged_count')
    .eq('user_id', user.id)
    .eq('name', sessionName)
    .in('status', ['processing', 'complete'])
    .maybeSingle()

  if (existingSession) {
    if (existingSession.status === 'processing') {
      return NextResponse.json({ error: 'A reconciliation with this name is already processing.' }, { status: 409 })
    }
    return NextResponse.json({
      session_id:             existingSession.id,
      close_confidence_score: existingSession.close_confidence_score,
      stats: { matched: existingSession.matched_count, unmatched: existingSession.unmatched_count, flagged: existingSession.flagged_count },
      cached: true,
    })
  }

  // Build historical averages for vendor anomaly detection
  const historicalAverages = new Map<string, number>()
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
      historicalAverages.set(vendor, amounts.reduce((a, b) => a + b, 0) / amounts.length)
    }
  }

  // Run matching engine
  const matchingResult = runMatchingEngine(bankTransactions, invoiceTransactions, historicalAverages)

  // Get company name for AI context
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_name')
    .eq('id', user.id)
    .single()
  const companyName = profile?.company_name || 'your company'

  // AI explanations (non-blocking)
  let pairsWithExplanations = matchingResult.pairs
  let aiExplanationFailed = false
  try {
    pairsWithExplanations = await explainAnomalies(matchingResult.pairs, companyName)
  } catch (aiErr) {
    console.error('[inbox/reconcile] AI explanation skipped:', aiErr)
    aiExplanationFailed = true
  }

  // Determine period from transaction dates
  const allDates    = bankTransactions.map(t => t.date).filter(Boolean).sort()
  const periodStart = allDates[0]    || new Date().toISOString().split('T')[0]
  const periodEnd   = allDates[allDates.length - 1] || periodStart

  // Create session
  const { data: session, error: sessionError } = await supabase
    .from('reconciliation_sessions')
    .insert({
      user_id:                    user.id,
      name:                       sessionName,
      period_start:               periodStart,
      period_end:                 periodEnd,
      status:                     'processing',
      close_confidence_score:     matchingResult.close_confidence_score,
      total_bank_transactions:    bankTransactions.length,
      total_invoice_transactions: invoiceTransactions.length,
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
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }

  // Insert match pairs in batches
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
  const insertErrors: string[] = []

  for (let i = 0; i < pairRows.length; i += BATCH_SIZE) {
    const { error: insertError } = await supabase
      .from('match_pairs')
      .insert(pairRows.slice(i, i + BATCH_SIZE))
    if (insertError) insertErrors.push(insertError.message)
  }

  // Update session status — if pairs failed to insert, surface as HTTP 500
  const finalStatus = insertErrors.length > 0 ? 'error' : 'complete'
  await supabase
    .from('reconciliation_sessions')
    .update({ status: finalStatus })
    .eq('id', session.id)

  if (insertErrors.length > 0) {
    return NextResponse.json({
      error: `Reconciliation session created but ${insertErrors.length} batch(es) failed to save. Please try again.`,
      session_id: session.id,
      warnings:   insertErrors,
    }, { status: 500 })
  }

  // Link uploads to session
  const uploadIds = [bank_upload_id, invoice_upload_id].filter(Boolean) as string[]
  await supabase
    .from('uploads')
    .update({ session_id: session.id, status: 'confirmed' })
    .in('id', uploadIds)

  // Unconditionally upsert vendor mappings (8.7 fix)
  const vendorMappings = bankTransactions
    .filter(t => t.vendor)
    .map(t => ({
      user_id:        user.id,
      raw_name:       t.vendor!,
      canonical_name: t.vendor!.toLowerCase().trim(),
      confidence:     80,
    }))
  if (vendorMappings.length > 0) {
    await supabase.from('vendor_mappings').upsert(vendorMappings, {
      onConflict: 'user_id,raw_name',
      ignoreDuplicates: true,
    })
  }

  // Audit
  await supabase.from('audit_log').insert({
    user_id:     user.id,
    entity_type: 'reconciliation_session',
    entity_id:   session.id,
    action:      'created_from_inbox',
    changes: {
      name:                   sessionName,
      bank_upload_id,
      invoice_upload_id:      invoice_upload_id || null,
      close_confidence_score: matchingResult.close_confidence_score,
      matched:                matchingResult.stats.matched,
      unmatched:              matchingResult.stats.unmatched,
      pair_insert_errors:     insertErrors.length,
    },
    ai_involved: pairsWithExplanations.some(p => p.explanation),
    ip_address:  ip,
  })

  const warnings = [
    ...nameWarning,
    ...(aiExplanationFailed ? ['AI explanations unavailable — OpenAI API error. Exceptions will have no AI analysis.'] : []),
  ]

  return NextResponse.json({
    session_id:             session.id,
    close_confidence_score: matchingResult.close_confidence_score,
    stats:                  matchingResult.stats,
    warnings,
    status:                 finalStatus,
  })
}
