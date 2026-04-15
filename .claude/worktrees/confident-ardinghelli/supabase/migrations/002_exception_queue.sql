-- ClosePilot AI — Exception Queue & Audit Enhancements
-- Version: 2.0 | April 2026
-- Run after 001_core_schema.sql

-- ─── Enhance match_pairs for exception workflow ────────────────────────────────
ALTER TABLE match_pairs
  ADD COLUMN IF NOT EXISTS resolution       TEXT CHECK (resolution IN ('approved', 'rejected', 'edited', 'resolved')),
  ADD COLUMN IF NOT EXISTS note             TEXT,
  ADD COLUMN IF NOT EXISTS ai_explanation   TEXT,
  ADD COLUMN IF NOT EXISTS gl_override      TEXT,
  ADD COLUMN IF NOT EXISTS manual_link_id   TEXT;

-- ─── Enhance audit_log with structured before/after values ───────────────────
ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS previous_value   JSONB,
  ADD COLUMN IF NOT EXISTS new_value        JSONB,
  ADD COLUMN IF NOT EXISTS user_email       TEXT;

-- ─── Exception queue performance indexes ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pairs_resolution         ON match_pairs(resolution);
CREATE INDEX IF NOT EXISTS idx_pairs_reviewed_at        ON match_pairs(reviewed_at);
CREATE INDEX IF NOT EXISTS idx_pairs_status_resolution  ON match_pairs(status, resolution);
CREATE INDEX IF NOT EXISTS idx_audit_action             ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created_at         ON audit_log(created_at DESC);

-- ─── Done ─────────────────────────────────────────────────────────────────────
-- Apply in Supabase Dashboard → SQL Editor → New Query → Paste → Run
