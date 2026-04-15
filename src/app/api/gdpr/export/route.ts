import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getIP } from '@/lib/rate-limit'

// GDPR data export — user can download all their data as JSON
export async function GET(req: NextRequest) {
  const ip = getIP(req)
  // Strict rate limit: 3 exports per hour
  const rl = rateLimit(`${ip}:/api/gdpr/export`, { limit: 3, windowSec: 3600 })
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many export requests. Please try again later.' }, { status: 429 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Gather all user data in parallel
  const [profile, sessions, pairs, journals, checklists, briefings, auditLog] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('reconciliation_sessions').select('*').eq('user_id', user.id),
    supabase.from('match_pairs').select('*').eq('user_id', user.id),
    supabase.from('journal_entries').select('*').eq('user_id', user.id),
    supabase.from('close_checklists').select('*').eq('user_id', user.id),
    supabase.from('cfo_briefings').select('*').eq('user_id', user.id),
    supabase.from('audit_log').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
  ])

  const exportData = {
    export_date:       new Date().toISOString(),
    export_requested_by: user.email,
    data: {
      profile:                 profile.data,
      reconciliation_sessions: sessions.data ?? [],
      match_pairs:             pairs.data ?? [],
      journal_entries:         journals.data ?? [],
      close_checklists:        checklists.data ?? [],
      cfo_briefings:           briefings.data ?? [],
      audit_log:               auditLog.data ?? [],
    },
  }

  // Audit the export request itself
  await supabase.from('audit_log').insert({
    user_id:     user.id,
    entity_type: 'profile',
    entity_id:   user.id,
    action:      'gdpr_data_export',
    changes:     { requested_at: new Date().toISOString() },
    ai_involved: false,
    ip_address:  ip,
  })

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type':        'application/json',
      'Content-Disposition': `attachment; filename="finopsai-data-export-${user.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  })
}
