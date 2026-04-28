ALTER TABLE email_preferences
  ADD COLUMN IF NOT EXISTS push_notifications boolean NOT NULL DEFAULT true;
