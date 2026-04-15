/**
 * GET /api/inbox/count
 *
 * Returns the count of unclassified / needs-attention uploads for the
 * current user. Used by the Sidebar badge.
 *
 * Response: { unclassified: number, total: number }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getIP, API_LIMIT } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  const ip = getIP(req)
  const rl = rateLimit(`${ip}:/api/inbox/count`, API_LIMIT)
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Count items that are processing or classified (need action) but not yet confirmed
  const { count: unclassified } = await supabase
    .from('uploads')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .in('status', ['processing', 'classified'])

  const { count: total } = await supabase
    .from('uploads')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  return NextResponse.json({
    unclassified: unclassified ?? 0,
    total:        total        ?? 0,
  })
}
