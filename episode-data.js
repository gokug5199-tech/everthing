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
        if ((url.hostname === 'hgcloud.to' || url.hostname.endsWith('.hgcloud.to') || url.hostname === 'streamhg.com') && /^\/e\/[a-z0-9_-]+\/?$/i.test(url.pathname)) return 'embed';
        if (url.hostname === 'player.mediadelivery.net' && url.pathname.startsWith('/embed/')) return 'embed';
        if ((url.hostname === 'videa.hu' || url.hostname === 'www.videa.hu') && url.pathname === '/player') return 'embed';
        return 'external';
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
            error = 'تعذر تحميل قائمة الحلقات الجديدة. قد تحتاج لتشغيل EPISODES-SETUP.sql أو فحص الاتصال.';
            console.warn('Episode list unavailable:', err);
        }
        const episodes = Array.from(all.values()).sort((a, b) => a.season_number - b.season_number || a.episode_number - b.episode_number);
        return {episodes, error};
    }
    window.EpisodeAPI = {list, safeLink, sourceKind, sourceList};
})();
