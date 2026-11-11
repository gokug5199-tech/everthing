/* Private per-account episode actions. The database/RLS—not client checks—enforces ownership. */
(function () {
  'use strict';
  const URL = 'https://tnavsfbolastevebukxl.supabase.co';
  const KEY = 'sb_publishable_3FX_mPM-A6dIY-nQTtFZQg_5HPoWO9B';
  const $ = id => document.getElementById(id);
  let sharedClient = null;
  function client() {
    if (!window.supabase?.createClient) return null;
    return window.TEAnimeClient || (sharedClient ||= window.supabase.createClient(URL, KEY));
  }
  async function signedInUser() {
    const db = client();
    if (!db) return null;
    const {data, error} = await db.auth.getSession();
    if (error) throw error;
    return data?.session?.user || null;
  }
  async function record(animeId, season, episode, action) {
    const db = client();
    if (!db) return {saved:false, signedIn:false, error:'Account service unavailable.'};
    try {
      const user = await signedInUser();
      if (!user) return {saved:false, signedIn:false};
      const {error} = await db.rpc('site_record_episode_action', {
        p_anime_id:String(animeId), p_season:Number(season), p_episode:Number(episode), p_action:action
      });
      if (error) throw error;
      return {saved:true, signedIn:true};
    } catch (error) {
      console.warn('Episode activity not saved:', error);
      return {saved:false, signedIn:true, error:/PGRST202|42883|42P01|PGRST205/.test(error.code||'')
        ? 'Episode history is not set up. Run EPISODE-ACTIVITY-SETUP-v37.sql in Supabase.'
        : 'Could not save your episode activity. Check your connection.'};
    }
  }
  function textNode(tag, cls, value) {
    const element=document.createElement(tag); if(cls) element.className=cls;
    element.textContent=value; return element;
  }
  async function mountProfile() {
    if (!$('episodeActivitySection')) return;
    const status=$('episodeActivityStatus');
    const watched=$('episodesOpenedCount'), downloads=$('episodeDownloadCount');
    const recent=$('episodeActivityRecent');
    try {
      const db=client(); const user=await signedInUser();
      if (!db || !user) { status.textContent='Log in to view your episode activity.'; return; }
      const [watchedResult,downloadResult,historyResult]=await Promise.all([
        db.from('user_episode_activity').select('anime_id',{count:'exact',head:true}).eq('user_id',user.id).not('watched_at','is',null),
        db.from('user_episode_activity').select('anime_id',{count:'exact',head:true}).eq('user_id',user.id).not('download_requested_at','is',null),
        db.from('user_episode_activity').select('anime_id,season_number,episode_number,watched_at,download_requested_at')
          .eq('user_id',user.id).order('last_action_at',{ascending:false}).limit(12)
      ]);
      const error=watchedResult.error||downloadResult.error||historyResult.error;
      if(error) throw error;
      watched.textContent=String(watchedResult.count??0);
      downloads.textContent=String(downloadResult.count??0);
      const names=new Map((window.ANIME_DATA||[]).map(a=>[String(a.id),a.title]));
      recent.replaceChildren();
      const rows=historyResult.data||[];
      if (!rows.length) recent.append(textNode('p','episode-history-empty','Your recently opened episodes will appear here.'));
      for(const row of rows){
        const link=document.createElement('a');link.className='episode-history-item';
        link.href=`episode-choice.html?anime=${encodeURIComponent(row.anime_id)}&season=${row.season_number}&episode=${row.episode_number}`;
        link.append(textNode('span','episode-history-name',`${names.get(String(row.anime_id))||String(row.anime_id).replace(/-/g,' ')} · Episode ${row.episode_number}`));
        link.append(textNode('span','episode-history-label',`${row.watched_at?'Opened':'—'}${row.download_requested_at?' · Download requested':''}`));
        recent.append(link);
      }
      status.textContent='Activity is private to your account. Opening an episode is not the same as completing it.';
    } catch (error) {
      console.warn('Episode activity unavailable:',error);
      status.textContent='Episode activity unavailable. Run the v37 Supabase SQL setup and refresh.';
    }
  }
  window.TEEpisodeActivity={client,signedInUser,record,mountProfile};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountProfile,{once:true});
  else mountProfile();
})();
