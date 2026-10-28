/* The Everything v25 — compact, horizontally navigable related works.
 * Only catalog records with verified local IDs open an anime detail page.
 * Unmatched entries open the internal search, never an external MAL page.
 */
(async () => {
  'use strict';
  function connectRail(rail, previous, next) {
    if (!rail || !previous || !next) return;
    const update = () => {
      const maximum = Math.max(0, rail.scrollWidth - rail.clientWidth);
      previous.disabled = rail.scrollLeft < 5 || maximum < 5;
      next.disabled = rail.scrollLeft >= maximum - 5 || maximum < 5;
    };
    const advance = direction => {
      const card = rail.querySelector('a');
      const width = card ? card.getBoundingClientRect().width + 12 : rail.clientWidth * 0.75;
      rail.scrollBy({left:direction * Math.max(180, width * 2),behavior:'smooth'});
    };
    previous.addEventListener('click',()=>advance(-1));
    next.addEventListener('click',()=>advance(1));
    rail.addEventListener('scroll',update,{passive:true});
    window.addEventListener('resize',update,{passive:true});
    if (typeof ResizeObserver !== 'undefined') {
      const observer=new ResizeObserver(update);observer.observe(rail);
    }
    update();
    return update;
  }
  const seriesRail=document.getElementById('relatedSeasons');
  const updateSeries=connectRail(seriesRail,document.getElementById('teSeriesPrev'),document.getElementById('teSeriesNext'));
  if (seriesRail && typeof MutationObserver!=='undefined') new MutationObserver(()=>updateSeries?.()).observe(seriesRail,{childList:true});
  if (!window.ANIME_READY) return;
  await window.ANIME_READY;
  await (window.ANIME_RELATIONS_READY || Promise.resolve());
  const catalog = Array.isArray(window.ANIME_DATA) ? window.ANIME_DATA : [];
  const requested = new URLSearchParams(location.search).get('id') || 'attack-on-titan';
  const current = catalog.find(row => String(row.id) === requested);
  if (!current) return;

  const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const malMap = new Map();
  const names = new Map();
  for (const anime of catalog) {
    if (Number(anime.mal_id) > 0) malMap.set(Number(anime.mal_id), anime);
    for (const value of [anime.title, anime.title_english, anime.title_japanese, ...(Array.isArray(anime.title_synonyms) ? anime.title_synonyms : [])]) {
      const key = normalize(value);
      if (key && !names.has(key)) names.set(key, anime);
    }
  }

  const relations = Array.isArray(current.mal_relations) ? current.mal_relations : [];
  const candidates = [];
  function include(relation, entry) {
    const malId = Number(entry?.mal_id);
    if (!Number.isSafeInteger(malId) || malId <= 0) return;
    const local = malMap.get(malId) || names.get(normalize(entry?.name));
    if (local && String(local.id) === String(current.id)) return;
    candidates.push({relation: String(relation || 'Related').trim() || 'Related',
      malId, name: String(entry?.name || local?.title || 'Related anime'), local});
  }
  for (const group of relations) {
    for (const entry of Array.isArray(group?.entries) ? group.entries : []) include(group.relation, entry);
  }
  const reversed = {sequel: 'Prequel', prequel: 'Sequel'};
  for (const other of catalog) {
    if (String(other.id) === String(current.id) || !Array.isArray(other.mal_relations)) continue;
    for (const group of other.mal_relations) for (const entry of Array.isArray(group.entries) ? group.entries : []) {
      const referencesCurrent = (Number(current.mal_id) > 0 && Number(entry.mal_id) === Number(current.mal_id)) ||
        (normalize(entry.name) && normalize(entry.name) === normalize(current.title));
      if (referencesCurrent) include(reversed[String(group.relation || '').toLowerCase()] || group.relation,
        {mal_id: other.mal_id, name: other.title});
    }
  }
  const deduped = new Map();
  for (const candidate of candidates) {
    const key = candidate.malId + '|' + candidate.relation.toLowerCase();
    if (!deduped.has(key) || (!deduped.get(key).local && candidate.local)) deduped.set(key, candidate);
  }
  const facts = document.getElementById('animeFacts');
  if (facts && current.anime_type) {
    const item = document.createElement('div'), label = document.createElement('small'), value = document.createElement('strong');
    label.textContent = 'ANIME FORMAT'; value.textContent = String(current.anime_type);
    item.append(label, value); facts.append(item);
  }
  if (!deduped.size) return;

  const order = ['Prequel','Sequel','Side story','Spin-off','Special','OVA','Alternative version','Alternative setting','Remake','Summary','Full story','Parent story','Adaptation','Other'];
  const index = text => {const i = order.findIndex(k => k.toLowerCase() === text.toLowerCase()); return i < 0 ? 100 : i;};
  const entries = [...deduped.values()].sort((a,b) => index(a.relation)-index(b.relation) || a.relation.localeCompare(b.relation) ||
    String(a.local?.start_date||'').localeCompare(String(b.local?.start_date||'')) || a.name.localeCompare(b.name));
  const section = document.createElement('section');
  section.className = 'te-rel-v16 detail-features'; section.id = 'teAnimeRelations';
  const heading = document.createElement('div');heading.className='te-rel-heading';
  const headCopy = document.createElement('div');
  const title = document.createElement('h2'); title.textContent = 'Related Anime & Adaptations';
  const subtitle = document.createElement('p'); subtitle.textContent = 'Prequels, sequels, side stories, remakes and more.';
  headCopy.append(title,subtitle);
  const actions = document.createElement('div'); actions.className='te-rail-buttons';
  const prev = document.createElement('button');prev.type='button';prev.textContent='←';prev.setAttribute('aria-label','Previous related anime');
  const next = document.createElement('button');next.type='button';next.textContent='→';next.setAttribute('aria-label','Next related anime');
  actions.append(prev,next);heading.append(headCopy,actions);
  const content = document.createElement('div');content.className='te-rel-list';
  content.tabIndex=0;content.setAttribute('aria-label','Related anime, scroll horizontally');
  section.append(heading,content);
  const safeImage = value => {
    try {const url = new URL(String(value || ''), location.href); return ['https:', 'http:'].includes(url.protocol) ? url.href : '';} catch {return '';}
  };
  const API = 'https://tnavsfbolastevebukxl.supabase.co/rest/v1/site_anime';
  const KEY = 'sb_publishable_3FX_mPM-A6dIY-nQTtFZQg_5HPoWO9B';
  async function lookup(malId) {
    const query = new URLSearchParams({select:'id',mal_id:'eq.'+String(malId),limit:'1'});
    const response = await fetch(API + '?' + query, {headers:{apikey:KEY},signal:AbortSignal.timeout(7000)});
    if (!response.ok) return null;
    const rows = await response.json();
    return Array.isArray(rows) && rows[0]?.id ? rows[0].id : null;
  }
  for (const entry of entries) {
      const link = document.createElement('a');
      link.className = 'te-rel-card ' + (entry.local ? 'te-rel-available' : 'te-rel-search');
      const query = entry.name.trim();
      link.href = entry.local ? 'anime-details.html?id=' + encodeURIComponent(entry.local.id) :
        'anime.html?search=' + encodeURIComponent(query);
      if (!entry.local) {
        link.setAttribute('aria-label','Find '+query+' in The Everything');
        link.addEventListener('click', async event => {
          if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          const fallback = link.href;
          link.classList.add('te-rel-resolving');
          try {
            const id = await lookup(entry.malId);
            location.assign(id ? 'anime-details.html?id='+encodeURIComponent(id) : fallback);
          } catch (_) { location.assign(fallback); }
        });
      }
      const image = safeImage(entry.local?.image);
      if (image) {
        const img = document.createElement('img'); img.loading='lazy'; img.decoding='async'; img.src=image; img.alt='';
        img.onerror = () => {img.replaceWith(makePlaceholder());}; link.append(img);
      } else link.append(makePlaceholder());
      const body = document.createElement('span'); body.className='te-rel-copy';
      const kind=document.createElement('span');kind.className='te-rel-kind';kind.textContent=entry.relation;
      const name = document.createElement('strong');name.textContent=entry.local?.title || entry.name;
      const caption = document.createElement('small');
      caption.textContent=entry.local ? (String(entry.local.anime_type || 'Anime')+' · In library') : 'Find in The Everything';
      body.append(kind,name,caption);link.append(body);content.append(link);
  }
  connectRail(content,prev,next);
  const previous = document.getElementById('relatedSection');
  if (previous) previous.insertAdjacentElement('afterend',section);
  else document.querySelector('.episodes-section')?.insertAdjacentElement('beforebegin',section);
  function makePlaceholder() {
    const placeholder = document.createElement('span'); placeholder.className='te-rel-placeholder';
    placeholder.textContent='✦';placeholder.setAttribute('aria-hidden','true');return placeholder;
  }
})();
