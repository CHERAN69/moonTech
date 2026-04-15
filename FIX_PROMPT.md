# FinOpsAi — Full Repair Prompt

You are a senior full-stack engineer. Fix all functional bugs in this Next.js 15 / Supabase app. Read every file before editing. Check `node_modules/next/dist/docs/` before writing Next.js code.

---

## CONFIRMED BUGS (fix these first)

### BUG 1 — `uploads` table missing `idempotency_key` column
`src/app/api/inbox/upload/route.ts` queries and inserts `.eq('idempotency_key', ...)` / `{ idempotency_key: ... }` but `supabase/migrations/004_uploads_and_vendor_rules.sql` has no such column. Every upload with an idempotency header causes a PostgREST 400.

**Fix A — migration:** Add to `004_uploads_and_vendor_rules.sql` (and produce a standalone patch SQL file `supabase/migrations/005_fix_uploads_idempotency.sql`):
```sql
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uploads_idempotency_key_idx ON uploads(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
```

**Fix B — route guard:** In `src/app/api/inbox/upload/route.ts` wrap the idempotency block so it only runs when the column actually has a value (it already is conditional, but verify the `.eq()` call won't fire on null).

---

### BUG 2 — Upload route sends `error_message` but column may not exist in live DB
`004_uploads_and_vendor_rules.sql` does define `error_message TEXT` — but confirm it is present. If the production DB was seeded from an older copy of the migration that lacked it, add it to migration 005:
```sql
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS error_message TEXT;
```

---

### BUG 3 — `GET /api/inbox/upload` not wired — Inbox page never loads data
`src/app/inbox/page.tsx` calls `fetch('/api/inbox/upload?limit=100')` on mount. Verify the `GET` handler in `src/app/api/inbox/upload/route.ts` is exported and returns `{ uploads: [], total: 0 }` shape. Confirm Next.js route file has no duplicate `route.ts` / `route 2.ts` conflict — there is a `upload 2` directory in `src/app/api/inbox/` which will shadow the real route on some systems. **Delete `src/app/api/inbox/upload 2/` and `src/app/api/inbox/count 2/` and `src/app/api/inbox/reconcile 2/`** (all `* 2` duplicates across the entire `src/` tree).

---

### BUG 4 — Duplicate `* 2` files throughout `src/` shadow real implementations
Run:
```bash
find src -name "* 2*" -o -name "*2.ts" -o -name "*2.tsx" | grep " 2"
```
Delete every file/folder whose name ends in ` 2` (space-2). These are stale copies that Next.js may pick up instead of the real files, or that cause TypeScript to see duplicate exports.

Also clean up at lib level:
- `src/lib/matching 2/` → delete
- `src/lib/openai 2/` → delete  
- `src/lib/reports 2/` → delete
- `src/lib/rules 2/` → delete
- `src/lib/__tests__ 2/` → delete
- `src/lib/rate-limit 2.ts` → delete
- `src/lib/rbac 2.ts` → delete
- `src/lib/utils 2.ts` → delete
- `src/lib/validation 2.ts` → delete
- `supabase/migrations 2/` → delete

---

### BUG 5 — Reports PDF route imports `PDF_STYLES` but uses it wrong
`src/app/api/reports/pdf/route.ts` does `const { s } = { s: PDF_STYLES }` — this works but is dead code smell. More critically: verify the `GET` handler correctly streams HTML back with `Content-Type: text/html`. Check that the report page's "Export PDF" button calls `/api/reports/pdf?type=...` (not the old `/api/reports/export`).

---

### BUG 6 — Reports page readiness fetch is disconnected
`src/app/reports/page.tsx` computes readiness client-side but needs real data. Verify it fetches from `/api/dashboard` (or a dedicated `/api/reports/readiness` endpoint) to get `unmatchedCount`, `pendingJournalEntries`, `checklistComplete`. If the fetch is missing or the endpoint returns null for all fields, the Generate button stays disabled forever. Wire it up.

---

### BUG 7 — `src/app/api/inbox/reconcile/route.ts` may be missing
The Inbox "Run Reconciliation" button POSTs to `/api/inbox/reconcile`. Confirm `src/app/api/inbox/reconcile/route.ts` exists and exports a `POST` handler. If missing, create it per the spec in `MASTER_PROMPT.md` §2.5.

---

## AUDIT STEPS (do these systematically)

1. **Find all `* 2` duplicates and delete them** — this is the highest-priority step.
2. **Run `npx tsc --noEmit`** — must pass clean.
3. **Trace each user-facing action end-to-end:**
   - Upload file → `POST /api/inbox/upload` → `uploads` table insert → response `{ upload_id, classification, ... }`
   - Confirm upload → `PATCH /api/inbox/upload` → `uploads.status = 'confirmed'`
   - Run reconciliation → `POST /api/inbox/reconcile` → creates `reconciliation_session` + `match_pairs`
   - View review → `GET /api/exceptions` → returns `match_pairs` with join
   - Approve exception → `PATCH /api/exceptions/[id]` → updates `resolution`
   - Generate report → `GET /api/reports/pdf?type=reconciliation` → returns HTML
   - Export CSV → `GET /api/reports/export?type=reconciliation` → returns CSV

4. **For each route above:** confirm the file exists, exports the correct HTTP verb, authenticates with `createClient()` + `getUser()`, and handles errors without throwing uncaught exceptions.

5. **Check Supabase RLS:** every table used by authenticated routes must have RLS enabled with a `user_id = auth.uid()` policy. Tables to verify: `uploads`, `vendor_rules`, `match_pairs`, `reconciliation_sessions`, `journal_entries`, `close_checklists`, `audit_log`.

6. **Environment:** `.env.local` must have `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENAI_API_KEY`. All present — do not change them.

---

## CONSTRAINTS

- Do NOT touch `src/app/page.tsx` (landing), auth pages, or the matching engine algorithm.
- Do NOT install new packages.
- Do NOT change the OpenAI model or Supabase auth pattern.
- Read each file before editing.
- After all fixes: run `npx tsc --noEmit` and confirm zero errors.
- Produce `supabase/migrations/005_fix_missing_columns.sql` with all ALTER TABLE fixes so the user can paste it into Supabase SQL Editor.
