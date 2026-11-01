/* The Everything v33 — on-demand popularity sync for existing anime.
 * Never starts on page load, fetches only MAL IDs, and updates only the two
 * popularity fields using an RLS-preserving, admin-checked SQL function.
 */
(()=>{
'use strict';
const TENRAI='https://api.tenrai.org/v1';
const STORAGE='te-popularity-v33-next-page';
const PAGE_LIMIT=100, PAGES_PER_RUN=100, PAUSE_MS=850;
let knownSchema;
let running=false, pauseRequested=false;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const positive=v=>Number.isSafeInteger(Number(v))&&Number(v)>0?Number(v):null;
const nonnegative=v=>v!==null&&v!==undefined&&v!==''&&Number.isSafeInteger(Number(v))&&Number(v)>=0?Number(v):null;
function metadata(a){
  const malId=positive(a?.mal_id),rank=positive(a?.popularity),members=nonnegative(a?.members);
  return malId && (rank!==null||members!==null)
    ? {mal_id:malId,popularity_rank:rank,mal_members:members}:null;
}
async function schemaAvailable(client){
  if(knownSchema!==undefined)return knownSchema;
  if(!client)return false;
  const {error}=await client.from('site_anime').select('popularity_rank,mal_members').limit(1);
  if(error)return false;
  knownSchema=true;
  return true;
}
window.TEPopularityV33={metadata,schemaAvailable};
function install(){
  const admin=window.TE_ADMIN_API,anchor=document.getElementById('teAnimeCommand');
  if(!admin?.client||!anchor||document.getElementById('tePopularityPanel'))return;
  const panel=document.createElement('section');
  panel.id='tePopularityPanel';panel.className='te-popularity-panel';
  panel.innerHTML=`<div class="te-popularity-heading"><div><span class="te-admin-section-kicker">POPULARITY / MYANIMELIST</span><h3>Put the most popular anime first.</h3><p>Sync MyAnimeList popularity ranks from Tenrai for anime already in your library. Only popularity metadata changes; episodes, characters and existing anime information stay untouched. Start once after running the v33 SQL setup. This can be paused and resumed.</p></div></div>
  <div class="te-popularity-actions"><button type="button" id="tePopStart">Sync popularity</button><button type="button" id="tePopPause" hidden>Pause safely</button></div>
  <p id="tePopStatus" class="te-popularity-status" role="status" aria-live="polite">Not started. The public Anime page already has a Most Popular sort; accurate ordering requires syncing the existing catalog.</p>`;
  // Keep the original anime form and bulk importer, placing this tool directly
  // after the import panel if it already exists.
  const bulk=document.getElementById('teBulkImport');
  (bulk||anchor).insertAdjacentElement('afterend',panel);
  const start=panel.querySelector('#tePopStart'),pause=panel.querySelector('#tePopPause');
  const status=panel.querySelector('#tePopStatus');
  const getPage=()=>{try{return Math.max(1,Number.parseInt(localStorage.getItem(STORAGE)||'1',10)||1)}catch{return 1}};
  const putPage=page=>{try{localStorage.setItem(STORAGE,String(page))}catch{}};
  if(getPage()>1)start.textContent=`Resume popularity (page ${getPage()})`;
  const say=s=>{status.textContent=s};
  pause.onclick=()=>{pauseRequested=true;say('Pause requested. Finishing the current batch safely…')};
  async function targetIds(){
    // Minimal column selection, loaded only on admin click. This operation does
    // NOT load posters, cast, descriptions or episode records.
    const targets=new Set();
    for(let offset=0;;offset+=500){
      const {data,error}=await admin.client.from('site_anime')
        .select('mal_id').not('mal_id','is',null).is('popularity_rank',null)
        .order('mal_id').range(offset,offset+499);
      if(error)throw Error('Could not read missing popularity ranks: '+error.message);
      for(const a of data||[]){const id=positive(a.mal_id);if(id)targets.add(id)}
      if(!data||data.length<500)break;
    }
    return targets;
  }
  async function fetchPage(page){
    const query=new URLSearchParams({order_by:'popularity',sort:'asc',nulls:'exclude',limit:String(PAGE_LIMIT),page:String(page)});
    query.append('sfw','');query.append('sfw-strict','');
    for(let retry=0;retry<5;retry++){
      let response;
      try{response=await fetch(TENRAI+'/anime?'+query,{headers:{Accept:'application/json'}})}
      catch(error){if(retry===4)throw Error('Tenrai connection error: '+error.message);await sleep(1500*(retry+1));continue}
      if(response.status===429||response.status>=500){
        if(retry===4)throw Error('Tenrai is busy. Press Resume after a short break.');
        const retryAfter=Math.min(60000,Math.max(1500,Number(response.headers.get('retry-after')||0)*1000));
        await sleep(Math.max(retryAfter,2000*(retry+1)));continue;
      }
      if(!response.ok)throw Error('Tenrai returned HTTP '+response.status);
      const json=await response.json();
      if(!Array.isArray(json?.data))throw Error('Unexpected Tenrai response. Nothing was written.');
      return json;
    }
    throw Error('Tenrai failed.');
  }
  async function saveBatch(rows){
    if(!rows.length)return 0;
    const {data,error}=await admin.client.rpc('site_bulk_update_popularity_v33',{p_rows:rows});
    if(error)throw Error('Could not save popularity: '+error.message);
    return Number(data)||0;
  }
  start.onclick=async()=>{
    if(running)return;
    running=true;pauseRequested=false;start.disabled=true;pause.hidden=false;
    let page=getPage(),matched=0,updated=0,scanned=0;
    try{
      if(!(await schemaAvailable(admin.client)))throw Error('Run ANIME-POPULARITY-SETUP-v33.sql in Supabase SQL Editor first.');
      await admin.allowed();
      const targets=await targetIds();
      if(!targets.size){say('All anime with MAL IDs already have popularity ranks, or no MAL IDs are available.');putPage(1);return;}
      say(`${targets.size} anime need popularity data. Starting at Tenrai rank page ${page}…`);
      let endOfCatalog=false;
      for(let pages=0;pages<PAGES_PER_RUN&&targets.size&&!pauseRequested;pages++){
        const json=await fetchPage(page);
        const items=json.data;
        if(!items.length){endOfCatalog=true;break;}
        const rows=[];
        for(const item of items){
          const row=metadata(item);
          if(row?.popularity_rank!==null&&targets.has(row?.mal_id)){rows.push(row);targets.delete(row.mal_id);}
        }
        if(rows.length){
          // A failed save must not advance the page checkpoint.
          updated+=await saveBatch(rows);
          matched+=rows.length;
        }
        scanned+=items.length;
        page++;putPage(page);
        say(`Scanned ${scanned} ranked entries · matched ${matched} anime · saved ${updated} · next page ${page} · ${targets.size} still unranked. You can pause safely.`);
        if(json.pagination?.has_next_page===false){endOfCatalog=true;break;}
        if(!pauseRequested)await sleep(PAUSE_MS); // <120 requests per minute
      }
      if(!targets.size){putPage(1);say(`Finished. Saved ${updated} popularity rankings. Refresh the Anime page to see the new order.`);}
      else if(endOfCatalog){putPage(1);say(`Reached the end of Tenrai's available popularity list. ${targets.size} titles have no matched rank; they will stay after the ranked anime.`);}
      else say(`Checkpoint saved at page ${page}. ${matched} anime matched in this run, ${targets.size} still missing. Press Resume to continue.`);
    }catch(error){say('Paused: '+(error?.message||error)+`. Progress is saved at page ${page}.`);}
    finally{
      running=false;start.disabled=false;pause.hidden=true;
      start.textContent=getPage()>1?`Resume popularity (page ${getPage()})`:'Sync popularity';
    }
  };
}
window.addEventListener('te-admin-ready',install);
if(window.TE_ADMIN_API)install();
})();
