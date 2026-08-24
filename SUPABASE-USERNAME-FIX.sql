-- =========================================================
-- THE EVERYTHING - REQUIRED + UNIQUE USERNAME FIX
-- Run this ONCE in: Supabase Dashboard -> SQL Editor -> New query
--
-- What this does:
-- 1) Every new account MUST provide a valid username.
-- 2) Usernames are UNIQUE (case-insensitive): ham = HAM = Ham.
-- 3) Public profile usernames can no longer be email addresses.
-- 4) Existing broken/email usernames are repaired safely.
-- 5) Profile username changes are protected by the same rules.
-- 6) Adds an RPC used by the website to check availability.
-- =========================================================

begin;

-- ---------------------------------------------------------
-- CLEAN EXISTING USERNAMES FIRST
-- ---------------------------------------------------------
update public.profiles
set username = trim(username)
where username is not null
  and username <> trim(username);

-- Repair missing / invalid / email-looking usernames.
-- Prefer Auth metadata when it already contains a valid username.
do $$
declare
    r record;
    candidate text;
    base_candidate text;
    counter integer;
begin
    for r in
        select
            p.id,
            p.username,
            u.raw_user_meta_data
        from public.profiles as p
        left join auth.users as u
            on u.id = p.id
        where
            p.username is null
            or trim(p.username) = ''
            or p.username like '%@%'
            or trim(p.username) !~ '^[A-Za-z0-9._-]{3,30}$'
    loop
        candidate := nullif(
            trim(r.raw_user_meta_data ->> 'username'),
            ''
        );

        if candidate is null
           or candidate like '%@%'
           or candidate !~ '^[A-Za-z0-9._-]{3,30}$'
        then
            candidate :=
                'user_'
                || left(
                    replace(r.id::text, '-', ''),
                    12
                );
        end if;

        base_candidate := left(candidate, 24);
        counter := 0;

        while exists (
            select 1
            from public.profiles as other_profile
            where other_profile.id <> r.id
              and lower(other_profile.username) = lower(candidate)
        ) loop
            counter := counter + 1;
            candidate :=
                left(base_candidate, 24)
                || '_'
                || counter::text;
        end loop;

        update public.profiles
        set username = candidate
        where id = r.id;
    end loop;
end;
$$;

-- Repair duplicate usernames that already existed before this fix.
-- The first account keeps the original username; later duplicates get
-- a safe generated username and may choose a new one from Profile.
do $$
declare
    r record;
    candidate text;
    counter integer;
begin
    for r in
        with ranked as (
            select
                id,
                username,
                row_number() over (
                    partition by lower(username)
                    order by id
                ) as duplicate_rank
            from public.profiles
        )
        select id, username
        from ranked
        where duplicate_rank > 1
    loop
        candidate :=
            'user_'
            || left(
                replace(r.id::text, '-', ''),
                12
            );

        counter := 0;

        while exists (
            select 1
            from public.profiles as other_profile
            where other_profile.id <> r.id
              and lower(other_profile.username) = lower(candidate)
        ) loop
            counter := counter + 1;
            candidate :=
                'user_'
                || left(
                    replace(r.id::text, '-', ''),
                    12
                )
                || '_'
                || counter::text;
        end loop;

        update public.profiles
        set username = candidate
        where id = r.id;
    end loop;
end;
$$;


-- ---------------------------------------------------------
-- DATABASE RULES
-- ---------------------------------------------------------
alter table public.profiles
alter column username set not null;

alter table public.profiles
    drop constraint if exists profiles_username_format_check;

alter table public.profiles
    add constraint profiles_username_format_check
    check (
        username = trim(username)
        and username ~ '^[A-Za-z0-9._-]{3,30}$'
        and username not like '%@%'
    );

-- Case-insensitive uniqueness.
drop index if exists public.profiles_username_lower_unique;
create unique index profiles_username_lower_unique
on public.profiles ((lower(username)));


-- ---------------------------------------------------------
-- USERNAME AVAILABILITY FUNCTION FOR THE WEBSITE
-- ---------------------------------------------------------
create or replace function public.is_username_available(
    candidate_username text,
    exclude_user_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select
        candidate_username is not null
        and trim(candidate_username) ~ '^[A-Za-z0-9._-]{3,30}$'
        and trim(candidate_username) not like '%@%'
        and not exists (
            select 1
            from public.profiles as p
            where lower(p.username) = lower(trim(candidate_username))
              and (
                  exclude_user_id is null
                  or p.id <> exclude_user_id
              )
        );
$$;

revoke all on function public.is_username_available(text, uuid) from public;
grant execute on function public.is_username_available(text, uuid)
to anon, authenticated;


-- ---------------------------------------------------------
-- NEW ACCOUNT TRIGGER: USERNAME IS REQUIRED
-- ---------------------------------------------------------
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    desired_username text;
begin
    desired_username := nullif(
        trim(new.raw_user_meta_data ->> 'username'),
        ''
    );

    if desired_username is null then
        raise exception 'A username is required.';
    end if;

    if desired_username like '%@%'
       or desired_username !~ '^[A-Za-z0-9._-]{3,30}$'
    then
        raise exception 'Username must be 3-30 characters and may only contain letters, numbers, dot, underscore, or hyphen.';
    end if;

    if exists (
        select 1
        from public.profiles as p
        where lower(p.username) = lower(desired_username)
    ) then
        raise exception 'Username is already taken.';
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

-- Replace the previous profile trigger with the strict one.
drop trigger if exists zzzz_the_everything_profile_after_signup on auth.users;
create trigger zzzz_the_everything_profile_after_signup
after insert on auth.users
for each row
execute function public.handle_new_user_profile();

commit;
