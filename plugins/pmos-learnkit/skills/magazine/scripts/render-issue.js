#!/usr/bin/env node
// render-issue.js — render the self-contained magazine issue HTML and the
// cross-issue library index (FR-E1..E3). Zero npm dependencies; node >= 18.
//
// The issue is ONE self-contained HTML file (inline CSS + JS) that works from
// file:// with no server: a "Top picks" lane, a card grid, and a client-side
// filter bar. The reader can switch layout (Grid / Carousel / Listicle),
// mark items read, and filter via dropdowns — all persisted in localStorage.
// Re-run after each item completes for incremental render (FR-D3).
//
// Output UX (Wave 1, 2026-06-05): view-switcher, read-state + counter,
// keyboard skim (j/k/o/f/m), type/feed/tag color cues, catch-up budget,
// uniform collapsing cards, dropdown filter bar with a live result counter.
// All affordances are progressive enhancements gated on a `body.js` class, so
// with JavaScript disabled the grid + every bullet + the read links still work.
//
// Usage:
//   node render-issue.js issue   <items.json>   > {date}_issue.html
//   node render-issue.js library <issues.json>  > index.html
//   node render-issue.js --selftest
//
// issue items.json:   { "issue_date": "2026-06-03",
//   "items": [{ guid, feed, type, title, link, published, reading_time?,
//               bullets: [..], tags: [..], top_pick?: bool, degraded?: "reason" }] }
// library issues.json: { "issues": [{ date, file, items: [{title, feed, tags, date, link}] }] }
'use strict';

const fs = require('fs');

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Deterministic string -> hue (0..359). Same tag/feed always maps to the same
// color, within and across issues (FR-4 feed dots, FR-6 tag chips). djb2.
function hashHue(s) {
  s = String(s == null ? '' : s);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

// Extract the leading integer minutes from a reading_time string
// ("6 min" -> 6, "101 min listen" -> 101). 0 when unparseable/absent (FR-5).
function parseMinutes(s) {
  const m = /(\d+)/.exec(String(s == null ? '' : s));
  return m ? parseInt(m[1], 10) : 0;
}

const ISSUE_CSS = `
:root{--ink:#1a1a1a;--muted:#666;--line:#e2e2e2;--accent:#2b6cb0;--pod:#7c3aed;--bg:#fafafa;--pick:#fffbea}
*{box-sizing:border-box}body{font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:var(--bg);margin:0}
header{padding:1.2rem 2rem;border-bottom:1px solid var(--line);background:#fff}
h1{font-size:1.4rem;margin:0}
.topbar{display:flex;gap:1rem;flex-wrap:wrap;align-items:center;justify-content:space-between}
.controls{display:flex;gap:.8rem;align-items:center;flex-wrap:wrap;font-size:.8rem}
.viewsel{display:none;border:1px solid var(--line);border-radius:6px;overflow:hidden}
body.js .viewsel{display:inline-flex}
.viewsel button{border:0;background:#fff;padding:.25rem .6rem;font-size:.78rem;cursor:pointer;color:var(--ink)}
.viewsel button.on{background:var(--accent);color:#fff}
.budget{color:var(--muted)}
.filters{position:sticky;top:0;background:#fff;border-bottom:1px solid var(--line);padding:.8rem 2rem;display:flex;gap:1rem;flex-wrap:wrap;align-items:flex-end;z-index:5}
.filters .fl{font-size:.72rem;color:var(--muted);display:flex;flex-direction:column;gap:.15rem}
.filters select,.filters input[type=date]{font-size:.78rem;border:1px solid var(--line);border-radius:6px;padding:.2rem}
.count{color:var(--muted);font-size:.78rem;align-self:center}
.chip{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:.1rem .6rem;margin:.1rem;font-size:.78rem;background:#eef1f4}
main{max-width:1100px;margin:0 auto;padding:1.5rem 2rem}
h2{font-size:1.05rem;border-bottom:2px solid var(--line);padding-bottom:.3rem}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1rem}
.card{position:relative;background:#fff;border:1px solid var(--line);border-radius:8px;padding:1rem;display:flex;flex-direction:column}
.card[data-type=newsletter]{border-left:3px solid var(--accent)}
.card[data-type=podcast]{border-left:3px solid var(--pod)}
.card.pick{background:var(--pick)}
.card.degraded{opacity:.75;border-style:dashed}
.card.read{opacity:.5}
body.hide-read .card.read{display:none}
.card.focus{outline:2px solid var(--accent);outline-offset:2px}
.badge{display:inline-block;font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.card h3{font-size:1rem;margin:.3rem 0;padding-right:1.6rem}
.meta{font-size:.75rem;color:var(--muted);margin-bottom:.4rem}
.feed-dot{display:inline-block;width:.5rem;height:.5rem;border-radius:50%;background:hsl(var(--h,210),55%,55%);margin-right:.3rem;vertical-align:middle}
.card ul{margin:.4rem 0;padding-left:1.1rem}
.card li{font-size:.86rem;margin:.2rem 0}
body.js .bullets li:nth-child(n+4){display:none}
body.js .card.expanded .bullets li{display:list-item}
.more{display:none}
body.js .more{display:inline-block;align-self:flex-start;border:0;background:none;color:var(--accent);font-size:.8rem;cursor:pointer;padding:.1rem 0;margin:.1rem 0}
.mark{display:none}
body.js .mark{display:block;position:absolute;top:.5rem;right:.5rem;border:1px solid var(--line);background:#fff;color:var(--muted);border-radius:50%;width:1.4rem;height:1.4rem;font-size:.75rem;line-height:1;cursor:pointer;padding:0}
.card.read .mark{background:var(--accent);color:#fff;border-color:var(--accent)}
.tags .chip{background:hsl(var(--h,210),70%,92%);color:#2a2a2a;border-color:hsl(var(--h,210),45%,82%);cursor:default}
.warn{color:#b7791f;font-size:.78rem;font-weight:600}
a.read{margin-top:auto;font-size:.85rem;color:var(--accent);text-decoration:none}
.hidden{display:none}
.carnav{display:none}
body[data-view=carousel] .carnav{display:flex;gap:1rem;align-items:center;justify-content:center;position:sticky;top:3.4rem;background:var(--bg);padding:.5rem;z-index:4}
.carnav button{border:1px solid var(--line);background:#fff;border-radius:6px;padding:.2rem .8rem;cursor:pointer;font-size:1rem}
body[data-view=carousel] #top-picks{display:none}
body[data-view=carousel] #all-items>h2{display:none}
body[data-view=carousel] #all-items .grid{display:block;max-width:640px;margin:0 auto}
body[data-view=carousel] #all-items .card{display:none}
body[data-view=carousel] #all-items .card.cur{display:flex}
body[data-view=listicle] .grid{grid-template-columns:1fr;max-width:720px;margin:0 auto}
footer{max-width:1100px;margin:0 auto;padding:1.5rem 2rem;color:var(--muted);font-size:.8rem;border-top:1px solid var(--line)}
`;

const ISSUE_JS = `
(function(){
  var body=document.body; body.classList.add('js');
  var allCards=[].slice.call(document.querySelectorAll('#all-items .card'));
  var RKEY='mag:read:'+(body.dataset.issue||'');
  function vis(){return allCards.filter(function(c){return !c.classList.contains('hidden')});}
  // ---- read-state ----
  function readSet(){try{return new Set(JSON.parse(localStorage.getItem(RKEY)||'[]'));}catch(e){return new Set();}}
  function saveRead(s){try{localStorage.setItem(RKEY,JSON.stringify([].slice.call(s)));}catch(e){}}
  function applyRead(){var s=readSet();[].slice.call(document.querySelectorAll('.card')).forEach(function(c){c.classList.toggle('read',s.has(c.dataset.guid));});updateCount();}
  function toggleRead(g){if(!g)return;var s=readSet();if(s.has(g))s.delete(g);else s.add(g);saveRead(s);applyRead();}
  function updateCount(){
    var s=readSet(),total=allCards.length;
    var unread=allCards.filter(function(c){return !s.has(c.dataset.guid);}).length;
    var left=document.getElementById('left'); if(left)left.textContent=unread+' of '+total+' left';
    var shown=allCards.filter(function(c){return !c.classList.contains('hidden');}).length;
    var cnt=document.getElementById('count'); if(cnt)cnt.textContent='showing '+shown+' of '+total;
  }
  // ---- filter ----
  function selVals(sel){return sel?[].slice.call(sel.selectedOptions).map(function(o){return o.value;}).filter(function(v){return v!=='';}):[];}
  function magFilter(){
    var feeds=selVals(document.querySelector('.f-feed'));
    var tags=selVals(document.querySelector('.f-tag'));
    var typeEl=document.querySelector('.f-type'),readEl=document.querySelector('.f-read');
    var type=typeEl?typeEl.value:'',read=readEl?readEl.value:'';
    var fromEl=document.getElementById('f-from'),toEl=document.getElementById('f-to');
    var from=fromEl?fromEl.value:'',to=toEl?toEl.value:'';
    var s=readSet();
    [].slice.call(document.querySelectorAll('.card')).forEach(function(card){
      var okFeed=!feeds.length||feeds.indexOf(card.dataset.feed)>=0;
      var cardTags=(card.dataset.tags||'').split(',');
      var okTag=!tags.length||tags.some(function(t){return cardTags.indexOf(t)>=0;});
      var okType=!type||card.dataset.type===type;
      var isRead=s.has(card.dataset.guid);
      var okRead=!read||(read==='read'?isRead:!isRead);
      var d=card.dataset.date||'';
      var okDate=(!from||d>=from)&&(!to||d<=to);
      card.classList.toggle('hidden',!(okFeed&&okTag&&okType&&okRead&&okDate));
    });
    updateCount();
    if(body.dataset.view==='carousel')showCur(0);
  }
  // ---- view + carousel ----
  var cur=0;
  function showCur(i){var v=vis();if(!v.length){return;}cur=Math.max(0,Math.min(i,v.length-1));v.forEach(function(c,j){c.classList.toggle('cur',j===cur);});var p=document.getElementById('carpos');if(p)p.textContent=(cur+1)+' / '+v.length;if(v[cur])v[cur].scrollIntoView({block:'nearest'});}
  function setView(vw){body.dataset.view=vw;try{localStorage.setItem('mag:view',vw);}catch(e){}[].slice.call(document.querySelectorAll('.viewsel button')).forEach(function(b){b.classList.toggle('on',b.dataset.view===vw);});if(vw==='carousel')showCur(0);}
  // ---- focus (grid/listicle) ----
  var fi=-1;
  function setFocus(i){var v=vis();if(!v.length){return;}fi=Math.max(0,Math.min(i,v.length-1));v.forEach(function(c,j){c.classList.toggle('focus',j===fi);});if(v[fi])v[fi].scrollIntoView({block:'nearest'});}
  function activeCard(){var v=vis();return body.dataset.view==='carousel'?v[cur]:v[fi];}
  // ---- wiring ----
  document.addEventListener('change',function(e){var t=e.target;
    if(t.classList&&(t.classList.contains('f-feed')||t.classList.contains('f-tag')||t.classList.contains('f-type')||t.classList.contains('f-read'))||t.id==='f-from'||t.id==='f-to')magFilter();
    if(t.id==='hideRead'){body.classList.toggle('hide-read',t.checked);try{localStorage.setItem('mag:hideRead',t.checked?'1':'0');}catch(e2){}}
  });
  document.addEventListener('click',function(e){var t=e.target;
    if(t.dataset&&t.dataset.view){setView(t.dataset.view);return;}
    if(t.classList&&t.classList.contains('more')){var c=t.closest('.card');if(c){c.classList.toggle('expanded');t.textContent=c.classList.contains('expanded')?'Show less':'Show more';}return;}
    if(t.classList&&t.classList.contains('mark')){var c2=t.closest('.card');if(c2)toggleRead(c2.dataset.guid);return;}
    if(t.id==='carprev'){showCur(cur-1);return;}
    if(t.id==='carnext'){showCur(cur+1);return;}
  });
  document.addEventListener('keydown',function(e){
    var tag=(e.target.tagName||'').toLowerCase();if(tag==='input'||tag==='select'||tag==='textarea')return;
    var k=e.key;
    if(body.dataset.view==='carousel'){if(k==='ArrowRight'){showCur(cur+1);e.preventDefault();return;}if(k==='ArrowLeft'){showCur(cur-1);e.preventDefault();return;}}
    if(k==='j'){setFocus(fi+1);e.preventDefault();}
    else if(k==='k'){setFocus(fi<0?0:fi-1);e.preventDefault();}
    else if(k==='o'){var c=activeCard();if(c){var a=c.querySelector('a.read');if(a)window.open(a.href,'_blank','noopener');}}
    else if(k==='f'){var s=document.querySelector('.filters select');if(s){s.focus();e.preventDefault();}}
    else if(k==='m'){var c2=activeCard();if(c2)toggleRead(c2.dataset.guid);}
  });
  // ---- init ----
  var sv='grid';try{sv=localStorage.getItem('mag:view')||'grid';}catch(e){}setView(sv);
  var hr=false;try{hr=localStorage.getItem('mag:hideRead')==='1';}catch(e){}
  var hrEl=document.getElementById('hideRead');if(hrEl)hrEl.checked=hr;body.classList.toggle('hide-read',hr);
  applyRead();magFilter();
})();
`;

function cardHtml(it) {
  const cls = ['card'];
  if (it.top_pick) cls.push('pick');
  if (it.degraded) cls.push('degraded');
  const bl = it.bullets || [];
  const bullets = bl.map((b) => `<li>${esc(b)}</li>`).join('');
  const more = bl.length > 3 ? `<button class="more" type="button">Show more</button>` : '';
  const tags = (it.tags || []).map((t) => `<span class="chip" style="--h:${hashHue(t)}">${esc(t)}</span>`).join('');
  const verb = it.type === 'podcast' ? 'Listen' : 'Read';
  const guid = it.guid || it.link || it.title || '';
  const metaParts = [];
  if (it.feed) metaParts.push(`<span class="feed-dot" style="--h:${hashHue(it.feed)}"></span>${esc(it.feed)}`);
  if (it.published) metaParts.push(esc(it.published.slice(0, 10)));
  if (it.reading_time) metaParts.push(esc(it.reading_time));
  const meta = metaParts.join(' · ');
  return `<article class="${cls.join(' ')}" data-guid="${esc(guid)}" data-type="${esc(it.type || 'newsletter')}" data-feed="${esc(it.feed)}" data-date="${esc((it.published || '').slice(0, 10))}" data-tags="${esc((it.tags || []).join(','))}">
  <button class="mark" type="button" title="mark read" aria-label="mark read">✓</button>
  <span class="badge">${esc(it.type || 'newsletter')}</span>
  <h3>${esc(it.title)}</h3>
  <div class="meta">${meta}</div>
  ${it.degraded ? `<div class="warn">⚠ ${esc(it.degraded)}</div>` : ''}
  <ul class="bullets">${bullets}</ul>
  ${more}
  <div class="tags">${tags}</div>
  <a class="read" href="${esc(it.link)}" target="_blank" rel="noopener">${verb} →</a>
</article>`;
}

// Collapse items that share a link (or, lacking one, a title) to a single card.
// Backstop to the ledger-level cross-feed dedup (FR-Q2/Q4): even if the agent
// hands us un-deduped items, the grid never shows the same article twice. The
// first occurrence wins, preserving order and any top_pick flag it carried.
function dedupeItems(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const key = it.link || it.guid || it.title;
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    out.push(it);
  }
  return out;
}

function renderIssue(data) {
  const items = dedupeItems(data.items || []);
  const feeds = [...new Set(items.map((i) => i.feed).filter(Boolean))].sort();
  const tags = [...new Set(items.flatMap((i) => i.tags || []))].sort();
  const picks = items.filter((i) => i.top_pick);

  // Catch-up budget (FR-5): skim minutes from newsletters, audio from podcasts.
  const skim = items.filter((i) => i.type !== 'podcast').reduce((a, i) => a + parseMinutes(i.reading_time), 0);
  const audio = items.filter((i) => i.type === 'podcast').reduce((a, i) => a + parseMinutes(i.reading_time), 0);
  const budgetParts = [];
  if (skim > 0) budgetParts.push(`~${skim} min to skim`);
  if (audio > 0) { const h = Math.floor(audio / 60), m = audio % 60; budgetParts.push(`${h ? h + 'h ' : ''}${m}m of audio`); }
  const budget = budgetParts.length ? `<span class="budget"> · ${budgetParts.join(' · ')}</span>` : '';

  const feedOpts = feeds.map((f) => `<option value="${esc(f)}">${esc(f)}</option>`).join('');
  const tagOpts = tags.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="pmos:skill" content="magazine">
<title>Magazine — ${esc(data.issue_date || '')}</title>
<style>${ISSUE_CSS}</style></head><body data-issue="${esc(data.issue_date || '')}">
<header><div class="topbar">
  <div><h1>Magazine</h1><div class="meta">Issue ${esc(data.issue_date || '')} · ${items.length} items${budget}</div></div>
  <div class="controls">
    <span class="viewsel"><button type="button" data-view="grid">Grid</button><button type="button" data-view="carousel">Cards</button><button type="button" data-view="listicle">List</button></span>
    <span id="left"></span>
    <label><input type="checkbox" id="hideRead"> hide read</label>
  </div>
</div></header>
<div class="filters">
  <label class="fl">Feed<select multiple class="f-feed" size="3">${feedOpts || '<option disabled>none</option>'}</select></label>
  <label class="fl">Tag<select multiple class="f-tag" size="3">${tagOpts || '<option disabled>none</option>'}</select></label>
  <label class="fl">Type<select class="f-type"><option value="">all</option><option value="newsletter">newsletter</option><option value="podcast">podcast</option></select></label>
  <label class="fl">Status<select class="f-read"><option value="">all</option><option value="unread">unread</option><option value="read">read</option></select></label>
  <label class="fl">From<input type="date" id="f-from"></label>
  <label class="fl">To<input type="date" id="f-to"></label>
  <span id="count" class="count"></span>
</div>
<div class="carnav"><button id="carprev" type="button">◀</button><span id="carpos"></span><button id="carnext" type="button">▶</button></div>
<main>
  ${picks.length ? `<section id="top-picks"><h2>Top picks</h2><div class="grid">${picks.map(cardHtml).join('')}</div></section>` : ''}
  <section id="all-items"><h2>All items</h2><div class="grid">${items.map(cardHtml).join('')}</div></section>
</main>
<footer>Generated by /magazine · pmos-learnkit · works offline from file://</footer>
<script>${ISSUE_JS}</script></body></html>`;
}

function renderLibrary(data) {
  const issues = data.issues || [];
  const seen = new Set();
  const rows = [];
  for (const iss of issues) {
    for (const it of (iss.items || [])) {
      const key = it.link || (it.title + it.date);
      if (seen.has(key)) continue; // per-issue dedup by GUID/link
      seen.add(key);
      rows.push(Object.assign({ issue: iss.date, file: iss.file }, it));
    }
  }
  const rowHtml = rows.map((r) => `<tr data-search="${esc(((r.title || '') + ' ' + (r.feed || '') + ' ' + (r.tags || []).join(' ')).toLowerCase())}">
  <td>${esc(r.date || '')}</td><td>${esc(r.feed || '')}</td>
  <td><a href="${esc(r.link)}" target="_blank" rel="noopener">${esc(r.title)}</a></td>
  <td>${(r.tags || []).map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</td>
  <td><a href="${esc(r.file)}">${esc(r.issue || '')}</a></td></tr>`).join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="pmos:skill" content="magazine">
<title>Magazine — Library</title>
<style>${ISSUE_CSS}
table{border-collapse:collapse;width:100%;font-size:.9rem}td,th{border:1px solid var(--line);padding:.4rem .6rem;text-align:left}
#q{padding:.5rem;width:100%;font-size:1rem;border:1px solid var(--line);border-radius:6px;margin:1rem 0}</style></head><body>
<header><h1>Magazine — Library</h1><div class="meta">${rows.length} items across ${issues.length} issues</div></header>
<main>
<input id="q" placeholder="Search all issues by title, feed, or tag…">
<table><thead><tr><th>Date</th><th>Feed</th><th>Title</th><th>Tags</th><th>Issue</th></tr></thead><tbody>${rowHtml}</tbody></table>
</main>
<footer>Generated by /magazine · pmos-learnkit</footer>
<script>document.getElementById('q').addEventListener('input',function(e){var q=e.target.value.toLowerCase();
[].slice.call(document.querySelectorAll('tbody tr')).forEach(function(tr){tr.style.display=tr.dataset.search.indexOf(q)>=0?'':'none';});});</script>
</body></html>`;
}

function selftest() {
  let ok = true;
  const assert = (c, m) => { if (!c) { ok = false; console.error('FAIL:', m); } };

  const issue = renderIssue({
    issue_date: '2026-06-03',
    items: [
      { guid: 'g1', feed: 'Lenny', type: 'newsletter', title: 'Pricing', link: 'https://x/1', published: '2026-06-02T09:00:00Z', reading_time: '6 min', bullets: ['a', 'b', 'c'], tags: ['pricing'], top_pick: true },
      { guid: 'g2', feed: 'Pod', type: 'podcast', title: 'Ep 1', link: 'https://x/2', published: '2026-06-01T09:00:00Z', reading_time: '101 min listen', bullets: [], tags: ['growth'], degraded: 'no transcript — install whisper' },
    ],
  });

  // ---- preserved contract ----
  assert(issue.includes('class="filters"'), 'issue has filter bar');
  assert(issue.includes('f-feed'), 'feed filter hook present');
  assert(issue.includes('f-tag'), 'tag filter hook present');
  assert(issue.includes('id="f-from"') && issue.includes('id="f-to"'), 'date range present');
  assert(issue.includes('Top picks'), 'top-picks lane present');
  assert(issue.includes('class="card pick'), 'top pick card flagged');
  assert(issue.includes('degraded'), 'degraded card rendered, not dropped');
  assert(issue.includes('meta name="pmos:skill" content="magazine"'), 'skill meta tag baked');
  assert(/Listen/.test(issue) && /Read/.test(issue), 'listen/read verbs by type');

  // ---- FR-1 view-switcher ----
  assert(issue.includes('data-view="grid"') && issue.includes('data-view="carousel"') && issue.includes('data-view="listicle"'), 'FR-1 view-switcher buttons');
  assert(issue.includes('mag:view'), 'FR-1 view choice persisted');
  // ---- FR-2 read-state ----
  assert(issue.includes('data-guid="g1"'), 'FR-2 stable per-card data-guid');
  assert(issue.includes('id="left"'), 'FR-2 reading counter');
  assert(issue.includes('class="mark"'), 'FR-2 mark-read control');
  assert(issue.includes('mag:read:'), 'FR-2 read-state persisted');
  assert(issue.includes('id="hideRead"'), 'FR-2 hide-read toggle');
  // ---- FR-3 keyboard skim ----
  assert(/k==='j'/.test(issue) && /k==='k'/.test(issue), 'FR-3 j/k keyboard nav');
  // ---- FR-4 type color-coding + feed dot ----
  assert(issue.includes('data-type="newsletter"') && issue.includes('data-type="podcast"'), 'FR-4 data-type on cards');
  assert(issue.includes('feed-dot'), 'FR-4 per-feed dot');
  // ---- FR-5 catch-up budget ----
  assert(issue.includes('to skim') && issue.includes('of audio'), 'FR-5 catch-up budget (skim + audio)');
  // ---- FR-6 consistent tag colors ----
  assert(/<span class="chip" style="--h:\d/.test(issue), 'FR-6 deterministic tag hue');
  // ---- FR-8 dropdown filter + counter ----
  assert(issue.includes('f-type') && issue.includes('f-read'), 'FR-8 type + read-state filters');
  assert(issue.includes('id="count"'), 'FR-8 live result counter');
  // ---- NFR-2 progressive enhancement: bullet clamp gated on body.js ----
  assert(issue.includes('body.js .bullets'), 'NFR-2 bullet clamp gated on JS');

  // ---- FR-7 uniform cards: >3 bullets get a show-more; <=3 do not ----
  const fiveB = renderIssue({ issue_date: 'x', items: [{ guid: 'b5', feed: 'F', type: 'newsletter', title: 'T', link: 'l', bullets: ['1', '2', '3', '4', '5'], tags: [] }] });
  assert(fiveB.includes('class="more"'), 'FR-7 show-more on >3 bullets');
  assert(!issue.includes('class="more"'), 'FR-7 no show-more on <=3 bullets');

  // FR-Q4: the issue grid dedups by link even if the agent passes a dup
  // (backstop to the ledger-level cross-feed dedup). Two items, same link →
  // one card.
  const dupIssue = renderIssue({
    issue_date: '2026-06-03',
    items: [
      { guid: 'a', feed: 'Pod', type: 'podcast', title: 'Same ep', link: 'https://x/ep', bullets: [], tags: [] },
      { guid: 'b', feed: 'Lenny', type: 'newsletter', title: 'Same ep cross-post', link: 'https://x/ep', bullets: [], tags: [] },
    ],
  });
  assert((dupIssue.match(/<article /g) || []).length === 1, 'issue grid collapses a repeated link to one card');

  const lib = renderLibrary({
    issues: [
      { date: '2026-06-03', file: '2026-06-03_issue.html', items: [{ title: 'Pricing', feed: 'Lenny', tags: ['pricing'], date: '2026-06-02', link: 'https://x/1' }] },
      { date: '2026-05-27', file: '2026-05-27_issue.html', items: [{ title: 'Pricing', feed: 'Lenny', tags: ['pricing'], date: '2026-06-02', link: 'https://x/1' }] },
    ],
  });
  assert(lib.includes('id="q"'), 'library search box present');
  assert((lib.match(/<tr data-search/g) || []).length === 1, 'library dedups repeated link across issues');

  // pure helpers
  assert(hashHue('ai') === hashHue('ai') && hashHue('ai') >= 0 && hashHue('ai') < 360, 'hashHue deterministic + in range');
  assert(parseMinutes('101 min listen') === 101 && parseMinutes('6 min') === 6 && parseMinutes('') === 0, 'parseMinutes extracts leading int');

  console.log(ok ? 'render-issue.js --selftest: PASS' : 'render-issue.js --selftest: FAIL');
  process.exit(ok ? 0 : 1);
}

module.exports = { renderIssue, renderLibrary, hashHue, parseMinutes };

if (require.main === module) {
  const argv = process.argv.slice(2);
  if (argv.includes('--selftest')) { selftest(); }
  else {
    const mode = argv[0];
    const file = argv[1];
    if ((mode !== 'issue' && mode !== 'library') || !file) {
      console.error('usage: render-issue.js issue|library <data.json>  (or --selftest)');
      process.exit(64);
    }
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    process.stdout.write(mode === 'issue' ? renderIssue(data) : renderLibrary(data));
  }
}
