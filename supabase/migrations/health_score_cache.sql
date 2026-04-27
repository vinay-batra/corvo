-- Health Score Cache
-- One AI-generated score per user per day per portfolio composition.
-- Backend upserts on generate, reads before calling Claude to avoid daily re-generation.

create table if not exists health_score_cache (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  date text not null,
  tickers_hash text not null,
  score integer not null,
  headline text not null default '',
  actions jsonb not null default '[]',
  created_at timestamp with time zone default now(),
  unique (user_id, date, tickers_hash)
);

alter table health_score_cache enable row level security;
