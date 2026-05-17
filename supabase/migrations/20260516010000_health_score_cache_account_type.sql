-- v0.34 health_score_cache repair + account_type partitioning.
--
-- Discovered while wiring v0.34: prod schema diverged at some point from
-- supabase/migrations/health_score_cache.sql. Prod has only (user_id,
-- score, headline, actions) - missing id, date, tickers_hash, created_at,
-- and the unique constraint that PostgREST's merge-duplicates upsert
-- depends on. As a result _hs_load_from_supabase and _hs_save_to_supabase
-- have been silent no-ops on every cold start (in-memory cache still works
-- while the process is warm, but the persisted layer was dead).
--
-- Drop and recreate with the canonical schema + account_type from day one.
-- Verified 0 rows in prod before writing this migration, so no data loss.
-- Recreates the RLS policy from 20260511000000_security_hardening.sql since
-- DROP TABLE takes the policy with it.

drop table if exists health_score_cache;

create table health_score_cache (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  date text not null,
  tickers_hash text not null,
  account_type text not null default '',
  score integer not null,
  headline text not null default '',
  actions jsonb not null default '[]',
  created_at timestamptz default now(),
  unique (user_id, date, tickers_hash, account_type)
);

alter table health_score_cache enable row level security;

create policy "Users read own health scores"
  on health_score_cache
  for select
  to authenticated
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';
