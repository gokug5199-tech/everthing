-- The Everything | v7 rotating anime banner
-- Run once in Supabase SQL Editor. Existing anime, episodes and Latest sections stay unchanged.
-- Requires public.site_anime and public.site_is_admin() from your existing admin setup.
BEGIN;
CREATE TABLE IF NOT EXISTS public.site_hero_featured (
 anime_id text PRIMARY KEY REFERENCES public.site_anime(id) ON DELETE CASCADE,
 position integer NOT NULL DEFAULT 10,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS site_hero_featured_position_idx ON public.site_hero_featured(position, created_at);
ALTER TABLE public.site_hero_featured ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.site_hero_featured TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_hero_featured TO authenticated;
DROP POLICY IF EXISTS site_hero_read ON public.site_hero_featured;
CREATE POLICY site_hero_read ON public.site_hero_featured FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS site_hero_admin_insert ON public.site_hero_featured;
CREATE POLICY site_hero_admin_insert ON public.site_hero_featured FOR INSERT TO authenticated WITH CHECK ((SELECT public.site_is_admin()));
DROP POLICY IF EXISTS site_hero_admin_update ON public.site_hero_featured;
CREATE POLICY site_hero_admin_update ON public.site_hero_featured FOR UPDATE TO authenticated USING ((SELECT public.site_is_admin())) WITH CHECK ((SELECT public.site_is_admin()));
DROP POLICY IF EXISTS site_hero_admin_delete ON public.site_hero_featured;
CREATE POLICY site_hero_admin_delete ON public.site_hero_featured FOR DELETE TO authenticated USING ((SELECT public.site_is_admin()));
COMMIT;
