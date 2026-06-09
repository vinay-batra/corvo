-- DATA-M3 fix: increment_feature_vote was SECURITY DEFINER with no search_path.
--
-- A SECURITY DEFINER function with a mutable search_path can be hijacked: a
-- caller who can create objects earlier on the resolved path (or influence the
-- session search_path) can shadow feature_votes / the `=` operator and have the
-- definer execute attacker-controlled SQL with elevated rights. We recreate it
-- with `set search_path = public, pg_temp` pinned, matching the other hardened
-- definer functions (credit_referral_bonus), and scope EXECUTE explicitly:
-- revoke from public, grant to anon + authenticated (the "anyone can vote" path).
--
-- Idempotent: create or replace + revoke/grant are all safe to re-run.

create or replace function public.increment_feature_vote(p_feature_name text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.feature_votes
     set vote_count = vote_count + 1
   where feature_name = p_feature_name;
end;
$$;

revoke all on function public.increment_feature_vote(text) from public;
grant execute on function public.increment_feature_vote(text) to anon, authenticated;

notify pgrst, 'reload schema';
