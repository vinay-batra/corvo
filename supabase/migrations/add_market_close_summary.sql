ALTER TABLE email_preferences
  ADD COLUMN IF NOT EXISTS market_close_summary boolean DEFAULT true;
