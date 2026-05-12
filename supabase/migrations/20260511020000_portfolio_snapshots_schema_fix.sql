-- portfolio_snapshots schema reconciliation
-- The legacy migration `portfolio_snapshots.sql` (no timestamp prefix) was
-- never picked up by `supabase db push`, so the live table may be missing
-- columns that newer backend code expects. This migration is idempotent and
-- safe to re-run.
--
-- Symptom that triggered this fix: backend logs showed
--   [snapshot] insert failed: 400 - "Could not find the 'date' column of
--   'portfolio_snapshots' in the schema cache"
-- which means PostgREST didn't see the column. Either it was never created,
-- or the schema cache was stale. We make sure the column exists, then nudge
-- PostgREST to reload its cache.

-- 1. Make sure the table exists with all expected columns. CREATE TABLE
--    IF NOT EXISTS is a no-op if the table is already there.
create table if not exists portfolio_snapshots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  portfolio_id uuid not null,
  date date not null,
  raw_value numeric not null,
  portfolio_value numeric not null,
  cumulative_return numeric not null,
  created_at timestamptz default now()
);

-- 2. If the table existed but was missing columns, add them. Each ADD COLUMN
--    IF NOT EXISTS is a no-op when the column is already present.
alter table portfolio_snapshots add column if not exists date date;
alter table portfolio_snapshots add column if not exists raw_value numeric;
alter table portfolio_snapshots add column if not exists portfolio_value numeric;
alter table portfolio_snapshots add column if not exists cumulative_return numeric;
alter table portfolio_snapshots add column if not exists created_at timestamptz default now();
alter table portfolio_snapshots add column if not exists portfolio_id uuid;
alter table portfolio_snapshots add column if not exists user_id uuid;

-- 3. Ensure the unique constraint on (portfolio_id, date). Drop+create so we
--    can guarantee the index name is stable. Wrapped in DO so an existing
--    differently-named unique survives without error.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'portfolio_snapshots_portfolio_id_date_key'
  ) then
    begin
      alter table portfolio_snapshots
        add constraint portfolio_snapshots_portfolio_id_date_key
        unique (portfolio_id, date);
    exception when others then
      -- Another unique constraint or index on the same columns already exists;
      -- that is fine, the backend just needs SOME uniqueness for upserts.
      null;
    end;
  end if;
end$$;

-- 4. Enable RLS (no-op if already on) and ensure policies exist.
alter table portfolio_snapshots enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'portfolio_snapshots'
      and policyname = 'Users can manage their own snapshots'
  ) then
    create policy "Users can manage their own snapshots"
      on portfolio_snapshots for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'portfolio_snapshots'
      and policyname = 'Service role full access'
  ) then
    create policy "Service role full access"
      on portfolio_snapshots for all
      using (true)
      with check (true);
  end if;
end$$;

-- 5. Force PostgREST (the API layer Supabase exposes) to drop its schema
--    cache and re-introspect. Without this, even after we add the column,
--    REST requests can still return "Could not find the 'date' column".
notify pgrst, 'reload schema';
