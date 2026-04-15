-- ClosePilot AI — Core Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- Version: 1.0 | April 2026

-- ─── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fuzzy text search

-- ─── Profiles ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT NOT NULL,
  full_name           TEXT,
  company_name        TEXT,
  role                TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'reviewer', 'viewer')),
  subscription_tier   TEXT NOT NULL DEFAULT 'starter' CHECK (subscription_tier IN ('starter', 'growth', 'agency')),
  subscription_status TEXT NOT NULL DEFAULT 'trialing' CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled')),
  stripe_customer_id  TEXT UNIQUE,
  settings            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Reconciliation Sessions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reconciliation_sessions (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name                      TEXT NOT NULL,
  period_start              DATE,
  period_end                DATE,
  status                    TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'complete', 'error')),
  close_confidence_score    INTEGER NOT NULL DEFAULT 0 CHECK (close_confidence_score BETWEEN 0 AND 100),
  total_bank_transactions   INTEGER NOT NULL DEFAULT 0,
  total_invoice_transactions INTEGER NOT NULL DEFAULT 0,
  matched_count             INTEGER NOT NULL DEFAULT 0,
  unmatched_count           INTEGER NOT NULL DEFAULT 0,
  flagged_count             INTEGER NOT NULL DEFAULT 0,
  duplicate_count           INTEGER NOT NULL DEFAULT 0,
  total_matched_amount      NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_unmatched_amount    NUMERIC(15, 2) NOT NULL DEFAULT 0,
  signed_off_by             UUID REFERENCES profiles(id),
  signed_off_at             TIMESTAMPTZ,
  metadata                  JSONB DEFAULT '{}',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Match Pairs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS match_pairs (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id           UUID NOT NULL REFERENCES reconciliation_sessions(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bank_transaction     JSONB NOT NULL,
  invoice_transaction  JSONB,
  status               TEXT NOT NULL DEFAULT 'unmatched' CHECK (status IN ('matched', 'unmatched', 'flagged', 'duplicate', 'suggested', 'excluded')),
  confidence           INTEGER NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 100),
  match_method         TEXT CHECK (match_method IN ('exact', 'fuzzy_ai', 'manual', 'rule')),
  explanation          TEXT,
  suggested_action     TEXT,
  gl_category          TEXT,
  flags                JSONB DEFAULT '[]',
  reviewed_by          UUID REFERENCES profiles(id),
  reviewed_at          TIMESTAMPTZ,
  override_reason      TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Journal Entries ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS journal_entries (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id     UUID REFERENCES reconciliation_sessions(id) ON DELETE SET NULL,
  pair_id        UUID REFERENCES match_pairs(id) ON DELETE SET NULL,
  date           DATE NOT NULL,
  description    TEXT NOT NULL,
  lines          JSONB NOT NULL DEFAULT '[]',
  total_amount   NUMERIC(15, 2) NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'posted', 'rejected')),
  ai_generated   BOOLEAN NOT NULL DEFAULT FALSE,
  ai_reasoning   TEXT,
  created_by     UUID REFERENCES profiles(id),
  approved_by    UUID REFERENCES profiles(id),
  approved_at    TIMESTAMPTZ,
  posted_at      TIMESTAMPTZ,
  qbo_je_id      TEXT, -- QuickBooks Online JE ID after sync
  xero_je_id     TEXT, -- Xero JE ID after sync
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Close Checklists ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS close_checklists (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end   DATE NOT NULL,
  tasks        JSONB NOT NULL DEFAULT '[]',
  signed_off   BOOLEAN NOT NULL DEFAULT FALSE,
  signed_off_by UUID REFERENCES profiles(id),
  signed_off_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CFO Briefings ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cfo_briefings (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  briefing_date DATE NOT NULL,
  headline     TEXT,
  bullets      JSONB DEFAULT '[]',
  actions      JSONB DEFAULT '[]',
  risk_alerts  JSONB DEFAULT '[]',
  metrics_snapshot JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, briefing_date)
);

-- ─── Audit Log ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_type  TEXT NOT NULL, -- 'match_pair', 'journal_entry', 'close_checklist', etc.
  entity_id    UUID NOT NULL,
  action       TEXT NOT NULL, -- 'created', 'updated', 'approved', 'rejected', 'posted'
  changes      JSONB DEFAULT '{}',
  ai_involved  BOOLEAN NOT NULL DEFAULT FALSE,
  ip_address   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Vendor Mappings (Learned) ────────────────────────────────────────────────
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

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON reconciliation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON reconciliation_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pairs_session_id ON match_pairs(session_id);
CREATE INDEX IF NOT EXISTS idx_pairs_user_id ON match_pairs(user_id);
CREATE INDEX IF NOT EXISTS idx_pairs_status ON match_pairs(status);
CREATE INDEX IF NOT EXISTS idx_journal_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_status ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_log(user_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE close_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE cfo_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_mappings ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only see/edit their own profile
CREATE POLICY "profiles_own" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Reconciliation sessions: users see only their own
CREATE POLICY "sessions_own" ON reconciliation_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Match pairs: users see only their own
CREATE POLICY "pairs_own" ON match_pairs
  FOR ALL USING (auth.uid() = user_id);

-- Journal entries: users see only their own
CREATE POLICY "journal_own" ON journal_entries
  FOR ALL USING (auth.uid() = user_id);

-- Close checklists: users see only their own
CREATE POLICY "checklists_own" ON close_checklists
  FOR ALL USING (auth.uid() = user_id);

-- CFO briefings: users see only their own
CREATE POLICY "briefings_own" ON cfo_briefings
  FOR ALL USING (auth.uid() = user_id);

-- Audit log: users see only their own entries
CREATE POLICY "audit_own" ON audit_log
  FOR ALL USING (auth.uid() = user_id);

-- Vendor mappings: users see only their own
CREATE POLICY "vendor_own" ON vendor_mappings
  FOR ALL USING (auth.uid() = user_id);

-- ─── Auto-update updated_at ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER sessions_updated_at BEFORE UPDATE ON reconciliation_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER pairs_updated_at BEFORE UPDATE ON match_pairs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER journal_updated_at BEFORE UPDATE ON journal_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER checklists_updated_at BEFORE UPDATE ON close_checklists FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Auto-create profile on signup ────────────────────────────────────────────
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

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Done ─────────────────────────────────────────────────────────────────────
-- Schema created successfully.
-- Next step: Set your .env.local values and run: npm run dev
