-- 7am / The Everything: extra episode records and multiple watch sources.
-- Run AFTER ADMIN-SETUP.sql in your existing Supabase SQL Editor.
-- Does not delete or change old site_anime.episode_links entries.
begin;
create table if not exists public.site_episodes (
  anime_id text not null references public.site_anime(id) on delete cascade,
  season_number integer not null default 1 check (season_number between 1 and 100),
  episode_number integer not null check (episode_number between 1 and 2000),
  title text not null default '' check (char_length(title) <= 200),
  sources jsonb not null default '[]'::jsonb
    check (jsonb_typeof(sources) = 'array' and jsonb_array_length(sources) <= 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (anime_id, season_number, episode_number)
);
create index if not exists site_episodes_anime_idx on public.site_episodes(anime_id, season_number, episode_number);
alter table public.site_episodes enable row level security;
grant select on public.site_episodes to anon, authenticated;
grant insert, update, delete on public.site_episodes to authenticated;

drop policy if exists site_episodes_public_read on public.site_episodes;
create policy site_episodes_public_read on public.site_episodes
  for select to anon, authenticated using (true);
drop policy if exists site_episodes_admin_write on public.site_episodes;
create policy site_episodes_admin_write on public.site_episodes
  for all to authenticated
  using ((select public.site_is_admin()))
  with check ((select public.site_is_admin()));
-- Restrictive guards remain effective even if a permissive policy is added later.
drop policy if exists site_episodes_insert_guard on public.site_episodes;
create policy site_episodes_insert_guard on public.site_episodes as restrictive
  for insert to authenticated with check ((select public.site_is_admin()));
drop policy if exists site_episodes_update_guard on public.site_episodes;
create policy site_episodes_update_guard on public.site_episodes as restrictive
  for update to authenticated using ((select public.site_is_admin()))
  with check ((select public.site_is_admin()));
drop policy if exists site_episodes_delete_guard on public.site_episodes;
create policy site_episodes_delete_guard on public.site_episodes as restrictive
  for delete to authenticated using ((select public.site_is_admin()));
commit;
