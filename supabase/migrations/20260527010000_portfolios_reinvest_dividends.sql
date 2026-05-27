-- 20260527010000_portfolios_reinvest_dividends.sql
--
-- Per-saved-portfolio "reinvest dividends" preference. Before this migration
-- the flag lived in a single localStorage key (corvo_reinvest_dividends)
-- shared across every saved portfolio - so a user with a dividend-focused
-- Brokerage account set to reinvest=true and a HSA set to reinvest=false
-- would see the same setting on both, and changes to one would silently
-- override the other.
--
-- After: each row in `portfolios` carries its own boolean. The frontend
-- loads it on portfolio click, persists changes back when the user
-- toggles while a saved portfolio is active, and falls back to the global
-- localStorage seed only for unsaved portfolios.
--
-- Default true matches the historical implicit default (the localStorage
-- seed initialized to true). Rows that pre-date this migration get the
-- default automatically via the column default, so no backfill is needed.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'portfolios'
      and column_name = 'reinvest_dividends'
  ) then
    alter table public.portfolios
      add column reinvest_dividends boolean not null default true;
  end if;
end$$;

notify pgrst, 'reload schema';
