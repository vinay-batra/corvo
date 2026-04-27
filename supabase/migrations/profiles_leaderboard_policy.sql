-- Allow any authenticated user to read all profiles rows.
-- This is required for the global leaderboard to work. Without this policy,
-- RLS restricts each user to only seeing their own row, so the leaderboard
-- query returns at most one entry.
-- The client query already limits selected columns to display_name, xp, and id.

CREATE POLICY "Authenticated users can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);
