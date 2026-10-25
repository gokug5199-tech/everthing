/* The Everything home: subtle, accessible motion only. No content/API dependencies. */
(function () {
  'use strict';
  const root = document.body;
  if (!root || !root.classList.contains('hm-home')) return;
  // User can navigate with all primary actions even when animation / JS is blocked.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const header = document.querySelector('.hm-header-wrap');
  if (!header) return;
  let scheduled = false;
  window.addEventListener('scroll', function () {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      header.classList.toggle('hm-scrolled', window.scrollY > 32);
      scheduled = false;
    });
  }, { passive: true });
})();
