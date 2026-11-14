/* The Everything — user-only anime library. Fetch only the user's saved anime. */
(function () {
  'use strict';
  const client = window.TEAnimeClient || (window.TEAnimeClient = window.supabase.createClient(
    'https://tnavsfbolastevebukxl.supabase.co',
    'sb_publishable_3FX_mPM-A6dIY-nQTtFZQg_5HPoWO9B'
  ));
  const labels = {none:'Not on my list', planned:'Plan to Watch', watching:'Watching', completed:'Completed', paused:'Paused', dropped:'Dropped'};
  const el = (tag, cls, content) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (content !== undefined) node.textContent = content;
    return node;
  };
  function safeImage(src) {
    if (!src) return '';
    try {
      const url = new URL(src, location.href);
      return (['https:', 'http:'].includes(url.protocol) ||
        (url.protocol === 'file:' && location.protocol === 'file:' && !/^[a-z][a-z0-9+.-]*:/i.test(src)))
        ? url.href : '';
    } catch (_) { return ''; }
  }
  let user = null;
  let rows = new Map();
  let catalog = new Map();
  let ready = false;
  let catalogLoading = false;
  let error = '';
  let catalogError = '';
  let locked = false;
  let version = 0;
  let authId = null;
  const listeners = new Set();
  const notify = () => [...listeners].forEach(fn => fn());
  const SIGN_IN_AGAIN = 'Your session has expired. Please log in again to save your anime.';
  let authNeedsLogin = false;
  let renewal = null;
  function jwtExpired(err) {
    const message = String(err?.message || '');
    const code = String(err?.code || '');
    return /PGRST301/i.test(code) || /\bJWT\b.{0,80}\bexpired\b|\bexpired\b.{0,80}\bJWT\b|\b(?:access )?token (?:has )?expired\b/i.test(message);
  }
  function loginExpired(err) {
    return jwtExpired(err) || /refresh.token.{0,60}(?:not found|invalid|expired)|invalid.refresh.token/i.test(String(err?.message || '')) ||
      String(err?.code || '') === 'AUTH_EXPIRED';
  }
  function expiredError() {
    const err = new Error(SIGN_IN_AGAIN);
    err.code = 'AUTH_EXPIRED';
    return err;
  }
  async function renewSession(owner) {
    // Supabase normally renews tokens automatically; this is a one-time recovery
    // for a stale JWT returned by a query after a long-idle browser/PWA tab.
    // Deduplicate concurrent recoveries so two queries do not rotate the same refresh token.
    if (!renewal) {
      renewal = Promise.resolve().then(() => client.auth.refreshSession())
        .finally(() => { renewal = null; });
    }
    let result;
    try { result = await renewal; } catch (_) { result = null; }
    if (result?.error || !result?.data?.session?.user ||
        (owner && result.data.session.user.id !== owner)) {
      authNeedsLogin = true;
      notify();
      throw expiredError();
    }
    authNeedsLogin = false;
    return result.data.session;
  }
  async function queryWithAuthRetry(query, owner) {
    let result = await query();
    if (result?.error && jwtExpired(result.error)) {
      await renewSession(owner);
      result = await query(); // Retry only once; upsert/delete are idempotent by anime key.
    }
    return result;
  }
  async function requireCurrentSession(owner) {
    let result = await client.auth.getSession();
    if (result.error && jwtExpired(result.error)) {
      await renewSession(owner);
      result = await client.auth.getSession();
    }
    if (result.error) throw result.error;
    const session = result.data?.session;
    if (!session?.user || session.user.id !== owner) {
      authNeedsLogin = true;
      notify();
      throw expiredError();
    }
    // getSession normally handles expiration; cover SDK/browser clock edge cases.
    if (session.expires_at && session.expires_at <= Math.floor(Date.now() / 1000) + 5) {
      await renewSession(owner);
    }
  }
  function friendly(err) {
    if (loginExpired(err)) return SIGN_IN_AGAIN;
    if (String(err?.code || '') === '23514' && /watch_status|user_anime_library/i.test(String(err?.message || ''))) {
      return 'New watch statuses need the Supabase PAIR02 SQL update. No changes were saved.';
    }
    return /42P01|PGRST205/.test(err?.code || '')
      ? 'Your anime library is not available yet. Please try again later.'
      : (err?.message || 'Could not connect. Please try again.');
  }
  async function fetchLibrary(owner, ticket) {
    const next = new Map();
    for (let offset = 0; ; offset += 500) {
      const result = await queryWithAuthRetry(() => client.from('user_anime_library')
        .select('anime_id,user_id,watch_status,is_favorite,updated_at')
        .eq('user_id', owner).order('anime_id').range(offset, offset + 499), owner);
      if (result.error) throw result.error;
      if (ticket !== version) return null;
      const batch = result.data || [];
      batch.forEach(record => next.set(String(record.anime_id), record));
      if (batch.length < 500) break;
    }
    return next;
  }
  async function fetchSavedAnime(ids, ticket) {
    const next = new Map();
    // Short IN lists avoid URL-length limits; unlike anime-data.js this does
    // not retrieve the public catalog or large episode/character JSON fields.
    for (let i = 0; i < ids.length; i += 50) {
      const result = await queryWithAuthRetry(() => client.from('site_anime')
        .select('id,title,image').in('id', ids.slice(i, i + 50)), user?.id);
      if (result.error) throw result.error;
      if (ticket !== version) return null;
      (result.data || []).forEach(anime => next.set(String(anime.id), anime));
    }
    return next;
  }
  async function refresh() {
    const ticket = ++version;
    user = null;
    ready = false;
    catalogLoading = false;
    rows = new Map();
    catalog = new Map();
    error = '';
    catalogError = '';
    authNeedsLogin = false;
    notify();
    try {
      let session = await client.auth.getSession();
      if (session.error && jwtExpired(session.error)) {
        await renewSession();
        session = await client.auth.getSession();
      }
      if (session.error) throw session.error;
      if (ticket !== version) return;
      user = session.data.session?.user || null;
      authId = user?.id || null;
      if (!user) return;
      const next = await fetchLibrary(user.id, ticket);
      if (ticket !== version || !next) return;
      rows = next;
      catalogLoading = next.size > 0;
      ready = true;
      notify(); // Counts and tabs are ready before poster details finish.
      if (catalogLoading) {
        try {
          const details = await fetchSavedAnime([...next.keys()], ticket);
          if (ticket !== version) return;
          if (details) catalog = details;
        } catch (detailError) {
          if (ticket !== version) return;
          catalogError = friendly(detailError);
          console.warn('Saved anime details unavailable:', detailError);
        } finally {
          if (ticket === version) catalogLoading = false;
        }
      }
    } catch (err) {
      if (ticket !== version) return;
      error = friendly(err);
      if (loginExpired(err)) authNeedsLogin = true;
      console.error('Anime library failed:', err);
    } finally {
      if (ticket === version) { ready = true; notify(); }
    }
  }
  async function change(id, patch) {
    if (locked) return;
    if (!user) throw Error('Please log in to save your anime.');
    if (!ready || error) throw Error(error || 'Please wait for your library to load.');
    const key = String(id);
    const old = rows.get(key) || {watch_status:'none',is_favorite:false};
    const value = {
      user_id:user.id, anime_id:id,
      watch_status:patch.watch_status ?? old.watch_status,
      is_favorite:patch.is_favorite ?? old.is_favorite,
      updated_at:new Date().toISOString()
    };
    if (!Object.hasOwn(labels, value.watch_status)) throw Error('Invalid watch status.');
    locked = true;
    notify();
    const ticket = version;
    try {
      await requireCurrentSession(value.user_id);
      if (value.watch_status === 'none' && !value.is_favorite) {
        const result = await queryWithAuthRetry(() => client.from('user_anime_library').delete()
          .eq('user_id', value.user_id).eq('anime_id', id), value.user_id);
        if (result.error) throw result.error;
        if (ticket === version) rows.delete(key);
      } else {
        const result = await queryWithAuthRetry(() => client.from('user_anime_library')
          .upsert(value, {onConflict:'user_id,anime_id'}).select().single(), value.user_id);
        if (result.error) throw result.error;
        if (ticket === version) rows.set(key, result.data);
      }
    } catch (err) {
      if (loginExpired(err)) { authNeedsLogin = true; notify(); }
      throw err;
    } finally { locked = false; notify(); }
  }
  function controls(id) {
    const box = el('div', 'library-actions');
    const select = el('select');
    select.setAttribute('aria-label', 'Watch status');
    Object.entries(labels).forEach(([code, name]) => {
      const option = el('option', '', name); option.value = code; select.append(option);
    });
    const heart = el('button', 'library-heart');
    heart.type = 'button';
    const status = el('span', 'library-action-message');
    status.setAttribute('role', 'status');
    const login = el('a', 'library-login', 'Log in to save'); login.href = 'login.html';
    const draw = () => {
      const record = rows.get(String(id));
      select.value = record?.watch_status || 'none';
      heart.textContent = record?.is_favorite ? '♥ Favorite' : '♡ Favorite';
      heart.setAttribute('aria-pressed', String(!!record?.is_favorite));
      select.disabled = heart.disabled = locked || !ready || !user || !!error || authNeedsLogin;
      login.hidden = !!user && !authNeedsLogin;
      login.textContent = authNeedsLogin ? 'Log in again' : 'Log in to save';
    };
    draw();
    listeners.add(draw);
    box.dispose = () => listeners.delete(draw);
    async function act(patch) {
      status.textContent = 'Saving…';
      try { await change(id, patch); status.textContent = 'Saved'; }
      catch (err) { status.textContent = friendly(err); draw(); }
    }
    select.onchange = () => act({watch_status:select.value});
    heart.onclick = () => act({is_favorite:!rows.get(String(id))?.is_favorite});
    box.append(select, heart, login, status);
    return box;
  }
  function mount(root) {
    const pageSize = root.closest('#animeCollection') ? 6 : 24;
    let filter = 'all', term = '', sort = 'recent', limit = pageSize, disposers = [];
    root.classList.add('anime-library');
    const toolbar = el('div', 'library-toolbar');
    const tabs = el('div', 'library-tabs'); tabs.setAttribute('aria-label', 'Filter anime library');
    const search = el('input'); search.type = 'search';
    search.placeholder = 'Search your anime'; search.setAttribute('aria-label', 'Search your anime');
    const order = el('select'); order.setAttribute('aria-label', 'Sort anime');
    [['recent','Recently updated'],['title','Title A–Z']].forEach(([code, title]) => {
      const option = el('option', '', title); option.value = code; order.append(option);
    });
    const note = el('p', 'library-note'); note.setAttribute('role', 'status');
    const grid = el('div', 'library-grid');
    const more = el('button', 'library-more', 'Show more'); more.type = 'button';
    const retry = el('button', 'library-more', 'Retry'); retry.type = 'button'; retry.onclick = refresh;
    toolbar.append(search, order);
    root.replaceChildren(tabs, toolbar, note, retry, grid, more);
    const filters = [['all','All'],['favorites','Favorites'],['planned','Plan to Watch'],['watching','Watching'],['completed','Completed'],['paused','Paused'],['dropped','Dropped']];
    const matches = (record, code) => code === 'all' ||
      (code === 'favorites' ? record.is_favorite : record.watch_status === code);
    function draw() {
      disposers.forEach(dispose => dispose()); disposers = [];
      tabs.replaceChildren(); grid.replaceChildren();
      const items = [...rows.entries()]
        .filter(([,record]) => record.watch_status !== 'none' || record.is_favorite)
        .map(([id,record]) => ({id, record, anime:catalog.get(id)}));
      for (const [code, label] of filters) {
        const button = el('button', '', `${label} · ${items.filter(item => matches(item.record, code)).length}`);
        button.type = 'button'; button.setAttribute('aria-pressed', String(filter === code));
        button.onclick = () => { filter = code; limit = pageSize; draw(); };
        tabs.append(button);
      }
      const counts = {
        total: items.length,
        completed: items.filter(item => item.record.watch_status === 'completed').length,
        favorites: items.filter(item => item.record.is_favorite).length,
        watching: items.filter(item => item.record.watch_status === 'watching').length,
        planned: items.filter(item => item.record.watch_status === 'planned').length,
        paused: items.filter(item => item.record.watch_status === 'paused').length,
        dropped: items.filter(item => item.record.watch_status === 'dropped').length
      };
      const total = document.getElementById('libraryCount');
      if (total) total.textContent = String(counts.total);
      const done = document.getElementById('completedAnimeCount');
      if (done) done.textContent = String(counts.completed);
      const favoritesTotal = document.getElementById('favoriteAnimeCount');
      if (favoritesTotal) favoritesTotal.textContent = String(counts.favorites);
      const favoritesMirror = document.getElementById('favoriteAnimeCountMirror');
      if (favoritesMirror) favoritesMirror.textContent = String(counts.favorites);
      const watching = document.getElementById('watchingAnimeCount');
      if (watching) watching.textContent = String(counts.watching);
      const watchingMirror = document.getElementById('watchingAnimeCountMirror');
      if (watchingMirror) watchingMirror.textContent = String(counts.watching);
      const doneMirror = document.getElementById('completedAnimeCountMirror');
      if (doneMirror) doneMirror.textContent = String(counts.completed);
      const planned = document.getElementById('plannedAnimeCount');
      if (planned) planned.textContent = String(counts.planned);
      const paused = document.getElementById('pausedAnimeCount');
      if (paused) paused.textContent = String(counts.paused);
      const dropped = document.getElementById('droppedAnimeCount');
      if (dropped) dropped.textContent = String(counts.dropped);
      retry.hidden = !(error || catalogError);
      more.hidden = true;
      if (!ready) { note.textContent = 'Loading your anime library…'; return; }
      if (error) { note.textContent = error; return; }
      if (!user) {
        note.replaceChildren(el('span', '', 'Log in to keep your anime in one place. '));
        const link = el('a', '', 'Log in'); link.href = 'login.html'; note.append(link); return;
      }
      if (catalogLoading) { note.textContent = 'Loading your saved anime…'; return; }
      const visible = items.filter(item => matches(item.record, filter) &&
        String(item.anime?.title || ('Anime ' + item.id)).toLowerCase().includes(term.toLowerCase()))
        .sort((a,b) => sort === 'title'
          ? String(a.anime?.title || '').localeCompare(String(b.anime?.title || ''))
          : String(b.record.updated_at || '').localeCompare(String(a.record.updated_at || '')));
      note.textContent = catalogError
        ? `Some anime details are unavailable. ${catalogError}`
        : visible.length ? `${visible.length} anime · Your list is private to your account.`
          : 'Nothing here yet. Add anime from its details page.';
      for (const item of visible.slice(0, limit)) {
        const anime = item.anime || {id:item.id,title:'Anime ' + item.id,image:''};
        const card = el('article', 'library-card');
        const link = el('a', 'library-poster');
        link.href = 'anime-details.html?id=' + encodeURIComponent(item.id);
        const image = el('img');
        const src = safeImage(anime.image);
        if (src) image.src = src;
        image.alt = anime.title; image.loading = 'lazy'; image.decoding = 'async';
        link.append(image);
        const title = el('a', 'library-title', anime.title); title.href = link.href;
        const actions = controls(item.id); disposers.push(actions.dispose);
        const currentStatus = String(item.record.watch_status || 'none');
        const badge = currentStatus !== 'none' && Object.hasOwn(labels, currentStatus)
          ? el('span', 'library-status-badge library-status-' + currentStatus, labels[currentStatus]) : null;
        card.append(link, title);
        if (badge) card.append(badge);
        card.append(actions); grid.append(card);
      }
      more.hidden = visible.length <= limit;
    }
    search.oninput = () => { term = search.value; limit = pageSize; draw(); };
    order.onchange = () => { sort = order.value; draw(); };
    more.onclick = () => { limit += pageSize; draw(); };
    listeners.add(draw);
    draw();
  }
  window.AnimeLibrary = {
    client, controls, mount, refresh, change, safeImage,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    state: () => ({user,ready,error,catalogLoading,catalogError,authNeedsLogin})
  };
  client.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION') return; // Explicit initial refresh below.
    const id = session?.user?.id || null;
    if (id !== authId || (authNeedsLogin && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && id)) {
      authId = id;
      setTimeout(refresh, 0);
    }
  });
  const root = document.querySelector('[data-anime-library]');
  if (root) mount(root);
  refresh();
})();
