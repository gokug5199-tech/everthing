/* The Everything / Admin v14: presentation only. Never handles Supabase writes. */
(() => {
  'use strict';
  const form = document.getElementById('animeForm');
  const btnSave = document.getElementById('adminQuickSave');
  const btnNew = document.getElementById('adminQuickNew');
  const nativeSave = document.getElementById('save');
  const nativeReset = document.getElementById('reset');
  const tabMap = [
    ['animeTab','animeSection'],
    ['episodeTab','episodeSection'],
    ['wallTab','wallSection'],
    ['featuredTab','featuredSection']
  ];
  if (!form || !btnSave || !btnNew || !nativeSave || !nativeReset) return;
  btnSave.addEventListener('click', () => {
    if (!nativeSave.disabled && !form.hidden) {
      if (typeof form.requestSubmit === 'function') form.requestSubmit(nativeSave);
      else nativeSave.click();
    }
  });
  btnNew.addEventListener('click', () => {
    if (!nativeReset.disabled) {
      nativeReset.click();
      document.getElementById('animeId')?.focus({preventScroll: true});
    }
  });
  const update = () => {
    for (const [buttonId,sectionId] of tabMap) {
      const button=document.getElementById(buttonId);
      const section=document.getElementById(sectionId);
      if (!button || !section) continue;
      const active=!section.hidden;
      button.classList.toggle('is-active',active);
      button.setAttribute('aria-pressed',String(active));
    }
    btnSave.disabled=nativeSave.disabled;
    btnNew.disabled=nativeReset.disabled;
    btnSave.firstChild && (btnSave.firstChild.textContent=nativeSave.textContent.trim()+' ');
  };
  const observer=new MutationObserver(update);
  tabMap.forEach(([_,id])=>{const node=document.getElementById(id);if(node)observer.observe(node,{attributes:true,attributeFilter:['hidden']});});
  observer.observe(nativeSave,{attributes:true,attributeFilter:['disabled']});
  observer.observe(nativeReset,{attributes:true,attributeFilter:['disabled']});
  observer.observe(nativeSave,{childList:true,subtree:true});
  update();
})();
