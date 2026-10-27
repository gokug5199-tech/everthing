/* The Everything v20 - Real server-side catalog pagination.
   Only the visible page is retrieved from Supabase (no select=* catalog preload).
   Changes are intentionally isolated to anime.html / anime.js / anime.css. */
(function () {
'use strict';
const grid = document.getElementById('animeGrid');
if (!grid) return;
const searchInput = document.getElementById('animeSearch');
const genresToggle = document.getElementById('genresToggle');
const genreMenu = document.getElementById('genreMenu');
const genreList = document.getElementById('genreList');
const genresBackdrop = document.getElementById('genresBackdrop');
const quickGenres = document.getElementById('teQuickGenres');
const sortInput = document.getElementById('teAnimeSort');
const resultsText = document.getElementById('teAnimeResults');
const searchClear = document.getElementById('teSearchClear');
const allGenresButton = document.getElementById('teMoreGenres');
const resetButton = document.getElementById('teClearFilters');
const API = 'https://tnavsfbolastevebukxl.supabase.co/rest/v1/site_anime';
const KEY = 'sb_publishable_3FX_mPM-A6dIY-nQTtFZQg_5HPoWO9B';
const PAGE_SIZE = 48;
    const genreCatalog = [
        "Action",
        "Adventure",
        "Comedy",
        "Drama",
        "Ecchi",
        "Fantasy",
        "Horror",
        "Mystery",
        "Psychological",
        "Romance",
        "Sci-Fi",
        "Slice of Life",
        "Sports",
        "Supernatural",
        "Thriller",
        "Suspense",
        "Historical",
        "Isekai",
        "Magic",
        "Martial Arts",
        "Mecha",
        "Military",
        "Music",
        "School",
        "Samurai",
        "Space",
        "Super Power",
        "Vampire",
        "Demons",
        "Game",
        "Harem",
        "Parody",
        "Shounen",
        "Shoujo",
        "Seinen",
        "Josei",
        "Kids",
        "Avant Garde",
        "Award Winning",
        "Boys Love",
        "Girls Love",
        "Gourmet",
        "Adult Cast",
        "Anthropomorphic",
        "CGDCT",
        "Childcare",
        "Combat Sports",
        "Crossdressing",
        "Delinquents",
        "Detective",
        "Educational",
        "Gag Humor",
        "Gore",
        "High Stakes Game",
        "Idols",
        "Iyashikei",
        "Love Polygon",
        "Magical Girl",
        "Medical",
        "Mythology",
        "Organized Crime",
        "Otaku Culture",
        "Performing Arts",
        "Pets",
        "Racing",
        "Reincarnation",
        "Reverse Harem",
        "Romantic Subtext",
        "Showbiz",
        "Strategy Game",
        "Survival",
        "Team Sports",
        "Time Travel",
        "Video Game",
        "Visual Arts",
        "Workplace"
    ];
let selectedCategory = 'all';
let currentPage = 1;
let total = 0;
let activeController = null;
let requestSerial = 0;
let menuOpen = false;
let searchTimer;
const cache = new Map(); // Only retain recently visited pages, not all anime.
window.ANIME_DATA = []; // For existing hero fallbacks; only the first page is exposed.
window.ANIME_LOAD_ERROR = false;

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;')
    .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}
function norm(value) {
  return String(value||'').trim().toLowerCase().replace(/&/g,'and')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}
// PostgREST accepts array containment and OR expressions.
// Reject expression punctuation in user input, and URL-encode the entire query.
function safeTerm(value) {
  return String(value||'').trim().replace(/[(),.\\"%*{}]/g,' ').replace(/\s+/g,' ').slice(0,90).trim();
}
function genreExpression(label) {
  // Postgres text[] array literal, quoted to support genres containing spaces.
  const value = String(label).replace(/[\\"{}]/g,'');
  return 'genres.cs.{"' + value + '"}';
}
function searchExpression(term) {
  const like = '*'+term.replace(/\s+/g,'*')+'*';
  const terms = ['title.ilike.'+like, 'category.ilike.'+like];
  // Exact genre lookup is included so searches such as "Romance" match genre tags.
  const knownGenre = genreCatalog.find(label => norm(label)===norm(term));
  if (knownGenre) terms.push(genreExpression(knownGenre));
  return 'or(' + terms.join(',') + ')';
}
function genreFilterExpression(label) {
  return 'or(' + genreExpression(label) + ',category.ilike.' + label.replace(/[^a-z\d\- ]/gi,'') + ')';
}
function buildQuery() {
  const p = new URLSearchParams();
  p.set('select','id,title,image,genres,age_rating,rating,created_at');
  const sorting = sortInput?.value || 'newest';
  const order = {newest:'created_at.desc,id.asc',az:'title.asc,id.asc',za:'title.desc,id.asc',rating:'rating.desc,id.asc'};
  p.set('order',order[sorting]||order.newest);
  p.set('limit',String(PAGE_SIZE));
  p.set('offset',String((currentPage-1)*PAGE_SIZE));
  const filters = [];
  if (selectedCategory !== 'all') {
    const label = genreCatalog.find(x=>norm(x)===selectedCategory);
    if (label) filters.push(genreFilterExpression(label));
  }
  const term = safeTerm(searchInput?.value);
  if (term) filters.push(searchExpression(term));
  if (filters.length===1) p.set('and','(' + filters[0] + ')');
  else if (filters.length>1) p.set('and','(' + filters.join(',') + ')');
  return p.toString();
}
function buildGenreMenu() {
  if (!genreList) return;
  const items = [{key:'all',label:'All Anime'}].concat(genreCatalog.map(label=>({key:norm(label),label})));
  genreList.innerHTML=items.map(item=>`<button class="category${item.key===selectedCategory?' active':''}" type="button" data-category="${escapeHtml(item.key)}" aria-pressed="${item.key===selectedCategory}"><span class="genre-item-icon" aria-hidden="true"></span><span class="genre-item-label">${escapeHtml(item.label)}</span></button>`).join('');
}
function syncQuickGenres() {
  quickGenres?.querySelectorAll('[data-quick-genre]').forEach(btn=>{
    const selected=btn.dataset.quickGenre===selectedCategory;
    btn.classList.toggle('active',selected);
    btn.setAttribute('aria-pressed',String(selected));
  });
}
function buildQuickGenres() {
  if(!quickGenres)return;
  const preferred=['Action','Romance','Fantasy','Adventure','Comedy','Drama','Isekai','School'];
  quickGenres.replaceChildren(...[{key:'all',label:'All anime'}].concat(preferred.map(label=>({key:norm(label),label}))).map(item=>{
    const button=document.createElement('button');button.type='button';
    button.dataset.quickGenre=item.key;button.textContent=item.label;
    return button;
  }));
  syncQuickGenres();
}
function setGenreMenu(open) {
  menuOpen=Boolean(open);
  if(!genreMenu||!genresToggle)return;
  genreMenu.classList.toggle('is-open',menuOpen);
  genreMenu.setAttribute('aria-hidden',String(!menuOpen));
  genresToggle.classList.toggle('is-open',menuOpen);
  genresToggle.setAttribute('aria-expanded',String(menuOpen));
  genresToggle.setAttribute('aria-label',menuOpen?'Close anime genres':'Open anime genres');
  document.body.classList.toggle('genre-drawer-open',menuOpen);
  allGenresButton?.setAttribute('aria-expanded',String(menuOpen));
  genresBackdrop?.classList.toggle('is-open',menuOpen);
  genresBackdrop?.setAttribute('aria-hidden',String(!menuOpen));
}
function selectGenre(key) {
  selectedCategory=key;
  genreList?.querySelectorAll('[data-category]').forEach(btn=>{
    const active=btn.dataset.category===key;
    btn.classList.toggle('active',active);
    btn.setAttribute('aria-pressed',String(active));
  });
  syncQuickGenres();
  setGenreMenu(false);
  currentPage=1;
  loadPage();
}
function cardHtml(anime,index) {
  const genres=Array.isArray(anime.genres)?anime.genres:[];
  const title=escapeHtml(anime.title||'Anime');
  const image=escapeHtml(anime.image||'');
  const rating=escapeHtml(anime.age_rating||'Not rated');
  const id=encodeURIComponent(anime.id||'');
  const load=index<6?'eager':'lazy';
  return `<a href="anime-details.html?id=${id}" class="anime-card-link"><article class="anime-card"><div class="poster"><img src="${image}" alt="${title}" loading="${load}" decoding="async" onerror="this.style.opacity='0.15'"><div class="rating age-classification" aria-label="Age rating: ${rating}">${rating}</div><div class="card-overlay"><span class="view-details">View Episodes</span></div></div><div class="anime-info"><h3>${title}</h3><p>${escapeHtml(genres.join(' • '))}</p></div></article></a>`;
}
// On navigation, save only the public card summary (not accounts or private data).
// The detail page paints this instantly while waiting for the full authoritative row.
grid.addEventListener('click', event => {
  const link = event.target.closest('a.anime-card-link');
  if (!link || !grid.contains(link)) return;
  const id = new URL(link.href, location.href).searchParams.get('id');
  const row = lastPageRows.find(item => String(item.id) === String(id));
  if (!row) return;
  try {
    sessionStorage.setItem('te-anime-preview-v22', JSON.stringify({
      id: row.id, title: row.title, image: row.image,
      genres: row.genres, rating: row.rating, at: Date.now()
    }));
  } catch (_) {}
});
// Fast intentional navigation: after a short hover/focus, warm ONE full record.
// This never downloads the entire catalog and never prefetches on scroll.
let intentTimer = null;
let intentLink = null;
const prefetching = new Set();
function warmAnime(id) {
  if (!id || prefetching.has(id)) return;
  prefetching.add(id);
  const query = new URLSearchParams({select:'*',id:'eq.'+id,limit:'1'});
  fetch(API+'?'+query, {headers:{apikey:KEY},signal:AbortSignal.timeout(10000)})
    .then(response => response.ok ? response.json() : [])
    .then(rows => {
      if (!rows?.[0] || String(rows[0].id) !== String(id)) return;
      const value = JSON.stringify({id, at:Date.now(), anime:rows[0]});
      if (value.length > 280000) return; // Bounded tab-only cache.
      try { sessionStorage.setItem('te-anime-full-v22',value); } catch (_) {}
    }).catch(()=>{}).finally(()=>prefetching.delete(id));
}
function warmForLink(link) {
  if (!link) return;
  const id = new URL(link.href,location.href).searchParams.get('id');
  if (id) warmAnime(id);
}
grid.addEventListener('pointerover', event => {
  if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
  const link=event.target.closest('a.anime-card-link');
  if(!link || !grid.contains(link) || link === intentLink) return;
  clearTimeout(intentTimer);
  intentLink=link;
  intentTimer=setTimeout(()=>warmForLink(link),250);
});
grid.addEventListener('pointerout', event=>{
  if (intentLink && (event.target === intentLink || intentLink.contains(event.target)) &&
      (!event.relatedTarget || !intentLink.contains(event.relatedTarget))) {
    clearTimeout(intentTimer); intentLink=null;
  }
});
grid.addEventListener('focusin', event => {
  const link=event.target.closest('a.anime-card-link');
  if(link && grid.contains(link)) warmForLink(link);
});
const pagination=document.createElement('nav');
pagination.className='te-anime-pagination';pagination.id='teAnimePagination';
pagination.setAttribute('aria-label','Anime collection pages');
grid.insertAdjacentElement('afterend',pagination);
const message=document.createElement('p');
message.id='animeEmptyState';message.className='anime-empty-state';
message.setAttribute('role','status');message.hidden=true;
pagination.insertAdjacentElement('afterend',message);
function button(label,page,disabled,current) {
  const el=document.createElement('button');el.type='button';el.textContent=label;
  el.disabled=Boolean(disabled);el.setAttribute('aria-label',label==='Previous'?'Previous page':label==='Next'?'Next page':`Page ${page}`);
  if(current){el.className='active';el.setAttribute('aria-current','page');}
  el.addEventListener('click',()=>{
    if(currentPage===page)return;
    currentPage=page;
    loadPage();
    document.getElementById('v6CollectionTitle')?.scrollIntoView({block:'start',behavior:'auto'});
  });
  return el;
}
function drawPagination() {
  const pages=Math.max(1,Math.ceil(total/PAGE_SIZE));
  pagination.replaceChildren();
  pagination.hidden=pages<=1;
  if(pages<=1)return;
  pagination.append(button('Previous',Math.max(1,currentPage-1),currentPage===1));
  const wanted=new Set([1,pages]);
  for(let i=Math.max(1,currentPage-2);i<=Math.min(pages,currentPage+2);i++)wanted.add(i);
  let last=0;
  for(const page of [...wanted].sort((a,b)=>a-b)){
    if(last&&page>last+1){const dots=document.createElement('span');dots.textContent='…';dots.className='te-pagination-ellipsis';pagination.append(dots);}
    pagination.append(button(String(page),page,false,page===currentPage));last=page;
  }
  pagination.append(button('Next',Math.min(pages,currentPage+1),currentPage===pages));
  const meta=document.createElement('span');meta.className='te-pagination-caption';
  meta.textContent=`Page ${currentPage} of ${pages}`;pagination.append(meta);
}
function showError(text) {
  grid.replaceChildren();pagination.hidden=true;message.hidden=false;
  message.replaceChildren();
  const textNode=document.createElement('span');textNode.textContent=text;
  const retry=document.createElement('button');retry.type='button';retry.textContent='Retry';
  retry.className='te-anime-retry';retry.addEventListener('click',()=>loadPage());
  message.append(textNode,retry);
}
let lastPageRows = [];
function applyResult(rows,count) {
  lastPageRows = rows;
  total=count;
  grid.innerHTML=rows.map(cardHtml).join('');
  message.hidden=rows.length>0;
  if(!rows.length){message.textContent='No anime matched your search.';}
  if(resultsText)resultsText.textContent=total
    ? `${total} anime found · Showing ${(currentPage-1)*PAGE_SIZE+1}–${(currentPage-1)*PAGE_SIZE+rows.length}`
    : '0 anime found';
  drawPagination();
}
async function loadPage() {
  const serial=++requestSerial;
  if(activeController)activeController.abort();
  activeController=new AbortController();
  const query=buildQuery();
  if(searchClear)searchClear.hidden=!(searchInput&&searchInput.value);
  if(resultsText)resultsText.textContent='Loading anime…';
  grid.setAttribute('aria-busy','true');
  grid.classList.add('te-anime-loading');
  try {
    let entry=cache.get(query);
    if(!entry) {
      const timer=setTimeout(()=>activeController?.abort(),15000);
      let response;
      try{
        response=await fetch(API+'?'+query,{
          headers:{apikey:KEY,'Prefer':'count=exact'},
          signal:activeController.signal
        });
      }finally{clearTimeout(timer);}
      if(!response.ok)throw Error('HTTP '+response.status);
      const rows=await response.json();
      const range=response.headers.get('content-range');
      const match=range&&range.match(/\/(\d+)$/);
      if(!match)throw Error('Supabase did not return an exact result count');
      entry={rows,total:Number(match[1])};
      cache.set(query,entry);
      if(cache.size>8)cache.delete(cache.keys().next().value);
    }
    if(serial!==requestSerial)return;
    if(entry.total>0&&currentPage>Math.ceil(entry.total/PAGE_SIZE)){
      currentPage=Math.ceil(entry.total/PAGE_SIZE);return loadPage();
    }
    if(!window.ANIME_DATA.length&&entry.rows.length){window.ANIME_DATA=entry.rows;}
    window.ANIME_LOAD_ERROR=false;
    applyResult(entry.rows,entry.total);
  }catch(error){
    if(serial!==requestSerial)return;
    window.ANIME_LOAD_ERROR=true;
    if(resultsText)resultsText.textContent='Could not load anime';
    showError('Could not load anime. Please check your connection and try again.');
    console.error('Anime catalog request failed',error);
  }finally{
    if(serial===requestSerial){grid.removeAttribute('aria-busy');grid.classList.remove('te-anime-loading');}
  }
}
buildGenreMenu();buildQuickGenres();
genreList?.addEventListener('click',event=>{
  const button=event.target.closest('[data-category]');
  if(button)selectGenre(button.dataset.category||'all');
});
quickGenres?.addEventListener('click',event=>{
  const button=event.target.closest('[data-quick-genre]');
  if(button){selectGenre(button.dataset.quickGenre||'all');grid.scrollIntoView({block:'start',behavior:'smooth'});}
});
allGenresButton?.addEventListener('click',()=>setGenreMenu(!menuOpen));
genresToggle?.addEventListener('click',event=>{event.stopPropagation();setGenreMenu(!menuOpen);});
genreMenu?.addEventListener('click',event=>event.stopPropagation());
genresBackdrop?.addEventListener('click',()=>setGenreMenu(false));
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&menuOpen){setGenreMenu(false);(allGenresButton||genresToggle)?.focus();}
});
resetButton?.addEventListener('click',()=>{
  if(searchInput)searchInput.value='';
  if(sortInput)sortInput.value='newest';
  selectGenre('all');
});
searchClear?.addEventListener('click',()=>{
  if(searchInput)searchInput.value='';currentPage=1;loadPage();searchInput?.focus();
});
sortInput?.addEventListener('change',()=>{currentPage=1;loadPage();});
function searchChanged(){
  currentPage=1;clearTimeout(searchTimer);
  searchTimer=setTimeout(()=>loadPage(),300);
}
searchInput?.addEventListener('input',searchChanged);
searchInput?.addEventListener('search',()=>{clearTimeout(searchTimer);currentPage=1;loadPage();});
// Existing featured/hero scripts can await this first page without fetching all 2000 records.
window.ANIME_READY=loadPage().then(()=>window.ANIME_DATA);
})();
