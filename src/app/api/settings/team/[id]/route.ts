import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit, getIP, API_LIMIT } from '@/lib/rate-limit'
import { requireRole } from '@/lib/rbac'
import { z } from 'zod'

const ChangeRoleSchema = z.object({
  role: z.enum(['admin', 'reviewer', 'viewer']),
})

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const ip = getIP(req)
  const rl = rateLimit(`${ip}:/api/settings/team/[id]:PATCH`, API_LIMIT)
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rbac = await requireRole(supabase, user.id, 'admin')
  if (rbac) return rbac

  // Prevent admins from modifying owners
  const { data: target } = await supabase.from('profiles').select('role').eq('id', id).single()
  if (target?.role === 'owner') {
    return NextResponse.json({ error: 'Cannot modify the account owner role' }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parse = ChangeRoleSchema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.issues[0].message }, { status: 422 })
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: parse.data.role })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('audit_log').insert({
    user_id:     user.id,
    entity_type: 'profile',
    entity_id:   id,
    action:      'team_member_role_changed',
    changes:     { role: parse.data.role },
    ai_involved: false,
    ip_address:  getIP(req),
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const ip = getIP(req)
  const rl = rateLimit(`${ip}:/api/settings/team/[id]:DELETE`, API_LIMIT)
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rbac = await requireRole(supabase, user.id, 'admin')
  if (rbac) return rbac

  if (id === user.id) {
    return NextResponse.json({ error: 'You cannot remove yourself' }, { status: 400 })
  }

  const { data: target } = await supabase.from('profiles').select('role, email').eq('id', id).single()
  if (target?.role === 'owner') {
    return NextResponse.json({ error: 'Cannot remove the account owner' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { error: deleteErr } = await admin.auth.admin.deleteUser(id)
  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 })

  await supabase.from('audit_log').insert({
    user_id:     user.id,
    entity_type: 'profile',
    entity_id:   id,
    action:      'team_member_removed',
    changes:     { email: target?.email },
    ai_involved: false,
    ip_address:  ip,
  })

  return NextResponse.json({ success: true })
}
