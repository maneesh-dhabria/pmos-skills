#!/usr/bin/env node
// render-issue.js — render the self-contained magazine issue HTML and the
// cross-issue library index (FR-E1..E3). Zero npm dependencies; node >= 18.
//
// The issue is ONE self-contained HTML file (inline CSS + JS) that works from
// file:// with no server: a "Top picks" lane, a card grid, and a client-side
// filter bar (feed multi-select + date range + tag chips). Re-run after each
// item completes for incremental render (FR-D3).
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

const ISSUE_CSS = `
:root{--ink:#1a1a1a;--muted:#666;--line:#e2e2e2;--accent:#2b6cb0;--bg:#fafafa;--pick:#fffbea}
*{box-sizing:border-box}body{font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:var(--bg);margin:0}
header{padding:1.2rem 2rem;border-bottom:1px solid var(--line);background:#fff}
h1{font-size:1.4rem;margin:0}
.filters{position:sticky;top:0;background:#fff;border-bottom:1px solid var(--line);padding:.8rem 2rem;display:flex;gap:1.2rem;flex-wrap:wrap;align-items:center;z-index:5}
.filters fieldset{border:1px solid var(--line);border-radius:6px;padding:.3rem .6rem;margin:0}
.filters legend{font-size:.72rem;color:var(--muted);padding:0 .3rem}
.chip{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:.1rem .6rem;margin:.1rem;font-size:.78rem;cursor:pointer;background:#eef1f4}
.chip.on{background:var(--accent);color:#fff;border-color:var(--accent)}
main{max-width:1100px;margin:0 auto;padding:1.5rem 2rem}
h2{font-size:1.05rem;border-bottom:2px solid var(--line);padding-bottom:.3rem}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1rem}
.card{background:#fff;border:1px solid var(--line);border-radius:8px;padding:1rem;display:flex;flex-direction:column}
.card.pick{background:var(--pick)}
.card.degraded{opacity:.75;border-style:dashed}
.badge{display:inline-block;font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.card h3{font-size:1rem;margin:.3rem 0}
.meta{font-size:.75rem;color:var(--muted);margin-bottom:.4rem}
.card ul{margin:.4rem 0;padding-left:1.1rem}
.card li{font-size:.86rem;margin:.2rem 0}
.tags .chip{cursor:default}
.warn{color:#b7791f;font-size:.78rem;font-weight:600}
a.read{margin-top:auto;font-size:.85rem;color:var(--accent);text-decoration:none}
.hidden{display:none}
footer{max-width:1100px;margin:0 auto;padding:1.5rem 2rem;color:var(--muted);font-size:.8rem;border-top:1px solid var(--line)}
`;

const ISSUE_JS = `
function magFilter(){
  var feeds=[].slice.call(document.querySelectorAll('.f-feed:checked')).map(function(c){return c.value});
  var tags=[].slice.call(document.querySelectorAll('.f-tag.on')).map(function(c){return c.dataset.tag});
  var from=document.getElementById('f-from').value, to=document.getElementById('f-to').value;
  [].slice.call(document.querySelectorAll('.card')).forEach(function(card){
    var okFeed=!feeds.length||feeds.indexOf(card.dataset.feed)>=0;
    var cardTags=(card.dataset.tags||'').split(',');
    var okTag=!tags.length||tags.some(function(t){return cardTags.indexOf(t)>=0});
    var d=card.dataset.date||'';
    var okDate=(!from||d>=from)&&(!to||d<=to);
    card.classList.toggle('hidden',!(okFeed&&okTag&&okDate));
  });
}
document.addEventListener('click',function(e){if(e.target.classList.contains('f-tag')){e.target.classList.toggle('on');magFilter();}});
document.addEventListener('change',function(e){if(e.target.classList.contains('f-feed')||e.target.id==='f-from'||e.target.id==='f-to')magFilter();});
`;

function cardHtml(it) {
  const cls = ['card'];
  if (it.top_pick) cls.push('pick');
  if (it.degraded) cls.push('degraded');
  const bullets = (it.bullets || []).map((b) => `<li>${esc(b)}</li>`).join('');
  const tags = (it.tags || []).map((t) => `<span class="chip">${esc(t)}</span>`).join('');
  const verb = it.type === 'podcast' ? 'Listen' : 'Read';
  const meta = [it.feed, it.published ? it.published.slice(0, 10) : '', it.reading_time].filter(Boolean).map(esc).join(' · ');
  return `<article class="${cls.join(' ')}" data-feed="${esc(it.feed)}" data-date="${esc((it.published || '').slice(0, 10))}" data-tags="${esc((it.tags || []).join(','))}">
  <span class="badge">${esc(it.type || 'newsletter')}</span>
  <h3>${esc(it.title)}</h3>
  <div class="meta">${meta}</div>
  ${it.degraded ? `<div class="warn">⚠ ${esc(it.degraded)}</div>` : ''}
  <ul>${bullets}</ul>
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

  const feedChecks = feeds.map((f) => `<label><input type="checkbox" class="f-feed" value="${esc(f)}"> ${esc(f)}</label>`).join(' ');
  const tagChips = tags.map((t) => `<span class="chip f-tag" data-tag="${esc(t)}">${esc(t)}</span>`).join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="pmos:skill" content="magazine">
<title>Magazine — ${esc(data.issue_date || '')}</title>
<style>${ISSUE_CSS}</style></head><body>
<header><h1>Magazine</h1><div class="meta">Issue ${esc(data.issue_date || '')} · ${items.length} items</div></header>
<div class="filters">
  <fieldset><legend>Feeds</legend>${feedChecks || '<span class="meta">none</span>'}</fieldset>
  <fieldset><legend>Tags</legend>${tagChips || '<span class="meta">none</span>'}</fieldset>
  <fieldset><legend>Date</legend><input type="date" id="f-from"> – <input type="date" id="f-to"></fieldset>
</div>
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
      { guid: 'g1', feed: 'Lenny', type: 'newsletter', title: 'Pricing', link: 'https://x/1', published: '2026-06-02T09:00:00Z', bullets: ['a', 'b', 'c'], tags: ['pricing'], top_pick: true },
      { guid: 'g2', feed: 'Pod', type: 'podcast', title: 'Ep 1', link: 'https://x/2', published: '2026-06-01T09:00:00Z', bullets: [], tags: ['growth'], degraded: 'no transcript — install whisper' },
    ],
  });
  assert(issue.includes('class="filters"'), 'issue has filter bar');
  assert(issue.includes('f-feed'), 'feed multi-select present');
  assert(issue.includes('f-tag'), 'tag chips present');
  assert(issue.includes('id="f-from"') && issue.includes('id="f-to"'), 'date range present');
  assert(issue.includes('Top picks'), 'top-picks lane present');
  assert(issue.includes('class="card pick"'), 'top pick card flagged');
  assert(issue.includes('degraded'), 'degraded card rendered, not dropped');
  assert(issue.includes('meta name="pmos:skill" content="magazine"'), 'skill meta tag baked');
  assert(/Listen/.test(issue) && /Read/.test(issue), 'listen/read verbs by type');

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

  console.log(ok ? 'render-issue.js --selftest: PASS' : 'render-issue.js --selftest: FAIL');
  process.exit(ok ? 0 : 1);
}

module.exports = { renderIssue, renderLibrary };

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
