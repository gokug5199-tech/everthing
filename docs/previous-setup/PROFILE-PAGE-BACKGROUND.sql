-- Run once in Supabase > SQL Editor. Only adds the page-background feature.
begin;
create table if not exists public.profile_page_backgrounds (
    user_id uuid primary key references auth.users(id) on delete cascade,
    file_path text not null,
    constraint profile_page_backgrounds_own_path check (split_part(file_path, '/', 1) = user_id::text)
);
alter table public.profile_page_backgrounds enable row level security;
revoke all on public.profile_page_backgrounds from anon;
grant select, insert, update, delete on public.profile_page_backgrounds to authenticated;
drop policy if exists profile_page_backgrounds_owner on public.profile_page_backgrounds;
create policy profile_page_backgrounds_owner on public.profile_page_backgrounds for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-page-backgrounds', 'profile-page-backgrounds', false, 5242880, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg'];

drop policy if exists profile_page_background_read on storage.objects;
create policy profile_page_background_read on storage.objects for select to authenticated
using (bucket_id = 'profile-page-backgrounds' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists profile_page_background_insert on storage.objects;
create policy profile_page_background_insert on storage.objects for insert to authenticated
with check (bucket_id = 'profile-page-backgrounds' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists profile_page_background_delete on storage.objects;
create policy profile_page_background_delete on storage.objects for delete to authenticated
using (bucket_id = 'profile-page-backgrounds' and (storage.foldername(name))[1] = (select auth.uid())::text);
commit;
