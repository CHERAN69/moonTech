import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getIP, API_LIMIT } from '@/lib/rate-limit'
import { requireRole } from '@/lib/rbac'
import { InviteTeamMemberSchema } from '@/lib/validation'

export async function GET(req: NextRequest) {
  const ip = getIP(req)
  const rl = rateLimit(`${ip}:/api/settings/team`, API_LIMIT)
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch profiles in the same organization (same Supabase project = same auth.users table)
  // In a multi-tenant setup this would filter by org_id; for MVP we return all profiles
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, subscription_tier, created_at')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ members: data ?? [] })
}

export async function POST(req: NextRequest) {
  const ip = getIP(req)
  const rl = rateLimit(`${ip}:/api/settings/team`, API_LIMIT)
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only admin+ can invite
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

  // Send Supabase magic-link invite (creates user + sends email)
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(parse.data.email, {
    data: { role: parse.data.role, invited_by: user.id },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('audit_log').insert({
    user_id:     user.id,
    entity_type: 'profile',
    entity_id:   data.user?.id ?? 'pending',
    action:      'team_member_invited',
    changes:     { email: parse.data.email, role: parse.data.role },
    ai_involved: false,
    ip_address:  ip,
  })

  return NextResponse.json({ success: true, invited: parse.data.email }, { status: 201 })
}
