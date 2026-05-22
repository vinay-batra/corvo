-- Feedback table for the public FeedbackButton component.
-- Inserts come straight from the browser via the anon Supabase client, so the
-- RLS policies must explicitly allow anon + authenticated INSERTs. Without
-- the INSERT policy every submit fails with "new row violates row-level
-- security policy" and the UI showed the swallowed generic
-- "Could not submit. Please try again."

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  type text,
  message text not null,
  page text,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

-- Anyone (anon or logged-in) can submit feedback. The user_id column is
-- self-attested - the FeedbackButton sends user?.id or null - and is only
-- used for follow-up context, not for authorization, so we don't need to
-- gate inserts on auth.uid() = user_id.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'feedback' and policyname = 'Anyone can submit feedback'
  ) then
    create policy "Anyone can submit feedback"
      on public.feedback
      for insert
      to anon, authenticated
      with check (true);
  end if;
end $$;

-- Only the submitter can read their own rows back (and only when logged in).
-- Admin reads happen via the service role key which bypasses RLS.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'feedback' and policyname = 'Users read own feedback'
  ) then
    create policy "Users read own feedback"
      on public.feedback
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

-- Force PostgREST to drop its stale schema cache so the new table + policies
-- are visible on the very next request.
notify pgrst, 'reload schema';
