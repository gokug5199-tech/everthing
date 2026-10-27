/* Episodes editor for existing Supabase-backed admin page. */
(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const message = text => { $('episodeStatus').textContent = text; };
    const links = window.EpisodeAPI;
    function create({client, action, say}) {
        let anime = [];
        let stored = [];
        let editing = false;
        let bulkPrepared = null;
        const form = $('episodeForm');
        const sourcesBox = $('episodeSources');
        const animeSearch = $('episodeAnimeSearch');
        const animeSearchResults = $('episodeAnimeSearchResults');
        const animeSearchCount = $('episodeAnimeSearchCount');
        const animeSearchClear = $('episodeAnimeSearchClear');
        // Search is read-only until the admin explicitly chooses a result.
        // This keeps the current anime and unsaved form data intact while typing.
        const normalizeSearch = value => String(value || '').normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '').replace(/[-_]+/g, ' ').toLowerCase();
        function renderAnimeSearch() {
            const search = animeSearch.value.trim();
            const terms = normalizeSearch(search).split(/\s+/).filter(Boolean);
            animeSearchResults.replaceChildren();
            animeSearchClear.hidden = !search;
            animeSearchCount.hidden = !search;
            animeSearchResults.hidden = !search;
            if (!search) { animeSearchCount.textContent = ''; return; }
            const matches = anime.filter(a => {
                const haystack = normalizeSearch(`${a.title || ''} ${a.id || ''}`);
                return terms.every(term => haystack.includes(term));
            });
            const maxVisible = 12;
            for (const item of matches.slice(0, maxVisible)) {
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = item.title || item.id;
                button.setAttribute('aria-label', `Select ${item.title || item.id}`);
                button.onclick = () => {
                    const select = $('episodeAnime');
                    const changed = select.value !== item.id;
                    select.value = item.id;
                    animeSearch.value = '';
                    renderAnimeSearch();
                    if (changed) select.dispatchEvent(new Event('change', {bubbles: true}));
                };
                animeSearchResults.append(button);
            }
            animeSearchCount.textContent = matches.length
                ? `${matches.length} matching anime${matches.length > maxVisible ? `; showing first ${maxVisible}. Type more to narrow results.` : '. Choose a title above.'}`
                : 'No matching anime. Try another title.';
        }
        animeSearch.addEventListener('input', renderAnimeSearch);
        animeSearch.addEventListener('focus', renderAnimeSearch);
        animeSearch.addEventListener('keydown', event => {
            if (event.key === 'Escape') { animeSearch.value = ''; renderAnimeSearch(); }
            if (event.key === 'Enter') {
                event.preventDefault();
                const first = animeSearchResults.querySelector('button');
                if (first && !animeSearchResults.hidden) first.click();
            }
            if (event.key === 'ArrowDown') {
                const first = animeSearchResults.querySelector('button');
                if (first && !animeSearchResults.hidden) { event.preventDefault(); first.focus(); }
            }
        });
        $('episodeAnimeSearchButton').onclick = () => { renderAnimeSearch(); animeSearch.focus(); };
        animeSearchClear.onclick = () => { animeSearch.value = ''; renderAnimeSearch(); animeSearch.focus(); };
        document.addEventListener('pointerdown', event => {
            if (!$('episodeAnimePicker').contains(event.target)) animeSearchResults.hidden = true;
        });

        function field(type, placeholder, value) {
            const input = document.createElement('input');
            input.type = type; input.placeholder = placeholder; input.value = value || '';
            if (type === 'url' || type === 'text') input.dir = 'ltr';
            return input;
        }
        function addSource(source = {}) {
            if (sourcesBox.children.length >= 12) { message('You can add up to 12 video sources per episode.'); return; }
            const row = document.createElement('div'); row.className = 'source-row';
            const name = field('text', 'Auto-detect server', source.name || '');
            name.maxLength = 50; name.setAttribute('aria-label', 'Server name (optional)'); name.className = 'source-name';
            name.setAttribute('list', 'episodeServerNames');
            const quality = document.createElement('select'); quality.className = 'source-quality';
            quality.setAttribute('aria-label', 'Video quality');
            for (const [val, title] of [['auto', 'Auto'], ['480p','480p'], ['720p','720p'], ['1080p','1080p']]) {
                const opt = document.createElement('option'); opt.value = val; opt.textContent = title; quality.append(opt);
            }
            quality.value = source.quality || 'auto';
            const url = field('text', 'Videa, VOE, HGCloud URL or iframe code', source.url || '');
            url.className = 'source-url'; url.setAttribute('aria-label', 'Video URL or iframe'); url.required = true;
            const hint = document.createElement('small'); hint.className = 'source-hint';
            const verify = () => {
                if (!url.value.trim()) { hint.textContent = 'Paste a URL to detect the video provider.'; return; }
                try {
                    const result = links.parseSource(url.value);
                    hint.textContent = `${result.name} · ${result.kind === 'embed' ? 'Ready to embed' : result.kind === 'video' ? 'Direct video' : 'External link'}${result.warning ? ' · ' + result.warning : ''}`;
                } catch (error) { hint.textContent = error.message; }
            };
            url.addEventListener('input', verify);
            url.addEventListener('blur', () => {
                try {
                    const result = links.parseSource(url.value);
                    // Never rewrite a custom name chosen by the admin.
                    if (!name.value.trim() && result.name !== 'Server') name.value = result.name;
                    url.value = result.url;
                } catch (_) { /* save will validate */ }
                verify();
            });
            const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'danger';
            remove.textContent = 'Remove'; remove.setAttribute('aria-label', 'Remove source'); remove.onclick = () => row.remove();
            row.append(name, quality, url, remove, hint); sourcesBox.append(row);
            verify();
        }
        function reset() {
            editing = false; form.reset(); $('seasonNumber').readOnly = false; $('episodeNumber').readOnly = false;
            sourcesBox.replaceChildren(); addSource(); $('episodeSave').textContent = 'Save episode'; message('Add a video URL you are authorized to display. No video files are uploaded to your website here.');
        }
        function render() {
            const list = $('episodeList'); list.replaceChildren();
            $('episodeTotal').textContent = `${stored.length} episodes saved in the episode manager`;
            for (const e of stored) {
                const wrap = document.createElement('article'); wrap.className = 'row episode-admin-row';
                const info = document.createElement('div'); info.className = 'text';
                const strong = document.createElement('strong'); strong.textContent = `Season ${e.season_number} · Episode ${e.episode_number}${e.title ? ' · '+e.title : ''}`;
                const details = document.createElement('small'); details.textContent = `${(e.sources || []).length} video sources`;
                info.append(strong, document.createElement('br'), details);
                const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = 'Edit';
                edit.onclick = () => {
                    editing = true; $('seasonNumber').value = e.season_number; $('episodeNumber').value = e.episode_number;
                    $('episodeTitleInput').value = e.title || ''; $('seasonNumber').readOnly = true; $('episodeNumber').readOnly = true;
                    sourcesBox.replaceChildren(); for (const src of e.sources || []) addSource(src);
                    if (!sourcesBox.children.length) addSource(); $('episodeSave').textContent = 'Save changes';
                    form.scrollIntoView({behavior:'smooth',block:'start'});
                };
                const del = document.createElement('button'); del.type = 'button'; del.textContent = 'Delete'; del.className = 'danger';
                del.onclick = () => action(async () => {
                    if (!confirm(`Delete Season ${e.season_number}, Episode ${e.episode_number} from your site? The externally hosted video will not be deleted.`)) return;
                    const animeId = $('episodeAnime').value;
                    const result = await client.from('site_episodes').delete().match({anime_id:animeId,season_number:e.season_number,episode_number:e.episode_number}).select('episode_number');
                    if (result.error) throw result.error;
                    if (!result.data?.length) throw Error('Episode could not be deleted. Check your admin permissions.');
                    // Remove shadowed old entry to prevent the deleted episode from reappearing.
                    if (e.season_number === 1) await removeOldLink(animeId, e.episode_number);
                    invalidateBulk(); reset(); await load(); say('Episode deleted from the site. The externally hosted video was not removed.');
                });
                wrap.append(info,edit,del); list.append(wrap);
            }
            if (!stored.length) list.textContent = 'No saved episodes for this anime yet. Any legacy episode links still work.';
        }
        async function removeOldLink(animeId, episodeNumber) {
            const current = await client.from('site_anime').select('episode_links').eq('id', animeId).single();
            if (current.error) throw current.error;
            if (!Object.prototype.hasOwnProperty.call(current.data.episode_links || {}, String(episodeNumber))) return;
            const next = {...current.data.episode_links}; delete next[episodeNumber];
            const result = await client.from('site_anime').update({episode_links: next}).eq('id', animeId);
            if (result.error) throw result.error;
            const record = anime.find(a => a.id === animeId); if (record) record.episode_links = next;
        }
        async function load() {
            const id = $('episodeAnime').value; stored=[];
            if (!id) { render(); return; }
            const all=[];
            for (let offset=0; offset<5000; offset+=500) {
                const r=await client.from('site_episodes').select('anime_id,season_number,episode_number,title,sources')
                    .eq('anime_id',id).order('season_number').order('episode_number').range(offset,offset+499);
                if (r.error) {
                    if (r.error.code === '42P01' || r.error.code === 'PGRST205') throw Error('Run EPISODES-SETUP.sql in the Supabase SQL Editor first.');
                    throw r.error;
                }
                all.push(...r.data); if (r.data.length<500) break;
            }
            stored=all; render();
        }
        function parseVideo(input) {
            const parsed = links.parseSource(input);
            if (parsed.warning && parsed.name !== 'Server') throw Error(parsed.warning);
            return parsed;
        }
        form.onsubmit = event => {
            event.preventDefault();
            action(async () => {
                const animeId = $('episodeAnime').value;
                const seasonNumber=Number($('seasonNumber').value), episodeNumber=Number($('episodeNumber').value);
                if (!animeId || !anime.some(a=>a.id===animeId)) throw Error('Select an anime from the list.');
                if (!Number.isInteger(seasonNumber)||seasonNumber<1||seasonNumber>100||!Number.isInteger(episodeNumber)||episodeNumber<1||episodeNumber>2000) throw Error('Invalid season or episode number.');
                const sources=[];
                for (const row of sourcesBox.children) {
                    const parsed=parseVideo(row.querySelector('.source-url').value);
                    const name=row.querySelector('.source-name').value.trim() || parsed.name;
                    const quality=row.querySelector('.source-quality').value;
                    const url=parsed.url;
                    if (!sources.some(s=>s.url===url && s.quality===quality)) sources.push({name,quality,url});
                }
                if (!sources.length) throw Error('Add at least one video source.');
                const payload={anime_id:animeId,season_number:seasonNumber,episode_number:episodeNumber,
                    title:$('episodeTitleInput').value.trim(),sources,updated_at:new Date().toISOString()};
                const result=await client.from('site_episodes').upsert(payload,{onConflict:'anime_id,season_number,episode_number'}).select('episode_number');
                if (result.error) throw result.error;
                // Keep the old episode-count summary sensible for season one; other seasons are tracked separately.
                const item=anime.find(a=>a.id===animeId);
                if (seasonNumber===1 && item && episodeNumber>Number(item.episodes || 0)) {
                    const change=await client.from('site_anime').update({episodes:episodeNumber}).eq('id',animeId);
                    if (change.error) message('Episode saved, but the anime episode count could not be updated: '+change.error.message);
                    else item.episodes=episodeNumber;
                }
                invalidateBulk(); reset(); await load(); say('Episode saved. You can now watch it on your website.');
            });
        };
        // v17: bulk link importer. Preview is read-only, and import only adds missing
        // links. Existing sources, titles, episodes and legacy episode_links are kept.
        const bulkText = $('bulkEpisodeText');
        const bulkSeason = $('bulkEpisodeSeason');
        const bulkStatus = $('bulkEpisodeStatus');
        const bulkResults = $('bulkEpisodeResults');
        const bulkProgress = $('bulkEpisodeProgress');
        const bulkSave = $('bulkEpisodeImport');
        const qualityValues = ['auto', '480p', '720p', '1080p'];
        const bulkSnapshot = () => JSON.stringify([$('episodeAnime').value, bulkSeason.value, bulkText.value]);
        function setBulkStatus(text) { bulkStatus.textContent = text; }
        function invalidateBulk() {
            bulkPrepared = null;
            bulkSave.disabled = true;
            bulkResults.replaceChildren();
            bulkProgress.hidden = true;
        }
        function parseBulkLine(line, lineNo, defaultSeason) {
            const fields = line.split('|').map(part => part.trim());
            let season = defaultSeason;
            let episode, server, rawURL, quality = 'auto';
            if (fields.length === 2) {
                [episode, rawURL] = fields;
                server = 'Auto';
            } else if (fields.length === 3) {
                [episode, server, rawURL] = fields;
            } else if (fields.length === 4 && /^\d+$/.test(fields[1])) {
                [season, episode, server, rawURL] = fields;
            } else if (fields.length === 4) {
                [episode, server, rawURL, quality] = fields;
            } else if (fields.length === 5) {
                [season, episode, server, rawURL, quality] = fields;
            } else throw Error(`Line ${lineNo}: use Episode | Server | URL (optionally add Quality).`);
            season = Number(season); episode = Number(episode);
            if (!Number.isInteger(season) || season < 1 || season > 100 || !Number.isInteger(episode) || episode < 1 || episode > 2000) {
                throw Error(`Line ${lineNo}: season must be 1–100 and episode must be 1–2000.`);
            }
            quality = (quality || 'auto').toLowerCase();
            if (!qualityValues.includes(quality)) throw Error(`Line ${lineNo}: quality must be Auto, 480p, 720p or 1080p.`);
            let parsed;
            try { parsed = parseVideo(rawURL); } catch (e) { throw Error(`Line ${lineNo}: ${e.message}`); }
            server = server || 'Auto';
            const normalized = server.toLowerCase().replace(/\s+/g, '');
            const labels = {auto: parsed.name, videa: 'Videa', voe: 'VOE', hgcloud: 'HGCloud'};
            if (!Object.prototype.hasOwnProperty.call(labels, normalized)) throw Error(`Line ${lineNo}: server must be Videa, VOE, HGCloud, or Auto.`);
            const name = labels[normalized];
            if (normalized !== 'auto' && parsed.name !== name) {
                throw Error(`Line ${lineNo}: URL belongs to ${parsed.name}, but server name is ${name}.`);
            }
            if (parsed.kind !== 'embed' && parsed.kind !== 'video') {
                throw Error(`Line ${lineNo}: paste a supported video embed link instead of an ordinary webpage.`);
            }
            return {season, episode, source: {name, url: parsed.url, quality}};
        }
        function parseBulkInput() {
            const season = Number(bulkSeason.value);
            if (!Number.isInteger(season) || season < 1 || season > 100) throw Error('Default season must be between 1 and 100.');
            if (bulkText.value.length > 600000) throw Error('Too many characters. Split the import into smaller groups.');
            const rows = bulkText.value.split(/\r?\n/).map((text, index) => ({text: text.trim(), index: index + 1})).filter(r => r.text && !r.text.startsWith('#'));
            if (!rows.length) throw Error('Paste at least one episode link.');
            if (rows.length > 6000) throw Error('Import up to 6,000 links at a time.');
            const imported = new Map();
            for (const row of rows) {
                const item = parseBulkLine(row.text, row.index, season);
                const key = `${item.season}:${item.episode}`;
                if (!imported.has(key)) imported.set(key, {season_number: item.season, episode_number: item.episode, incoming: []});
                const list = imported.get(key).incoming;
                if (!list.some(s => s.url === item.source.url && s.quality === item.source.quality)) list.push(item.source);
            }
            return imported;
        }
        function existingSourceList(season, episode, saved, animeRecord) {
            if (saved) return Array.isArray(saved.sources) ? saved.sources.slice() : [];
            if (season !== 1 || !animeRecord) return [];
            const legacy = animeRecord.episode_links || {};
            return links.sourceList(legacy[episode] || legacy[String(episode)]);
        }
        function mergeBulk(incoming, current) {
            const active = $('episodeAnime').value;
            const animeRecord = anime.find(a => a.id === active);
            const oldMap = new Map(current.map(e => [`${e.season_number}:${e.episode_number}`, e]));
            const changes = [];
            let newServers = 0, alreadyThere = 0, full = 0, newEpisodes = 0;
            for (const [key, data] of incoming) {
                const saved = oldMap.get(key);
                const previous = existingSourceList(data.season_number, data.episode_number, saved, animeRecord);
                const merged = previous.slice();
                let added = 0;
                for (const src of data.incoming) {
                    if (merged.some(item => item.url === src.url && item.quality === src.quality)) { alreadyThere++; continue; }
                    if (merged.length >= 12) { full++; continue; }
                    merged.push(src); added++; newServers++;
                }
                if (added) {
                    if (!saved) newEpisodes++;
                    changes.push({anime_id: active, season_number: data.season_number,
                        episode_number: data.episode_number, title: saved?.title || '',
                        sources: merged, updated_at: new Date().toISOString()});
                }
            }
            return {changes, newServers, alreadyThere, full, newEpisodes};
        }
        function displayBulk(preview) {
            bulkResults.replaceChildren();
            for (const row of preview.changes.slice(0, 12)) {
                const el = document.createElement('div');
                el.textContent = `Season ${row.season_number} · Episode ${row.episode_number} — ${row.sources.length} total server link(s) after import`;
                bulkResults.append(el);
            }
            if (preview.changes.length > 12) {
                const el = document.createElement('div');
                el.textContent = `… plus ${preview.changes.length - 12} other episodes`;
                bulkResults.append(el);
            }
        }
        async function previewBulk() {
            invalidateBulk();
            if (!$('episodeAnime').value) throw Error('Choose an anime first.');
            const entries = parseBulkInput();
            // Always reload before preview so the result includes current database sources.
            await load();
            const result = mergeBulk(entries, stored);
            bulkPrepared = {snapshot: bulkSnapshot(), entries, resultSignature: JSON.stringify(result.changes.map(({updated_at, ...rest}) => rest)), result};
            setBulkStatus(`Preview only — no changes saved. ${entries.size} episode(s) in your input; ${result.changes.length} episode(s) to update, ${result.newServers} new link(s), ${result.alreadyThere} duplicate link(s) skipped, ${result.full} link(s) skipped (12-server limit).`);
            displayBulk(result);
            bulkSave.disabled = result.changes.length === 0;
        }
        async function saveBulk() {
            if (!bulkPrepared || bulkPrepared.snapshot !== bulkSnapshot()) throw Error('Preview your links again before saving.');
            await load();
            const latest = mergeBulk(bulkPrepared.entries, stored);
            if (JSON.stringify(latest.changes.map(({updated_at, ...rest}) => rest)) !== bulkPrepared.resultSignature) {
                invalidateBulk();
                throw Error('Saved episodes changed since the preview. Preview again to avoid overwriting newer links.');
            }
            if (!latest.changes.length) { invalidateBulk(); setBulkStatus('All links are already saved. No changes made.'); return; }
            if (!confirm(`Save ${latest.newServers} new video link(s) across ${latest.changes.length} episode(s)? Existing links and titles will be kept.`)) return;
            bulkProgress.value = 0; bulkProgress.max = latest.changes.length; bulkProgress.hidden = false;
            let saved = 0;
            try {
                for (let i = 0; i < latest.changes.length; i += 25) {
                    const batch = latest.changes.slice(i, i + 25);
                    const result = await client.from('site_episodes').upsert(batch, {onConflict: 'anime_id,season_number,episode_number'}).select('episode_number');
                    if (result.error) throw result.error;
                    if (result.data?.length !== batch.length) throw Error('Could not verify the saved records. Check administrator permissions.');
                    saved += batch.length;
                    bulkProgress.value = saved;
                    setBulkStatus(`Saving episode links… ${saved} / ${latest.changes.length} episodes saved.`);
                }
            } catch (error) {
                invalidateBulk();
                setBulkStatus(`${saved} of ${latest.changes.length} episodes saved before an error. Preview again to safely resume. ${error.message}`);
                throw error;
            }
            invalidateBulk();
            await load();
            setBulkStatus(`Saved ${latest.newServers} link(s) across ${saved} episode(s). Existing episodes and video links were preserved. Clear the input or paste another batch to continue.`);
            say(`Bulk Episode Import completed: ${saved} episodes updated.`);
        }
        bulkText.addEventListener('input', invalidateBulk);
        bulkSeason.addEventListener('input', invalidateBulk);
        $('bulkEpisodePreview').onclick = () => action(async () => { try { await previewBulk(); } catch (e) { setBulkStatus(e.message); throw e; } });
        bulkSave.onclick = () => action(async () => { try { await saveBulk(); } catch (e) { if (!bulkStatus.textContent.includes('saved before an error')) setBulkStatus(e.message); throw e; } });
        $('bulkEpisodeClear').onclick = () => { bulkText.value = ''; invalidateBulk(); setBulkStatus('Input cleared. No saved episodes were changed.'); };
        // Preview may become stale when another admin action modifies episodes.

        $('addEpisodeSource').onclick=()=>addSource();
        $('episodeReset').onclick=reset;
        $('episodeAnime').onchange=()=>{ invalidateBulk(); action(async()=>{reset(); await load();}); };
        reset();
        return {
            setAnime(items) {
                anime=items;
                invalidateBulk();
                const select=$('episodeAnime'), old=select.value;
                select.replaceChildren();
                for (const a of anime) { const opt=document.createElement('option'); opt.value=a.id; opt.textContent=a.title; select.append(opt); }
                if (anime.some(a=>a.id===old)) select.value=old;
                renderAnimeSearch();
            },
            async open(id) {
                $('animeSection').hidden=true; $('wallSection').hidden=true; $('episodeSection').hidden=false;
                if (id && anime.some(a=>a.id===id)) $('episodeAnime').value=id;
                animeSearch.value = '';
                renderAnimeSearch();
                invalidateBulk(); reset(); await load();
            }
        };
    }
    window.EpisodeAdmin={create};
})();
