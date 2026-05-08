create table if not exists portfolio_snapshots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  portfolio_id uuid not null,
  date date not null,
  raw_value numeric not null,
  portfolio_value numeric not null,
  cumulative_return numeric not null,
  created_at timestamptz default now(),
  unique(portfolio_id, date)
);

alter table portfolio_snapshots enable row level security;

create policy "Users can manage their own snapshots"
  on portfolio_snapshots for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Allow service role full access (for backend upserts)
create policy "Service role full access"
  on portfolio_snapshots for all
  using (true)
  with check (true);
