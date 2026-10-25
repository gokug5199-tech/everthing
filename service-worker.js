/* Static application shell only — user sessions, Supabase and video streams are never cached. */
const CACHE = 'te-shell-20261025-clean-v8';
const ASSETS = [
  './index.html', './anime.html',
  './site-branding.css', './mobile-pwa.css', './mobile-pwa.js',
  './home-2026.css', './home-2026.js', './home-auth.js',
  './te-v5.css', './te-v5.js', './anime.css', './anime.js', './featured-public.js',
  './anime-page.js', './wallpaper-v7-fixes.css', './shared-header-v6.css', './shared-header-v6.js',
  './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png',
  './image/home/te-icon.webp'
];
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
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
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin ||
      url.pathname.includes('/rest/') || url.pathname.includes('/auth/') ||
      url.pathname.includes('/storage/') || /\.(mp4|m3u8|ts|mkv)$/i.test(url.pathname)) return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }
  if (!ASSETS.some(path => new URL(path, self.registration.scope).href === url.href)) return;
  event.respondWith(fetch(req).then(response => {
    if (response.ok) {
      const clone = response.clone();
      caches.open(CACHE).then(cache => cache.put(req, clone));
    }
    return response;
  }).catch(() => caches.match(req)));
});
