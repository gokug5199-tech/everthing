THE EVERYTHING - v20 REAL SERVER-SIDE ANIME PAGINATION

Changes:
- anime.html: Catalog page no longer downloads the whole site_anime table.
- anime.js: On-demand Supabase REST queries return only 48 anime records per page
  (id, title, image, genres, age_rating, rating, created_at). Search, genre
  filters, sorting and pagination are performed on the server.
- anime.css: Small loading/retry states.
- featured-public.js: Latest Episodes queries only the featured episode IDs,
  instead of downloading up to 5,000 unrelated episodes.

Install:
1) Extract the patch into the same directory as anime.html and overwrite these 4 files.
2) Publish the updated site to Netlify.
3) Hard-refresh anime.html; versioned assets force the browser to read the changes.

No SQL changes. Other pages, user accounts, episode links, anime records and
Safari v15 performance optimizations were not changed.

Testing:
- node --check passed for both changed JS files.
- Chromium mocked API test: 2,000 anime; first 48 only; page 2; search for an
  anime at index 1,999; genre filtering; no JS runtime errors.
- Live Supabase API latency/CORS/production data were not verified.

Notes:
- This specifically accelerates anime.html. anime-details.html, watch.html and
  My Anime Library still use their original shared catalog loader and were
  deliberately not refactored in this isolated fix.
- Pages show static genre choices rather than discovering genres from all 2,000
  records, so some genre choices may not have matching anime yet.
- Requires direct read access to site_anime under existing Supabase RLS.
