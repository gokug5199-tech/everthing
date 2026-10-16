(async function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const api = window.EpisodeAPI;
    const area = $('playerArea');
    const params = new URLSearchParams(location.search);
    const animeId = params.get('anime') || '';
    const season = Number(params.get('season') || 1);
    const episode = Number(params.get('episode') || 1);

    function explain(text) { const el = document.createElement('div'); el.className = 'missing'; el.textContent = text; area.replaceChildren(el); }
    function viewLink(item) { return `watch.html?anime=${encodeURIComponent(animeId)}&season=${item.season_number}&episode=${item.episode_number}`; }
    function player(source) {
        const href = api.safeLink(source.url), kind = api.sourceKind(source.url);
        area.replaceChildren();
        if (!href || kind === 'invalid') { explain('This source is invalid. Please select another server.'); return; }
        if (kind === 'embed' || kind === 'video') {
            const wrap = document.createElement('div'); wrap.className = 'video-shell';
            if (kind === 'embed') {
                const iframe = document.createElement('iframe');
                iframe.src = href;
                iframe.title = `${source.name} player`;
                iframe.allow = 'fullscreen; picture-in-picture; autoplay; encrypted-media';
                iframe.allowFullscreen = true;
                iframe.referrerPolicy = 'strict-origin-when-cross-origin';
                iframe.loading = 'lazy'; wrap.append(iframe);
            } else {
                const video = document.createElement('video');
                video.src = href; video.controls = true; video.playsInline = true; video.preload = 'metadata';
                wrap.append(video);
            }
            area.append(wrap);
        } else {
            const message = document.createElement('div'); message.className = 'missing';
            message.textContent = 'This provider does not offer a supported embedded player here.';
            const link = document.createElement('a'); link.className = 'external-link';
            link.href = href; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Open external source';
            message.append(document.createElement('br'), link); area.append(message);
        }
    }
    try {
        await window.ANIME_READY;
        const data = Array.isArray(window.ANIME_DATA) ? window.ANIME_DATA : [];
        const anime = data.find(a => String(a.id) === animeId);
        if (!anime) { explain('Anime not found or no longer available.'); return; }
        const backURL = `anime-details.html?id=${encodeURIComponent(anime.id)}`;
        $('backButton').href = backURL; $('episodesBack').href = backURL;
        if (!Number.isInteger(episode) || episode < 1 || episode > 2000 || !Number.isInteger(season) || season < 1 || season > 100) {
            explain('Invalid episode or season number.'); return;
        }
        document.title = `${anime.title} · Season ${season} Episode ${episode} | The Everything`;
        $('animeTitle').textContent = anime.title;
        $('episodeTitle').textContent = `Season ${season} · Episode ${episode}`;
        const results = await api.list(anime);
        if (results.error) { $('playerNotice').hidden = false; $('playerNotice').textContent = results.error; }
        const current = results.episodes.find(e => e.season_number === season && e.episode_number === episode);
        if (!current || !current.sources.length) { explain('This episode is not available yet.'); return; }
        if (current.title) $('episodeTitle').textContent += ` · ${current.title}`;
        const available = current.sources.filter(s => api.safeLink(s.url));
        if (!available.length) { explain('No valid watch servers are available.'); return; }
        const container = $('serverList');
        const controls = [];
        for (let index = 0; index < available.length; index++) {
            const s = available[index];
            const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'server-button';
            btn.textContent = s.name;
            const quality = document.createElement('small'); quality.textContent = s.quality === 'auto' ? 'Auto / Server' : s.quality;
            btn.append(quality);
            btn.onclick = () => { player(s); for (const b of controls) { b.classList.remove('is-active'); b.setAttribute('aria-pressed','false'); } btn.classList.add('is-active'); btn.setAttribute('aria-pressed','true'); };
            btn.setAttribute('aria-pressed','false'); controls.push(btn); container.append(btn);
        }
        $('sourceSection').hidden = false; controls[0].click();
        const viewable = results.episodes.filter(e => e.sources.length > 0);
        const here = viewable.findIndex(e => e.season_number === season && e.episode_number === episode);
        if (here >= 0) {
            const prev = $('prevEpisode'), next = $('nextEpisode');
            if (here > 0) prev.href = viewLink(viewable[here-1]); else prev.hidden = true;
            if (here < viewable.length-1) next.href = viewLink(viewable[here+1]); else next.hidden = true;
            $('episodeNav').hidden = false;
        }
    } catch (error) {
        console.error(error); explain('Could not load the player. Please refresh the page.');
    }
})();
