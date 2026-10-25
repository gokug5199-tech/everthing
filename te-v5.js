/* The Everything / progressive usability enhancements. Existing auth, video,
   Supabase and wallpaper handlers remain untouched. */
(function () {
  'use strict';
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  function start() {
    if (!document.body.classList.contains('te-v5')) return;
    if (page === 'anime.html') {
      const search = document.getElementById('animeSearch');
      const genres = document.getElementById('teMoreGenres');
      if (search) {
        document.addEventListener('keydown', event => {
          if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
          const target = event.target;
          const typing = target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
          if (event.key === '/' && !typing) {
            event.preventDefault();
            document.getElementById('discover')?.scrollIntoView({behavior:'smooth', block:'center'});
            search.focus({preventScroll:true});
          }
        });
      }
      if (genres) genres.title = 'Filter the anime available on this site';
      document.getElementById('animeGrid')?.setAttribute('aria-label','Browse anime collection');
    }
    if (['index.html','anime.html','wallpaper.html','films.html'].includes(page)) {
      const backTop = document.createElement('button');
      backTop.className = 'te-v5-backtop';
      backTop.type = 'button';
      backTop.textContent = '↑';
      backTop.setAttribute('aria-label','Back to top');
      backTop.title = 'Back to top';
      document.body.append(backTop);
      const update = () => backTop.classList.toggle('is-visible', window.scrollY > 720);
      backTop.addEventListener('click', () => window.scrollTo({top:0,behavior:'smooth'}));
      window.addEventListener('scroll', update, {passive:true});
      update();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
