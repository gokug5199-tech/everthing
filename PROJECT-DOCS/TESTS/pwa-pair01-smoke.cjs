/* Local mock test — no real Supabase or Cloudflare connection. */
'use strict';
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const root = require('path').join(__dirname, '..', '..');

class Node {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase(); this.children = []; this.attributes = {}; this.style = {};
    this.textContent = ''; this.hidden = false; this.value = ''; this.disabled = false;
    this.classList = {add: (...a) => {this.classes = [...(this.classes||[]), ...a];}};
  }
  append(...nodes) {this.children.push(...nodes);}
  replaceChildren(...nodes) {this.children = [...nodes];}
  setAttribute(k,v) {this.attributes[k] = v;}
  removeAttribute(k) {delete this.attributes[k];}
  getAttribute(k) {return this.attributes[k];}
  closest() {return null;}
  remove() {this.removed = true;}
  querySelectorAll(q) {
    if (q === 'a[data-te-tab]') return this.children.filter(n => n.tagName === 'A' && n.dataset?.teTab);
    return [];
  }
}
function flattenText(root) {
  return [root.textContent, ...root.children.flatMap(flattenText)].join(' ');
}
function waitUntil(test, msg) {
  return new Promise((resolve,reject) => {
    let tries = 0;
    const step = () => { if(test()) resolve(); else if(++tries>200) reject(Error(msg)); else setImmediate(step);};
    step();
  });
}
function supabaseMock(records) {
  const log=[];
  const state={stored:records.map(x=>({...x})), user:{id:'user-one'}};
  const client={
    auth:{getSession:async()=>({data:{session:state.user?{user:state.user}:null}}), onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
    from(table) {
      const q = {table, where:{}, inIds:null, cols:null, op:'read', bounds:null, data:null};
      const chain = {
        select(cols) {q.cols=cols;return chain;},
        eq(k,v) {q.where[k]=v;return chain;},
        order() {return chain;},
        range(start,end) {q.bounds=[start,end];return chain;},
        in(k,list) {q.inIds=list;return chain;},
        delete() {q.op='delete';return chain;},
        upsert(data) {q.op='upsert';q.data=data;return chain;},
        single() {return chain;},
        then(resolve,reject) {
          log.push({...q});
          let data=[];
          if (table==='user_anime_library') {
            if (q.op==='delete') {state.stored=state.stored.filter(row=>String(row.anime_id)!==String(q.where.anime_id));}
            else if (q.op==='upsert') {
              state.stored=state.stored.filter(row=>String(row.anime_id)!==String(q.data.anime_id));
              state.stored.push(q.data);
              data=q.data;
            } else {
              data=state.stored.filter(row=>row.user_id===q.where.user_id);
              if(q.bounds)data=data.slice(q.bounds[0],q.bounds[1]+1);
            }
          } else if(table==='site_anime') {
            if(q.cols!=='id,title,image')throw Error('Unbounded catalog SELECT: '+q.cols);
            data=(q.inIds||[]).map(id=>({id,title:'Saved Anime '+id,image:'https://example.com/'+id+'.jpg'}));
          } else throw Error('Unexpected table '+table);
          return Promise.resolve({data,error:null}).then(resolve,reject);
        }
      };
      return chain;
    }
  };
  return {client,log,state};
}
async function libraryCase(count,isGuest=false) {
  const entries=Array.from({length:count},(_,i)=>({user_id:'user-one',anime_id:'a'+(i+1),watch_status:i%3===0?'completed':'watching',is_favorite:i%4===0,updated_at:'2026-11-14'}));
  const {client,log,state}=supabaseMock(entries);
  if(isGuest)state.user=null;
  const placeholders={libraryCount:new Node('strong'),completedAnimeCount:new Node('strong')};
  const mount=new Node('div');
  const document={querySelector:s=>s==='[data-anime-library]'?mount:null,getElementById:id=>placeholders[id]||null,
    createElement:tag=>new Node(tag)};
  const win={supabase:{createClient:()=>client}};
  const context={window:win,document,location:{href:'https://example.com/my-anime.html',protocol:'https:'},URL,setTimeout,console};
  vm.runInNewContext(fs.readFileSync(require('path').join(root,'anime-library.js'),'utf8'),context);
  await waitUntil(()=>win.AnimeLibrary.state().ready && !win.AnimeLibrary.state().catalogLoading,'library not ready');
  assert.equal(log.filter(e=>e.table==='user_anime_library').length,isGuest?0:1);
  assert.equal(log.filter(e=>e.table==='site_anime').length,isGuest?0:Math.ceil(count/50));
  assert(log.every(e=>e.table!=='site_anime'||(e.inIds&&e.inIds.length<=50&&e.cols==='id,title,image')));
  assert(!win.ANIME_READY && !win.ANIME_DATA,'Library should not access full catalog');
  assert.equal(placeholders.libraryCount.textContent, String(isGuest?0:count));
  assert.equal(placeholders.completedAnimeCount.textContent, String(isGuest?0:Math.ceil(count/3)));
  assert(flattenText(mount).includes(isGuest?'Log in':count?'Saved Anime a1':'Nothing here yet'));
  if(!isGuest&&count){
    const first=entries[0];
    await win.AnimeLibrary.change(first.anime_id,{watch_status:'planned'});
    assert.equal(state.stored.find(x=>x.anime_id===first.anime_id).watch_status,'planned');
    const second=entries[1];
    if(second){await win.AnimeLibrary.change(second.anime_id,{watch_status:'none',is_favorite:false});
      assert(!state.stored.some(x=>x.anime_id===second.anime_id));}
  }
  console.log('PASS: library case',JSON.stringify({entries:count,guest:isGuest,requests:log.length}));
}
function navCase() {
  const winListeners={};const docListeners={};
  const body=new Node('body');let currentNav=null;
  body.append=(...nodes)=>{body.children.push(...nodes);for(const n of nodes)if(n.className==='te-mobile-nav')currentNav=n;};
  const doc={
    currentScript:{src:'https://example.com/mobile-pwa.js?v=pair1'},
    readyState:'loading',head:new Node('head'),body,
    querySelector:s=>s==='.te-mobile-nav'?currentNav:null,
    createElement(tag) {const node=new Node(tag);node.dataset={};return node;},
    addEventListener(k,fn) {docListeners[k]=fn;}
  };
  const win={matchMedia:q=>({matches:q.includes('max-width')}),addEventListener:(k,fn)=>{winListeners[k]=fn;},
    setTimeout() {throw Error('Install banner should not appear on episode choice');}};
  const ctx={window:win,document:doc,location:{href:'https://example.com/episode-choice.html?anime=a1',pathname:'/episode-choice.html',protocol:'https:',hostname:'example.com'},
    navigator:{userAgent:'Mozilla/5.0 iPhone Safari',platform:'iPhone',standalone:true},URL,localStorage:{getItem:()=>null,setItem(){}},console};
  vm.runInNewContext(fs.readFileSync(require('path').join(root,'mobile-pwa.js'),'utf8'),ctx);
  docListeners.DOMContentLoaded();
  assert(currentNav,'Mobile nav not added to choice page');
  assert.equal(currentNav.children.length,4);
  assert.equal(currentNav.children.filter(n=>n.getAttribute('aria-current')==='page').length,1);
  assert.equal(currentNav.children.find(n=>n.getAttribute('aria-current')==='page').dataset.teTab,'Anime');
  console.log('PASS: PWA nav is present on episode-choice and Anime tab is active');
}
(async()=>{await libraryCase(2);await libraryCase(51);await libraryCase(0);await libraryCase(0,true);navCase();})().catch(e=>{console.error(e);process.exitCode=1;});
