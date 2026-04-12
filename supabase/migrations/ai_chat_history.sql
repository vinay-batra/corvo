-- AI Chat History table
-- Run this in your Supabase SQL editor

create table if not exists ai_chat_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null default 'Untitled Chat',
  messages jsonb not null default '[]',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table ai_chat_history enable row level security;

-- Users can only see their own chats
create policy "Users can view own chat history"
  on ai_chat_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own chat history"
  on ai_chat_history for insert
  with check (auth.uid() = user_id);

create policy "Users can update own chat history"
  on ai_chat_history for update
  using (auth.uid() = user_id);

create policy "Users can delete own chat history"
  on ai_chat_history for delete
  using (auth.uid() = user_id);

-- Index for fast lookups
create index if not exists ai_chat_history_user_id_updated_at
  on ai_chat_history (user_id, updated_at desc);
