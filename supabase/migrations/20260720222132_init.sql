-- Voca English Memory: initial schema
-- Run this in the Supabase SQL editor, or via `supabase db push`.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- vocabulary_entries
-- ---------------------------------------------------------------------------
create table if not exists public.vocabulary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  word text not null,
  meaning text,
  created_at timestamptz not null default now()
);

create index if not exists vocabulary_entries_user_id_idx
  on public.vocabulary_entries (user_id, created_at desc);

alter table public.vocabulary_entries enable row level security;

create policy "vocabulary_entries_select_own"
  on public.vocabulary_entries for select
  using (auth.uid() = user_id);

create policy "vocabulary_entries_insert_own"
  on public.vocabulary_entries for insert
  with check (auth.uid() = user_id);

create policy "vocabulary_entries_delete_own"
  on public.vocabulary_entries for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- stories
-- ---------------------------------------------------------------------------
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  vocabulary_used jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Powers "sort by newest" on the history page and the daily rate-limit count.
create index if not exists stories_user_id_created_at_idx
  on public.stories (user_id, created_at desc);

alter table public.stories enable row level security;

create policy "stories_select_own"
  on public.stories for select
  using (auth.uid() = user_id);

create policy "stories_insert_own"
  on public.stories for insert
  with check (auth.uid() = user_id);
