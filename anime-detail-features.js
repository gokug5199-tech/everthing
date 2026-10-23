(async function(){
'use strict';await window.ANIME_READY;
const a=(window.ANIME_DATA||[]).find(x=>x.id===(new URLSearchParams(location.search).get('id')||'attack-on-titan'));if(!a)return;
const el=(t,c,text)=>{const e=document.createElement(t);if(c)e.className=c;if(text!==undefined)e.textContent=text;return e;};
const src=window.AnimeLibrary.safeImage(a.image);if(src){const bg=el('div','anime-backdrop');bg.setAttribute('aria-hidden','true');const img=el('img');img.src=src;img.alt='';bg.append(img);document.body.prepend(bg);}
const facts=document.getElementById('animeFacts');for(const [label,value] of [['AGE RATING',a.age_rating||'Not rated'],['AIRING STATUS',a.airing_status||'Unknown'],['SOURCE',a.source_type||'Unknown'],['STUDIO',a.studio||'Not announced']]){const box=el('div');box.append(el('small','',label),el('strong','',value));facts.append(box);}
const dateText=value=>{if(!value)return 'Not announced';const d=new Date(value+'T00:00:00Z');return Number.isNaN(d.getTime())?'Not announced':new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(d);};
const schedule=el('section','anime-schedule');schedule.setAttribute('aria-label','Release schedule');schedule.append(el('h2','','Release schedule'));
const grid=el('div','anime-facts');
const season=[a.release_season&&a.release_season!=='Not announced'?a.release_season:'',a.release_year||''].filter(Boolean).join(' ')||'Not announced';
const day=a.broadcast_day&&a.broadcast_day!=='Not announced'?a.broadcast_day:null;
const broadcast=a.airing_status==='Completed'?(day?'Released on '+day:'Completed'):(day?'Every '+day:'Not announced');
for(const [label,value] of [['RELEASE SEASON',season],['START DATE',dateText(a.start_date)],['END DATE',dateText(a.end_date)],['EPISODE RELEASE',broadcast]]){const box=el('div');box.append(el('small','',label),el('strong','',value));grid.append(box);}schedule.append(grid);facts.after(schedule);
const actions=document.getElementById('animeSaveActions');actions.append(window.AnimeLibrary.controls(a.id));
const error=document.getElementById('libraryError');window.AnimeLibrary.subscribe(()=>{const state=window.AnimeLibrary.state();error.hidden=!state.error;error.textContent=state.error;});const state=window.AnimeLibrary.state();error.hidden=!state.error;error.textContent=state.error;
const characters=document.getElementById('characterGrid');for(const c of (Array.isArray(a.characters)?a.characters:[])){if(!c?.name)continue;const card=el('article','character-card');const image=el('img');const url=window.AnimeLibrary.safeImage(c.image);if(url)image.src=url;image.alt=c.name;image.loading='lazy';card.append(image,el('strong','',c.name),el('small','',c.role||'Character'));characters.append(card);}if(!characters.children.length){const p=el('p','library-note','Character details will appear here when added.');characters.append(p);}
// Display five characters by default; expand the full cast on demand.
const showAllButton=document.getElementById('charactersShowAll');
const characterCards=[...characters.querySelectorAll('.character-card')];
if(showAllButton&&characterCards.length>5){
  let expanded=false;
  const updateCharacters=()=>{
    characterCards.forEach((card,index)=>{card.hidden=!expanded&&index>=5;});
    showAllButton.textContent=expanded?'Show Less':'Show All Characters ('+characterCards.length+')';
    showAllButton.setAttribute('aria-expanded',String(expanded));
  };
  showAllButton.hidden=false;
  showAllButton.addEventListener('click',()=>{expanded=!expanded;updateCharacters();});
  updateCharacters();
}
const related=document.getElementById('relatedSeasons');const grouped=a.series_key?(window.ANIME_DATA||[]).filter(x=>x.series_key===a.series_key).sort((x,y)=>(x.season_order||1)-(y.season_order||1)||x.title.localeCompare(y.title)):[];
document.getElementById('relatedSection').hidden=grouped.length<2;for(const x of grouped){const link=el('a');link.href='anime-details.html?id='+encodeURIComponent(x.id);if(x.id===a.id)link.setAttribute('aria-current','page');const image=el('img');const url=window.AnimeLibrary.safeImage(x.image);if(url)image.src=url;image.alt='';image.loading='lazy';const txt=el('span');txt.append(el('strong','',x.season_label||`Season ${x.season_order||1}`),el('small','',x.title));link.append(image,txt);related.append(link);}
})();
