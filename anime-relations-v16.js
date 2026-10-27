/* The Everything / v16: relationships from stored Tenrai metadata.
 * No API calls on visitors' browsers; only read the existing catalog.
 */
(async()=>{
'use strict';
if(!window.ANIME_READY)return;
await window.ANIME_READY;
const catalog=Array.isArray(window.ANIME_DATA)?window.ANIME_DATA:[];
const id=new URLSearchParams(location.search).get('id')||'attack-on-titan';
const current=catalog.find(a=>String(a.id)===id);
if(!current)return;
const key=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const malMap=new Map(),titleMap=new Map();
for(const anime of catalog){
 if(Number(anime.mal_id)>0)malMap.set(Number(anime.mal_id),anime);
 const k=key(anime.title);if(k&&!titleMap.has(k))titleMap.set(k,anime);
}
const relations=Array.isArray(current.mal_relations)?current.mal_relations:[];
const matches=[];
function add(relation,entry){
 const malId=Number(entry?.mal_id)||0;
 if(!malId)return;
 let local=malMap.get(malId)||titleMap.get(key(entry.name||''));
 if(local?.id===current.id)return;
 matches.push({relation:String(relation||'Related').trim()||'Related',malId,name:String(entry.name||local?.title||'Related anime'),local});
}
for(const group of relations){for(const entry of Array.isArray(group.entries)?group.entries:[]){add(group.relation,entry);}}
// Existing manually added anime may not have a MAL ID. Detect direct reverse
// links by the verified title in an imported anime's relations instead.
const reverse={sequel:'Prequel',prequel:'Sequel'};
for(const other of catalog){
 if(other.id===current.id||!Array.isArray(other.mal_relations))continue;
 for(const group of other.mal_relations){
  for(const entry of Array.isArray(group.entries)?group.entries:[]){
   const identifiesCurrent=(Number(current.mal_id)>0&&Number(entry.mal_id)===Number(current.mal_id))||key(entry.name)===key(current.title);
   if(!identifiesCurrent)continue;
   const label=String(group.relation||'Related').trim();
   const newLabel=reverse[label.toLowerCase()]||label;
   add(newLabel,{mal_id:Number(other.mal_id),name:other.title});
  }
 }
}
const unique=new Map();
for(const r of matches){const k=(r.local?.id||'mal-'+r.malId)+'|'+r.relation.toLowerCase();if(!unique.has(k))unique.set(k,r);}
const records=[...unique.values()];
// The format is useful even if this title has no known relations.
const facts=document.getElementById('animeFacts');
if(facts&&current.anime_type){const item=document.createElement('div');const label=document.createElement('small');label.textContent='ANIME FORMAT';const data=document.createElement('strong');data.textContent=String(current.anime_type);item.append(label,data);facts.append(item);}
if(!records.length)return;
const order=['Prequel','Sequel','Side story','Spin-off','Alternative version','Alternative setting','Remake','Summary','Full story','Parent story','Adaptation','Other'];
const priority=rel=>{const idx=order.findIndex(x=>x.toLowerCase()===rel.toLowerCase());return idx===-1?100:idx;};
records.sort((a,b)=>priority(a.relation)-priority(b.relation)||a.relation.localeCompare(b.relation)||String(a.local?.start_date||'').localeCompare(String(b.local?.start_date||''))||a.name.localeCompare(b.name));
const section=document.createElement('section');section.className='te-rel-v16 detail-features';section.id='teAnimeRelations';
const title=document.createElement('h2');title.textContent='Related Anime & Adaptations';section.append(title);
const subtitle=document.createElement('p');subtitle.textContent='Seasons, specials, side stories, remakes and alternate versions, as listed by the source. Links marked “Not in library” open MyAnimeList.';section.append(subtitle);
const collection=document.createElement('div');collection.className='te-rel-list';section.append(collection);
const grouped=new Map();for(const record of records){if(!grouped.has(record.relation))grouped.set(record.relation,[]);grouped.get(record.relation).push(record);}
const safeImage=value=>{try{const url=new URL(String(value||''),location.href);return url.protocol==='http:'||url.protocol==='https:'?url.href:'';}catch{return '';}};
for(const [type,items] of grouped){
 const group=document.createElement('div');group.className='te-rel-group';const heading=document.createElement('h3');heading.textContent=type;group.append(heading);
 const cards=document.createElement('div');cards.className='te-rel-cards';
 for(const relation of items){
  const local=relation.local,link=document.createElement('a');link.className='te-rel-card'+(local?' te-rel-available':' te-rel-external');
  link.href=local?'anime-details.html?id='+encodeURIComponent(local.id):'https://myanimelist.net/anime/'+relation.malId;
  if(!local){link.target='_blank';link.rel='noopener noreferrer';}
  const image=safeImage(local?.image);
  if(image){const img=document.createElement('img');img.loading='lazy';img.decoding='async';img.src=image;img.alt='';link.append(img);}
  else{const placeholder=document.createElement('span');placeholder.className='te-rel-placeholder';placeholder.textContent='✦';link.append(placeholder);}
  const body=document.createElement('span');body.className='te-rel-copy';
  const name=document.createElement('strong');name.textContent=local?.title||relation.name;
  const caption=document.createElement('small');caption.textContent=local?`${local.anime_type||'Anime'} · In library`:'Not in library · View on MAL ↗';
  body.append(name,caption);link.append(body);cards.append(link);
 }
 group.append(cards);collection.append(group);
}
const anchor=document.getElementById('relatedSection')||document.querySelector('.episodes-section');
if(anchor)anchor.insertAdjacentElement('afterend',section);
else document.getElementById('animePage')?.append(section);
})();
