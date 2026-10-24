begin;
-- Identity is checked by Postgres, never by editable user metadata.
create or replace function public.site_is_admin() returns boolean language sql stable
security invoker set search_path = '' as $$
 select coalesce(auth.uid() = 'fbd26b81-914b-4420-9a0d-f43c84c0abdf'::uuid, false);
$$;
revoke all on function public.site_is_admin() from public;
grant execute on function public.site_is_admin() to anon, authenticated;
create table if not exists public.site_anime (
 id text primary key check(id ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
 title text not null check(length(title) between 1 and 200),
 image text not null default '', category text not null default 'action',
 genres text[] not null default '{}', rating numeric(3,1) not null default 0 check(rating between 0 and 10),
 description text not null default '', episodes integer not null default 0 check(episodes between 0 and 2000),
 episode_links jsonb not null default '{}' check(jsonb_typeof(episode_links)='object'),
 created_at timestamptz not null default now()
);
alter table public.site_anime enable row level security;
grant select on public.site_anime to anon, authenticated;
grant insert, update, delete on public.site_anime to authenticated;
drop policy if exists site_anime_read on public.site_anime;
create policy site_anime_read on public.site_anime for select to anon, authenticated using (true);
drop policy if exists site_anime_admin on public.site_anime;
create policy site_anime_admin on public.site_anime for all to authenticated using ((select public.site_is_admin())) with check ((select public.site_is_admin()));
-- Restrictive write guards also prevent a permissive policy from granting edits.
drop policy if exists site_anime_insert_guard on public.site_anime;
create policy site_anime_insert_guard on public.site_anime as restrictive for insert to authenticated with check ((select public.site_is_admin()));
drop policy if exists site_anime_update_guard on public.site_anime;
create policy site_anime_update_guard on public.site_anime as restrictive for update to authenticated using ((select public.site_is_admin())) with check ((select public.site_is_admin()));
drop policy if exists site_anime_delete_guard on public.site_anime;
create policy site_anime_delete_guard on public.site_anime as restrictive for delete to authenticated using ((select public.site_is_admin()));

insert into public.site_anime(id,title,image,category,genres,rating,description,episodes,episode_links)
values ('attack-on-titan','Attack on Titan','image/anime/attack-on-titan.jpg','action',array['Action','Drama','Fantasy'],9.1,
'Humanity lives behind enormous walls while terrifying Titans threaten the world outside. Follow Eren and his companions as they fight to uncover the truth behind the Titans.',24,
'{"1":"https://player.mediadelivery.net/embed/765707/fb7c2fe9-a635-45fb-b81a-cbbf98958d4d?autoplay=true&loop=false&muted=true&preload=true&responsive=true"}') on conflict (id) do nothing;

alter table public.wallpapers enable row level security;
grant select, delete on public.wallpapers to authenticated;
drop policy if exists site_admin_wallpaper_read on public.wallpapers;
create policy site_admin_wallpaper_read on public.wallpapers for select to authenticated using ((select public.site_is_admin()));
drop policy if exists site_admin_wallpaper_delete on public.wallpapers;
create policy site_admin_wallpaper_delete on public.wallpapers for delete to authenticated using ((select public.site_is_admin()));
drop policy if exists site_admin_wallpaper_file_read on storage.objects;
create policy site_admin_wallpaper_file_read on storage.objects for select to authenticated using (bucket_id='wallpapers' and (select public.site_is_admin()));
drop policy if exists site_admin_wallpaper_file_delete on storage.objects;
create policy site_admin_wallpaper_file_delete on storage.objects for delete to authenticated using (bucket_id='wallpapers' and (select public.site_is_admin()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('anime-posters','anime-posters',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
drop policy if exists site_poster_read on storage.objects;
create policy site_poster_read on storage.objects for select to anon, authenticated using(bucket_id='anime-posters');
drop policy if exists site_poster_write on storage.objects;
create policy site_poster_write on storage.objects for insert to authenticated with check(bucket_id='anime-posters' and (select public.site_is_admin()));
drop policy if exists site_poster_delete on storage.objects;
create policy site_poster_delete on storage.objects for delete to authenticated using(bucket_id='anime-posters' and (select public.site_is_admin()));
commit;
