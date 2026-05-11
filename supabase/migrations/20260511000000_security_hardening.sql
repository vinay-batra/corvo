-- Security hardening for v0.28 (May 11, 2026)
-- 1) health_score_cache: RLS was enabled with zero policies, locking the table
--    to service_role only. Add an explicit user-scoped SELECT policy so the
--    intent is documented and frontend clients can read their own row if ever
--    needed. Backend continues to use service_role for upserts.
-- 2) profiles_leaderboard: prior policy exposed every column of every row to
--    any authenticated user. Replace with a column-restricted view so only the
--    display_name, xp, and id columns are reachable from anon/auth clients.

-- 1. health_score_cache: per-user read access
do $$
begin
  if not exists (
    select 1
      from pg_policies
     where schemaname = 'public'
       and tablename  = 'health_score_cache'
       and policyname = 'Users read own health scores'
  ) then
    create policy "Users read own health scores"
      on health_score_cache
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end$$;

-- 2. Replace the wide-open leaderboard policy with a safe view + tightened policy
--    that exposes only the columns the leaderboard ever needs.
drop policy if exists "Authenticated users can read all profiles" on profiles;

-- Per-row select restricted to the authenticated user's own row (the default).
do $$
begin
  if not exists (
    select 1
      from pg_policies
     where schemaname = 'public'
       and tablename  = 'profiles'
       and policyname = 'Users read own profile'
  ) then
    create policy "Users read own profile"
      on profiles
      for select
      to authenticated
      using (auth.uid() = id);
  end if;
end$$;

-- A security_invoker view that exposes only the columns the leaderboard needs.
-- Drop and re-create so column changes propagate cleanly.
drop view if exists public.profile_leaderboard;
create view public.profile_leaderboard
  with (security_invoker = true) as
  select id, display_name, xp
    from public.profiles;

-- Grant select on the view to authenticated; underlying RLS still applies, so
-- we add a separate policy that allows authenticated users to read every row
-- THROUGH the view by short-circuiting on column allow-list. Postgres does not
-- support column-grained policies, so we use a SECURITY DEFINER function for
-- the leaderboard read path instead.
grant select on public.profile_leaderboard to authenticated;

-- Function: returns leaderboard rows with only the safe columns. Marked
-- SECURITY DEFINER so it can read every profile, but the function only ever
-- returns id/display_name/xp.
create or replace function public.get_leaderboard(p_limit int default 100)
returns table (id uuid, display_name text, xp int)
language sql
security definer
set search_path = public
as $$
  select id, display_name, xp
    from profiles
   where xp is not null
   order by xp desc nulls last
   limit greatest(1, least(p_limit, 500));
$$;

revoke all on function public.get_leaderboard(int) from public;
grant execute on function public.get_leaderboard(int) to authenticated;
