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
    function draw() {
        tabs.replaceChildren(); grid.replaceChildren();
        tabs.hidden = seasons.length <= 1;
        for (const season of seasons) {
            const button = document.createElement('button'); button.type = 'button'; button.className = 'season-tab';
            button.textContent = `Season ${season}`; button.setAttribute('aria-pressed', String(selected === season));
            button.onclick = () => { selected=season; draw(); };
            tabs.append(button);
        }
        for (const ep of episodes.filter(e => e.season_number === selected)) {
            const available = ep.sources && ep.sources.length > 0;
            const a = document.createElement('a'); a.className = 'episode'+(available?'':' unavailable');
            a.href = `watch.html?anime=${encodeURIComponent(anime.id)}&season=${ep.season_number}&episode=${ep.episode_number}`;
            const label = document.createElement('span'); label.className = 'episode-number';
            label.textContent = `Episode ${ep.episode_number}${ep.title ? ' · '+ep.title : ''}`;
            const play = document.createElement('span'); play.className = 'play'; play.textContent = available ? 'PLAY ▶' : 'SOON';
            a.append(label,play); grid.append(a);
        }
        if (!grid.childElementCount) { const blank = document.createElement('div'); blank.className='page-message'; blank.textContent='No episodes have been added yet.'; grid.append(blank); }
    }
    draw();
})();
