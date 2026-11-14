#!/usr/bin/env python3
"""Static regression checks for custom Profile page background precedence."""
from pathlib import Path
import re
import sys
import tinycss2
import cssselect2
root=Path(__file__).resolve().parents[2]
html=(root/'profile.html').read_text()
css=(root/'profile-v9.css').read_text()
app=(root/'app-standalone.css').read_text()
shared=(root/'te-unified-theme-v12.css').read_text()
js=(root/'profile-page-background.js').read_text()
assert html.count('profile-v9.css?v=20261114-bgfix1') == 1
assert 'profile-page-background.js' in html
assert 'profile-background-fast.js?v=20261114-1' in html
assert html.index('profile-v9.css?v=20261114-bgfix1') < html.index('te-unified-theme-v12.css')
assert 'background:' in shared and 'body:is(.te-v5-wallpaper,.te-v5-profile' in shared

# Detect the browser override inside the sheet, including priority to defeat
# the global theme's shorthand !important declaration.
rules=tinycss2.parse_stylesheet(css,skip_whitespace=True,skip_comments=True)
assert not [e for e in rules if e.type=='error'], 'CSS parse error'
selector='body.te-v5-profile.has-page-background'
found=False
for rule in rules:
    if rule.type!='qualified-rule': continue
    if tinycss2.serialize(rule.prelude).strip()==selector:
        decls=tinycss2.parse_declaration_list(rule.content,skip_whitespace=True,skip_comments=True)
        assert not [e for e in decls if e.type=='error']
        bg=[d for d in decls if d.type=='declaration' and d.name=='background-image']
        if bg and bg[-1].important and '--profile-page-image' in tinycss2.serialize(bg[-1].value): found=True
assert found,'Profile desktop background override missing or not important'

# Installed app provides a higher-specificity shorthand: overrides must have
# higher specificity even though app-standalone.css is loaded after profile-v9.css.
installed='html.te-app-mode body.te-v5-profile.has-page-background'
app_base='html.te-app-mode body.te-v5'
assert cssselect2.compile_selector_list(installed)[0].specificity > cssselect2.compile_selector_list(app_base)[0].specificity
assert installed in css
assert re.search(r'html\.te-app-mode body\.te-v5-profile\.has-page-background\s*\{[^}]*background-image\s*:[^;]*--profile-page-image\)!important',css)
assert 'html.te-app-mode body.te-v5' in app

# User images are still resolved from the authenticated private bucket, and
# removing the image clears the class and the property (no new DB writes).
assert "from('profile-page-backgrounds')" in js
assert "fast.restore('page'" in js
assert "fast.paint('page'" in js
fast=(root/'profile-background-fast.js').read_text()
assert "element.classList.add(className)" in fast
assert "element.classList.remove(className)" in fast
assert "element.style.removeProperty(property)" in fast
assert "sessionStorage" in fast
print('PASS: Profile background precedence, app specificity, cache version, private image lifecycle')
