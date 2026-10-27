THE EVERYTHING v19 — Catalog Pagination & Missing Characters
==========================================================

HOW TO INSTALL (AR)
1) Unzip PATCH v19.
2) Replace matching files at the root of your The Everything site folder.
3) Copy the new anime-characters-backfill-v19.js file into that same root folder.
4) Re-deploy the site to Netlify, then do a hard refresh (Ctrl+F5).
5) Anime page: 48 anime per page; Previous/Next navigation beneath the grid.
6) Admin -> Anime -> Fill Missing Characters: press the button to fill missing character lists.
   It processes up to 500 anime per batch, with pause/resume and a browser checkpoint.
   Reload your anime details page afterward to see the characters.

NOTES
- No SQL is needed if your existing anime character editor was already working.
- v16 importer never fetched characters. v19 backfills empty lists using Tenrai.
- Existing character lists are not overwritten. No videos or user accounts are touched.
- Requires your existing Supabase Admin permissions and Tenrai API accessibility.
- Tested with mocked 2,000 anime and simulated Tenrai/Supabase, not live production.

CHANGED FILES
anime.js
anime.css
anime.html
admin.html
admin.css
bulk-anime-v16.js
anime-characters-backfill-v19.js
