-- Run this in your Supabase SQL editor

create table portfolios (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  assets jsonb not null,
  period text default '1y',
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table portfolios enable row level security;

-- Users can only see their own portfolios
create policy "Users can view own portfolios"
  on portfolios for select
  using (auth.uid() = user_id);

create policy "Users can insert own portfolios"
  on portfolios for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own portfolios"
  on portfolios for delete
  using (auth.uid() = user_id);

-- ─── Feature Votes ─────────────────────────────────────────────────────────

create table if not exists feature_votes (
  id uuid default gen_random_uuid() primary key,
  feature_name text unique not null,
  vote_count integer default 0
);

alter table feature_votes enable row level security;

-- Anyone (including anon) can read vote counts
create policy "Anyone can read feature votes"
  on feature_votes for select
  using (true);

-- Atomic increment via security-definer function (bypasses RLS for the update)
create or replace function increment_feature_vote(p_feature_name text)
returns void
language plpgsql
security definer
as $$
begin
  update feature_votes set vote_count = vote_count + 1 where feature_name = p_feature_name;
end;
$$;

-- Seed starting vote counts
insert into feature_votes (feature_name, vote_count) values
  ('Unlimited AI Chat', 47),
  ('Options Chain', 38),
  ('Tax Documents', 29),
  ('Mobile App', 52),
  ('Brokerage Connect', 41),
  ('Social Sharing', 23)
on conflict (feature_name) do nothing;
