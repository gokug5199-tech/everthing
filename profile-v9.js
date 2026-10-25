/* Profile V9: cosmetic enhancements using EXISTING profile & anime-library values. */
(() => {
  'use strict';
  const library = document.getElementById('libraryCount');
  const completed = document.getElementById('completedAnimeCount');
  const summary = document.getElementById('profileV9ProgressText');
  const bar = document.getElementById('profileV9ProgressBar');
  if (!library || !completed || !summary || !bar) return;
  let ready = false;
  const update = () => {
    const rawTotal = library.textContent.trim();
    const rawDone = completed.textContent.trim();
    const total = Number(rawTotal);
    const done = Number(rawDone);
    if (!Number.isFinite(total) || !Number.isFinite(done) || total < 0 || done < 0) return;
    const count = Math.min(done, total);
    summary.textContent = `${count} of ${total} completed`;
    bar.style.width = `${total ? Math.round(count / total * 100) : 0}%`;
  };
  const observer = new MutationObserver(update);
  observer.observe(library, {childList:true,characterData:true,subtree:true});
  observer.observe(completed, {childList:true,characterData:true,subtree:true});
  update();
})();
