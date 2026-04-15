import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getIP, AI_LIMIT } from '@/lib/rate-limit'
import { generateCFOBriefing } from '@/lib/openai/analyze'

export async function POST(req: NextRequest) {
  const ip = getIP(req)
  const rl = rateLimit(`${ip}:/api/cfo-briefing`, AI_LIMIT)
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) }
    })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().slice(0, 10)

  // Return cached briefing if generated today
  const { data: cached } = await supabase
    .from('cfo_briefings')
    .select('*')
    .eq('user_id', user.id)
    .eq('briefing_date', today)
    .maybeSingle()

  if (cached) {
    return NextResponse.json({ briefing: cached, cached: true })
  }

  // Gather real metrics
  const [profileResult, sessionsResult, anomaliesResult, journalResult] = await Promise.all([
    supabase.from('profiles').select('company_name').eq('id', user.id).single(),
    supabase
      .from('reconciliation_sessions')
      .select('close_confidence_score, total_unmatched_amount, total_matched_amount')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('match_pairs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['unmatched', 'flagged', 'duplicate'])
      .is('resolution', null),
    supabase
      .from('journal_entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['draft', 'pending_approval']),
  ])

  const companyName      = profileResult.data?.company_name || 'your company'
  const latestSession    = sessionsResult.data?.[0]
  const openAnomalies    = anomaliesResult.count ?? 0
  const unmatchedTotal   = latestSession?.total_unmatched_amount ?? 0
  const closeConfidence  = latestSession?.close_confidence_score ?? 0
  const pendingJournals  = journalResult.count ?? 0

  // Days since last session
  const daysSinceLastClose = 0 // Requires created_at — add if needed

  const metrics = {
    cashPosition:       0,  // Requires bank feed integration
    monthlyBurn:        0,  // Requires bank feed integration
    runwayMonths:       0,
    openAnomalies,
    unmatchedTotal,
    arAging:            0,
    apAging:            0,
    closeConfidence,
    daysSinceLastClose,
  }

  const briefingData = await generateCFOBriefing(companyName, metrics)

  // Cache in DB (upsert to handle race conditions)
  const { data: saved, error } = await supabase
    .from('cfo_briefings')
    .upsert({
      user_id:          user.id,
      briefing_date:    today,
      headline:         briefingData.headline,
      bullets:          briefingData.bullets,
      actions:          briefingData.recommended_actions,
      risk_alerts:      briefingData.risk_alerts,
      metrics_snapshot: metrics,
    }, { onConflict: 'user_id,briefing_date' })
    .select()
    .single()

  if (error) {
    // Non-fatal — return briefing even if caching failed
    console.error('CFO briefing cache error:', error)
    return NextResponse.json({ briefing: briefingData, cached: false })
  }

  await supabase.from('audit_log').insert({
    user_id:     user.id,
    entity_type: 'cfo_briefing',
    entity_id:   saved.id,
    action:      'ai_cfo_briefing_generated',
    changes:     { briefing_date: today },
    ai_involved: true,
    ip_address:  ip,
  })

  return NextResponse.json({ briefing: saved, cached: false })
}
