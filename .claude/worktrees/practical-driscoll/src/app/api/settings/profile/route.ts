import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getIP, API_LIMIT } from '@/lib/rate-limit'
import { UpdateProfileSchema } from '@/lib/validation'

export async function GET(req: NextRequest) {
  const ip = getIP(req)
  const rl = rateLimit(`${ip}:/api/settings/profile`, API_LIMIT)
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, company_name, role, subscription_tier, subscription_status, industry, fiscal_year_end, base_currency')
    .eq('id', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}

export async function PATCH(req: NextRequest) {
  const ip = getIP(req)
  const rl = rateLimit(`${ip}:/api/settings/profile`, API_LIMIT)
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parse = UpdateProfileSchema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.issues[0].message }, { status: 422 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(parse.data)
    .eq('id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('audit_log').insert({
    user_id:     user.id,
    entity_type: 'profile',
    entity_id:   user.id,
    action:      'profile_updated',
    changes:     parse.data,
    ai_involved: false,
    ip_address:  ip,
  })

  return NextResponse.json({ profile: data })
}
