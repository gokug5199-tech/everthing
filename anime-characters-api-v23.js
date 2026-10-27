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
window.TECharacterAPIv23={normalizeCharacters,fetchCharacters};
// Shared lock prevents simultaneous large Tenrai jobs in this admin tab.
window.TEAdminJobV23={current:null,acquire(kind){if(this.current)return false;this.current=kind;return true;},release(kind){if(this.current===kind)this.current=null;}};
})();
