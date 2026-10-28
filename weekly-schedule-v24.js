/* The Everything v24 — on-demand weekly schedule.
   Uses existing public site_anime.broadcast_day and airing_status.
   No background requests for all 2000 titles; only one day at a time.
   Only current-year premieres marked Ongoing; no invented dates, episode numbers or availability.
 */
(() => {
  'use strict';
  const root = document.getElementById('weeklyReleases');
  if (!root) return;
  const buttons = document.getElementById('teWeeklyDays');
  const list = document.getElementById('teWeeklyList');
  const summary = document.getElementById('teWeeklySummary');
  const more = document.getElementById('teWeeklyMore');
  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const API = 'https://tnavsfbolastevebukxl.supabase.co/rest/v1/site_anime';
  const KEY = 'sb_publishable_3FX_mPM-A6dIY-nQTtFZQg_5HPoWO9B';
  const PAGE = 12;
  const CURRENT_YEAR = new Date().getFullYear();
  const cache = new Map();
  let selected = DAYS[new Date().getDay()];
  let rows = [];
  let hasMore = false;
  let requestId = 0;
  let controller;

  const validImage = value => {try {const u = new URL(String(value||''), location.href);return ['http:','https:'].includes(u.protocol)?u.href:'';}catch{return '';}};
  function setSummary(text) {summary.textContent = text;}
  function card(a) {
    const link = document.createElement('a');link.className='te-weekly-card';
    link.href='anime-details.html?id='+encodeURIComponent(a.id);
    const poster = document.createElement('span');poster.className='te-weekly-poster';
    const src=validImage(a.image);
    if(src) {
      const img=document.createElement('img');img.src=src;img.alt='';img.loading='lazy';img.decoding='async';
      img.onerror=()=>{img.remove();poster.classList.add('te-weekly-poster-empty');};
      poster.append(img);
    } else poster.classList.add('te-weekly-poster-empty');
    const text=document.createElement('span');text.className='te-weekly-copy';
    const name=document.createElement('strong');name.textContent=a.title||'Anime';
    const info=document.createElement('small');info.textContent=[a.anime_type && a.anime_type!=='Unknown'?a.anime_type:'TV',a.release_year||''].filter(Boolean).join(' · ');
    text.append(name,info);
    const badge=document.createElement('span');badge.className='te-weekly-airing';badge.textContent='Ongoing';
    const arrow=document.createElement('span');arrow.className='te-weekly-arrow';arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');
    link.append(poster,text,badge,arrow);
    return link;
  }
  function paint() {
    list.replaceChildren(...rows.map(card));
    list.setAttribute('aria-busy','false');
    if (!rows.length) {
      const empty=document.createElement('p');empty.className='te-weekly-empty';empty.textContent='No currently airing '+CURRENT_YEAR+' anime listed for '+selected+'.';list.append(empty);
    }
    setSummary(rows.length ? selected+' · '+rows.length+(hasMore?'+':'')+' anime from '+CURRENT_YEAR : selected+' · No '+CURRENT_YEAR+' scheduled titles');
    more.hidden=!hasMore;
    buttons.querySelectorAll('button').forEach(b=>{
      const active=b.dataset.day===selected;
      b.setAttribute('aria-pressed',String(active));b.classList.toggle('active',active);
    });
  }
  async function fetchNextDay(day, offset, signal) {
    const params=new URLSearchParams({
      select:'id,title,image,anime_type,release_year,broadcast_day,airing_status',
      broadcast_day:'eq.'+day,airing_status:'eq.Ongoing',release_year:'eq.'+CURRENT_YEAR,order:'title.asc,id.asc',
      limit:String(PAGE+1),offset:String(offset)
    });
    const response=await fetch(API+'?'+params,{headers:{apikey:KEY},signal});
    if(!response.ok)throw Error('Schedule request failed ('+response.status+')');
    const data=await response.json();
    if(!Array.isArray(data))throw Error('Invalid schedule response');
    return {items:data.slice(0,PAGE),hasMore:data.length>PAGE};
  }
  async function load(day, next=false) {
    const id=++requestId;
    controller?.abort();controller=new AbortController();
    if(!next) {selected=day;rows=[];hasMore=false;}
    buttons.querySelectorAll('button').forEach(b=>{
      const active=b.dataset.day===selected;b.setAttribute('aria-pressed',String(active));b.classList.toggle('active',active);
    });
    if(!next) {
      if(cache.has(selected)){const saved=cache.get(selected);rows=saved.items.slice();hasMore=saved.hasMore;paint();return;}
      list.replaceChildren();setSummary('Loading '+selected+' schedule…');
    } else setSummary('Loading more '+selected+' anime…');
    list.setAttribute('aria-busy','true');more.hidden=true;
    const timeout=setTimeout(()=>controller.abort(),12000);
    try {
      const response=await fetchNextDay(selected,rows.length,controller.signal);
      if(id!==requestId)return;
      rows=rows.concat(response.items);
      hasMore=response.hasMore;
      cache.set(selected,{items:rows.slice(),hasMore});
      paint();
    } catch(error) {
      if(id!==requestId)return;
      list.setAttribute('aria-busy','false');
      if(next) {setSummary('Could not load more. Try again.');more.hidden=false;}
      else {list.replaceChildren();const box=document.createElement('p');box.className='te-weekly-empty';box.textContent='Schedule is temporarily unavailable.';list.append(box);setSummary('Could not load the schedule');}
      if(error.name!=='AbortError')console.warn('Weekly schedule unavailable:',error);
    } finally {clearTimeout(timeout);}
  }
  for(const day of DAYS){const button=document.createElement('button');button.type='button';button.dataset.day=day;button.textContent=day;
    button.addEventListener('click',()=>{if(day!==selected)load(day);});buttons.append(button);}
  more.addEventListener('click',()=>{if(hasMore)load(selected,true);});
  // Fetch only the selected weekday, not the whole catalog or a week of episodes.
  load(selected);
  window.TEWeeklyScheduleV24={selectDay:day=>{if(DAYS.includes(day))load(day);},currentYear:CURRENT_YEAR};
})();
