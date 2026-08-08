-- Lets /history and /review filter/group stories by the topic they were generated from, so
-- finding a past story is easier once a user has several topics.
--
-- "on delete set null" (not cascade): deleting a topic must not delete the stories already
-- generated from it — a past story stays reviewable exactly as it was generated, same
-- principle as why /review reads each story's own frozen vocabulary_used snapshot instead of
-- the live topic word bank. It just becomes untagged (shows under "Khác") if its topic is
-- later deleted.

alter table public.stories
  add column if not exists topic_id uuid references public.vocabulary_topics (id) on delete set null;

create index if not exists stories_topic_id_idx
  on public.stories (topic_id);
