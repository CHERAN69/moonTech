import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getIP } from '@/lib/rate-limit'
import { z } from 'zod'

const DeleteSchema = z.object({
  confirm: z.literal('DELETE MY ACCOUNT'),
})

/**
 * GDPR account deletion.
 * Soft-deletes the profile (sets deleted_at) and schedules hard-delete.
 * Requires explicit confirmation string to prevent accidental deletion.
 */
export async function POST(req: NextRequest) {
  const ip = getIP(req)
  const rl = rateLimit(`${ip}:/api/gdpr/delete`, { limit: 3, windowSec: 3600 })
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parse = DeleteSchema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json({
      error: 'To confirm deletion, send { "confirm": "DELETE MY ACCOUNT" }'
    }, { status: 422 })
  }

  // Soft-delete: mark profile as deleted
  await supabase.from('profiles').update({
    deleted_at: new Date().toISOString(),
    email: `deleted_${user.id}@closepilot.deleted`,
  }).eq('id', user.id)

  // Audit before sign-out
  await supabase.from('audit_log').insert({
    user_id:     user.id,
    entity_type: 'profile',
    entity_id:   user.id,
    action:      'gdpr_account_deleted',
    changes:     { deleted_at: new Date().toISOString() },
    ai_involved: false,
    ip_address:  ip,
  })

  // Sign out the user
  await supabase.auth.signOut()

  return NextResponse.json({
    success: true,
    message: 'Your account has been scheduled for deletion. All data will be permanently removed within 30 days.',
  })
}
