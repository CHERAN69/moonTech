# MASTER IMPLEMENTATION PROMPT — FinOpsAi Architectural Refactor

You are acting as a principal full-stack engineer and finance product architect.

You have full access to this codebase. Read any file before modifying it. Follow the AGENTS.md instruction to check `node_modules/next/dist/docs/` before writing Next.js code.

Your task is a deep architectural refactor of FinOpsAi — an AI-assisted finance operations workspace for CFOs, controllers, and finance teams. The product exists and works at MVP level. You are upgrading it to production-grade architecture.

Core design principle: **AI organizes first, human approves exceptions.**

---

## PHASE 1 — INFORMATION ARCHITECTURE REFACTOR

### Goal
Restructure navigation and routing from engineering-centric modules to a workflow-centric layout that mirrors how finance teams actually work.

### Current navigation (`src/components/layout/Sidebar.tsx`)
```
Dashboard → /dashboard
ReconcileAI → /reconcile
Exceptions → /exceptions
CloseOS → /close
Reports → /reports
Audit Trail → /audit
Settings → /settings
```

### New navigation (implement this exact structure)
```
Inbox        → /inbox          (universal upload + AI classification queue)
Review       → /review         (exception-only workflow — all items needing human attention)
Reports      → /reports        (readiness dashboard + report builder + PDF export)
Close        → /close          (checklist + journal entries + sign-off — keep current CloseOS)
Audit        → /audit          (keep current audit trail, enhance with evidence drill-down)
Settings     → /settings       (profile, team, integrations, billing)
```

### Implementation steps

**1.1 — Create new route structure**

Create these new page files (move/refactor, do not duplicate logic):

```
src/app/inbox/page.tsx           ← NEW (universal upload + classification queue)
src/app/inbox/layout.tsx         ← NEW (sidebar + topbar wrapper, copy pattern from /dashboard/layout.tsx)
src/app/review/page.tsx          ← REFACTOR from /exceptions/page.tsx (expand scope)
src/app/review/layout.tsx        ← NEW
src/app/review/[id]/page.tsx     ← REFACTOR from /reconcile/[id]/page.tsx (pair detail + actions)
```

Keep these routes as-is (update imports only):
```
src/app/reports/page.tsx         ← ENHANCE (add readiness + PDF)
src/app/close/page.tsx           ← KEEP (rename "CloseOS" to "Close" in UI only)
src/app/audit/page.tsx           ← KEEP
src/app/settings/page.tsx        ← KEEP
src/app/dashboard/               ← DELETE route, redirect /dashboard → /inbox
```

After migration, delete these routes:
```
src/app/reconcile/page.tsx       → absorbed into /inbox
src/app/reconcile/new/page.tsx   → absorbed into /inbox
src/app/exceptions/page.tsx      → absorbed into /review
```

**1.2 — Update Sidebar.tsx**

File: `src/components/layout/Sidebar.tsx`

Replace the nav items array with:
```typescript
const NAV = [
  { label: 'Inbox',    href: '/inbox',    icon: InboxIcon },
  { label: 'Review',   href: '/review',   icon: AlertTriangleIcon },
  { label: 'Reports',  href: '/reports',  icon: BarChart3Icon },
  { label: 'Close',    href: '/close',    icon: CheckCircleIcon },
  { label: 'Audit',    href: '/audit',    icon: FileTextIcon },
  { label: 'Settings', href: '/settings', icon: SettingsIcon },
]
```

Add a badge count next to "Review" showing the number of pending exceptions (fetch from `/api/exceptions?resolution=pending` count). Use a small red circle with white text.

Add a badge next to "Inbox" showing unclassified items count.

**1.3 — Redirect legacy routes**

Add `src/app/dashboard/page.tsx` that does:
```typescript
import { redirect } from 'next/navigation'
export default function Dashboard() { redirect('/inbox') }
```

Same for `/reconcile` → redirect to `/inbox`.
Same for `/exceptions` → redirect to `/review`.

---

## PHASE 2 — UNIVERSAL UPLOAD + AI CLASSIFICATION (INBOX)

### Goal
Replace the current reconcile-specific upload (`/reconcile/new/page.tsx`) with a universal AI drop box that accepts any finance document and classifies it automatically.

### Current state
- `src/app/reconcile/new/page.tsx` — 3-step wizard, CSV/XLSX only, calls `parseCSV()` client-side
- `src/lib/matching/file-parser.ts` — validates and parses CSV/XLSX server-side
- `src/lib/matching/csv-parser.ts` — PapaParse-based column detection
- `POST /api/reconcile` — runs matching engine on bank+invoice pair

### New architecture

**2.1 — Inbox page (`src/app/inbox/page.tsx`)**

Build a two-section layout:

**Section A: Upload zone (top)**
- Large drag-and-drop zone accepting multiple files
- Supported formats: CSV, XLSX, XLS, PDF (add PDF text extraction later — for now accept and show "PDF support coming soon")
- File type chips below drop zone for optional category tagging:
  `Bank Statement | Invoice/AR | Payroll | Journal Entry | Receipt | Other`
- These chips are optional hints — AI will classify regardless
- Upload button triggers `POST /api/inbox/upload` for each file
- Show upload progress per file with status indicators

**Section B: Classification queue (below)**
- Table/list of all uploaded documents for the current period
- Columns: File name, Upload date, AI classification, Confidence, Status, Actions
- Status values: `Processing | Classified | Needs Review | Ready`
- Each row expandable to show:
  - Detected columns (for CSV/XLSX)
  - Sample rows (first 5 transactions)
  - AI classification reasoning
  - Suggested report mapping
- Actions per row: `Confirm Classification | Re-classify | Delete`
- Batch action: "Run Reconciliation" button (enabled when at least 1 bank + 1 invoice file are classified and confirmed)
- Batch action: "Generate Report" button (enabled for classified data)

**2.2 — Upload API (`src/app/api/inbox/upload/route.ts`)**

Create new endpoint:

```typescript
// POST /api/inbox/upload
// Input: FormData { file: File, category_hint?: string }
// Process:
//   1. Validate file (reuse validateFile from file-parser.ts)
//   2. Parse file (reuse parseFile from file-parser.ts)
//   3. Call AI classification (new function in openai/analyze.ts)
//   4. Store in new `uploads` table
//   5. Return { upload_id, classification, confidence, transactions_count }
```

**2.3 — AI classification function**

Add to `src/lib/openai/analyze.ts`:

```typescript
export async function classifyUpload(
  filename: string,
  headers: string[],
  sampleRows: Record<string, string>[],  // first 5 rows
  categoryHint?: string
): Promise<{
  classification: 'bank_statement' | 'invoice' | 'payroll' | 'journal_entry' | 'receipt' | 'expense_report' | 'other'
  confidence: number  // 0-100
  reasoning: string
  detected_entity: string | null  // e.g. "Chase Bank", "QuickBooks"
  suggested_period: { start: string; end: string } | null
  column_mapping: Record<string, string>  // detected column → canonical name
}>
```

Use GPT-4o-mini. Prompt should include the filename, headers, and sample data. The category_hint (if provided) should bias but not override the AI.

**2.4 — New database table**

The `uploads` table should store:
```sql
uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  filename text not null,
  file_size_bytes integer,
  mime_type text,
  classification text,  -- bank_statement, invoice, payroll, etc.
  classification_confidence integer,  -- 0-100
  classification_reasoning text,
  detected_entity text,
  suggested_period_start date,
  suggested_period_end date,
  column_mapping jsonb,
  transactions_count integer,
  status text default 'processing',  -- processing, classified, confirmed, error
  category_hint text,  -- user-provided hint
  parsed_data jsonb,  -- store parsed transactions for re-use
  session_id uuid references reconciliation_sessions,  -- linked after reconciliation
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)
```

Create this table via Supabase SQL editor or migration.

**2.5 — Connect upload to reconciliation**

Add a new API endpoint `POST /api/inbox/reconcile` that:
1. Takes `{ bank_upload_id: string, invoice_upload_id?: string, name?: string }`
2. Reads parsed_data from both uploads
3. Runs the existing matching engine (`runMatchingEngine`)
4. Creates the reconciliation_session and match_pairs (reuse logic from current `POST /api/reconcile`)
5. Links both uploads to the session via `session_id`
6. Returns `{ session_id, stats, close_confidence_score }`

This replaces the current file-upload-in-POST pattern. Files are uploaded once to Inbox, then reconciled on demand.

---

## PHASE 3 — REVIEW (EXCEPTION-ONLY WORKFLOW)

### Goal
The Review page shows ONLY items that need human attention. It replaces the current exceptions page and reconcile detail page with a unified queue.

### Current state
- `src/app/exceptions/page.tsx` — lists exceptions with DEMO_EXCEPTIONS fallback
- `src/components/exceptions/ExceptionRow.tsx` — row with expand/actions
- `src/components/exceptions/ActionModal.tsx` — approve/reject modal
- `src/components/exceptions/ExceptionStats.tsx` — summary stats
- `src/app/reconcile/[id]/page.tsx` — session detail with pair-level actions

### New architecture

**3.1 — Review page (`src/app/review/page.tsx`)**

Unified exception queue showing ALL items needing attention across ALL sessions:

**Header section:**
- Summary stats bar (reuse and enhance `ExceptionStats.tsx`):
  - Total pending review
  - Unmatched count
  - Flagged count
  - Duplicates count
  - AI suggestions count

**Filter bar:**
- Status filter: All | Unmatched | Flagged | Duplicate | Suggested
- Session filter: dropdown of all sessions
- Severity filter: All | High | Medium | Low
- Search: vendor/description text search
- Sort: Date (newest first) | Confidence (lowest first) | Amount (highest first)

**List:**
- Reuse `ExceptionRow.tsx` component but enhance:
  - Show session name as a chip/tag on each row
  - Show AI confidence score as a colored badge
  - Show AI explanation inline (not just on expand)
  - Add "AI Suggestion" chip when status is 'suggested' showing what AI recommends
- Remove the DEMO_EXCEPTIONS array entirely from the codebase
- When the list is empty, show a success state: "All clear — no items need review"

**3.2 — Review detail page (`src/app/review/[id]/page.tsx`)**

When user clicks into an exception:
- Full transaction detail (bank side + invoice side if exists)
- AI explanation with confidence score
- Evidence trail: source file, upload date, original row data
- Action panel: Approve | Reject | Edit Match | Link Manually
- GL override option (reuse `GLOverrideModal.tsx`)
- Manual link option (reuse `ManualLinkModal.tsx`)
- Notes/reason field (required for reject)
- After action: return to /review with updated list

**3.3 — Remove demo data**

Delete the `DEMO_EXCEPTIONS` array from `src/app/exceptions/page.tsx` before moving logic to `/review`. The Review page must never show fake data.

---

## PHASE 4 — TRUST UX LAYER

### Goal
Every AI-generated output must show its confidence, reasoning, and evidence. Every state transition must be auditable.

### Workflow states (implement across all entities)

Define in `src/types/index.ts`:
```typescript
export type WorkflowState = 'ai_draft' | 'needs_review' | 'approved' | 'locked'
```

Apply this to:
- Match pairs (currently uses MatchStatus — keep MatchStatus for match logic, add WorkflowState for approval)
- Journal entries (currently uses JournalEntryStatus — map: draft→ai_draft, pending_approval→needs_review, approved→approved, posted→locked)
- Close checklist tasks
- Reports (new)

### Trust indicators (build as reusable components)

**4.1 — Create `src/components/trust/ConfidenceBadge.tsx`**
- Input: `{ score: number, size?: 'sm' | 'md' | 'lg' }`
- Display: colored badge (green ≥85, yellow ≥60, red <60) with percentage
- Tooltip: "AI confidence in this classification/match"

**4.2 — Create `src/components/trust/AIReasoningCard.tsx`**
- Input: `{ reasoning: string, model: string, generated_at: string }`
- Display: collapsible card with AI icon, reasoning text, model name, timestamp
- Label: "AI Analysis" with a brain/sparkle icon

**4.3 — Create `src/components/trust/EvidenceTrail.tsx`**
- Input: `{ source_file: string, upload_date: string, original_row: Record<string, string>, session_name: string }`
- Display: breadcrumb trail: Upload → Classification → Match → Review
- Each step shows timestamp and actor (AI or human name)

**4.4 — Create `src/components/trust/ApprovalStatus.tsx`**
- Input: `{ state: WorkflowState, actor?: string, timestamp?: string }`
- Display: status chip with icon
  - ai_draft: purple, sparkle icon, "AI Draft"
  - needs_review: yellow, eye icon, "Needs Review"
  - approved: green, check icon, "Approved by {actor}"
  - locked: gray, lock icon, "Locked {timestamp}"

**4.5 — Create `src/components/trust/ApprovalActions.tsx`**
- Input: `{ state: WorkflowState, onApprove, onReject, onEdit, requireReason?: boolean }`
- Display: action buttons appropriate to current state
  - ai_draft: "Start Review" → transitions to needs_review
  - needs_review: "Approve" | "Reject" | "Edit" buttons
  - approved: "Lock" button (admin only) | "Revert to Review" button
  - locked: no actions, display "Locked" message

---

## PHASE 5 — REPORT ENGINE

### Goal
Transform reports from static CSV exports into a readiness-aware report builder with PDF generation.

### Current state
- `src/app/reports/page.tsx` — report cards with CSV export
- `GET /api/reports/export` — generates CSV for reconciliation, audit_trail, close_summary
- P&L section shows "No P&L data yet"
- Board pack is plan-gated with no implementation

### New architecture

**5.1 — Report readiness dashboard (`src/app/reports/page.tsx`)**

Replace current layout with a readiness-first view:

**Report cards grid** — one card per report type:
- P&L Statement
- Close Summary
- AR Aging
- Reconciliation Detail
- Audit Trail
- Board Pack (Growth+ only)

Each card shows:
- Report name and description
- Readiness indicator: percentage complete (based on data availability)
- Missing data callouts: e.g., "3 unmatched transactions need review", "Journal entries pending approval"
- Last generated date
- "Generate" button (disabled with tooltip if readiness < 100%)
- "Export PDF" and "Export CSV" buttons (when generated)

**Readiness calculation logic** — add to `src/lib/reports/readiness.ts` (new file):
```typescript
export function computeReportReadiness(type: ReportType, metrics: {
  unmatchedCount: number
  pendingJournalEntries: number
  checklistComplete: boolean
  hasData: boolean
}): { percentage: number; blockers: string[] }
```

**5.2 — PDF generation**

Install `@react-pdf/renderer` (add to package.json).

Create `src/lib/reports/pdf/` directory with:

```
src/lib/reports/pdf/
  PLReport.tsx          ← React PDF component for P&L
  CloseSummary.tsx      ← React PDF component for close summary
  ReconciliationDetail.tsx  ← React PDF component for reconciliation
  AuditTrail.tsx        ← React PDF component for audit trail
  BoardPack.tsx         ← React PDF component for board pack
  shared/
    Header.tsx          ← Company logo, report title, date, confidentiality notice
    Footer.tsx          ← Page numbers, "Generated by FinOpsAi", timestamp
    Table.tsx           ← Reusable PDF table component
    styles.ts           ← Shared PDF styles (fonts, colors, spacing)
```

Each report PDF component should:
- Accept typed data props (not raw DB rows)
- Include company header with logo placeholder, report title, period, generation date
- Include page numbers and "Generated by FinOpsAi" footer
- Use professional typography (register Helvetica or similar)
- Include a "Confidence Summary" section showing AI vs human-reviewed breakdown
- Include source file references in footnotes

**5.3 — PDF export API (`src/app/api/reports/pdf/route.ts`)**

```typescript
// GET /api/reports/pdf?type=close_summary&session_id=xxx&period=2026-03
// Process:
//   1. Fetch all required data from Supabase
//   2. Compute readiness — return 400 if <100% with blockers list
//   3. Render React PDF component to buffer
//   4. Return buffer with Content-Type: application/pdf
```

**5.4 — Keep CSV export**

Keep `GET /api/reports/export` as-is for CSV. Both CSV and PDF endpoints share the same data-fetching layer — only serialization differs. Extract shared data fetching into `src/lib/reports/data.ts`:

```typescript
export async function fetchReportData(supabase, userId, type, filters): Promise<ReportData>
```

---

## PHASE 6 — CLOSE WORKFLOW ENHANCEMENTS

### Current state
- `src/app/close/page.tsx` — two tabs (Checklist + Journal Entries)
- `GET/POST /api/close-checklist` — CRUD with JSONB task array
- `GET/POST /api/journal-entries` — list/create entries

### Enhancements (do not rebuild, enhance in-place)

**6.1 — Add close risk prediction**

Add to `src/lib/openai/analyze.ts`:
```typescript
export async function predictCloseRisk(metrics: {
  daysRemaining: number
  unmatchedCount: number
  pendingJournals: number
  checklistProgress: number  // 0-100
  historicalCloseDays: number[]  // last 6 months
}): Promise<{
  risk_level: 'low' | 'medium' | 'high'
  predicted_close_date: string
  risk_factors: string[]
  recommendations: string[]
}>
```

Display this as a card at the top of `/close` page, above the tabs.

**6.2 — Add task dependencies enforcement**

In the close checklist, enforce ordering:
- `reconciliation` tasks must complete before `journal_entries` tasks can start
- `journal_entries` tasks must complete before `review` tasks can start
- `review` tasks must complete before `approval` tasks can start

When a user tries to complete a task out of order, show an inline warning: "Complete all {previous_category} tasks first."

Implement this in the `POST /api/close-checklist?action=update_task` handler by checking dependency categories.

**6.3 — Journal entry balance validation**

In `src/lib/validation.ts`, add a refinement to `CreateJournalEntrySchema`:
```typescript
.refine(
  (data) => {
    const totalDebits = data.lines.reduce((sum, l) => sum + (l.debit || 0), 0)
    const totalCredits = data.lines.reduce((sum, l) => sum + (l.credit || 0), 0)
    return Math.abs(totalDebits - totalCredits) < 0.01
  },
  { message: 'Journal entry must balance: total debits must equal total credits' }
)
```

---

## PHASE 7 — SMART MEMORY + RECURRING RULES

### Goal
The system should learn from user approvals to auto-classify future transactions.

**7.1 — Vendor rule engine**

Create `src/lib/rules/vendor-rules.ts`:
```typescript
export interface VendorRule {
  id: string
  user_id: string
  vendor_pattern: string        // regex or normalized vendor name
  gl_category: string           // auto-assign this GL category
  auto_approve: boolean         // skip review if confidence > threshold
  auto_approve_threshold: number // e.g., 90
  created_from: string          // 'manual' | 'learned'
  times_applied: number
  last_applied: string
}

export async function matchVendorRules(
  transaction: RawTransaction,
  rules: VendorRule[]
): Promise<VendorRule | null>

export async function learnRule(
  userId: string,
  exception: ExceptionItem,
  action: ExceptionAction,
  glOverride?: string
): Promise<VendorRule | null>
```

**7.2 — Learn from approvals**

In `PATCH /api/exceptions/[id]` (currently `src/app/api/exceptions/[id]/route.ts`), after a successful approve action:
1. Call `learnRule()` to check if a pattern emerges
2. If the same vendor+GL has been approved 3+ times, create an auto-approve rule
3. Store in `vendor_rules` table
4. Next reconciliation run, apply rules before AI classification

**7.3 — Rules management UI**

Add a "Rules" tab to Settings page (`src/app/settings/page.tsx`):
- List all vendor rules
- Show: vendor pattern, GL category, auto-approve status, times applied
- Actions: Edit, Delete, Toggle auto-approve
- "Learned" badge for rules created from approval patterns

---

## PHASE 8 — BUG FIXES (APPLY DURING REFACTOR)

Fix these known bugs as you encounter each file:

**8.1** `src/lib/matching/engine.ts:234` — ALREADY FIXED (verify `'rule'` not `'fuzzy_ai'`)

**8.2** `src/app/api/reconcile/route.ts:177` — ALREADY FIXED (verify `insertErrors.length > 0` without `&& insertedCount === 0`)

**8.3** `src/app/reconcile/new/page.tsx` — ALREADY FIXED (verify XLSX detection before parseCSV)

**8.4** `src/lib/matching/engine.ts:371` — ALREADY FIXED (verify phantom transaction uses clean synthetic entry)

**8.5** Remove `DEMO_EXCEPTIONS` from whatever page currently has it (was in `/exceptions/page.tsx`, may now be in `/review/page.tsx`). Replace with proper empty state.

**8.6** `src/app/api/dashboard/route.ts` — Replace hardcoded `0` values for `cash_position`, `monthly_burn`, `runway_months` with `null`. Update any UI that reads these to show "Connect bank feed" placeholder when null.

**8.7** `src/app/api/reconcile/route.ts:184` — The `vendorMappings` condition is vestigial. Change to unconditionally upsert vendor mappings when bank transactions have vendor names.

**8.8** Rate limiter (`src/lib/rate-limit.ts`) — Add a comment at the top: `// TODO: Replace with Upstash Redis for production horizontal scaling`. Do not change implementation now.

---

## PHASE 9 — STATE & ERROR HANDLING

### Missing states to add

For every page that fetches data, implement these three states:

**Loading state:**
- Add skeleton components that match the final layout shape
- Create `src/components/ui/Skeleton.tsx` — a reusable animated placeholder bar/circle
- Use in: Inbox, Review, Reports, Close, Audit

**Empty state:**
- Create `src/components/ui/EmptyState.tsx` — icon + title + description + optional CTA button
- Inbox empty: "Upload your first file to get started" + upload CTA
- Review empty: "All clear — no items need your attention" + green check icon
- Reports empty: "Upload data to generate reports" + upload CTA
- Close empty: "Create a close checklist for this period" + create CTA

**Error state:**
- Create `src/components/ui/ErrorState.tsx` — error icon + message + retry button
- Use in every page that fetches data
- Dashboard API (`/api/dashboard`) should return partial data on partial failure instead of failing entirely — wrap each parallel query in its own try/catch

### Form validation gaps to fix

- Login: Add lockout messaging after 5 failed attempts (UI only — Supabase handles actual lockout)
- Signup: Add password strength indicator (min 8 chars, 1 uppercase, 1 number)
- File upload: Add client-side size check before upload (show error immediately for >10MB)
- Journal entry form: Add inline debit/credit balance indicator showing running totals

---

## PHASE 10 — PRODUCTION HARDENING

**10.1 — Security headers**

Add to `next.config.ts`:
```typescript
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ],
  }]
}
```

**10.2 — OpenAI prompt overflow protection**

In `src/lib/openai/analyze.ts`, for every function that sends user data to OpenAI:
- Truncate description/vendor fields to 200 chars
- Truncate total prompt input to 4000 chars
- Add token estimation: if estimated tokens > 3000, truncate sample data

**10.3 — Idempotency on mutations**

In `POST /api/inbox/upload` and the new `POST /api/inbox/reconcile`:
- Accept `X-Idempotency-Key` header
- Check for existing operation with that key before proceeding
- Return cached result if found

**10.4 — Concurrent access protection**

In `PATCH /api/exceptions/[id]` and `PATCH /api/journal-entries/[id]`:
- Accept `expected_updated_at` in request body
- Add `WHERE updated_at = expected_updated_at` to UPDATE query
- Return 409 Conflict if 0 rows updated with message "This item was modified by another user. Please refresh."

---

## EXECUTION ORDER

Execute phases in this order. Complete each phase before starting the next.

1. **Phase 1** — Route restructure + sidebar (breaks navigation, fix first)
2. **Phase 4** — Trust UX components (needed by phases 2, 3, 5)
3. **Phase 2** — Inbox/upload (new primary entry point)
4. **Phase 3** — Review page (replaces exceptions)
5. **Phase 9** — Loading/empty/error states (polish all new pages)
6. **Phase 5** — Report engine + PDF
7. **Phase 6** — Close workflow enhancements
8. **Phase 7** — Smart memory/rules (depends on review flow working)
9. **Phase 8** — Bug fixes (verify during each phase)
10. **Phase 10** — Production hardening (final pass)

---

## CONSTRAINTS

- Do NOT delete any API route until its replacement is fully working and tested
- Do NOT modify the matching engine algorithm (`src/lib/matching/engine.ts`) beyond the already-applied bug fixes — it works correctly
- Do NOT change the Supabase auth pattern — keep `createClient()` + `getUser()` on every API route
- Do NOT change the rate limiting pattern — keep the current in-memory approach, just add the Redis TODO comment
- Do NOT install new UI component libraries (no shadcn, no MUI, no Chakra) — keep pure Tailwind
- Do NOT change the OpenAI model from gpt-4o-mini unless explicitly asked
- Keep all existing Zod validation schemas — extend them, don't replace
- Keep all existing type definitions in `src/types/index.ts` — add new types, don't restructure the file
- Preserve the landing page at `/page.tsx` — do not modify it
- Preserve all auth pages (`/login`, `/signup`, `/forgot-password`, `/auth/reset-password`) — do not modify them

---

## FILE REFERENCE

Current files you will be working with:

**Pages (to refactor):**
- `src/app/reconcile/page.tsx` → absorb into `/inbox`
- `src/app/reconcile/new/page.tsx` → absorb into `/inbox`
- `src/app/reconcile/[id]/page.tsx` → absorb into `/review/[id]`
- `src/app/exceptions/page.tsx` → absorb into `/review`
- `src/app/dashboard/page.tsx` → redirect to `/inbox`

**Pages (to enhance):**
- `src/app/reports/page.tsx`
- `src/app/close/page.tsx`
- `src/app/audit/page.tsx`
- `src/app/settings/page.tsx`

**Components (to move/reuse):**
- `src/components/exceptions/ExceptionRow.tsx` → use in `/review`
- `src/components/exceptions/ActionModal.tsx` → use in `/review`
- `src/components/exceptions/ExceptionStats.tsx` → use in `/review`
- `src/components/reconcile/ApprovalActions.tsx` → use in `/review/[id]`
- `src/components/reconcile/GLOverrideModal.tsx` → use in `/review/[id]`
- `src/components/reconcile/ManualLinkModal.tsx` → use in `/review/[id]`
- `src/components/dashboard/CFOBriefingCard.tsx` → use in `/inbox` or `/reports`
- `src/components/dashboard/CloseConfidenceGauge.tsx` → use in `/close`

**Components (to create):**
- `src/components/trust/ConfidenceBadge.tsx`
- `src/components/trust/AIReasoningCard.tsx`
- `src/components/trust/EvidenceTrail.tsx`
- `src/components/trust/ApprovalStatus.tsx`
- `src/components/trust/ApprovalActions.tsx`
- `src/components/ui/Skeleton.tsx`
- `src/components/ui/EmptyState.tsx`
- `src/components/ui/ErrorState.tsx`
- `src/components/inbox/UploadZone.tsx`
- `src/components/inbox/ClassificationQueue.tsx`
- `src/components/inbox/FileRow.tsx`

**API routes (to create):**
- `src/app/api/inbox/upload/route.ts`
- `src/app/api/inbox/reconcile/route.ts`
- `src/app/api/reports/pdf/route.ts`

**Lib (to create):**
- `src/lib/reports/readiness.ts`
- `src/lib/reports/data.ts`
- `src/lib/reports/pdf/*.tsx`
- `src/lib/rules/vendor-rules.ts`

**Lib (existing, to extend):**
- `src/lib/openai/analyze.ts` — add `classifyUpload()`, `predictCloseRisk()`
- `src/lib/validation.ts` — add JE balance refinement, upload schemas
- `src/types/index.ts` — add WorkflowState, VendorRule, Upload types
