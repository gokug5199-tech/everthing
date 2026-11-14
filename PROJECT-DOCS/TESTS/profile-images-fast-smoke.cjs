/* node PROJECT-DOCS/TESTS/profile-images-fast-smoke.cjs */
'use strict';
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const cache = new Map();
const store = {
  getItem(key) { return cache.get(key) ?? null; },
  setItem(key, value) { cache.set(key, value); },
  removeItem(key) { cache.delete(key); }
};
function element() {
  const attrs = new Map(), classes = new Set(), listeners = new Map();
  return {
    disabled: false, value:'', hidden:false, textContent:'',
    style: {setProperty(name,val) {attrs.set(name,val);},removeProperty(name){attrs.delete(name);},getPropertyValue(name){return attrs.get(name)||'';}},
    classList: {add(name){classes.add(name);},remove(name){classes.delete(name);},contains(name){return classes.has(name);}},
    addEventListener(name,fn){listeners.set(name,fn);},
    _listeners:listeners,
    removeAttribute(){}, focus(){}, showModal(){},close(){}
  };
}
const body = element(), hero = element();
const nodes = Object.fromEntries([
  'pageCoverDialog','pageCoverOpen','pageCoverFile','pageCoverPreview','pageCoverSave','pageCoverRemove','pageCoverClose','pageCoverMessage',
  'coverDialog','coverOpen','coverFile','coverPreview','coverSave','coverRemove','coverClose','coverMessage'
].map(name => [name,element()]));
const doc = {body, hidden:false, getElementById(name){return nodes[name];},querySelector(sel){return sel==='.profile-hero'?hero:null;}};
const window = {addEventListener(){}};
const ctx = vm.createContext({window, document:doc, sessionStorage:store, setInterval(){},console,Date,JSON,Number,crypto:{randomUUID(){return 'new-uuid';}}, URL:{revokeObjectURL(){}}});
function run(script) { vm.runInContext(fs.readFileSync(path.join(root,script),'utf8'),ctx,{filename:script}); }
run('profile-background-fast.js');
run('profile-cover.js');
run('profile-page-background.js');
function client(user,kind) {
  let signCount=0, queryCount=0, deletions=0, imagePath = user+'/image.jpg';
  const bucket={ async createSignedUrl(p,s){assert.equal(s,3600);signCount++;return {data:{signedUrl:`https://private.example/${p}?token=sign-${signCount}`}};},async remove(){return {error:null};}};
  return {
    stats(){return {signCount,queryCount,deletions};},
    storage:{from(x){assert.equal(x,kind==='cover'?'profile-covers':'profile-page-backgrounds');return bucket;}},
    from(table){assert.equal(table,kind==='cover'?'profile_covers':'profile_page_backgrounds');return {
      select(){return {eq(){return {async maybeSingle(){queryCount++;return {data:{file_path:imagePath}};}};}};},
      delete(){return {eq(){return {async select(){deletions++;imagePath=null;return {data:{user_id:user}};}};}};}
    };}
  };
}
async function tests() {
  const user = {id:'user-one'};
  const c=client(user.id,'page');
  await window.initProfilePageBackground(c,user);
  assert.equal(c.stats().signCount,1,'cold render signs once');
  assert.equal(c.stats().queryCount,1);
  assert(body.classList.contains('has-page-background'));
  assert(body.style.getPropertyValue('--profile-page-image').includes('sign-1'));
  const remove=nodes.pageCoverRemove._listeners.get('click');
  assert(remove,'remove handler exists');
  // Returning to Profile should paint the cached image synchronously, before the DB reply.
  const c2=client(user.id,'page');
  const p=window.initProfilePageBackground(c2,user);
  assert(body.style.getPropertyValue('--profile-page-image').includes('sign-1'));
  await p;
  assert.equal(c2.stats().signCount,0,'warm render uses same signed url');
  assert.equal(c2.stats().queryCount,1,'warm render checks DB for changes');
  // Cover gets its own cache; different user cannot reuse either background.
  const cover=client(user.id,'cover');
  await window.initProfileCover(cover,user);
  assert.equal(cover.stats().signCount,1);
  assert(hero.classList.contains('has-cover'));
  const other=client('another-user','page');
  await window.initProfilePageBackground(other,{id:'another-user'});
  assert.equal(other.stats().signCount,1,'never restore a different account image');
  // Expired entry cannot be reused.
  const key='theeverything:profile-background:v1:page:user-one';
  const old=JSON.parse(cache.get(key));old.expires=Date.now()+500;
  cache.set(key, JSON.stringify(old));
  const c3=client(user.id,'page');await window.initProfilePageBackground(c3,user);
  assert.equal(c3.stats().signCount,1,'near-expiry requires fresh signed URL');
  // Removal clears the URL, class, cached path, and data without affecting cover.
  const lastRemove=nodes.pageCoverRemove._listeners.get('click');
  await lastRemove();
  assert.equal(c3.stats().deletions,1);
  assert(!body.classList.contains('has-page-background'));
  assert(!cache.has(key));
  assert(hero.classList.contains('has-cover'));
  // Failure to access sessionStorage must not stop image loading.
  const badStore={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');},removeItem(){throw Error('blocked');}};
  const noStoreContext=vm.createContext({window:{},sessionStorage:badStore, Date,Number,JSON});
  vm.runInContext(fs.readFileSync(path.join(root,'profile-background-fast.js'),'utf8'),noStoreContext);
  const x=element();
  const restored=noStoreContext.window.TEProfileBackgroundFast.restore('page','test',x,'--x','has-x');
  assert.equal(restored,null);
  await noStoreContext.window.TEProfileBackgroundFast.paint('page','test','some/path',{async createSignedUrl(){return {data:{signedUrl:'https://private.example/img'}};}},x,'--x','has-x');
  assert(x.classList.contains('has-x'));
  console.log('PASS: cold/warm/expired cache, account isolation, separate covers, remove, disabled sessionStorage');
}
tests().catch(e => {console.error(e);process.exitCode=1;});
