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
        note.textContent = window.ANIME_LOAD_ERROR ? 'Could not load this anime. Please check your connection and reload.' : 'Anime not found or no longer available.';
        page.replaceChildren(note); return;
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
    // Start the supported show's guide fetch in parallel with episode rows.
    // No guide request is made for ordinary short shows (typically 12–37 episodes).
    const external = window.TEEpisodeGuides;
    const expectedCount = Math.max(0,Number(anime.episodes)||0);
    const identity = external?.resolve(anime,expectedCount);
    const prefetchedGuide = identity?.slug ? external.load(anime,expectedCount,false) : null;
    let result;
    try { result = await window.EpisodeAPI.list(anime); }
    catch (err) { console.error(err); result = {episodes: [], error: 'Could not load episodes.'}; }
    if (result.error) { note.hidden = false; note.textContent = result.error; }
    const episodes = Array.isArray(result.episodes) ? result.episodes : [];
    if (loadingStatus) loadingStatus.hidden = true;
    count.textContent = `${episodes.length} episode${episodes.length === 1 ? '' : 's'}`;
    const seasons = Array.from(new Set(episodes.map(e => e.season_number))).sort((a,b) => a-b);
    let selected = seasons[0] || 1;
    const search = document.getElementById('teEpisodeSearch');
    const showing = document.getElementById('teEpisodeShowing');
    const more = document.getElementById('teEpisodeMore');
    const arcWrap = document.getElementById('teArcWrap');
    const arcSelect = document.getElementById('teArcSelect');
    const typeWrap = document.getElementById('teTypeWrap');
    const typeSelect = document.getElementById('teTypeSelect');
    const guideControls = document.getElementById('teGuideControls');
    const guideSummary = document.getElementById('teGuideSummary');
    const guideHealth = document.getElementById('teGuideHealth');
    const guideStatus = document.getElementById('teGuideStatus');
    const guideRetry = document.getElementById('teGuideRetry');
    const BATCH = 36;
    let visibleLimit = BATCH;
    let guide = null;
    let chosenArc = '';
    let chosenType = 'all';
    let arcRanges = new Map();
    // External episode guides refer to absolute episode numbers for an original MAL anime.
    // Do NOT apply them to independently numbered season 2+ rows.
    const guideFor = ep => Number(ep.season_number) === 1 ? guide?.episodes.get(Number(ep.episode_number)) : null;
    function episodeLabel(e) { return `Episode ${e.episode_number}${e.title ? ' · ' + e.title : ''}`; }
    function availableArcs() {
        const groups = new Map();
        if(!guide) return groups;
        const validNumbers = new Set(episodes.filter(e=>e.season_number===selected).map(e=>Number(e.episode_number)));
        if(Number(selected)!==1)return groups;
        for(const [number,meta] of guide.episodes) {
            if(!meta.arc || !validNumbers.has(number))continue;
            const current=groups.get(meta.arc)||{name:meta.arc,min:number,max:number,count:0};
            current.min=Math.min(current.min,number);current.max=Math.max(current.max,number);current.count++;
            groups.set(meta.arc,current);
        }
        return new Map([...groups.values()].sort((a,b)=>a.min-b.min).map(a=>[a.name,a]));
    }
    function buildControls() {
        arcRanges=availableArcs();
        arcSelect.replaceChildren();
        const all=document.createElement('option');all.value='';all.textContent='All arcs';arcSelect.append(all);
        for(const arc of arcRanges.values()) {
            const option=document.createElement('option');option.value=arc.name;
            option.textContent=`${arc.name} · Ep. ${arc.min}–${arc.max}`;
            arcSelect.append(option);
        }
        if(chosenArc&&!arcRanges.has(chosenArc))chosenArc='';
        arcSelect.value=chosenArc;
        const hasArcs=arcRanges.size>0;
        const hasConfirmedTypes=!!guide&&episodes.some(ep=>Number(ep.season_number)===Number(selected)&&guideFor(ep)?.type);
        const canonOption=typeSelect.querySelector('option[value="canon-only"]');
        if(canonOption) canonOption.disabled=!guide||guide.coverage!=='episode-and-arc';
        if(chosenType==='canon-only'&&canonOption?.disabled)chosenType='all';
        if(!hasConfirmedTypes)chosenType='all';
        typeSelect.value=chosenType;
        guideControls.hidden=!hasArcs&&!hasConfirmedTypes;
        arcWrap.hidden=!hasArcs;
        typeWrap.hidden=!hasConfirmedTypes;
        guideSummary.textContent=hasArcs?`${arcRanges.size} story arcs available`:(hasConfirmedTypes?'Episode types available':'');
    }
    function filteredEpisodes() {
        const term = (search?.value || '').trim().toLocaleLowerCase();
        return episodes.filter(e => {
            if(e.season_number!==selected)return false;
            const classification=guideFor(e);
            if(chosenArc && classification?.arc!==chosenArc)return false;
            if(chosenType==='hide-filler' && classification?.type==='filler')return false;
            if(chosenType==='filler-only' && classification?.type!=='filler')return false;
            if(chosenType==='canon-only' && classification?.type!=='canon')return false;
            return !term || String(e.episode_number)===term || episodeLabel(e).toLocaleLowerCase().includes(term) || (classification?.arc||'').toLocaleLowerCase().includes(term);
        });
    }
    const names={'filler':'FILLER','mixed':'MIXED','anime-canon':'ANIME CANON','recap':'RECAP'};
    function draw(reset = false) {
        if (reset) visibleLimit = BATCH;
        tabs.replaceChildren(); grid.replaceChildren();
        tabs.hidden = seasons.length <= 1;
        for (const season of seasons) {
            const button = document.createElement('button');
            button.type = 'button'; button.className = 'season-tab';
            button.textContent = `Season ${season}`;
            button.setAttribute('aria-pressed', String(selected === season));
            button.onclick = () => { selected = season; chosenArc='';chosenType='all';if(search) search.value = '';buildControls();draw(true); };
            tabs.append(button);
        }
        const matches = filteredEpisodes();
        const fragment = document.createDocumentFragment();
        let previousArc = null;
        const hasArcs=arcRanges.size>0;
        for (const ep of matches.slice(0, visibleLimit)) {
            const meta=guideFor(ep);
            const arc=hasArcs ? (meta?.arc||'Other episodes') : '';
            if(hasArcs&&arc!==previousArc){
                const heading=document.createElement('div');heading.className='te-arc-heading';
                const text=document.createElement('span');text.className='te-arc-name';text.textContent=arc;
                heading.append(text);
                const range=arcRanges.get(arc);
                if(range){const marker=document.createElement('span');marker.className='te-arc-range';marker.textContent=`EPISODES ${range.min}–${range.max}`;heading.append(marker);}
                fragment.append(heading);
                previousArc=arc;
            }
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
            const type=meta?.type;
            if(type && names[type]){
                const badge=document.createElement('span');badge.className='te-episode-badge te-episode-badge--'+type;
                badge.textContent=names[type];
                content.append(badge);
                card.setAttribute('aria-label',`Episode ${ep.episode_number}, ${names[type].toLowerCase()}`);
            }
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
            blank.textContent = search?.value || chosenArc || chosenType!=='all' ? 'No episodes match these filters.' : 'No episodes have been added yet.';
            grid.append(blank);
        }
        if (showing) showing.textContent = `Showing ${Math.min(visibleLimit, matches.length)} of ${matches.length} episodes`;
        if (more) more.hidden = matches.length <= visibleLimit;
    }
    if (search) search.addEventListener('input', () => draw(true));
    if (more) more.addEventListener('click', () => { visibleLimit += BATCH; draw(); });
    arcSelect?.addEventListener('change',()=>{chosenArc=arcSelect.value;draw(true);});
    typeSelect?.addEventListener('change',()=>{chosenType=typeSelect.value;draw(true);});
    buildControls();draw(); // episodes remain instantly accessible while metadata loads
    function setGuideStatus(state, message, retry=false){
        // Normal visitors should see the classifications, not diagnostics.
        // Unknown titles, successful fetches, and routine loading are silent.
        // A genuine failure for a known supported show still offers Retry.
        const supported=!!external?.resolve(anime,episodes.length)?.slug;
        const hasMetadata=!!guide&&episodes.some(ep=>Number(ep.season_number)===1 &&
            (guideFor(ep)?.type||guideFor(ep)?.arc));
        const visible=state==='offline'&&supported&&!hasMetadata;
        if(guideHealth){guideHealth.hidden=!visible;guideHealth.dataset.state=state;}
        if(guideStatus)guideStatus.textContent=visible?message:'';
        if(guideRetry)guideRetry.hidden=!visible||!retry;
    }
    function showGuide(info){
        // Only paint after metadata actually applies to this anime's episodes.
        const useful=info?.episodes instanceof Map && episodes.some(ep=>
            Number(ep.season_number)===1 &&
            (info.episodes.get(Number(ep.episode_number))?.type ||
             info.episodes.get(Number(ep.episode_number))?.arc));
        if(!useful){setGuideStatus('unknown','');return;}
        guide=info;
        buildControls();draw();
        const visible=episodes.filter(e=>Number(e.season_number)===1);
        const fillers=visible.filter(e=>guideFor(e)?.type==='filler').length;
        const arcs=availableArcs().size;
        if(arcs){
            setGuideStatus(info.offline?'offline':'ready',
                `${arcs} verified arc sections · ${fillers} filler episode${fillers===1?'':'s'} · ${info.offline?'Offline reference; refresh for updates':'Guide loaded'}`,
                !!info.offline);
        }else if(info.episodes.size){
            setGuideStatus(info.offline?'offline':'ready',
                `${fillers} verified filler episode${fillers===1?'':'s'} · ${info.offline?'Live story arc data unavailable':'Episode labels loaded'}${info.offline?' — retry for more':''}`,
                !!info.offline);
        }else{
            setGuideStatus('unknown','No confirmed filler or arc classifications for this title.');
        }
    }
    async function refreshGuide(force=false){
        if(!external || !episodes.length || !external.shouldFetch(anime,episodes.length)){
            setGuideStatus('unknown','');return;
        }
        if(force)setGuideStatus('loading','Refreshing episode guide…');
        try{
            // For recognized shows this request was already started while the
            // episodes were loading; for other long anime start only after count.
            const info=await (force?external.load(anime,episodes.length,true):
                (prefetchedGuide||external.load(anime,episodes.length,false)));
            if(info){
                showGuide(info);
                // An offline snapshot may contain only filler badges. Keep the
                // working data on screen; don't present a huge failure banner.
            }else setGuideStatus('offline','Episode guide is temporarily unavailable.',true);
        }catch(error){
            console.warn('Episode guide failed',error);
            setGuideStatus('offline','Episode guide is temporarily unavailable.',true);
        }
    }
    if(external && episodes.length){
        const compact=external.peek(anime,episodes.length);
        if(compact)showGuide(compact); // instant local metadata if available
        if(external.shouldFetch(anime,episodes.length))refreshGuide(false);
    }
    guideRetry?.addEventListener('click',()=>refreshGuide(true));
})();
