-- Tracks "grade my English translation" calls for rate limiting only (no sentence or
-- feedback content stored) — same shape and purpose as chat_logs/vocab_scans.

create table if not exists public.grammar_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists grammar_checks_user_id_created_at_idx
  on public.grammar_checks (user_id, created_at desc);

alter table public.grammar_checks enable row level security;

create policy "grammar_checks_select_own"
  on public.grammar_checks for select
  using (auth.uid() = user_id);

create policy "grammar_checks_insert_own"
  on public.grammar_checks for insert
  with check (auth.uid() = user_id);
