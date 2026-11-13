/* The Everything v35: featured releases, on-demand anime and episode search. */
(function(){
'use strict';
const $=id=>document.getElementById(id),key='sb_publishable_3FX_mPM-A6dIY-nQTtFZQg_5HPoWO9B';
if(!$('featuredTab')||!window.supabase||!window.TEFeaturedSearchV35)return;
const db=supabase.createClient('https://tnavsfbolastevebukxl.supabase.co',key);
const EPISODE_PAGE=60;
let selected=[],nameMap=new Map(),busy=false,episodeSerial=0,episodeOffset=0,hasMoreEpisodes=false,exactEpisode=null;
const status=msg=>{$('featuredStatus').textContent=msg;};
const name=id=>nameMap.get(id)||id;
function opt(select,items,empty){select.replaceChildren(new Option(empty,''));for(const item of items)select.add(new Option(item.label,item.value));}
async function admin(){const r=await db.rpc('site_is_admin');if(r.error||r.data!==true)throw Error('Administrator access required.');}
async function loadNames(){
 const ids=[...new Set(selected.map(item=>item.anime_id))];
 nameMap=new Map();
 if(!ids.length)return;
 for(let i=0;i<ids.length;i+=50){
  const r=await db.from('site_anime').select('id,title').in('id',ids.slice(i,i+50));
  if(r.error)throw r.error;
  for(const a of r.data||[])nameMap.set(a.id,a.title);
 }
}
async function load(){
 await admin();
 const f=await db.from('site_featured').select('*').order('position').order('created_at');
 if(f.error)throw Error(f.error.message+' — check Latest sections setup.');
 selected=f.data||[];
 await loadNames();render();
}
function clearEpisodes(text='Choose an anime first.'){
 episodeSerial++;episodeOffset=0;hasMoreEpisodes=false;exactEpisode=null;
 $('featuredEpisodeNumberSearch').value='';
 opt($('featuredEpisodeSelect'),[],text);
 $('featuredEpisodeMore').hidden=true;
 $('featuredEpisodeHint').textContent='Select an anime to load its saved episodes.';
}
async function loadEpisodes({append=false,exact=null}={}){
 const id=$('featuredEpisodeAnime').value;
 if(!id){clearEpisodes();return;}
 const request=++episodeSerial;
 if(!append){episodeOffset=0;exactEpisode=exact;opt($('featuredEpisodeSelect'),[],'Loading episodes…');}
 $('featuredEpisodeHint').textContent='Loading saved episodes…';
 $('featuredEpisodeMore').hidden=true;
 try{
  let q=db.from('site_episodes').select('season_number,episode_number,title').eq('anime_id',id)
   .order('season_number').order('episode_number');
  if(exactEpisode!==null){q=q.eq('episode_number',exactEpisode).limit(30);}
  else q=q.range(episodeOffset,episodeOffset+EPISODE_PAGE-1);
  const response=await q;
  if(request!==episodeSerial||id!==$('featuredEpisodeAnime').value)return;
  if(response.error)throw response.error;
  const rows=response.data||[];
  const selector=$('featuredEpisodeSelect');
  if(!append)opt(selector,[],rows.length?'Select a saved episode':'No saved episodes found');
  const previous=append?selector.value:'';
  for(const e of rows){selector.add(new Option(`Season ${e.season_number} · Episode ${e.episode_number}${e.title?' — '+e.title:''}`,e.season_number+':'+e.episode_number));}
  if(previous)selector.value=previous;
  if(exactEpisode===null){episodeOffset+=rows.length;hasMoreEpisodes=rows.length===EPISODE_PAGE;}
  else hasMoreEpisodes=false;
  $('featuredEpisodeMore').hidden=!hasMoreEpisodes;
  $('featuredEpisodeHint').textContent=!rows.length?'No episodes matched.':(exactEpisode===null?`Loaded ${episodeOffset} episodes. ${hasMoreEpisodes?'Load more to see older/later episodes.':''}`:`Found ${rows.length} episode${rows.length===1?'':'s'} matching number ${exactEpisode}.`);
 }catch(error){if(request===episodeSerial){$('featuredEpisodeHint').textContent='Could not load episodes: '+(error.message||error);if(!append)opt($('featuredEpisodeSelect'),[],'Could not load episodes');}}
}
function row(container,item,kind,list){
 const div=document.createElement('div');div.className='featured-row';const span=document.createElement('span');
 span.textContent=kind==='anime'?name(item.anime_id):`${name(item.anime_id)} · S${item.season_number} E${item.episode_number}`;div.append(span);
 for(const [txt,delta] of [['↑',-1],['↓',1]]){
  const b=document.createElement('button');b.type='button';b.textContent=txt;b.title=txt==='↑'?'Move up':'Move down';
  b.disabled=list.indexOf(item)+delta<0||list.indexOf(item)+delta>=list.length;
  b.onclick=()=>run(async()=>{
   const i=list.indexOf(item),other=list[i+delta],a=item.position,next=other.position;
   const result=await Promise.all([
    db.from('site_featured').update({position:next}).match({kind:item.kind,anime_id:item.anime_id,season_number:item.season_number,episode_number:item.episode_number}),
    db.from('site_featured').update({position:a}).match({kind:other.kind,anime_id:other.anime_id,season_number:other.season_number,episode_number:other.episode_number})
   ]);
   for(const r of result)if(r.error)throw r.error;
  });div.append(b);
 }
 const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';
 remove.onclick=()=>run(async()=>{
  const r=await db.from('site_featured').delete().match({kind:item.kind,anime_id:item.anime_id,season_number:item.season_number,episode_number:item.episode_number});if(r.error)throw r.error;
 });div.append(remove);container.append(div);
}
function render(){
 for(const kind of ['anime','episode']){
  const box=$(kind==='anime'?'featuredAnimeList':'featuredEpisodeList');box.replaceChildren();
  const items=selected.filter(x=>x.kind===kind);
  items.forEach(x=>row(box,x,kind,items));
  if(!items.length)box.textContent='No featured items yet.';
 }
}
async function run(fn){
 if(busy)return;busy=true;
 try{await admin();await fn();await load();status('Latest sections updated. Refresh the public site to see your changes.');}
 catch(err){status(err.message||'Could not save changes.');}
 finally{busy=false;}
}
async function add(kind){
 const id=$(kind==='anime'?'featuredAnimeSelect':'featuredEpisodeAnime').value;
 if(!id)return status('Search for an anime, then select it from the results.');
 let season_number=0,episode_number=0;
 if(kind==='episode'){
  const raw=$('featuredEpisodeSelect').value;
  if(!raw)return status('Select a saved episode first.');
  [season_number,episode_number]=raw.split(':').map(Number);
 }
 await run(async()=>{
  if(selected.some(x=>x.kind===kind&&x.anime_id===id&&x.season_number===season_number&&x.episode_number===episode_number))throw Error('Already featured.');
  const position=Math.max(0,...selected.filter(x=>x.kind===kind).map(x=>x.position))+10;
  const r=await db.from('site_featured').insert({kind,anime_id:id,season_number,episode_number,position});if(r.error)throw r.error;
 });
}
window.TEFeaturedSearchV35.create({db,inputId:'featuredAnimeSearch',buttonId:'featuredAnimeSearchButton',selectId:'featuredAnimeSelect',statusId:'featuredAnimeSearchStatus'});
window.TEFeaturedSearchV35.create({db,inputId:'featuredEpisodeAnimeSearch',buttonId:'featuredEpisodeAnimeSearchButton',selectId:'featuredEpisodeAnime',statusId:'featuredEpisodeAnimeStatus',onSelect:()=>clearEpisodes()});
$('featuredEpisodeMore').onclick=()=>loadEpisodes({append:true});
$('featuredEpisodeAnime').addEventListener('change',()=>loadEpisodes());
$('featuredEpisodeSearchButton').onclick=()=>{
 const value=$('featuredEpisodeNumberSearch').value.trim();
 if(!value)return loadEpisodes();
 const n=Number(value);
 if(!Number.isInteger(n)||n<1||n>2000){$('featuredEpisodeHint').textContent='Enter an episode number between 1 and 2000.';return;}
 return loadEpisodes({exact:n});
};
$('featuredEpisodeNumberSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('featuredEpisodeSearchButton').click();}});
$('featureAnimeAdd').onclick=()=>add('anime');
$('featureEpisodeAdd').onclick=()=>add('episode');
$('featuredTab').onclick=()=>{
 for(const id of ['animeSection','wallSection','episodeSection'])$(id).hidden=true;
 $('featuredSection').hidden=false;
 load().catch(err=>status('Could not load Latest sections: '+(err.message||err)));
};
for(const id of ['animeTab','episodeTab','wallTab']){$(id).addEventListener('click',()=>{$('featuredSection').hidden=true;});}
})();
