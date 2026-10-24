/* Optional Add to Home Screen + shared mobile app navigation. */
(function () {
  'use strict';
  const filename = location.pathname.split('/').pop().toLowerCase() || 'index.html';
  const page = filename.replace(/\.html$/, '').replace(/[^a-z0-9-]/g, '');

  if (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js').catch(error => console.warn('PWA unavailable', error));
    }
  }
  if (!document.querySelector('link[rel="manifest"]')) {
    const link = document.createElement('link'); link.rel = 'manifest'; link.href = 'manifest.webmanifest'; document.head.append(link);
  }
  if (!document.querySelector('meta[name="theme-color"]')) {
    const meta = document.createElement('meta'); meta.name = 'theme-color'; meta.content = '#080e16'; document.head.append(meta);
  }
  if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
    const meta = document.createElement('meta'); meta.name = 'apple-mobile-web-app-capable'; meta.content = 'yes'; document.head.append(meta);
  }
  if (!document.querySelector('link[rel="apple-touch-icon"]')) {
    const link = document.createElement('link'); link.rel = 'apple-touch-icon'; link.href = 'icons/icon-192.png'; document.head.append(link);
  }
  function standalone() {
    return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  }
  const mobile = () => window.matchMedia('(max-width: 767px)').matches;
  const glyphs = {
    Home: '<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>',
    Anime: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m9 7 8 5-8 5z"/>',
    Wallpapers: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/>',
    Profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3-7 8-7s8 3 8 7"/>'
  };
  function icon(label) { return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">' + glyphs[label] + '</svg>'; }

  let deferredInstall = null;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); deferredInstall = event;
  });

  function init() {
    document.body.classList.add('te-page-' + page);
    const excluded = new Set(['admin.html', 'login.html', 'reset-password.html']);
    if (!mobile() || excluded.has(filename) || document.querySelector('.te-mobile-nav')) return;
    const nav = document.createElement('nav'); nav.className = 'te-mobile-nav'; nav.setAttribute('aria-label', 'Mobile navigation');
    const active = filename === 'index.html' ? 'Home' :
      ['anime.html','anime-details.html','my-anime.html','watch.html'].includes(filename) ? 'Anime' :
      ['wallpaper.html','my-wallpapers.html','user-wallpapers.html'].includes(filename) ? 'Wallpapers' : 'Profile';
    for (const [label, href] of [['Home','index.html'],['Anime','anime.html'],['Wallpapers','wallpaper.html'],['Profile','profile.html']]) {
      const item = document.createElement('a');
      item.href = href;
      item.innerHTML = icon(label) + '<span>' + label + '</span>';
      if (label === active) item.setAttribute('aria-current','page');
      nav.append(item);
    }
    document.body.append(nav);

    if (standalone()) return;
    try { if (sessionStorage.getItem('te-install-dismissed')) return; } catch (_) { /* private mode */ }
    // Never interrupt a first view of the page: install is offered by a small dismissible prompt.
    const banner = document.createElement('aside'); banner.className = 'te-install-banner'; banner.setAttribute('aria-label','Install The Everything');
    const copy = document.createElement('p');
    copy.innerHTML = '<strong>Add The Everything to your Home Screen</strong><span>Open faster with an app-like experience. Optional.</span>';
    const install = document.createElement('button'); install.type = 'button'; install.textContent = 'Install';
    const close = document.createElement('button'); close.type = 'button'; close.className = 'te-install-close'; close.textContent = '×'; close.setAttribute('aria-label','Dismiss');
    const dismiss = () => { banner.remove(); try { sessionStorage.setItem('te-install-dismissed','1'); } catch (_) {} };
    close.addEventListener('click', dismiss);
    install.addEventListener('click', async () => {
      if (deferredInstall) {
        deferredInstall.prompt();
        try { await deferredInstall.userChoice; } catch (_) {}
        deferredInstall = null; dismiss();
      } else {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        copy.querySelector('span').textContent = isIOS
          ? 'In Safari, tap Share → Add to Home Screen.'
          : 'Open your browser menu (⋮) → Add to Home Screen / Install app.';
        install.textContent = 'Got it';
        install.addEventListener('click', dismiss, { once: true });
      }
    });
    banner.append(copy, install, close);
    document.body.append(banner);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
