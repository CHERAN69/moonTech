import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const entityType = searchParams.get('entity_type')
  const action     = searchParams.get('action')
  const dateFrom   = searchParams.get('date_from')
  const dateTo     = searchParams.get('date_to')
  const entityId   = searchParams.get('entity_id')
  const limit      = parseInt(searchParams.get('limit') || '100')
  const offset     = parseInt(searchParams.get('offset') || '0')

  let query = supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (entityType) query = query.eq('entity_type', entityType)
  if (action)     query = query.eq('action', action)
  if (entityId)   query = query.eq('entity_id', entityId)
  if (dateFrom)   query = query.gte('created_at', dateFrom)
  if (dateTo)     query = query.lte('created_at', dateTo + 'T23:59:59Z')

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ entries: data ?? [], total: count ?? 0 })
}
