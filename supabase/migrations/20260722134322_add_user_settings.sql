-- Lets a user store their own Gemini API key (encrypted at the application layer before
-- it ever reaches this table) so they aren't limited by the shared server key's quota.

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  gemini_api_key text,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "user_settings_select_own"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "user_settings_insert_own"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "user_settings_update_own"
  on public.user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_settings_delete_own"
  on public.user_settings for delete
  using (auth.uid() = user_id);
