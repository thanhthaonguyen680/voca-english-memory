-- Tracks "auto-generate meaning + word type for a word with no meaning" calls for rate
-- limiting only (no word/meaning content stored here) — same shape and purpose as
-- chat_logs/vocab_scans/grammar_checks.
create table if not exists public.meaning_fills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists meaning_fills_user_id_created_at_idx
  on public.meaning_fills (user_id, created_at desc);

alter table public.meaning_fills enable row level security;

create policy "meaning_fills_select_own"
  on public.meaning_fills for select
  using (auth.uid() = user_id);

create policy "meaning_fills_insert_own"
  on public.meaning_fills for insert
  with check (auth.uid() = user_id);
