begin;
alter table public.site_anime
 add column if not exists age_rating text not null default 'Not rated',
 add column if not exists airing_status text not null default 'Unknown',
 add column if not exists source_type text not null default 'Unknown',
 add column if not exists series_key text not null default '',
 add column if not exists season_order integer not null default 1 check(season_order between 1 and 1000),
 add column if not exists season_label text not null default '',
 add column if not exists characters jsonb not null default '[]'::jsonb check(jsonb_typeof(characters)='array' and jsonb_array_length(characters)<=30);
create index if not exists site_anime_series_key_idx on public.site_anime(series_key,season_order);
create table if not exists public.user_anime_library (
 user_id uuid not null references auth.users(id) on delete cascade,
 anime_id text not null references public.site_anime(id) on delete cascade,
 watch_status text not null default 'none' check(watch_status in ('none','planned','watching','completed')),
 is_favorite boolean not null default false,
 updated_at timestamptz not null default now(),
 primary key(user_id,anime_id)
);
alter table public.user_anime_library enable row level security;
revoke all on public.user_anime_library from anon;
grant select,insert,update,delete on public.user_anime_library to authenticated;
drop policy if exists library_owner on public.user_anime_library;
create policy library_owner on public.user_anime_library for all to authenticated
 using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists library_owner_guard on public.user_anime_library;
create policy library_owner_guard on public.user_anime_library as restrictive for all to authenticated
 using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
-- Existing site_anime admin-only write policies also protect the new columns.
-- This migration does not touch authentication triggers or existing episodes.
commit;
