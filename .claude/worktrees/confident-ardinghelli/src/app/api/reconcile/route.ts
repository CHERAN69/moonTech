import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runMatchingEngine } from '@/lib/matching/engine'
import { parseCSV } from '@/lib/matching/csv-parser'
import { explainAnomalies } from '@/lib/openai/analyze'
import { RawTransaction } from '@/types'
import { writeAuditLog } from '@/lib/supabase/audit'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const bankFile = formData.get('bank') as File | null
  const invoiceFile = formData.get('invoice') as File | null
  const name = formData.get('name') as string || 'Reconciliation'

  if (!bankFile) return NextResponse.json({ error: 'Bank file required' }, { status: 400 })

  // Parse CSV files
  const bankResult = await parseCSV(bankFile)
  const invoiceResult = invoiceFile ? await parseCSV(invoiceFile) : null

  if (bankResult.errors.length > 0) {
    return NextResponse.json({ error: bankResult.errors[0] }, { status: 400 })
  }

  // Run matching engine
  const matchingResult = runMatchingEngine(
    bankResult.transactions,
    invoiceResult?.transactions || [],
  )

  // AI layer: explain anomalies for flagged/unmatched pairs
  // Fetch company profile for context
  const { data: profile } = await supabase.from('profiles').select('company_name').eq('id', user.id).single()
  const companyName = profile?.company_name || 'your company'

  const pairsWithExplanations = await explainAnomalies(matchingResult.pairs, companyName)

  // Determine period from transaction dates
  const allDates = bankResult.transactions.map(t => t.date).sort()
  const periodStart = allDates[0]
  const periodEnd = allDates[allDates.length - 1]

  // Save to Supabase
  const { data: session, error: sessionError } = await supabase
    .from('reconciliation_sessions')
    .insert({
      user_id: user.id,
      name,
      period_start: periodStart,
      period_end: periodEnd,
      status: 'complete',
      close_confidence_score: matchingResult.close_confidence_score,
      total_bank_transactions: bankResult.transactions.length,
      total_invoice_transactions: invoiceResult?.transactions.length || 0,
      matched_count: matchingResult.stats.matched,
      unmatched_count: matchingResult.stats.unmatched,
      flagged_count: matchingResult.stats.flagged,
      duplicate_count: matchingResult.stats.duplicates,
      total_matched_amount: matchingResult.stats.total_matched_amount,
      total_unmatched_amount: matchingResult.stats.total_unmatched_amount,
    })
    .select()
    .single()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Failed to save session' }, { status: 500 })
  }

  // Save pairs (batch insert)
  const pairRows = pairsWithExplanations.map(p => ({
    session_id: session.id,
    user_id: user.id,
    bank_transaction: p.bank_transaction,
    invoice_transaction: p.invoice_transaction || null,
    status: p.status,
    confidence: p.confidence,
    match_method: p.match_method,
    explanation: p.explanation || null,
    suggested_action: p.suggested_action || null,
    gl_category: p.gl_category || null,
    flags: p.flags,
  }))

  await supabase.from('match_pairs').insert(pairRows)

  // Audit: session created
  await writeAuditLog({
    supabase,
    userId:     user.id,
    userEmail:  user.email,
    entityType: 'reconciliation_session',
    entityId:   session.id,
    action:     'created',
    changes: {
      name,
      period_start: periodStart,
      period_end:   periodEnd,
      status:       'complete',
      close_confidence_score: matchingResult.close_confidence_score,
    },
    aiInvolved: true,
  })

  return NextResponse.json({
    session_id: session.id,
    close_confidence_score: matchingResult.close_confidence_score,
    stats: matchingResult.stats,
  })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('reconciliation_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ sessions: data || [] })
}
