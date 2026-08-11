-- Enrich Memory Palace word cards (pronunciation, usage note, example sentence) and add a
-- per-topic-per-room connecting story that ties together a room's words into one short
-- narrative — requested 2026-08-09, scoped down to: keep the existing card-based review UI
-- (no separate chat mode), keep the existing 0-5 mastery counter (no calendar-based spaced-
-- repetition schedule), keep the existing binary Nhớ rồi/Chưa nhớ self-report (no multi-type
-- quiz engine).

alter table public.vocabulary_entries
  add column if not exists ipa text,
  add column if not exists usage_note text,
  add column if not exists example_sentence text;

-- One connecting story per (topic, room) — not per room alone, because a physical room
-- (palace_rooms) is shared across a user's topics, but each topic's palace page only shows
-- that topic's own words in a room; a single global per-room story would reference words from
-- an unrelated topic when viewed from a different topic's page. Regenerated (overwritten)
-- every time new words land in that room for that topic via a later generate call, so it
-- always reflects the room's current roster.
create table if not exists public.palace_room_stories (
  topic_id uuid not null references public.vocabulary_topics (id) on delete cascade,
  room_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  story text not null,
  updated_at timestamptz not null default now(),
  primary key (topic_id, room_id)
);

alter table public.palace_room_stories enable row level security;

create policy "palace_room_stories_select_own"
  on public.palace_room_stories for select
  using (auth.uid() = user_id);

create policy "palace_room_stories_insert_own"
  on public.palace_room_stories for insert
  with check (auth.uid() = user_id);

create policy "palace_room_stories_update_own"
  on public.palace_room_stories for update
  using (auth.uid() = user_id);

create policy "palace_room_stories_delete_own"
  on public.palace_room_stories for delete
  using (auth.uid() = user_id);
