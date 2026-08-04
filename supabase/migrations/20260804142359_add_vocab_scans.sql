-- Tracks "scan vocabulary from a photo" calls for rate limiting only (no image or extracted
-- word content stored) — same shape and purpose as chat_logs.

create table if not exists public.vocab_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists vocab_scans_user_id_created_at_idx
  on public.vocab_scans (user_id, created_at desc);

alter table public.vocab_scans enable row level security;

create policy "vocab_scans_select_own"
  on public.vocab_scans for select
  using (auth.uid() = user_id);

create policy "vocab_scans_insert_own"
  on public.vocab_scans for insert
  with check (auth.uid() = user_id);
