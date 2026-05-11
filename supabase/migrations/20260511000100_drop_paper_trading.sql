-- Drop Paper Trading entirely (removed from product in v0.24, code purged in v0.28)
-- Tables, policies, and indices all go.

drop table if exists public.paper_trades cascade;
drop table if exists public.paper_portfolio cascade;
