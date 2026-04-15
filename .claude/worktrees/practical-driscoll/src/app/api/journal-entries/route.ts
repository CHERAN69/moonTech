import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getIP, API_LIMIT } from '@/lib/rate-limit'
import { requireRole } from '@/lib/rbac'
import { CreateJournalEntrySchema } from '@/lib/validation'

export async function GET(req: NextRequest) {
  const ip = getIP(req)
  const rl = rateLimit(`${ip}:/api/journal-entries`, API_LIMIT)
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status    = searchParams.get('status')    // draft|pending_approval|approved|posted|rejected
  const sessionId = searchParams.get('session_id')
  const limit     = Math.min(parseInt(searchParams.get('limit')  || '50'), 200)
  const offset    = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

  let query = supabase
    .from('journal_entries')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)
  if (sessionId) query = query.eq('session_id', sessionId)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ entries: data ?? [], total: count ?? 0, limit, offset })
}

export async function POST(req: NextRequest) {
  const ip = getIP(req)
  const rl = rateLimit(`${ip}:/api/journal-entries`, API_LIMIT)
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // At minimum reviewer to create journal entries
  const rbac = await requireRole(supabase, user.id, 'reviewer')
  if (rbac) return rbac

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parse = CreateJournalEntrySchema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.issues[0].message }, { status: 422 })
  }

  const { data, error } = await supabase
    .from('journal_entries')
    .insert({
      ...parse.data,
      user_id:    user.id,
      status:     'draft',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Audit log
  await supabase.from('audit_log').insert({
    user_id:     user.id,
    entity_type: 'journal_entry',
    entity_id:   data.id,
    action:      'created',
    changes:     parse.data,
    ai_involved: parse.data.ai_generated ?? false,
    ip_address:  getIP(req),
  })

  return NextResponse.json({ entry: data }, { status: 201 })
}
