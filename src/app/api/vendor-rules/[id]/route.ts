import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getIP, API_LIMIT } from '@/lib/rate-limit'

// PATCH /api/vendor-rules/[id] — update a rule (toggle auto_approve, change threshold)
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const ip = getIP(req)
  const rl = rateLimit(`${ip}:/api/vendor-rules/[id]:PATCH`, API_LIMIT)
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const updates: Record<string, unknown> = {}

  if (typeof b.auto_approve === 'boolean') updates.auto_approve = b.auto_approve
  if (typeof b.auto_approve_threshold === 'number') updates.auto_approve_threshold = b.auto_approve_threshold
  if (typeof b.vendor_pattern === 'string' && b.vendor_pattern.trim()) updates.vendor_pattern = b.vendor_pattern.trim()
  if (typeof b.gl_category === 'string' && b.gl_category.trim()) updates.gl_category = b.gl_category.trim()

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 422 })
  }

  const { data, error } = await supabase
    .from('vendor_rules')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Rule not found' }, { status: 404 })

  return NextResponse.json({ rule: data })
}

// DELETE /api/vendor-rules/[id] — delete a rule
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const ip = getIP(req)
  const rl = rateLimit(`${ip}:/api/vendor-rules/[id]:DELETE`, API_LIMIT)
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('vendor_rules')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
