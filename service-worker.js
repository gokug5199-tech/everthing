/* v10 — lightweight offline fallback. Supabase/auth/media are never cached. */
const CACHE = 'te-shell-20261026-design-v14';
const DOCUMENTS = ['./index.html', './anime.html', './wallpaper.html'];
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(async cache => {
      // Don't block new worker activation if ONE optional asset is missing.
      await Promise.allSettled(DOCUMENTS.map(file => cache.add(file)));
    }).then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith('te-shell-') && key !== CACHE).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || req.mode !== 'navigate') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Always prefer fresh online content and never cache user sessions/pages.
  event.respondWith(fetch(req).catch(async () => {
    const cache = await caches.open(CACHE);
    const safePath = url.pathname.split('/').pop().toLowerCase();
    if (!['index.html', 'anime.html', 'wallpaper.html', 'anime', 'wallpaper', ''].includes(safePath)) return Response.error();
    const fallback = safePath === 'anime' ? './anime.html' : safePath === 'wallpaper' ? './wallpaper.html' : safePath === '' ? './index.html' : './' + safePath;
    return (await cache.match(fallback)) || Response.error();
  }));
});
