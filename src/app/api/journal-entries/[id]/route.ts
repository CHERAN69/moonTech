import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getIP, API_LIMIT } from '@/lib/rate-limit'
import { requireRole } from '@/lib/rbac'
import { UpdateJournalEntrySchema } from '@/lib/validation'

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  const ip = getIP(req)
  const rl = rateLimit(`${ip}:/api/journal-entries/[id]`, API_LIMIT)
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parse = UpdateJournalEntrySchema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.issues[0].message }, { status: 422 })
  }

  const { action, description, lines, expected_updated_at } = parse.data

  // Approve/reject require admin+
  if (action === 'approve' || action === 'post') {
    const rbac = await requireRole(supabase, user.id, 'admin')
    if (rbac) return rbac
  } else {
    const rbac = await requireRole(supabase, user.id, 'reviewer')
    if (rbac) return rbac
  }

  // Fetch current for audit
  const { data: current, error: fetchErr } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !current) {
    return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 })
  }

  const now = new Date().toISOString()
  const updates: Record<string, unknown> = {}

  switch (action) {
    case 'approve':
      updates.status      = 'approved'
      updates.approved_by = user.id
      updates.approved_at = now
      break
    case 'reject':
      updates.status = 'rejected'
      break
    case 'post':
      if (current.status !== 'approved') {
        return NextResponse.json({ error: 'Only approved entries can be posted' }, { status: 422 })
      }
      updates.status    = 'posted'
      updates.posted_at = now
      break
    case 'edit':
      if (current.status === 'posted') {
        return NextResponse.json({ error: 'Posted entries cannot be edited' }, { status: 422 })
      }
      if (description) updates.description = description
      if (lines)       updates.lines       = lines
      updates.status = 'draft'
      break
  }

  let updateQuery = supabase
    .from('journal_entries')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)

  if (expected_updated_at) {
    updateQuery = updateQuery.eq('updated_at', expected_updated_at)
  }

  const { data: updated, error: updateErr } = await updateQuery.select().single()

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  if (expected_updated_at && !updated) {
    return NextResponse.json(
      { error: 'This entry was modified by another user. Please refresh.' },
      { status: 409 }
    )
  }

  // Audit log
  await supabase.from('audit_log').insert({
    user_id:        user.id,
    entity_type:    'journal_entry',
    entity_id:      id,
    action:         `journal_${action}`,
    previous_value: current,
    new_value:      updated,
    changes:        updates,
    ai_involved:    false,
    ip_address:     getIP(req),
  })

  return NextResponse.json({ entry: updated })
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only admin+ can delete journal entries
  const rbac = await requireRole(supabase, user.id, 'admin')
  if (rbac) return rbac

  const { data: current } = await supabase
    .from('journal_entries')
    .select('status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (current.status === 'posted') {
    return NextResponse.json({ error: 'Posted entries cannot be deleted' }, { status: 422 })
  }

  await supabase.from('journal_entries').delete().eq('id', id).eq('user_id', user.id)

  await supabase.from('audit_log').insert({
    user_id:     user.id,
    entity_type: 'journal_entry',
    entity_id:   id,
    action:      'journal_deleted',
    changes:     { status: current.status },
    ai_involved: false,
    ip_address:  getIP(req),
  })

  return NextResponse.json({ success: true })
}
