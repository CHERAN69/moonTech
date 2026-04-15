import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getIP, API_LIMIT } from '@/lib/rate-limit'

// GET /api/vendor-rules — list all rules for current user
export async function GET(req: NextRequest) {
  const ip = getIP(req)
  const rl = rateLimit(`${ip}:/api/vendor-rules:GET`, API_LIMIT)
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('vendor_rules')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ rules: data ?? [] })
}

// POST /api/vendor-rules — create a new manual rule
// Body: { vendor_pattern: string, gl_category: string, auto_approve?: boolean, auto_approve_threshold?: number }
export async function POST(req: NextRequest) {
  const ip = getIP(req)
  const rl = rateLimit(`${ip}:/api/vendor-rules:POST`, API_LIMIT)
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
  const vendor_pattern = typeof b.vendor_pattern === 'string' ? b.vendor_pattern.trim() : ''
  const gl_category = typeof b.gl_category === 'string' ? b.gl_category.trim() : ''

  if (!vendor_pattern || !gl_category) {
    return NextResponse.json({ error: 'vendor_pattern and gl_category are required' }, { status: 422 })
  }

  const auto_approve = typeof b.auto_approve === 'boolean' ? b.auto_approve : false
  const auto_approve_threshold = typeof b.auto_approve_threshold === 'number' ? b.auto_approve_threshold : 90

  const { data, error } = await supabase
    .from('vendor_rules')
    .insert({
      user_id: user.id,
      vendor_pattern,
      gl_category,
      auto_approve,
      auto_approve_threshold,
      created_from: 'manual',
      times_applied: 0,
      last_applied: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ rule: data }, { status: 201 })
}
