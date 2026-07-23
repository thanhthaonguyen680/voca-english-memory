-- Tracks AI conversation turns for rate limiting only (no message content stored — the
-- conversation itself lives client-side for the duration of a session, not persisted).

create table if not exists public.chat_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists chat_logs_user_id_created_at_idx
  on public.chat_logs (user_id, created_at desc);

alter table public.chat_logs enable row level security;

create policy "chat_logs_select_own"
  on public.chat_logs for select
  using (auth.uid() = user_id);

create policy "chat_logs_insert_own"
  on public.chat_logs for insert
  with check (auth.uid() = user_id);
