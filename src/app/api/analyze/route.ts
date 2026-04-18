import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { answerFinanceQuery, generateCFOBriefing, draftJournalEntry, suggestGLCategory } from '@/lib/openai/analyze'
import { RawTransaction } from '@/types'

// Natural language query
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, query, transactions, transaction } = await req.json()

  const { data: profile } = await supabase.from('profiles').select('company_name').eq('id', user.id).single()
  const companyName = profile?.company_name || 'your company'

  if (type === 'query') {
    const answer = await answerFinanceQuery(query, transactions as RawTransaction[], companyName)
    return NextResponse.json({ answer })
  }

  if (type === 'cfo_briefing') {
    const briefing = await generateCFOBriefing(companyName, {
      cashPosition: 0,
      monthlyBurn: 0,
      runwayMonths: 0,
      openAnomalies: 0,
      unmatchedTotal: 0,
      arAging: 0,
      apAging: 0,
      closeConfidence: 0,
      daysSinceLastClose: 0,
      ...req.body,
    })
    return NextResponse.json({ briefing })
  }

  if (type === 'journal_entry') {
    const entry = await draftJournalEntry(transaction as RawTransaction, transaction.gl_category || 'Other')
    return NextResponse.json({ entry })
  }

  if (type === 'gl_category') {
    const category = await suggestGLCategory(transaction as RawTransaction)
    return NextResponse.json({ category })
  }

  return NextResponse.json({ error: 'Unknown analysis type' }, { status: 400 })
}
