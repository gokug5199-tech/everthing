#!/usr/bin/env python3
"""Check migrated attribution without network access. Run from any directory."""
from html.parser import HTMLParser
from pathlib import Path
root = Path(__file__).resolve().parents[2]

def read(name): return (root / name).read_text(encoding='utf-8')
class HTML(HTMLParser):
    def __init__(self):
        super().__init__(); self.attrs = []; self.text = []
    def handle_starttag(self, tag, attrs): self.attrs.append((tag, dict(attrs)))
    def handle_data(self, value): self.text.append(value)

detail, about = HTML(), HTML()
detail.feed(read('anime-details.html'))
about.feed(read('about.html'))
assert not any(attrs.get('id')=='teGuideCredit' for _,attrs in detail.attrs)
assert 'guideCredit' not in read('anime-details.js')
assert not any('te-guide-credit' in attrs.get('class','') for _,attrs in detail.attrs)
assert any(tag=='a' and attrs.get('href')=='about.html#data-sources-credits' for tag,attrs in detail.attrs)
assert any(attrs.get('id')=='data-sources-credits' for _,attrs in about.attrs)
for target in ['https://fillerlists.com/data','https://fillerlists.com/terms','https://creativecommons.org/licenses/by-sa/4.0/','episode-guides.js']:
    assert any(tag=='a' and attrs.get('href')==target for tag,attrs in about.attrs), target
assert 'The Everything adapts the data for display' in read('about.html')
assert 'Adaptations of FillerLists episode data remain licensed' in read('about.html')
assert 'All arcs' in read('anime-details.html') and 'Hide filler' in read('anime-details.html')
print('PASS: clean episode UI; About credits, source links, license and adaptation notice present')
