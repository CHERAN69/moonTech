import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { explainSingleAnomaly } from '@/lib/openai/analyze'
import { writeAuditLog } from '@/lib/supabase/audit'

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: pair, error: fetchError } = await supabase
    .from('match_pairs')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !pair) {
    return NextResponse.json({ error: 'Exception not found' }, { status: 404 })
  }

  // Return cached explanation if it exists
  if (pair.ai_explanation) {
    return NextResponse.json({ explanation: pair.ai_explanation, cached: true })
  }

  let explanation: string
  try {
    explanation = await explainSingleAnomaly({
      id:                  pair.id,
      status:              pair.status,
      bank_transaction:    pair.bank_transaction,
      invoice_transaction: pair.invoice_transaction,
      flags:               pair.flags ?? [],
      confidence:          pair.confidence,
    })
  } catch {
    return NextResponse.json({ error: 'AI explanation failed' }, { status: 500 })
  }

  // Persist to avoid re-running
  await supabase
    .from('match_pairs')
    .update({ ai_explanation: explanation })
    .eq('id', id)

  // Audit log
  await writeAuditLog({
    supabase,
    userId:     user.id,
    userEmail:  user.email,
    entityType: 'match_pair',
    entityId:   id,
    action:     'ai_explanation_generated',
    changes:    { ai_explanation: explanation },
    aiInvolved: true,
  })

  return NextResponse.json({ explanation, cached: false })
}
