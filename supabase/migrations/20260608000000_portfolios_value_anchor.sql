-- Per-account value anchor for accurate day-over-day tracking.
-- portfolio_value (existing) = the dollar value the user anchored.
-- portfolio_value_date       = ET date the value was set (for "as of" display).
-- value_anchor_prices        = per-ticker prices captured at the moment the
--   value was set, so the live value can be computed as
--   anchorValue * weighted(livePrice / anchorPrice) -- weighted buy-and-hold
--   growth from the anchor, which tracks the market day-over-day.
alter table public.portfolios
  add column if not exists portfolio_value_date date,
  add column if not exists value_anchor_prices jsonb;

notify pgrst, 'reload schema';
