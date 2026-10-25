/* Anime hero banner manager — independently select up to 5 published titles. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const key='sb_publishable_3FX_mPM-A6dIY-nQTtFZQg_5HPoWO9B';
if(!$('featuredTab')||!window.supabase)return;
const db=supabase.createClient('https://tnavsfbolastevebukxl.supabase.co',key);
let titles=[],chosen=[],busy=false;
const status=message=>{$('heroStatus').textContent=message;};
const name=id=>titles.find(x=>x.id===id)?.title||id;
async function requireAdmin(){const {data,error}=await db.rpc('site_is_admin');if(error||data!==true)throw Error('Admin access is required.');}
async function refresh(){
 await requireAdmin();
 const [a,h]=await Promise.all([
   db.from('site_anime').select('id,title').order('title').limit(1000),
   db.from('site_hero_featured').select('anime_id,position,created_at').order('position').order('created_at').limit(5)
 ]);
 if(a.error)throw Error(a.error.message);
 if(h.error)throw Error('Banner table not ready. Run docs/ANIME-BANNER-V7-SETUP.sql in Supabase SQL Editor. '+h.error.message);
 titles=a.data||[];chosen=h.data||[];
 const selector=$('heroAnimeSelect');const current=selector.value;
 selector.replaceChildren();selector.add(new Option('Choose an anime…',''));
 for(const item of titles)selector.add(new Option(item.title,item.id));
 selector.value=titles.some(x=>x.id===current)?current:'';
 draw();
}
function draw(){
 $('heroCount').textContent=chosen.length+' / 5';
 const box=$('heroAnimeList');box.replaceChildren();
 if(!chosen.length){box.textContent='No anime selected for the rotating banner yet.';return;}
 chosen.forEach((item,index)=>{
  const line=document.createElement('div');line.className='featured-row';
  const label=document.createElement('span');label.textContent=(index+1)+'. '+name(item.anime_id);line.append(label);
  for(const [text,delta] of [['↑',-1],['↓',1]]){
    const button=document.createElement('button');button.type='button';button.textContent=text;
    button.title=text==='↑'?'Move up':'Move down';button.disabled=busy||index+delta<0||index+delta>=chosen.length;
    button.addEventListener('click',()=>run(async()=>{
      const target=chosen[index+delta];
      const response=await Promise.all([
        db.from('site_hero_featured').update({position:target.position}).eq('anime_id',item.anime_id),
        db.from('site_hero_featured').update({position:item.position}).eq('anime_id',target.anime_id)
      ]);
      for(const result of response)if(result.error)throw result.error;
    }));
    line.append(button);
  }
  const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.disabled=busy;
  remove.addEventListener('click',()=>run(async()=>{
    const response=await db.from('site_hero_featured').delete().eq('anime_id',item.anime_id);
    if(response.error)throw response.error;
  }));
  line.append(remove);box.append(line);
 });
}
async function run(operation){
 if(busy)return;busy=true;
 try{await requireAdmin();await operation();await refresh();status('Banner updated. Reload Anime to preview.');}
 catch(error){status(error.message||'Could not update banner.');}
 finally{busy=false;draw();}
}
$('heroAnimeAdd').addEventListener('click',()=>run(async()=>{
 const id=$('heroAnimeSelect').value;
 if(!id)throw Error('Select an anime first.');
 if(chosen.some(x=>x.anime_id===id))throw Error('This anime is already in the banner.');
 if(chosen.length>=5)throw Error('The banner can show up to five anime. Remove one to add another.');
 const position=Math.max(0,...chosen.map(x=>x.position))+10;
 const response=await db.from('site_hero_featured').insert({anime_id:id,position});
 if(response.error)throw response.error;
}));
$('featuredTab').addEventListener('click',()=>{run(async()=>{});});
})();
