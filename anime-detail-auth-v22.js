/* The Everything v22 — authenticated library loads separately from anime details. */
(function () {
  'use strict';
  const target = document.getElementById('animeSaveActions');
  const errorBox = document.getElementById('libraryError');
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(Error('Script unavailable: ' + src));
      document.body.append(script);
    });
  }
  (async () => {
    try {
      // An unreliable external CDN must never prevent poster, characters, or episode loading.
      if (!window.supabase) await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
      if (!window.AnimeLibrary) await loadScript('anime-library.js?v=library1');
      await window.ANIME_READY;
      const id = new URLSearchParams(location.search).get('id') || 'attack-on-titan';
      const anime = (window.ANIME_DATA || []).find(a => String(a.id) === String(id));
      if (!anime || !target) return;
      target.append(window.AnimeLibrary.controls(anime.id));
      function syncError() {
        if (!errorBox) return;
        const state = window.AnimeLibrary.state();
        errorBox.hidden = !state.error;
        errorBox.textContent = state.error || '';
      }
      window.AnimeLibrary.subscribe(syncError);
      syncError();
    } catch (err) {
      console.warn('Anime library controls unavailable:', err);
      // Preserve the rest of the page when a login dependency cannot load.
      if (target) {
        const link = document.createElement('a');
        link.href = 'login.html';
        link.textContent = 'Log in to save this anime';
        link.className = 'library-login';
        target.replaceChildren(link);
      }
    }
  })();
})();
