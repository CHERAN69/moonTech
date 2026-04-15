import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeAuditLog } from '@/lib/supabase/audit'

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, note, gl_override, manual_link_id, override_reason } = body

  if (!action) return NextResponse.json({ error: 'action is required' }, { status: 400 })

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
      // note-only update — no status change
      break
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }

  if (note !== undefined) updates.note = note

  const { data: updated, error: updateError } = await supabase
    .from('match_pairs')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // Write audit log entry
  await writeAuditLog({
    supabase,
    userId:        user.id,
    userEmail:     user.email,
    entityType:    'match_pair',
    entityId:      id,
    action,
    previousValue: current,
    newValue:      updated,
    changes:       updates,
    aiInvolved:    false,
  })

  return NextResponse.json({ exception: updated })
}
