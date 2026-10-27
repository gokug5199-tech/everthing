-- The Everything / Bulk Anime Import v16
-- Run ONCE in Supabase Dashboard -> SQL Editor, with an administrator project role.
-- The migration adds metadata only. Existing anime, episodes, and posters remain untouched.

BEGIN;

ALTER TABLE public.site_anime
  ADD COLUMN IF NOT EXISTS mal_id BIGINT,
  ADD COLUMN IF NOT EXISTS anime_type TEXT,
  ADD COLUMN IF NOT EXISTS mal_relations JSONB NOT NULL DEFAULT '[]'::jsonb;

-- A normal UNIQUE index permits many NULLs (your existing manual anime)
-- while refusing duplicate non-null MAL IDs, even if two imports race.
CREATE UNIQUE INDEX IF NOT EXISTS site_anime_unique_mal_id_v16
  ON public.site_anime (mal_id);

-- Only admins can change the ordering of imported records.
-- SECURITY INVOKER deliberately preserves your existing row-level policies.
CREATE OR REPLACE FUNCTION public.site_bulk_set_series_v16(p_rows JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  changed_count INTEGER := 0;
BEGIN
  IF NOT public.site_is_admin() THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;
  IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_rows) > 100 THEN
    RAISE EXCEPTION 'Expected an array of up to 100 anime';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(p_rows)
      AS items(id TEXT, series_key TEXT, season_order INTEGER)
    WHERE items.series_key IS NULL
      OR items.series_key !~ '^[a-z0-9][a-z0-9-]{0,99}$'
      OR items.season_order NOT BETWEEN 1 AND 1000
  ) THEN
    RAISE EXCEPTION 'Invalid series key or season order';
  END IF;

  UPDATE public.site_anime AS anime
  SET series_key = items.series_key,
      season_order = items.season_order
  FROM jsonb_to_recordset(p_rows)
       AS items(id TEXT, series_key TEXT, season_order INTEGER)
  WHERE anime.id = items.id AND anime.mal_id IS NOT NULL;

  GET DIAGNOSTICS changed_count = ROW_COUNT;
  RETURN changed_count;
END;
$$;

REVOKE ALL ON FUNCTION public.site_bulk_set_series_v16(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.site_bulk_set_series_v16(JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.site_bulk_set_series_v16(JSONB) TO authenticated;

COMMIT;
