(async function () {
  'use strict';
  const $=id=>document.getElementById(id);
  const query=new URLSearchParams(location.search);
  const animeId=query.get('anime')||'';
  const season=Number(query.get('season')||1),episode=Number(query.get('episode')||1);
  const status=$('choiceStatus'), watch=$('choiceWatch'), download=$('choiceDownload');
  const setStatus=(message,error=false)=>{status.textContent=message;status.classList.toggle('is-error',error);};
  function validNumber(number,max){return Number.isInteger(number)&&number>=1&&number<=max;}
  function directDownload(source){
    const api=window.EpisodeAPI;
    const explicit=api.safeDownloadLink(source.download_url||'');
    return explicit||(api.sourceKind(source.url)==='video'?api.safeDownloadLink(source.url):'');
  }
  if(!animeId||!validNumber(season,100)||!validNumber(episode,2000)){
    setStatus('Invalid anime or episode number.',true);return;
  }
  try{
    await window.ANIME_READY;
    const anime=(window.ANIME_DATA||[]).find(item=>String(item.id)===animeId);
    if(!anime){setStatus('This anime could not be found.',true);return;}
    const details=`anime-details.html?id=${encodeURIComponent(animeId)}`;
    $('choiceBack').href=details;
    $('choiceBreadcrumb').textContent=`ANIME / ${String(anime.title||'ANIME').toUpperCase()} / EPISODE ${episode}`;
    $('choiceAnime').textContent=anime.title||'Anime';
    $('choiceEpisode').textContent=`S${season} · EP ${episode}`;
    $('choiceFormat').textContent=String(anime.anime_type||'TV');
    document.title=`Episode ${episode} · ${anime.title} | The Everything`;
    const poster=$('choicePoster');
    try{const url=new URL(anime.image||'',location.href);if(['http:','https:'].includes(url.protocol))poster.src=url.href;}catch(_){/* no poster */}
    poster.alt=`${anime.title} cover`;
    const result=await window.EpisodeAPI.get(anime,season,episode);
    if(result.error) console.warn(result.error);
    const current=result.episode;
    if(!current){setStatus('This episode is not available yet.',true);return;}
    const sources=(current.sources||[]).filter(item=>window.EpisodeAPI.safeLink(item.url));
    if(!sources.length){setStatus('There are no available watch sources for this episode.',true);return;}
    $('choiceServerCount').textContent=`${sources.length} server${sources.length===1?'':'s'}`;
    $('choiceTitle').textContent=`Episode ${episode}`;
    watch.disabled=false;
    const url=`watch.html?anime=${encodeURIComponent(animeId)}&season=${season}&episode=${episode}`;
    watch.onclick=()=>{window.location.href=url;};
    const downloadable=sources.map(source=>({source,href:directDownload(source)})).find(record=>record.href);
    if(downloadable){
      $('choiceDownloadHint').textContent=`Direct video file · ${downloadable.source.name}`;
      download.disabled=false;
      download.onclick=async()=>{
        // Use the original direct file URL only. We do not scrape/embed-bypass VOE or other providers.
        const link=document.createElement('a');link.href=downloadable.href;
        link.download=`${String(anime.title||'Anime').replace(/[^a-z0-9 _-]/gi,'').trim()||'Anime'}-S${season}-E${episode}.mp4`;
        link.rel='noopener noreferrer';link.target='_blank';document.body.append(link);
        link.click();link.remove();
        setStatus('Download requested. Your browser or file host controls whether it saves or opens the file.');
        const action=window.TEEpisodeActivity;
        if(action){const saved=await action.record(animeId,season,episode,'download');
          if(saved.error)setStatus(`Download opened, but ${saved.error}`,true);}
      };
      setStatus('Choose Watch or Download to continue.');
    }else{
      $('choiceDownloadHint').textContent='Unavailable — no direct authorized file link';
      setStatus('Watch is available. Download requires a direct file URL added by the administrator.');
    }
    $('choiceActions').setAttribute('aria-busy','false');
  }catch(error){console.error('Episode choice failed:',error);setStatus('Could not load the episode. Check your connection and try again.',true);}
})();
