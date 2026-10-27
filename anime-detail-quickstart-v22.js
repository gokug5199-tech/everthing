/* The Everything v22 — instant details preview while authoritative data loads. */
(function () {
  'use strict';
  const id = new URLSearchParams(location.search).get('id') || 'attack-on-titan';
  const status = document.getElementById('animeLoadStatus');
  const key = 'te-anime-preview-v22';
  let preview = null;
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (saved && String(saved.id) === String(id) && Number.isFinite(saved.at)
        && Date.now() - saved.at < 10 * 60 * 1000) preview = saved;
  } catch (_) { /* session storage might be disabled */ }
  if (preview) {
    document.getElementById('animeTitle').textContent = preview.title || 'Anime';
    document.title = (preview.title || 'Anime') + ' | The Everything';
    const image = document.getElementById('animePoster');
    try {
      const url = new URL(String(preview.image || ''), location.href);
      if (url.protocol === 'https:' || url.protocol === 'http:') image.src = url.href;
    } catch (_) {}
    document.getElementById('animeGenres').textContent = Array.isArray(preview.genres) ? preview.genres.join(' • ') : '';
    document.getElementById('animeRating').textContent = '★ ' + (preview.rating || '-');
  }
  if (status) status.textContent = preview ? 'Loading more information…' : 'Loading anime details…';
  const started = performance.now();
  window.TE_DETAIL_TIMING = { started };
  setTimeout(() => {
    if (status && !status.hidden && !window.TE_DETAIL_TIMING?.loaded) {
      status.textContent = 'Taking longer than expected to connect. Checking the anime database…';
    }
  }, 4500);
})();
