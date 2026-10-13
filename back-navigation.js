/* Shared back buttons. Normal Home links are never intercepted. */
(function () {
    'use strict';
    const key = 'te-navigation-pending-v1';
    const stateKey = 'teNavigationV1';
    const current = new URL(location.href);

    function isSiteURL(value) {
        try {
            const url = new URL(value, current);
            if (current.protocol === 'file:') {
                return url.protocol === 'file:' &&
                    new URL('.', url).href === new URL('.', current).href;
            }
            return /^https?:$/.test(url.protocol) && url.origin === current.origin;
        } catch (_) { return false; }
    }

    let hasPrevious = false;
    try {
        const saved = history.state && history.state[stateKey];
        if (saved && saved.url === current.href) {
            hasPrevious = saved.hasPrevious === true;
        } else {
            hasPrevious = Boolean(document.referrer && isSiteURL(document.referrer));
            // Local file pages often have no referrer. Track same-tab link clicks.
            try {
                const pending = JSON.parse(sessionStorage.getItem(key) || 'null');
                sessionStorage.removeItem(key);
                if (pending && pending.to === current.href && isSiteURL(pending.from) &&
                    Date.now() - pending.time < 30000) hasPrevious = true;
            } catch (_) { /* Storage may be disabled. */ }
            history.replaceState(Object.assign({}, history.state, {
                [stateKey]: { url: current.href, hasPrevious: hasPrevious }
            }), '');
        }
    } catch (_) { /* Navigation still has its safe Home fallback. */ }

    document.addEventListener('click', function (event) {
        const link = event.target.closest && event.target.closest('a');
        if (!link || event.defaultPrevented || event.button !== 0 ||
            event.ctrlKey || event.metaKey || event.shiftKey || event.altKey ||
            link.hasAttribute('download') || (link.target && link.target !== '_self')) return;

        if (link.hasAttribute('data-back')) {
            event.preventDefault();
            // Prefer the actual previous history entry when the browser exposes it.
            let canGoBack = history.length > 1 &&
                (current.protocol === 'file:' || hasPrevious);
            try {
                if (current.protocol !== 'file:' && window.navigation && window.navigation.currentEntry) {
                    const entry = window.navigation.currentEntry;
                    const previous = window.navigation.entries().find(item => item.index === entry.index - 1);
                    // file:// entries may be hidden from the Navigation API.
                    // Keep the recorded same-tab transition when no URL is exposed.
                    if (previous && previous.url) {
                        canGoBack = isSiteURL(previous.url);
                    } else if (current.protocol !== 'file:') {
                        canGoBack = false;
                    }
                }
            } catch (_) {}
            if (canGoBack) history.back();
            else location.assign(new URL('index.html', current).href);
            return;
        }

        if (isSiteURL(link.href) && link.href !== current.href) {
            try {
                sessionStorage.setItem(key, JSON.stringify({
                    from: current.href, to: link.href, time: Date.now()
                }));
            } catch (_) {}
        }
    }, true); // Capture before account-menu stopPropagation handlers.
})();
