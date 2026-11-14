/* THE EVERYTHING — profile background fast path.
 * Store signed URLs for at most one browser session, scoped to user and image type.
 * Never store the image bytes in the Service Worker or expose a private image publicly.
 */
(function () {
    'use strict';
    const prefix = 'theeverything:profile-background:v1:';
    // Supabase signed URLs last 60 minutes. Stop using them sooner so they never expire mid-visit.
    const useFor = 50 * 60 * 1000;
    const renewWithin = 5 * 60 * 1000;

    function key(kind, userId) { return prefix + kind + ':' + userId; }
    function read(kind, userId) {
        try {
            const value = JSON.parse(sessionStorage.getItem(key(kind, userId)) || 'null');
            if (value && typeof value.path === 'string' && typeof value.url === 'string'
                && Number.isFinite(value.expires) && value.expires > Date.now() + renewWithin) {
                return value;
            }
        } catch (_) { /* session storage may be disabled */ }
        return null;
    }
    function write(kind, userId, path, url) {
        try { sessionStorage.setItem(key(kind, userId), JSON.stringify({path, url, expires: Date.now() + useFor})); }
        catch (_) { /* fallback: the image still loads normally */ }
    }
    function clear(kind, userId) {
        try { sessionStorage.removeItem(key(kind, userId)); } catch (_) {}
    }
    function setImage(element, property, className, url) {
        if (!url) {
            element.style.removeProperty(property);
            element.classList.remove(className);
            return;
        }
        // JSON.stringify escapes quotes and dangerous CSS URL characters safely.
        element.style.setProperty(property, 'url(' + JSON.stringify(url) + ')');
        element.classList.add(className);
    }
    function restore(kind, userId, element, property, className) {
        const cached = read(kind, userId);
        if (cached) setImage(element, property, className, cached.url);
        return cached;
    }
    async function paint(kind, userId, path, bucket, element, property, className) {
        if (!path) {
            clear(kind, userId);
            setImage(element, property, className, null);
            return;
        }
        const cached = read(kind, userId);
        if (cached && cached.path === path) {
            setImage(element, property, className, cached.url);
            return;
        }
        const response = await bucket.createSignedUrl(path, 3600);
        if (response.error) throw response.error;
        const url = response.data && response.data.signedUrl;
        if (!url) throw new Error('Signed image URL was not returned.');
        write(kind, userId, path, url);
        setImage(element, property, className, url);
    }
    window.TEProfileBackgroundFast = { restore, paint, clear };
}());
