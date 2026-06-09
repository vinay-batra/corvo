-- DATA-M5 fix: health_score_cache had a SELECT-only policy (auth.uid() = user_id)
-- but NO INSERT/UPDATE policy, so the cache (AI-generated health scores,
-- headlines, and actions surfaced to the user) was writable only via the service
-- role, making write integrity app-logic-only with no DB backstop.
--
-- We add owner-scoped INSERT and UPDATE policies so the authenticated client can
-- write its own cache rows safely and the DB enforces ownership even if a write
-- path ever moves client-side (defense in depth).
--
-- Idempotent: each policy is dropped-if-exists then created.

drop policy if exists "hsc_insert_own" on public.health_score_cache;
create policy "hsc_insert_own"
  on public.health_score_cache for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "hsc_update_own" on public.health_score_cache;
create policy "hsc_update_own"
  on public.health_score_cache for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
