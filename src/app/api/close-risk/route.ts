import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getIP, AI_LIMIT } from '@/lib/rate-limit'
import { predictCloseRisk } from '@/lib/openai/analyze'

export async function GET(req: NextRequest) {
  const ip = getIP(req)
  const rl = rateLimit(`${ip}:/api/close-risk`, AI_LIMIT)
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch all metrics in parallel
  const [checklistResult, unmatchedResult, pendingJournalsResult, sessionsResult] = await Promise.all([
    supabase
      .from('close_checklists')
      .select('tasks, period_end')
      .eq('user_id', user.id)
      .order('period_end', { ascending: false })
      .limit(1),
    supabase
      .from('match_pairs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['unmatched', 'flagged'])
      .is('resolution', null),
    supabase
      .from('journal_entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['draft', 'pending_approval']),
    supabase
      .from('reconciliation_sessions')
      .select('matched_count')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(6),
  ])

  // Compute daysRemaining
  let daysRemaining = 7
  if (checklistResult.data && checklistResult.data.length > 0) {
    const periodEnd = checklistResult.data[0].period_end
    if (periodEnd) {
      const endDate = new Date(periodEnd + 'T00:00:00')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      daysRemaining = Math.max(0, Math.round((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
    }
  }

  // Compute checklistProgress
  let checklistProgress = 0
  if (checklistResult.data && checklistResult.data.length > 0) {
    const tasks = checklistResult.data[0].tasks as Array<{ status: string }> | null
    if (tasks && tasks.length > 0) {
      const complete = tasks.filter(t => t.status === 'complete').length
      checklistProgress = Math.round((complete / tasks.length) * 100)
    }
  }

  // Compute historicalCloseDays (matched_count values from last 6 sessions)
  const historicalCloseDays: number[] = []
  if (sessionsResult.data) {
    for (const s of sessionsResult.data) {
      if (typeof s.matched_count === 'number') {
        historicalCloseDays.push(s.matched_count)
      }
    }
  }

  const unmatchedCount = unmatchedResult.count ?? 0
  const pendingJournals = pendingJournalsResult.count ?? 0

  try {
    const result = await predictCloseRisk({
      daysRemaining,
      unmatchedCount,
      pendingJournals,
      checklistProgress,
      historicalCloseDays,
    })
    return NextResponse.json(result)
  } catch (err) {
    console.error('predictCloseRisk error:', err)
    return NextResponse.json({ error: 'Failed to compute close risk' }, { status: 500 })
  }
}
