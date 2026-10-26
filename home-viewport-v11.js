/* One-time restoration of the homepage's horizontal position on iOS Safari.
   Vertical scroll is intentionally preserved, e.g. on Back navigation. */
(function () {
  'use strict';
  if (!document.body || !document.body.classList.contains('hm-home')) return;
  function resetHorizontalPosition() {
    if (!window.matchMedia('(max-width: 767px)').matches) return;
    if (document.scrollingElement) document.scrollingElement.scrollLeft = 0;
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
  }
  resetHorizontalPosition();
  window.addEventListener('pageshow', resetHorizontalPosition);
  window.addEventListener('orientationchange', resetHorizontalPosition);
})();
