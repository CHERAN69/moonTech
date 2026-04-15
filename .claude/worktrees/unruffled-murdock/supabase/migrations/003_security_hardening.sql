-- ============================================================
-- Migration 003: Security hardening
-- ============================================================
-- 1. Make audit_log append-only (remove UPDATE and DELETE from RLS)
-- 2. Add webhook dead-letter queue table
-- 3. Add notifications table
-- 4. Add user_preferences for GDPR / date format
-- ============================================================

-- ─── 1. Audit log: append-only RLS ───────────────────────────────────────────
-- Drop the overly-permissive FOR ALL policy and replace with INSERT + SELECT only.

ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own audit logs"   ON audit_log;
DROP POLICY IF EXISTS "Users see own audit logs"                ON audit_log;
DROP POLICY IF EXISTS "users_audit_all"                         ON audit_log;

-- Users may only INSERT and SELECT their own rows — never UPDATE or DELETE
CREATE POLICY "audit_log_insert" ON audit_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "audit_log_select" ON audit_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Revoke UPDATE and DELETE at table level for the authenticated role
REVOKE UPDATE ON audit_log FROM authenticated;
REVOKE DELETE ON audit_log FROM authenticated;

-- ─── 2. Webhook dead-letter queue ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS webhook_dead_letters (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    text NOT NULL,
  event_type  text NOT NULL,
  payload     jsonb NOT NULL DEFAULT '{}',
  error       text,
  attempts    int  NOT NULL DEFAULT 1,
  resolved    boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Only service_role can read/write dead letters (not exposed to authenticated users)
ALTER TABLE webhook_dead_letters ENABLE ROW LEVEL SECURITY;
-- No RLS policies = service_role only access

-- ─── 3. Notifications table ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text NOT NULL,           -- 'anomaly' | 'journal_pending' | 'close_ready' | 'info'
  title       text NOT NULL,
  body        text,
  read        boolean NOT NULL DEFAULT false,
  action_url  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, read, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select" ON notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_update_read" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── 4. User preferences (GDPR + date format + locale) ───────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS date_format    text DEFAULT 'MM/dd/yyyy',
  ADD COLUMN IF NOT EXISTS timezone       text DEFAULT 'America/New_York',
  ADD COLUMN IF NOT EXISTS industry       text,
  ADD COLUMN IF NOT EXISTS fiscal_year_end text DEFAULT 'December 31',
  ADD COLUMN IF NOT EXISTS base_currency  text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at     timestamptz;

-- Soft-delete: mark profile as deleted but retain for audit
CREATE INDEX IF NOT EXISTS idx_profiles_not_deleted
  ON profiles (id) WHERE deleted_at IS NULL;
