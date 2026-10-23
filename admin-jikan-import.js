/* The Everything: Jikan anime search and reviewed import. No Supabase credentials or writes here. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
// Jikan public API shut down on 2026-10-01; Tenrai uses Jikan-v4-compatible JSON.
const api='https://api.tenrai.org/v1';
const section=$('animeSection'),form=$('animeForm');
if(!section||!form||!window.AnimeMeta)return;
const wrapper=document.createElement('div');wrapper.className='jikan-import';
wrapper.innerHTML=`<div class="jikan-heading"><div><h3>Import Anime from Tenrai</h3><p>Search MyAnimeList information, select the correct season, automatically load its characters, review the fields, then click <strong>Save anime</strong>. This does not import episodes or videos.</p></div><a href="https://tenrai.org/" target="_blank" rel="noopener noreferrer">About Tenrai</a></div><form id="jikanSearchForm" class="jikan-search"><label for="jikanQuery">Anime name / MyAnimeList ID</label><div><input id="jikanQuery" placeholder="e.g. Mushoku Tensei" autocomplete="off" minlength="2" maxlength="120" required><button type="submit" id="jikanSearchButton">Search</button></div></form><p id="jikanMessage" role="status" aria-live="polite"></p><div id="jikanResults" class="jikan-results"></div><div id="jikanPreview" hidden></div>`;
section.insertBefore(wrapper,form);
const results=$('jikanResults'),preview=$('jikanPreview'),message=$('jikanMessage');
let latestResults=[],chosen=null,requestNo=0;
const setMessage=t=>{message.textContent=t||'';};
const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!=null)n.textContent=String(txt);return n;};
function imageOf(a){const u=a?.images?.webp?.large_image_url||a?.images?.jpg?.large_image_url||a?.images?.jpg?.image_url||'';try{const parsed=new URL(u);return parsed.protocol==='https:'?u:'';}catch{return '';}}
function clearPreview(){chosen=null;preview.hidden=true;preview.replaceChildren();}
async function get(path){let res;try{res=await fetch(api+path,{headers:{'Accept':'application/json'}});}catch{throw Error('Cannot reach Tenrai. Check whether the API opens directly in your browser, or check the browser console (F12) for CORS/network errors.');}if(res.status===429)throw Error('Tenrai rate limit reached. Try again shortly.');if(!res.ok)throw Error('Tenrai returned HTTP '+res.status+'. Try again later.');return res.json();}
const slug=s=>String(s||'anime').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,65).replace(/-+$/g,'')||'anime';
const date=v=>/^\d{4}-\d\d-\d\d/.test(v||'')?v.slice(0,10):'';
function age(v){v=String(v||'');if(/^G\s/.test(v))return 'All ages';if(/^PG-13/.test(v))return '13+';if(/^R\+/.test(v))return '18+';if(/^R\s/.test(v))return '16+';if(/^PG\s/.test(v))return '7+';return 'Not rated';}
function status(v){return ({'Currently Airing':'Ongoing','Finished Airing':'Completed','Not yet aired':'Upcoming'})[v]||'Unknown';}
function source(v){const value=String(v||'');return ['Manga','Light Novel','Web Novel','Novel','Original','Game','Visual Novel'].find(x=>x.toLowerCase()===value.toLowerCase())||'Other';}
function season(v){return ({winter:'Winter',spring:'Spring',summer:'Summer',fall:'Fall'})[String(v||'').toLowerCase()]||'Not announced';}
function day(v){const m=String(v||'').match(/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/i);if(!m)return 'Not announced';return m[0][0].toUpperCase()+m[0].slice(1).toLowerCase();}
function createCard(a){const card=el('article','jikan-result');const pic=imageOf(a);if(pic){const img=el('img');img.src=pic;img.alt='';img.loading='lazy';card.append(img);}const details=el('div','jikan-result-info');details.append(el('strong','',a.title_english||a.title||'Untitled'),el('small','',`${a.title||''} · ${a.year||'?'} · ${a.type||'?'} · ${a.episodes??'?'} episodes · MAL #${a.mal_id}`));const b=el('button','','Preview & import');b.type='button';b.onclick=()=>choose(a.mal_id);details.append(b);card.append(details);return card;}
$('jikanSearchForm').onsubmit=async e=>{e.preventDefault();const q=$('jikanQuery').value.trim();if(q.length<2)return;const n=++requestNo;results.replaceChildren();clearPreview();setMessage('Searching anime…');$('jikanSearchButton').disabled=true;try{const json=await get(/^\d+$/.test(q)?`/anime/${encodeURIComponent(q)}`:`/anime?q=${encodeURIComponent(q)}&limit=20`);if(n!==requestNo)return;latestResults=Array.isArray(json.data)?json.data:(json.data?[json.data]:[]);latestResults.forEach(a=>results.append(createCard(a)));setMessage(latestResults.length?`${latestResults.length} result(s). Check the season and release year before importing.`:'No results. Try a different title.');}catch(err){setMessage(err.message);}finally{$('jikanSearchButton').disabled=false;}};
async function choose(id){
const n=++requestNo;
clearPreview();
setMessage('Loading anime information and characters…');
try{
  const [animeResult,charactersResult]=await Promise.allSettled([
    get(`/anime/${encodeURIComponent(id)}/full`),
    get(`/anime/${encodeURIComponent(id)}/characters`)
  ]);
  if(n!==requestNo)return;
  if(animeResult.status!=='fulfilled')throw animeResult.reason;
  const data=animeResult.value?.data;
  if(!data)throw Error('No anime details returned.');
  let chars=[];
  let charWarning='';
  if(charactersResult.status==='fulfilled'){
    const raw=charactersResult.value?.data;
    if(Array.isArray(raw)){
      chars=raw.slice(0,30).map(x=>({
        name:x.character?.name||'',
        role:x.role||'Supporting',
        image:imageOf(x.character)
      })).filter(x=>x.name);
      if(!chars.length)charWarning='No characters were returned for this anime.';
    }else{charWarning='Character response was incomplete.';}
  }else{
    charWarning='Could not load characters: '+String(charactersResult.reason?.message||'unknown error');
  }
  chosen={...data,_characters:chars};
  preview.hidden=false;
  const head=el('div','jikan-preview-head');
  const img=imageOf(data);
  if(img){const pic=el('img');pic.src=img;pic.alt='Anime poster';head.append(pic);}
  const copy=el('div');
  copy.append(
    el('h3','',data.title_english||data.title),
    el('p','',`${data.title||''} • ${data.type||''} • ${data.year||'Year unknown'} • MAL ID: ${id}`),
    el('p','',`${data.status||'Unknown status'} · ${data.episodes??'Unknown'} episodes · ${(data.studios||[]).map(s=>s.name).join(', ')||'Studio unknown'}`),
    el('p','',`${chars.length} characters ready for import${charWarning?' (check warning below)':''}`)
  );
  head.append(copy);preview.append(head);
  preview.append(el('p','jikan-hint','Preview only. Existing episodes and anime records will not be changed. Images remain linked to external providers/MAL; review image usage rights before publishing.'));
  const button=el('button','','Fill admin form (anime + characters)');
  button.type='button';button.onclick=()=>fill(chosen);
  preview.append(button);
  setMessage(charWarning?`Anime information loaded. ${charWarning} You can still fill the form.`:`Anime information and ${chars.length} characters ready. Click Fill admin form, review, then Save anime.`);
  preview.scrollIntoView({behavior:'smooth',block:'nearest'});
}catch(err){if(n===requestNo)setMessage(err?.message||'Could not load anime details.');}
}
function fill(a){// Reset any edit state before touching form, so Save always inserts a new record.
$('reset').click();const title=a.title_english||a.title||'Anime';
const assign=(id,value)=>{if($(id))$(id).value=value??'';};
assign('animeId',`${slug(title).slice(0,65)}-mal-${a.mal_id}`.slice(0,80));assign('title',title);assign('poster',imageOf(a));assign('posterFile','');
const genres=[...(a.genres||[]),...(a.explicit_genres||[]),...(a.themes||[]),...(a.demographics||[])].map(x=>x.name).filter(Boolean);assign('category',slug((a.genres||[])[0]?.name||'anime'));assign('genres',[...new Set(genres)].join(', '));assign('rating',Math.max(0,Math.min(10,Number(a.score)||0)));assign('episodes',Number.isInteger(a.episodes)&&a.episodes>=0?a.episodes:0);assign('description',(a.synopsis||'').trim());
window.AnimeMeta.load({studio:(a.studios||[]).map(s=>s.name).join(', ').slice(0,200),release_season:season(a.season),release_year:a.year||'',start_date:date(a.aired?.from),end_date:date(a.aired?.to),broadcast_day:day(a.broadcast?.day),age_rating:age(a.rating),airing_status:status(a.status),source_type:source(a.source),series_key:'',season_order:1,season_label:a.title||'',characters:a._characters||[]});
setMessage(`Imported ${title} and ${(a._characters||[]).length} characters into the form — NOT saved yet. Review all fields (especially Series key, season order, poster, score and episode count), then click Save anime.`);form.scrollIntoView({behavior:'smooth',block:'start'});}
})();
