-- A server-managed pool of Gemini API keys the app rotates through, to expand effective
-- free-tier capacity beyond a single key. NOT per-user data — replaces the earlier
-- "user brings their own key" feature (user_settings.gemini_api_key is now dormant/unused).
--
-- Rotation is "sticky": the lowest sort_order row with is_valid = true is used for every
-- request until it starts failing on quota, then it's marked invalid and the next one takes
-- over. A key gets a chance to retry ~20h after being invalidated, since Gemini's free-tier
-- daily quota resets once every 24h.

create table if not exists public.gemini_api_key_pool (
  id uuid primary key default gen_random_uuid(),
  label text,
  api_key text not null,
  sort_order integer not null default 0,
  is_valid boolean not null default true,
  last_error text,
  last_used_at timestamptz,
  invalidated_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists gemini_api_key_pool_sort_order_idx
  on public.gemini_api_key_pool (sort_order);

alter table public.gemini_api_key_pool enable row level security;

-- Intentionally no policies. This table holds shared server infrastructure, not per-user
-- data, so there's no auth.uid() to scope a policy to — only the service-role key (which
-- bypasses RLS entirely) should ever read or write it. Do not add anon/authenticated
-- policies here.
