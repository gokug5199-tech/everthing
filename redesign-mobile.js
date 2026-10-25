(function () {
  'use strict';

  const MOBILE_QUERY = '(max-width: 767px)';
  const LOGO_SRC = 'image/home/te-icon.webp';

  function isMobile() {
    return window.matchMedia(MOBILE_QUERY).matches;
  }

  function createLogoLockup() {
    const wrap = document.createElement('span');
    wrap.className = 'te-logo-lockup';
    wrap.innerHTML = [
      '<img src="' + LOGO_SRC + '" alt="The Everything logo" decoding="async">',
      '<span class="te-logo-copy">',
      '  <span class="te-logo-title">The Everything</span>',
      '  <span class="te-logo-subtitle">Mobile Edition</span>',
      '</span>'
    ].join('');
    return wrap;
  }

  function decorateNode(node) {
    if (!node || node.dataset.mobileLogoApplied === '1') return;
    node.dataset.mobileLogoApplied = '1';
    node.classList.add('te-logo-image-host');
    const lockup = createLogoLockup();
    node.textContent = '';
    node.append(lockup);
    if (node.tagName === 'A' || node.tagName === 'BUTTON') {
      node.setAttribute('aria-label', 'The Everything');
      node.title = 'The Everything';
    }
  }

  function decorateLogos() {
    const selectors = [
      '.logo',
      '.top-logo',
      '.site-identity > .logo',
      '.auth-header > .logo',
      '.library-header > .logo',
      '.top-header .logo',
      '.watch-top .logo',
      '.te-footer-brand .te-brand-host',
      '.te-floating-brand'
    ];
    document.querySelectorAll(selectors.join(','))
      .forEach(decorateNode);
  }

  function applyBodyFlag() {
    if (!isMobile()) return;
    document.body.classList.add('te-mobile-redesign-ready');
  }

  function markSimplePages() {
    const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    document.body.setAttribute('data-mobile-page', page.replace('.html', ''));
  }

  function init() {
    if (!isMobile()) return;
    applyBodyFlag();
    markSimplePages();
    decorateLogos();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
