'use strict';
(async function(){
const $=id=>document.getElementById(id);
const client=supabase.createClient('https://tnavsfbolastevebukxl.supabase.co','sb_publishable_3FX_mPM-A6dIY-nQTtFZQg_5HPoWO9B');
let catalog=[],editing=null,page=0,busy=false,search='',episodeManager=null;
const ADMIN_PAGE_SIZE=48;
let animePage=0,animeTotal=0,animeRequestSerial=0,animeSearchTimer=null,episodeIndexPromise=null,bulkIndexPromise=null,seriesIndexPromise=null;
const say=t=>$('status').textContent=t;
let automaticId='';
function normalizeAnimeId(value){return String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80).replace(/-+$/g,'');}
$('title').addEventListener('input',()=>{if(!editing&&(!$('animeId').value||$('animeId').value===automaticId)){automaticId=normalizeAnimeId($('title').value);$('animeId').value=automaticId;}});
$('animeId').addEventListener('blur',()=>{if(!editing)$('animeId').value=normalizeAnimeId($('animeId').value);});
function safeURL(value){if(!value)return '';const u=new URL(value,location.href);if(!['https:','http:'].includes(u.protocol)&&!(u.protocol==='file:'&&location.protocol==='file:'&&!/^[a-z]+:/i.test(value)))throw Error('Please use an HTTP/HTTPS URL or a local file path.');return value;}
async function allowed(){const {data,error}=await client.rpc('site_is_admin');if(error)throw Error('Run ADMIN-SETUP.sql first. '+error.message);if(data!==true)throw Error('This account does not have administrator access.');}
async function action(fn){if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);try{await allowed();await fn()}catch(e){say(e.message||'Unable to complete this action.')}finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false)}}
function button(text,fn,danger=false){const b=document.createElement('button');b.type='button';b.textContent=text;if(danger)b.className='danger';b.onclick=()=>action(fn);return b;}
function row(title,subtitle,image){const r=document.createElement('article');r.className='row';if(image){const img=document.createElement('img');try{img.src=safeURL(image)}catch{}img.alt='';img.loading='lazy';r.append(img)}const t=document.createElement('div');t.className='text';const h=document.createElement('strong');h.textContent=title;const s=document.createElement('small');s.textContent=subtitle;t.append(h,document.createElement('br'),s);r.append(t);return r;}
// The public catalog may hold thousands of anime and large character arrays.
// NEVER load it with select('*') merely to open the Admin page.
async function allAnime(){
 const requestId=++animeRequestSerial;
 const term=$('animeSearch').value.trim().replace(/[%_,]/g,'').slice(0,120);
 const info=$('animeListInfo');
 info.textContent='Loading this page…';
 let query=client.from('site_anime')
   .select('id,title,image,episodes,mal_id,series_key',{count:'exact'})
   .order('created_at',{ascending:false}).order('id');
 if(term)query=query.ilike('title','%'+term+'%');
 const first=animePage*ADMIN_PAGE_SIZE;
 const result=await query.range(first,first+ADMIN_PAGE_SIZE-1);
 if(requestId!==animeRequestSerial)return;
 if(result.error)throw result.error;
 catalog=result.data||[];
 animeTotal=Number(result.count)||0;
 if(animePage>0 && animeTotal && first>=animeTotal){animePage=0;return allAnime();}
 renderAnime();
}
// This complete *lightweight* index is loaded only if the administrator opens
// Episodes. It does not contain characters, descriptions, or relations.
async function ensureEpisodeIndex(){
 if(!episodeManager)throw Error('Episode manager is not ready.');
 if(!episodeIndexPromise){
  episodeIndexPromise=(async()=>{
   const items=[];
   for(let offset=0;;offset+=500){
    const res=await client.from('site_anime').select('id,title').order('title').order('id').range(offset,offset+499);
    if(res.error)throw res.error;
    items.push(...(res.data||[]));
    if(!res.data||res.data.length<500)break;
   }
   episodeManager.setAnime(items);
   return items;
  })().catch(e=>{episodeIndexPromise=null;throw e;});
 }
 return episodeIndexPromise;
}
// Bulk import needs all existing MAL IDs, titles and relations to keep its
// duplicate protection and season order. Fetch this index ON DEMAND only.
async function getBulkCatalog(){
 if(!bulkIndexPromise){
  bulkIndexPromise=(async()=>{
   const items=[];
   for(let offset=0;;offset+=500){
    const res=await client.from('site_anime')
     .select('id,title,mal_id,mal_relations,start_date,series_key')
     .order('id').range(offset,offset+499);
    if(res.error)throw res.error;
    items.push(...(res.data||[]));
    if(!res.data||res.data.length<500)break;
   }
   return items;
  })().catch(e=>{bulkIndexPromise=null;throw e;});
 }
 return bulkIndexPromise;
}

function reset(){editing=null;automaticId='';HTMLFormElement.prototype.reset.call($('animeForm'));window.AnimeMeta.load();$('animeId').readOnly=false;$('save').textContent='Save anime';}
function renderAnime(){
 $('animeList').replaceChildren();
 for(const a of catalog){
  const r=row(a.title,`${a.id} · ${a.episodes} episodes${a.mal_id?' · MAL #'+a.mal_id:''}`,a.image);
  r.append(button('Edit',async()=>{
   // Pull the complete record only when editing it (including its characters).
   const response=await client.from('site_anime').select('*').eq('id',a.id).single();
   if(response.error)throw response.error;
   const record=response.data;
   editing=record.id;window.AnimeMeta.load(record);
   for(const [id,key] of Object.entries({animeId:'id',title:'title',poster:'image',category:'category',rating:'rating',episodes:'episodes',description:'description'}))$(id).value=record[key]??'';
   $('genres').value=(record.genres||[]).join(', ');
   $('links').value=Object.entries(record.episode_links||{}).sort((x,y)=>Number(x[0])-Number(y[0])).map(([n,u])=>`${n} | ${u}`).join('\n');
   $('posterFile').value='';$('animeId').readOnly=true;
   $('save').textContent='Save changes';$('animeForm').scrollIntoView({behavior:'smooth'});
  }));
  r.append(button('Episodes',async()=>{await ensureEpisodeIndex();await episodeManager.open(a.id);}));
  r.append(button('Delete',async()=>{
   if(!confirm(`Delete anime "${a.title}" and its episode links from the website?`))return;
   const result=await client.from('site_anime').delete().eq('id',a.id).select('id');
   if(result.error)throw result.error;
   if(!result.data?.length)throw Error('The record could not be deleted.');
   bulkIndexPromise=null;episodeIndexPromise=null;
   await allAnime();if(editing===a.id)reset();
   say('Anime and episode links deleted. Externally hosted video files were not deleted.');
  },true));
  $('animeList').append(r);
 }
 if(!catalog.length)$('animeList').textContent='No matching anime found.';
 const start=animeTotal?animePage*ADMIN_PAGE_SIZE+1:0;
 const finish=animeTotal?Math.min(animeTotal,(animePage+1)*ADMIN_PAGE_SIZE):0;
 $('animeListInfo').textContent=`Showing ${start}–${finish} of ${animeTotal.toLocaleString()} anime · Page ${animePage+1}`;
 $('animePrev').disabled=animePage===0;
 $('animeNext').disabled=finish>=animeTotal;
}
// Preserve the full series-key autocomplete, but avoid querying 4,500
// rows on page entry. Fetch only series keys if the admin uses that field.
$('seriesKey').addEventListener('focus',()=>{
 if(seriesIndexPromise)return;
 seriesIndexPromise=(async()=>{
  const keys=[];
  for(let offset=0;;offset+=500){
   const res=await client.from('site_anime').select('series_key').order('id').range(offset,offset+499);
   if(res.error)throw res.error;
   keys.push(...(res.data||[]));
   if(!res.data||res.data.length<500)break;
  }
  window.AnimeMeta.setCatalog(keys);
 })().catch(e=>{seriesIndexPromise=null; say('Could not load series suggestions: '+(e.message||e));});
});
$('animePrev').onclick=()=>action(async()=>{animePage=Math.max(0,animePage-1);await allAnime();});
$('animeNext').onclick=()=>action(async()=>{if((animePage+1)*ADMIN_PAGE_SIZE<animeTotal)animePage++;await allAnime();});

$('animeForm').onsubmit=e=>{e.preventDefault();action(async()=>{
const id=editing||normalizeAnimeId($('animeId').value.trim()||$('title').value),count=Number($('episodes').value);
$('animeId').value=id;
if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id)){$('animeId').focus();throw Error('Enter an English anime ID, e.g. mushoku-tensei. Use letters, numbers and hyphens.');}
if(!editing){const check=await client.from('site_anime').select('id').eq('id',id).maybeSingle();if(check.error)throw check.error;if(check.data){$('animeId').focus();throw Error('This anime ID already exists. Choose another ID or edit the existing anime.');}}
const links={};for(const line of $('links').value.split('\n').filter(l=>l.trim())){const sep=line.indexOf('|');if(sep<1)throw Error('Expected episode format: 1 | URL');const n=Number(line.slice(0,sep).trim());if(!Number.isInteger(n)||n<1||n>count||links[n])throw Error('Duplicate or out-of-range episode number.');const u=line.slice(sep+1).trim();if(!u)throw Error('Episode URL cannot be empty.');links[n]=safeURL(u);}
let image=safeURL($('poster').value.trim()),uploadedPath=null,committed=false;
try{const metadata=await window.AnimeMeta.read(client,id,safeURL);const file=$('posterFile').files[0];if(file){if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5242880)throw Error('Choose a JPG, PNG, or WebP file smaller than 5 MB.');uploadedPath=id+'/'+crypto.randomUUID()+'.'+({ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type]);const upload=await client.storage.from('anime-posters').upload(uploadedPath,file,{contentType:file.type});if(upload.error)throw upload.error;image=client.storage.from('anime-posters').getPublicUrl(uploadedPath).data.publicUrl;}
const payload={id,title:$('title').value.trim(),image,category:$('category').value.trim(),genres:$('genres').value.split(/[,،]/).map(g=>g.trim()).filter(Boolean),rating:Number($('rating').value),episodes:count,description:$('description').value.trim(),episode_links:links,...metadata};
// New entries get cast at save time, whether the form was filled manually or
// by Tenrai. Never replace manual entries or characters on existing anime.
let charactersNote='';
if(!editing && (!Array.isArray(payload.characters) || payload.characters.length===0)){
 const source=window.TECharacterAPIv23;
 if(!source)throw Error('Character importer is unavailable. Reload Admin and retry; the anime has not been saved.');
 say('Finding characters for this new anime on Tenrai…');
 let malId=Number(payload.mal_id)||0;
 if(!malId){
  try{malId=await source.lookupExactAnime(payload.title,payload.release_year)||0;}
  catch(err){throw Error('Tenrai search failed while finding characters. Nothing was saved. Please retry or add characters manually. '+(err?.message||''));}
 }
 if(malId){
  try{
   payload.characters=await source.fetchCharacters(malId);
   charactersNote=payload.characters.length?` Imported ${payload.characters.length} characters from Tenrai.`:' Tenrai has no characters for this anime yet.';
  }catch(err){
   throw Error('Character lookup failed for MAL #'+malId+'. Nothing was saved. Try Save Anime again. '+(err?.message||''));
  }
 }else if(!charactersNote){
  charactersNote=' Could not find a unique anime match. Add its MyAnimeList ID or use Import Anime from Tenrai for automatic characters.';
 }
}
const q=editing?client.from('site_anime').update(payload).eq('id',editing):client.from('site_anime').insert(payload);const result=await q.select('id').single();if(result.error){if(result.error.code==='23505')throw Error('This anime ID or MyAnimeList ID already exists. Edit the existing anime instead.');throw result.error;}committed=true;bulkIndexPromise=null;episodeIndexPromise=null;window.AnimeMeta.commit();reset();await allAnime();say('Anime saved. It will appear on the anime page after you open or refresh it.'+charactersNote);
}catch(e){if(!committed)await window.AnimeMeta.rollback(client);if(uploadedPath&&!committed)await client.storage.from('anime-posters').remove([uploadedPath]);throw e;}
})};
async function loadWalls(){let q=client.from('wallpapers').select('id,title,user_id,category,file_path,created_at',{count:'exact'}).order('created_at',{ascending:false}).order('id');if(search)q=q.ilike('title','%'+search.replace(/[%_]/g,'')+'%');const result=await q.range(page*24,page*24+23);if(result.error)throw result.error;$('wallList').replaceChildren();$('pageNumber').textContent=` Page ${page+1} · ${result.count} wallpapers `;
for(const w of result.data){const image=w.file_path?client.storage.from('wallpapers').getPublicUrl(w.file_path).data.publicUrl:'';const r=row(w.title||'Untitled',`User: ${w.user_id} · ${w.category||''}`,image);r.append(button('Delete wallpaper',async()=>{if(!confirm(`Delete wallpaper "${w.title}" uploaded by this user? This cannot be undone.`))return;const result=await client.from('wallpapers').delete().eq('id',w.id).select('id');if(result.error)throw result.error;if(!result.data.length)throw Error('Could not delete the record. Check admin permissions.');say('Wallpaper removed from the website.');if(w.file_path)await removeFile(w.file_path);await loadWalls();},true));$('wallList').append(r)}if(!result.data.length)$('wallList').textContent='No wallpapers found on this page.';
}
async function removeFile(path){const res=await client.storage.from('wallpapers').remove([path]);if(res.error||!res.data?.length){const box=document.createElement('div');box.textContent='Wallpaper removed from the list, but its image file could not be deleted. ';box.append(button('Retry deleting file',async()=>{const r=await client.storage.from('wallpapers').remove([path]);if(r.error)throw r.error;if(!r.data?.length)throw Error('File not found, or you do not have permission to remove it.');box.remove();}));$('cleanup').append(box);}}
$('reset').onclick=()=>{if(!busy)reset()};
$('animeSearch').oninput=()=>{
 clearTimeout(animeSearchTimer);animePage=0;
 animeSearchTimer=setTimeout(()=>{allAnime().catch(e=>say('Anime search failed: '+(e.message||e)));},300);
};
$('animeTab').onclick=()=>{$('animeSection').hidden=false;$('wallSection').hidden=true;$('episodeSection').hidden=true};$('episodeTab').onclick=()=>action(async()=>{if(!episodeManager)throw Error('Episode editor did not load. Reload Admin.');await ensureEpisodeIndex();await episodeManager.open()});$('wallTab').onclick=()=>action(async()=>{$('animeSection').hidden=true;$('episodeSection').hidden=true;$('wallSection').hidden=false;await loadWalls()});
$('wallSearchForm').onsubmit=e=>{e.preventDefault();action(async()=>{page=0;search=$('wallSearch').value.trim();await loadWalls()})};$('prev').onclick=()=>action(async()=>{page=Math.max(0,page-1);await loadWalls()});$('next').onclick=()=>action(async()=>{if($('wallList').children.length<24)return;page++;await loadWalls()});
client.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT'){$('panel').hidden=true;say('You have been signed out.');}});
try{const session=await client.auth.getSession();if(!session.data.session){say('Sign in with your admin account at login.html, then return to this page.');return;}await allowed();$('panel').hidden=false;let episodeError='';try{if(!window.EpisodeAdmin)throw Error('Episode editor did not load. Upload episode-admin-recovery-v3.js and reload.');episodeManager=window.EpisodeAdmin.create({client,action,say});}catch(e){episodeError=e.message;}window.TE_ADMIN_API={client,allowed,reload:async()=>{bulkIndexPromise=null;episodeIndexPromise=null;await allAnime();},getCatalog:()=>catalog.slice(),getBulkCatalog,getSession:()=>client.auth.getSession()};
 say(episodeError||'Welcome! Your account has administrator access.');
 // Let the admin UI become usable before loading its first (small) page.
 window.dispatchEvent(new CustomEvent('te-admin-ready'));
 allAnime().catch(e=>say('Could not load the anime list: '+(e.message||e)));}catch(e){say(e.message);}
})();
