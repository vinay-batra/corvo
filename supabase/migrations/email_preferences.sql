CREATE TABLE email_preferences (
  user_id    uuid references auth.users(id) on delete cascade primary key,
  weekly_digest boolean default true,
  price_alerts  boolean default true,
  news_summary  boolean default false,
  updated_at    timestamptz default now()
);

ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own prefs"
  ON email_preferences
  FOR ALL
  USING (auth.uid() = user_id);
