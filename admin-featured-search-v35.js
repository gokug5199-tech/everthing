/* The Everything v35: small, independent Supabase anime pickers for featured sections.
   Never fetch the full anime catalog into a <select>. */
(function(){
 'use strict';
 const MAX=24;
 const $=id=>document.getElementById(id);
 const clean=value=>String(value||'').normalize('NFKC').trim().replace(/[(),.*%{}\\]/g,' ').replace(/\s+/g,' ').slice(0,100).trim();
 const missingSearchColumn=error=>Boolean(error && (/search_titles/i.test(String(error.message||'')) || String(error.code)==='42703'));
 function create({db,inputId,buttonId,selectId,statusId,onSelect}){
  const input=$(inputId),button=$(buttonId),select=$(selectId),status=$(statusId);
  let serial=0,timer=null;
  function message(value){status.textContent=value;}
  function reset(value='Search above to find an anime.'){
   clearTimeout(timer);button.disabled=false;serial++;
   select.replaceChildren(new Option('Choose an anime…',''));
   if(onSelect)onSelect('');
   message(value);
  }
  async function queryDb(term){
   const pattern='%'+term.replace(/[%_]/g,'')+'%';
   let result=await db.from('site_anime').select('id,title').ilike('search_titles',pattern).order('title').limit(MAX);
   if(result.error && missingSearchColumn(result.error)){
    result=await db.from('site_anime').select('id,title').ilike('title',pattern).order('title').limit(MAX);
   }
   if(result.error)throw result.error;
   let rows=result.data||[];
   // Support original Japanese/Romaji titles in older imports via the v32 helper.
   if(!rows.length && term.length>=3 && window.TETitleSearchV32?.lookupMalIds){
    const ids=await window.TETitleSearchV32.lookupMalIds(term);
    if(ids.length){
     const fallback=await db.from('site_anime').select('id,title').in('mal_id',ids).order('title').limit(MAX);
     if(!fallback.error)rows=fallback.data||[];
    }
   }
   return rows;
  }
  async function searchNow(){
   clearTimeout(timer);
   const term=clean(input.value);
   const request=++serial;
   if([...term].length<2){reset('Enter at least 2 characters to search the entire library.');return;}
   button.disabled=true;
   message('Searching…');
   try{
    const rows=await queryDb(term);
    if(request!==serial)return;
    select.replaceChildren(new Option(rows.length?'Choose an anime from the results…':'No matches found',''));
    for(const row of rows)select.add(new Option(row.title||row.id,row.id));
    message(!rows.length?'No matching anime. Try another English or Japanese title.':`Showing ${rows.length}${rows.length===MAX?'+':''} result${rows.length===1?'':'s'}. Refine the search to narrow it down.`);
    if(onSelect)onSelect('');
   }catch(error){
    if(request===serial){reset('Search failed: '+(error.message||String(error)));}
   }finally{if(request===serial)button.disabled=false;}
  }
  button.addEventListener('click',searchNow);
  input.addEventListener('input',()=>{
   clearTimeout(timer);
   serial++;button.disabled=false;
   select.replaceChildren(new Option('Choose an anime…',''));
   if(onSelect)onSelect('');
   const term=clean(input.value);
   if([...term].length<2){message('Enter at least 2 characters to search the entire library.');return;}
   message('Type to search…');
   timer=setTimeout(searchNow,330);
  });
  input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();searchNow();}});
  select.addEventListener('change',()=>{if(onSelect)onSelect(select.value);});
  reset();
  return {searchNow,reset};
 }
 window.TEFeaturedSearchV35={create,clean};
})();
