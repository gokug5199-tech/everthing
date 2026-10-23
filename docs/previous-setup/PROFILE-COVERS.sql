-- Run once in Supabase > SQL Editor. Only adds the profile-cover feature.
begin;
create table if not exists public.profile_covers (
    user_id uuid primary key references auth.users(id) on delete cascade,
    file_path text not null,
    constraint profile_covers_own_path check (split_part(file_path, '/', 1) = user_id::text)
);
alter table public.profile_covers enable row level security;
revoke all on public.profile_covers from anon;
grant select, insert, update, delete on public.profile_covers to authenticated;
drop policy if exists profile_covers_owner on public.profile_covers;
create policy profile_covers_owner on public.profile_covers for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-covers', 'profile-covers', false, 5242880, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg'];

drop policy if exists profile_cover_read on storage.objects;
create policy profile_cover_read on storage.objects for select to authenticated
using (bucket_id = 'profile-covers' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists profile_cover_insert on storage.objects;
create policy profile_cover_insert on storage.objects for insert to authenticated
with check (bucket_id = 'profile-covers' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists profile_cover_delete on storage.objects;
create policy profile_cover_delete on storage.objects for delete to authenticated
using (bucket_id = 'profile-covers' and (storage.foldername(name))[1] = (select auth.uid())::text);
commit;
