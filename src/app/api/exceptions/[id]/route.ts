import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getIP, API_LIMIT } from '@/lib/rate-limit'
import { requireRole } from '@/lib/rbac'
import { ExceptionActionSchema } from '@/lib/validation'
import { learnRule } from '@/lib/rules/vendor-rules'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const ip = getIP(req)
  const rl = rateLimit(`${ip}:/api/exceptions/[id]:GET`, API_LIMIT)
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('match_pairs')
    .select('*, reconciliation_sessions ( name, period_start, period_end )')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Exception not found' }, { status: 404 })

  return NextResponse.json({ exception: data })
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  // Rate limiting
  const ip = getIP(req)
  const rl = rateLimit(`${ip}:/api/exceptions/[id]`, API_LIMIT)
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) }
    })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // RBAC: reviewers and above can act on exceptions
  const rbacGuard = await requireRole(supabase, user.id, 'reviewer')
  if (rbacGuard) return rbacGuard

  // Validate request body with Zod
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parse = ExceptionActionSchema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.issues[0].message }, { status: 422 })
  }

  const { action, note, gl_override, manual_link_id, override_reason, expected_updated_at } = parse.data

  // Fetch current record for audit trail
  const { data: current, error: fetchError } = await supabase
    .from('match_pairs')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !current) {
    return NextResponse.json({ error: 'Exception not found' }, { status: 404 })
  }

  const now = new Date().toISOString()
  const updates: Record<string, unknown> = {
    reviewed_by: user.id,
    reviewed_at: now,
  }

  switch (action) {
    case 'approve':
      updates.resolution = 'approved'
      updates.status     = 'matched'
      break
    case 'reject':
      updates.resolution    = 'rejected'
      updates.status        = 'excluded'
      if (override_reason) updates.override_reason = override_reason
      break
    case 'edit_match':
      updates.resolution   = 'edited'
      updates.match_method = 'manual'
      if (gl_override)    updates.gl_override    = gl_override
      if (manual_link_id) updates.manual_link_id = manual_link_id
      break
    case 'mark_resolved':
      updates.resolution = 'resolved'
      break
    case 'add_note':
      // note-only — no status change
      break
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }

  if (note !== undefined) updates.note = note

  let updateQuery = supabase
    .from('match_pairs')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)

  if (expected_updated_at) {
    updateQuery = updateQuery.eq('updated_at', expected_updated_at)
  }

  const { data: updated, error: updateError, count: updateCount } = await updateQuery
    .select()
    .single()

  if (updateError && updateError.code === 'PGRST116') {
    // No rows matched — optimistic lock conflict
    return NextResponse.json({ error: 'This item was modified by another user. Please refresh.' }, { status: 409 })
  }
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  if (expected_updated_at && !updated) {
    return NextResponse.json({ error: 'This item was modified by another user. Please refresh.' }, { status: 409 })
  }
  void updateCount

  // Write audit log (append-only INSERT)
  const ipAddr = getIP(req)
  await supabase.from('audit_log').insert({
    user_id:        user.id,
    entity_type:    'match_pair',
    entity_id:      id,
    action,
    previous_value: current,
    new_value:      updated,
    changes:        updates,
    ai_involved:    false,
    ip_address:     ipAddr,
  })

  // Fire-and-forget rule learning on approve
  if (action === 'approve') {
    const vendorName = current.bank_transaction?.vendor || current.bank_transaction?.description || ''
    const glCategory = (gl_override || current.gl_override || current.gl_category || '') as string
    if (vendorName && glCategory) {
      learnRule(user.id, vendorName, glCategory).catch(() => {
        // Non-critical — don't fail the main response
      })
    }
  }

  return NextResponse.json({ exception: updated })
}
