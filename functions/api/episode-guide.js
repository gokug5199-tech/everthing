/* The Everything — Cloudflare Pages Function for public episode classifications.
   Uses exact MAL IDs to prevent cross-series/season matches. It never proxies video.
   FillerLists data: CC BY-SA 4.0, https://fillerlists.com/data
   Tenrai episodes: https://api.tenrai.org/documentation
*/
const FILLER_GUIDES = Object.freeze({
  21:'one-piece',269:'bleach',20:'naruto',1735:'naruto-shippuden',
  34572:'black-clover',34566:'boruto',813:'dragon-ball-z',223:'dragon-ball',
  6702:'fairy-tail',249:'inuyasha',11061:'hunter-x-hunter',
  31964:'my-hero-academia',40748:'jujutsu-kaisen'
});
const EPISODE_TYPES = new Set(['canon','filler','mixed','anime-canon','recap']);
const MAX_PAGES = 35;
const TTL = 60 * 60 * 24; // Edge cache 24 hours, client cache 12 hours.
const REPLY = {'content-type':'application/json; charset=utf-8','access-control-allow-origin':'*', 'x-content-type-options':'nosniff'};
function json(data, status=200) { return new Response(JSON.stringify(data),{status,headers:{...REPLY,'cache-control':status===200?`public, max-age=300, s-maxage=${TTL}`:'no-store'}}); }
async function upstream(url, timeout=8500) {
  const response = await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(timeout),cf:{cacheTtl:TTL,cacheEverything:true}});
  if (!response.ok) throw new Error('Upstream '+response.status);
  const data=await response.json();
  if (!data || typeof data !== 'object') throw new Error('Invalid upstream data');
  return data;
}
function normalizeType(value) { return EPISODE_TYPES.has(value) ? value : null; }
function normEpisode(row, numberKey) {
  const n=Number(row[numberKey]);
  if (!Number.isInteger(n)||n<1||n>20000) return null;
  const type=normalizeType(row.type);
  const arc=typeof row.arc==='string'&&row.arc.trim() ? row.arc.trim().slice(0,100) : null;
  return {n,type,arc};
}
function fromFillerLists(raw, malId, slug) {
  if (!Array.isArray(raw.episodes)||raw.show!==slug) throw new Error('Guide unavailable');
  const episodes=raw.episodes.map(row=>normEpisode(row,'n')).filter(Boolean);
  return {mal_id:malId, source:'FillerLists', source_url:raw.url||`https://fillerlists.com/${slug}`,
    attribution_url:'https://fillerlists.com/data',license:'CC BY-SA 4.0',
    updated:raw.lastChecked||null,coverage:'episode-and-arc',episodes};
}
async function fromTenrai(malId) {
  const all=[];
  for (let page=1;page<=MAX_PAGES;page++) {
    const result=await upstream(`https://api.tenrai.org/v1/anime/${malId}/episodes?page=${page}`);
    if (!Array.isArray(result.data)) throw new Error('Episode API unavailable');
    for (const row of result.data) {
      const n=Number(row.mal_id);
      if (!Number.isInteger(n)||n<1||n>20000) continue;
      // false is NOT proof of canon: Tenrai only confirms its positive filler/recap flags.
      const type=row.recap===true?'recap':row.filler===true?'filler':null;
      if (type) all.push({n,type,arc:null});
    }
    if (!result.pagination?.has_next_page || !result.data.length) break;
  }
  return {mal_id:malId, source:'Tenrai',source_url:'https://api.tenrai.org/documentation',
    attribution_url:'https://api.tenrai.org/documentation',license:null,updated:null,
    coverage:'filler-recap-only',episodes:all};
}
export async function onRequestGet({request}) {
  const url=new URL(request.url);
  const idString=url.searchParams.get('mal_id')||'';
  if (!/^\d{1,7}$/.test(idString)) return json({error:'Valid MyAnimeList ID required.'},400);
  const malId=Number(idString);
  if (!Number.isSafeInteger(malId)||malId<1||malId>9999999) return json({error:'Invalid ID.'},400);
  const slug=FILLER_GUIDES[malId];
  if(slug) {
    try { return json(fromFillerLists(await upstream(`https://fillerlists.com/data/${slug}.json`),malId,slug)); }
    catch(error) {console.warn('FillerLists unavailable; falling back to Tenrai',malId,error?.message);}
  }
  try {return json(await fromTenrai(malId));}
  catch(error) {console.warn('Episode guide unavailable',malId,error?.message);return json({error:'Episode guide temporarily unavailable.'},503);}
}
