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
//   node render-issue.js issue   <items.json> [<out-html>]   (out-html: also writes <date>_items.json sidecar; else stdout)
//   node render-issue.js library <dir|issues.json>  > index.html  (dir: rebuilt from *_items.json sidecars)
//   node render-issue.js --selftest
//
// issue items.json:   { "issue_date": "2026-06-03",
//   "items": [{ guid, feed, type, title, link, published, reading_time?,
//               bullets: [..], tags: [..], top_pick?: bool, degraded?: "reason" }] }
// library issues.json: { "issues": [{ date, file, items: [{title, feed, tags, date, link}] }] }
// per-issue sidecar:   { "issue_date": "2026-06-03", "items": [ <full item objects, bullets included> ] }
//   — persisted beside the issue HTML so the library rebuilds from DATA (never re-parsed
//     out of HTML, D8) and an overlapping later issue can reuse already-summarized bullets.
'use strict';

const fs = require('fs');
const path = require('path');
const { matchByGuid } = require('./lib-guid.js');

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
.filters{position:sticky;top:0;background:#fff;border-bottom:1px solid var(--line);padding:.7rem 2rem;display:flex;gap:.6rem;flex-wrap:wrap;align-items:center;z-index:5}
.filters select{font-size:.78rem;border:1px solid var(--line);border-radius:6px;padding:.3rem .5rem;background:#fff;height:2rem}
.dd{position:relative}
.dd>summary{list-style:none;cursor:pointer;border:1px solid var(--line);border-radius:6px;padding:.3rem .6rem;font-size:.78rem;background:#fff;height:2rem;display:inline-flex;align-items:center;user-select:none;white-space:nowrap}
.dd>summary::-webkit-details-marker{display:none}
.dd>summary::after{content:"▾";color:var(--muted);margin-left:.35rem;font-size:.7rem}
.dd[open]>summary{border-color:var(--accent);color:var(--accent)}
.ddp{position:absolute;z-index:10;margin-top:.25rem;background:#fff;border:1px solid var(--line);border-radius:6px;padding:.4rem .6rem;box-shadow:0 6px 18px rgba(0,0,0,.12);max-height:230px;overflow:auto;min-width:150px}
.ddp label{display:block;font-size:.8rem;white-space:nowrap;padding:.12rem 0;cursor:pointer}
.ddp .none{color:var(--muted);font-size:.78rem}
.datewrap{display:inline-flex;align-items:center;gap:.3rem;font-size:.72rem;color:var(--muted)}
.datewrap input[type=date]{font-size:.78rem;border:1px solid var(--line);border-radius:6px;padding:.25rem .4rem;height:2rem}
.count{color:var(--muted);font-size:.78rem;margin-left:auto}
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
  function saveRead(s){try{localStorage.setItem(RKEY,JSON.stringify(Array.from(s)));}catch(e){}}
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
  function updateDdLabels(){[].slice.call(document.querySelectorAll('.dd')).forEach(function(dd){var n=dd.querySelectorAll('input:checked').length;var s=dd.querySelector('summary');if(s)s.textContent=(s.dataset.label||'')+(n?' ('+n+')':'');});}
  function magFilter(){
    var feeds=[].slice.call(document.querySelectorAll('.f-feed:checked')).map(function(c){return c.value;});
    var tags=[].slice.call(document.querySelectorAll('.f-tag:checked')).map(function(c){return c.value;});
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
    updateDdLabels();
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
    if(!(t.closest&&t.closest('.dd'))){[].slice.call(document.querySelectorAll('.dd[open]')).forEach(function(d){d.open=false;});}
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

  const feedChecks = feeds.map((f) => `<label><input type="checkbox" class="f-feed" value="${esc(f)}"> ${esc(f)}</label>`).join('');
  const tagChecks = tags.map((t) => `<label><input type="checkbox" class="f-tag" value="${esc(t)}"> ${esc(t)}</label>`).join('');

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
  <details class="dd"><summary data-label="Feed">Feed</summary><div class="ddp">${feedChecks || '<span class="none">no feeds</span>'}</div></details>
  <details class="dd"><summary data-label="Tag">Tag</summary><div class="ddp">${tagChecks || '<span class="none">no tags</span>'}</div></details>
  <select class="f-type" aria-label="Type"><option value="">Type: all</option><option value="newsletter">Newsletters</option><option value="podcast">Podcasts</option></select>
  <select class="f-read" aria-label="Status"><option value="">Status: all</option><option value="unread">Unread</option><option value="read">Read</option></select>
  <span class="datewrap">From <input type="date" id="f-from"></span>
  <span class="datewrap">To <input type="date" id="f-to"></span>
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

// The per-issue sidecar lives beside the issue HTML, named <date>_items.json.
function sidecarPathFor(outHtml, issueDate) {
  const dir = path.dirname(outHtml);
  const date = issueDate || path.basename(outHtml).replace(/_issue\.html$/, '').replace(/\.html$/, '');
  return path.join(dir, `${date}_items.json`);
}

// Persist the per-issue items JSON sidecar (T3/D8/FR-E). It carries the FULL item
// objects (bullets included) so the library rebuilds from data and a later
// overlapping issue can reuse the takeaways. Whole-file via temp-then-rename so a
// crash never leaves a half-written sidecar; the prior sidecar stays intact.
function writeSidecar(outHtml, data) {
  const sidecar = sidecarPathFor(outHtml, data.issue_date);
  const payload = JSON.stringify({ issue_date: data.issue_date || '', items: data.items || [] }, null, 2);
  const tmp = sidecar + '.tmp';
  fs.writeFileSync(tmp, payload);
  fs.renameSync(tmp, sidecar);
  return sidecar;
}

// Build the library {issues:[...]} model from a directory of per-issue sidecars
// (T4/D8: from DATA, never parsed back out of HTML). Every *_issue.html that has
// no sibling *_items.json is surfaced LOUDLY — one stderr skip-notice naming it —
// and omitted; it never crashes the build and is never silently dropped (Inv-1).
function libraryFromDir(dir) {
  const entries = fs.readdirSync(dir);
  const sidecars = entries.filter((f) => /_items\.json$/.test(f)).sort();
  const issues = [];
  for (const f of sidecars) {
    let parsed;
    try { parsed = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); }
    catch (e) { process.stderr.write(`render-issue library: skip-notice — unreadable sidecar ${f}: ${e.message}\n`); continue; }
    const date = parsed.issue_date || f.replace(/_items\.json$/, '');
    const file = `${date}_issue.html`;
    const items = (parsed.items || []).map((it) => ({
      title: it.title, feed: it.feed, tags: it.tags || [],
      date: (it.published || '').slice(0, 10), link: it.link,
    }));
    issues.push({ date, file, items });
  }
  // Loud skip-notice for any issue HTML whose sidecar is missing (legacy / data lost).
  const sidecarBases = new Set(sidecars.map((f) => f.replace(/_items\.json$/, '')));
  const orphans = entries.filter((f) => /_issue\.html$/.test(f))
    .filter((f) => !sidecarBases.has(f.replace(/_issue\.html$/, ''))).sort();
  for (const f of orphans) {
    process.stderr.write(`render-issue library: skip-notice — ${f} has no sibling *_items.json sidecar; omitted from the library (re-render that issue to restore it)\n`);
  }
  return { issues };
}

// Reuse already-summarized takeaways across overlapping windows (T5/D6/FR-E5).
// Partition the current window's snapshot items against a prior issue's sidecar:
//   hydrated    — items that matched a sidecar item (by GUID, normalized via
//                 matchByGuid), carrying that sidecar's bullets/tags forward so
//                 a monthly issue overlapping a weekly one never re-summarizes.
//   needsStageB — exactly the no-cache subset the caller must still run Stage B on.
function mergeCachedBullets(snapshotItems, sidecarItems) {
  const cache = sidecarItems || [];
  const keyOf = (it) => (it.guid != null ? it.guid : (it.link || it.title));
  const cacheGuids = cache.map(keyOf);
  const hydrated = [];
  const needsStageB = [];
  for (const it of (snapshotItems || [])) {
    const match = matchByGuid(cacheGuids, keyOf(it));
    if (match != null) {
      const cached = cache.find((c) => keyOf(c) === match);
      hydrated.push(Object.assign({}, it, {
        bullets: cached.bullets || [],
        tags: (cached.tags && cached.tags.length) ? cached.tags : (it.tags || []),
      }));
    } else {
      needsStageB.push(it);
    }
  }
  return { hydrated, needsStageB };
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

  // ---- T3: issue mode writes a sidecar next to the HTML (temp-then-rename) ----
  const os = require('os');
  const troot = fs.mkdtempSync(path.join(os.tmpdir(), 'mag-render-'));
  const outHtml = path.join(troot, '2026-06-10_issue.html');
  const issueData = { issue_date: '2026-06-10', items: [
    { guid: 'sc1', feed: 'F', type: 'newsletter', title: 'Cached one', link: 'https://x/sc1', published: '2026-06-09T00:00:00Z', bullets: ['k1', 'k2'], tags: ['t'] },
  ] };
  fs.writeFileSync(outHtml, renderIssue(issueData));
  const sc = writeSidecar(outHtml, issueData);
  assert(fs.existsSync(sc), 'T3: sidecar file written next to issue HTML');
  assert(sc === path.join(troot, '2026-06-10_items.json'), 'T3: sidecar named <date>_items.json beside the HTML');
  const scParsed = JSON.parse(fs.readFileSync(sc, 'utf8'));
  assert(Array.isArray(scParsed.items) && scParsed.items[0].bullets[0] === 'k1', 'T3: sidecar carries items[].bullets and round-trips');
  assert(!fs.existsSync(sc + '.tmp'), 'T3: temp file renamed away (no orphan .tmp)');

  // ---- T4: library from a dir of sidecars + loud skip-notice for a sidecar-less issue ----
  const out2 = path.join(troot, '2026-06-03_issue.html');
  const data2 = { issue_date: '2026-06-03', items: [
    { guid: 'sc2', feed: 'G', type: 'newsletter', title: 'Older', link: 'https://x/sc2', published: '2026-06-02T00:00:00Z', bullets: ['z'], tags: ['p'] },
  ] };
  fs.writeFileSync(out2, renderIssue(data2));
  writeSidecar(out2, data2);
  fs.writeFileSync(path.join(troot, '2026-05-27_issue.html'), '<html></html>'); // sidecar-less
  const origErr = process.stderr.write.bind(process.stderr);
  let captured = '';
  process.stderr.write = (s) => { captured += s; return true; };
  let libModel;
  try { libModel = libraryFromDir(troot); } finally { process.stderr.write = origErr; }
  assert(libModel.issues.length === 2, 'T4: library from dir lists exactly the 2 sidecar-backed issues');
  assert(/2026-05-27_issue\.html/.test(captured) && /no sibling/.test(captured), 'T4: loud skip-notice names the sidecar-less issue');
  assert(!/2026-06-10_issue\.html[^\n]*no sibling/.test(captured), 'T4: no false notice for a sidecar-backed issue');
  const libHtml = renderLibrary(libModel);
  assert(libHtml.includes('Cached one') && libHtml.includes('Older'), 'T4: rendered library HTML carries both sidecar issues');

  // ---- T5: mergeCachedBullets reuses sidecar takeaways across overlapping windows ----
  const sidecarCache = [
    { guid: 'https://x.com/p/glm-5-2', bullets: ['cached-A'], tags: ['ai'] },
    { guid: 'g-two', bullets: ['cached-B'], tags: [] },
  ];
  const snapshot = [
    { guid: 'https://x.com/p_glm-5-2', title: 'GLM', link: 'l1', bullets: [] }, // safe-ified key reconciles
    { guid: 'g-two', title: 'Two', link: 'l2', bullets: [] },
    { guid: 'brand-new', title: 'New', link: 'l3', bullets: [] },
  ];
  const merged = mergeCachedBullets(snapshot, sidecarCache);
  assert(merged.hydrated.length === 2, 'T5: 2 overlapping items hydrated from sidecar');
  assert(merged.hydrated[0].bullets[0] === 'cached-A', 'T5: hydrated bullets equal the sidecar (normalized GUID match)');
  assert(merged.needsStageB.length === 1 && merged.needsStageB[0].guid === 'brand-new', 'T5: needsStageB is only the no-cache subset');

  fs.rmSync(troot, { recursive: true, force: true });

  // pure helpers
  assert(hashHue('ai') === hashHue('ai') && hashHue('ai') >= 0 && hashHue('ai') < 360, 'hashHue deterministic + in range');
  assert(parseMinutes('101 min listen') === 101 && parseMinutes('6 min') === 6 && parseMinutes('') === 0, 'parseMinutes extracts leading int');

  console.log(ok ? 'render-issue.js --selftest: PASS' : 'render-issue.js --selftest: FAIL');
  process.exit(ok ? 0 : 1);
}

module.exports = { renderIssue, renderLibrary, hashHue, parseMinutes, writeSidecar, sidecarPathFor, libraryFromDir, mergeCachedBullets };

if (require.main === module) {
  const argv = process.argv.slice(2);
  if (argv.includes('--selftest')) { selftest(); }
  else {
    const mode = argv[0];
    const arg = argv[1];
    const out = argv[2];
    if ((mode !== 'issue' && mode !== 'library') || !arg) {
      console.error('usage: render-issue.js issue <items.json> [<out-html>] | library <dir|issues.json>  (or --selftest)');
      process.exit(64);
    }
    if (mode === 'issue') {
      const data = JSON.parse(fs.readFileSync(arg, 'utf8'));
      const html = renderIssue(data);
      if (out) {
        // Write HTML whole-file via temp-then-rename, then persist the sidecar.
        const tmp = out + '.tmp';
        fs.writeFileSync(tmp, html);
        fs.renameSync(tmp, out);
        const sidecar = writeSidecar(out, data);
        process.stderr.write(`render-issue: wrote ${out} + sidecar ${path.basename(sidecar)}\n`);
      } else {
        process.stdout.write(html); // back-compat: stdout, no sidecar
      }
    } else { // library: dir of sidecars (D8) or legacy issues.json file
      const data = fs.statSync(arg).isDirectory()
        ? libraryFromDir(arg)
        : JSON.parse(fs.readFileSync(arg, 'utf8'));
      process.stdout.write(renderLibrary(data));
    }
  }
}
