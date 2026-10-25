/* Anime page enhancements + carousel, kept in original execution order. */
/* Cosmetic progressive enhancement for the anime stage; API + genres stay in
   anime.js and featured-public.js, both retained intact. */
(function(){
  'use strict';
  const get=id=>document.getElementById(id);
  const hero=get('teAnimeMobileHero');
  if(hero){
    const stage=hero.querySelector('.v6-featured-card');
    const featured=hero.querySelector('.te-hero-view');
    if(stage&&featured){
      const sync=()=>{if(featured.getAttribute('href'))stage.setAttribute('href',featured.getAttribute('href'));};
      sync();
      new MutationObserver(sync).observe(featured,{attributes:true,attributeFilter:['href']});
    }
  }
  const closeGenres=get('v6CloseGenres');
  if(closeGenres)closeGenres.addEventListener('click',()=>get('teMoreGenres')?.click());
  const latest=get('v6LatestMount');
  if(latest){
    new MutationObserver(()=>{
      if(latest.querySelector('.te-latest-card'))latest.closest('.v6-new-arrivals')?.classList.add('v6-has-releases');
    }).observe(latest,{childList:true});
  }
  // Keyboard shortcut: press '/' outside input fields to open discovery search.
  document.addEventListener('keydown',e=>{
    if(e.key!=='/'||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey)return;
    if(e.target.closest('input,textarea,select,[contenteditable]'))return;
    e.preventDefault();
    const search=get('animeSearch');
    if(search){get('discover')?.scrollIntoView({behavior:'smooth',block:'center'});search.focus({preventScroll:true});}
  });
})();

;
/* Five-title rotating Anime hero. Admin-curated and shared across devices. */
(function(){
'use strict';
if(!document.body.classList.contains('te-v6-anime'))return;
const $=id=>document.getElementById(id);
const hero=$('teAnimeMobileHero'),card=$('v6FeaturedCard'),controls=$('v7HeroControls'),dots=$('v7HeroDots');
if(!hero||!card||!controls||!dots)return;
const API='https://tnavsfbolastevebukxl.supabase.co/rest/v1/';
const key='sb_publishable_3FX_mPM-A6dIY-nQTtFZQg_5HPoWO9B';
let items=[],active=0,timer=null,switching=false;
const safeImage=value=>{
 try{const url=new URL(String(value||''),location.href);return ['http:','https:'].includes(url.protocol)?url.href:'';}catch{return '';}
};
async function getRows(table,query){
 const response=await fetch(API+table+'?'+query,{headers:{apikey:key},signal:AbortSignal.timeout(14000)});
 if(!response.ok)throw Error('HTTP '+response.status);
 return response.json();
}
function clearTimer(){if(timer){clearInterval(timer);timer=null;}}
function pauseRequired(){const hasMouse=window.matchMedia('(hover: hover) and (pointer: fine)').matches;return document.hidden||window.matchMedia('(prefers-reduced-motion: reduce)').matches||(hasMouse&&(hero.matches(':hover')||hero.contains(document.activeElement)));}
function startTimer(){clearTimer();if(items.length<2||pauseRequired())return;timer=setInterval(()=>goTo(active+1),6000);}
function updateDots(){dots.querySelectorAll('button').forEach((button,index)=>button.setAttribute('aria-current',String(index===active)));}
function display(item){
 if(!item)return;
 const image=hero.querySelector('.te-hero-art');
 const title=hero.querySelector('.te-hero-title');
 const genres=hero.querySelector('.te-hero-genres');
 const mirror=hero.querySelector('.te-hero-view');
 const url=safeImage(item.image);if(url)image.src=url;
 image.alt=''; title.textContent=item.title||'Anime';
 genres.textContent=Array.isArray(item.genres)&&item.genres.length?item.genres.slice(0,3).join(' · '):'Discover this anime';
 const destination='anime-details.html?id='+encodeURIComponent(item.id);
 card.href=destination;if(mirror)mirror.href=destination;
 card.setAttribute('aria-label','View '+(item.title||'anime'));
 updateDots();
}
function goTo(index){
 if(switching||!items.length)return;
 active=(index+items.length)%items.length;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(reduced){display(items[active]);startTimer();return;}
 switching=true;card.classList.add('v7-changing');
 window.setTimeout(()=>{display(items[active]);card.classList.remove('v7-changing');switching=false;startTimer();},200);
}
async function fallback(){
 try{if(window.ANIME_READY)await window.ANIME_READY;
 const anime=window.ANIME_DATA;
 if(Array.isArray(anime)&&anime.length)display(anime[0]);
 }catch(error){console.info('Fallback banner unavailable:',error.message);}
}
async function load(){
 await fallback();
 let selected;
 try{selected=await getRows('site_hero_featured','select=anime_id,position&order=position.asc&limit=5');}
 catch(error){console.info('Rotating banner not yet configured:',error.message);return;}
 if(!Array.isArray(selected)||!selected.length)return;
 const ids=selected.map(x=>x.anime_id).filter(Boolean);
 if(!ids.length)return;
 const filter='in.('+ids.map(id=>'"'+String(id).replace(/["\\]/g,'')+'"').join(',')+')';
 let result;
 try{result=await getRows('site_anime',new URLSearchParams({select:'id,title,image,genres',id:filter}).toString());}
 catch(error){console.info('Could not load rotating banner anime:',error.message);return;}
 const byId=new Map(result.map(x=>[x.id,x]));
 items=ids.map(id=>byId.get(id)).filter(Boolean).slice(0,5);
 if(!items.length)return;
 dots.replaceChildren();items.forEach((item,index)=>{
   const button=document.createElement('button');button.type='button';
   button.setAttribute('aria-label','Show '+(item.title||'anime'));
   button.addEventListener('click',()=>goTo(index));dots.append(button);
 });
 active=0;display(items[0]);
 if(items.length>1){
   controls.hidden=false;
   $('v7HeroPrev').addEventListener('click',()=>goTo(active-1));
   $('v7HeroNext').addEventListener('click',()=>goTo(active+1));
   hero.addEventListener('mouseenter',clearTimer);
   hero.addEventListener('mouseleave',startTimer);
   hero.addEventListener('focusin',clearTimer);
   hero.addEventListener('focusout',()=>setTimeout(startTimer,0));
   document.addEventListener('visibilitychange',startTimer);
   window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change',startTimer);
   startTimer();
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);
else load();
})();

