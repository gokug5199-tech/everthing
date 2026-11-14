/* Self-contained Node.js smoke checks for the consolidated Episode Guides loader.
 * No external calls; does not touch Supabase or live Cloudflare Pages. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const code=fs.readFileSync(path.join(root,'episode-guides.js'),'utf8');
const html=fs.readFileSync(path.join(root,'anime-details.html'),'utf8');
const css=fs.readFileSync(path.join(root,'episode-guides.css'),'utf8');
const details=fs.readFileSync(path.join(root,'anime-details.js'),'utf8');
const apiCode=fs.readFileSync(path.join(root,'functions/api/episode-guide.js'),'utf8');
function env(fetchMock){
  const stored=new Map();
  const sandbox={
    window:{},Promise,Map,Set,URL,Number,Object,String,Array,Date,AbortController,
    setTimeout,clearTimeout,console,
    localStorage:{getItem:(k)=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)},
    fetch:fetchMock
  };
  vm.runInNewContext(code,sandbox,{filename:'episode-guides.js'});
  return {api:sandbox.window.TEEpisodeGuides,stored};
}
function jsonResponse(body,status=200){return {ok:status>=200&&status<300,status,headers:{get:()=> 'application/json'},json:async()=>body};}
async function main(){
  assert.match(html,/src="episode-guides\.js\?rev=[^"]+"/);
  assert.match(html,/href="episode-guides\.css\?rev=[^"]+"/);
  assert.match(details,/window\.TEEpisodeGuides/);
  assert.doesNotMatch(html,/episode-guides-v3[89]/);
  assert.doesNotMatch(css,/@import/);
  assert.match(css,/\.te-episode-badge--filler/);
  assert.match(css,/\.te-guide-health/);
  assert.match(html, /id="teGuideHealth"[^>]*hidden/);
  assert.match(css,/\.te-guide-health\[hidden\]\{display:none!important\}/);
  assert.match(html, /<div class="detail-top[^"]*"><a href="anime.html"[^>]*>← Back to anime<\/a>/);
  assert.doesNotMatch(html, /<div class="detail-top[^"]*"><a data-back/);
  assert.doesNotMatch(fs.readFileSync(path.join(root,'watch.html'),'utf8'), /<a data-back id="backButton"/);
  assert.match(fs.readFileSync(path.join(root,'episode-choice-v37.js'),'utf8'), /window\.history\.back\(\)/);
  assert.match(fs.readFileSync(path.join(root,'episode-choice-v37.js'),'utf8'), /window\.location\.replace\(details\)/);

  const fail=async()=>{throw new Error('Mock offline');};
  const {api:offline}=env(fail);
  assert.ok(offline&&typeof offline.load==='function');
  assert.equal(offline.resolve({title:'One Piece'},600).malId,21);
  assert.equal(offline.resolve({title:'Hunter x Hunter (2011)',mal_id:11061},148).slug,'hunter-x-hunter');
  assert.equal(offline.resolve({title:'Hunter x Hunter',mal_id:136},62).slug,null);
  assert.equal(offline.resolve({title:'Mystery',mal_id:99999},12).slug,null);
  assert.equal(offline.shouldFetch({title:'Mystery',mal_id:99999},12),false);
  assert.equal(offline.shouldFetch({title:'Mystery',mal_id:99999},90),true);
  assert.equal(offline.shouldFetch({title:'One Piece',mal_id:21},3),true);
  assert.equal(await offline.load({title:'Mystery',mal_id:99999},12),null);
  assert.equal(offline.resolve({title:'Bleach: Thousand-Year Blood War'},366).slug,null);
  const bleach=offline.peek({title:'Bleach',mal_id:269},366);
  assert.equal(bleach.episodes.get(1).arc,'Agent of the Shinigami');
  assert.equal(bleach.episodes.get(21).arc,'Soul Society');
  assert.equal(bleach.episodes.get(64).arc,'Bount');
  assert.equal(bleach.episodes.get(64).type,'filler');
  assert.equal(bleach.episodes.get(109).type,'mixed');
  assert.equal(bleach.episodes.get(1).type,null,'do not invent canon in local snapshot');
  assert.equal(bleach.episodes.get(366).arc,'The Lost Substitute Shinigami');
  assert.equal(new Set([...bleach.episodes.values()].map(x=>x.arc)).size,17);
  assert.equal(bleach.episodes.size,366);
  const preview=offline.peek({title:'One Piece'},600);
  assert.equal(preview.episodes.get(131).type,'filler');
  assert.equal(preview.episodes.has(130),false,'unknown episode must not be guessed canon');
  const fallback=await offline.load({title:'One Piece'},600);
  assert.equal(fallback.offline,true);
  assert.equal(fallback.episodes.get(131).type,'filler');
  const hunter=offline.peek({title:'Hunter x Hunter (2011)',mal_id:11061},148);
  assert.equal(hunter.episodes.get(13).type,'filler');
  assert.equal(hunter.episodes.get(27).arc,'Heavens Arena');

  const calls=[];
  const {api:online,stored}=env(async (url)=>{
    calls.push(url);
    if(String(url).startsWith('/api/')) return jsonResponse({mal_id:21,show:'one-piece',source:'FillerLists',episodes:[{n:131,type:'filler',arc:'Post-Alabasta'},{n:132,type:'canon',arc:'Post-Alabasta'}]});
    throw Error('no secondary required');
  });
  const live=await online.load({title:'One Piece'},600);
  assert.equal(live.offline,false);
  assert.equal(live.episodes.get(131).arc,'Post-Alabasta');
  assert.equal(live.episodes.get(132).type,'canon');
  assert.ok(calls.some(c=>String(c).includes('/api/episode-guide?mal_id=21')));
  assert.ok([...stored.keys()].some(k=>k.startsWith('te-episode-guide-')));
  const cached=online.peek({title:'One Piece'},600);
  assert.equal(cached.episodes.get(132).arc,'Post-Alabasta');

  // Cloudflare Pages API mocked independently; confirms the handler wiring and mapping.
  const apiSandbox={Response,URL,AbortSignal,console,Set,Object,Number,String,Array,
    fetch:async url=>{
      if(String(url).includes('fillerlists.com'))return jsonResponse({show:'one-piece',episodes:[{n:131,type:'filler',arc:'Post-Alabasta'}]});
      return jsonResponse({data:[{mal_id:1,filler:true,recap:false},{mal_id:2,filler:false,recap:false}],pagination:{has_next_page:false}});
    }
  };
  vm.runInNewContext(apiCode.replace('export async function onRequestGet','async function onRequestGet')+'\nthis.__handler=onRequestGet;',apiSandbox,{filename:'episode-guide-function.js'});
  const api=apiSandbox.__handler;
  const first=await api({request:new Request('https://example.com/api/episode-guide?mal_id=21')});
  assert.equal(first.status,200);
  const one=await first.json();
  assert.equal(one.episodes[0].arc,'Post-Alabasta');
  const second=await api({request:new Request('https://example.com/api/episode-guide?mal_id=99999')});
  assert.equal(second.status,200);
  const other=await second.json();
  assert.equal(other.episodes.length,1);
  assert.equal(other.episodes[0].type,'filler');
  const bad=await api({request:new Request('https://example.com/api/episode-guide?mal_id=invalid')});
  assert.equal(bad.status,400);
  console.log('PASS: unified references, CSS, MAL matching, unknown/filler fallback, online JSON, browser cache, Cloudflare handler mock');
}
main().catch(e=>{console.error('FAIL:',e);process.exitCode=1;});
