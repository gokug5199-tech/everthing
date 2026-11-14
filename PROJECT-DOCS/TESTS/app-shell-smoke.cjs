/* Run: node PROJECT-DOCS/TESTS/app-shell-smoke.cjs */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..', '..');
const boot = fs.readFileSync(path.join(root, 'app-standalone-boot.js'),'utf8');
function testBoot({androidStandalone=false, iosStandalone=false, narrow=true}) {
  const classes = new Set();
  const media = {
    '(display-mode: standalone)': {matches:androidStandalone,addEventListener(){}},
    '(max-width: 767px)': {matches:narrow,addEventListener(){}}
  };
  vm.runInNewContext(boot, {
    document:{documentElement:{classList:{toggle(name, on){on?classes.add(name):classes.delete(name);}}}},
    window:{matchMedia(q){ assert(media[q], 'unexpected matchMedia query: '+q);return media[q];}},
    navigator:{standalone:iosStandalone}
  });
  return classes.has('te-app-mode');
}
assert.equal(testBoot({}),false,'normal mobile browser unchanged');
assert.equal(testBoot({narrow:false,androidStandalone:true}),false,'large screen unchanged');
assert.equal(testBoot({androidStandalone:true}),true,'Android installed PWA activated');
assert.equal(testBoot({iosStandalone:true}),true,'iPhone Add to Home Screen activated');
assert.equal(testBoot({iosStandalone:true,narrow:false}),false,'iPad/desktop wide view unchanged');
const css=fs.readFileSync(path.join(root,'app-standalone.css'),'utf8');
assert(css.includes('@media (max-width: 767px)'));
assert(css.includes('html.te-app-mode'));
assert(css.includes('.te-app-dock'));
assert(css.includes('.te-app-feature-tile'));
const js=fs.readFileSync(path.join(root,'app-standalone.js'),'utf8');
for(const term of ['te-app-dock','te-app-dashboard','te-app-anime-intro','wallpaper.html','my-anime.html']) assert(js.includes(term),term);
let count=0;
for(const file of fs.readdirSync(root).filter(x=>x.endsWith('.html'))) {
  const html=fs.readFileSync(path.join(root,file),'utf8');
  for(const src of ['app-standalone-boot.js?v=app1','app-standalone.css?v=app1','app-standalone.js?v=app1']) {
    assert.equal(html.split(src).length-1,1, file+': '+src+' must occur once');
  }
  assert(html.indexOf('app-standalone-boot.js') < html.indexOf('app-standalone.css'),file+': boot before css');
  assert(html.indexOf('app-standalone.css') < html.indexOf('</head>'),file+': CSS before head close');
  assert(html.indexOf('app-standalone.js') > html.indexOf('</head>'),file+': enhancement after head');
  count++;
}
console.log('PASS: standalone detection for browser/iOS/Android/wide viewport; '+count+' HTML pages integrated; CSS/JS hooks present.');
