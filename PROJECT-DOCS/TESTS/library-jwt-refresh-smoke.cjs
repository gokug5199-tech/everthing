/* Local deterministic JWT expiration tests. These do not contact production Supabase. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..', '..');
const code = fs.readFileSync(path.join(root, 'anime-library.js'), 'utf8');
const expired = {code:'PGRST301', message:'JWT expired', status:401};
const tick = () => new Promise(resolve => setImmediate(resolve));
async function waitUntil(fn) {for(let i=0;i<100;i++){if(fn())return;await tick();}throw Error('Timed out waiting for library');}
function start(opts = {}) {
  const state={
    user:{id:'owner-a'},tokenExpired:false,refreshed:0,refreshFails:false,
    refreshDifferentUser:false, calls:[], stored:[{user_id:'owner-a',anime_id:11,watch_status:'watching',is_favorite:false,updated_at:'2026-11-14'}],
    listeners:[]
  };
  const client={
    auth: {
      getSession: async()=>({data:{session:state.user?{user:state.user,expires_at:Math.floor(Date.now()/1000)+120}:null},error:null}),
      refreshSession: async()=>{
        state.refreshed++;
        if (state.refreshFails) return {data:{session:null},error:{message:'Invalid Refresh Token: Already Used'}};
        const user=state.refreshDifferentUser?{id:'owner-b'}:state.user;
        state.tokenExpired=false;
        return {data:{session:user?{user}:null},error:null};
      },
      onAuthStateChange:cb=>{state.listeners.push(cb);return {data:{subscription:{unsubscribe(){}}}};}
    },
    from(table) {
      const q={table,op:'read',where:{},ids:null,row:null};
      const chain={
        select(){return chain;},eq(k,v){q.where[k]=v;return chain;},order(){return chain;},range(){return chain;},in(_k,ids){q.ids=ids;return chain;},
        delete(){q.op='delete';return chain;},upsert(row){q.op='upsert';q.row=row;return chain;},single(){return chain;},
        then(resolve,reject){
          state.calls.push({...q});
          if(state.tokenExpired) return Promise.resolve({data:null,error:expired}).then(resolve,reject);
          if(table==='site_anime') return Promise.resolve({data:[{id:11,title:'Death Note',image:'https://example.org/d.jpg'}],error:null}).then(resolve,reject);
          if(q.op==='upsert') {
            state.stored=[q.row];return Promise.resolve({data:q.row,error:null}).then(resolve,reject);
          }
          if(q.op==='delete'){
            state.stored=[];return Promise.resolve({data:null,error:null}).then(resolve,reject);
          }
          return Promise.resolve({data:state.stored.filter(r=>r.user_id===q.where.user_id),error:null}).then(resolve,reject);
        }
      };return chain;
    }
  };
  const window={supabase:{createClient:()=>client}};
  const document={querySelector:()=>null,createElement:tag=>({tagName:tag,children:[],setAttribute(){},append(...parts){this.children.push(...parts);},classList:{add(){}},hidden:false})};
  const context={window,document,location:{href:'https://example.org/anime-details.html',protocol:'https:'},URL,console,setTimeout,Date};
  vm.runInNewContext(code,context);
  return {lib:window.AnimeLibrary,state};
}
(async()=>{
  {
    const {lib,state}=start();await waitUntil(()=>lib.state().ready&&!lib.state().catalogLoading);
    state.tokenExpired=true;
    await lib.change(11,{is_favorite:true});
    assert.equal(state.refreshed,1);
    assert.equal(state.stored[0].is_favorite,true);
    assert.equal(state.calls.filter(x=>x.op==='upsert').length,2,'Only one failed write + one retry');
    assert.equal(lib.state().authNeedsLogin,false);
    console.log('PASS: stale JWT on favorite write → refresh and one retry');
  }
  {
    const {lib,state}=start();await waitUntil(()=>lib.state().ready&&!lib.state().catalogLoading);
    state.tokenExpired=true;
    await lib.change(11,{watch_status:'none'});
    assert.equal(state.refreshed,1);
    assert.equal(state.stored.length,0);
    assert.equal(state.calls.filter(x=>x.op==='delete').length,2);
    console.log('PASS: stale JWT on delete → refresh and one retry');
  }
  {
    const {lib,state}=start();await waitUntil(()=>lib.state().ready&&!lib.state().catalogLoading);
    state.tokenExpired=true;state.refreshFails=true;
    await assert.rejects(lib.change(11,{is_favorite:true}),err=>/log in again/i.test(err.message));
    assert.equal(state.refreshed,1);
    assert.equal(state.stored[0].is_favorite,false);
    assert.equal(lib.state().authNeedsLogin,true);
    console.log('PASS: failed token refresh → useful login message, no data mutation');
  }
  {
    const {lib,state}=start();await waitUntil(()=>lib.state().ready&&!lib.state().catalogLoading);
    state.tokenExpired=true;state.refreshDifferentUser=true;
    await assert.rejects(lib.change(11,{is_favorite:true}),err=>err.code==='AUTH_EXPIRED');
    assert.equal(state.stored[0].is_favorite,false);
    console.log('PASS: changed account never writes original owner data after token renewal');
  }
  for (const page of ['my-anime.html','profile.html','anime-detail-auth-v22.js']) {
    assert(fs.readFileSync(path.join(root,page),'utf8').includes('anime-library.js?v=20261114-authrefresh1'));
  }
  console.log('PASS: all pages reference the new library version');
})().catch(err=>{console.error(err);process.exitCode=1;});
