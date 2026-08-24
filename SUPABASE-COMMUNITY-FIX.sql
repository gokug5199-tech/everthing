-- =========================================================
-- THE EVERYTHING - COMMUNITY PROFILE / WALLPAPER FIX
-- Run this ONCE in: Supabase Dashboard -> SQL Editor -> New query
--
-- What this fixes:
-- 1) Everybody can READ public profile name + avatar.
-- 2) Users can only INSERT/UPDATE their own profile.
-- 3) Everybody can READ community wallpaper rows.
-- 4) Users can only create/update/delete their own wallpaper rows.
-- 5) Avatar and wallpaper Storage buckets are public for viewing.
-- 6) Missing profile rows are created for old Auth users.
-- 7) New Auth users automatically get a profile row.
-- =========================================================

begin;

-- ---------------------------------------------------------
-- PROFILES RLS
-- ---------------------------------------------------------
alter table public.profiles enable row level security;

-- Public information only. The website expects profiles to contain
-- public fields such as id, username and avatar_url.
drop policy if exists "community_profiles_public_read" on public.profiles;
create policy "community_profiles_public_read"
on public.profiles
for select
to anon, authenticated
using (true);

-- A signed-in user may create only their own profile.
drop policy if exists "community_profiles_own_insert" on public.profiles;
create policy "community_profiles_own_insert"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

-- A signed-in user may update only their own profile.
drop policy if exists "community_profiles_own_update" on public.profiles;
create policy "community_profiles_own_update"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Optional: allow the owner to delete only their own profile row.
drop policy if exists "community_profiles_own_delete" on public.profiles;
create policy "community_profiles_own_delete"
on public.profiles
for delete
to authenticated
using ((select auth.uid()) = id);


-- ---------------------------------------------------------
-- WALLPAPERS RLS
-- ---------------------------------------------------------
alter table public.wallpapers enable row level security;

drop policy if exists "community_wallpapers_public_read" on public.wallpapers;
create policy "community_wallpapers_public_read"
on public.wallpapers
for select
to anon, authenticated
using (true);

drop policy if exists "community_wallpapers_own_insert" on public.wallpapers;
create policy "community_wallpapers_own_insert"
on public.wallpapers
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "community_wallpapers_own_update" on public.wallpapers;
create policy "community_wallpapers_own_update"
on public.wallpapers
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "community_wallpapers_own_delete" on public.wallpapers;
create policy "community_wallpapers_own_delete"
on public.wallpapers
for delete
to authenticated
using ((select auth.uid()) = user_id);


-- ---------------------------------------------------------
-- CREATE / REPAIR PROFILE ROWS
-- ---------------------------------------------------------
-- This creates a missing profile for old Auth users (including users
-- who registered while email confirmation was enabled).
with missing_profiles as (
    select
        u.id,
        coalesce(
            nullif(trim(u.raw_user_meta_data ->> 'username'), ''),
            nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
            'User'
        ) as base_username
    from auth.users as u
    where not exists (
        select 1
        from public.profiles as p
        where p.id = u.id
    )
),
ranked_profiles as (
    select
        m.*,
        row_number() over (
            partition by lower(m.base_username)
            order by m.id
        ) as same_name_rank,
        exists (
            select 1
            from public.profiles as p
            where lower(p.username) = lower(m.base_username)
        ) as username_already_taken
    from missing_profiles as m
)
insert into public.profiles (
    id,
    username,
    avatar_url
)
select
    r.id,
    case
        when r.username_already_taken or r.same_name_rank > 1
        then r.base_username || '_' || left(replace(r.id::text, '-', ''), 6)
        else r.base_username
    end as username,
    null as avatar_url
from ranked_profiles as r
on conflict (id) do nothing;


-- Automatically create a profile for every new Auth user.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    desired_username text;
begin
    desired_username := coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'User'
    );

    if exists (
        select 1
        from public.profiles as p
        where lower(p.username) = lower(desired_username)
    ) then
        desired_username :=
            desired_username
            || '_'
            || left(replace(new.id::text, '-', ''), 6);
    end if;

    insert into public.profiles (
        id,
        username,
        avatar_url
    )
    values (
        new.id,
        desired_username,
        null
    )
    on conflict (id) do nothing;

    return new;
end;
$$;

drop trigger if exists zzzz_the_everything_profile_after_signup on auth.users;
create trigger zzzz_the_everything_profile_after_signup
after insert on auth.users
for each row
execute function public.handle_new_user_profile();


-- ---------------------------------------------------------
-- STORAGE BUCKETS
-- ---------------------------------------------------------
-- The frontend uses getPublicUrl(), so these buckets must be public.
update storage.buckets
set public = true
where id in ('avatars', 'wallpapers');

-- Public read of avatar files.
drop policy if exists "community_avatars_public_read" on storage.objects;
create policy "community_avatars_public_read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'avatars');

-- Users may upload avatar files only inside their own first-level folder.
drop policy if exists "community_avatars_own_insert" on storage.objects;
create policy "community_avatars_own_insert"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- Users may update only avatar files in their own folder.
drop policy if exists "community_avatars_own_update" on storage.objects;
create policy "community_avatars_own_update"
on storage.objects
for update
to authenticated
using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- Users may delete only avatar files in their own folder.
drop policy if exists "community_avatars_own_delete" on storage.objects;
create policy "community_avatars_own_delete"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- Public read of wallpaper files.
drop policy if exists "community_wallpapers_storage_public_read" on storage.objects;
create policy "community_wallpapers_storage_public_read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'wallpapers');

-- Users may upload wallpaper files only inside their own folder.
drop policy if exists "community_wallpapers_storage_own_insert" on storage.objects;
create policy "community_wallpapers_storage_own_insert"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'wallpapers'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- Users may update only wallpaper files in their own folder.
drop policy if exists "community_wallpapers_storage_own_update" on storage.objects;
create policy "community_wallpapers_storage_own_update"
on storage.objects
for update
to authenticated
using (
    bucket_id = 'wallpapers'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
    bucket_id = 'wallpapers'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- Users may delete only wallpaper files in their own folder.
drop policy if exists "community_wallpapers_storage_own_delete" on storage.objects;
create policy "community_wallpapers_storage_own_delete"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'wallpapers'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);

commit;
