/* The Everything PWA PAIR02 – deterministic local tests; no network or live Supabase. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const rootDir = path.join(__dirname,'..','..');
class Node {
  constructor(tag='div') {
    this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.hidden=false;
    this.value='';this.textContent='';this.disabled=false;this.className='';
    this.classList={add(){},remove(){}};
  }
  append(...parts){this.children.push(...parts);}
  replaceChildren(...parts){this.children=[...parts];}
  setAttribute(k,v){this.attributes[k]=v;}
  getAttribute(k){return this.attributes[k];}
  closest(){return null;}
  remove(){this.removed=true;}
  querySelector(s){if(s==='[data-cw-list]')return this.list;return null;}
}
const flatten = node=>[node.textContent||'',...node.children.flatMap(flatten)].join(' ');
const findTag=(n,tag)=>n.tagName===tag?[n]:n.children.flatMap(c=>findTag(c,tag));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function waitFor(fn,name){for(let i=0;i<150;i++){if(fn())return;await tick();}throw Error('Timeout: '+name);}
function mockHistory(rows, signedIn=true){
  const log=[];const state={user:signedIn?{id:'me'}:null,history:rows, failHistory:false, subscribers:[]};
  const client={
    auth:{getSession:async()=>({data:{session:state.user?{user:state.user}:null},error:null}),onAuthStateChange(cb){state.subscribers.push(cb);return {data:{subscription:{unsubscribe(){}}}};}},
    from(table){
      const q={table,columns:null,where:{},exclude:{},order:null,limit:null,ids:[]};
      const chain={
        select(c){q.columns=c;return chain;},
        eq(k,v){q.where[k]=v;return chain;},
        not(k,o,v){q.exclude[k]=[o,v];return chain;},
        order(k,o){q.order=[k,o];return chain;},
        limit(n){q.limit=n;return chain;},
        in(k,ids){q.ids=[...ids];return chain;},
        then(resolve,reject){
          log.push(q);
          const result= table==='user_episode_activity' ?
            state.failHistory ? {data:null,error:{code:'42P01',message:'Not found'}}:
              {data:state.history.filter(row=>row.user_id===q.where.user_id&&row.watched_at!==null).sort((a,b)=>b.watched_at.localeCompare(a.watched_at)).slice(0,q.limit),error:null}:
            table==='site_anime'?{data:q.ids.map(id=>({id,title:'Anime '+id,image:'javascript:alert(1)'})),error:null}:
            {data:null,error:{message:'Unexpected table'}};
          return Promise.resolve(result).then(resolve,reject);
        }
      };return chain;
    }
  };
  return {client,log,state};
}
function runHistory(mock){
  const root=new Node('section'),list=new Node('div');root.list=list;root.append(list);
  const document={querySelector:selector=>selector==='[data-continue-watching]'?root:null,
    createElement:tag=>new Node(tag),createDocumentFragment:()=>new Node('fragment')};
  const win={supabase:{createClient:()=>mock.client},addEventListener:()=>{}};
  vm.runInNewContext(fs.readFileSync(path.join(rootDir,'continue-watching.js'),'utf8'),
    {window:win,document,location:{href:'https://everything.example/index.html'},URL,console,setTimeout});
  return {win,root,list};
}
async function historyCase(){
  const make=(anime,episode,time)=>({user_id:'me',anime_id:anime,season_number:1,episode_number:episode,watched_at:time});
  const sample=[make('one-piece',47,'2026-11-14T10:00:00Z'),make('one-piece',45,'2026-11-13T09:00:00Z'),make('bleach',12,'2026-11-12T08:00:00Z')];
  const mock=mockHistory(sample);
  const {win,root,list}=runHistory(mock);
  await waitFor(()=>root.hidden===false,'visible private recent-episode rail');
  assert.equal(mock.log.filter(x=>x.table==='user_episode_activity').length,1);
  assert.equal(mock.log.find(x=>x.table==='user_episode_activity').where.user_id,'me');
  assert.equal(mock.log.find(x=>x.table==='user_episode_activity').columns,'anime_id,season_number,episode_number,watched_at');
  assert.equal(mock.log.find(x=>x.table==='user_episode_activity').limit,60);
  assert.equal(mock.log.find(x=>x.table==='site_anime').columns,'id,title,image');
  const cards=list.children[0].children;
  assert.equal(cards.length,2,'Deduplicate history by anime');
  assert(cards[0].href.includes('anime=one-piece')&&cards[0].href.includes('episode=47'));
  assert(cards[1].href.includes('anime=bleach'));
  assert(!findTag(root,'IMG').some(x=>x.src),'Unsafe poster URLs must not load');
  assert(flatten(root).includes('Open episode options'));
  // Verify no additional activity for signed-out account, and no stale private cards.
  mock.state.user=null;
  mock.state.subscribers[0]('SIGNED_OUT',null);
  assert.equal(root.hidden,true,'Auth change hides previous owner immediately');
  assert.equal(list.children.length,0,'Auth change removes previous owner cards immediately');
  await tick(); await tick();
  assert.equal(mock.log.filter(x=>x.table==='user_episode_activity').length,1,'Guest sends no new history request');
  assert.equal(root.hidden,true);
  mock.state.user={id:'me'};
  mock.state.failHistory=true;
  await win.TEContinueWatching.refresh();
  assert.equal(root.hidden,true,'Missing v37 table is non-blocking');
  console.log('PASS: Continue Watching dedup, privacy, safe links, guest and missing-activity fallback');
}
async function guestCase(){
  const mock=mockHistory([],false);const {win,root}=runHistory(mock);
  await win.TEContinueWatching.refresh();
  assert.equal(mock.log.length,0);assert.equal(root.hidden,true);
  console.log('PASS: guest never reads private Supabase activity');
}
async function libraryStatusCase(){
  const history=[];
  const state={user:{id:'me'}, failConstraint:false, rows:[{user_id:'me',anime_id:'one-piece',watch_status:'watching',is_favorite:true,updated_at:'2026-11-14'}]};
  const client={
    auth:{getSession:async()=>({data:{session:{user:state.user}},error:null}),onAuthStateChange:()=>({})},
    from(table){
      const q={table,op:'select',cols:null,where:{},ids:null,bounds:null,payload:null};
      const chain={
        select(x){q.cols=x;return chain;},eq(k,v){q.where[k]=v;return chain;},order(){return chain;},range(a,b){q.bounds=[a,b];return chain;},
        in(k,v){q.ids=v;return chain;},delete(){q.op='delete';return chain;},upsert(row){q.op='upsert';q.payload=row;return chain;},single(){return chain;},
        then(resolve,reject){
          history.push({...q});
          if(table==='site_anime')return Promise.resolve({data:[{id:'one-piece',title:'One Piece',image:'https://example.com/p.jpg'}],error:null}).then(resolve,reject);
          if(q.op==='upsert'){
            if(state.failConstraint)return Promise.resolve({data:null,error:{code:'23514',message:'violates user_anime_library_watch_status_check'}}).then(resolve,reject);
            state.rows=[{...q.payload}];return Promise.resolve({data:state.rows[0],error:null}).then(resolve,reject);
          }
          if(q.op==='delete'){state.rows=[];return Promise.resolve({data:null,error:null}).then(resolve,reject);}
          return Promise.resolve({data:state.rows.filter(x=>x.user_id===q.where.user_id),error:null}).then(resolve,reject);
        }
      };return chain;
    }
  };
  const mount=new Node('div'),placeholders={libraryCount:new Node('strong'),completedAnimeCount:new Node('strong')};
  const document={querySelector:s=>s==='[data-anime-library]'?mount:null,
    getElementById:id=>placeholders[id]||null,createElement:tag=>new Node(tag)};
  const win={supabase:{createClient:()=>client}};
  vm.runInNewContext(fs.readFileSync(path.join(rootDir,'anime-library.js'),'utf8'),
    {window:win,document,location:{href:'https://everything.example/my-anime.html',protocol:'https:'},URL,setTimeout,console});
  await waitFor(()=>win.AnimeLibrary.state().ready && !win.AnimeLibrary.state().catalogLoading,'library status case');
  const firstSelect=findTag(mount,'SELECT').find(n=>n.attributes['aria-label']==='Watch status');
  assert(firstSelect,'Watch status control should appear');
  assert.equal(firstSelect.children.filter(x=>x.value==='paused'||x.value==='dropped').length,2,'Both statuses in select');
  assert(flatten(mount).includes('Paused')&&flatten(mount).includes('Dropped'),'Status tabs visible');
  await win.AnimeLibrary.change('one-piece',{watch_status:'paused'});
  assert.equal(state.rows[0].watch_status,'paused');assert.equal(state.rows[0].is_favorite,true);
  await win.AnimeLibrary.change('one-piece',{watch_status:'dropped'});
  assert.equal(state.rows[0].watch_status,'dropped');assert.equal(state.rows[0].is_favorite,true);
  state.failConstraint=true;
  await assert.rejects(win.AnimeLibrary.change('one-piece',{watch_status:'watching'}),err=>err.code==='23514');
  assert.equal(state.rows[0].watch_status,'dropped','Failed SQL status write leaves original record alone');
  assert(history.every(q=>q.table!=='site_anime'||q.cols==='id,title,image'));
  console.log('PASS: Paused/Dropped save and filters, favorite preservation, SQL constraint failure');
}
function checkStatuses(){
  const library=fs.readFileSync(path.join(rootDir,'anime-library.js'),'utf8');
  const sql=fs.readFileSync(path.join(rootDir,'PROJECT-DOCS/SUPABASE-PAIR02-LIBRARY-STATUSES.sql'),'utf8');
  assert(library.includes("paused:'Paused', dropped:'Dropped'"));
  assert(library.includes("['paused','Paused'],['dropped','Dropped']"));
  assert(sql.includes("'paused','dropped'"));
  assert(!/\bdelete from\b|\btruncate\b|\bupdate\s+public\./i.test(sql),'SQL must not delete/update existing records');
  assert(!/drop\s+policy|drop\s+table|disable\s+row\s+level\s+security/i.test(sql));
  assert(fs.readFileSync(path.join(rootDir,'anime-detail-auth-v22.js'),'utf8').includes('authrefresh1'));
  const home=fs.readFileSync(path.join(rootDir,'index.html'),'utf8');
  assert(home.includes('data-continue-watching hidden'));
  assert(home.includes('continue-watching.js?v=20261114-pair02'));
  console.log('PASS: PAUSED/DROPPED labels+filters, forward-compatible detail controls, safe SQL migration');
}
(async()=>{checkStatuses();await historyCase();await guestCase();await libraryStatusCase();})().catch(e=>{console.error(e);process.exitCode=1;});
