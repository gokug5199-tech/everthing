/* The Everything — selected anime and episode releases.
   The latest sections are intentionally limited to anime.html. */
(function () {
  'use strict';

  const API = 'https://tnavsfbolastevebukxl.supabase.co/rest/v1/';
  const KEY = 'sb_publishable_3FX_mPM-A6dIY-nQTtFZQg_5HPoWO9B';
  const page = location.pathname.split('/').pop().toLowerCase();
  if (page !== 'anime.html') return;

  const safeImage = (value) => {
    try {
      const url = new URL(String(value || ''), location.href);
      return (url.protocol === 'https:' || url.protocol === 'http:') ? url.href : '';
    } catch (_) { return ''; }
  };

  async function fetchRows(table, query) {
    const response = await fetch(API + table + '?' + query, {
      headers: { apikey: KEY },
      signal: AbortSignal.timeout(14000)
    });
    if (!response.ok) throw new Error(table + ': HTTP ' + response.status);
    return response.json();
  }

  function updateHero(anime) {
    if (!anime || !anime.title || !anime.id) return;
    const hero = document.getElementById('teAnimeMobileHero');
    if (!hero) return;
    const image = hero.querySelector('.te-hero-art');
    const title = hero.querySelector('.te-hero-title');
    const genres = hero.querySelector('.te-hero-genres');
    const link = hero.querySelector('.te-hero-view');
    const picture = safeImage(anime.image);
    if (picture) image.src = picture;
    image.alt = '';
    title.textContent = anime.title;
    const parts = Array.isArray(anime.genres) ? anime.genres.slice(0, 3) : [];
    genres.textContent = parts.length ? parts.join('  ·  ') : 'Discover this anime';
    link.href = 'anime-details.html?id=' + encodeURIComponent(anime.id);
  }

  async function fallbackHero() {
    try {
      if (window.ANIME_READY) await window.ANIME_READY;
      const items = window.ANIME_DATA;
      if (Array.isArray(items) && items.length) updateHero(items[0]);
    } catch (error) { console.warn('Anime banner unavailable', error); }
  }

  function buildCard(anime, episode, index) {
    const link = document.createElement('a');
    const isEpisode = Boolean(episode);
    link.className = 'te-latest-card';
    link.href = isEpisode
      ? 'watch.html?anime=' + encodeURIComponent(anime.id) +
        '&season=' + encodeURIComponent(episode.season_number) +
        '&episode=' + encodeURIComponent(episode.episode_number)
      : 'anime-details.html?id=' + encodeURIComponent(anime.id);

    const picture = document.createElement('div');
    picture.className = 'te-latest-poster';
    const img = document.createElement('img');
    img.src = safeImage(anime.image) || 'image/anime/attack-on-titan.jpg';
    img.alt = '';
    img.loading = index < 3 ? 'eager' : 'lazy';
    picture.append(img);
    if (isEpisode) {
      const chip = document.createElement('span');
      chip.className = 'te-latest-chip';
      chip.textContent = 'EP ' + episode.episode_number;
      picture.append(chip);
    }

    const info = document.createElement('div');
    info.className = 'te-latest-info';
    const title = document.createElement('strong');
    title.textContent = anime.title;
    const details = document.createElement('small');
    details.textContent = isEpisode
      ? 'Season ' + episode.season_number + ' · Episode ' + episode.episode_number
      : (Array.isArray(anime.genres) && anime.genres.length
          ? anime.genres.slice(0, 2).join(' · ') : 'Anime');
    info.append(title, details);
    link.append(picture, info);
    return link;
  }

  function createHeading(kind) {
    const header = document.createElement('div');
    header.className = 'te-latest-heading';
    const name = document.createElement('h2');
    name.textContent = kind === 'anime' ? 'Latest Anime' : 'Latest Episodes';
    header.append(name);
    if (kind === 'anime') {
      const all = document.createElement('a');
      all.href = '#animeGrid';
      all.textContent = 'See all →';
      header.append(all);
    }
    return header;
  }

  async function loadFeatured() {
    let featured;
    try {
      featured = await fetchRows('site_featured',
        'select=kind,anime_id,season_number,episode_number,position&order=position.asc,created_at.asc&limit=100');
    } catch (error) {
      console.warn('Latest sections could not load:', error);
      return;
    }
    if (!Array.isArray(featured) || !featured.length) return;
    const ids = [...new Set(featured.map(x => x.anime_id).filter(Boolean))];
    if (!ids.length) return;

    let anime;
    try {
      // IDs are escaped and URLSearchParams encodes them; don't insert raw data in selectors or HTML.
      const filter = 'id=in.(' + ids.map(id => '"' + String(id).replace(/["\\]/g, '') + '"').join(',') + ')';
      anime = await fetchRows('site_anime',
        new URLSearchParams({ select: 'id,title,image,genres', id: 'in.(' + ids.map(id => '"' + String(id).replace(/["\\]/g, '') + '"').join(',') + ')' }).toString());
    } catch (error) { console.warn('Anime details unavailable:', error); return; }
    const animeById = new Map(anime.map(x => [x.id, x]));
    const firstFeaturedAnime = featured.filter(x => x.kind === 'anime').map(x => animeById.get(x.anime_id)).find(Boolean);
    if (firstFeaturedAnime) updateHero(firstFeaturedAnime);

    const selectedEpisodes = featured.filter(x => x.kind === 'episode');
    let episodes = [];
    if (selectedEpisodes.length) {
      try {
        episodes = await fetchRows('site_episodes',
          'select=anime_id,season_number,episode_number,title&limit=5000');
      } catch (error) { console.warn('Episode details unavailable:', error); }
    }
    const epByKey = new Map(episodes.map(ep =>
      [ep.anime_id + '/' + ep.season_number + '/' + ep.episode_number, ep]));

    const wrap = document.createElement('div');
    wrap.className = 'te-latest-wrap';
    wrap.setAttribute('aria-label', 'Latest anime and episodes');

    for (const kind of ['anime', 'episode']) {
      const group = featured.filter(x => x.kind === kind);
      const section = document.createElement('section');
      section.className = 'te-latest-section te-latest-section--' + kind;
      section.append(createHeading(kind));
      const row = document.createElement('div');
      row.className = 'te-latest-grid';
      for (const item of group) {
        const animeItem = animeById.get(item.anime_id);
        if (!animeItem) continue;
        const episode = kind === 'episode'
          ? epByKey.get(item.anime_id + '/' + item.season_number + '/' + item.episode_number)
          : null;
        if (kind === 'episode' && !episode) continue;
        row.append(buildCard(animeItem, episode, row.children.length));
      }
      if (row.children.length) {
        section.append(row);
        wrap.append(section);
      }
    }
    if (!wrap.children.length) return;
    const destination = document.querySelector('.anime-section');
    if (destination) destination.prepend(wrap);
  }

  function init() {
    fallbackHero();
    loadFeatured();
    const focus = document.getElementById('teHeroSearch');
    if (focus) focus.addEventListener('click', () => {
      const search = document.getElementById('animeSearch');
      if (search) { search.scrollIntoView({ behavior: 'smooth', block: 'center' }); search.focus({ preventScroll: true }); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
