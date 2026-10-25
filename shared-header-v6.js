/* Keep exactly one functioning Supabase account menu; relocate it into the
   home-style nav after account-menu.js creates it. No new auth implementation. */
(function(){
  'use strict';
  const mount=document.getElementById('v6AccountMount');
  if(!mount)return;
  const move=()=>{
    const account=document.getElementById('sharedAccountMenu');
    if(!account)return false;
    if(account.parentElement!==mount)mount.appendChild(account);
    return true;
  };
  if(move())return;
  const obs=new MutationObserver(()=>{if(move())obs.disconnect()});
  obs.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('pagehide',()=>obs.disconnect(),{once:true});
})();
