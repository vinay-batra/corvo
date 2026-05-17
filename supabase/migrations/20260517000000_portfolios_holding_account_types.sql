-- v0.41: per-holding account-type tagging.
-- Adds a `holding_account_types` text[] column on portfolios, parallel to
-- the existing `tickers` and `weights` arrays. Each element is one of the
-- 8 supported account-type ids (same set as portfolios.account_type), or
-- the empty string to mean "use the portfolio's account_type default".
-- A user can now save a single portfolio that mixes Taxable + Roth + 401k
-- holdings so Corvo's AI prompts can bucket tax advice per holding.

alter table portfolios
  add column if not exists holding_account_types text[] not null default '{}';

-- Drop PostgREST's stale column cache so the new column is visible immediately.
notify pgrst, 'reload schema';
