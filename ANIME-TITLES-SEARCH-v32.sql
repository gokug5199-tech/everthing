-- The Everything v32: multilingual title search, additive migration.
-- Run once in Supabase > SQL Editor BEFORE deploying v32.
-- Does not delete or replace anime, characters, episodes, servers or user data.
BEGIN;
ALTER TABLE public.site_anime
  ADD COLUMN IF NOT EXISTS title_aliases TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS search_titles TEXT NOT NULL DEFAULT '';

-- Keep the indexed search text in sync with display title, romanized title,
-- and all alternative English/Japanese/transliterated titles on new imports.
CREATE OR REPLACE FUNCTION public.te_anime_search_titles_v32()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 NEW.search_titles := concat_ws(' ', NEW.title, NEW.season_label,
   array_to_string(COALESCE(NEW.title_aliases,'{}'::text[]), ' '));
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS te_anime_search_titles_v32_trg ON public.site_anime;
CREATE TRIGGER te_anime_search_titles_v32_trg
 BEFORE INSERT OR UPDATE OF title,season_label,title_aliases
 ON public.site_anime FOR EACH ROW
 EXECUTE FUNCTION public.te_anime_search_titles_v32();

-- Immediate improvement for existing imports: title and season_label are
-- already stored; most Tenrai imports use English title + romanized season_label.
UPDATE public.site_anime
 SET search_titles=concat_ws(' ', title, season_label,
   array_to_string(COALESCE(title_aliases,'{}'::text[]),' '))
 WHERE search_titles IS NULL OR search_titles='';

-- Efficient substring searches even as the library grows.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
DO $$
DECLARE ops_schema TEXT;
BEGIN
 SELECT ns.nspname INTO ops_schema
 FROM pg_opclass opc JOIN pg_namespace ns ON ns.oid=opc.opcnamespace
 WHERE opc.opcname='gin_trgm_ops' LIMIT 1;
 IF ops_schema IS NOT NULL THEN
  EXECUTE format('CREATE INDEX IF NOT EXISTS te_anime_search_titles_trgm_v32 ON public.site_anime USING gin (search_titles %I.gin_trgm_ops)', ops_schema);
 END IF;
END $$;
COMMIT;
-- No RLS policies or existing privileges are modified.
-- Original Japanese writing and other synonyms for old rows not present in
-- existing fields can still be found by v32's on-demand Tenrai/MAL-ID lookup;
-- to persist all aliases, edit an anime and save its alternative names.
