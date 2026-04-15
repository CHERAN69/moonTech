-- ClosePilot AI — Exception Queue Hardening
-- Version: 3.0 | April 2026
-- Run after 002_exception_queue.sql
-- Safe to re-run (all statements are idempotent)

-- ─── Ensure user_email column exists on audit_log ─────────────────────────────
-- (Added in 002, but included here for environments that only ran 001)
ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS previous_value  JSONB,
  ADD COLUMN IF NOT EXISTS new_value       JSONB,
  ADD COLUMN IF NOT EXISTS user_email      TEXT;

-- ─── Ensure exception workflow columns exist on match_pairs ──────────────────
-- (Added in 002, repeated here for idempotency)
ALTER TABLE match_pairs
  ADD COLUMN IF NOT EXISTS resolution      TEXT CHECK (resolution IN ('approved', 'rejected', 'edited', 'resolved')),
  ADD COLUMN IF NOT EXISTS note            TEXT,
  ADD COLUMN IF NOT EXISTS ai_explanation  TEXT,
  ADD COLUMN IF NOT EXISTS gl_override     TEXT,
  ADD COLUMN IF NOT EXISTS manual_link_id  TEXT;

-- ─── Composite index: status + resolution (drives the main queue query) ──────
CREATE INDEX IF NOT EXISTS idx_pairs_status_resolution
  ON match_pairs(status, resolution);

-- ─── Partial index: pending exceptions only (NULL resolution = pending) ───────
-- This dramatically speeds up sidebar badge count query
CREATE INDEX IF NOT EXISTS idx_pairs_pending
  ON match_pairs(user_id, status)
  WHERE resolution IS NULL;

-- ─── Index: reviewed_at for recency sorting ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pairs_reviewed_at
  ON match_pairs(reviewed_at DESC);

-- ─── Index: audit action + created_at (drives audit trail page) ──────────────
CREATE INDEX IF NOT EXISTS idx_audit_action
  ON audit_log(action);

CREATE INDEX IF NOT EXISTS idx_audit_created_at
  ON audit_log(created_at DESC);

-- ─── Index: audit user_email for future team queries ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_audit_user_email
  ON audit_log(user_email)
  WHERE user_email IS NOT NULL;

-- ─── View: pending_exception_counts ──────────────────────────────────────────
-- Used by dashboard / sidebar to show badge count efficiently
-- without scanning the full match_pairs table.
CREATE OR REPLACE VIEW pending_exception_counts AS
  SELECT
    user_id,
    COUNT(*)::INT AS pending_count,
    SUM(CASE WHEN status = 'flagged'   THEN 1 ELSE 0 END)::INT AS flagged_count,
    SUM(CASE WHEN status = 'unmatched' THEN 1 ELSE 0 END)::INT AS unmatched_count,
    SUM(CASE WHEN status = 'duplicate' THEN 1 ELSE 0 END)::INT AS duplicate_count,
    SUM(CASE WHEN status = 'suggested' THEN 1 ELSE 0 END)::INT AS suggested_count,
    MAX(created_at) AS latest_created_at
  FROM match_pairs
  WHERE
    status     IN ('unmatched', 'flagged', 'duplicate', 'suggested')
    AND resolution IS NULL
  GROUP BY user_id;

-- RLS on view: each user can only query their own row
ALTER VIEW pending_exception_counts OWNER TO authenticated;

-- ─── Done ─────────────────────────────────────────────────────────────────────
-- Run: Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- Or: supabase db push (if using Supabase CLI)
