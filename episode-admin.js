/* Episodes editor for existing Supabase-backed admin page. */
(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const message = text => { $('episodeStatus').textContent = text; };
    function create({client, action, say}) {
        let anime = [];
        let stored = [];
        let editing = false;
        const form = $('episodeForm');
        const sourcesBox = $('episodeSources');

        function field(type, placeholder, value) {
            const input = document.createElement('input');
            input.type = type; input.placeholder = placeholder; input.value = value || '';
            if (type === 'url' || type === 'text') input.dir = 'ltr';
            return input;
        }
        function addSource(source = {}) {
            if (sourcesBox.children.length >= 12) { message('You can add up to 12 video sources per episode.'); return; }
            const row = document.createElement('div'); row.className = 'source-row';
            const name = field('text', 'Server name (HGCloud)', source.name || 'HGCloud');
            name.maxLength = 50; name.setAttribute('aria-label', 'Server name'); name.className = 'source-name';
            const quality = document.createElement('select'); quality.className = 'source-quality';
            quality.setAttribute('aria-label', 'Video quality');
            for (const [val, title] of [['auto', 'Auto'], ['480p','480p'], ['720p','720p'], ['1080p','1080p']]) {
                const opt = document.createElement('option'); opt.value = val; opt.textContent = title; quality.append(opt);
            }
            quality.value = source.quality || '720p';
            const url = field('text', 'Embed URL or iframe code', source.url || '');
            url.className = 'source-url'; url.setAttribute('aria-label', 'Video URL or iframe'); url.required = true;
            const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'danger';
            remove.textContent = 'Remove'; remove.setAttribute('aria-label', 'Remove source'); remove.onclick = () => row.remove();
            row.append(name, quality, url, remove); sourcesBox.append(row);
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
                    if (!confirm(`Delete Season ${e.season_number}, Episode ${e.episode_number} from your site? The file on HGCloud will not be deleted.`)) return;
                    const animeId = $('episodeAnime').value;
                    const result = await client.from('site_episodes').delete().match({anime_id:animeId,season_number:e.season_number,episode_number:e.episode_number}).select('episode_number');
                    if (result.error) throw result.error;
                    if (!result.data?.length) throw Error('Episode could not be deleted. Check your admin permissions.');
                    // Remove shadowed old entry to prevent the deleted episode from reappearing.
                    if (e.season_number === 1) await removeOldLink(animeId, e.episode_number);
                    reset(); await load(); say('Episode deleted from the site. The externally hosted video was not removed.');
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
            let raw=input.trim();
            if (/^<iframe\b/i.test(raw)) {
                const doc=new DOMParser().parseFromString(raw,'text/html');
                raw=doc.querySelector('iframe')?.getAttribute('src')?.trim() || '';
            }
            if (!raw || /[<>]/.test(raw)) throw Error('Please enter a valid URL or the complete iframe embed code.');
            if (raw.startsWith('//')) raw='https:'+raw;
            const parsed=new URL(raw,location.href);
            if (parsed.username || parsed.password || !['https:','http:'].includes(parsed.protocol)) throw Error('Video source must be a valid HTTP/HTTPS URL.');
            // Prevent insecure embeds on an HTTPS production website.
            if (location.protocol==='https:' && parsed.protocol!=='https:') throw Error('Use an HTTPS URL so the video can display on your secure website.');
            return parsed.href;
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
                    const name=row.querySelector('.source-name').value.trim() || 'Server';
                    const quality=row.querySelector('.source-quality').value;
                    const url=parseVideo(row.querySelector('.source-url').value);
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
                reset(); await load(); say('Episode saved. You can now watch it on your website.');
            });
        };
        $('addEpisodeSource').onclick=()=>addSource();
        $('episodeReset').onclick=reset;
        $('episodeAnime').onchange=()=>action(async()=>{reset(); await load();});
        reset();
        return {
            setAnime(items) {
                anime=items;
                const select=$('episodeAnime'), old=select.value;
                select.replaceChildren();
                for (const a of anime) { const opt=document.createElement('option'); opt.value=a.id; opt.textContent=a.title; select.append(opt); }
                if (anime.some(a=>a.id===old)) select.value=old;
            },
            async open(id) {
                $('animeSection').hidden=true; $('wallSection').hidden=true; $('episodeSection').hidden=false;
                if (id && anime.some(a=>a.id===id)) $('episodeAnime').value=id;
                reset(); await load();
            }
        };
    }
    window.EpisodeAdmin={create};
})();
