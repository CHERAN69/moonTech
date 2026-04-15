import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch session
  const { data: session, error: sessionError } = await supabase
    .from('reconciliation_sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // Fetch match pairs for this session
  const { data: pairs, error: pairsError } = await supabase
    .from('match_pairs')
    .select('*')
    .eq('session_id', id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (pairsError) return NextResponse.json({ error: pairsError.message }, { status: 500 })

  return NextResponse.json({ session, pairs: pairs ?? [] })
}
