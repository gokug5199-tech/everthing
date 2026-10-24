THE EVERYTHING — Latest Sections + Mobile PWA

1. Upload/replace all files included in this ZIP to your website root, maintaining folders. Your original zip is preserved; updated versions replace only the matching paths.
2. In Supabase > SQL Editor, run docs/LATEST-FEATURES-SETUP.sql ONE TIME. Keep ADMIN-SETUP.sql and EPISODES-SETUP.sql already installed.
3. Open admin.html, sign in as admin, then click "Latest sections". Pick an anime under Latest Anime and click + Feature anime. Pick an anime and a saved episode under Latest Episodes and click + Feature episode. Use ↑ ↓ to sort and Remove to hide an item.
4. Sections display on index.html and anime.html (mobile AND desktop); empty sections stay hidden. Public site is not changed until you feature an item.
5. For phone PWA install the site MUST be served over HTTPS (localhost works for testing). iPhone: Safari > Share > Add to Home Screen. Android: Chrome menu > Install app / Add to Home Screen. The prompt is optional and dismissible.
6. Service worker only caches selected static files; user/account/API responses and videos are not stored. Test after deploying with Ctrl+F5; mobile Safari may need a page reload.
7. The mobile bottom menu only appears on touch phones (up to 767px). Desktop layout remains intact. Review very custom pages on your actual devices before going live.
8. New icons are temporary E-branded dark icons; you can replace icons/icon-192.png and icons/icon-512.png with your own square logo.
9. If Latest shows a database error, run SQL and verify row-level policies. Admin selection only works for existing published anime/episode records.
10. The Latest Episodes section uses episode links from saved site_episodes, not from untracked external videos.
