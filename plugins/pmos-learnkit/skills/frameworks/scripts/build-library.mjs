#!/usr/bin/env node
// build-library.mjs — frameworks.json + owned SVG diagrams → a single self-contained
// index.html. Three listing views (compact / detailed / list), group-by (Product Areas /
// Tags), a layout-shifting sidebar reader, tag-chip + area + decision-type filters,
// diagrams placed INLINE at their anchor inside the body, copy-markdown / share, and a
// PMOS masthead. Offline from file://. Zero-dep Node ESM. (See reference/matching.md /
// reference/corpus-schema.md / SKILL.md.)
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

// Split body_md into ordered blocks (list / blockquote / paragraph), each keeping its raw
// source text so a diagram anchor (a verbatim body_md substring) can be matched to it.
export function parseBlocks(md) {
  const lines = String(md || '').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i].trim() === '') { i++; continue; }
    if (/^\t*-\s+/.test(lines[i])) { // a list: consume consecutive (possibly nested) bullet lines
      const rl = [];
      while (i < lines.length && /^\t*-\s+/.test(lines[i])) { rl.push(lines[i]); i++; }
      blocks.push({ type: 'list', raw: rl.join('\n') });
      continue;
    }
    if (/^\s*>\s?/.test(lines[i])) { // a blockquote
      const rl = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) { rl.push(lines[i]); i++; }
      blocks.push({ type: 'quote', raw: rl.join('\n') });
      continue;
    }
    blocks.push({ type: 'para', raw: lines[i] }); // single-line paragraph
    i++;
  }
  return blocks;
}

// Block-aware body renderer: place each diagram immediately after the FIRST block whose
// raw source contains its (≥40-char verbatim) anchor; diagrams with a null/unmatched
// anchor go to a leading group at the top of the body (FR-7 top-of-body fallback).
// `diagrams` may be [{svg, anchor}] or a legacy [svg] (wrapped to {svg, anchor:null}).
export function renderBody(md, diagrams) {
  const list = (diagrams || []).map((d) => (typeof d === 'string' ? { svg: d, anchor: null } : d)).filter((d) => d && d.svg);
  const blocks = parseBlocks(md);
  const afterBlock = blocks.map(() => []);
  const leading = [];
  for (const d of list) {
    let placed = false;
    if (d.anchor) {
      const idx = blocks.findIndex((b) => b.raw.includes(d.anchor));
      if (idx >= 0) { afterBlock[idx].push(d.svg); placed = true; }
    }
    if (!placed) leading.push(d.svg);
  }
  const wrap = (svg) => `<div class="diagram">${svg}</div>`;
  const out = [];
  if (leading.length) out.push(`<div class="diagrams-lead">${leading.map(wrap).join('')}</div>`);
  blocks.forEach((b, i) => {
    out.push(renderMarkdown(b.raw));
    for (const svg of afterBlock[i]) out.push(wrap(svg));
  });
  return out.join('\n');
}

// diagramsFor(r) → array of inlined SVG strings (primary first, then any extras), index-aligned
// with the record's diagram_anchors[] (a missing/unreadable SVG must be a falsy slot, NOT dropped —
// dropping it here would re-index the survivors and pair them with the wrong anchor). buildHtml
// zips by index, then drops the falsy slots, so anchor alignment is preserved across gaps.
// Back-compat: a legacy diagramFor(r) returning a single string is wrapped to [string].
export function buildHtml(records, diagramsFor) {
  const svgsFor = (r) => {
    if (!diagramsFor) return [];
    const v = diagramsFor(r);
    if (Array.isArray(v)) return v;            // keep index alignment with diagram_anchors; falsy slots dropped after the zip
    return v ? [v] : [];
  };
  const enriched = records.map((r) => {
    const svgs = svgsFor(r);
    const anchors = Array.isArray(r.diagram_anchors) ? r.diagram_anchors : [];
    const diagrams = svgs
      .map((svg, i) => ({ svg, anchor: anchors[i] != null ? anchors[i] : null }))
      .filter((d) => d.svg);                   // drop missing SVGs AFTER pairing — never before (keeps anchor alignment)
    return {
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
      body_md: r.body_md || '',          // raw — for copy-as-markdown
      thumb: diagrams[0] ? diagrams[0].svg : '', // primary diagram as card thumbnail
      body_html: renderBody(r.body_md || '', diagrams), // inline-anchored diagrams
    };
  });
  const data = JSON.stringify(enriched).replace(/<\/script>/gi, '<\\/script>');
  const superCats = [...new Set(enriched.map((e) => e.super_category))].sort();
  const decisionTypes = [...new Set(enriched.map((e) => e.decision_type))].sort();
  const allTags = [...new Set(enriched.flatMap((e) => e.tags))].sort();
  const tagsJson = JSON.stringify(allTags).replace(/<\/script>/gi, '<\\/script>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="pmos:skill" content="frameworks">
<title>PMOS Frameworks Library</title>
<style>
:root{--bg:#0f1320;--panel:#171c2e;--card:#1d2438;--ink:#e7ecf5;--muted:#9aa6bf;--accent:#6ea8fe;--line:#2a3252}
*{box-sizing:border-box}
body{margin:0;font:15px/1.55 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--ink)}
a{color:var(--accent)}
.layout{display:flex;align-items:flex-start}
.listing{flex:1;min-width:0}
header{position:sticky;top:0;background:var(--panel);border-bottom:1px solid var(--line);padding:14px 20px;z-index:5}
.masthead{display:flex;align-items:center;gap:14px;margin-bottom:12px}
.wordmark{font-weight:800;letter-spacing:.06em;font-size:14px;color:#0f1320;background:linear-gradient(135deg,#6ea8fe,#0ea5a4);padding:6px 10px;border-radius:8px}
.mast-text h1{margin:0;font-size:19px}
.subtitle{color:var(--muted);font-size:13px;margin-top:2px}
.controls{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.controls input,.controls select{background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:8px 10px;font-size:14px}
.controls input{flex:1;min-width:200px}
.controls label{color:var(--muted);font-size:13px;display:flex;gap:6px;align-items:center}
.viewswitch{display:inline-flex;border:1px solid var(--line);border-radius:8px;overflow:hidden}
.viewswitch button{background:var(--card);color:var(--muted);border:0;padding:8px 12px;font-size:13px;cursor:pointer}
.viewswitch button.active{background:var(--accent);color:#0f1320;font-weight:600}
.count{color:var(--muted);font-size:13px;margin-left:auto}
.tagrow{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;max-height:84px;overflow:auto}
.chip{background:var(--card);color:var(--muted);border:1px solid var(--line);border-radius:999px;padding:3px 10px;font-size:12px;cursor:pointer}
.chip.active{background:#33523f;color:#9fe0b8;border-color:#2f5}
.chip.clear{border-style:dashed}
.morefilters{margin-top:8px;color:var(--muted);font-size:13px}
.morefilters summary{cursor:pointer}
.morefilters .mf-body{display:flex;gap:10px;align-items:center;margin-top:8px}
.morefilters select{background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:6px 8px;font-size:13px}
#groups{padding:18px 20px}
.group{margin-bottom:26px}
.group>h3{margin:0 0 12px;font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);border-bottom:1px solid var(--line);padding-bottom:6px}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;cursor:pointer;transition:border-color .15s}
.card:hover,.card.open{border-color:var(--accent)}
.card .thumb{background:#fff;border-radius:8px;padding:6px;margin:-2px 0 10px;max-height:130px;overflow:hidden;display:flex;justify-content:center}
.card .thumb svg{max-width:100%;max-height:118px;height:auto}
.card h4.name{margin:0 0 4px;font-size:16px}
.card .cat{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.04em}
.card .sum{margin:8px 0 10px;color:var(--ink)}
.tags{display:flex;flex-wrap:wrap;gap:6px}
.tag{background:#243;color:#9fe0b8;border:1px solid #33523f;border-radius:999px;padding:2px 8px;font-size:11px}
.dt{display:inline-block;background:#2a3252;color:var(--accent);border-radius:999px;padding:2px 8px;font-size:11px;margin-top:8px}
.compact .row{margin:4px 0;line-height:1.7}
.compact .row a{margin-right:2px}
ul.listview{margin:0;padding-left:18px}
ul.listview li{margin:6px 0}
ul.listview .ls{color:var(--muted)}
.empty{color:var(--muted);text-align:center;padding:40px}
/* sidebar reader — layout-shifting, NOT a fixed overlay, NO backdrop */
.reader{width:0;overflow:hidden;background:var(--panel);border-left:1px solid var(--line);transition:width .18s ease;align-self:stretch;position:sticky;top:0;max-height:100vh;overflow-y:auto}
.layout.reader-open .reader{width:min(440px,42%);padding:18px 20px}
.reader h2{margin:0 2px 2px 0}
.reader .meta{color:var(--muted);font-size:13px;margin-bottom:12px}
.reader .actions{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 14px}
.reader .actions button{background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:6px 10px;font-size:13px;cursor:pointer}
.reader .actions button:hover{border-color:var(--accent)}
.reader button.close{float:right;color:var(--muted)}
.take{background:#1a2236;border-left:3px solid var(--accent);padding:10px 14px;border-radius:6px;margin:12px 0;color:#cdd8ef}
.take b{color:var(--accent)}
.when{display:flex;gap:18px;flex-wrap:wrap;margin:10px 0}
.when div{flex:1;min-width:160px}
.when h4{margin:0 0 4px;font-size:12px;text-transform:uppercase;color:var(--muted)}
.body ul{margin:6px 0;padding-left:20px}
.body blockquote{border-left:3px solid var(--line);margin:8px 0;padding:2px 12px;color:var(--muted)}
.diagram{margin:10px 0}
.diagram svg{max-width:100%;height:auto;background:#fff;border-radius:8px;padding:8px}
.diagrams-lead{margin-bottom:8px}
.refs a{margin-right:12px}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--accent);color:#0f1320;font-weight:600;padding:8px 16px;border-radius:8px;opacity:0;transition:opacity .2s;pointer-events:none;z-index:20}
.toast.show{opacity:1}
@media(max-width:720px){.layout{flex-direction:column}.layout.reader-open .reader{width:100%;border-left:0;border-top:1px solid var(--line);position:static;max-height:none}}
</style>
</head>
<body>
<div class="layout" id="layout">
<main class="listing">
<header>
<div class="masthead"><span class="wordmark">PMOS</span><div class="mast-text"><h1>Frameworks Library</h1><div class="subtitle">${enriched.length} PM thinking tools — describe a problem or browse</div></div></div>
<div class="controls">
<input id="search" type="search" placeholder="Describe a problem or search a framework…" aria-label="Search frameworks">
<div class="viewswitch" role="tablist" aria-label="View">
<button type="button" data-view="compact" aria-label="Compact list view">Compact</button>
<button type="button" data-view="detailed" class="active" aria-label="Detailed cards view">Detailed</button>
<button type="button" data-view="list" aria-label="List view">List</button>
</div>
<label>Group by <select id="groupBy" aria-label="Group by"><option value="category">Product Areas</option><option value="tags">Tags</option></select></label>
<select id="superFilter" aria-label="Filter by area"><option value="">All areas</option>${superCats.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}</select>
<span class="count" id="count"></span>
</div>
<div class="tagrow" id="tagrow"></div>
<details class="morefilters"><summary>More filters</summary><div class="mf-body"><label>Decision type <select id="dtFilter" aria-label="Filter by decision type"><option value="">All decision types</option>${decisionTypes.map((d) => `<option value="${esc(d)}">${esc(d)}</option>`).join('')}</select></label></div></details>
</header>
<div id="groups"></div>
</main>
<aside class="reader" id="reader" aria-label="Framework reader" aria-hidden="true"></aside>
</div>
<div class="toast" id="toast"></div>
<script id="frameworks-data" type="application/json">${data}</script>
<script id="tags-data" type="application/json">${tagsJson}</script>
<script>
var DATA = JSON.parse(document.getElementById('frameworks-data').textContent);
var ALL_TAGS = JSON.parse(document.getElementById('tags-data').textContent);
var layout = document.getElementById('layout');
var reader = document.getElementById('reader');
var groupsEl = document.getElementById('groups');
var tagrow = document.getElementById('tagrow');
var search = document.getElementById('search');
var superFilter = document.getElementById('superFilter');
var dtFilter = document.getElementById('dtFilter');
var groupBy = document.getElementById('groupBy');
var countEl = document.getElementById('count');
var toastEl = document.getElementById('toast');
var state = { view: 'detailed', groupBy: 'category', q: '', area: '', dt: '', tags: {}, openId: null };

function esc(s){var d=document.createElement('div');d.textContent=s==null?'':s;return d.innerHTML;}
function matches(f, q){
  if(!q) return true;
  var hay=(f.name+' '+f.summary+' '+f.category+' '+(f.tags||[]).join(' ')+' '+f.when_to_use).toLowerCase();
  return q.toLowerCase().split(/\\s+/).filter(Boolean).every(function(t){return hay.indexOf(t)>=0;});
}
function selectedTags(){return Object.keys(state.tags).filter(function(t){return state.tags[t];});}
function passes(f){
  if(state.area && f.super_category!==state.area) return false;
  if(state.dt && f.decision_type!==state.dt) return false;
  var st=selectedTags();
  if(st.length){ var any=st.some(function(t){return (f.tags||[]).indexOf(t)>=0;}); if(!any) return false; }
  return matches(f, state.q);
}
function groupKeysFor(f){
  if(state.view==='compact') return [f.category||'Uncategorized'];
  if(state.groupBy==='tags') return (f.tags&&f.tags.length)?f.tags.slice():['(untagged)'];
  return [f.category||'Uncategorized'];
}
function sortGroupNames(names){
  var trailing={'Uncategorized':1,'(untagged)':1};
  return names.sort(function(a,b){
    var ta=trailing[a]?1:0, tb=trailing[b]?1:0;
    if(ta!==tb) return ta-tb;
    return a.toLowerCase()<b.toLowerCase()?-1:a.toLowerCase()>b.toLowerCase()?1:0;
  });
}
function buildGroups(list){
  var map={};
  list.forEach(function(f){ groupKeysFor(f).forEach(function(k){ (map[k]=map[k]||[]).push(f); }); });
  return map;
}
function thumbHtml(f){ return f.thumb?('<div class="thumb">'+f.thumb+'</div>'):''; }
function cardHtml(f){
  return '<div class="card'+(f.id===state.openId?' open':'')+'" data-id="'+esc(f.id)+'">'
    +thumbHtml(f)
    +'<div class="cat">'+esc(f.category)+'</div><h4 class="name">'+esc(f.name)+'</h4>'
    +'<div class="sum">'+esc(f.summary)+'</div>'
    +'<div class="tags">'+(f.tags||[]).map(function(t){return '<span class="tag">'+esc(t)+'</span>';}).join('')+'</div>'
    +'<span class="dt">'+esc(f.decision_type)+'</span></div>';
}
function render(){
  state.q=search.value.trim();
  var list=DATA.filter(passes);
  countEl.textContent=list.length+' of '+DATA.length;
  groupBy.disabled=(state.view==='compact');
  if(!list.length){ groupsEl.innerHTML='<div class="empty">No frameworks match. Try fewer words or clear the filters.</div>'; return; }
  var map=buildGroups(list);
  var names=sortGroupNames(Object.keys(map));
  var html='';
  names.forEach(function(name){
    var items=map[name].slice().sort(function(a,b){return a.name.toLowerCase()<b.name.toLowerCase()?-1:1;});
    html+='<div class="group"><h3>'+esc(name)+'</h3>';
    if(state.view==='compact'){
      html+='<div class="compact"><div class="row">'+items.map(function(f){return '<a href="#'+encodeURIComponent(f.id)+'" data-id="'+esc(f.id)+'">'+esc(f.name)+'</a>';}).join(', ')+'</div></div>';
    } else if(state.view==='list'){
      html+='<ul class="listview">'+items.map(function(f){return '<li><a href="#'+encodeURIComponent(f.id)+'" data-id="'+esc(f.id)+'">'+esc(f.name)+'</a> <span class="ls">— '+esc(f.summary)+'</span></li>';}).join('')+'</ul>';
    } else {
      html+='<div class="cards">'+items.map(cardHtml).join('')+'</div>';
    }
    html+='</div>';
  });
  groupsEl.innerHTML=html;
}
function readerHtml(f){
  var refs=(f.references||[]).map(function(r){return '<a href="'+esc(r.url)+'" target="_blank" rel="noopener">'+esc(r.type||'Link')+'</a>';}).join('');
  return '<button class="close" type="button" data-act="close">close ✕</button>'
    +'<h2>'+esc(f.name)+'</h2><div class="meta">'+esc(f.category)+(f.author?' · '+esc(f.author):'')+' · <span class="dt">'+esc(f.decision_type)+'</span></div>'
    +'<div class="actions"><button type="button" data-act="copy">Copy markdown</button><button type="button" data-act="share">Share</button></div>'
    +(f.commentary?'<div class="take"><b>PM&#39;s take:</b> '+esc(f.commentary)+'</div>':'')
    +'<div class="when">'+(f.when_to_use?'<div><h4>When to use</h4>'+esc(f.when_to_use)+'</div>':'')+(f.when_not_to_use?'<div><h4>When not to use</h4>'+esc(f.when_not_to_use)+'</div>':'')+'</div>'
    +'<div class="body">'+f.body_html+'</div>'
    +(refs?'<div class="refs"><h4>References</h4>'+refs+'</div>':'');
}
function openReader(id){
  var f=DATA.filter(function(x){return x.id===id;})[0]; if(!f) return;
  state.openId=id;
  reader.innerHTML=readerHtml(f);
  reader.setAttribute('aria-hidden','false');
  layout.classList.add('reader-open');
  reader.scrollTop=0;
  render();
}
function closeReader(){ state.openId=null; layout.classList.remove('reader-open'); reader.setAttribute('aria-hidden','true'); reader.innerHTML=''; render(); }
function toMarkdown(f){
  var md='# '+f.name+'\\n\\n';
  if(f.summary) md+=f.summary+'\\n\\n';
  if(f.when_to_use) md+='**When to use:** '+f.when_to_use+'\\n\\n';
  if(f.when_not_to_use) md+='**When not to use:** '+f.when_not_to_use+'\\n\\n';
  if(f.body_md) md+=f.body_md+'\\n\\n';
  if(f.references&&f.references.length){ md+='**References:**\\n'; f.references.forEach(function(r){ md+='- ['+(r.type||'Link')+']('+r.url+')\\n'; }); }
  return md.replace(/\\s+$/,'')+'\\n';
}
function toShare(f){
  var s=f.name+(f.summary?' — '+f.summary:'');
  if(f.when_to_use) s+='\\nWhen to use: '+f.when_to_use;
  var ref=(f.references||[]).filter(function(r){return r.url;})[0];
  if(ref) s+='\\n'+ref.url;
  return s;
}
function toast(msg){ toastEl.textContent=msg; toastEl.classList.add('show'); setTimeout(function(){toastEl.classList.remove('show');},1400); }
function fallbackCopy(t){
  var ta=document.createElement('textarea'); ta.value=t; ta.style.position='fixed'; ta.style.top='0'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.focus(); ta.select();
  try{ document.execCommand('copy'); toast('Copied ✓'); }catch(e){ toast('Copy failed — select & copy manually'); }
  document.body.removeChild(ta);
}
function copyText(t){
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(t).then(function(){toast('Copied ✓');},function(){fallbackCopy(t);});
  } else { fallbackCopy(t); }
}
function renderTags(){
  var st=state.tags;
  var html=ALL_TAGS.map(function(t){return '<span class="chip'+(st[t]?' active':'')+'" data-tag="'+esc(t)+'">'+esc(t)+'</span>';}).join('');
  if(selectedTags().length) html+='<span class="chip clear" data-clear="1">✕ clear tags</span>';
  tagrow.innerHTML=html;
}
// events
search.addEventListener('input', render);
superFilter.addEventListener('change', function(){ state.area=superFilter.value; render(); });
dtFilter.addEventListener('change', function(){ state.dt=dtFilter.value; render(); });
groupBy.addEventListener('change', function(){ state.groupBy=groupBy.value; render(); });
document.querySelector('.viewswitch').addEventListener('click', function(e){
  var b=e.target.closest('button[data-view]'); if(!b) return;
  state.view=b.getAttribute('data-view');
  Array.prototype.forEach.call(this.querySelectorAll('button'), function(x){x.classList.toggle('active', x===b);});
  render();
});
tagrow.addEventListener('click', function(e){
  var clear=e.target.closest('[data-clear]'); if(clear){ state.tags={}; renderTags(); render(); return; }
  var chip=e.target.closest('[data-tag]'); if(!chip) return;
  var t=chip.getAttribute('data-tag'); state.tags[t]=!state.tags[t]; renderTags(); render();
});
groupsEl.addEventListener('click', function(e){
  var el=e.target.closest('[data-id]'); if(!el) return;
  e.preventDefault(); openReader(el.getAttribute('data-id'));
});
reader.addEventListener('click', function(e){
  var b=e.target.closest('button[data-act]'); if(!b) return;
  var act=b.getAttribute('data-act');
  var f=DATA.filter(function(x){return x.id===state.openId;})[0];
  if(act==='close') closeReader();
  else if(act==='copy'&&f) copyText(toMarkdown(f));
  else if(act==='share'&&f) copyText(toShare(f));
});
window.addEventListener('hashchange', function(){ var id=decodeURIComponent(location.hash.slice(1)); if(DATA.some(function(f){return f.id===id;})) openReader(id); });
renderTags();
render();
// deep-link: #id opens the reader on load
if(location.hash){ var id0=decodeURIComponent(location.hash.slice(1)); if(DATA.some(function(f){return f.id===id0;})) openReader(id0); }
</script>
</body>
</html>
`;
}

// ---- selftest -------------------------------------------------------------
function assert(cond, msg) { if (!cond) throw new Error(msg); }

function runSelftest() {
  const recs = [
    { id: 'product/rice', name: 'RICE', category: 'Product', super_category: 'Product', decision_type: 'prioritize', summary: 'Score features.', problem_tags: ['prioritization'], when_to_use: 'Ranking features.', when_not_to_use: 'Few items.', commentary: 'Workhorse score.', references: [{ type: 'Article', url: 'https://x.com/a' }], body_md: '- RICE = Reach × Impact × Confidence ÷ Effort.\n\t- **Reach**: how many.' },
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
  assert(html.includes('https://x.com/a'), 'reference link present');

  // --- views + group-by + masthead ---
  assert(html.includes('data-view="compact"') && html.includes('data-view="detailed"') && html.includes('data-view="list"'), 'three view-switch controls present');
  assert(html.includes('id="groupBy"') && html.includes('>Product Areas<') && html.includes('>Tags<'), 'group-by control with Product Areas + Tags');
  assert(html.includes('class="wordmark">PMOS<') && html.includes('Frameworks Library'), 'PMOS masthead + wordmark present');

  // --- decision-type demoted into a secondary "More filters" disclosure ---
  assert(html.includes('class="morefilters"') && html.includes('More filters'), 'More filters disclosure present');
  assert(html.indexOf('<details class="morefilters"') < html.indexOf('id="dtFilter"') && html.indexOf('id="dtFilter"') < html.indexOf('</details>'), 'decision-type filter lives inside the disclosure');

  // --- tag chip row ---
  assert(html.includes('id="tagrow"') && html.includes('renderTags'), 'tag chip row present');

  // --- sidebar reader: layout-shift, not a fixed overlay, no backdrop ---
  assert(html.includes('<aside class="reader"'), 'reader is an aside in normal flow');
  assert(html.includes('.layout.reader-open'), 'reader opens by layout-shift (width), not overlay');
  assert(!/\.reader\{[^}]*position:fixed/.test(html), 'reader is not position:fixed');
  assert(!/class="backdrop"/.test(html), 'no modal backdrop');
  assert(html.includes("closeReader") && html.includes("state.openId=null"), 'close clears the selection');

  // --- share + copy-markdown, clipboard with fallback, offline ---
  assert(html.includes('>Copy markdown<') && html.includes('>Share<'), 'copy-markdown + share buttons present');
  assert(html.includes('execCommand') && html.includes('fallbackCopy'), 'clipboard textarea fallback present');

  // multi-diagram path: a record with N diagrams inlines all N SVGs in order.
  const multi = buildHtml(recs, () => [
    '<svg id="d-primary" viewBox="0 0 10 10"></svg>',
    '<svg id="d-extra2" viewBox="0 0 10 10"></svg>',
    '<svg id="d-extra3" viewBox="0 0 10 10"></svg>',
  ]);
  assert(multi.includes('d-primary') && multi.includes('d-extra2') && multi.includes('d-extra3'), 'all diagrams[] entries inlined');
  assert(multi.indexOf('d-primary') < multi.indexOf('d-extra2'), 'primary precedes extras');

  // --- inline-anchor placement: anchored diagram appears AFTER its block; null → leading ---
  const aTxt = 'SECONDBLOCKANCHOR target sentence that is well over forty characters long for sure.';
  const anchorRec = [{ id: 'x/y', name: 'Y', category: 'C', super_category: 'C', decision_type: 'design', summary: 's', problem_tags: [], references: [], body_md: '- First intro block of the framework overview here.\n- ' + aTxt, diagram_anchors: [null, aTxt] }];
  const ah = buildHtml(anchorRec, () => ['<svg id="lead-null"></svg>', '<svg id="after-anchor"></svg>']);
  assert(ah.indexOf('diagrams-lead') >= 0 && ah.indexOf('lead-null') > ah.indexOf('diagrams-lead'), 'null-anchor diagram goes to the leading group');
  assert(ah.indexOf('lead-null') < ah.indexOf('after-anchor'), 'leading group precedes the anchored diagram');
  assert(ah.indexOf('after-anchor') > ah.lastIndexOf(aTxt.slice(0, 40)), 'anchored diagram placed after its anchor block');

  // --- regression: a missing/falsy SVG must not shift a later diagram onto the wrong anchor ---
  // 3 diagrams, anchors [null, null, aTxt]; the MIDDLE file is missing (''). The third diagram must
  // still pair with anchors[2]=aTxt (placed after its block). Under the old filter-before-zip bug the
  // survivor would re-index to anchors[1]=null and land in the leading group, before the aTxt block.
  // (diagrams[0] is present so it — not the survivor — becomes the card thumbnail, keeping the
  // index-based assertion below honest.)
  const gapRec = [{ ...anchorRec[0], diagram_anchors: [null, null, aTxt] }];
  const gapH = buildHtml(gapRec, () => ['<svg id="thumb0"></svg>', '', '<svg id="survivor-after"></svg>']);
  assert(gapH.indexOf('survivor-after') >= 0, 'surviving diagram still rendered when an earlier one is missing');
  assert(gapH.indexOf('survivor-after') > gapH.lastIndexOf(aTxt.slice(0, 40)), 'survivor pairs with its OWN anchor (after the block), not the missing diagram\'s null anchor');

  console.log('build-library --selftest: PASS (views, group-by, sidebar, tags, share, masthead, inline-anchor diagrams, missing-svg alignment, self-contained)');
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
    return list.map(readSvg);   // keep '' for missing files — index must stay aligned with diagram_anchors; buildHtml drops the gaps after zipping
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
