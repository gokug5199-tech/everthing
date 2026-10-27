/* Public episode reader. Uses the publishable Supabase key, never a service-role secret. */
(function () {
    'use strict';
    const api = 'https://tnavsfbolastevebukxl.supabase.co/rest/v1/site_episodes';
    const publicKey = 'sb_publishable_3FX_mPM-A6dIY-nQTtFZQg_5HPoWO9B';

    function safeLink(input) {
        if (typeof input !== 'string' || !input.trim()) return '';
        const raw = input.trim();
        try {
            const link = new URL(raw, location.href);
            if (link.username || link.password) return '';
            if (link.protocol === 'http:' || link.protocol === 'https:') return link.href;
            if (link.protocol === 'file:' && location.protocol === 'file:' && !/^[a-z][a-z\d+.-]*:/i.test(raw)) return link.href;
        } catch (error) { /* malformed link */ }
        return '';
    }
    function sourceKind(input) {
        const href = safeLink(input);
        if (!href) return 'invalid';
        const url = new URL(href);
        if (/\.(mp4|webm|ogg|m4v)$/i.test(url.pathname)) return 'video';
        if (url.protocol !== 'https:') return 'external';
        if ((url.hostname === 'hgcloud.to' || url.hostname.endsWith('.hgcloud.to') || url.hostname === 'streamhg.com' || url.hostname === 'www.streamhg.com') && /^\/e\/[a-z0-9_-]+\/?$/i.test(url.pathname)) return 'embed';
        // VOE uses /e/<video-id> for its embeddable player, not the direct download link.
        if ((url.hostname === 'voe.sx' || url.hostname === 'www.voe.sx') && /^\/e\/[a-z0-9_-]+\/?$/i.test(url.pathname)) return 'embed';
        if (url.hostname === 'player.mediadelivery.net' && url.pathname.startsWith('/embed/')) return 'embed';
        if ((url.hostname === 'videa.hu' || url.hostname === 'www.videa.hu') && ((url.pathname === '/player' && /^[a-z0-9]{6,40}$/i.test(url.searchParams.get('v') || '')) || /^\/player\/v\/[a-z0-9]+\/?$/i.test(url.pathname))) return 'embed';
        return 'external';
    }
    // v17: resolve a provider's public watch link to its documented embed URL.
    // Never scrape pages, proxy media, or guess an unverified iframe endpoint.
    function parseSource(input) {
        if (typeof input !== 'string') throw Error('Paste a video link or an iframe embed code.');
        let raw = input.trim();
        if (/^<iframe\b/i.test(raw)) {
            const doc = new DOMParser().parseFromString(raw, 'text/html');
            raw = doc.querySelector('iframe')?.getAttribute('src')?.trim() || '';
        }
        if (raw.startsWith('//')) raw = 'https:' + raw;
        if (!/^https?:\/\//i.test(raw) || /[<>]/.test(raw)) {
            throw Error('Use a full HTTPS video URL or the complete iframe embed code.');
        }
        let url;
        try { url = new URL(raw); } catch (_) { throw Error('The video URL is not valid.'); }
        if (url.username || url.password || !['https:', 'http:'].includes(url.protocol)) {
            throw Error('The video URL must use HTTPS without an embedded username or password.');
        }
        // All three selected providers have HTTPS player URLs.
        const host = url.hostname.toLowerCase();
        const isVidea = host === 'videa.hu' || host === 'www.videa.hu';
        const isVOE = host === 'voe.sx' || host === 'www.voe.sx';
        const isHG = host === 'hgcloud.to' || host.endsWith('.hgcloud.to') || host === 'streamhg.com' || host === 'www.streamhg.com';
        let name = isVidea ? 'Videa' : isVOE ? 'VOE' : isHG ? 'HGCloud' : 'Server';
        if (isVidea && url.pathname.startsWith('/videok/')) {
            // Videa's own watch pages expose a player?v=VIDEO_ID iframe.
            const match = /-([a-z0-9]{12,32})\/?$/i.exec(url.pathname);
            if (match) url = new URL('https://videa.hu/player?v=' + encodeURIComponent(match[1]));
        } else if (isVOE && /^\/[a-z0-9_-]{6,40}\/?$/i.test(url.pathname)) {
            url = new URL('https://voe.sx/e/' + url.pathname.replace(/^\/|\/$/g, ''));
        }
        if (url.protocol === 'http:') {
            if (isVidea || isVOE || isHG) url.protocol = 'https:';
            else throw Error('Use an HTTPS link to display videos on your secure site.');
        }
        const kind = sourceKind(url.href);
        const warning = (isVidea || isVOE || isHG) && kind !== 'embed' && kind !== 'video'
            ? `${name}: paste the provider's Embed link or iframe code; this URL is not an embeddable player.`
            : kind === 'external' ? 'This URL will open in a new tab, not play inside the website.' : '';
        return {url: url.href, name, kind, warning};
    }

    function sourceList(value) {
        if (typeof value === 'string') return [{name: 'Server 1', quality: 'auto', url: value}];
        if (!Array.isArray(value)) return [];
        return value.filter(s => s && typeof s.url === 'string' && safeLink(s.url)).map(s => ({
            name: String(s.name || 'Server').slice(0, 50),
            quality: ['auto', '480p', '720p', '1080p'].includes(s.quality) ? s.quality : 'auto',
            url: s.url
        }));
    }
    function legacy(anime) {
        const links = anime.episodeLinks || anime.episode_links || {};
        const max = Math.min(2000, Math.max(0, Number(anime.episodes) || 0));
        const entries = [];
        for (let number = 1; number <= max; number++) {
            entries.push({anime_id: anime.id, season_number: 1, episode_number: number, title: '', sources: sourceList(links[number] || links[String(number)]), legacy: true});
        }
        for (const key of Object.keys(links)) {
            const number = Number(key);
            if (Number.isInteger(number) && number > max && number <= 2000 && number > 0) {
                entries.push({anime_id: anime.id, season_number: 1, episode_number: number, title: '', sources: sourceList(links[key]), legacy: true});
            }
        }
        return entries;
    }
    async function list(anime) {
        const all = new Map(legacy(anime).map(e => [`${e.season_number}:${e.episode_number}`, e]));
        let error = '';
        try {
            for (let offset = 0; offset < 10000; offset += 500) {
                const url = `${api}?select=anime_id,season_number,episode_number,title,sources&anime_id=eq.${encodeURIComponent(anime.id)}&order=season_number.asc,episode_number.asc&limit=500&offset=${offset}`;
                const response = await fetch(url, {headers: {apikey: publicKey}, signal: AbortSignal.timeout(15000)});
                if (!response.ok) throw Error(`HTTP ${response.status}`);
                const batch = await response.json();
                for (const entry of batch) {
                    if (!Number.isInteger(entry.season_number) || !Number.isInteger(entry.episode_number)) continue;
                    all.set(`${entry.season_number}:${entry.episode_number}`, {...entry, sources: sourceList(entry.sources)});
                }
                if (batch.length < 500) break;
            }
        } catch (err) {
            error = 'Unable to load saved episodes. Verify the connection and run EPISODES-SETUP.sql if the table is missing.';
            console.warn('Episode list unavailable:', err);
        }
        const episodes = Array.from(all.values()).sort((a, b) => a.season_number - b.season_number || a.episode_number - b.episode_number);
        return {episodes, error};
    }
    window.EpisodeAPI = {list, safeLink, sourceKind, sourceList, parseSource};
})();
