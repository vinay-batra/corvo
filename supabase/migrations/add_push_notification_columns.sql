-- Add granular push notification preference columns to email_preferences.
-- Safe to re-run (IF NOT EXISTS on each column).
ALTER TABLE email_preferences
  ADD COLUMN IF NOT EXISTS push_morning_briefing   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS push_market_close       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS push_price_alerts       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS push_price_targets      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS push_weekly_checkup     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS push_earnings_reminders BOOLEAN NOT NULL DEFAULT false;
