# FinOpsAi — Project State (Auto-updated each session)

> This file is loaded automatically at the start of every Claude session via CLAUDE.md.
> Claude must update the SESSION LOG and PHASE STATUS sections before ending any session.

---

## PRODUCT OVERVIEW

**FinOpsAi** is an AI-assisted finance operations workspace for CFOs, controllers, and finance teams.
- Stack: Next.js (App Router), Supabase (auth + DB), OpenAI gpt-4o-mini, Tailwind CSS, TypeScript
- Core design principle: **AI organizes first, human approves exceptions**
- Working directory: `/Users/cheranseripally/Desktop/MoonTechProjects/FinOpsAi`
- The full 10-phase architectural refactor plan lives in `MASTER_PROMPT.md`

---

## PHASE STATUS

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| 1 | Route restructure + sidebar | ✅ COMPLETE | `/inbox`, `/review`, `/review/[id]` pages + layouts done. Sidebar updated with new nav. Legacy routes (`/dashboard`, `/reconcile`, `/exceptions`) have redirect stubs. |
| 2 | Universal upload + AI classification (Inbox) | ✅ COMPLETE | `UploadZone.tsx`, `ClassificationQueue.tsx`, `FileRow.tsx` built. API routes: `/api/inbox/upload`, `/api/inbox/reconcile`, `/api/inbox/count` all done. `classifyUpload()` added to `analyze.ts`. `uploads` table migration needed in Supabase. |
| 3 | Review (exception-only workflow) | ✅ COMPLETE | `/review/page.tsx` (unified queue), `/review/[id]/page.tsx` (detail + actions). `DEMO_EXCEPTIONS` removed. |
| 4 | Trust UX components | ✅ COMPLETE | All 5 components in `src/components/trust/`: `ConfidenceBadge.tsx`, `AIReasoningCard.tsx`, `EvidenceTrail.tsx`, `ApprovalStatus.tsx`, `ApprovalActions.tsx`. `WorkflowState` type added to `src/types/index.ts`. |
| 5 | Report engine + PDF | ✅ COMPLETE | PDF implemented as server-rendered print HTML (not @react-pdf/renderer — browser print-to-PDF instead). `readiness.ts`, `data.ts`, `pdf/styles.ts` done. `/api/reports/pdf` returns full HTML with auto-print. Reports page enhanced with readiness indicators. |
| 6 | Close workflow enhancements | ✅ COMPLETE | `predictCloseRisk()` in `analyze.ts`. `/api/close-risk` route. Task dependency enforcement and JE balance validation in `validation.ts`. |
| 7 | Smart memory + vendor rules | ✅ COMPLETE | `src/lib/rules/vendor-rules.ts` with `matchVendorRules()` and `learnRule()`. `/api/vendor-rules` CRUD routes. `vendor_rules` table. Rules tab in Settings. Learn-from-approvals wired into `PATCH /api/exceptions/[id]`. |
| 8 | Bug fixes | ✅ COMPLETE | All 8 bugs verified fixed (engine.ts rule type, reconcile insert check, XLSX detection, phantom transaction, DEMO_EXCEPTIONS, dashboard nulls, vendor mappings, rate-limit Redis TODO). |
| 9 | Loading / empty / error states | ✅ COMPLETE | `Skeleton.tsx`, `EmptyState.tsx`, `ErrorState.tsx` in `src/components/ui/`. Applied to all new pages. |
| 10 | Production hardening | ✅ COMPLETE | Security headers in `next.config.ts` ✓. OpenAI prompt truncation (`truncateField` + `truncatePrompt`) in `analyze.ts` ✓. Idempotency key on `/api/inbox/upload` ✓. 409 concurrent access on exceptions ✓. 409 on journal-entries added this session (`expected_updated_at` in schema + route). Dashboard returns null not 0 ✓. |

---

## KEY FILES MAP

### Pages
```
src/app/
  inbox/page.tsx              — Upload zone + classification queue (Phase 2)
  inbox/layout.tsx            — Layout wrapper
  review/page.tsx             — Unified exception queue (Phase 3)
  review/layout.tsx
  review/[id]/page.tsx        — Exception detail + actions
  reports/page.tsx            — Readiness dashboard + report cards (Phase 5)
  close/page.tsx              — Checklist + journal entries + risk card (Phase 6)
  audit/page.tsx              — Audit trail (unchanged)
  settings/page.tsx           — Profile, team, integrations, billing, rules tab (Phase 7)
  dashboard/page.tsx          — Redirects to /inbox
  reconcile/page.tsx          — Redirects to /inbox
  exceptions/page.tsx         — Redirects to /review
```

### API Routes
```
src/app/api/
  inbox/upload/route.ts       — POST: file upload + AI classification
  inbox/reconcile/route.ts    — POST: trigger reconciliation from classified uploads
  inbox/count/route.ts        — GET: unclassified items count (sidebar badge)
  exceptions/[id]/route.ts    — PATCH: approve/reject + learn vendor rules
  reports/pdf/route.ts        — GET: HTML print report (readiness-gated)
  reports/export/route.ts     — GET: CSV export (unchanged)
  close-risk/route.ts         — GET: AI close risk prediction
  vendor-rules/route.ts       — GET/POST vendor rules
  vendor-rules/[id]/route.ts  — PATCH/DELETE vendor rules
```

### Components
```
src/components/
  trust/ConfidenceBadge.tsx   — Colored score badge (green/yellow/red)
  trust/AIReasoningCard.tsx   — Collapsible AI explanation card
  trust/EvidenceTrail.tsx     — Breadcrumb audit trail
  trust/ApprovalStatus.tsx    — Workflow state chip (ai_draft/needs_review/approved/locked)
  trust/ApprovalActions.tsx   — Context-aware action buttons
  inbox/UploadZone.tsx        — Drag-and-drop multi-file upload
  inbox/ClassificationQueue.tsx — Classified files table
  inbox/FileRow.tsx           — Expandable file row with AI details
  ui/Skeleton.tsx             — Animated loading placeholder
  ui/EmptyState.tsx           — Empty state with CTA
  ui/ErrorState.tsx           — Error state with retry
```

### Lib
```
src/lib/
  openai/analyze.ts           — classifyUpload(), predictCloseRisk(), analyzeExceptions()
  reports/readiness.ts        — computeReportReadiness()
  reports/data.ts             — fetchReportData() (shared by CSV + PDF)
  reports/pdf/styles.ts       — PDF color/font constants
  rules/vendor-rules.ts       — matchVendorRules(), learnRule()
  matching/engine.ts          — Core reconciliation engine (DO NOT MODIFY algorithm)
  validation.ts               — Zod schemas incl. JE balance refinement
  rate-limit.ts               — In-memory rate limiter (Redis TODO comment added)
```

---

## DATABASE TABLES (Supabase)

### Existing (pre-refactor)
- `reconciliation_sessions` — reconcile runs
- `match_pairs` — individual transaction matches
- `journal_entries` — close journal entries
- `close_checklists` — close task lists
- `audit_log` — audit trail (NOT `audit_events`)
- `vendor_mappings` — historical vendor name mappings
- `profiles` — extended user data (NOT `user_profiles`)

### Added during refactor
- `uploads` — inbox file uploads with AI classification ✅ LIVE
- `vendor_rules` — learned auto-approve rules ✅ LIVE

### ✅ Migration status verified 2026-04-22
All tables confirmed present via REST API against live Supabase project.

---

## CONSTRAINTS (never violate these)
- DO NOT modify `src/lib/matching/engine.ts` algorithm
- DO NOT change Supabase auth pattern (`createClient()` + `getUser()` on every route)
- DO NOT install new UI component libraries — pure Tailwind only
- DO NOT change OpenAI model from gpt-4o-mini
- DO NOT modify landing page (`/page.tsx`) or auth pages (`/login`, `/signup`, etc.)
- Extend Zod schemas, don't replace them
- Add to `src/types/index.ts`, don't restructure it

---

## WHAT'S NEXT (priority order)

1. **Account deletion purge** — security page claims "30-day purge on account close" but no scheduled job exists; needs a Supabase Edge Function or pg_cron task
2. **End-to-end test** — upload a CSV → classify → reconcile → review exceptions → approve → generate PDF report
3. **CSP tightening** — current CSP uses `unsafe-inline`/`unsafe-eval` (required by Next.js); consider nonce-based approach for stricter policy if compliance requires it
4. **HSTS preload** — submit domain to hstspreload.org once deployed to production domain

---

## SESSION LOG

<!-- Claude: append a new entry here at the end of every session -->
<!-- Format: ### Session YYYY-MM-DD HH:MM — [brief title] -->

### Session 2026-04-21 — Initial state capture
- Audited full project structure against MASTER_PROMPT.md 10-phase plan
- Confirmed Phases 1–9 are complete based on file presence
- Phase 10 (production hardening) status unknown — needs verification
- Created PROJECT_STATE.md and wired into CLAUDE.md for session continuity
- PDF reports implemented as server-rendered print HTML (not @react-pdf/renderer)
- `uploads` and `vendor_rules` DB migrations status unverified

### Session 2026-04-21 — Hybrid inbox, demo data cleanup, permission hook
- **Inbox rebuilt** (`src/app/inbox/page.tsx`) around 3-tier CFO model:
  - Tier 1 (green): Auto-processed sessions shown as summary cards with confidence score + "Review exceptions" button
  - Tier 2 (blue): AI-detected document pairs (bank + invoice) shown side-by-side with one-click "Run Reconciliation"
  - Tier 3 (amber): Orphaned/unmatched files with contextual missing-document banner
  - Pairing logic: matches by period overlap, falls back to proximity; bank-only mode supported
- **Demo data removed**: Stripe hardcoded `connected: true` in settings → changed to `false`
- **Permission hook added** to `.claude/settings.local.json`: `PermissionRequest` prompt hook that explains every permission ask in plain English before showing approve/deny
- **Stop hook** already in place (timestamps PROJECT_STATE.md on session end)
- **Save codeword** wired via CLAUDE.md — typing "save" triggers PROJECT_STATE.md update

---

### Session 2026-04-23 — Security audit, dark mode, dropdown fix, audit trail rewrite, review stats fix

- **Dark mode** — `ThemeProvider.tsx` added, CSS variables in `globals.css`, `TopBar.tsx` sun/moon toggle, `Sidebar.tsx` hardcoded hex colors → `var(--navy)`/`var(--blue)`
- **Classification dropdown fix** — removed `overflow-hidden` from `ClassificationQueue.tsx` outer card; restored rounded corners via inner div wrappers so absolute-positioned dropdown escapes clipping
- **Click-outside handler** — `FileRow.tsx` got `useRef` + `useEffect` to close dropdown on outside click
- **Audit trail full rewrite** — `src/app/audit/page.tsx`: correct entity types (added `upload`, `vendor_rule`), all 18 real action types, per-type colored badges, filter applied on button click only, active filter chips, pagination (50/page)
- **Review stats fixed** — `GET /api/exceptions` now returns `summary: { pending, resolved, total }` from parallel count queries; `review/page.tsx` uses these instead of computing from filtered list (was always showing 0 resolved)
- **Session count sync** — `PATCH /api/exceptions/[id]` recomputes `matched_count`/`unmatched_count`/`flagged_count` on `reconciliation_sessions` after approve/reject/mark_resolved
- **Vendor rule learning** — `learnRule()` fires on approve, learns vendor → GL category mapping
- **Security audit** — verified RLS on all 9 tables, auth on all routes; found two gaps:
  - HSTS missing → added `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - CSP missing → added `Content-Security-Policy` (self + Supabase + Sentry; `unsafe-inline`/`unsafe-eval` for Next.js compat)
- **Security page text fixed** — OpenAI section now accurately describes both phases: (1) 5-row sample for classification, (2) transaction summaries (amount/date/vendor/description) for anomaly explanation
- **No git remote** — project is not a git repository; no push applicable

<!-- session-end: 2026-04-23 -->
