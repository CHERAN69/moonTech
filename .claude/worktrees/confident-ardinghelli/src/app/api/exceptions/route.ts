import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status     = searchParams.get('status')     // unmatched|flagged|duplicate|suggested
  const resolution = searchParams.get('resolution') // pending|approved|rejected|edited|resolved
  const sessionId  = searchParams.get('session_id')
  const search     = searchParams.get('search')
  const limit      = parseInt(searchParams.get('limit') || '100')
  const offset     = parseInt(searchParams.get('offset') || '0')

  let query = supabase
    .from('match_pairs')
    .select(`
      *,
      reconciliation_sessions ( name, period_start, period_end )
    `, { count: 'exact' })
    .eq('user_id', user.id)
    .in('status', status ? [status] : ['unmatched', 'flagged', 'duplicate', 'suggested'])
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (sessionId) query = query.eq('session_id', sessionId)

  if (resolution === 'pending') {
    query = query.is('resolution', null)
  } else if (resolution && resolution !== 'all') {
    query = query.eq('resolution', resolution)
  }

  if (search) {
    query = query.or(
      `bank_transaction->>description.ilike.%${search}%,bank_transaction->>vendor.ilike.%${search}%`
    )
  }

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ exceptions: data ?? [], total: count ?? 0 })
}
