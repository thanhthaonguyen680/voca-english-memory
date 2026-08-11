-- Mastery tracking for the Memory Palace: each self-reported "Nhớ rồi/Chưa nhớ" answer
-- nudges a per-word Leitner-style level (0-5) up or down. This lets the walkthrough always
-- surface the weakest words first (a lightweight spaced-repetition ordering) and lets the
-- palace page show an overall "% đã thuộc" instead of a plain pass-through card list.

alter table public.vocabulary_entries
  add column if not exists palace_mastery smallint not null default 0
    check (palace_mastery between 0 and 5);
