import { SupabaseClient } from '@supabase/supabase-js'

interface AuditParams {
  supabase: SupabaseClient
  userId: string
  userEmail?: string
  entityType: string
  entityId: string
  action: string
  changes?: Record<string, unknown>
  previousValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  aiInvolved?: boolean
}

/**
 * Write a single entry to audit_log.
 * Fire-and-forget — awaited but errors are suppressed so they never
 * block the primary operation.
 */
export async function writeAuditLog({
  supabase,
  userId,
  userEmail,
  entityType,
  entityId,
  action,
  changes = {},
  previousValue,
  newValue,
  aiInvolved = false,
}: AuditParams): Promise<void> {
  await supabase.from('audit_log').insert({
    user_id:        userId,
    user_email:     userEmail ?? null,
    entity_type:    entityType,
    entity_id:      entityId,
    action,
    changes,
    previous_value: previousValue ?? null,
    new_value:      newValue ?? null,
    ai_involved:    aiInvolved,
  })
}
