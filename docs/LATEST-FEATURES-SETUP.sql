-- Run once in Supabase SQL Editor AFTER ADMIN-SETUP.sql and EPISODES-SETUP.sql.
-- Only site administrators can curate home-page sections.
begin;
create table if not exists public.site_featured (
  kind text not null check (kind in ('anime','episode')),
  anime_id text not null references public.site_anime(id) on delete cascade,
  season_number integer not null default 0 check (season_number between 0 and 100),
  episode_number integer not null default 0 check (episode_number between 0 and 2000),
  position integer not null default 1000,
  created_at timestamptz not null default now(),
  primary key (kind, anime_id, season_number, episode_number),
  check ((kind='anime' and season_number=0 and episode_number=0) or (kind='episode' and season_number>=1 and episode_number>=1))
);
create index if not exists site_featured_sort_idx on public.site_featured(kind,position,created_at desc);
alter table public.site_featured enable row level security;
grant select on public.site_featured to anon,authenticated;
grant insert,update,delete on public.site_featured to authenticated;
drop policy if exists site_featured_public_read on public.site_featured;
create policy site_featured_public_read on public.site_featured for select to anon,authenticated using (true);
drop policy if exists site_featured_admin_insert on public.site_featured;
create policy site_featured_admin_insert on public.site_featured for insert to authenticated with check ((select public.site_is_admin()));
drop policy if exists site_featured_admin_update on public.site_featured;
create policy site_featured_admin_update on public.site_featured for update to authenticated using ((select public.site_is_admin())) with check ((select public.site_is_admin()));
drop policy if exists site_featured_admin_delete on public.site_featured;
create policy site_featured_admin_delete on public.site_featured for delete to authenticated using ((select public.site_is_admin()));
commit;
