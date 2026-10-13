/* Catalog is authoritative in Supabase. An empty catalog stays empty. */
window.ANIME_DATA=[];
window.ANIME_READY=(async function(){
 const base='https://tnavsfbolastevebukxl.supabase.co/rest/v1/site_anime';
 const key='sb_publishable_3FX_mPM-A6dIY-nQTtFZQg_5HPoWO9B';
 const rows=[];
 try {
  for(let offset=0;;offset+=500){
   const response=await fetch(base+'?select=*&order=created_at.desc,id.asc&limit=500&offset='+offset,{headers:{apikey:key},signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw Error('Catalog unavailable ('+response.status+')');
   const batch=await response.json();rows.push(...batch);if(batch.length<500)break;
  }
  window.ANIME_DATA=rows.map(row=>({...row,episodeLinks:row.episode_links||{}}));
 }catch(error){
  console.error(error);window.ANIME_LOAD_ERROR=true;
  const note=document.createElement('p');note.setAttribute('role','alert');note.textContent='Could not load anime. Please check your connection and reload.';note.style.cssText='padding:16px;text-align:center;color:#f6c8a3;background:#251d25';document.body.prepend(note);
 }
 return window.ANIME_DATA;
})();
