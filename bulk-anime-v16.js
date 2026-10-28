/* The Everything v16 — admin-only, resumable bulk anime importer.
 * Uses the current project's Tenrai API, existing Supabase auth and RLS.
 * Does not import videos, overwrite existing anime, or add featured items.
 */
(()=>{
'use strict';
const API='https://api.tenrai.org/v1';
const TARGET=500, BATCH_SIZE=12, REQUEST_INTERVAL=1100;
const STORAGE_PREFIX='te-v16-anime-bulk-';
const $=id=>document.getElementById(id);
const ANIME_TYPES=new Set(['TV','Movie','OVA','ONA','Special','TV Special']);
const displayName=a=>a?.title_english||a?.title||a?.title_japanese||'Untitled';
const number=v=>Number.isSafeInteger(Number(v))&&Number(v)>0?Number(v):0;
const slug=s=>String(s||'anime').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,65).replace(/-+$/g,'')||'anime';
// Preserve Japanese characters when comparing alternate names.
const titleKey=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'').trim();
const aliases=a=>{
 const all=[a?.title,a?.title_english,a?.title_japanese,...(a?.title_synonyms||[]),...(a?.titles||[]).map(x=>x?.title)];
 return [...new Set(all.map(titleKey).filter(Boolean))];
};
const poster=a=>{
 const value=a?.images?.webp?.large_image_url||a?.images?.jpg?.large_image_url||a?.images?.webp?.image_url||a?.images?.jpg?.image_url||'';
 try{const url=new URL(value);return url.protocol==='https:'?url.href:'';}catch{return '';}
};
const date=v=>/^\d{4}-\d{2}-\d{2}/.test(String(v||''))?String(v).slice(0,10):null;
const year=v=>Number.isInteger(Number(v))&&Number(v)>=1900&&Number(v)<=9999?Number(v):null;
const season=v=>({winter:'Winter',spring:'Spring',summer:'Summer',fall:'Fall'})[String(v||'').toLowerCase()]||'Not announced';
const age=v=>{
 const val=String(v||'');
 if(/^G\s/.test(val))return 'All ages';
 if(/^PG-13/.test(val))return '13+';
 if(/^R\+/.test(val))return '18+';
 if(/^R\s/.test(val))return '16+';
 if(/^PG\s/.test(val))return '7+';
 return 'Not rated';
};
const status=v=>({'Currently Airing':'Ongoing','Finished Airing':'Completed','Not yet aired':'Upcoming'})[v]||'Unknown';
const source=v=>['Manga','Light Novel','Web Novel','Novel','Original','Game','Visual Novel'].find(x=>x.toLowerCase()===String(v||'').toLowerCase())||'Other';
const day=v=>{const found=String(v||'').match(/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/i);return found?found[0][0].toUpperCase()+found[0].slice(1).toLowerCase():'Not announced';};
function normalizeRelations(groups){
 if(!Array.isArray(groups))return [];
 return groups.slice(0,35).map(group=>({
  relation:String(group?.relation||'Related').slice(0,70),
  entries:(Array.isArray(group?.entry)?group.entry:[]).filter(x=>number(x?.mal_id)&&String(x?.type||'').toLowerCase()==='anime')
    .slice(0,60).map(x=>({mal_id:number(x.mal_id),type:'anime',name:String(x.name||'Anime').slice(0,210)}))
 })).filter(x=>x.entries.length);
}
function payloadFor(a,relations,characters=[]){
 const malId=number(a.mal_id);
 const title=displayName(a).slice(0,200);
 const genres=[...(a.genres||[]),...(a.explicit_genres||[]),...(a.themes||[]),...(a.demographics||[])].map(g=>g?.name).filter(Boolean);
 const distinctGenres=[...new Set(genres)].slice(0,50);
 const animeType=String(a.type||'Unknown').slice(0,35);
 return {
  id:`${slug(title).slice(0,Math.max(1,75-String(malId).length))}-mal-${malId}`.slice(0,80),
  mal_id:malId,mal_relations:normalizeRelations(relations),anime_type:animeType,
  title,image:poster(a),category:slug(a.genres?.[0]?.name||'anime'),genres:distinctGenres,
  rating:Math.max(0,Math.min(10,Number(a.score)||0)),
  episodes:Number.isInteger(a.episodes)&&a.episodes>=0&&a.episodes<=2000?a.episodes:0,
  description:String(a.synopsis||'').trim(),episode_links:{},
  studio:(a.studios||[]).map(x=>x?.name).filter(Boolean).join(', ').slice(0,200),
  release_season:season(a.season),release_year:year(a.year)||year(String(a.aired?.from||'').slice(0,4)),
  start_date:date(a.aired?.from),end_date:date(a.aired?.to),broadcast_day:day(a.broadcast?.day),
  age_rating:age(a.rating),airing_status:status(a.status),source_type:source(a.source),
  series_key:'',season_order:1,season_label:String(a.title||title).slice(0,100),characters:Array.isArray(characters)?characters.slice(0,30):[]
 };
}
function graphInfo(payload){
 const before=[],after=[];
 for(const group of payload.mal_relations){
  const label=group.relation.toLowerCase();
  if(label==='prequel')before.push(...group.entries.map(x=>x.mal_id));
  if(label==='sequel')after.push(...group.entries.map(x=>x.mal_id));
 }
 return {before:[...new Set(before)],after:[...new Set(after)],date:payload.start_date||'',name:payload.title};
}
function computeSeriesRows(task,catalog){
 const newlyAdded=new Set(task.addedIds.map(Number));
 const all=new Map();
 for(const item of catalog){if(number(item.mal_id))all.set(number(item.mal_id),item);}
 const graph=task.graph||{};
 const ids=[...new Set([...newlyAdded,...all.keys()])].filter(Boolean);
 const known=new Set(ids), adjacency=new Map(ids.map(id=>[id,new Set()]));
 const forward=new Map(ids.map(id=>[id,new Set()]));
 for(const id of ids){
  const data=graph[id] || (all.get(id)?graphInfo({mal_relations:normalizeRelations(all.get(id).mal_relations||[]),start_date:all.get(id).start_date||'',title:all.get(id).title||''}):null);
  if(!data)continue;
  for(const pre of data.before||[]){if(pre===id||!known.has(pre))continue;adjacency.get(id).add(pre);adjacency.get(pre).add(id);forward.get(pre).add(id);}
  for(const next of data.after||[]){if(next===id||!known.has(next))continue;adjacency.get(id).add(next);adjacency.get(next).add(id);forward.get(id).add(next);}
 }
 const visited=new Set(),rows=[];
 const sortByDate=(a,b)=>{
  const ad=graph[a]?.date||all.get(a)?.start_date||'9999',bd=graph[b]?.date||all.get(b)?.start_date||'9999';
  return ad.localeCompare(bd)||a-b;
 };
 for(const id of ids){
  if(visited.has(id))continue;
  const component=[],stack=[id];visited.add(id);
  while(stack.length){const next=stack.pop();component.push(next);for(const neighbor of adjacency.get(next)||[]){if(!visited.has(neighbor)){visited.add(neighbor);stack.push(neighbor);}}}
  if(component.length<2)continue;
  const set=new Set(component),deg=new Map(component.map(i=>[i,0]));
  for(const from of component){for(const to of forward.get(from)||[]){if(set.has(to))deg.set(to,deg.get(to)+1);}}
  const roots=component.filter(i=>deg.get(i)===0).sort(sortByDate),order=[];
  while(roots.length){const current=roots.shift();order.push(current);for(const other of forward.get(current)||[]){if(!set.has(other))continue;deg.set(other,deg.get(other)-1);if(deg.get(other)===0){roots.push(other);roots.sort(sortByDate);}}}
  // Cyclic or incomplete API links: use release dates for remaining entries.
  for(const missing of component.filter(i=>!order.includes(i)).sort(sortByDate))order.push(missing);
  const existingKey=component.map(i=>all.get(i)?.series_key).find(x=>x&&!String(x).startsWith('mal-series-'));
  const key=existingKey||'mal-series-'+Math.min(...component);
  order.forEach((malId,index)=>{
   if(!newlyAdded.has(malId))return;
   const record=all.get(malId);
   if(record)rows.push({id:record.id,series_key:key,season_order:Math.min(index+1,1000)});
  });
 }
 return rows;
}
// Export pure helpers for regression tests. Does not expose Supabase auth.
window.TEBulkUtilsV16={titleKey,aliases,normalizeRelations,payloadFor,computeSeriesRows};

const section=$('animeSection'),command=$('teAnimeCommand');
if(!section||!command)return;
const root=document.createElement('section');root.className='te-bulk-v16';root.id='teBulkImport';
root.innerHTML=`
  <div class="te-bulk-top"><div><span class="te-bulk-kicker">BULK CATALOG IMPORT / TENRAI</span>
    <h2>Add 500 anime in one click.</h2><p>Import 500 <strong>new</strong> anime, skip duplicates, and connect sequels, specials, remakes and alternate versions. Existing records are never overwritten. Characters are fetched for new titles automatically.</p></div>
    <span class="te-bulk-number">500<span> NEW ANIME</span></span></div>
  <div class="te-bulk-stats"><div><small>Current catalog</small><strong id="teBulkExisting">—</strong></div><div><small>Successfully added</small><strong id="teBulkAdded">0</strong></div><div><small>Skipped duplicates</small><strong id="teBulkSkipped">0</strong></div><div><small>API / data errors</small><strong id="teBulkErrors">0</strong></div></div>
  <div class="te-bulk-progress"><div class="te-bulk-progress-title"><span id="teBulkState">Ready for a new import</span><span id="teBulkPercent">0%</span></div>
    <progress id="teBulkBar" max="500" value="0">0 / 500</progress><p class="te-bulk-status" id="teBulkMessage" role="status" aria-live="polite">The existing anime catalog is checked before importing. This may take several minutes. Keep this tab open.</p></div>
  <div class="te-bulk-controls"><button type="button" id="teBulkStart" class="te-bulk-primary">Import 500 New Anime</button><button type="button" id="teBulkCheck">Check Connection &amp; Database</button><button type="button" id="teBulkPause" hidden>Pause safely</button><button type="button" id="teBulkDiscard" hidden>Discard saved progress</button></div>
  <details class="te-bulk-details"><summary>What will be imported?</summary><p>Titles, posters, synopsis, genres, studio, ratings, release dates, seasons and anime type. The importer also prioritizes a few directly related sequels, specials, remakes and alternate versions within the 500-title limit. Relationships are read from Tenrai and linked to other records in your library. The importer does not upload episodes or videos. Up to 30 characters are fetched during import where Tenrai provides them. Missing or conflicting metadata is left unlinked rather than inventing a watch order.</p><p>Progress is saved in this browser. If the page is closed, return to Admin and press Resume. Never run the importer in two tabs at the same time.</p></details>
  <p class="te-bulk-status" id="teBulkCharacters">Character import: ready.</p>
  <ol id="teBulkLog" class="te-bulk-log" aria-label="Recent import activity"></ol>`;
command.insertAdjacentElement('afterend',root);

let admin=null,task=null,userId='',storageOK=true,running=false,pauseRequested=false,lastStart=0,catalog=[],existingNames=new Set(),existingIds=new Set(),existingMalIds=new Set();
const el=id=>$(id),logEntries=[];
const text=(id,value)=>{const node=el(id);if(node)node.textContent=String(value);};
function log(message){logEntries.unshift(message);logEntries.splice(8);const holder=el('teBulkLog');holder.replaceChildren();for(const entry of logEntries){const li=document.createElement('li');li.textContent=entry;holder.append(li);}}
function storageKey(){return STORAGE_PREFIX+userId;}
function save(){if(!task)return;try{localStorage.setItem(storageKey(),JSON.stringify(task));}catch{storageOK=false;}}
function loadSaved(){try{const saved=JSON.parse(localStorage.getItem(storageKey())||'null');return saved?.version===16&&saved?.owner===userId&&saved?.goal===TARGET?saved:null;}catch{return null;}}
function discardSaved(){try{localStorage.removeItem(storageKey());}catch{}}
function shuffled(values){const copy=[...values];for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
function newTask(){return {version:16,owner:userId,goal:TARGET,addedIds:[],skipped:0,errors:0,seen:[],pages:shuffled(Array.from({length:200},(_,i)=>i+1)),pageIndex:0,queue:[],pending:[],graph:{},finished:false,characterPopulated:0,characterUnavailable:0,lastError:'',started:new Date().toISOString()};}
function snapshotCatalog(){catalog=admin.getCatalog();existingNames=new Set();existingIds=new Set();existingMalIds=new Set();for(const a of catalog){existingIds.add(String(a.id));if(number(a.mal_id))existingMalIds.add(number(a.mal_id));const key=titleKey(a.title);if(key)existingNames.add(key);}text('teBulkExisting',catalog.length);}
function exists(a){if(existingMalIds.has(number(a?.mal_id)))return true;return aliases(a).some(alias=>existingNames.has(alias));}
function updateState(message){const n=task?.addedIds.length||0;const total=TARGET;
 text('teBulkAdded',n);text('teBulkSkipped',task?.skipped||0);text('teBulkErrors',task?.errors||0);text('teBulkPercent',Math.round(n/total*100)+'%');
 el('teBulkBar').value=n;
 text('teBulkState',task?.finished?'Import complete':running?(pauseRequested?'Pausing after current batch…':'Importing anime…'):task?'Import paused — ready to resume':'Ready for a new import');
 if(message)text('teBulkMessage',message);
 text('teBulkCharacters',`Characters: ${task?.characterPopulated||0} new anime with cast · ${task?.characterUnavailable||0} unavailable / retry later`);
 const start=el('teBulkStart');start.disabled=running||!admin;start.textContent=task?(task.finished?'Import Another 500 Anime':'Resume Import'):'Import 500 New Anime';
 el('teBulkPause').hidden=!running;el('teBulkPause').disabled=pauseRequested;el('teBulkCheck').disabled=running||!admin;
 el('teBulkDiscard').hidden=!task||task.finished||running;
 if(!storageOK)text('teBulkMessage','Private storage is unavailable. The import can still run, but progress cannot be resumed after closing the tab.');
}
function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
async function request(path){
 for(let attempt=0;attempt<5;attempt++){
  const elapsed=Date.now()-lastStart;if(elapsed<REQUEST_INTERVAL)await wait(REQUEST_INTERVAL-elapsed);
  lastStart=Date.now();
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),18000);
  let response;
  try{response=await fetch(API+path,{headers:{Accept:'application/json'},signal:controller.signal});}
  catch(error){clearTimeout(timeout);if(attempt===4)throw Error('Tenrai connection failed: '+error.message);await wait(Math.min(25000,1800*(2**attempt)));continue;}
  clearTimeout(timeout);
  if([429,500,502,503,504].includes(response.status)){
   const retryAfter=Number(response.headers.get('Retry-After'));
   if(attempt===4)throw Error(`Tenrai HTTP ${response.status}. Import paused for safety; resume later.`);
   await wait(Math.max(Math.min(retryAfter*1000||0,60000),Math.min(30000,2000*(2**attempt))));continue;
  }
  if(!response.ok)throw Error(`Tenrai HTTP ${response.status} (${path}).`);
  return response.json();
 }
 throw Error('Unable to connect to Tenrai.');
}
async function ensureSchema(){
 const check=await admin.client.from('site_anime').select('id,mal_id,mal_relations,anime_type').limit(1);
 if(check.error)throw Error('Database setup required: run BULK-ANIME-SETUP-v16.sql in Supabase SQL Editor before importing. ('+check.error.message+')');
 const privilege=await admin.client.rpc('site_is_admin');
 if(privilege.error||privilege.data!==true)throw Error('Administrator access is required.');
}
async function getCandidate(){
 while(!task.queue.length){
  if(task.pageIndex>=task.pages.length)throw Error('The available candidate pages were exhausted before 500 unique anime could be found. You can resume after updating the source range.');
  const page=task.pages[task.pageIndex++];save();
  const url=`/anime?order_by=popularity&sort=asc&limit=25&page=${page}&sfw&sfw-strict`;
  let result;
  try{result=await request(url);}catch(error){
   // A transient or invalid page should not abort a successful partial run.
   if(/HTTP 400|HTTP 404/.test(error.message)){log(`Skipped unavailable catalog page ${page}.`);continue;}
   throw error;
  }
  const batch=Array.isArray(result?.data)?result.data:[];
  task.queue.push(...shuffled(batch.filter(item=>number(item.mal_id)&&item.title).map(item=>({mal_id:number(item.mal_id),title:item.title,title_english:item.title_english,title_japanese:item.title_japanese,titles:item.titles||[],title_synonyms:item.title_synonyms||[],depth:0}))));
  save();
 }
 const item=task.queue.shift();save();return item;
}
async function detailsFor(id){
 let anime;
 try{anime=(await request('/anime/'+id+'/full?sfw-strict'))?.data;}
 catch(error){if(/HTTP 404/.test(error.message))anime=(await request('/anime/'+id+'?sfw-strict'))?.data;else throw error;}
 if(!anime||number(anime.mal_id)!==id)throw Error('Invalid detail response for MAL #'+id);
 let relations=anime.relations;
 if(!Array.isArray(relations)){
  try{relations=(await request('/anime/'+id+'/relations?sfw-strict'))?.data;}catch(error){log(`Relations unavailable for MAL #${id}; its other metadata can still be imported.`);relations=[];}
 }
 return {anime,relations};
}
function duplicateFull(data){return exists(data)||[...task.pending].some(row=>row.mal_id===number(data.mal_id)||aliases(data).some(alias=>alias===titleKey(row.title)));}
function prioritizeRelations(payload, candidate, seen){
 // Import connected titles as part of the 500, without recursively crawling
 // entire franchises and exhausting the source's rate limit.
 if(candidate.depth===1)return;
 const relationPriority=['Prequel','Sequel','Side story','Alternative version','Remake','Spin-off','Other'];
 const additions=[];
 const ordered=[...payload.mal_relations].sort((a,b)=>{
  const ia=relationPriority.findIndex(x=>x.toLowerCase()===a.relation.toLowerCase());
  const ib=relationPriority.findIndex(x=>x.toLowerCase()===b.relation.toLowerCase());
  return (ia<0?99:ia)-(ib<0?99:ib);
 });
 for(const group of ordered){
  if(additions.length>=4)break;
  for(const entry of group.entries){
   if(additions.length>=4)break;
   const next=number(entry.mal_id);
   if(next===payload.mal_id||seen.has(next)||existingMalIds.has(next)||task.queue.some(x=>x.mal_id===next)||task.pending.some(x=>x.mal_id===next))continue;
   const obj={mal_id:next,title:entry.name,depth:1};
   if(!exists(obj))additions.push(obj);
  }
 }
 if(additions.length){task.queue.unshift(...additions);log(`Queued ${additions.length} directly related anime (seasons / specials / alternative works).`);}
}
async function flush(){
 if(!task.pending.length)return;
 const rows=task.pending.slice();
 await admin.allowed();
 let result=await admin.client.from('site_anime').upsert(rows,{onConflict:'mal_id',ignoreDuplicates:true}).select('id,mal_id,title');
 if(result.error){
  // A legacy slug collision in a large batch should not block other new anime.
  if(result.error.code!=='23505')throw Error('Supabase could not save this batch: '+result.error.message);
  log('A unique ID conflict was found. Retrying entries individually.');
  const inserted=[];
  for(const row of rows){
   const single=await admin.client.from('site_anime').upsert(row,{onConflict:'mal_id',ignoreDuplicates:true}).select('id,mal_id,title');
   if(single.error){if(single.error.code!=='23505')throw Error(single.error.message);task.skipped++;}
   else inserted.push(...(single.data||[]));
  }
  result={data:inserted};
 }
 const saved=new Set((result.data||[]).map(row=>Number(row.mal_id)));
 for(const item of rows){
  existingMalIds.add(item.mal_id);existingIds.add(item.id);existingNames.add(titleKey(item.title));
  if(saved.has(item.mal_id)){
   if(!task.addedIds.includes(item.mal_id)){
    task.addedIds.push(item.mal_id);
    if(item.characters?.length)task.characterPopulated=(task.characterPopulated||0)+1;
    else task.characterUnavailable=(task.characterUnavailable||0)+1;
   }
   // Admin catalog is refreshed at the end to avoid expensive rerenders after each batch.
   catalog.push(item);
  }else{task.skipped++;}
 }
 task.pending=[];save();
 log(`Saved ${saved.size} anime (${task.addedIds.length} of ${TARGET} added).`);
 updateState(`${task.addedIds.length} new anime saved. ${task.skipped} duplicates skipped. Keep this tab open.`);
}
async function reconcilePending(){
 if(!task.pending?.length)return;
 // The browser may have closed after a successful DB save but before its checkpoint.
 const found=new Set(catalog.filter(row=>number(row.mal_id)).map(row=>number(row.mal_id)));
 const still=[];
 for(const row of task.pending){
  if(found.has(row.mal_id)){
   if(!task.addedIds.includes(row.mal_id))task.addedIds.push(row.mal_id);
  }else still.push(row);
 }
 task.pending=still;save();
}
async function organize(){
 const graphRows=computeSeriesRows(task,catalog);
 if(!graphRows.length){log('No connected sequel/prequel chains needed ordering.');return;}
 let total=0;
 for(let offset=0;offset<graphRows.length;offset+=100){
  await admin.allowed();
  const batch=graphRows.slice(offset,offset+100);
  const result=await admin.client.rpc('site_bulk_set_series_v16',{p_rows:batch});
  if(result.error)throw Error('Series ordering was not updated: '+result.error.message);
  total+=Number(result.data)||0;
 }
 log(`Organized ${total} imported seasons/parts using prequel and sequel links.`);
}
async function run(){
 if(!admin||running)return;
 if(!window.TEAdminJobV23?.acquire('bulk')){text('teBulkMessage','Another import is running in this tab. Finish or pause it first.');return;}
 running=true;pauseRequested=false;
 let allGood=false;
 try{
  await ensureSchema();snapshotCatalog();
  if(task){await reconcilePending();if(task.pending.length)await flush();}
  const seen=new Set(task.seen.map(Number));
  updateState('Checking existing anime and importing new titles from Tenrai…');
  while(task.addedIds.length<TARGET&&!pauseRequested){
   if(task.pending.length>=BATCH_SIZE||task.addedIds.length+task.pending.length>=TARGET){await flush();continue;}
   const candidate=await getCandidate();const id=number(candidate.mal_id);
   if(seen.has(id))continue;
   seen.add(id);task.seen.push(id);
   if(exists(candidate)||task.pending.some(row=>row.mal_id===id)){task.skipped++;save();continue;}
   let result;
   try{result=await detailsFor(id);}catch(error){
    if(/HTTP 404|Invalid detail response/.test(error.message)){task.errors++;save();log('No details for MAL #'+id);continue;}
    // Do not lose a transiently unavailable title; allow retry on resume.
    task.seen=task.seen.filter(x=>x!==id);seen.delete(id);save();throw error;
   }
   const a=result.anime;
   const typ=String(a.type||'');
   if(!ANIME_TYPES.has(typ)||/\b(Rx|Hentai)\b|R\+/i.test(String(a.rating||''))){task.skipped++;save();continue;}
   if(duplicateFull(a)){task.skipped++;save();continue;}
   const item=payloadFor(a,result.relations);
   if(!item.image||!item.title||!item.mal_id){task.errors++;save();continue;}
   if(existingIds.has(item.id)){task.skipped++;save();continue;}
   // Fetch a real cast for each NEW record before its insert. Never modify older records.
   try{
    item.characters=await window.TECharacterAPIv23.fetchCharacters(id);
   }catch(error){
    // Do not save a NEW anime with missing cast because of a temporary API
    // failure. Put the candidate back so Resume retries the same title.
    task.queue.unshift(candidate);
    task.seen=task.seen.filter(value=>Number(value)!==id);
    seen.delete(id);
    save();
    throw Error(`Character fetch failed for MAL #${id}; no record was saved for it. Resume to retry. ${error?.message||''}`);
   }
   task.graph[id]=graphInfo(item);
   task.pending.push(item);prioritizeRelations(item,candidate,seen);save();
   updateState(`Preparing ${displayName(a)} • ${task.addedIds.length} saved, ${task.pending.length} in the next batch.`);
  }
  if(task.pending.length)await flush();
  // Organize already-added entries even if the admin paused before reaching 500.
  await organize();
  await admin.reload();snapshotCatalog();
  if(task.addedIds.length>=TARGET){task.finished=true;save();allGood=true;}
  if(allGood)log(`Import complete: ${task.addedIds.length} NEW anime were added. Your previous records were not changed.`);
 }catch(error){
  const msg=error?.message||'Unknown error';
  if(task){task.lastError=msg;save();}
  log('Import paused: '+msg);
  text('teBulkMessage','Paused: '+msg+' Your completed batches are saved. Press Resume Import when the issue is resolved.');
 }finally{
  running=false;pauseRequested=false;window.TEAdminJobV23?.release('bulk');
  updateState(task?.finished?`Done! ${task.addedIds.length} new anime imported. Existing entries were not overwritten.`:task?.lastError?'Paused: '+task.lastError:'Progress saved. You can resume at any time.');
 }
}
async function initialize(){
 if(admin||!window.TE_ADMIN_API)return;
 admin=window.TE_ADMIN_API;
 try{const session=await admin.getSession();userId=session?.data?.session?.user?.id||'';if(!userId)return;}catch{return;}
 snapshotCatalog();task=loadSaved();
 if(task?.finished){log('Your last 500-anime import was completed. You may start another batch.');}
 else if(task){log(`Found saved progress: ${task.addedIds.length} new anime. Resume when ready.`);}
 updateState(task?.finished?'Previous import complete. Click Import Another 500 Anime to begin a new batch.':task?'Saved import found. Click Resume to continue from your last completed batch.':'Ready. A single click imports up to 500 new, nonduplicate anime.');
}
el('teBulkStart').onclick=async()=>{
 if(!admin||running)return;
 if(!task||task.finished){task=newTask();save();log('Started a new 500-anime import.');}
 task.lastError='';save();await run();
};
el('teBulkCheck').onclick=async()=>{
 if(!admin||running)return;
 el('teBulkCheck').disabled=true;
 try{
  await ensureSchema();
  const sample=await request('/anime?limit=1&sfw-strict');
  if(!Array.isArray(sample?.data))throw Error('The anime API returned an unexpected response.');
  log('Connection check passed: Supabase permissions, database migration, and Tenrai are reachable.');
  text('teBulkMessage','Connection OK. Your administrator permissions and the Tenrai catalog are available. You can start the import.');
 }catch(error){
  log('Connection check failed: '+(error?.message||'Unknown error'));
  text('teBulkMessage','Connection check failed: '+(error?.message||'Unknown error'));
 }finally{el('teBulkCheck').disabled=false;}
};
el('teBulkPause').onclick=()=>{pauseRequested=true;updateState('Pausing safely after the current request / save batch…');};
el('teBulkDiscard').onclick=()=>{
 if(running||!task)return;
 if(!confirm('Discard the saved progress? Anime already saved to Supabase WILL remain. The next import will target 500 additional titles.'))return;
 task=null;discardSaved();log('Saved progress cleared. Previously imported anime remain in the database.');updateState('Ready for a new import. Existing anime are never deleted.');
};
window.addEventListener('te-admin-ready',initialize);
if(window.TE_ADMIN_API)initialize();
})();
