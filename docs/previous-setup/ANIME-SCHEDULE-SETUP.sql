begin;
alter table public.site_anime
 add column if not exists release_season text not null default 'Not announced'
   check (release_season in ('Not announced','Winter','Spring','Summer','Fall')),
 add column if not exists release_year integer check (release_year between 1900 and 9999),
 add column if not exists start_date date,
 add column if not exists end_date date,
 add column if not exists broadcast_day text not null default 'Not announced'
   check (broadcast_day in ('Not announced','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'));
do $$ begin
 if not exists (select 1 from pg_constraint where conrelid='public.site_anime'::regclass and conname='site_anime_schedule_dates_check') then
  alter table public.site_anime add constraint site_anime_schedule_dates_check
    check (end_date is null or start_date is null or end_date >= start_date);
 end if;
end $$;
-- Existing admin-only write policies protect these columns too.
commit;
