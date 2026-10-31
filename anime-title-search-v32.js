/* The Everything v32: multilingual anime titles. No credentials or database writes. */
(()=>{
'use strict';
const API='https://api.tenrai.org/v1';
const cache=new Map();
let supportedPromise=null;
function supportsAliases(client){
 if(!supportedPromise)supportedPromise=Promise.resolve(client.from('site_anime').select('title_aliases').limit(1))
   .then(({error})=>!error).catch(()=>false);
 return supportedPromise;
}
function key(value){return String(value||'').normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu,'');}
function fromTenrai(a){
 const values=[a?.title,a?.title_english,a?.title_japanese,...(Array.isArray(a?.title_synonyms)?a.title_synonyms:[]),...(Array.isArray(a?.titles)?a.titles.map(x=>x?.title):[])];
 const seen=new Set(),out=[];
 for(const item of values){const value=String(item||'').trim().slice(0,200),k=key(value);if(!k||seen.has(k))continue;seen.add(k);out.push(value);if(out.length===35)break;}
 return out;
}
function missingColumn(error){return Boolean(error&&(String(error.code)==='42703'||/search_titles|title_aliases/i.test(String(error.message||''))));}
function cleanQuery(value){return String(value||'').normalize('NFKC').trim().replace(/[(),.*%{}\\]/g,' ').replace(/\s+/g,' ').slice(0,100).trim();}
async function lookupMalIds(query){
 const term=cleanQuery(query),k=key(term);
 if(!k||term.length<2)return [];
 if(cache.has(k))return cache.get(k);
 const job=(async()=>{
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),5500);
  try{
   const resp=await fetch(API+'/anime?q='+encodeURIComponent(term)+'&limit=30',{headers:{Accept:'application/json'},signal:c.signal});
   if(!resp.ok)return [];
   const data=(await resp.json())?.data;
   if(!Array.isArray(data))return [];
   // Verify the source's name is relevant to the query; never map a random
   // similarly-ranked anime or import any content from the discovery result.
   return [...new Set(data.filter(a=>fromTenrai(a).some(t=>key(t).includes(k)||k.includes(key(t))))
     .map(a=>Number(a.mal_id)).filter(id=>Number.isSafeInteger(id)&&id>0))].slice(0,30);
  }catch{return [];}finally{clearTimeout(timer);}
 })();
 cache.set(k,job);
 if(cache.size>25)cache.delete(cache.keys().next().value);
 return job;
}
window.TETitleSearchV32={key,fromTenrai,missingColumn,cleanQuery,lookupMalIds,supportsAliases};
})();
