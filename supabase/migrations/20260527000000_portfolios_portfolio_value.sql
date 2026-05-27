-- 20260527000000_portfolios_portfolio_value.sql
--
-- Per-saved-portfolio portfolio value. Before this migration the dashboard
-- kept ONE portfolio value in localStorage["corvo_portfolio_value"] shared
-- across every saved portfolio - so switching from a $5k Roth to a $200k
-- Brokerage showed the same dollar number on both. Users obviously expected
-- the dollar amount to follow the account they're viewing.
--
-- After: each row in `portfolios` carries its own portfolio_value. The
-- frontend writes it back whenever the user edits the value with a saved
-- portfolio active, and loads it back on the SavedPortfolios click handler.
-- Unsaved portfolios still use the localStorage seed.
--
-- Idempotent: add column if not exists. No backfill - existing rows stay
-- NULL and the frontend falls back to the localStorage seed for them, so the
-- migration is safe to run before the frontend deploy.
--
-- numeric (no fixed precision) because the seed is intentionally unbounded
-- on the high end (institutional users can park multi-million-dollar values
-- here) and arbitrary-precision avoids float drift on round-trip. The
-- frontend already rounds for display.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'portfolios'
      and column_name = 'portfolio_value'
  ) then
    alter table public.portfolios
      add column portfolio_value numeric;
  end if;
end$$;

-- Tell PostgREST to drop its column cache so the new field is queryable
-- immediately instead of waiting for the next periodic refresh.
notify pgrst, 'reload schema';
