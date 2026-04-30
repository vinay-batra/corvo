ALTER TABLE profiles ADD COLUMN IF NOT EXISTS life_events jsonb NOT NULL DEFAULT '[]'::jsonb;
