-- Referrals table
-- referrer_id: the existing user who shared the link
-- referred_email: email of the person who signed up via the link
-- completed: true once the referred user has signed up and verified

create table if not exists referrals (
  id            uuid default gen_random_uuid() primary key,
  referrer_id   uuid references auth.users not null,
  referred_email text not null,
  completed     boolean default false,
  created_at    timestamp with time zone default now()
);

alter table referrals enable row level security;

-- Users can only read their own referral rows
create policy "Users can view own referrals"
  on referrals for select
  using (auth.uid() = referrer_id);
