-- ============================================================
-- SPPG Scheduler v3 Migration
-- Run in Supabase → SQL Editor → New Query
-- ============================================================

-- 1. Add hidden flag to time_blocks so admin can hide past/completed blocks
ALTER TABLE time_blocks ADD COLUMN IF NOT EXISTS hidden_from_panelists boolean DEFAULT false;

-- 2. Update default buffer to 10 mins (was 5)
UPDATE config SET buffer_mins = 10 WHERE id = 1;

-- 3. Log the migration
INSERT INTO activity_log (type, message, meta)
VALUES ('admin', 'v3 migration: buffer 5→10 mins, hidden_from_panelists column added', '{}');
