-- Customizable Memory Palace rooms — replaces the fixed 8-room list as the source rooms are
-- assigned from. Each user gets their own row set, lazily seeded (see ensureUserRooms in
-- src/lib/palace-data.ts) with the original default rooms the first time they're needed, using
-- the exact same ids the old hardcoded list used — so palace_room values already written on
-- vocabulary_entries keep resolving correctly once a user's rows exist.

create table if not exists public.palace_rooms (
  id text not null default gen_random_uuid()::text,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  icon text not null default '🏠',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists palace_rooms_user_id_sort_order_idx
  on public.palace_rooms (user_id, sort_order);

alter table public.palace_rooms enable row level security;

create policy "palace_rooms_select_own"
  on public.palace_rooms for select
  using (auth.uid() = user_id);

create policy "palace_rooms_insert_own"
  on public.palace_rooms for insert
  with check (auth.uid() = user_id);

create policy "palace_rooms_update_own"
  on public.palace_rooms for update
  using (auth.uid() = user_id);

create policy "palace_rooms_delete_own"
  on public.palace_rooms for delete
  using (auth.uid() = user_id);
