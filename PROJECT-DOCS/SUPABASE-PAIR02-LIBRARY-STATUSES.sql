-- The Everything — PWA PAIR02, 2026-11-14
-- REQUIRED before using the Paused and Dropped watch statuses.
-- Execute ONCE in Supabase SQL Editor after the existing ANIME-LIBRARY-SETUP.sql.
-- Preserves existing rows, favorites, ownership policies, foreign keys and all other tables.
-- Safe to rerun. This changes ONLY the allowed values in one CHECK constraint.
BEGIN;
ALTER TABLE public.user_anime_library
  DROP CONSTRAINT IF EXISTS user_anime_library_watch_status_check;
ALTER TABLE public.user_anime_library
  ADD CONSTRAINT user_anime_library_watch_status_check
  CHECK (watch_status IN ('none','planned','watching','completed','paused','dropped')) NOT VALID;
ALTER TABLE public.user_anime_library
  VALIDATE CONSTRAINT user_anime_library_watch_status_check;
COMMIT;
