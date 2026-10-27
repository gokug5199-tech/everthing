/* The Everything — Safari performance v15 (early opt-in). */
(function () {
  'use strict';
  var ua = navigator.userAgent || '';
  var ios = /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var safari = /Safari/i.test(ua) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|GSA|YaBrowser/i.test(ua);
  // Add ?safari-full-effects=1 to a URL to compare the old appearance/performance.
  var optOut = /(?:\?|&)safari-full-effects=1(?:&|$)/.test(location.search);
  if (ios && safari && !optOut) {
    document.documentElement.classList.add('te-safari-perf');
  }
})();
