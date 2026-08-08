-- Lets a topic carry a picked emoji icon (shown on its card instead of a hardcoded one),
-- matching the "Tạo chủ đề mới" icon-picker UI.

alter table public.vocabulary_topics
  add column if not exists icon text not null default '📚';
