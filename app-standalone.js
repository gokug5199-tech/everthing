/* The Everything — native-style experience, Home Screen only.
 * Enhances the existing pages; does not replace their data, events or routing.
 * Zero dependencies, no Supabase queries, no activity tracking.
 */
(function () {
  'use strict';
  var root = document.documentElement;
  var base = new URL('.', (document.currentScript && document.currentScript.src) || location.href);
  var pages = {
    '': ['Discover', 'Home'], index: ['Discover', 'Home'], anime: ['Anime', 'Anime'],
    'anime-details': ['Anime details', 'Anime'], 'episode-choice': ['Episode options', 'Anime'],
    watch: ['Now watching', 'Anime'], schedule: ['Release schedule', 'Anime'],
    'my-anime': ['My library', 'Library'], wallpaper: ['Wallpapers', 'Wallpapers'],
    'my-wallpapers': ['My wallpapers', 'Wallpapers'], 'user-wallpapers': ['Creator wallpapers', 'Wallpapers'],
    profile: ['Your profile', 'Profile'], settings: ['Settings', 'Profile'],
    films: ['Films', 'Home'], login: ['Your account', null], 'reset-password': ['Account recovery', null],
    admin: ['Dashboard', null], about: ['About', null], contact: ['Contact', null],
    privacy: ['Privacy', null], terms: ['Terms', null], dmca: ['DMCA', null],
    support: ['Support', null]
  };
  var icons = {
    house: '<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>',
    anime: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m10 8 6 4-6 4z"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1"/><path d="m3 17 6-6 4 4 3-3 5 5"/>',
    bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>'
  };
  function svg(name) {
    return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + icons[name] + '</svg>';
  }
  function href(path) { return new URL(path, base).href; }
  function pageName() {
    return decodeURIComponent(location.pathname.split('/').pop() || '').toLowerCase().replace(/\.html?$/, '');
  }
  function safeText(node, string) { node.textContent = string; return node; }
  var chrome = null;
  var dock = null;
  function makeChrome(name, item) {
    var header = document.createElement('header');
    header.className = 'te-app-topbar';
    header.setAttribute('aria-label', 'App header');
    var home = document.createElement('a');
    home.className = 'te-app-brand';
    home.href = href('index.html');
    home.setAttribute('aria-label', 'Go to Home');
    var brandIcon = document.createElement('img');
    brandIcon.src = href('image/home/te-icon.webp');
    brandIcon.width = 37;
    brandIcon.height = 37;
    brandIcon.alt = '';
    home.appendChild(brandIcon);
    var brandText = document.createElement('span');
    brandText.className = 'te-app-brand-copy';
    var small = document.createElement('small');
    small.textContent = 'THE EVERYTHING';
    var strong = document.createElement('strong');
    strong.textContent = item[0];
    brandText.append(small, strong);
    home.appendChild(brandText);
    header.appendChild(home);
    var actions = document.createElement('div');
    actions.className = 'te-app-top-actions';
    var search = document.createElement('button');
    search.type = 'button';
    search.className = 'te-app-icon-button';
    search.setAttribute('aria-label', 'Search anime');
    search.innerHTML = svg('search');
    search.addEventListener('click', function () {
      var existing = document.getElementById('animeSearch') || document.getElementById('wallpaperSearch');
      if (existing) { existing.scrollIntoView({ block: 'center', behavior: 'smooth' }); existing.focus({ preventScroll: true }); }
      else location.href = href('anime.html#discover');
    });
    actions.append(search);
    var profile = document.createElement('a');
    profile.className = 'te-app-icon-button';
    profile.href = href('profile.html');
    profile.setAttribute('aria-label', 'Your profile');
    profile.innerHTML = svg('user');
    actions.append(profile);
    header.append(actions);
    document.body.insertBefore(header, document.body.firstChild);
    chrome = header;
  }
  function makeDock(active) {
    var nav = document.createElement('nav');
    nav.className = 'te-app-dock';
    nav.setAttribute('aria-label', 'App navigation');
    var tabs = [
      ['Home', 'index.html', 'house'], ['Anime', 'anime.html', 'anime'],
      ['Wallpapers', 'wallpaper.html', 'image'], ['Library', 'my-anime.html', 'bookmark'],
      ['Profile', 'profile.html', 'user']
    ];
    tabs.forEach(function (tab) {
      var a = document.createElement('a');
      a.href = href(tab[1]);
      a.setAttribute('aria-label', tab[0]);
      a.innerHTML = '<span class="te-app-tab-icon">' + svg(tab[2]) + '</span><span>' + tab[0] + '</span>';
      if (tab[0] === active) a.setAttribute('aria-current', 'page');
      nav.appendChild(a);
    });
    document.body.appendChild(nav);
    dock = nav;
  }
  function createHomeDashboard() {
    var main = document.querySelector('.hm-main');
    if (!main || document.querySelector('.te-app-dashboard')) return;
    var dashboard = document.createElement('section');
    dashboard.className = 'te-app-dashboard';
    dashboard.setAttribute('aria-labelledby', 'teAppHeroTitle');
    dashboard.innerHTML =
      '<div class="te-app-greeting"><span class="te-app-eyebrow">YOUR UNIVERSE STARTS HERE</span>' +
      '<h1 id="teAppHeroTitle">The stories you love.<br><em>All in one place.</em></h1>' +
      '<p>Discover anime, find your next wallpaper, and pick up right where you left off.</p></div>' +
      '<a class="te-app-feature-tile" href="anime.html">' +
      '<img src="image/home/hero-anime.webp" alt="" decoding="async" fetchpriority="high" />' +
      '<span class="te-app-feature-shade"></span><span class="te-app-feature-copy"><small>FEATURED COLLECTION</small>' +
      '<strong>Step into an<br>anime world</strong><span class="te-app-feature-link">Explore anime ' + svg('arrow') + '</span></span></a>' +
      '<div class="te-app-shortcuts-title"><h2>Explore your world</h2><span>Made for you</span></div>' +
      '<div class="te-app-shortcuts">' +
      '<a class="te-app-shortcut te-app-shortcut-wall" href="wallpaper.html"><img src="image/home/hero-dream.webp" alt="" loading="lazy"><span>Wallpapers<small>Find your look</small></span>' + svg('arrow') + '</a>' +
      '<a class="te-app-shortcut te-app-shortcut-list" href="my-anime.html"><span class="te-app-shortcut-icon">' + svg('bookmark') + '</span><span>My Library<small>Your saved worlds</small></span>' + svg('arrow') + '</a>' +
      '<a class="te-app-shortcut te-app-shortcut-calendar" href="schedule.html"><span class="te-app-shortcut-icon">' + svg('calendar') + '</span><span>Schedule<small>Weekly releases</small></span>' + svg('arrow') + '</a>' +
      '</div>';
    var anchor = main.querySelector('.hm-hero');
    if (anchor) main.insertBefore(dashboard, anchor);
    else main.insertBefore(dashboard, main.firstChild);
  }
  function addAnimeIntro() {
    var main = document.querySelector('.v6-main');
    if (!main || document.querySelector('.te-app-anime-intro')) return;
    var intro = document.createElement('div');
    intro.className = 'te-app-anime-intro';
    intro.innerHTML = '<div><small>ANIME UNIVERSE</small><h1>Find your next<br><em>favorite.</em></h1></div>' +
      '<a href="my-anime.html" aria-label="Open My Anime Library">' + svg('bookmark') + '</a>';
    var anchor = main.querySelector('.v6-hero');
    main.insertBefore(intro, anchor || main.firstChild);
  }
  function refresh() {
    var enabled = root.classList.contains('te-app-mode');
    if (!enabled) {
      if (chrome) { chrome.remove(); chrome = null; }
      if (dock) { dock.remove(); dock = null; }
      return;
    }
    var name = pageName();
    // Preserve the complex admin workbench untouched; its existing toolbar is functional.
    if (name === 'admin') return;
    var item = pages[name] || ['The Everything', null];
    if (!chrome) makeChrome(name, item);
    if (item[1] && !dock) makeDock(item[1]);
    if (!item[1] && dock) { dock.remove(); dock = null; }
    if (name === 'index' || !name) createHomeDashboard();
    if (name === 'anime') addAnimeIntro();
  }
  function init() {
    refresh();
    window.addEventListener('pageshow', refresh);
    if (window.matchMedia) {
      var media = window.matchMedia('(max-width: 767px)');
      if (media.addEventListener) media.addEventListener('change', refresh);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
