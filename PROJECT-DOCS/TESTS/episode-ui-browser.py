"""Local headless Chromium regression checks: no real Supabase/Cloudflare traffic.
Requires playwright + Chromium. Run with: python PROJECT-DOCS/TESTS/episode-ui-browser.py
"""
import json
import threading
import time
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw): super().__init__(*a,directory=str(ROOT),**kw)
    def log_message(self,*a): pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
thread=threading.Thread(target=server.serve_forever,daemon=True)
thread.start()
BASE=f'http://127.0.0.1:{server.server_port}/'

short=dict(id='short-title',title='Short Title',mal_id=8770001,anime_type='TV',episodes=12,genres=['Drama'],image='',description='Short series',rating=7.0)
bleach=dict(id='bleach',title='Bleach',mal_id=269,anime_type='TV',episodes=366,genres=['Action'],image='',description='Long series',rating=8.0)
watch_sources=[{'name':'VOE','url':'https://voe.sx/e/fake123456','quality':'auto'}]
def episode_list(count,id):
    return [dict(anime_id=id,season_number=1,episode_number=n,title='',sources=watch_sources if n in (1,2,64,131,355) else []) for n in range(1,count+1)]

calls=[]
def route_handler(route):
    req=route.request; u=urlparse(req.url)
    if u.hostname and u.hostname.endswith('supabase.co'):
        calls.append(('supabase',u.path))
        if u.path.endswith('/site_anime'):
            anime=bleach if 'eq.bleach' in u.query else short
            if 'mal_relations' in u.query or 'series_key' in u.query: data=[]
            else: data=[anime]
        elif u.path.endswith('/site_episodes'):
            if 'eq.bleach' in u.query:
                if 'limit=1' in u.query:
                    from urllib.parse import parse_qs
                    ep=int(parse_qs(u.query).get('episode_number',['eq.1'])[0].split('eq.')[-1]);data=[episode_list(366,'bleach')[ep-1]]
                else: data=episode_list(366,'bleach')
            else:
                data=episode_list(12,'short-title')
        else: data=[]
        route.fulfill(status=200,content_type='application/json',body=json.dumps(data))
    elif u.path=='/api/episode-guide':
        calls.append(('guide',u.query))
        guide={'show':'bleach','mal_id':269,'source':'FillerLists','episodes':[
            {'n':1,'type':'canon','arc':'Agent of the Shinigami'},
            {'n':2,'type':'canon','arc':'Agent of the Shinigami'},
            {'n':64,'type':'filler','arc':'Bount'},
            {'n':355,'type':'filler','arc':'Lost Agent'}
        ]}
        route.fulfill(status=200,content_type='application/json',body=json.dumps(guide))
    elif u.hostname and u.hostname.endswith('fillerlists.com'):
        calls.append(('direct-guide',u.path))
        route.fulfill(status=503,body='unavailable')
    elif u.hostname in ('127.0.0.1','localhost'):
        route.continue_()
    else: route.abort()

try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        context=browser.new_context(viewport={'width':1366,'height':960},service_workers='block')
        page=context.new_page();page.route('**/*',route_handler)
        page.goto(BASE+'anime-details.html?id=short-title',wait_until='domcontentloaded')
        page.locator('#episodeCount').get_by_text('12 episodes').wait_for(timeout=10000)
        assert not page.locator('#teGuideHealth').is_visible(),'Short shows must have no guide status'
        assert not page.locator('#teGuideControls').is_visible(),'Short shows must have no empty guide controls'
        assert len([c for c in calls if c[0]=='guide'])==0,'No guide network for unsupported short show'
        assert 'V39' not in page.locator('body').inner_text().upper()
        assert page.locator('#episodesGrid .episode').count()==12
        print('PASS small anime: no false arc/filler UI or unnecessary guide requests')

        calls.clear()
        page.goto(BASE+'anime-details.html?id=bleach',wait_until='domcontentloaded')
        page.locator('#episodeCount').get_by_text('366 episodes').wait_for(timeout=12000)
        page.locator('.te-arc-heading').first.wait_for(timeout=12000)
        assert page.locator('#teGuideControls').is_visible(), 'Guide controls should be shown for verified arcs'
        assert not page.locator('#teGuideHealth').is_visible(), 'Status bar not shown when guide loaded'
        assert page.locator('#teArcSelect option').count()>1
        assert page.locator('body').inner_text().upper().find('V39')==-1
        assert any(c[0]=='guide' for c in calls)
        print('PASS Bleach: verified arcs, no version/status banner, guide route contacted')

        page.locator('#teEpisodeSearch').fill('64')
        page.locator('.episode').first.wait_for()
        assert page.locator('.episode').count()==1
        assert page.locator('.episode').first.get_attribute('href').startswith('episode-choice.html?')
        page.locator('.episode').first.click()
        page.wait_for_url('**/episode-choice.html*',timeout=10000)
        page.locator('#choiceBack').click()
        page.wait_for_url('**/anime-details.html?id=bleach',timeout=10000)
        page.locator('.detail-top .back-button').click()
        page.wait_for_url('**/anime.html',timeout=10000)
        print('PASS navigation: episode -> choice -> details -> anime catalog (no options loop)')

        page.set_viewport_size({'width':390,'height':844})
        page.goto(BASE+'anime-details.html?id=short-title',wait_until='domcontentloaded')
        page.locator('#episodeCount').get_by_text('12 episodes').wait_for(timeout=10000)
        assert page.locator('.detail-top .back-button').is_visible()
        assert not page.locator('#teGuideHealth').is_visible()
        print('PASS mobile: page controls remain visible, no guide banner')
        browser.close()
finally:
    server.shutdown()
