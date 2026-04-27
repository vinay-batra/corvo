-- Add morning_briefing, week_in_review, monthly_summary, and email_theme columns
-- to email_preferences. Uses IF NOT EXISTS so it is safe to re-run.
ALTER TABLE email_preferences
  ADD COLUMN IF NOT EXISTS morning_briefing BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS week_in_review   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS monthly_summary  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_theme      TEXT    DEFAULT 'light';
