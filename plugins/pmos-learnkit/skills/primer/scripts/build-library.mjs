#!/usr/bin/env node
// build-library.mjs — primers-index.json (the committed corpus) + any user-generated
// primers found beside the output page → a single self-contained, offline (file://)
// filterable library.html. Modeled on /frameworks' build-library.mjs (committed corpus,
// gitignored output), adapted for /primer: each card LINKS OUT to a standalone primer HTML
// (we do not inline primer bodies). Renders BOTH populations on one page, distinguished by
// a Collection facet: the shipped corpus (Collection=Curated) and the user's own primers in
// the output directory (Collection=Yours). Zero external deps; Node ESM; no external asset
// refs (inline CSS + JS only) so it opens from file://.
//
// Usage:
//   node build-library.mjs --out <library.html> [--index <primers-index.json>] [--skill-dir <dir>]
//   node build-library.mjs --selftest
//
// The committed corpus is resolved relative to THIS script's location (../data/), not CWD,
// so the skill works wherever the plugin is installed.

import { readFileSync, writeFileSync, existsSync, renameSync, readdirSync } from 'node:fs';
import { argv } from 'node:process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, relative, basename, sep } from 'node:path';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR_DEFAULT = resolve(SCRIPT_DIR, '..');           // skills/primer
const INDEX_DEFAULT = join(SKILL_DIR_DEFAULT, 'data', 'primers-index.json');

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Embed JSON safely inside a <script> block.
function jsonScript(v) { return JSON.stringify(v).replace(/<\/script>/gi, '<\\/script>'); }

// href from the output page's directory to a target file, as a forward-slash URL path.
function hrefFrom(outDir, targetAbs) {
  return relative(outDir, targetAbs).split(sep).join('/');
}

// ---- Curated corpus (the shipped 61-primer index) -------------------------------------
export function loadCurated(indexPath, skillDir, outDir) {
  const arr = JSON.parse(readFileSync(indexPath, 'utf8'));
  if (!Array.isArray(arr)) throw new Error(`index is not an array: ${indexPath}`);
  return arr.map((e) => {
    const primerAbs = resolve(skillDir, e.html);            // e.html = "data/primers/<id>.html"
    return {
      collection: 'Curated',
      id: e.id,
      title: e.title || e.id,
      super_category: e.super_category || 'Uncategorized',
      category: e.category || 'Uncategorized',
      audience: e.audience || '—',
      depth: e.depth || '—',
      sources_count: typeof e.sources_count === 'number' ? e.sources_count : null,
      word_count: typeof e.word_count === 'number' ? e.word_count : null,
      date: e.generated_date || '',
      href: hrefFrom(outDir, primerAbs),
      exists: existsSync(primerAbs),
    };
  });
}

// ---- User-generated primers (scanned from the output directory) -----------------------
// Any *.html in the out-dir that is not the library page itself and not a rejected draft.
export function scanUserPrimers(outDir, outBasename) {
  if (!existsSync(outDir)) return [];
  return readdirSync(outDir)
    .filter((f) => f.endsWith('.html') && f !== outBasename && !f.endsWith('.draft.html'))
    .map((f) => {
      const abs = join(outDir, f);
      let title = f.replace(/\.html$/, '');
      try {
        const html = readFileSync(abs, 'utf8');
        const mt = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const mh = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        const raw = (mt && mt[1]) || (mh && mh[1]);
        if (raw) title = raw.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
      } catch { /* unreadable → keep filename-derived title */ }
      const dm = f.match(/^(\d{4}-\d{2}-\d{2})_/);
      return {
        collection: 'Yours',
        id: f,
        title,
        super_category: 'Your primers',
        category: 'Your primers',
        audience: '—',
        depth: '—',
        sources_count: null,
        word_count: null,
        date: dm ? dm[1] : '',
        href: f,
        exists: true,
      };
    });
}

const uniqSorted = (xs) => [...new Set(xs.filter(Boolean))].sort();

export function buildHtml(records) {
  // Newest-first within the data; the client sorts/filters, but ship a stable order.
  const recs = records.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.title.localeCompare(b.title));
  const facet = (key) => uniqSorted(recs.map((r) => r[key]));
  const facets = {
    collection: facet('collection'),
    super_category: facet('super_category'),
    category: facet('category'),
    audience: facet('audience'),
    depth: facet('depth'),
  };
  const curatedN = recs.filter((r) => r.collection === 'Curated').length;
  const yoursN = recs.length - curatedN;
  const sub = `${curatedN} curated${yoursN ? ` · ${yoursN} of yours` : ''} — search or filter the library`;

  const selectFor = (id, label, values) =>
    `<label>${esc(label)} <select id="${id}" aria-label="Filter by ${esc(label)}"><option value="">All</option>` +
    values.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join('') + `</select></label>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="pmos:skill" content="primer">
<link rel="icon" href="data:,">
<title>PMOS Primer Library</title>
<style>
:root{--bg:#0f1320;--panel:#171c2e;--card:#1d2438;--ink:#e7ecf5;--muted:#9aa6bf;--accent:#6ea8fe;--curated:#0ea5a4;--line:#2a3252}
*{box-sizing:border-box}
body{margin:0;font:15px/1.55 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--ink)}
a{color:var(--accent);text-decoration:none}
header{position:sticky;top:0;background:var(--panel);border-bottom:1px solid var(--line);padding:14px 20px;z-index:5}
.masthead{display:flex;align-items:center;gap:14px;margin-bottom:12px}
.wordmark{font-weight:800;letter-spacing:.06em;font-size:14px;color:#0f1320;background:linear-gradient(135deg,#6ea8fe,#0ea5a4);padding:6px 10px;border-radius:8px}
.mast-text h1{margin:0;font-size:19px}
.subtitle{color:var(--muted);font-size:13px;margin-top:2px}
.controls{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.controls input,.controls select{background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:8px 10px;font-size:14px}
.controls input#search{flex:1;min-width:220px}
.controls label{color:var(--muted);font-size:13px;display:flex;gap:6px;align-items:center}
.count{color:var(--muted);font-size:13px;margin-left:auto}
.applied{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;align-items:center}
.applied:empty{display:none}
.applied-chip{background:#243;color:#9fe0b8;border:1px solid #33523f;border-radius:999px;padding:3px 10px;font-size:12px;cursor:pointer}
.applied-chip:hover{border-color:var(--accent)}
.applied .clear-all{background:none;color:var(--muted);border:1px dashed var(--line);border-radius:999px;padding:3px 10px;font-size:12px;cursor:pointer}
.applied .clear-all:hover{color:var(--ink);border-color:var(--accent)}
#cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:14px;padding:18px 20px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:8px;transition:border-color .15s}
.card:hover{border-color:var(--accent)}
.card .top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.badge{font-size:10px;text-transform:uppercase;letter-spacing:.05em;border-radius:999px;padding:2px 8px;font-weight:700}
.badge.curated{background:rgba(14,165,164,.16);color:#5fe3df;border:1px solid #1f6b69}
.badge.yours{background:rgba(110,168,254,.16);color:var(--accent);border:1px solid #345}
.card h3{margin:0;font-size:16px;line-height:1.3}
.card h3 a{color:var(--ink)}
.card h3 a:hover{color:var(--accent)}
.cat{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.04em}
.metarow{display:flex;flex-wrap:wrap;gap:6px;margin-top:auto}
.pill{background:#2a3252;color:#cdd8ef;border-radius:999px;padding:2px 8px;font-size:11px}
.pill.warn{background:#3a2230;color:#f3b0c0;border:1px solid #5a3344}
.empty{grid-column:1/-1;color:var(--muted);text-align:center;padding:48px}
footer{color:var(--muted);font-size:12px;text-align:center;padding:18px;border-top:1px solid var(--line)}
@media(max-width:560px){.count{margin-left:0}}
</style>
</head>
<body>
<header>
<div class="masthead"><span class="wordmark">PMOS</span><div class="mast-text"><h1>Primer Library</h1><div class="subtitle">${esc(sub)}</div></div></div>
<div class="controls">
<input id="search" type="search" placeholder="Search primers by title or category…" aria-label="Search primers">
${selectFor('f-collection', 'Collection', facets.collection)}
${selectFor('f-super', 'Area', facets.super_category)}
${selectFor('f-category', 'Category', facets.category)}
${selectFor('f-audience', 'Audience', facets.audience)}
${selectFor('f-depth', 'Depth', facets.depth)}
<span class="count" id="count" aria-live="polite"></span>
</div>
<div class="applied" id="applied"></div>
</header>
<div id="cards"></div>
<footer>Self-contained · offline · generated by <code>/primer</code> build-library.mjs</footer>
<script id="primers-data" type="application/json">${jsonScript(recs)}</script>
<script>
var DATA = JSON.parse(document.getElementById('primers-data').textContent);
var cardsEl = document.getElementById('cards');
var countEl = document.getElementById('count');
var appliedEl = document.getElementById('applied');
var search = document.getElementById('search');
var FILTERS = [
  {id:'f-collection', key:'collection', label:'Collection'},
  {id:'f-super', key:'super_category', label:'Area'},
  {id:'f-category', key:'category', label:'Category'},
  {id:'f-audience', key:'audience', label:'Audience'},
  {id:'f-depth', key:'depth', label:'Depth'}
];
var state = { q:'' };
FILTERS.forEach(function(f){ state[f.key]=''; });

function esc(s){var d=document.createElement('div');d.textContent=s==null?'':s;return d.innerHTML;}
function matches(r,q){
  if(!q) return true;
  var hay=(r.title+' '+r.category+' '+r.super_category).toLowerCase();
  return q.toLowerCase().split(/\\s+/).filter(Boolean).every(function(t){return hay.indexOf(t)>=0;});
}
function passes(r){
  for(var i=0;i<FILTERS.length;i++){ var f=FILTERS[i]; if(state[f.key] && r[f.key]!==state[f.key]) return false; }
  return matches(r, state.q);
}
function metaPills(r){
  var p=[];
  if(r.audience && r.audience!=='—') p.push('<span class="pill">'+esc(r.audience)+'</span>');
  if(r.depth && r.depth!=='—') p.push('<span class="pill">'+esc(r.depth)+'</span>');
  if(r.sources_count!=null) p.push('<span class="pill">'+r.sources_count+' sources</span>');
  if(r.word_count!=null) p.push('<span class="pill">'+r.word_count.toLocaleString()+' words</span>');
  if(r.date) p.push('<span class="pill">'+esc(r.date)+'</span>');
  if(r.exists===false) p.push('<span class="pill warn">file missing</span>');
  return p.join('');
}
function cardHtml(r){
  var badge='<span class="badge '+(r.collection==='Curated'?'curated':'yours')+'">'+esc(r.collection)+'</span>';
  var title= r.exists!==false ? '<a href="'+esc(r.href)+'">'+esc(r.title)+'</a>' : esc(r.title);
  return '<article class="card">'
    +'<div class="top">'+badge+'<span class="cat">'+esc(r.category)+'</span></div>'
    +'<h3>'+title+'</h3>'
    +'<div class="metarow">'+metaPills(r)+'</div>'
    +'</article>';
}
function appliedChip(label,key){
  return '<button class="applied-chip" data-clear="'+key+'">'+esc(label)+': '+esc(state[key])+' ✕</button>';
}
function renderApplied(){
  var chips=[];
  FILTERS.forEach(function(f){ if(state[f.key]) chips.push(appliedChip(f.label,f.key)); });
  if(state.q) chips.push('<button class="applied-chip" data-clear="q">search: '+esc(state.q)+' ✕</button>');
  if(chips.length) chips.push('<button class="clear-all" id="clearAll">Clear all</button>');
  appliedEl.innerHTML=chips.join('');
}
function render(){
  var list=DATA.filter(passes);
  cardsEl.innerHTML = list.length ? list.map(cardHtml).join('') : '<div class="empty">No primers match these filters.</div>';
  countEl.textContent = list.length + ' of ' + DATA.length;
  renderApplied();
}
search.addEventListener('input', function(){ state.q=search.value; render(); });
FILTERS.forEach(function(f){
  var el=document.getElementById(f.id);
  if(el) el.addEventListener('change', function(){ state[f.key]=el.value; render(); });
});
appliedEl.addEventListener('click', function(e){
  var c=e.target.closest('[data-clear]'); var all=e.target.closest('#clearAll');
  if(all){ state.q=''; search.value=''; FILTERS.forEach(function(f){ state[f.key]=''; var el=document.getElementById(f.id); if(el) el.value=''; }); render(); return; }
  if(c){ var k=c.getAttribute('data-clear'); if(k==='q'){ state.q=''; search.value=''; } else { state[k]=''; var fl=FILTERS.filter(function(x){return x.key===k;})[0]; if(fl){ var el=document.getElementById(fl.id); if(el) el.value=''; } } render(); }
});
render();
</script>
</body>
</html>
`;
}

// ---- selftest --------------------------------------------------------------------------
function assert(cond, msg) { if (!cond) throw new Error(msg); }

function runSelftest() {
  const outDir = SKILL_DIR_DEFAULT;                 // arbitrary existing dir for href math
  const curated = loadCurated(INDEX_DEFAULT, SKILL_DIR_DEFAULT, outDir);
  assert(curated.length >= 1, 'curated corpus is empty');
  assert(curated.every((r) => r.collection === 'Curated'), 'curated collection tag wrong');
  assert(curated.every((r) => r.href && /\.html$/.test(r.href)), 'curated href not an .html path');
  assert(curated.every((r) => r.exists), 'a curated primer html is missing on disk');

  // synthetic user record exercises the dual-population path without touching disk
  const user = { collection: 'Yours', id: 'u.html', title: 'My Primer', super_category: 'Your primers',
    category: 'Your primers', audience: '—', depth: '—', sources_count: null, word_count: null, date: '2026-01-01', href: 'u.html', exists: true };
  const html = buildHtml(curated.concat([user]));

  assert(html.startsWith('<!DOCTYPE html>'), 'no doctype');
  assert(/<meta name="pmos:skill" content="primer">/.test(html), 'missing pmos:skill meta');
  assert(html.includes('id="f-collection"') && html.includes('id="f-super"') && html.includes('id="f-category"')
    && html.includes('id="f-audience"') && html.includes('id="f-depth"'), 'a facet control is missing');
  assert(/<div id="cards"><\/div>/.test(html), 'cards container should be empty (cards render client-side)');
  // self-contained / offline: no external asset refs (curated hrefs are relative file paths)
  assert(!/(?:src|href)\s*=\s*["']https?:\/\//i.test(html), 'external http(s) asset/link reference found');
  assert(!/<link\b[^>]+href\s*=\s*["'](?!data:)/i.test(html) && !/<script[^>]+\bsrc=/i.test(html), 'external <link>/<script src> found');
  // data round-trips the synthetic user record
  assert(html.includes('"collection":"Yours"'), 'user record not embedded');
  assert(html.includes('>Curated<') && html.includes('>Yours<'), 'collection facet options missing');

  console.log(`build-library --selftest: PASS (${curated.length} curated + 1 synthetic user; facets, single-file/offline, dual-population)`);
}

function main() {
  const args = argv.slice(2);
  if (args.includes('--selftest')) {
    try { runSelftest(); } catch (e) { console.error(`build-library --selftest: FAIL — ${e.message}`); process.exit(1); }
    return;
  }
  const getArg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
  const out = getArg('--out');
  if (!out) { console.error('usage: build-library.mjs --out <library.html> [--index <primers-index.json>] [--skill-dir <dir>]'); process.exit(64); }
  const indexPath = getArg('--index') || INDEX_DEFAULT;
  const skillDir = getArg('--skill-dir') || SKILL_DIR_DEFAULT;
  const outAbs = resolve(out);
  const outDir = dirname(outAbs);

  if (!existsSync(indexPath)) { console.error(`build-library: index not found: ${indexPath}`); process.exit(1); }
  const curated = loadCurated(indexPath, skillDir, outDir);
  const yours = scanUserPrimers(outDir, basename(outAbs));
  const html = buildHtml(curated.concat(yours));

  const tmp = outAbs + '.tmp';
  writeFileSync(tmp, html);
  renameSync(tmp, outAbs);
  const missing = curated.filter((r) => !r.exists).length;
  console.log(`build-library: wrote ${outAbs} — ${curated.length} curated${yours.length ? ` + ${yours.length} yours` : ''}${missing ? ` (warning: ${missing} curated primer files missing)` : ''}`);
}

if (argv[1] && fileURLToPath(import.meta.url) === resolve(argv[1])) {
  main();
}
