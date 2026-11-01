-- The Everything v33 — accurate MyAnimeList popularity ordering.
-- Run in Supabase SQL Editor once, before deploying v33.
-- Additive only: no anime, account, character, episode or video record is removed.
BEGIN;

ALTER TABLE public.site_anime
  ADD COLUMN IF NOT EXISTS popularity_rank INTEGER,
  ADD COLUMN IF NOT EXISTS mal_members BIGINT;

CREATE INDEX IF NOT EXISTS site_anime_popularity_v33_idx
  ON public.site_anime (popularity_rank ASC NULLS LAST, mal_members DESC NULLS LAST, rating DESC NULLS LAST, id ASC);

-- Allow an authenticated site admin to update ONLY the popularity metadata
-- on existing anime, matched by immutable MAL ID. SECURITY INVOKER means
-- existing Supabase RLS still applies to each row.
CREATE OR REPLACE FUNCTION public.site_bulk_update_popularity_v33(p_rows JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path=public
AS $$
DECLARE
  affected INTEGER := 0;
BEGIN
  IF NOT public.site_is_admin() THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;
  IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_rows) > 100 THEN
    RAISE EXCEPTION 'Expected an array of at most 100 popularity records';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(p_rows)
      AS r(mal_id BIGINT, popularity_rank INTEGER, mal_members BIGINT)
    WHERE r.mal_id IS NULL OR r.mal_id < 1
       OR (r.popularity_rank IS NULL AND r.mal_members IS NULL)
       OR (r.popularity_rank IS NOT NULL AND r.popularity_rank < 1)
       OR (r.mal_members IS NOT NULL AND r.mal_members < 0)
  ) THEN
    RAISE EXCEPTION 'Invalid MAL popularity record';
  END IF;

  UPDATE public.site_anime AS a
  SET popularity_rank = COALESCE(r.popularity_rank, a.popularity_rank),
      mal_members = COALESCE(r.mal_members, a.mal_members)
  FROM jsonb_to_recordset(p_rows)
    AS r(mal_id BIGINT, popularity_rank INTEGER, mal_members BIGINT)
  WHERE a.mal_id = r.mal_id
    AND (a.popularity_rank IS DISTINCT FROM COALESCE(r.popularity_rank, a.popularity_rank)
       OR a.mal_members IS DISTINCT FROM COALESCE(r.mal_members, a.mal_members));

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.site_bulk_update_popularity_v33(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.site_bulk_update_popularity_v33(JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.site_bulk_update_popularity_v33(JSONB) TO authenticated;
COMMIT;
