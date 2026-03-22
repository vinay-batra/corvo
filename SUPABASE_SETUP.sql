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
