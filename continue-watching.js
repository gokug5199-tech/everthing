/* The Everything — PWA pair 02: private, recently opened episodes.
 * No playback timestamp / completion claim. RLS protects the activity table.
 */
(function () {
  'use strict';
  const root = document.querySelector('[data-continue-watching]');
  if (!root) return;
  const list = root.querySelector('[data-cw-list]');
  if (!list || !window.supabase?.createClient) return;
  const client = window.TEAnimeClient || (window.TEAnimeClient = window.supabase.createClient(
    'https://tnavsfbolastevebukxl.supabase.co',
    'sb_publishable_3FX_mPM-A6dIY-nQTtFZQg_5HPoWO9B'
  ));
  let currentUserId = null;
  let serial = 0;
  const hide = () => { root.hidden = true; list.replaceChildren(); };
  const text = (tag, cls, value) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (value != null) node.textContent = String(value);
    return node;
  };
  function safePoster(value) {
    if (!value) return '';
    try {
      const url = new URL(String(value), location.href);
      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch (_) { return ''; }
  }
  function validEpisode(row) {
    const season = Number(row.season_number);
    const episode = Number(row.episode_number);
    return row.anime_id != null && String(row.anime_id).length <= 240 &&
      Number.isInteger(season) && season >= 1 && season <= 100 &&
      Number.isInteger(episode) && episode >= 1 && episode <= 2000;
  }
  function render(items, titles) {
    const fragment = document.createDocumentFragment();
    for (const item of items) {
      const info = titles.get(String(item.anime_id)) || {};
      const href = 'episode-choice.html?anime=' + encodeURIComponent(item.anime_id) +
        '&season=' + Number(item.season_number) + '&episode=' + Number(item.episode_number);
      const card = text('a', 'te-cw-card');
      card.href = href;
      card.setAttribute('role', 'listitem');
      const visual = text('span', 'te-cw-image');
      const src = safePoster(info.image);
      if (src) {
        const img = document.createElement('img');
        img.src = src; img.loading = 'lazy'; img.decoding = 'async'; img.alt = '';
        visual.append(img);
      } else {
        visual.append(text('span', 'te-cw-placeholder', '▶'));
      }
      const copy = text('span', 'te-cw-copy');
      copy.append(text('strong', 'te-cw-anime-title', info.title || 'Anime'));
      copy.append(text('span', 'te-cw-episode', 'Season ' + item.season_number + ' · Episode ' + item.episode_number));
      copy.append(text('span', 'te-cw-cta', 'Open episode options →'));
      card.append(visual, copy);
      fragment.append(card);
    }
    list.replaceChildren(fragment);
    root.hidden = items.length === 0;
  }
  async function refresh() {
    const request = ++serial;
    hide();  // Always remove the previous user's cards before any account switch.
    try {
      const {data, error:sessionError} = await client.auth.getSession();
      if (sessionError) throw sessionError;
      if (request !== serial) return;
      const user = data?.session?.user || null;
      currentUserId = user?.id || null;
      if (!user) return;  // Anonymous browsing never sends a history query.
      // Bounded page, narrow columns: never retrieve all user activity or anime rows.
      const history = await client.from('user_episode_activity')
        .select('anime_id,season_number,episode_number,watched_at')
        .eq('user_id', user.id).not('watched_at', 'is', null)
        .order('watched_at', {ascending:false}).limit(60);
      if (request !== serial) return;
      if (history.error) throw history.error;
      const seen = new Set(), recent = [];
      for (const row of history.data || []) {
        if (!validEpisode(row)) continue;
        // One latest opened episode per anime, rather than flooding the rail
        // with multiple episodes of the same long-running series.
        const key = String(row.anime_id);
        if (seen.has(key)) continue;
        seen.add(key); recent.push(row);
        if (recent.length === 6) break;
      }
      if (!recent.length) return;
      const anime = await client.from('site_anime')
        .select('id,title,image').in('id', recent.map(row => row.anime_id));
      if (request !== serial) return;
      if (anime.error) throw anime.error;
      const titles = new Map((anime.data || []).map(a => [String(a.id), a]));
      render(recent, titles);
    } catch (error) {
      if (request !== serial) return;
      hide();
      console.warn('Continue Watching unavailable:', error);
      // Optional homepage rail must not block anime browsing or other content.
    }
  }
  client.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION') return;
    const next = session?.user?.id || null;
    if (next !== currentUserId) {
      currentUserId = next;
      ++serial; hide();
      // Defer auth API access outside Supabase auth callback.
      setTimeout(refresh, 0);
    }
  });
  window.TEContinueWatching = {refresh};
  window.addEventListener('pageshow', event => { if (event.persisted) refresh(); });
  refresh();
})();
