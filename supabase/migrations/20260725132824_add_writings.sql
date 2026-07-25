-- Structured writing practice: title/overview/body/conclusion + AI feedback, saved to a
-- per-user history (mirrors the `stories` table's shape/RLS pattern).

create table if not exists public.writings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  overview text,
  body text not null,
  conclusion text,
  feedback text,
  created_at timestamptz not null default now()
);

create index if not exists writings_user_id_created_at_idx
  on public.writings (user_id, created_at desc);

alter table public.writings enable row level security;

create policy "writings_select_own"
  on public.writings for select
  using (auth.uid() = user_id);

create policy "writings_insert_own"
  on public.writings for insert
  with check (auth.uid() = user_id);

create policy "writings_delete_own"
  on public.writings for delete
  using (auth.uid() = user_id);
