-- DATA-PERF-1 (DATA-01) + DATA-02 fix: reproduce the three tables that exist
-- only in prod (created out-of-band, never tracked by a migration) and add the
-- indexes the backend's hot query paths need.
--
-- IMPORTANT: the column definitions below were INFERRED from how the backend
-- (backend/main.py) and the frontend (components/AlertsPanel.tsx, AiChat.tsx)
-- read and write these tables - there is no canonical schema migration for them.
-- RECONCILE these `create table if not exists` blocks against the LIVE prod
-- schema before relying on them; if a table already exists with a slightly
-- different shape, `create table if not exists` is a no-op and will NOT alter it,
-- so the indexes/RLS below are what actually take effect in prod. Confirm each
-- column exists live; add any missing column with a separate `add column if not
-- exists` if prod drifts from this inference.
--
-- Inference sources:
--   price_alerts      - AlertsPanel.tsx select/insert: id, user_id, ticker, type,
--                       condition, threshold, triggered, created_at, portfolio_id;
--                       backend filters triggered=eq.false & type=eq.<price|portfolio>.
--   push_subscriptions- backend posts {user_id, subscription(jsonb)} and reads
--                       subscription->>endpoint; filtered by user_id everywhere.
--   chat_usage        - backend inserts {user_id} and counts by user_id +
--                       created_at >= today (DATA-02 hot path).
--
-- Idempotent: every table, policy, and index is guarded so re-running against
-- populated prod is a no-op.

-- ── price_alerts ─────────────────────────────────────────────────────────────
create table if not exists public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'price',          -- 'price' | 'portfolio'
  ticker text,                                  -- null for portfolio alerts
  portfolio_id uuid,                            -- null for price alerts
  condition text not null,                      -- 'rises' | 'drops'
  threshold numeric not null,                   -- percent move
  triggered boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.price_alerts enable row level security;

drop policy if exists "price_alerts_own" on public.price_alerts;
create policy "price_alerts_own"
  on public.price_alerts for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- The alert loop scans WHERE triggered=false AND type=eq.<x> on every tick;
-- a partial index keeps it tiny (only untriggered rows).
create index if not exists price_alerts_active_type_idx
  on public.price_alerts (type)
  where triggered = false;

create index if not exists price_alerts_user_idx
  on public.price_alerts (user_id);

-- ── push_subscriptions ───────────────────────────────────────────────────────
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription jsonb not null,                  -- web-push PushSubscription JSON
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_own" on public.push_subscriptions;
create policy "push_subscriptions_own"
  on public.push_subscriptions for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Every push path filters by user_id.
create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

-- ── chat_usage ───────────────────────────────────────────────────────────────
create table if not exists public.chat_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.chat_usage enable row level security;

drop policy if exists "chat_usage_own" on public.chat_usage;
create policy "chat_usage_own"
  on public.chat_usage for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- The per-message daily-count check filters user_id + created_at on every /chat
-- call (DATA-02). Without this index that count=exact query is a seq scan.
create index if not exists chat_usage_user_created_idx
  on public.chat_usage (user_id, created_at desc);

notify pgrst, 'reload schema';
