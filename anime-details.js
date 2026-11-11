(async function () {
    'use strict';
    await window.ANIME_READY;
    if (window.TE_DETAIL_TIMING) window.TE_DETAIL_TIMING.loaded = true;
    const data = Array.isArray(window.ANIME_DATA) ? window.ANIME_DATA : [];
    const params = new URLSearchParams(location.search);
    const requestedId = params.get('id') || 'attack-on-titan';
    const anime = data.find(item => String(item.id) === requestedId);
    const page = document.getElementById('animePage');
    if (!anime) {
        const loadingStatus = document.getElementById('animeLoadStatus');
        if (loadingStatus) loadingStatus.hidden = true;
        const note = document.createElement('div'); note.className = 'page-message';
        note.textContent = window.ANIME_LOAD_ERROR ? 'Could not load this anime. Please check your connection and reload.' : 'Anime not found or no longer available.'; page.replaceChildren(note); return;
    }
    document.title = `${anime.title} | Episodes | The Everything`;
    const loadingStatus = document.getElementById('animeLoadStatus');
    if (loadingStatus) loadingStatus.textContent = 'Loading episodes…';
    const poster = document.getElementById('animePoster'); poster.src = anime.image || ''; poster.alt = anime.title || 'Anime poster';
    document.getElementById('animeTitle').textContent = anime.title || 'Anime';
    const format = String(anime.anime_type || 'Unknown');
    const typeLabel = document.getElementById('animeTypeLabel');
    if(typeLabel) typeLabel.textContent = ' · ' + (/^(TV|Movie|OVA|ONA|Special|TV Special)$/i.test(format) ? format : 'Anime');
    document.getElementById('animeGenres').textContent = Array.isArray(anime.genres) ? anime.genres.join(' • ') : '';
    document.getElementById('animeDescription').textContent = anime.description || '';
    document.getElementById('animeRating').textContent = `★ ${anime.rating || '-'}`;
    const grid = document.getElementById('episodesGrid');
    const tabs = document.getElementById('seasonTabs');
    const count = document.getElementById('episodeCount');
    const note = document.getElementById('episodeLoadMessage');
    count.textContent = 'Loading episodes…';
    let result;
    try { result = await window.EpisodeAPI.list(anime); }
    catch (err) { console.error(err); result = {episodes: [], error: 'Could not load episodes.'}; }
    if (result.error) { note.hidden = false; note.textContent = result.error; }
    const episodes = result.episodes;
    if (loadingStatus) loadingStatus.hidden = true;
    count.textContent = `${episodes.length} episode${episodes.length === 1 ? '' : 's'}`;
    const seasons = Array.from(new Set(episodes.map(e => e.season_number))).sort((a,b) => a-b);
    let selected = seasons[0] || 1;
    const search = document.getElementById('teEpisodeSearch');
    const showing = document.getElementById('teEpisodeShowing');
    const more = document.getElementById('teEpisodeMore');
    const BATCH = 36;
    let visibleLimit = BATCH;
    function episodeLabel(e) { return `Episode ${e.episode_number}${e.title ? ' · ' + e.title : ''}`; }
    function filteredEpisodes() {
        const term = (search?.value || '').trim().toLocaleLowerCase();
        return episodes.filter(e => e.season_number === selected &&
            (!term || String(e.episode_number) === term || episodeLabel(e).toLocaleLowerCase().includes(term)));
    }
    function draw(reset = false) {
        if (reset) visibleLimit = BATCH;
        tabs.replaceChildren(); grid.replaceChildren();
        tabs.hidden = seasons.length <= 1;
        for (const season of seasons) {
            const button = document.createElement('button');
            button.type = 'button'; button.className = 'season-tab';
            button.textContent = `Season ${season}`;
            button.setAttribute('aria-pressed', String(selected === season));
            button.onclick = () => { selected = season; if(search) search.value = ''; draw(true); };
            tabs.append(button);
        }
        const matches = filteredEpisodes();
        const fragment = document.createDocumentFragment();
        for (const ep of matches.slice(0, visibleLimit)) {
            const available = Array.isArray(ep.sources) && ep.sources.length > 0;
            const card = document.createElement(available ? 'a' : 'div');
            card.className = 'episode' + (available ? '' : ' unavailable');
            if (available) card.href = `episode-choice.html?anime=${encodeURIComponent(anime.id)}&season=${ep.season_number}&episode=${ep.episode_number}`;
            else card.setAttribute('aria-disabled','true');
            const content = document.createElement('span'); content.className = 'episode-text';
            const eyebrow = document.createElement('span'); eyebrow.className = 'episode-eyebrow';
            eyebrow.textContent = 'SEASON ' + ep.season_number;
            const label = document.createElement('span'); label.className = 'episode-number';
            label.textContent = episodeLabel(ep);
            content.append(eyebrow, label);
            const action = document.createElement('span'); action.className = 'play';
            if (available) {
                action.textContent = 'OPTIONS';
                const arrow = document.createElementNS('http://www.w3.org/2000/svg','svg');
                arrow.setAttribute('viewBox','0 0 24 24'); arrow.setAttribute('fill','none');
                arrow.setAttribute('stroke','currentColor'); arrow.setAttribute('stroke-width','2');
                const path = document.createElementNS('http://www.w3.org/2000/svg','path');
                path.setAttribute('d','m9 6 6 6-6 6'); arrow.append(path); action.append(arrow);
            } else { action.textContent = 'SOON'; }
            card.append(content, action); fragment.append(card);
        }
        grid.append(fragment);
        if (!matches.length) {
            const blank = document.createElement('div'); blank.className = 'page-message';
            blank.textContent = search?.value ? 'No matching episodes. Try another number or title.' : 'No episodes have been added yet.';
            grid.append(blank);
        }
        if (showing) showing.textContent = `Showing ${Math.min(visibleLimit, matches.length)} of ${matches.length} episodes`;
        if (more) more.hidden = matches.length <= visibleLimit;
    }
    if (search) search.addEventListener('input', () => draw(true));
    if (more) more.addEventListener('click', () => { visibleLimit += BATCH; draw(); });
    draw();
})();
