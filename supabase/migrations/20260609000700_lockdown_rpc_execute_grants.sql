-- LIVE-VERIFICATION FOLLOWUP (caught by an anon-key probe, not static review):
-- lock down EXECUTE on the service-role-only RPCs.
--
-- `revoke ... from public` does NOT remove the EXECUTE grant Supabase
-- auto-applies to the anon + authenticated roles on public-schema functions, so
-- these functions were all callable with the public anon key:
--   * credit_referral_bonus(<victim_uuid>, <attacker_code>) -> an anonymous
--     caller could credit an attacker's referrer off any not-yet-credited user
--     AND flip that victim's referral_credited flag so the victim can never claim
--     their own referral (referral fraud + denial). This is the DB-level teeth of
--     FIN-H1 that the HTTP-layer gate cannot close, because PostgREST reaches the
--     RPC directly with the anon key.
--   * chat_reserve(<real_user_uuid>, ...) -> an anonymous caller could insert
--     chat_usage rows for any real user and exhaust their daily chat quota (DoS).
--   * get_leaderboard() -> anon-reachable, leaking real user UUIDs to
--     unauthenticated callers (it is meant to be authenticated-only; the UUIDs
--     also seed referral codes, compounding the abuse above).
--
-- Fix: explicitly revoke EXECUTE from public AND anon AND authenticated on the
-- service-role-only functions (then re-grant to service_role), and restrict
-- get_leaderboard to authenticated only. increment_feature_vote intentionally
-- stays callable by anon/authenticated ("anyone can vote"). Revoking a privilege
-- a role does not hold is a harmless no-op, so this is idempotent.

-- ── Service-role-only (backend / SECURITY DEFINER) functions ──
revoke execute on function public.credit_referral_bonus(uuid, text) from public, anon, authenticated;
grant  execute on function public.credit_referral_bonus(uuid, text) to service_role;

revoke execute on function public.chat_reserve(uuid, int)  from public, anon, authenticated;
grant  execute on function public.chat_reserve(uuid, int)  to service_role;

revoke execute on function public.chat_unreserve(uuid)     from public, anon, authenticated;
grant  execute on function public.chat_unreserve(uuid)     to service_role;

revoke execute on function public.bump_anon_chat(text, date) from public, anon, authenticated;
grant  execute on function public.bump_anon_chat(text, date) to service_role;

-- ── Authenticated-only (was anon-reachable, leaking user UUIDs) ──
revoke execute on function public.get_leaderboard(int) from public, anon;
grant  execute on function public.get_leaderboard(int) to authenticated;

notify pgrst, 'reload schema';
