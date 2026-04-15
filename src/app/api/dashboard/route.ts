import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getIP, API_LIMIT } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  const ip = getIP(req)
  const rl = rateLimit(`${ip}:/api/dashboard`, API_LIMIT)
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Run all queries in parallel for performance; each wrapped in try/catch for partial failure resilience
  const [
    sessionsResult,
    journalCountResult,
    anomaliesResult,
    checklistResult,
    briefingResult,
    profileResult,
  ] = await Promise.all([
    // Latest reconciliation sessions
    (async () => {
      try {
        return await supabase
          .from('reconciliation_sessions')
          .select('close_confidence_score, matched_count, unmatched_count, flagged_count, total_matched_amount, total_unmatched_amount, created_at, name, period_start, period_end, status')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)
      } catch { return { data: null, error: null, count: null } }
    })(),

    // Pending journal entries
    (async () => {
      try {
        return await supabase
          .from('journal_entries')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .in('status', ['draft', 'pending_approval'])
      } catch { return { data: null, error: null, count: null } }
    })(),

    // Open anomalies
    (async () => {
      try {
        return await supabase
          .from('match_pairs')
          .select('id, bank_transaction', { count: 'exact' })
          .eq('user_id', user.id)
          .in('status', ['unmatched', 'flagged', 'duplicate'])
          .is('resolution', null)
          .limit(100)
      } catch { return { data: null, error: null, count: null } }
    })(),

    // Latest close checklist
    (async () => {
      try {
        return await supabase
          .from('close_checklists')
          .select('tasks, signed_off, period_start, period_end')
          .eq('user_id', user.id)
          .order('period_end', { ascending: false })
          .limit(1)
      } catch { return { data: null, error: null, count: null } }
    })(),

    // Today's CFO briefing (cached)
    (async () => {
      try {
        return await supabase
          .from('cfo_briefings')
          .select('headline, bullets, recommended_actions, risk_alerts, metrics_snapshot')
          .eq('user_id', user.id)
          .eq('briefing_date', new Date().toISOString().slice(0, 10))
          .maybeSingle()
      } catch { return { data: null, error: null } }
    })(),

    // User profile for company name
    (async () => {
      try {
        return await supabase
          .from('profiles')
          .select('company_name, subscription_tier')
          .eq('id', user.id)
          .single()
      } catch { return { data: null, error: null } }
    })(),
  ])

  const sessions         = sessionsResult.data     ?? []
  const pendingJournals  = journalCountResult.count ?? 0
  const openAnomalies    = anomaliesResult.count    ?? 0
  const openAnomalyData  = anomaliesResult.data     ?? []
  const checklist        = checklistResult.data?.[0] ?? null

  // Derive close confidence from latest session
  const latestSession    = sessions[0]
  const closeConfidence  = latestSession?.close_confidence_score ?? 0

  // Compute unmatched total from anomaly data
  const unmatchedTotal = openAnomalyData.reduce((sum: number, p: { bank_transaction: { amount?: number } }) => {
    return sum + (p.bank_transaction?.amount ?? 0)
  }, 0)

  // Close checklist score
  let checklistScore = 0
  if (checklist?.tasks) {
    const tasks = checklist.tasks as Array<{ status: string }>
    const done  = tasks.filter(t => t.status === 'complete').length
    checklistScore = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0
  }

  // Days since last close
  const daysSinceLastClose = latestSession
    ? Math.floor((Date.now() - new Date(latestSession.created_at).getTime()) / 86_400_000)
    : 999

  const metrics = {
    close_confidence_score: closeConfidence,
    open_anomalies:         openAnomalies,
    pending_journal_entries: pendingJournals,
    unmatched_total:        unmatchedTotal,
    days_since_last_close:  daysSinceLastClose,
    checklist_score:        checklistScore,
    checklist_signed_off:   checklist?.signed_off ?? false,
    // Financial metrics — sourced from profile/external integration
    // These fields are placeholders until bank feed integration is live.
    // They can be populated via the Plaid/bank API integration.
    cash_position:          null,
    monthly_burn:           null,
    runway_months:          null,
    ar_aging_total:         0,
    ap_aging_total:         0,
  }

  return NextResponse.json({
    metrics,
    sessions: sessions.slice(0, 5),
    cfo_briefing: briefingResult.data ?? null,
    profile: profileResult.data,
  })
}
