/* The Everything — unified episode guides (stable filename and API).
   Verified data source: FillerLists (CC BY-SA 4.0), https://fillerlists.com/data.
   Prefer its current JSON; fall back to exact broadcast-episode ranges, never guess canon status.
   FillerLists permits browser fetches (CORS), so Cloudflare Pages Functions are optional for covered shows. */
(function(){
  'use strict';
  const TTL=12*60*60*1000;
  const IDS=Object.freeze({21:'one-piece',269:'bleach',20:'naruto',1735:'naruto-shippuden',
    34572:'black-clover',34566:'boruto',813:'dragon-ball-z',223:'dragon-ball',
    6702:'fairy-tail',249:'inuyasha',11061:'hunter-x-hunter',31964:'my-hero-academia',40748:'jujutsu-kaisen'});
  const SHOW_ID=Object.freeze(Object.fromEntries(Object.entries(IDS).map(([id,slug])=>[slug,Number(id)])));
  const TITLE=Object.freeze({
    'one piece':'one-piece','bleach':'bleach','naruto':'naruto',
    'naruto shippuden':'naruto-shippuden','naruto shippuuden':'naruto-shippuden',
    'black clover':'black-clover','boruto naruto next generations':'boruto',
    'dragon ball z':'dragon-ball-z','dragon ball':'dragon-ball',
    'fairy tail':'fairy-tail','inuyasha':'inuyasha',
    'hunter x hunter':'hunter-x-hunter','hunter x hunter 2011':'hunter-x-hunter',
    'boku no hero academia':'my-hero-academia','my hero academia':'my-hero-academia',
    'jujutsu kaisen':'jujutsu-kaisen'
  });
  // Emergency, limited *verified filler numbers* (source snapshot: Nov 9, 2026).
  // This is NOT a statement about the canon status of other episodes.
  const VERIFIED_FILLERS=Object.freeze({
    'one-piece':'50,54-60,99,101-102,131-142,196-206,213-214,216,220-226,279-283,291-292,303,317-319,326-336,382-384,406-407,426-429,457-458,492,499,506,542,575-578,590,626-628,747-750,775,780-782,895-896,1029-1030,1084',
    'bleach':'64-108,128-137,147-149,168-189,204-205,213-214,228-265,287,298,303-305,311-341,355',
    'naruto-shippuden':'57-70,91,93-111,144-151,170-171,177,182-196,223-242,257-260,271,279-281,284-295,303-320,347-349,351-361,376-377,389-390,394-413,416,422-423,427-449,464-468,480-483',
    'naruto':'26,97,99,101-106,136-140,143-219',
    'black-clover':'13,29,66,82,123-125,130-157',
    'boruto':'2-17,25-38,40-52,60,67-92,96-105,112-147,152-156,158-180,190-191,209,221-281',
    'my-hero-academia':'32,64,104',
    'dragon-ball-z':'9-10,12-16,41,102,108-117,124,170-171,195-199,202-203,288',
    'fairy-tail':'19,70-72,74-75,125-150,204-218,221,225,268',
    'dragon-ball':'30-33,79-83,127-132,149-153',
    'inuyasha':'59,63-65,68,72,75-78,89-101,129-130,133-140,147-148,162-163',
    'hunter-x-hunter':'13,26',
    'jujutsu-kaisen':''
  });
  // The exact 2011 Hunter x Hunter ranges are verified against FillerLists.
  const HXH_ARCS=[
    [1,12,'Hunter Exam'],[13,13,'Recap: episodes 1 to 12'],
    [14,25,'Hunter Exam and Zoldyck Family'],[26,26,'Recap: episodes 14 to 25'],
    [27,38,'Heavens Arena'],[39,58,'Yorknew City'],[59,75,'Greed Island'],
    [76,136,'Chimera Ant'],[137,148,'13th Chairman Election']
  ];
  // Adapted, verified Bleach (2004–2012) broadcast arc boundaries from
  // FillerLists, checked 2026-11-03: https://fillerlists.com/bleach
  // CC BY-SA 4.0; this compact local adaptation only stores verified arc ranges.
  // It deliberately does NOT assume non-filler episodes are canon.
  const BLEACH_ARCS=[
    [1,20,'Agent of the Shinigami'],[21,63,'Soul Society'],
    [64,91,'Bount'],[92,108,'Bount Assault on Soul Society'],
    [109,109,'End of the Bount story'],[110,143,'Arrancar'],
    [144,167,'Hueco Mundo'],[168,189,'The New Captain Shusuke Amagai'],
    [190,205,'Hueco Mundo (continued)'],[206,212,'Turn Back the Pendulum'],
    [213,229,'The Fake Karakura Town'],[230,255,'Zanpakuto Unknown Tales'],
    [256,265,'Beast Swords'],[266,316,'The Fake Karakura Town (continued)'],
    [317,341,'Gotei 13 Invading Army'],[342,342,'Gotei 13 Invading Army: farewell'],
    [343,366,'The Lost Substitute Shinigami']
  ];
  const memory=new Map();
  function normalized(text){return String(text||'').normalize('NFKC').toLowerCase()
    .replace(/[×✕]/g,'x').replace(/\(2011\)/g,' 2011 ').replace(/[\u2019'’:\-_.()]/g,' ')
    .replace(/\s+/g,' ').trim();}
  function getMalId(anime){
    const id=Number(anime?.mal_id);
    if(Number.isSafeInteger(id)&&id>0&&id<10000000)return id;
    const match=String(anime?.id||'').match(/(?:^|-)mal-(\d{1,7})$/i);
    if(match)return Number(match[1]);
    return null;
  }
  function resolveShowSlug(anime,episodeCount){
    const id=getMalId(anime);
    if(id!==null){return IDS[id]||null;} // Never call a 1999 Hunter x Hunter episode a 2011 one.
    const names=[anime?.title,anime?.title_english,anime?.english_title,anime?.title_japanese,anime?.id];
    for(const candidate of names){
      const name=normalized(candidate);
      const slug=TITLE[name];
      if(!slug)continue;
      if(slug==='hunter-x-hunter' && Number(episodeCount)!==148 && !name.includes('2011')) continue;
      return slug;
    }
    return null;
  }
  function resolve(anime,episodeCount){
    const malId=getMalId(anime);
    const slug=resolveShowSlug(anime,episodeCount);
    return {malId:malId||SHOW_ID[slug]||null,slug};
  }
  function rangeSet(spec){
    const out=new Set();
    for(const section of String(spec||'').split(',')){
      const parts=section.trim().split('-').map(Number);
      if(!parts[0]||parts[0]>20000)continue;
      const end=parts.length>1?parts[1]:parts[0];
      if(!Number.isSafeInteger(end)||end<parts[0]||end>20000)continue;
      for(let n=parts[0];n<=end;n++)out.add(n);
    }
    return out;
  }
  function builtIn(anime,episodeCount){
    const {malId,slug}=resolve(anime,episodeCount);
    if(!slug)return null;
    const episodes=new Map();
    for(const n of rangeSet(VERIFIED_FILLERS[slug]))episodes.set(n,{type:'filler',arc:''});
    let coverage='filler-only';
    if(slug==='bleach'){
      for(const [a,b,arc] of BLEACH_ARCS){
        for(let n=a;n<=b;n++){
          const known=episodes.get(n);
          // Only the three mixed episodes explicitly verified on the source
          // are marked. Others remain unknown unless a live guide confirms.
          const type=known?.type||([33,109,342].includes(n)?'mixed':null);
          episodes.set(n,{type,arc});
        }
      }
      coverage='filler-and-arc';
    }
    if(slug==='hunter-x-hunter'){
      for(const [a,b,arc] of HXH_ARCS){
        for(let n=a;n<=b;n++){
          episodes.set(n,{type:n===13||n===26?'filler':'canon',arc});
        }
      }
      coverage='episode-and-arc';
    }
    return {episodes,malId,slug,source:'FillerLists (adapted local reference)',
      sourceUrl:'https://fillerlists.com/data/'+slug+'.json',attributionUrl:'https://fillerlists.com/data',
      license:'CC BY-SA 4.0',coverage,offline:true,updated:'2026-11-09'};
  }
  function sanitize(raw,id,slug){
    if(!raw||!Array.isArray(raw.episodes))throw Error('Invalid episode guide');
    if(raw.show && raw.show!==slug)throw Error('Show mismatch');
    if(raw.mal_id && Number(raw.mal_id)!==id)throw Error('Anime ID mismatch');
    const map=new Map();
    const allowed=new Set(['canon','filler','mixed','anime-canon','recap']);
    for(const row of raw.episodes){
      const n=Number(row.n);
      if(!Number.isSafeInteger(n)||n<=0||n>20000)continue;
      const type=allowed.has(row.type)?row.type:null;
      const arc=typeof row.arc==='string'?row.arc.trim().slice(0,100):'';
      if(type||arc)map.set(n,{type,arc});
    }
    const fillerlists=!!raw.show||raw.source==='FillerLists';
    return {episodes:map,malId:id,slug,source:fillerlists?'FillerLists':String(raw.source||'Tenrai'),
      sourceUrl:fillerlists?(raw.url||raw.source_url||'https://fillerlists.com/'+slug):String(raw.source_url||'https://api.tenrai.org/documentation'),
      attributionUrl:fillerlists?'https://fillerlists.com/data':'https://api.tenrai.org/documentation',license:fillerlists?'CC BY-SA 4.0':'',
      coverage:fillerlists?'episode-and-arc':String(raw.coverage||'filler-recap-only'),
      offline:false,updated:raw.lastChecked||raw.updated||''};
  }
  async function jsonFetch(url,timeout=9500){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeout);
    try{
      const res=await fetch(url,{headers:{accept:'application/json'},signal:controller.signal,cache:'no-cache'});
      if(!res.ok)throw Error(`Guide HTTP ${res.status}`);
      const content=res.headers?.get?.('content-type')||'';
      if(content && !content.includes('json'))throw Error('Guide route returned HTML, not JSON');
      return await res.json();
    }finally{clearTimeout(timer);}
  }
  // A guide for an unsupported short show is almost always empty; Tenrai supplies
  // positive filler/recap flags, but no arcs. Avoid a costly 35-page API probe.
  // Long unmatched titles can still use Tenrai's *confirmed* positive flags.
  function shouldFetch(anime,episodeCount){
    const {malId,slug}=resolve(anime,episodeCount);
    return !!(malId && (slug || Number(episodeCount)>=60));
  }
  function cacheKeyFor(malId,slug){return `te-episode-guide-${malId}-${slug||'tenrai'}`;}
  function readCache(anime,episodeCount,allowExpired=false){
    const {malId,slug}=resolve(anime,episodeCount);
    if(!malId)return null;
    try{
      const saved=JSON.parse(localStorage.getItem(cacheKeyFor(malId,slug))||'null');
      if(!saved || !Number.isFinite(saved.at) || (!allowExpired&&saved.at<=Date.now()-TTL))return null;
      const guide=sanitize(saved.raw,malId,slug);
      return guide.episodes.size?guide:null;
    }catch(_){return null;}
  }
  // The locally stored guide and verified compact filler list can be displayed
  // without waiting for the network. Remote updates run independently.
  function peek(anime,episodeCount){
    return readCache(anime,episodeCount)||builtIn(anime,episodeCount);
  }
  async function load(anime,episodeCount,force){
    if(!shouldFetch(anime,episodeCount))return null;
    const {malId,slug}=resolve(anime,episodeCount);
    const cacheKey=cacheKeyFor(malId,slug);
    if(!force){
      if(memory.has(cacheKey))return memory.get(cacheKey);
      const cached=readCache(anime,episodeCount);
      if(cached)return cached;
    }
    const task=(async()=>{
      const candidates=[jsonFetch(`/api/episode-guide?mal_id=${malId}`,9000)];
      // Independently fetch exact show JSON. This fixes Pages Functions routes absent on some deployments.
      if(slug)candidates.push(jsonFetch(`https://fillerlists.com/data/${slug}.json`,11000));
      const pending=candidates.map(p=>p.then(raw=>{
        const guide=sanitize(raw,malId,slug);
        // For our 13 supported shows, an incomplete Tenrai fallback must not
        // beat the actual FillerLists response in a network race and erase arcs.
        if(slug && guide.coverage!=='episode-and-arc')throw Error('Waiting for arc-capable source');
        if(slug && !guide.episodes.size)throw Error('Empty guide');
        return {raw,guide};
      }));
      try{
        const result=await Promise.any(pending);
        if(!result.guide.episodes.size && slug)throw Error('Guide had no episode metadata');
        try{localStorage.setItem(cacheKey,JSON.stringify({at:Date.now(),raw:result.raw}));}catch(_){}
        return result.guide;
      }catch(err){
        console.warn('[The Everything] Episode guide network unavailable; keeping verified cached labels where possible.',err);
        return readCache(anime,episodeCount,true)||builtIn(anime,episodeCount);
      }
    })();
    memory.set(cacheKey,task);
    return task;
  }
  window.TEEpisodeGuides={load,peek,resolve,shouldFetch,getMalId,resolveShowSlug};
})();
