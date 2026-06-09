-- business-financial M3 + M5: atomic chat-quota RPCs referenced by the backend
-- and the public /api/ai-chat route fixes.
--
--   bump_anon_chat(p_ip, p_day)  - atomic per-(ip, ET-day) increment for the
--                                  anonymous public-chat cap, returning the
--                                  post-increment count (M3: the in-memory
--                                  per-instance counter is not a real cap).
--   chat_reserve(p_user, p_limit)- inserts one chat_usage row for the user and
--                                  returns today's post-insert count, so the
--                                  count+insert is a single atomic step under
--                                  one lock (M5: closes the count->insert TOCTOU
--                                  that let concurrent sends exceed the cap).
--   chat_unreserve(p_user)       - deletes the most recent of today's chat_usage
--                                  rows for the user, used to refund a
--                                  reservation when the caller is over the cap.
--
-- All three are SECURITY DEFINER with search_path pinned to `public, pg_temp`.
-- They are invoked by the backend/route with the service-role key, so EXECUTE is
-- granted only to service_role (revoked from public). chat_usage RLS does not
-- apply inside a SECURITY DEFINER function owned by a privileged role.
--
-- Idempotent: the supporting table is `create table if not exists`; functions use
-- create or replace; grants/revokes are safe to re-run.

-- Supporting table for the anonymous-chat per-(ip, day) counter (M3).
create table if not exists public.anon_chat_usage (
  ip text not null,
  et_day date not null,
  count int not null default 0,
  primary key (ip, et_day)
);

alter table public.anon_chat_usage enable row level security;
-- No policies: only the service role (which bypasses RLS) and the SECURITY
-- DEFINER RPC below touch this table. No anon/authenticated access.
revoke insert, update, delete, select on public.anon_chat_usage from anon, authenticated;

create or replace function public.bump_anon_chat(p_ip text, p_day date)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v int;
begin
  insert into public.anon_chat_usage (ip, et_day, count)
  values (p_ip, p_day, 1)
  on conflict (ip, et_day)
    do update set count = public.anon_chat_usage.count + 1
  returning count into v;
  return v;
end;
$$;

create or replace function public.chat_reserve(p_user uuid, p_limit int)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v int;
begin
  insert into public.chat_usage (user_id) values (p_user);
  select count(*) into v
    from public.chat_usage
   where user_id = p_user
     and created_at >= date_trunc('day', now() at time zone 'utc');
  return v;
end;
$$;

create or replace function public.chat_unreserve(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Refund the reservation: remove the most recent of today's rows for the user.
  delete from public.chat_usage
   where id = (
     select id from public.chat_usage
      where user_id = p_user
        and created_at >= date_trunc('day', now() at time zone 'utc')
      order by created_at desc
      limit 1
   );
end;
$$;

revoke all on function public.bump_anon_chat(text, date) from public;
revoke all on function public.chat_reserve(uuid, int) from public;
revoke all on function public.chat_unreserve(uuid) from public;
grant execute on function public.bump_anon_chat(text, date) to service_role;
grant execute on function public.chat_reserve(uuid, int) to service_role;
grant execute on function public.chat_unreserve(uuid) to service_role;

notify pgrst, 'reload schema';
