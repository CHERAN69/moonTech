-- Phase 2 + 7 Migration: uploads table + vendor_rules table
-- Run in: Supabase Dashboard → SQL Editor → New Query → Paste → Run

-- ─── Uploads ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS uploads (
  id                         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  filename                   TEXT NOT NULL,
  file_size_bytes            INTEGER,
  mime_type                  TEXT,
  classification             TEXT CHECK (classification IN (
                               'bank_statement', 'invoice', 'payroll',
                               'journal_entry', 'receipt', 'expense_report', 'other'
                             )),
  classification_confidence  INTEGER CHECK (classification_confidence BETWEEN 0 AND 100),
  classification_reasoning   TEXT,
  detected_entity            TEXT,
  suggested_period_start     DATE,
  suggested_period_end       DATE,
  column_mapping             JSONB DEFAULT '{}',
  transactions_count         INTEGER DEFAULT 0,
  status                     TEXT NOT NULL DEFAULT 'processing'
                             CHECK (status IN ('processing', 'classified', 'confirmed', 'error')),
  category_hint              TEXT,
  parsed_data                JSONB,          -- stored as array of RawTransaction
  session_id                 UUID REFERENCES reconciliation_sessions(id) ON DELETE SET NULL,
  error_message              TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS uploads_user_id_idx       ON uploads(user_id);
CREATE INDEX IF NOT EXISTS uploads_status_idx         ON uploads(user_id, status);
CREATE INDEX IF NOT EXISTS uploads_created_at_idx     ON uploads(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS uploads_session_id_idx     ON uploads(session_id);

-- RLS
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uploads_owner" ON uploads
  FOR ALL USING (auth.uid() = user_id);

-- updated_at trigger (reuse pattern from other tables)
CREATE OR REPLACE TRIGGER uploads_updated_at
  BEFORE UPDATE ON uploads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Vendor Rules ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vendor_rules (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vendor_pattern           TEXT NOT NULL,
  gl_category              TEXT NOT NULL,
  auto_approve             BOOLEAN NOT NULL DEFAULT FALSE,
  auto_approve_threshold   INTEGER NOT NULL DEFAULT 90
                           CHECK (auto_approve_threshold BETWEEN 0 AND 100),
  created_from             TEXT NOT NULL DEFAULT 'manual'
                           CHECK (created_from IN ('manual', 'learned')),
  times_applied            INTEGER NOT NULL DEFAULT 0,
  last_applied             TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, vendor_pattern)
);

CREATE INDEX IF NOT EXISTS vendor_rules_user_idx ON vendor_rules(user_id);

ALTER TABLE vendor_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendor_rules_owner" ON vendor_rules
  FOR ALL USING (auth.uid() = user_id);

CREATE OR REPLACE TRIGGER vendor_rules_updated_at
  BEFORE UPDATE ON vendor_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
