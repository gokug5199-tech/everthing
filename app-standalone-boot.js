/* The Everything: detect a Home Screen PWA before the first style paint.
   A regular browser tab never receives these classes, including on phones. */
(function () {
  'use strict';
  var root = document.documentElement;
  function sync() {
    var installed = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
    var compact = window.matchMedia ? window.matchMedia('(max-width: 767px)').matches : false;
    root.classList.toggle('te-app-mode', Boolean(installed && compact));
  }
  sync();
  if (window.matchMedia) {
    var display = window.matchMedia('(display-mode: standalone)');
    var narrow = window.matchMedia('(max-width: 767px)');
    [display, narrow].forEach(function (media) {
      if (media.addEventListener) media.addEventListener('change', sync);
      else if (media.addListener) media.addListener(sync);
    });
  }
})();
