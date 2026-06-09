-- DATA-M2 fix: earnings_summaries had RLS never enabled.
--
-- A table with RLS disabled is fully readable/writable through PostgREST by any
-- role holding a grant. earnings_summaries is public reference data (AI-generated
-- earnings summaries served to all users), so we enable RLS, allow anon +
-- authenticated to SELECT, and revoke direct writes from those roles so only the
-- service role (which bypasses RLS) can populate the cache. This prevents
-- cache-poisoning of summaries that are then surfaced to users.
--
-- Idempotent: enable RLS is a no-op if already on; the read policy is
-- dropped-if-exists then created; the revoke is harmless if already revoked.

alter table public.earnings_summaries enable row level security;

drop policy if exists "earnings_summaries_read" on public.earnings_summaries;
create policy "earnings_summaries_read"
  on public.earnings_summaries for select
  to anon, authenticated
  using (true);

-- Defense in depth: the anon/authenticated roles must not write directly.
revoke insert, update, delete on public.earnings_summaries from anon, authenticated;

notify pgrst, 'reload schema';
