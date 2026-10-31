(async function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const api = window.EpisodeAPI;
    const area = $('playerArea');
    const params = new URLSearchParams(location.search);
    const animeId = params.get('anime') || '';
    const season = Number(params.get('season') || 1);
    const episode = Number(params.get('episode') || 1);

    // v16 fullscreen fix: control the player shell ourselves. Embedded providers
    // may fail to expand from their own iframe controls, even with allowFullscreen.
    let activeShell = null;
    let activeFullscreenButton = null;
    const expandIcon = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3"/></svg>';
    const collapseIcon = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3v3a2 2 0 0 1-2 2H3m13-5v3a2 2 0 0 0 2 2h3M3 16h3a2 2 0 0 1 2 2v3m13-5h-3a2 2 0 0 0-2 2v3"/></svg>';
    const nativeFullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;
    function isExpanded(shell) {
        const full = nativeFullscreenElement();
        return shell.classList.contains('watch-fallback-fullscreen') || !!(full && (full === shell || shell.contains(full)));
    }
    function updateFullscreenControl() {
        if (!activeShell || !activeFullscreenButton) return;
        const expanded = isExpanded(activeShell);
        activeFullscreenButton.innerHTML = expanded ? collapseIcon : expandIcon;
        activeFullscreenButton.setAttribute('aria-label', expanded ? 'Exit fullscreen' : 'Enter fullscreen');
        activeFullscreenButton.title = expanded ? 'Exit fullscreen' : 'Enter fullscreen';
        activeFullscreenButton.setAttribute('aria-pressed', String(expanded));
    }
    function leaveFallbackFullscreen() {
        if (activeShell) activeShell.classList.remove('watch-fallback-fullscreen');
        document.documentElement.classList.remove('watch-fullscreen-scroll-lock');
        updateFullscreenControl();
    }
    async function toggleShellFullscreen(shell, nativeVideo) {
        if (shell.classList.contains('watch-fallback-fullscreen')) {
            leaveFallbackFullscreen();
            return;
        }
        if (isExpanded(shell)) {
            try {
                if (document.exitFullscreen) await document.exitFullscreen();
                else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            } catch (error) { console.warn('Could not exit fullscreen:', error); }
            updateFullscreenControl();
            return;
        }
        // iPhone Safari has a dedicated native fullscreen API for <video>.
        if (nativeVideo && typeof nativeVideo.webkitEnterFullscreen === 'function' &&
            /iPad|iPhone|iPod/.test(navigator.userAgent)) {
            try { nativeVideo.webkitEnterFullscreen(); return; } catch (error) { /* try shell instead */ }
        }
        try {
            if (typeof shell.requestFullscreen === 'function') {
                await shell.requestFullscreen();
                updateFullscreenControl();
                return;
            }
            if (typeof shell.webkitRequestFullscreen === 'function') {
                shell.webkitRequestFullscreen();
                updateFullscreenControl();
                return;
            }
        } catch (error) { /* Browsers may deny fullscreen for embedded players. */ }
        // Visual viewport fallback for browsers that don't support element fullscreen.
        shell.classList.add('watch-fallback-fullscreen');
        document.documentElement.classList.add('watch-fullscreen-scroll-lock');
        updateFullscreenControl();
    }
    document.addEventListener('fullscreenchange', updateFullscreenControl);
    document.addEventListener('webkitfullscreenchange', updateFullscreenControl);
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && activeShell && activeShell.classList.contains('watch-fallback-fullscreen')) {
            leaveFallbackFullscreen();
        }
    });

    function explain(text) { const el = document.createElement('div'); el.className = 'missing'; el.textContent = text; area.replaceChildren(el); }
    function viewLink(item) { return `watch.html?anime=${encodeURIComponent(animeId)}&season=${item.season_number}&episode=${item.episode_number}`; }
    function player(source) {
        const href = api.safeLink(source.url), kind = api.sourceKind(source.url);
        leaveFallbackFullscreen();
        activeShell = null;
        activeFullscreenButton = null;
        area.replaceChildren();
        if (!href || kind === 'invalid') { explain('This source is invalid. Please select another server.'); return; }
        if (kind === 'embed' || kind === 'video') {
            const wrap = document.createElement('div'); wrap.className = 'video-shell';
            let nativeVideo = null;
            // VOE's own player has a fullscreen button. Let its iframe handle it
            // instead of placing The Everything's overlay above the provider.
            const isVoeEmbed = kind === 'embed' && /^(?:www\.)?voe\.sx$/i.test(new URL(href).hostname);
            if (kind === 'embed') {
                const iframe = document.createElement('iframe');
                iframe.src = href;
                iframe.title = `${source.name} player`;
                // Fullscreen delegation includes VOE's possible redirect/child origin.
                // The provider's native fullscreen control still requires a user click.
                iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen *';
                iframe.allowFullscreen = true;
                iframe.referrerPolicy = 'strict-origin-when-cross-origin';
                iframe.loading = 'lazy'; wrap.append(iframe);
            } else {
                const video = document.createElement('video');
                video.src = href; video.controls = true; video.playsInline = true; video.preload = 'metadata';
                nativeVideo = video;
                wrap.append(video);
            }
            activeShell = wrap;
            // Keep the existing shell fullscreen fallback for other providers
            // and native videos; for VOE, only its built-in control is shown.
            if (!isVoeEmbed) {
                const fullscreenButton = document.createElement('button');
                fullscreenButton.type = 'button';
                fullscreenButton.className = 'watch-fullscreen-button';
                fullscreenButton.addEventListener('click', () => toggleShellFullscreen(wrap, nativeVideo));
                wrap.append(fullscreenButton);
                activeFullscreenButton = fullscreenButton;
                updateFullscreenControl();
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
