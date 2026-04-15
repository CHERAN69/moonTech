-- ============================================================
-- 006_nuclear_fix.sql  — Run this in Supabase SQL Editor NOW
-- Safe to run multiple times (all idempotent).
-- Fixes: "Failed to create upload record" error on Inbox page.
-- ============================================================

-- ─── 1. Extensions (required for uuid_generate_v4) ────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── 2. update_updated_at() trigger function ──────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── 3. profiles table (must exist before uploads FK) ─────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT NOT NULL,
  full_name           TEXT,
  company_name        TEXT,
  role                TEXT NOT NULL DEFAULT 'owner'
                      CHECK (role IN ('owner', 'admin', 'reviewer', 'viewer')),
  subscription_tier   TEXT NOT NULL DEFAULT 'starter'
                      CHECK (subscription_tier IN ('starter', 'growth', 'agency')),
  subscription_status TEXT NOT NULL DEFAULT 'trialing'
                      CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled')),
  stripe_customer_id  TEXT UNIQUE,
  settings            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_own" ON profiles;
CREATE POLICY "profiles_own" ON profiles FOR ALL USING (auth.uid() = id);

-- ─── 4. Auto-create profile on signup ────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, company_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'company_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── 5. Back-fill profiles for any auth users that have no profile yet ────────
INSERT INTO public.profiles (id, email, full_name, company_name)
SELECT
  u.id,
  u.email,
  u.raw_user_meta_data->>'full_name',
  u.raw_user_meta_data->>'company_name'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ─── 6. reconciliation_sessions (uploads has FK to this) ─────────────────────
CREATE TABLE IF NOT EXISTS reconciliation_sessions (
  id                         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name                       TEXT NOT NULL,
  period_start               DATE,
  period_end                 DATE,
  status                     TEXT NOT NULL DEFAULT 'processing'
                             CHECK (status IN ('processing', 'complete', 'error')),
  close_confidence_score     INTEGER NOT NULL DEFAULT 0
                             CHECK (close_confidence_score BETWEEN 0 AND 100),
  total_bank_transactions    INTEGER NOT NULL DEFAULT 0,
  total_invoice_transactions INTEGER NOT NULL DEFAULT 0,
  matched_count              INTEGER NOT NULL DEFAULT 0,
  unmatched_count            INTEGER NOT NULL DEFAULT 0,
  flagged_count              INTEGER NOT NULL DEFAULT 0,
  duplicate_count            INTEGER NOT NULL DEFAULT 0,
  total_matched_amount       NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_unmatched_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
  signed_off_by              UUID REFERENCES profiles(id),
  signed_off_at              TIMESTAMPTZ,
  metadata                   JSONB DEFAULT '{}',
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reconciliation_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sessions_own" ON reconciliation_sessions;
CREATE POLICY "sessions_own" ON reconciliation_sessions FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON reconciliation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON reconciliation_sessions(created_at DESC);

DROP TRIGGER IF EXISTS sessions_updated_at ON reconciliation_sessions;
CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON reconciliation_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── 7. uploads table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS uploads (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  filename                  TEXT NOT NULL,
  file_size_bytes           INTEGER,
  mime_type                 TEXT,
  classification            TEXT CHECK (classification IN (
                              'bank_statement','invoice','payroll',
                              'journal_entry','receipt','expense_report','other'
                            )),
  classification_confidence INTEGER CHECK (classification_confidence BETWEEN 0 AND 100),
  classification_reasoning  TEXT,
  detected_entity           TEXT,
  suggested_period_start    DATE,
  suggested_period_end      DATE,
  column_mapping            JSONB DEFAULT '{}',
  transactions_count        INTEGER DEFAULT 0,
  status                    TEXT NOT NULL DEFAULT 'processing'
                            CHECK (status IN ('processing','classified','confirmed','error')),
  category_hint             TEXT,
  parsed_data               JSONB,
  session_id                UUID REFERENCES reconciliation_sessions(id) ON DELETE SET NULL,
  error_message             TEXT,
  idempotency_key           TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns if the table existed without them
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS mime_type                TEXT;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS category_hint            TEXT;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS parsed_data              JSONB;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS session_id               UUID REFERENCES reconciliation_sessions(id) ON DELETE SET NULL;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS error_message            TEXT;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS idempotency_key          TEXT;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS classification_reasoning TEXT;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS detected_entity          TEXT;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS suggested_period_start   DATE;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS suggested_period_end     DATE;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS column_mapping           JSONB DEFAULT '{}';

-- Unique index for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS uploads_idempotency_key_idx
  ON uploads(user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Performance indexes
CREATE INDEX IF NOT EXISTS uploads_user_id_idx    ON uploads(user_id);
CREATE INDEX IF NOT EXISTS uploads_status_idx     ON uploads(user_id, status);
CREATE INDEX IF NOT EXISTS uploads_created_at_idx ON uploads(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS uploads_session_id_idx ON uploads(session_id);

-- RLS
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "uploads_owner" ON uploads;
CREATE POLICY "uploads_owner" ON uploads FOR ALL USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS uploads_updated_at ON uploads;
CREATE TRIGGER uploads_updated_at
  BEFORE UPDATE ON uploads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── 8. match_pairs ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS match_pairs (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id           UUID NOT NULL REFERENCES reconciliation_sessions(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bank_transaction     JSONB NOT NULL,
  invoice_transaction  JSONB,
  status               TEXT NOT NULL DEFAULT 'unmatched'
                       CHECK (status IN ('matched','unmatched','flagged','duplicate','suggested','excluded')),
  confidence           INTEGER NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 100),
  match_method         TEXT CHECK (match_method IN ('exact','fuzzy_ai','manual','rule')),
  explanation          TEXT,
  suggested_action     TEXT,
  gl_category          TEXT,
  flags                JSONB DEFAULT '[]',
  reviewed_by          UUID REFERENCES profiles(id),
  reviewed_at          TIMESTAMPTZ,
  override_reason      TEXT,
  resolution           TEXT CHECK (resolution IN ('approved','rejected','edited','resolved')),
  note                 TEXT,
  ai_explanation       TEXT,
  gl_override          TEXT,
  manual_link_id       TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE match_pairs ADD COLUMN IF NOT EXISTS resolution     TEXT CHECK (resolution IN ('approved','rejected','edited','resolved'));
ALTER TABLE match_pairs ADD COLUMN IF NOT EXISTS note           TEXT;
ALTER TABLE match_pairs ADD COLUMN IF NOT EXISTS ai_explanation TEXT;
ALTER TABLE match_pairs ADD COLUMN IF NOT EXISTS gl_override    TEXT;
ALTER TABLE match_pairs ADD COLUMN IF NOT EXISTS manual_link_id TEXT;
ALTER TABLE match_pairs ADD COLUMN IF NOT EXISTS override_reason TEXT;

ALTER TABLE match_pairs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pairs_own" ON match_pairs;
CREATE POLICY "pairs_own" ON match_pairs FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_pairs_session_id           ON match_pairs(session_id);
CREATE INDEX IF NOT EXISTS idx_pairs_user_id              ON match_pairs(user_id);
CREATE INDEX IF NOT EXISTS idx_pairs_status               ON match_pairs(status);
CREATE INDEX IF NOT EXISTS idx_pairs_resolution           ON match_pairs(resolution);
CREATE INDEX IF NOT EXISTS idx_pairs_status_resolution    ON match_pairs(status, resolution);
CREATE INDEX IF NOT EXISTS idx_pairs_pending_exceptions   ON match_pairs(user_id, created_at DESC) WHERE resolution IS NULL;

DROP TRIGGER IF EXISTS pairs_updated_at ON match_pairs;
CREATE TRIGGER pairs_updated_at
  BEFORE UPDATE ON match_pairs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── 9. audit_log ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_type    TEXT NOT NULL,
  entity_id      UUID NOT NULL,
  action         TEXT NOT NULL,
  changes        JSONB DEFAULT '{}',
  previous_value JSONB,
  new_value      JSONB,
  user_email     TEXT,
  ai_involved    BOOLEAN NOT NULL DEFAULT FALSE,
  ip_address     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS previous_value JSONB;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS new_value      JSONB;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS user_email     TEXT;

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_own" ON audit_log;
CREATE POLICY "audit_own" ON audit_log FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_audit_entity     ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user_id    ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action     ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at DESC);

-- ─── 10. journal_entries ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS journal_entries (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id   UUID REFERENCES reconciliation_sessions(id) ON DELETE SET NULL,
  pair_id      UUID REFERENCES match_pairs(id) ON DELETE SET NULL,
  date         DATE NOT NULL,
  description  TEXT NOT NULL,
  lines        JSONB NOT NULL DEFAULT '[]',
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft','pending_approval','approved','posted','rejected')),
  ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  ai_reasoning TEXT,
  created_by   UUID REFERENCES profiles(id),
  approved_by  UUID REFERENCES profiles(id),
  approved_at  TIMESTAMPTZ,
  posted_at    TIMESTAMPTZ,
  qbo_je_id    TEXT,
  xero_je_id   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "journal_own" ON journal_entries;
CREATE POLICY "journal_own" ON journal_entries FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_journal_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_status  ON journal_entries(status);

DROP TRIGGER IF EXISTS journal_updated_at ON journal_entries;
CREATE TRIGGER journal_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── 11. close_checklists ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS close_checklists (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  tasks         JSONB NOT NULL DEFAULT '[]',
  signed_off    BOOLEAN NOT NULL DEFAULT FALSE,
  signed_off_by UUID REFERENCES profiles(id),
  signed_off_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE close_checklists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "checklists_own" ON close_checklists;
CREATE POLICY "checklists_own" ON close_checklists FOR ALL USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS checklists_updated_at ON close_checklists;
CREATE TRIGGER checklists_updated_at
  BEFORE UPDATE ON close_checklists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── 12. vendor_mappings ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendor_mappings (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  raw_name       TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  gl_category    TEXT,
  confidence     INTEGER DEFAULT 100,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, raw_name)
);

ALTER TABLE vendor_mappings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vendor_own" ON vendor_mappings;
CREATE POLICY "vendor_own" ON vendor_mappings FOR ALL USING (auth.uid() = user_id);

-- ─── 13. vendor_rules ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendor_rules (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vendor_pattern         TEXT NOT NULL,
  gl_category            TEXT NOT NULL,
  auto_approve           BOOLEAN NOT NULL DEFAULT FALSE,
  auto_approve_threshold INTEGER NOT NULL DEFAULT 90
                         CHECK (auto_approve_threshold BETWEEN 0 AND 100),
  created_from           TEXT NOT NULL DEFAULT 'manual'
                         CHECK (created_from IN ('manual','learned')),
  times_applied          INTEGER NOT NULL DEFAULT 0,
  last_applied           TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, vendor_pattern)
);

ALTER TABLE vendor_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vendor_rules_owner" ON vendor_rules;
CREATE POLICY "vendor_rules_owner" ON vendor_rules FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS vendor_rules_user_idx ON vendor_rules(user_id);

-- ─── Done ─────────────────────────────────────────────────────────────────────
-- All tables, columns, indexes, RLS policies created/patched.
