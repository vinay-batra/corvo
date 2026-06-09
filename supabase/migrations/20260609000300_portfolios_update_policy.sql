-- DATA-M4 fix: portfolios had SELECT/INSERT/DELETE policies but NO UPDATE policy.
--
-- With RLS enabled and no permissive UPDATE policy, the authenticated browser
-- client cannot UPDATE portfolios at all - every portfolio_value / account_type /
-- reinvest_dividends / value_anchor_prices write went through the service role,
-- which bypasses RLS, making all update authorization app-logic-only with no DB
-- backstop. We add an owner-scoped UPDATE policy so the DB enforces ownership
-- even for direct client writes (defense in depth).
--
-- Idempotent: dropped-if-exists then created.

drop policy if exists "Users can update own portfolios" on public.portfolios;
create policy "Users can update own portfolios"
  on public.portfolios for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
