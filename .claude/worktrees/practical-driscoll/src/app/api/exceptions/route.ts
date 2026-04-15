import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getIP, API_LIMIT } from '@/lib/rate-limit'
import { sanitizeSearch } from '@/lib/validation'

export async function GET(req: NextRequest) {
  // Rate limiting
  const ip = getIP(req)
  const rl = rateLimit(`${ip}:/api/exceptions`, API_LIMIT)
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) }
    })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status     = searchParams.get('status')
  const resolution = searchParams.get('resolution')
  const sessionId  = searchParams.get('session_id')
  const rawSearch  = searchParams.get('search') || ''
  const limit      = Math.min(Math.max(parseInt(searchParams.get('limit')  || '50'), 1), 200)
  const offset     = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

  // Sanitise search to prevent PostgREST filter injection (audit issue S-2.1)
  const search = sanitizeSearch(rawSearch)

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

  // Safe parameterised ILIKE — Supabase handles escaping for column values
  if (search) {
    query = query.or(
      `bank_transaction->>description.ilike.%${search}%,bank_transaction->>vendor.ilike.%${search}%`
    )
  }

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    exceptions: data ?? [],
    total: count ?? 0,
    limit,
    offset,
    hasMore: (count ?? 0) > offset + limit,
  })
}
