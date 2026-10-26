/* The Everything — mobile navigation and optional PWA install (stability v10). */
(function () {
  'use strict';

  const scriptURL = document.currentScript && document.currentScript.src;
  const siteBase = new URL('.', scriptURL || location.href);
  const pageNames = {
    '': 'Home', 'index': 'Home', 'home': 'Home',
    'anime': 'Anime', 'anime-details': 'Anime', 'my-anime': 'Anime',
    'watch': 'Anime', 'attack-on-titan': 'Anime',
    'wallpaper': 'Wallpapers', 'wallpapers': 'Wallpapers',
    'my-wallpapers': 'Wallpapers', 'user-wallpapers': 'Wallpapers',
    'profile': 'Profile', 'settings': 'Profile'
  };
  function currentPage() {
    // Handles both /anime.html and clean routes like /anime or /anime/.
    const path = decodeURIComponent(location.pathname).replace(/\/+$/, '');
    const leaf = (path.split('/').pop() || '').toLowerCase().replace(/\.html?$/, '');
    return { leaf, active: Object.prototype.hasOwnProperty.call(pageNames, leaf) ? pageNames[leaf] : null };
  }
  function isMobile() { return window.matchMedia('(max-width: 767px)').matches; }
  function standalone() {
    return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  }
  function isIOSSafari() {
    const ua = navigator.userAgent || '';
    const appleMobile = /iPhone|iPod|iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return appleMobile && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  }
  const icons = {
    Home: '<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>',
    Anime: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m9 7 8 5-8 5z"/>',
    Wallpapers: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/>',
    Profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3-7 8-7s8 3 8 7"/>'
  };
  function svg(name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + icons[name] + '</svg>';
  }
  function addHeadData() {
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement('link'); link.rel = 'manifest';
      link.href = new URL('manifest.webmanifest', siteBase).href; document.head.append(link);
    }
    if (!document.querySelector('meta[name="theme-color"]')) {
      const meta = document.createElement('meta'); meta.name = 'theme-color'; meta.content = '#080e16'; document.head.append(meta);
    }
    if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
      const meta = document.createElement('meta'); meta.name = 'apple-mobile-web-app-capable'; meta.content = 'yes'; document.head.append(meta);
    }
    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
      const link = document.createElement('link'); link.rel = 'apple-touch-icon';
      link.href = new URL('icons/icon-192.png', siteBase).href; document.head.append(link);
    }
  }
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !(
      location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    )) return;
    // After initial painting; no work on the critical first render.
    const go = () => navigator.serviceWorker.register(new URL('service-worker.js', siteBase).href)
      .catch(error => console.warn('PWA unavailable:', error));
    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go, { once: true });
  }

  let deferredInstall = null;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstall = event;
  });
  const storage = {
    read(key) { try { return localStorage.getItem(key); } catch (_) { return null; } },
    write(key, value) { try { localStorage.setItem(key, value); } catch (_) {} }
  };
  let banner = null;
  function dismissBanner() {
    if (banner) { banner.remove(); banner = null; }
    storage.write('te-install-dismissed-at', String(Date.now()));
  }
  window.addEventListener('appinstalled', () => {
    storage.write('te-app-installed', '1');
    dismissBanner();
  });
  function showInstallPrompt() {
    // Optional; prompt on Home only, never on every page of the app.
    if (banner || !isMobile() || standalone() || currentPage().active !== 'Home') return;
    if (storage.read('te-app-installed') === '1') return;
    const lastDismissed = Number(storage.read('te-install-dismissed-at') || 0);
    if (lastDismissed && Date.now() - lastDismissed < 60 * 24 * 60 * 60 * 1000) return;
    try { if (sessionStorage.getItem('te-install-dismissed')) return; } catch (_) {}

    banner = document.createElement('aside');
    banner.className = 'te-install-banner';
    banner.setAttribute('aria-label', 'Install The Everything');
    const copy = document.createElement('p');
    copy.innerHTML = '<strong>Add The Everything to your Home Screen</strong><span>Optional — open it like an app.</span>';
    const install = document.createElement('button');
    install.type = 'button'; install.textContent = 'Install';
    const close = document.createElement('button');
    close.type = 'button'; close.className = 'te-install-close';
    close.textContent = '×'; close.setAttribute('aria-label', 'Dismiss install prompt');
    close.addEventListener('click', dismissBanner);
    install.addEventListener('click', async () => {
      if (deferredInstall) {
        const prompt = deferredInstall;
        deferredInstall = null;
        await prompt.prompt();
        try {
          const answer = await prompt.userChoice;
          if (answer && answer.outcome === 'accepted') storage.write('te-app-installed', '1');
        } catch (_) {}
        dismissBanner();
      } else {
        copy.querySelector('span').textContent = isIOSSafari()
          ? 'In Safari: Share → Add to Home Screen.'
          : 'In your browser menu: Add to Home Screen or Install app.';
        install.textContent = 'Got it';
        install.addEventListener('click', dismissBanner, { once: true });
      }
    });
    banner.append(copy, install, close);
    document.body.append(banner);
  }

  function syncNavigation() {
    const page = currentPage();
    document.body.classList.add('te-page-' + (page.leaf || 'index'));
    const excluded = new Set(['admin', 'login', 'reset-password']);
    let nav = document.querySelector('.te-mobile-nav');
    if (!isMobile() || excluded.has(page.leaf)) {
      if (nav) nav.remove();
      return;
    }
    if (!nav) {
      nav = document.createElement('nav');
      nav.className = 'te-mobile-nav';
      nav.setAttribute('aria-label', 'Mobile navigation');
      for (const [label, href] of [
        ['Home', 'index.html'], ['Anime', 'anime.html'],
        ['Wallpapers', 'wallpaper.html'], ['Profile', 'profile.html']
      ]) {
        const a = document.createElement('a');
        a.href = new URL(href, siteBase).href;
        a.dataset.teTab = label;
        a.innerHTML = svg(label) + '<span>' + label + '</span>';
        nav.append(a);
      }
      document.body.append(nav);
    }
    for (const a of nav.querySelectorAll('a[data-te-tab]')) {
      if (a.dataset.teTab === page.active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
    if (banner && currentPage().active !== 'Home') { banner.remove(); banner = null; }
  }

  function init() {
    addHeadData();
    if (isIOSSafari()) document.body.classList.add('te-ios-safari');
    syncNavigation();
    registerServiceWorker();
    if (currentPage().active === 'Home' && isMobile() && !standalone()) {
      // Delay the optional install message until after content paints.
      window.setTimeout(showInstallPrompt, 8000);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  // iOS Safari back/forward cache restores a document without re-executing scripts.
  window.addEventListener('pageshow', () => { if (document.body) syncNavigation(); });
  window.addEventListener('popstate', () => { if (document.body) syncNavigation(); });
})();
