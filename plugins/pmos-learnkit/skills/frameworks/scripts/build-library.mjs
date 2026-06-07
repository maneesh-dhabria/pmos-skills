#!/usr/bin/env node
// build-library.mjs — frameworks.json + owned SVG diagrams → a single self-contained
// index.html (diagrams inlined, filters + search, inline-expand detail with the PM's
// take). Offline from file://. Zero-dep Node ESM. (See reference/matching.md / SKILL.md.)
//
// Usage:
//   node build-library.mjs --out <index.html> [--corpus <frameworks.json>] [--diagrams <dir>]
//   node build-library.mjs --selftest
//
// FR-ING-1: diagrams are inlined as <svg>, never hot-linked. No external asset refs.

import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { argv } from 'node:process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function inlineMd(s) {
  // escape first, then re-introduce a tiny safe markdown subset.
  let t = esc(s);
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return t;
}

// minimal markdown → HTML for body_md (nested tab-indented lists, blockquotes, paras).
export function renderMarkdown(md) {
  if (!md) return '';
  const lines = String(md).split('\n');
  const out = [];
  let listDepth = -1; // current open <ul> nesting (by tab count), -1 = none
  const closeListsTo = (depth) => { while (listDepth > depth) { out.push('</ul>'); listDepth--; } };
  let inQuote = false;
  const closeQuote = () => { if (inQuote) { out.push('</blockquote>'); inQuote = false; } };

  for (const raw of lines) {
    if (raw.trim() === '') { closeListsTo(-1); closeQuote(); continue; }
    const li = /^(\t*)-\s+(.*)$/.exec(raw);
    if (li) {
      closeQuote();
      const depth = li[1].length;
      if (depth > listDepth) { while (listDepth < depth) { out.push('<ul>'); listDepth++; } }
      else if (depth < listDepth) { closeListsTo(depth); }
      out.push(`<li>${inlineMd(li[2])}</li>`);
      continue;
    }
    const q = /^\s*>\s?(.*)$/.exec(raw);
    if (q) { closeListsTo(-1); if (!inQuote) { out.push('<blockquote>'); inQuote = true; } out.push(`${inlineMd(q[1])}<br>`); continue; }
    // plain paragraph line
    closeListsTo(-1); closeQuote();
    out.push(`<p>${inlineMd(raw.trim())}</p>`);
  }
  closeListsTo(-1); closeQuote();
  return out.join('\n');
}

// diagramsFor(r) → array of inlined SVG strings (primary first, then any extras).
// Back-compat: a legacy diagramFor(r) returning a single string is wrapped to [string].
export function buildHtml(records, diagramsFor) {
  const svgsFor = (r) => {
    if (!diagramsFor) return [];
    const v = diagramsFor(r);
    if (Array.isArray(v)) return v.filter(Boolean);
    return v ? [v] : [];
  };
  const enriched = records.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category || 'Uncategorized',
    super_category: r.super_category || 'Uncategorized',
    decision_type: r.decision_type || 'n/a',
    summary: r.summary || '',
    tags: r.problem_tags || [],
    when_to_use: r.when_to_use || '',
    when_not_to_use: r.when_not_to_use || '',
    commentary: r.commentary || '',
    author: r.author || '',
    references: r.references || [],
    related: r.related || [],
    body_html: renderMarkdown(r.body_md || ''),
    diagrams_svg: svgsFor(r),
  }));
  const data = JSON.stringify(enriched).replace(/<\/script>/gi, '<\\/script>');
  const superCats = [...new Set(enriched.map((e) => e.super_category))].sort();
  const decisionTypes = [...new Set(enriched.map((e) => e.decision_type))].sort();

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="pmos:skill" content="frameworks">
<title>PM Frameworks Library</title>
<style>
:root{--bg:#0f1320;--panel:#171c2e;--card:#1d2438;--ink:#e7ecf5;--muted:#9aa6bf;--accent:#6ea8fe;--line:#2a3252}
*{box-sizing:border-box}
body{margin:0;font:15px/1.55 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--ink)}
header{position:sticky;top:0;background:var(--panel);border-bottom:1px solid var(--line);padding:16px 20px;z-index:5}
h1{margin:0 0 10px;font-size:20px}
.controls{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.controls input,.controls select{background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:8px 10px;font-size:14px}
.controls input{flex:1;min-width:220px}
.count{color:var(--muted);font-size:13px;margin-left:auto}
main{padding:18px 20px;display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;cursor:pointer;transition:border-color .15s}
.card:hover{border-color:var(--accent)}
.card h2{margin:0 0 4px;font-size:16px}
.card .cat{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.04em}
.card .sum{margin:8px 0 10px;color:var(--ink)}
.tags{display:flex;flex-wrap:wrap;gap:6px}
.tag{background:#243; color:#9fe0b8;border:1px solid #2f5; border-color:#33523f;border-radius:999px;padding:2px 8px;font-size:11px}
.dt{display:inline-block;background:#2a3252;color:var(--accent);border-radius:999px;padding:2px 8px;font-size:11px;margin-top:8px}
.detail{grid-column:1/-1;background:var(--panel);border:1px solid var(--accent);border-radius:12px;padding:18px 22px}
.detail h2{margin:0 0 2px}
.detail .meta{color:var(--muted);font-size:13px;margin-bottom:12px}
.take{background:#1a2236;border-left:3px solid var(--accent);padding:10px 14px;border-radius:6px;margin:12px 0;color:#cdd8ef}
.take b{color:var(--accent)}
.when{display:flex;gap:18px;flex-wrap:wrap;margin:10px 0}
.when div{flex:1;min-width:200px}
.when h4{margin:0 0 4px;font-size:12px;text-transform:uppercase;color:var(--muted)}
.body ul{margin:6px 0;padding-left:20px}
.body blockquote{border-left:3px solid var(--line);margin:8px 0;padding:2px 12px;color:var(--muted)}
.diagram svg{max-width:100%;height:auto;background:#fff;border-radius:8px;padding:8px}
.refs a{color:var(--accent);margin-right:12px}
.empty{grid-column:1/-1;color:var(--muted);text-align:center;padding:40px}
button.close{float:right;background:none;border:1px solid var(--line);color:var(--muted);border-radius:8px;padding:4px 10px;cursor:pointer}
</style>
</head>
<body>
<header>
<h1>PM Frameworks Library</h1>
<div class="controls">
<input id="search" type="search" placeholder="Describe a problem or search a framework…" aria-label="Search frameworks">
<select id="superFilter" aria-label="Filter by area"><option value="">All areas</option>${superCats.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}</select>
<select id="dtFilter" aria-label="Filter by decision type"><option value="">All decision types</option>${decisionTypes.map((d) => `<option value="${esc(d)}">${esc(d)}</option>`).join('')}</select>
<span class="count" id="count"></span>
</div>
</header>
<main id="grid"></main>
<script id="frameworks-data" type="application/json">${data}</script>
<script>
const DATA = JSON.parse(document.getElementById('frameworks-data').textContent);
const grid = document.getElementById('grid');
const search = document.getElementById('search');
const superFilter = document.getElementById('superFilter');
const dtFilter = document.getElementById('dtFilter');
const count = document.getElementById('count');
let openId = null;
function esc(s){const d=document.createElement('div');d.textContent=s==null?'':s;return d.innerHTML;}
function matches(f, q){
  if(!q) return true;
  const hay=(f.name+' '+f.summary+' '+f.category+' '+(f.tags||[]).join(' ')+' '+f.when_to_use).toLowerCase();
  return q.toLowerCase().split(/\\s+/).filter(Boolean).every(t=>hay.includes(t));
}
function render(){
  const q=search.value.trim();
  const sc=superFilter.value, dt=dtFilter.value;
  const list=DATA.filter(f=>(!sc||f.super_category===sc)&&(!dt||f.decision_type===dt)&&matches(f,q));
  count.textContent=list.length+' of '+DATA.length;
  grid.innerHTML='';
  if(!list.length){grid.innerHTML='<div class="empty">No frameworks match. Try fewer words or clear the filters.</div>';return;}
  for(const f of list){
    if(f.id===openId){grid.appendChild(detail(f));continue;}
    const c=document.createElement('div');c.className='card';c.onclick=()=>{openId=f.id;render();};
    c.innerHTML='<div class="cat">'+esc(f.category)+'</div><h2>'+esc(f.name)+'</h2>'
      +'<div class="sum">'+esc(f.summary)+'</div>'
      +'<div class="tags">'+(f.tags||[]).map(t=>'<span class="tag">'+esc(t)+'</span>').join('')+'</div>'
      +'<span class="dt">'+esc(f.decision_type)+'</span>';
    grid.appendChild(c);
  }
}
function detail(f){
  const d=document.createElement('div');d.className='detail';
  const refs=(f.references||[]).map(r=>'<a href="'+esc(r.url)+'" target="_blank" rel="noopener">'+esc(r.type)+'</a>').join('');
  d.innerHTML='<button class="close" onclick="openId=null;render()">close ✕</button>'
    +'<h2>'+esc(f.name)+'</h2><div class="meta">'+esc(f.category)+(f.author?' · '+esc(f.author):'')+' · '+esc(f.decision_type)+'</div>'
    +(f.commentary?'<div class="take"><b>PM&#39;s take:</b> '+esc(f.commentary)+'</div>':'')
    +'<div class="when">'+(f.when_to_use?'<div><h4>When to use</h4>'+esc(f.when_to_use)+'</div>':'')+(f.when_not_to_use?'<div><h4>When not to use</h4>'+esc(f.when_not_to_use)+'</div>':'')+'</div>'
    +((f.diagrams_svg||[]).length?'<div class="diagram">'+f.diagrams_svg.join('')+'</div>':'')
    +'<div class="body">'+f.body_html+'</div>'
    +(refs?'<div class="refs"><h4>References</h4>'+refs+'</div>':'');
  return d;
}
search.addEventListener('input',render);
superFilter.addEventListener('change',render);
dtFilter.addEventListener('change',render);
render();
// optional deep-link: #id opens a framework
if(location.hash){const id=decodeURIComponent(location.hash.slice(1));if(DATA.some(f=>f.id===id)){openId=id;render();}}
</script>
</body>
</html>
`;
}

// ---- selftest -------------------------------------------------------------
function assert(cond, msg) { if (!cond) throw new Error(msg); }

function runSelftest() {
  const recs = [
    { id: 'product/rice', name: 'RICE', category: 'Product', super_category: 'Product', decision_type: 'prioritization', summary: 'Score features.', problem_tags: ['prioritization'], when_to_use: 'Ranking features.', when_not_to_use: 'Few items.', commentary: 'Workhorse score.', references: [{ type: 'Article', url: 'https://x.com/a' }], body_md: '- RICE = Reach × Impact × Confidence ÷ Effort.\n\t- **Reach**: how many.' },
  ];
  // back-compat: a legacy single-string diagram fn is wrapped to a one-element array.
  const html = buildHtml(recs, () => '<svg viewBox="0 0 10 10"><rect width="10" height="10"/></svg>');
  assert(html.includes('<svg'), 'diagram SVG inlined');
  assert(!/<img\s/i.test(html), 'no <img> tags (diagrams inlined)');
  assert(!/(href|src)="https?:\/\/[^"]*amazonaws/i.test(html), 'no S3 asset refs');
  assert(!/<link[^>]+href="https?:/i.test(html), 'no external stylesheet');
  assert(!/<script[^>]+src="https?:/i.test(html), 'no external script');
  assert(html.includes('id="search"'), 'search control present');
  assert(html.includes('id="superFilter"'), 'area filter present');
  assert(html.includes('id="dtFilter"'), 'decision-type filter present');
  assert(/PM&#39;s take|PM's take/.test(html), "PM's take block present");
  assert(html.includes('<strong>Reach</strong>'), 'markdown bold rendered');
  assert(html.includes('<li>'), 'markdown list rendered');
  // references render as links the user clicks (content links are allowed)
  assert(html.includes('https://x.com/a'), 'reference link present');

  // multi-diagram path: a record with N diagrams inlines all N SVGs in order.
  const multi = buildHtml(recs, () => [
    '<svg id="d-primary" viewBox="0 0 10 10"></svg>',
    '<svg id="d-extra2" viewBox="0 0 10 10"></svg>',
    '<svg id="d-extra3" viewBox="0 0 10 10"></svg>',
  ]);
  assert(multi.includes('d-primary') && multi.includes('d-extra2') && multi.includes('d-extra3'),
    'all diagrams[] entries inlined');
  // order preserved: primary appears before its extras in the embedded JSON.
  assert(multi.indexOf('d-primary') < multi.indexOf('d-extra2'), 'primary precedes extras');
  console.log('build-library --selftest: PASS (self-contained, inlined SVGs incl. multi-diagram, filters, take)');
}

function main() {
  const args = argv.slice(2);
  if (args.includes('--selftest')) {
    try { runSelftest(); } catch (e) { console.error(`build-library --selftest: FAIL — ${e.message}`); process.exit(1); }
    return;
  }
  const flag = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : null; };
  const here = dirname(fileURLToPath(import.meta.url));
  const corpus = flag('corpus') || join(here, '..', 'data', 'frameworks.json');
  const diagramsDir = flag('diagrams') || join(here, '..', 'data', 'diagrams');
  const out = flag('out');
  if (!out) { console.error('usage: build-library.mjs --out <index.html> [--corpus <json>] [--diagrams <dir>]'); process.exit(64); }
  const records = JSON.parse(readFileSync(corpus, 'utf8'));
  const readSvg = (relOrName) => {
    // accept either a repo-relative path ("data/diagrams/x.svg") or a bare filename.
    const name = String(relOrName).split('/').pop();
    const p = join(diagramsDir, name);
    return existsSync(p) ? readFileSync(p, 'utf8') : '';
  };
  const diagramsFor = (r) => {
    // prefer the diagrams[] array; fall back to the single diagram field (back-compat).
    const list = Array.isArray(r.diagrams) && r.diagrams.length ? r.diagrams : (r.diagram ? [r.diagram] : []);
    return list.map(readSvg).filter(Boolean);
  };
  const html = buildHtml(records, diagramsFor);
  const tmp = out + '.tmp';
  writeFileSync(tmp, html);
  renameSync(tmp, out);
  console.error(`build-library: wrote ${out} (${records.length} frameworks)`);
}

if (argv[1] && fileURLToPath(import.meta.url) === argv[1]) {
  main();
}
