-- ClosePilot AI — Audit Log Enhancements
-- Version: 3.0 | April 2026
-- Run after 002_exception_queue.sql

-- ─── Composite index for UI filters (entity_type + action + created_at) ────────
CREATE INDEX IF NOT EXISTS idx_audit_entity_type_action
  ON audit_log(user_id, entity_type, action, created_at DESC);

-- Index for user_email lookup (useful for team audit filtering later)
CREATE INDEX IF NOT EXISTS idx_audit_user_email
  ON audit_log(user_email)
  WHERE user_email IS NOT NULL;

-- ─── Convenience function: log_audit_event ────────────────────────────────────
-- Callable from any SQL context (triggers, RPC, etc.)
-- Usage: SELECT log_audit_event('user-uuid','user@example.com','match_pair','pair-uuid','approve','{}',NULL,NULL,false);
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id      UUID,
  p_user_email   TEXT,
  p_entity_type  TEXT,
  p_entity_id    UUID,
  p_action       TEXT,
  p_changes      JSONB  DEFAULT '{}',
  p_prev         JSONB  DEFAULT NULL,
  p_next         JSONB  DEFAULT NULL,
  p_ai_involved  BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO audit_log (
    user_id, user_email, entity_type, entity_id,
    action, changes, previous_value, new_value, ai_involved
  )
  VALUES (
    p_user_id, p_user_email, p_entity_type, p_entity_id,
    p_action, p_changes, p_prev, p_next, p_ai_involved
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ─── Done ─────────────────────────────────────────────────────────────────────
-- Apply in Supabase Dashboard → SQL Editor → New Query → Paste → Run
