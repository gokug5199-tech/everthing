/* The Everything v23: shared, rate-limited Tenrai character reader.
 * Pure transformations are exposed for testing. No Supabase writes here.
 */
(()=>{
'use strict';
const API='https://api.tenrai.org/v1';
const GAP_MS=1400;
let lastStarted=0;
let chain=Promise.resolve();
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function imageOf(character){
 const v=character?.images?.webp?.large_image_url||character?.images?.jpg?.large_image_url||character?.images?.webp?.image_url||character?.images?.jpg?.image_url||'';
 try{const url=new URL(v);return url.protocol==='https:'?url.href:'';}catch{return '';}
}
function normalizeCharacters(response){
 if(!Array.isArray(response?.data))throw Error('Tenrai returned an invalid character list.');
 const seen=new Set(),output=[];
 for(const entry of response.data){
  const name=String(entry?.character?.name||'').trim().slice(0,160),key=name.toLocaleLowerCase();
  if(!name||seen.has(key))continue;
  seen.add(key);
  output.push({name,role:String(entry?.role||'Supporting').slice(0,70),image:imageOf(entry.character)});
  if(output.length>=30)break;
 }
 return output;
}
async function attemptFetch(id){
 for(let attempt=0;attempt<4;attempt++){
  const delay=GAP_MS-(Date.now()-lastStarted);
  if(delay>0)await wait(delay);
  lastStarted=Date.now();
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),20000);
  let response;
  try{
   response=await fetch(API+'/anime/'+encodeURIComponent(id)+'/characters',{headers:{Accept:'application/json'},signal:controller.signal});
  }catch(error){
   clearTimeout(timeout);
   if(attempt===3)throw Error('Tenrai connection error: '+error.message);
   await wait(Math.min(15000,1800*(attempt+1)));continue;
  }
  clearTimeout(timeout);
  if(response.status===404)return [];
  if(response.status===429||response.status>=500){
   if(attempt===3)throw Error('Tenrai HTTP '+response.status+'; retry later.');
   const n=Number(response.headers.get('Retry-After'));
   await wait(Math.max(Math.min(Number.isFinite(n)?n*1000:0,60000),2000*(2**attempt)));
   continue;
  }
  if(!response.ok)throw Error('Tenrai HTTP '+response.status);
  return normalizeCharacters(await response.json());
 }
 throw Error('Tenrai character request failed.');
}
function fetchCharacters(id){
 const malId=Number(id);
 if(!Number.isSafeInteger(malId)||malId<=0)return Promise.reject(Error('Invalid MAL ID.'));
 const result=chain.then(()=>attemptFetch(malId));
 chain=result.catch(()=>{});
 return result;
}
// A new manual record may have no MAL ID. Only resolve a unique, exact title
// match; never attach characters from a guessed anime/season.
function titleKey(value){
 return String(value||'').normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
}
function animeTitles(a){
 return [a?.title,a?.title_english,a?.title_japanese,...(a?.title_synonyms||[]),...(a?.titles||[]).map(x=>x?.title)]
   .map(titleKey).filter(Boolean);
}
async function lookupExactAnime(title,releaseYear){
 const key=titleKey(title);
 if(!key)return null;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),16000);
 let data;
 try{
  const response=await fetch(API+'/anime?q='+encodeURIComponent(title)+'&limit=25',{headers:{Accept:'application/json'},signal:controller.signal});
  if(!response.ok)throw Error('Tenrai search HTTP '+response.status);
  data=(await response.json())?.data;
 }finally{clearTimeout(timer);}
 if(!Array.isArray(data))throw Error('Tenrai returned invalid search results.');
 const exact=data.filter(a=>Number.isSafeInteger(Number(a?.mal_id))&&Number(a.mal_id)>0&&animeTitles(a).includes(key));
 const year=Number(releaseYear)||0;
 const matches=year?exact.filter(a=>{
  const y=Number(a.year)||Number(String(a?.aired?.from||'').slice(0,4));
  return y===year;
 }):exact;
 const unique=new Map(matches.map(a=>[Number(a.mal_id),a]));
 return unique.size===1?[...unique.keys()][0]:null;
}
window.TECharacterAPIv23={normalizeCharacters,fetchCharacters,lookupExactAnime,titleKey,animeTitles};
// Shared lock prevents simultaneous large Tenrai jobs in this admin tab.
window.TEAdminJobV23={current:null,acquire(kind){if(this.current)return false;this.current=kind;return true;},release(kind){if(this.current===kind)this.current=null;}};
})();
