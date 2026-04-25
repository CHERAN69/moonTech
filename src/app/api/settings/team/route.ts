import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit, getIP, API_LIMIT } from '@/lib/rate-limit'
import { requireRole } from '@/lib/rbac'
import { InviteTeamMemberSchema } from '@/lib/validation'

export async function GET(req: NextRequest) {
  const ip = getIP(req)
  const rl = rateLimit(`${ip}:/api/settings/team:GET`, API_LIMIT)
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rbac = await requireRole(supabase, user.id, 'admin')
  if (rbac) return rbac

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, subscription_tier, created_at')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ members: data ?? [] })
}

export async function POST(req: NextRequest) {
  const ip = getIP(req)
  const rl = rateLimit(`${ip}:/api/settings/team:POST`, API_LIMIT)
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rbac = await requireRole(supabase, user.id, 'admin')
  if (rbac) return rbac

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parse = InviteTeamMemberSchema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.issues[0].message }, { status: 422 })
  }

  const admin = createAdminClient()

  // Send magic-link invite — creates user + sends email
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    parse.data.email,
    { data: { role: parse.data.role, invited_by: user.id } }
  )

  if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 500 })

  // Pre-create their profile with the assigned role
  if (invited?.user?.id) {
    await admin.from('profiles').upsert({
      id:    invited.user.id,
      email: parse.data.email,
      role:  parse.data.role,
    }, { onConflict: 'id' })
  }

  await supabase.from('audit_log').insert({
    user_id:     user.id,
    entity_type: 'profile',
    entity_id:   invited?.user?.id ?? 'pending',
    action:      'team_member_invited',
    changes:     { email: parse.data.email, role: parse.data.role },
    ai_involved: false,
    ip_address:  ip,
  })

  return NextResponse.json({ success: true, invited: parse.data.email }, { status: 201 })
}
