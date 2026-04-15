-- Migration 005: Add missing columns to uploads table
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS error_message TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uploads_idempotency_key_idx ON uploads(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
