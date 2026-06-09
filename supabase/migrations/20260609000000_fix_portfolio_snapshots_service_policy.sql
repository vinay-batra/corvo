-- DATA-H1 + DATA-M6 fix: portfolio_snapshots policy hardening.
--
-- The "Service role full access" policy was created WITHOUT a `to service_role`
-- clause, so it applied to PUBLIC (anon + authenticated). Its `using(true)`
-- combined with the per-user policy by OR, exposing every user's snapshot
-- values to any anon-key holder, and `with check(true)` let any client forge
-- rows. The service role bypasses RLS anyway, so the policy is unnecessary.
--
-- We drop both that public policy and the old `for all` per-user policy, then
-- re-assert per-operation policies scoped to auth.uid() = user_id. The INSERT
-- policy additionally verifies the portfolio_id actually belongs to the caller
-- (closes DATA-M6: a client could otherwise forge snapshots for another user's
-- portfolio_id, polluting that portfolio's performance history).
--
-- Idempotent: every policy is dropped-if-exists then created, so it is safe to
-- re-run against populated prod.

drop policy if exists "Service role full access" on public.portfolio_snapshots;
drop policy if exists "Users can manage their own snapshots" on public.portfolio_snapshots;

drop policy if exists "snapshots_select_own" on public.portfolio_snapshots;
create policy "snapshots_select_own"
  on public.portfolio_snapshots for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "snapshots_insert_own" on public.portfolio_snapshots;
create policy "snapshots_insert_own"
  on public.portfolio_snapshots for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.portfolios p
      where p.id = portfolio_snapshots.portfolio_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "snapshots_update_own" on public.portfolio_snapshots;
create policy "snapshots_update_own"
  on public.portfolio_snapshots for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "snapshots_delete_own" on public.portfolio_snapshots;
create policy "snapshots_delete_own"
  on public.portfolio_snapshots for delete
  to authenticated
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';
