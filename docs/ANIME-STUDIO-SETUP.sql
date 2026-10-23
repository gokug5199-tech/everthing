begin;
alter table public.site_anime add column if not exists studio text not null default '';
commit;
