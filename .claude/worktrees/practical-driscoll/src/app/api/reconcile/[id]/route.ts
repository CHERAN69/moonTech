import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ─── GET /api/reconcile/[id] ──────────────────────────────────────────────────
// Returns the reconciliation session metadata + all its match pairs.
// Supports optional ?status= and ?limit= / ?offset= query params.

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── Session ────────────────────────────────────────────────────────────────
  const { data: session, error: sessionError } = await supabase
    .from('reconciliation_sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // ── Pairs ─────────────────────────────────────────────────────────────────
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const limit  = Math.min(parseInt(searchParams.get('limit')  || '500'), 500)
  const offset = parseInt(searchParams.get('offset') || '0')

  let q = supabase
    .from('match_pairs')
    .select('*', { count: 'exact' })
    .eq('session_id', id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) q = q.eq('status', status)

  const { data: pairs, error: pairsError, count } = await q

  if (pairsError) {
    return NextResponse.json({ error: pairsError.message }, { status: 500 })
  }

  return NextResponse.json({
    session,
    pairs:  pairs ?? [],
    total:  count ?? 0,
  })
}

// ─── PATCH /api/reconcile/[id] ────────────────────────────────────────────────
// Supported actions:
//   • sign_off  — controller signs off on the close period

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action } = body

  if (!action) return NextResponse.json({ error: 'action is required' }, { status: 400 })

  // Verify ownership
  const { data: session, error: fetchError } = await supabase
    .from('reconciliation_sessions')
    .select('id, close_confidence_score, signed_off_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  if (action === 'sign_off') {
    // Prevent double sign-off
    if (session.signed_off_at) {
      return NextResponse.json(
        { error: 'Session is already signed off', already_signed_off: true },
        { status: 409 }
      )
    }

    const now = new Date().toISOString()
    const { data: updated, error: updateError } = await supabase
      .from('reconciliation_sessions')
      .update({ signed_off_by: user.id, signed_off_at: now })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Audit trail
    await supabase.from('audit_log').insert({
      user_id:     user.id,
      entity_type: 'reconciliation_session',
      entity_id:   id,
      action:      'sign_off',
      changes:     { signed_off_by: user.id, signed_off_at: now, close_confidence_score: session.close_confidence_score },
      ai_involved: false,
      user_email:  user.email ?? null,
    })

    return NextResponse.json({ session: updated })
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
}
