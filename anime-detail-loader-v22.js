/* The Everything v22 — load only the requested anime on detail / watch pages.
   Keep the full catalog loader for other pages; no database schema changes. */
(function () {
  'use strict';
  const API = 'https://tnavsfbolastevebukxl.supabase.co/rest/v1/site_anime';
  const KEY = 'sb_publishable_3FX_mPM-A6dIY-nQTtFZQg_5HPoWO9B';
  const params = new URLSearchParams(location.search);
  const isWatch = /(?:^|\/)watch(?:\.html)?\/?$/i.test(location.pathname); // Cloudflare Pages serves /watch as well as /watch.html
  const animeId = params.get(isWatch ? 'anime' : 'id') || (isWatch ? '' : 'attack-on-titan');
  const isDetail = !isWatch;
  window.ANIME_DATA = [];
  window.ANIME_LOAD_ERROR = false;

  async function read(filters, columns, limit) {
    const query = new URLSearchParams({select: columns || '*', ...filters, limit: String(limit || 100)});
    const response = await fetch(API + '?' + query, {
      headers: {apikey: KEY}, signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw Error('Anime request failed (' + response.status + ')');
    return response.json();
  }
  window.ANIME_READY = (async function () {
    if (!animeId) return window.ANIME_DATA;
    // Only public anime rows cached from an intentional recent hover/focus.
    // A direct visit or an expired cache always reads the current Supabase row.
    try {
      const cached = JSON.parse(sessionStorage.getItem('te-anime-full-v22') || 'null');
      if (cached && String(cached.id) === String(animeId) &&
          Number.isFinite(cached.at) && Date.now() - cached.at < 30000 &&
          cached.anime && String(cached.anime.id) === String(animeId)) {
        const row=cached.anime;
        window.ANIME_DATA = [{...row, episodeLinks: row.episode_links || {}}];
        return window.ANIME_DATA;
      }
    } catch (_) { /* Storage not available. */ }
    try {
      const rows = await read({id: 'eq.' + animeId}, '*', 1);
      if (Array.isArray(rows) && rows[0]) {
        const row = rows[0];
        window.ANIME_DATA = [{...row, episodeLinks: row.episode_links || {}}];
      }
    } catch (error) {
      window.ANIME_LOAD_ERROR = true;
      console.error('Unable to load this anime:', error);
    }
    return window.ANIME_DATA;
  })();

  // Optional related titles load separately: never delay the poster, information,
  // character list, or episodes while looking up relations.
  window.ANIME_RELATIONS_READY = window.ANIME_READY.then(async function () {
    const current = window.ANIME_DATA[0];
    if (!isDetail || !current) return window.ANIME_DATA;
    const columns = 'id,title,image,mal_id,anime_type,start_date,series_key,season_order,season_label,mal_relations';
    const jobs = [];
    if (current.series_key) {
      jobs.push(read({series_key: 'eq.' + current.series_key}, columns, 100));
    }
    const relatedIds = [...new Set((Array.isArray(current.mal_relations) ? current.mal_relations : [])
      .flatMap(group => Array.isArray(group?.entries) ? group.entries : [])
      .map(entry => Number(entry?.mal_id))
      .filter(id => Number.isSafeInteger(id) && id > 0))].slice(0, 100);
    // All IDs come from the database, not visitor-controlled query fragments.
    if (relatedIds.length) jobs.push(read({mal_id: 'in.(' + relatedIds.join(',') + ')'}, columns, 100));
    // Direct reverse links for titles whose MAL metadata points at this anime.
    if (Number.isSafeInteger(Number(current.mal_id)) && Number(current.mal_id) > 0) {
      jobs.push(read({mal_relations: 'cs.' + JSON.stringify([{entries: [{mal_id: Number(current.mal_id)}]}])}, columns, 100));
    }
    if (!jobs.length) return window.ANIME_DATA;
    const results = await Promise.allSettled(jobs);
    const known = new Set(window.ANIME_DATA.map(row => String(row.id)));
    for (const result of results) {
      if (result.status !== 'fulfilled' || !Array.isArray(result.value)) continue;
      for (const row of result.value) {
        if (!row || known.has(String(row.id))) continue;
        known.add(String(row.id));
        window.ANIME_DATA.push({...row, episodeLinks: row.episode_links || {}});
      }
    }
    return window.ANIME_DATA;
  }).catch(error => {
    console.warn('Related anime could not be loaded:', error);
    return window.ANIME_DATA;
  });
})();
