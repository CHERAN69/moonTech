/**
 * Zod schemas for all API request bodies.
 * Import these in route handlers for strict input validation.
 */

import { z } from 'zod'

// ─── Exception actions ────────────────────────────────────────────────────────

export const ExceptionActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'edit_match', 'add_note', 'mark_resolved']),
  note: z.string().max(2000).optional(),
  gl_override: z.string().max(200).optional(),
  manual_link_id: z.string().uuid().optional(),
  override_reason: z.string().max(2000).optional(),
  expected_updated_at: z.string().optional(),
})

// ─── Journal entries ──────────────────────────────────────────────────────────

export const JournalEntryLineSchema = z.object({
  account: z.string().min(1).max(200),
  description: z.string().max(500),
  debit: z.number().min(0).optional(),
  credit: z.number().min(0).optional(),
})

export const CreateJournalEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  description: z.string().min(1).max(500),
  lines: z.array(JournalEntryLineSchema).min(2),
  total_amount: z.number().min(0),
  session_id: z.string().uuid().optional(),
  ai_generated: z.boolean().optional().default(false),
  ai_reasoning: z.string().max(2000).optional(),
}).refine(
  (data) => {
    const totalDebits = data.lines.reduce((sum, l) => sum + (l.debit || 0), 0)
    const totalCredits = data.lines.reduce((sum, l) => sum + (l.credit || 0), 0)
    return Math.abs(totalDebits - totalCredits) < 0.01
  },
  { message: 'Journal entry must balance: total debits must equal total credits' }
)

export const UpdateJournalEntrySchema = z.object({
  action: z.enum(['approve', 'reject', 'post', 'edit']),
  description: z.string().min(1).max(500).optional(),
  lines: z.array(JournalEntryLineSchema).min(2).optional(),
  note: z.string().max(2000).optional(),
  expected_updated_at: z.string().optional(),
})

// ─── Close checklist ──────────────────────────────────────────────────────────

export const UpdateTaskSchema = z.object({
  task_id: z.string().min(1),
  status: z.enum(['not_started', 'in_progress', 'complete', 'blocked']),
})

export const SignOffSchema = z.object({
  period: z.string().min(1).max(50),
})

export const CreateChecklistSchema = z.object({
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

// ─── Settings ─────────────────────────────────────────────────────────────────

export const UpdateProfileSchema = z.object({
  full_name: z.string().min(1).max(200).optional(),
  company_name: z.string().min(1).max(200).optional(),
  industry: z.string().max(100).optional(),
  fiscal_year_end: z.string().max(50).optional(),
  base_currency: z.string().length(3).optional(),
})

export const InviteTeamMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'reviewer', 'viewer']),
})

// ─── Sanitise strings for OpenAI prompts ─────────────────────────────────────

/**
 * Strips prompt injection patterns from user-controlled strings
 * before interpolating into LLM prompts.
 */
export function sanitizeForPrompt(input: string): string {
  return input
    // Remove common injection markers
    .replace(/ignore\s+(all\s+)?(previous|above|prior|earlier)\s+instructions?/gi, '[FILTERED]')
    .replace(/system\s*:/gi, '[FILTERED]')
    .replace(/assistant\s*:/gi, '[FILTERED]')
    .replace(/<<\s*(SYS|INST|\/SYS|\/INST)\s*>>/gi, '[FILTERED]')
    // Limit length
    .slice(0, 500)
    .trim()
}

// ─── Search query sanitisation ────────────────────────────────────────────────

/**
 * Sanitises a search string for safe use in Supabase PostgREST .or() filters.
 * Removes characters that could break filter syntax.
 */
export function sanitizeSearch(input: string): string {
  return input
    .replace(/[%_\\'"`;()]/g, '')   // strip SQL-like metacharacters
    .slice(0, 200)
    .trim()
}
