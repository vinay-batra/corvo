create table if not exists public.transactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  ticker           text not null,
  type             text not null check (type in ('buy', 'sell')),
  date             date not null,
  shares           numeric(18, 6) not null check (shares > 0),
  price_per_share  numeric(18, 6) not null check (price_per_share >= 0),
  total_value      numeric(18, 6) generated always as (shares * price_per_share) stored,
  notes            text,
  created_at       timestamptz not null default now()
);

alter table public.transactions enable row level security;

create policy "users can select own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "users can insert own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "users can delete own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);

create index transactions_user_date_idx on public.transactions (user_id, date desc);
create index transactions_user_ticker_idx on public.transactions (user_id, ticker);
