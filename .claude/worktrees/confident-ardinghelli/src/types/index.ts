export type UserRole = 'owner' | 'admin' | 'reviewer' | 'viewer'

export type SubscriptionTier = 'starter' | 'growth' | 'agency'

export interface Profile {
  id: string
  email: string
  full_name: string
  company_name: string
  role: UserRole
  subscription_tier: SubscriptionTier
  subscription_status: 'active' | 'trialing' | 'past_due' | 'canceled'
  stripe_customer_id?: string
  created_at: string
}

// ─── Transaction ──────────────────────────────────────────────────────────────

export type TransactionType = 'bank' | 'invoice' | 'stripe' | 'paypal' | 'expense'

export interface RawTransaction {
  id: string
  date: string
  amount: number
  description: string
  vendor?: string
  reference?: string
  category?: string
  source: TransactionType
  currency?: string
  raw_row?: Record<string, string>
}

// ─── Reconciliation ───────────────────────────────────────────────────────────

export type MatchStatus =
  | 'matched'
  | 'unmatched'
  | 'flagged'
  | 'duplicate'
  | 'suggested'
  | 'excluded'

export type MatchMethod = 'exact' | 'fuzzy_ai' | 'manual' | 'rule'

export interface MatchedPair {
  id: string
  bank_transaction: RawTransaction
  invoice_transaction?: RawTransaction
  status: MatchStatus
  confidence: number           // 0-100
  match_method: MatchMethod
  explanation?: string         // AI-generated plain-English explanation
  suggested_action?: string    // AI-generated recommendation
  gl_category?: string
  flags: MatchFlag[]
  created_at: string
}

export interface MatchFlag {
  type: 'duplicate' | 'amount_deviation' | 'timing_anomaly' | 'missing_invoice' | 'fraud_pattern' | 'recurring_change'
  severity: 'low' | 'medium' | 'high'
  message: string
}

// ─── Reconciliation Session ───────────────────────────────────────────────────

export type ReconciliationStatus = 'processing' | 'complete' | 'error'

export interface ReconciliationSession {
  id: string
  user_id: string
  name: string
  period_start: string
  period_end: string
  status: ReconciliationStatus
  close_confidence_score: number  // 0-100
  total_bank_transactions: number
  total_invoice_transactions: number
  matched_count: number
  unmatched_count: number
  flagged_count: number
  duplicate_count: number
  total_matched_amount: number
  total_unmatched_amount: number
  pairs: MatchedPair[]
  created_at: string
  updated_at: string
}

// ─── Dashboard Metrics ────────────────────────────────────────────────────────

export interface DashboardMetrics {
  close_confidence_score: number
  days_to_close: number
  open_anomalies: number
  matched_rate: number
  total_reconciled_amount: number
  pending_journal_entries: number
  cash_position: number
  cash_runway_months: number
  monthly_burn_rate: number
  ar_aging_total: number
  ap_aging_total: number
  last_close_date?: string
}

// ─── Close Checklist ──────────────────────────────────────────────────────────

export type TaskStatus = 'not_started' | 'in_progress' | 'complete' | 'blocked'

export interface CloseTask {
  id: string
  title: string
  description?: string
  assignee?: string
  due_date?: string
  status: TaskStatus
  depends_on?: string[]
  is_recurring: boolean
  category: 'reconciliation' | 'journal_entries' | 'review' | 'reporting' | 'approval'
}

// ─── Journal Entry ────────────────────────────────────────────────────────────

export type JournalEntryStatus = 'draft' | 'pending_approval' | 'approved' | 'posted' | 'rejected'

export interface JournalEntryLine {
  account: string
  description: string
  debit?: number
  credit?: number
}

export interface JournalEntry {
  id: string
  date: string
  description: string
  lines: JournalEntryLine[]
  total_amount: number
  status: JournalEntryStatus
  ai_generated: boolean
  ai_reasoning?: string
  created_by?: string
  approved_by?: string
  created_at: string
}

// ─── CSV Parsing ──────────────────────────────────────────────────────────────

export interface CSVParseResult {
  transactions: RawTransaction[]
  detected_columns: Record<string, string>
  total_rows: number
  errors: string[]
  warnings: string[]
  source_type: TransactionType
}

// ─── Exception Queue ──────────────────────────────────────────────────────────

export type ExceptionResolution = 'approved' | 'rejected' | 'edited' | 'resolved'

export interface ExceptionItem {
  id: string
  session_id: string
  user_id: string
  bank_transaction: RawTransaction
  invoice_transaction?: RawTransaction
  status: MatchStatus
  confidence: number
  match_method: MatchMethod
  explanation?: string
  suggested_action?: string
  gl_category?: string
  gl_override?: string
  flags: MatchFlag[]
  resolution?: ExceptionResolution
  note?: string
  ai_explanation?: string
  manual_link_id?: string
  reviewed_by?: string
  reviewed_at?: string
  override_reason?: string
  created_at: string
  updated_at: string
  reconciliation_sessions?: {
    name: string
    period_start: string
    period_end: string
  }
}

export type ExceptionAction = 'approve' | 'reject' | 'edit_match' | 'add_note' | 'mark_resolved'

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string
  user_id: string
  entity_type: string
  entity_id: string
  action: string
  changes: Record<string, unknown>
  previous_value?: Record<string, unknown>
  new_value?: Record<string, unknown>
  ai_involved: boolean
  ip_address?: string
  user_email?: string
  created_at: string
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export type ReportType =
  | 'reconciliation'
  | 'pl'
  | 'cash_flow'
  | 'ar_aging'
  | 'ap_aging'
  | 'variance'
  | 'audit_trail'
  | 'close_summary'

export type ExportFormat = 'csv' | 'pdf' | 'json'

export interface ReportFilter {
  date_from?: string
  date_to?: string
  session_id?: string
  status?: string
  report_type?: ReportType
}
