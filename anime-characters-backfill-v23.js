/* The Everything v23 — opt-in backfill of ALL remaining missing characters.
 * Reads current titles from Supabase in small pages, preserves existing casts,
 * and resumes after browser interruptions. No automatic background execution.
 */
(()=>{
'use strict';
const API=window.TECharacterAPIv23,LOCK=window.TEAdminJobV23;
const $=id=>document.getElementById(id);
const anchor=$('teBulkImport')||$('teAnimeCommand');
if(!anchor||!API)return;
const root=document.createElement('section');
root.id='teCharacterBackfill';root.className='te-bulk-v16 te-backfill-v19';
root.innerHTML=`
  <div class="te-bulk-top"><div>
    <span class="te-bulk-kicker">CHARACTER LIBRARY / TENRAI</span>
    <h2>Fill all missing anime characters.</h2>
    <p>Scan your entire catalog and fill only empty character lists (up to 30 characters per title). Existing characters, episodes and anime metadata are never replaced.</p>
  </div><span class="te-bulk-number">ALL<span> MISSING</span></span></div>
  <div class="te-bulk-stats">
    <div><small>Missing in catalog</small><strong id="teCharEligible">—</strong></div>
    <div><small>Checked in this run</small><strong id="teCharProcessed">0</strong></div>
    <div><small>Characters added to</small><strong id="teCharUpdated">0</strong></div>
    <div><small>No cast / skipped</small><strong id="teCharSkipped">0</strong></div>
  </div>
  <div class="te-bulk-progress"><div class="te-bulk-progress-title"><span id="teCharState">Ready</span><span id="teCharPercent">0%</span></div>
    <progress id="teCharProgress" value="0" max="1"></progress>
    <p class="te-bulk-status" id="teCharMessage" role="status" aria-live="polite">Runs only when you click Start. Keep this tab open; saved progress can be resumed.</p>
  </div>
  <div class="te-bulk-controls">
    <button type="button" class="te-bulk-primary" id="teCharStart" disabled>Fill All Missing Characters</button>
    <button type="button" id="teCharPause" hidden>Pause safely</button>
    <button type="button" id="teCharRetry" hidden>Retry titles with no cast</button>
  </div>
  <details class="te-bulk-details"><summary>How does this work?</summary>
    <p>Each run checks the whole Supabase catalog, not only the first 500 titles. It never changes titles that already have characters, including those filled in v19. Titles still missing a cast from v19 are checked again in the first v23 run. If Tenrai still has no data, use Retry later. This can take a long time for large libraries. Keep the tab open. You can pause and resume from this browser.</p>
  </details><ol class="te-bulk-log" id="teCharLog" aria-label="Character import log"></ol>`;
anchor.insertAdjacentElement('afterend',root);
let admin=null,uid='',task=null,working=false,pauseRequested=false,checkedIds=new Set();
const keyFor=uid=>'te-character-backfill-v23-'+uid;
const storage={get(k){try{return JSON.parse(localStorage.getItem(k)||'null');}catch{return null;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch{return false;}}};
const int=v=>Number.isSafeInteger(Number(v))&&Number(v)>0?Number(v):0;
const missing=a=>int(a?.mal_id)&&(!Array.isArray(a.characters)||a.characters.length===0);
function message(text){$('teCharMessage').textContent=text;}
function log(text){const list=$('teCharLog'),li=document.createElement('li');li.textContent=text;list.prepend(li);while(list.children.length>7)list.lastElementChild.remove();}
function persist(){if(!uid)return;const ok=storage.set(keyFor(uid),{task,checked:[...checkedIds]});if(!ok)message('Browser storage unavailable. Completed saves remain in Supabase, but resume is not guaranteed.');}
function render(){
 const count=task?.queue?.length||0,done=task?.index||0;
 $('teCharProcessed').textContent=String(done);$('teCharUpdated').textContent=String(task?.updated||0);
 $('teCharSkipped').textContent=String((task?.empty||0)+(task?.preserved||0));
 $('teCharProgress').max=Math.max(count,1);$('teCharProgress').value=done;
 $('teCharPercent').textContent=(count?Math.round(done/count*100):0)+'%';
 $('teCharState').textContent=working?(pauseRequested?'Pausing after current title…':'Fetching characters…'):
  task&&done<count?'Paused — ready to resume':task&&done>=count?'Last run complete':'Ready';
 $('teCharStart').disabled=!admin||working;
 $('teCharStart').textContent=task&&done<count?'Resume Character Import':'Fill All Missing Characters';
 $('teCharPause').hidden=!working;$('teCharPause').disabled=pauseRequested;
 $('teCharRetry').hidden=working||!admin||checkedIds.size===0;
}
function refreshEligible(){
 if(!admin)return;
 $('teCharEligible').textContent=String(admin.getCatalog().filter(missing).length);
}
async function scanMissing(){
 // Always page: a single select would silently stop at Supabase's default 1000-row cap.
 const rows=[];
 for(let offset=0;;offset+=400){
  const result=await admin.client.from('site_anime').select('id,mal_id,title,characters').order('id').range(offset,offset+399);
  if(result.error)throw Error('Supabase catalog scan failed: '+result.error.message);
  rows.push(...result.data.filter(missing).map(a=>({id:String(a.id),mal_id:int(a.mal_id),title:String(a.title||'Anime')})));
  if(result.data.length<400)break;
 }
 return rows;
}
async function writeIfStillEmpty(item,characters){
 // Both compare-and-write steps are atomic; never write on top of characters added elsewhere.
 let saved=await admin.client.from('site_anime').update({characters}).eq('id',item.id).filter('characters','eq','[]').select('id');
 if(saved.error)throw Error('Supabase character save failed: '+saved.error.message);
 if(saved.data?.length)return true;
 saved=await admin.client.from('site_anime').update({characters}).eq('id',item.id).is('characters',null).select('id');
 if(saved.error)throw Error('Supabase character save failed: '+saved.error.message);
 return Boolean(saved.data?.length);
}
async function run(){
 if(working||!admin||!task)return;
 if(!LOCK?.acquire('backfill')){message('Another anime import is already running in this tab. Finish or pause it first.');return;}
 working=true;pauseRequested=false;render();
 try{
  await admin.allowed();
  while(task.index<task.queue.length&&!pauseRequested){
   const item=task.queue[task.index];
   const read=await admin.client.from('site_anime').select('id,characters').eq('id',item.id).maybeSingle();
   if(read.error)throw Error('Supabase read failed: '+read.error.message);
   if(!read.data||!missing({...item,characters:read.data.characters})){
    task.preserved++;checkedIds.add(item.id);task.index++;persist();render();continue;
   }
   // A 404 or no cast is an expected empty result, not a fabricated character list.
   const chars=await API.fetchCharacters(item.mal_id);
   if(chars.length){
    const saved=await writeIfStillEmpty(item,chars);
    if(saved){task.updated++;log(`${item.title}: ${chars.length} characters saved.`);}
    else{task.preserved++;log(`${item.title}: cast already exists; preserved.`);}
   }else{task.empty++;log(`${item.title}: Tenrai returned no characters.`);}
   checkedIds.add(item.id);task.index++;persist();render();
  }
  if(task.index>=task.queue.length){
   message(`Completed ${task.index} titles in this run. Added characters to ${task.updated} anime. Existing casts were preserved.`);
   log('All remaining unchecked titles completed.');
  }else message(`Paused at ${task.index}/${task.queue.length}. Press Resume Character Import to continue.`);
 }catch(error){
  // The failed item is not marked as checked; Resume will retry it.
  message(`Paused: ${error.message}. Completed saves remain intact. Press Resume later.`);
  log('Paused: '+error.message);
 }finally{
  working=false;pauseRequested=false;LOCK.release('backfill');persist();
  if(task.index>=task.queue.length){try{await admin.reload();}catch(error){log('Catalog refresh failed: '+error.message);}}
  refreshEligible();render();
 }
}
async function startOrResume(){
 if(!admin||working)return;
 if(!task||task.index>=task.queue.length){
  if(LOCK?.current){message('Another import is already running in this tab.');return;}
  $('teCharStart').disabled=true;
  try{
   await admin.allowed();
   const remaining=await scanMissing();
   const unchecked=remaining.filter(a=>!checkedIds.has(a.id));
   task={version:23,queue:unchecked,index:0,updated:0,empty:0,preserved:0};
   persist();
   $('teCharEligible').textContent=String(remaining.length);
   if(!unchecked.length){message('No unchecked titles with missing characters. Use Retry titles with no cast to retry previous empty results.');render();return;}
   log(`Queued ${unchecked.length} missing titles from the full catalog.`);
  }catch(error){message('Unable to scan catalog: '+error.message);render();return;}
 }
 await run();
}
async function initialize(){
 if(admin||!window.TE_ADMIN_API)return;
 admin=window.TE_ADMIN_API;
 try{uid=(await admin.getSession())?.data?.session?.user?.id||'';}catch{return;}
 if(!uid)return;
 const saved=storage.get(keyFor(uid));
 if(Array.isArray(saved?.checked))checkedIds=new Set(saved.checked.filter(v=>typeof v==='string'));
 if(saved?.task?.version===23&&Array.isArray(saved.task.queue)&&Number.isInteger(saved.task.index))task=saved.task;
 // v19-filled titles already contain cast data, so the full-catalog scan preserves them.
 // Previously empty v19 results are retried once in v23, as requested.
 refreshEligible();render();
 if(task&&task.index<task.queue.length)message(`Saved progress found: ${task.index}/${task.queue.length} checked. Press Resume Character Import to continue.`);
 else message('Ready to scan all missing characters in your existing catalog. Previously filled v19 characters are preserved; titles still empty are eligible for a retry.');
}
$('teCharStart').addEventListener('click',startOrResume);
$('teCharPause').addEventListener('click',()=>{pauseRequested=true;render();});
$('teCharRetry').addEventListener('click',()=>{
 if(!admin||working)return;
 if(!confirm('Retry all titles that are still missing characters? Existing character lists will never be replaced.'))return;
 checkedIds.clear();task=null;persist();refreshEligible();render();
 message('Previously empty or unavailable titles can now be checked again. Press Fill All Missing Characters.');
});
window.addEventListener('te-admin-ready',initialize);
if(window.TE_ADMIN_API)initialize();
window.TECharacterBackfillV23={missing};
})();
