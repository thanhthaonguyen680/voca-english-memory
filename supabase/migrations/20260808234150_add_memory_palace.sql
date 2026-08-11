-- Simple first version of an actual Memory Palace (Method of Loci) mechanic — previously the
-- homepage copy mentioned "Memory Palace" but the app only implemented Storytelling. Rooms
-- are a fixed, hardcoded list (see ROOMS in src/lib/palace-data.ts), not user-created, so no
-- separate rooms table is needed. A topic word's assigned room + AI-generated vivid mnemonic
-- image are stored directly on vocabulary_entries.

alter table public.vocabulary_entries
  add column if not exists palace_room text,
  add column if not exists palace_imagery text;

-- Tracks "generate palace imagery" calls for rate limiting only (no word/imagery content
-- stored here) — same shape and purpose as chat_logs/vocab_scans/grammar_checks.
create table if not exists public.palace_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists palace_generations_user_id_created_at_idx
  on public.palace_generations (user_id, created_at desc);

alter table public.palace_generations enable row level security;

create policy "palace_generations_select_own"
  on public.palace_generations for select
  using (auth.uid() = user_id);

create policy "palace_generations_insert_own"
  on public.palace_generations for insert
  with check (auth.uid() = user_id);
