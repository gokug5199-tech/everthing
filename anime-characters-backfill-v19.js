/* The Everything v19 — opt-in character backfill.
 * Uses Tenrai's existing /anime/:mal_id/characters endpoint.
 * Updates ONLY an empty characters column after admin permission checks.
 * No changes to anime records, videos, accounts, or existing characters.
 */
(()=>{
'use strict';
const API='https://api.tenrai.org/v1';
const MAX_PER_BATCH=500, REQUEST_GAP_MS=1400;
const keyFor=uid=>'te-character-backfill-v19-'+uid;
const $=id=>document.getElementById(id);
const section=$('teBulkImport')||$('teAnimeCommand');
if(!section)return;
const root=document.createElement('section');
root.id='teCharacterBackfill';
root.className='te-bulk-v16 te-backfill-v19';
root.innerHTML=`
  <div class="te-bulk-top"><div>
    <span class="te-bulk-kicker">CHARACTER LIBRARY / TENRAI</span>
    <h2>Fill missing anime characters.</h2>
    <p>Fetch up to 30 characters per anime for as many as 500 existing titles per batch. Only anime with an empty character list are eligible. Your manually added characters, episodes and other metadata are never replaced.</p>
  </div><span class="te-bulk-number">500<span> PER BATCH</span></span></div>
  <div class="te-bulk-stats">
    <div><small>Eligible titles</small><strong id="teCharEligible">—</strong></div>
    <div><small>Checked</small><strong id="teCharProcessed">0</strong></div>
    <div><small>Characters added to</small><strong id="teCharUpdated">0</strong></div>
    <div><small>No characters / errors</small><strong id="teCharSkipped">0</strong></div>
  </div>
  <div class="te-bulk-progress">
    <div class="te-bulk-progress-title"><span id="teCharState">Check available titles</span><span id="teCharPercent">0%</span></div>
    <progress id="teCharProgress" value="0" max="500"></progress>
    <p class="te-bulk-status" id="teCharMessage" role="status" aria-live="polite">This is a separate operation from importing anime. It makes additional API requests. Start it when ready.</p>
  </div>
  <div class="te-bulk-controls">
    <button type="button" class="te-bulk-primary" id="teCharStart" disabled>Fill Missing Characters</button>
    <button type="button" id="teCharPause" hidden>Pause safely</button>
    <button type="button" id="teCharRetry" hidden>Retry previously unavailable</button>
  </div>
  <details class="te-bulk-details"><summary>How does this work?</summary><p>After a bulk anime import, use this button to fetch cast information for titles with MAL IDs and no saved characters. Progress is stored in this browser; closing the tab does not undo completed saves. Keep one tab running, and expect some titles to have no character data. It never uploads video files or changes existing cast lists. Refresh anime pages after completion.</p></details>
  <ol class="te-bulk-log" id="teCharLog" aria-label="Character import log"></ol>`;
section.insertAdjacentElement('afterend',root);

let admin=null,uid='',task=null,working=false,pauseRequested=false,checkedIds=new Set(),lastRequest=0;
const storage={get(k){try{return JSON.parse(localStorage.getItem(k)||'null');}catch{return null;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}};
const int=v=>Number.isSafeInteger(Number(v))&&Number(v)>0?Number(v):0;
const missing=a=>int(a?.mal_id)&&(!Array.isArray(a.characters)||a.characters.length===0);
const message=s=>{$('teCharMessage').textContent=s;};
function log(s){const list=$('teCharLog'),li=document.createElement('li');li.textContent=s;list.prepend(li);while(list.children.length>6)list.lastElementChild.remove();}
function persist(){if(!uid)return;storage.set(keyFor(uid),{task,checked:[...checkedIds]});}
function render(){
 const count=task?.queue.length||0;
 const done=task?.index||0;
 $('teCharProcessed').textContent=String(done);
 $('teCharUpdated').textContent=String(task?.updated||0);
 $('teCharSkipped').textContent=String((task?.empty||0)+(task?.errors||0));
 $('teCharProgress').max=Math.max(count,1);
 $('teCharProgress').value=done;
 $('teCharPercent').textContent=(count?Math.round(done/count*100):0)+'%';
 $('teCharState').textContent=working?(pauseRequested?'Stopping after this title…':'Fetching characters…'):
    task&&done<count?'Paused — ready to resume':task&&done>=count?'Last batch complete':'Ready';
 $('teCharStart').disabled=!admin||working;
 $('teCharStart').textContent=task&&done<count?'Resume Character Import':'Fill Missing Characters';
 $('teCharPause').hidden=!working;
 $('teCharPause').disabled=pauseRequested;
 $('teCharRetry').hidden=working||!admin||checkedIds.size===0;
}
function refreshEligible(){
 if(!admin)return [];
 const list=admin.getCatalog().filter(missing);
 $('teCharEligible').textContent=String(list.length);
 return list;
}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function urlOf(c){
 const u=c?.images?.webp?.large_image_url||c?.images?.jpg?.large_image_url||c?.images?.webp?.image_url||c?.images?.jpg?.image_url||'';
 try{const parsed=new URL(u);return parsed.protocol==='https:'?parsed.href:'';}catch{return '';}
}
function normalizeCharacters(response){
 if(!Array.isArray(response?.data))throw Error('Tenrai returned an invalid character list.');
 const seen=new Set(),out=[];
 for(const entry of response.data){
  const name=String(entry?.character?.name||'').trim().slice(0,160);
  if(!name||seen.has(name.toLowerCase()))continue;
  seen.add(name.toLowerCase());
  out.push({name,role:String(entry?.role||'Supporting').slice(0,70),image:urlOf(entry.character)});
  if(out.length>=30)break;
 }
 return out;
}
async function fetchCharacters(malId){
 for(let attempt=0;attempt<4;attempt++){
  const gap=REQUEST_GAP_MS-(Date.now()-lastRequest);
  if(gap>0)await wait(gap);
  lastRequest=Date.now();
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),20000);
  let response;
  try{response=await fetch(API+'/anime/'+encodeURIComponent(malId)+'/characters',{headers:{Accept:'application/json'},signal:controller.signal});}
  catch(e){clearTimeout(timer);if(attempt===3)throw Error('Tenrai is unreachable: '+e.message);await wait(1800*(attempt+1));continue;}
  clearTimeout(timer);
  if(response.status===404)return [];
  if(response.status===429||response.status>=500){
   if(attempt===3)throw Error('Tenrai HTTP '+response.status+'; pause and resume later.');
   const retryAfter=Number(response.headers.get('Retry-After'));
   await wait(Math.max(Math.min(retryAfter*1000||0,30000),2000*(attempt+1)));
   continue;
  }
  if(!response.ok)throw Error('Tenrai HTTP '+response.status);
  return normalizeCharacters(await response.json());
 }
 throw Error('Unable to fetch characters');
}
async function run(){
 if(working||!admin||!task)return;
 working=true;pauseRequested=false;render();
 try{
  await admin.allowed();
  while(task.index<task.queue.length&&!pauseRequested){
   const item=task.queue[task.index];
   // Skip titles that received characters from the admin while this job was paused.
   const fresh=await admin.client.from('site_anime').select('id,characters').eq('id',item.id).maybeSingle();
   if(fresh.error)throw Error('Supabase read failed: '+fresh.error.message);
   if(!fresh.data||!missing({...item,characters:fresh.data.characters})){
    task.empty++;checkedIds.add(item.id);task.index++;persist();render();continue;
   }
   let chars;
   try{chars=await fetchCharacters(item.mal_id);}
   catch(error){
    // Errors from networking/quotas should stop safely rather than lose this item.
    task.errors++;persist();throw error;
   }
   if(chars.length){
    // JSONB comparison is atomic: a cast added by hand in another tab is preserved.
    const result=await admin.client.from('site_anime')
      .update({characters:chars}).eq('id',item.id).filter('characters','eq','[]').select('id');
    if(result.error)throw Error('Supabase save failed: '+result.error.message);
    if(result.data?.length){task.updated++;log(`${item.title}: ${chars.length} characters saved.`);}
    else{task.empty++;log(`${item.title}: existing character list was preserved.`);}
   }else{task.empty++;log(`${item.title}: no cast was returned.`);}
   checkedIds.add(item.id);task.index++;persist();render();
  }
  if(task.index>=task.queue.length){
   message(`Finished checking ${task.index} titles. Added characters to ${task.updated} anime. Refresh the anime details pages to see them.`);
   log('Batch complete. Existing anime characters and videos were preserved.');
  }else message(`Paused at ${task.index}/${task.queue.length}. Press Resume to continue.`);
 }catch(error){
  message(`Paused: ${error.message}. Completed saves remain intact. You can resume later.`);
  log(`Paused: ${error.message}`);
 }finally{
  working=false;pauseRequested=false;persist();
  if(task.index>=task.queue.length){
   // Refresh catalog only once per batch, never after each row.
   try{await admin.reload();}catch(error){log('Catalog refresh failed: '+error.message);}
  }
  refreshEligible();render();
 }
}
async function initialize(){
 if(admin||!window.TE_ADMIN_API)return;
 admin=window.TE_ADMIN_API;
 try{uid=(await admin.getSession())?.data?.session?.user?.id||'';}catch{return;}
 if(!uid)return;
 const prior=storage.get(keyFor(uid));
 if(prior?.task&&Array.isArray(prior.task.queue)&&Number.isInteger(prior.task.index))task=prior.task;
 if(Array.isArray(prior?.checked))checkedIds=new Set(prior.checked.filter(x=>typeof x==='string'));
 refreshEligible();render();
 if(task&&task.index<task.queue.length)message(`Saved progress found: ${task.index}/${task.queue.length} checked. Press Resume to continue.`);
 else message('This optional task fills missing characters for up to 500 titles in each batch. No data is changed until you click Fill Missing Characters.');
}
$('teCharStart').addEventListener('click',()=>{
 if(!admin||working)return;
 if(!task||task.index>=task.queue.length){
  const eligible=refreshEligible().filter(a=>!checkedIds.has(a.id)).slice(0,MAX_PER_BATCH);
  if(!eligible.length){message('No unchecked titles with missing characters. Use Retry previously unavailable to try empty results again.');return;}
  task={queue:eligible.map(a=>({id:a.id,mal_id:int(a.mal_id),title:a.title||'Anime'})),index:0,updated:0,empty:0,errors:0};
  persist();
  log(`Started a batch of ${eligible.length} anime.`);
 }
 run();
});
$('teCharPause').addEventListener('click',()=>{pauseRequested=true;render();});
$('teCharRetry').addEventListener('click',()=>{
 if(!admin||working)return;
 if(!confirm('Retry titles that had no characters last time? Saved character lists will remain unchanged.'))return;
 checkedIds.clear();task=null;persist();refreshEligible();render();
 message('Previously unavailable titles can be checked again. Press Fill Missing Characters.');
});
window.addEventListener('te-admin-ready',initialize);
if(window.TE_ADMIN_API)initialize();
// Export only pure data transform for unit testing; does not expose authorization.
window.TECharacterBackfillV19={normalizeCharacters};
})();
