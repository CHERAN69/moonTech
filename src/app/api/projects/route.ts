import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getIP, API_LIMIT } from '@/lib/rate-limit'

function classifyProject(session: {
  status: string
  matched_count: number | null
  unmatched_count: number | null
  flagged_count: number | null
}): 'new' | 'in_process' | 'completed' {
  const matched   = session.matched_count   ?? 0
  const unmatched = session.unmatched_count ?? 0
  const flagged   = session.flagged_count   ?? 0
  const total = matched + unmatched + flagged

  if (total === 0) return 'new'
  if (unmatched === 0 && flagged === 0) return 'completed'
  return 'in_process'
}

export async function GET(req: NextRequest) {
  const ip = getIP(req)
  const rl = rateLimit(`${ip}:/api/projects`, API_LIMIT)
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('reconciliation_sessions')
    .select('id, name, period_start, period_end, status, matched_count, unmatched_count, flagged_count, total_bank_transactions, total_invoice_transactions, close_confidence_score, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const sessions = (data ?? []).map(s => ({
    ...s,
    project_status: classifyProject(s),
  }))

  return NextResponse.json({
    new:        sessions.filter(s => s.project_status === 'new'),
    in_process: sessions.filter(s => s.project_status === 'in_process'),
    completed:  sessions.filter(s => s.project_status === 'completed'),
  })
}
