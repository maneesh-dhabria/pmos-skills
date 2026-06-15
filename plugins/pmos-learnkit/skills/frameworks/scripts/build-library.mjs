#!/usr/bin/env node
// build-library.mjs — frameworks.json + owned SVG diagrams → a single self-contained
// index.html. Three listing views (compact / detailed / list) defaulting to LIST, each
// view-toggle carrying an inline-SVG glyph; group-by (Product Areas / Tags); a
// layout-shifting sidebar reader that highlights the open item and preserves page scroll;
// area + multi-select decision-type & tag dropdown filters (tags dropdown has a
// type-to-filter search) with an always-visible applied-filters bar (removable facet chips
// + Clear all); product-area display labels via a presentation-only SUPER_CATEGORY_LABELS
// map (corpus / --json / match.mjs untouched); diagrams placed INLINE at their anchor
// inside the body; copy-markdown / share; and a PMOS masthead. Offline from file://.
// Zero-dep Node ESM. (See reference/matching.md / reference/corpus-schema.md / SKILL.md.)
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

// D5 — presentation-only product-area display labels. Applied wherever a super_category is
// SHOWN (the area-filter <option> labels and the applied-bar area chip). The filter VALUE
// stored in state and compared in passes() stays the raw super_category, so matching,
// grouping, --json, and match.mjs are unchanged. Unmapped values fall back to the raw
// string (forward-safe if the corpus grows a new super_category).
export const SUPER_CATEGORY_LABELS = {
  'Analytics, Design & Finance': 'Cross Functional Skills',
  'People, Personal & Career': 'PM Skills & Mindset',
  'Product': 'Product Management',
  'Strategy & Business': 'Business & Strategy',
};
const superLabel = (s) => SUPER_CATEGORY_LABELS[s] || s;

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
  // D4d — per-option counts from the corpus, shown in each dropdown option label.
  const dtCounts = {}; enriched.forEach((e) => { dtCounts[e.decision_type] = (dtCounts[e.decision_type] || 0) + 1; });
  const tagCounts = {}; enriched.forEach((e) => (e.tags || []).forEach((t) => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
  const labelsJson = JSON.stringify(SUPER_CATEGORY_LABELS).replace(/<\/script>/gi, '<\\/script>');

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
.searchwrap{flex:1;min-width:200px;position:relative;display:flex}
.searchwrap input{flex:1;width:100%}
.search-clear{position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:0;color:var(--muted);font-size:15px;cursor:pointer;padding:2px 4px;line-height:1}
.search-clear:hover{color:var(--ink)}
.controls label{color:var(--muted);font-size:13px;display:flex;gap:6px;align-items:center}
.viewswitch{display:inline-flex;border:1px solid var(--line);border-radius:8px;overflow:hidden}
.viewswitch button{background:var(--card);color:var(--muted);border:0;padding:8px 12px;font-size:13px;cursor:pointer}
.viewswitch button.active{background:var(--accent);color:#0f1320;font-weight:600}
.viewswitch button svg{width:13px;height:13px;vertical-align:-2px;margin-right:5px;fill:currentColor}
.count{color:var(--muted);font-size:13px;margin-left:auto}
/* multi-select dropdown filters (D4) */
.filterbar{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;position:relative}
.dropdown{position:relative}
.dd-trigger{background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:8px 12px;font-size:13px;cursor:pointer}
.dropdown.open .dd-trigger{border-color:var(--accent)}
.dropdown .panel{position:absolute;top:calc(100% + 4px);left:0;z-index:10;background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:8px;min-width:230px;max-height:340px;overflow:auto;box-shadow:0 8px 24px rgba(0,0,0,.45)}
.dropdown .panel .opt{display:flex;align-items:center;gap:8px;padding:4px 6px;font-size:13px;color:var(--ink);cursor:pointer;border-radius:6px}
.dropdown .panel .opt:hover{background:var(--card)}
.dropdown .panel .opt .cnt{color:var(--muted);font-size:12px;margin-left:auto}
.tag-search{width:100%;margin-bottom:6px;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:6px 8px;font-size:13px}
/* applied-filters bar (D4b) */
.applied{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;align-items:center}
.applied:empty{display:none}
.applied-chip{background:#243;color:#9fe0b8;border:1px solid #33523f;border-radius:999px;padding:3px 10px;font-size:12px;cursor:pointer}
.applied-chip:hover{border-color:var(--accent)}
.applied .clear-all{background:none;color:var(--muted);border:1px dashed var(--line);border-radius:999px;padding:3px 10px;font-size:12px;cursor:pointer}
.applied .clear-all:hover{color:var(--ink);border-color:var(--accent)}
#groups{padding:18px 20px}
.group{margin-bottom:26px}
.group>h3{margin:0 0 12px;font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);border-bottom:1px solid var(--line);padding-bottom:6px}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;cursor:pointer;transition:border-color .15s}
.card:hover,.card.open{border-color:var(--accent)}
.card .thumb{background:#fff;border-radius:8px;padding:6px;margin:-2px 0 10px;max-height:130px;overflow:hidden;display:flex;justify-content:center}
.card .thumb[data-thumb]:empty{min-height:60px;background:var(--card);border:1px dashed var(--line)}
.card .thumb svg{max-width:100%;max-height:118px;height:auto}
.card h4.name{margin:0 0 4px;font-size:16px}
.card .cat{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.04em}
.card .sum{margin:8px 0 10px;color:var(--ink)}
.tags{display:flex;flex-wrap:wrap;gap:6px}
.tag{background:#243;color:#9fe0b8;border:1px solid #33523f;border-radius:999px;padding:2px 8px;font-size:11px}
.dt{display:inline-block;background:#2a3252;color:var(--accent);border-radius:999px;padding:2px 8px;font-size:11px;margin-top:8px}
.compact .row{margin:4px 0;line-height:1.7}
.compact .row a{margin-right:2px}
.compact .row a.selected{color:#0f1320;background:var(--accent);border-radius:4px;padding:1px 5px;font-weight:600}
ul.listview{margin:0;padding-left:18px}
ul.listview li{margin:6px 0}
ul.listview li.selected{background:#1a2236;border-radius:6px;padding:2px 8px;margin-left:-8px;border-left:3px solid var(--accent)}
ul.listview li.selected>a{color:var(--accent);font-weight:600}
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
<div class="masthead"><span class="wordmark">PMOS</span><div class="mast-text"><h1>Frameworks Library</h1><div class="subtitle"><span id="subtitleCount">${enriched.length}</span> PM thinking tools — describe a problem or browse</div></div></div>
<div class="controls">
<span class="searchwrap"><input id="search" type="search" placeholder="Describe a problem or search a framework…" aria-label="Search frameworks"><button id="searchClear" type="button" class="search-clear" aria-label="Clear search" hidden>✕</button></span>
<div class="viewswitch" role="tablist" aria-label="View">
<button type="button" data-view="compact" aria-label="Compact list view"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1" y="2.5" width="14" height="2" rx="1"/><rect x="1" y="7" width="14" height="2" rx="1"/><rect x="1" y="11.5" width="14" height="2" rx="1"/></svg>Compact</button>
<button type="button" data-view="detailed" aria-label="Detailed cards view"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="1.5" width="6" height="6" rx="1"/><rect x="8.5" y="1.5" width="6" height="6" rx="1"/><rect x="1.5" y="8.5" width="6" height="6" rx="1"/><rect x="8.5" y="8.5" width="6" height="6" rx="1"/></svg>Detailed</button>
<button type="button" data-view="list" class="active" aria-label="List view"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="2.5" cy="3.5" r="1.3"/><rect x="5.5" y="2.7" width="9.5" height="1.7" rx="0.8"/><circle cx="2.5" cy="8" r="1.3"/><rect x="5.5" y="7.2" width="9.5" height="1.7" rx="0.8"/><circle cx="2.5" cy="12.5" r="1.3"/><rect x="5.5" y="11.7" width="9.5" height="1.7" rx="0.8"/></svg>List</button>
</div>
<label>Group by <select id="groupBy" aria-label="Group by"><option value="category">Product Areas</option><option value="tags">Tags</option></select></label>
<select id="superFilter" aria-label="Filter by area"><option value="">All areas</option>${superCats.map((s) => `<option value="${esc(s)}">${esc(superLabel(s))}</option>`).join('')}</select>
<span class="count" id="count" aria-live="polite"></span>
</div>
<div class="filterbar" id="filterbar">
<div class="dropdown" id="dd-dt">
<button type="button" class="dd-trigger" data-dd="dt" aria-expanded="false" aria-controls="dd-dt-panel">Decision type <span class="caret" aria-hidden="true">▾</span></button>
<div class="panel" id="dd-dt-panel" role="group" aria-label="Filter by decision type" hidden>${decisionTypes.map((d) => `<label class="opt"><input type="checkbox" data-dt="${esc(d)}"> ${esc(d)} <span class="cnt">(${dtCounts[d] || 0})</span></label>`).join('')}</div>
</div>
<div class="dropdown" id="dd-tags">
<button type="button" class="dd-trigger" data-dd="tags" aria-expanded="false" aria-controls="dd-tags-panel">Tags <span class="caret" aria-hidden="true">▾</span></button>
<div class="panel" id="dd-tags-panel" role="group" aria-label="Filter by tag" hidden>
<input type="search" class="tag-search" id="tagSearch" placeholder="Filter tags…" aria-label="Type to filter the tag list">
<div class="checklist" id="tagChecklist">${allTags.map((t) => `<label class="opt" data-tagopt="${esc(t)}"><input type="checkbox" data-tag="${esc(t)}"> ${esc(t)} <span class="cnt">(${tagCounts[t] || 0})</span></label>`).join('')}</div>
</div>
</div>
</div>
<div class="applied" id="applied"></div>
</header>
<div id="groups"></div>
</main>
<aside class="reader" id="reader" aria-label="Framework reader" aria-hidden="true"></aside>
</div>
<div class="toast" id="toast"></div>
<script id="frameworks-data" type="application/json">${data}</script>
<script id="tags-data" type="application/json">${tagsJson}</script>
<script id="labels-data" type="application/json">${labelsJson}</script>
<script>
var DATA = JSON.parse(document.getElementById('frameworks-data').textContent);
var ALL_TAGS = JSON.parse(document.getElementById('tags-data').textContent);
var SUPER_LABELS = JSON.parse(document.getElementById('labels-data').textContent);
function superLabel(s){return SUPER_LABELS[s]||s;}
var layout = document.getElementById('layout');
var reader = document.getElementById('reader');
var groupsEl = document.getElementById('groups');
var filterbar = document.getElementById('filterbar');
var appliedEl = document.getElementById('applied');
var tagSearch = document.getElementById('tagSearch');
var tagChecklist = document.getElementById('tagChecklist');
var search = document.getElementById('search');
var searchClear = document.getElementById('searchClear');
var superFilter = document.getElementById('superFilter');
var groupBy = document.getElementById('groupBy');
var countEl = document.getElementById('count');
var subtitleCount = document.getElementById('subtitleCount');
var toastEl = document.getElementById('toast');
var byId = {}; DATA.forEach(function(f){ byId[f.id]=f; });
var lastOpener = null;        // F3 — the [data-id] element that opened the reader (focus returns here)
var thumbObserver = null;     // F2 — IntersectionObserver for lazy detailed-view thumbnails
// state.dt and state.tags are SETS (object maps id→true) — OR within a facet, AND across facets.
var state = { view: 'list', groupBy: 'category', q: '', area: '', dt: {}, tags: {}, openId: null };

function esc(s){var d=document.createElement('div');d.textContent=s==null?'':s;return d.innerHTML;}
function matches(f, q){
  if(!q) return true;
  var hay=(f.name+' '+f.summary+' '+f.category+' '+(f.tags||[]).join(' ')+' '+f.when_to_use).toLowerCase();
  return q.toLowerCase().split(/\\s+/).filter(Boolean).every(function(t){return hay.indexOf(t)>=0;});
}
function selectedKeys(obj){return Object.keys(obj).filter(function(k){return obj[k];});}
function selectedTags(){return selectedKeys(state.tags);}
function passes(f){
  if(state.area && f.super_category!==state.area) return false;
  var sd=selectedKeys(state.dt);
  if(sd.length){ var anyDt=sd.some(function(d){return f.decision_type===d;}); if(!anyDt) return false; } // OR-within dt
  var st=selectedTags();
  if(st.length){ var any=st.some(function(t){return (f.tags||[]).indexOf(t)>=0;}); if(!any) return false; } // OR-within tags
  return matches(f, state.q); // AND across facets
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
// F2 — emit a placeholder; the SVG is injected lazily by mountThumbs() (IntersectionObserver).
function thumbHtml(f){ return f.thumb?('<div class="thumb" data-thumb="'+esc(f.id)+'"></div>'):''; }
// F2 — lazy-mount detailed-view thumbnails as cards approach the viewport. Re-established on
// every render(). Falls back to eager injection where IntersectionObserver is absent (old file://).
function injectThumb(el){ var f=byId[el.getAttribute('data-thumb')]; if(f&&f.thumb&&!el.firstChild){ el.innerHTML=f.thumb; } }
function mountThumbs(){
  var placeholders=groupsEl.querySelectorAll('[data-thumb]');
  if(!('IntersectionObserver' in window)){ Array.prototype.forEach.call(placeholders, injectThumb); return; }
  if(thumbObserver) thumbObserver.disconnect();
  thumbObserver=new IntersectionObserver(function(entries){
    entries.forEach(function(en){ if(en.isIntersecting){ injectThumb(en.target); thumbObserver.unobserve(en.target); } });
  }, { rootMargin: '200px 0px' });
  Array.prototype.forEach.call(placeholders, function(el){ thumbObserver.observe(el); });
}
// F1 — toggle selection on the EXISTING [data-id] nodes without rebuilding #groups (no perceived reload).
function updateSelection(){
  Array.prototype.forEach.call(groupsEl.querySelectorAll('[data-id]'), function(el){
    var on=el.getAttribute('data-id')===state.openId;
    if(el.classList.contains('card')){ el.classList.toggle('open', on); }
    else { el.classList.toggle('selected', on); }
  });
}
function cardHtml(f){
  return '<div class="card'+(f.id===state.openId?' open':'')+'" data-id="'+esc(f.id)+'">'
    +thumbHtml(f)
    +'<div class="cat">'+esc(f.category)+'</div><h4 class="name">'+esc(f.name)+'</h4>'
    +'<div class="sum">'+esc(f.summary)+'</div>'
    +'<div class="tags">'+(f.tags||[]).map(function(t){return '<span class="tag">'+esc(t)+'</span>';}).join('')+'</div>'
    +'<span class="dt">'+esc(f.decision_type)+'</span></div>';
}
function render(){
  var sy=window.scrollY; // F1 — preserve page scroll across the #groups rebuild (no snap-to-top on narrowing)
  state.q=search.value.trim();
  if(searchClear) searchClear.hidden=!state.q;
  var list=DATA.filter(passes);
  countEl.textContent=list.length+' of '+DATA.length;
  groupBy.disabled=(state.view==='compact');
  if(!list.length){ groupsEl.innerHTML='<div class="empty">No frameworks match. Try fewer words or clear the filters.</div>'; window.scrollTo(0, sy); return; }
  var map=buildGroups(list);
  var names=sortGroupNames(Object.keys(map));
  var html='';
  names.forEach(function(name){
    var items=map[name].slice().sort(function(a,b){return a.name.toLowerCase()<b.name.toLowerCase()?-1:1;});
    html+='<div class="group"><h3>'+esc(name)+'</h3>';
    if(state.view==='compact'){
      html+='<div class="compact"><div class="row">'+items.map(function(f){return '<a href="#'+encodeURIComponent(f.id)+'" data-id="'+esc(f.id)+'"'+(f.id===state.openId?' class="selected"':'')+'>'+esc(f.name)+'</a>';}).join(', ')+'</div></div>';
    } else if(state.view==='list'){
      html+='<ul class="listview">'+items.map(function(f){return '<li'+(f.id===state.openId?' class="selected"':'')+'><a href="#'+encodeURIComponent(f.id)+'" data-id="'+esc(f.id)+'">'+esc(f.name)+'</a> <span class="ls">— '+esc(f.summary)+'</span></li>';}).join('')+'</ul>';
    } else {
      html+='<div class="cards">'+items.map(cardHtml).join('')+'</div>';
    }
    html+='</div>';
  });
  groupsEl.innerHTML=html;
  if(state.view==='detailed') mountThumbs(); // F2 — wire lazy thumbnails after the rebuild
  window.scrollTo(0, sy); // F1 — restore page scroll
}
function readerHtml(f){
  var refs=(f.references||[]).map(function(r){return '<a href="'+esc(r.url)+'" target="_blank" rel="noopener">'+esc(r.type||'Link')+'</a>';}).join('');
  return '<button class="close" type="button" data-act="close">close ✕</button>'
    +'<h2>'+esc(f.name)+'</h2><div class="meta">'+esc(f.category)+(f.author?' · '+esc(f.author):'')+' · <span class="dt">'+esc(f.decision_type)+'</span></div>'
    +'<div class="actions"><button type="button" data-act="copy">Copy markdown</button><button type="button" data-act="copylink">Copy link</button><button type="button" data-act="share">Share</button></div>'
    +(f.commentary?'<div class="take"><b>PM&#39;s take:</b> '+esc(f.commentary)+'</div>':'')
    +'<div class="when">'+(f.when_to_use?'<div><h4>When to use</h4>'+esc(f.when_to_use)+'</div>':'')+(f.when_not_to_use?'<div><h4>When not to use</h4>'+esc(f.when_not_to_use)+'</div>':'')+'</div>'
    +'<div class="body">'+f.body_html+'</div>'
    +(refs?'<div class="refs"><h4>References</h4>'+refs+'</div>':'');
}
function openReader(id){
  var f=byId[id]; if(!f) return;
  // F3 — remember the [data-id] node that opened the reader so focus can return on close.
  var opener=null;
  Array.prototype.forEach.call(groupsEl.querySelectorAll('[data-id]'), function(el){ if(el.getAttribute('data-id')===id) opener=el; });
  if(opener) lastOpener=opener;
  state.openId=id;
  reader.innerHTML=readerHtml(f);
  reader.setAttribute('aria-hidden','false');
  layout.classList.add('reader-open');
  reader.scrollTop=0; // panel-local scroll reset (not the page)
  updateSelection(); // F1 — targeted highlight only; NO render() rebuild (kills the perceived reload)
  // F4 — reflect the open framework in the URL; the hashchange guard prevents a re-open loop.
  if(decodeURIComponent(location.hash.slice(1))!==id){ location.hash=encodeURIComponent(id); }
  // F3 — move focus into the reader (the close button).
  var cb=reader.querySelector('button.close'); if(cb) cb.focus();
  // F7 — on narrow viewports the reader renders below the list; bring it into view.
  if(window.matchMedia&&window.matchMedia('(max-width:720px)').matches){ reader.scrollIntoView({behavior:'smooth',block:'start'}); }
}
function closeReader(){
  state.openId=null; layout.classList.remove('reader-open'); reader.setAttribute('aria-hidden','true'); reader.innerHTML='';
  updateSelection(); // F1 — targeted, not a full render()
  // F4 — drop the hash without triggering a re-open.
  if(location.hash){ history.replaceState(null,'',location.pathname+location.search); }
  // F3 — return focus to the item that opened the reader.
  if(lastOpener&&lastOpener.focus){ lastOpener.focus(); lastOpener=null; }
}
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
// applied-filters bar (D4b) — one removable chip per active filter, facet-labeled, + Clear all.
function appliedChip(facet,value,attr){
  return '<button type="button" class="applied-chip" '+attr+' aria-label="Remove filter: '+esc(value)+'">'+esc(facet)+': '+esc(value)+' ✕</button>';
}
function renderApplied(){
  var html='';
  var q=(search.value||'').trim();
  if(q) html+=appliedChip('Search', q, 'data-rm-q="1"'); // F5 — removable query chip
  if(state.area) html+=appliedChip('Area', superLabel(state.area), 'data-rm-area="1"');
  selectedKeys(state.dt).forEach(function(d){ html+=appliedChip('Decision', d, 'data-rm-dt="'+esc(d)+'"'); });
  selectedKeys(state.tags).forEach(function(t){ html+=appliedChip('Tag', t, 'data-rm-tag="'+esc(t)+'"'); });
  if(html) html+='<button type="button" class="clear-all" data-clear-all="1">Clear all</button>';
  appliedEl.innerHTML=html;
}
// keep dropdown checkboxes in sync with state (chips ↔ checkboxes).
function syncChecks(){
  Array.prototype.forEach.call(document.querySelectorAll('input[data-dt]'), function(c){ c.checked=!!state.dt[c.getAttribute('data-dt')]; });
  Array.prototype.forEach.call(document.querySelectorAll('input[data-tag]'), function(c){ c.checked=!!state.tags[c.getAttribute('data-tag')]; });
}
function closeDropdowns(except){
  Array.prototype.forEach.call(document.querySelectorAll('.dropdown'), function(dd){
    if(dd===except) return;
    dd.classList.remove('open');
    var t=dd.querySelector('.dd-trigger'); if(t) t.setAttribute('aria-expanded','false');
    var p=dd.querySelector('.panel'); if(p) p.hidden=true;
  });
}
// events
// F1 — debounce the search handler (~120 ms) so each keystroke no longer triggers a full render().
var searchDebounce=null;
search.addEventListener('input', function(){ clearTimeout(searchDebounce); searchDebounce=setTimeout(function(){ render(); renderApplied(); }, 120); });
// F5 — explicit clear (✕) control empties the query and re-renders.
searchClear.addEventListener('click', function(){ search.value=''; search.focus(); render(); renderApplied(); });
superFilter.addEventListener('change', function(){ state.area=superFilter.value; renderApplied(); render(); });
groupBy.addEventListener('change', function(){ state.groupBy=groupBy.value; render(); });
document.querySelector('.viewswitch').addEventListener('click', function(e){
  var b=e.target.closest('button[data-view]'); if(!b) return;
  state.view=b.getAttribute('data-view');
  Array.prototype.forEach.call(this.querySelectorAll('button'), function(x){x.classList.toggle('active', x===b);});
  render();
});
// dropdown triggers — toggle open; one panel open at a time; stays open across picks.
filterbar.addEventListener('click', function(e){
  var t=e.target.closest('.dd-trigger'); if(!t) return;
  var dd=t.closest('.dropdown'); var wasOpen=dd.classList.contains('open');
  closeDropdowns();
  if(!wasOpen){ dd.classList.add('open'); t.setAttribute('aria-expanded','true'); dd.querySelector('.panel').hidden=false; }
});
// checkbox change inside either panel — update the facet set (panel stays open).
filterbar.addEventListener('change', function(e){
  var c=e.target.closest('input[type=checkbox]'); if(!c) return;
  if(c.hasAttribute('data-dt')){ var d=c.getAttribute('data-dt'); if(c.checked) state.dt[d]=true; else delete state.dt[d]; }
  else if(c.hasAttribute('data-tag')){ var t=c.getAttribute('data-tag'); if(c.checked) state.tags[t]=true; else delete state.tags[t]; }
  renderApplied(); render();
});
// type-to-filter the tag checkbox list (D4-control).
tagSearch.addEventListener('input', function(){
  var q=tagSearch.value.trim().toLowerCase();
  Array.prototype.forEach.call(tagChecklist.querySelectorAll('[data-tagopt]'), function(l){
    l.style.display=(!q || l.getAttribute('data-tagopt').toLowerCase().indexOf(q)>=0)?'':'none';
  });
});
// applied-bar chip removal + Clear all (chips ↔ checkboxes synced).
appliedEl.addEventListener('click', function(e){
  var b=e.target.closest('button'); if(!b) return;
  if(b.hasAttribute('data-clear-all')){ state.area=''; state.dt={}; state.tags={}; superFilter.value=''; state.q=''; search.value=''; }
  else if(b.hasAttribute('data-rm-q')){ state.q=''; search.value=''; }
  else if(b.hasAttribute('data-rm-area')){ state.area=''; superFilter.value=''; }
  else if(b.hasAttribute('data-rm-dt')){ delete state.dt[b.getAttribute('data-rm-dt')]; }
  else if(b.hasAttribute('data-rm-tag')){ delete state.tags[b.getAttribute('data-rm-tag')]; }
  syncChecks(); renderApplied(); render();
});
// Escape: close an open dropdown panel first (returning focus to its trigger); if none is
// open, Escape closes the reader (F3) — dropdown-close keeps priority.
document.addEventListener('keydown', function(e){
  if(e.key!=='Escape') return;
  var open=document.querySelector('.dropdown.open');
  if(open){ var t=open.querySelector('.dd-trigger'); closeDropdowns(); if(t) t.focus(); return; }
  if(layout.classList.contains('reader-open')) closeReader(); // F3 — Escape closes the reader
});
// click outside any dropdown closes the panels.
document.addEventListener('click', function(e){ if(!e.target.closest('.dropdown')) closeDropdowns(); });
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
  else if(act==='copylink'&&f) copyText(location.origin+location.pathname+'#'+encodeURIComponent(f.id)); // F4
  else if(act==='share'&&f) copyText(toShare(f));
});
// F4 — react to back/forward + manual hash edits; guard against re-opening the already-open id.
window.addEventListener('hashchange', function(){
  var id=decodeURIComponent(location.hash.slice(1));
  if(id===state.openId) return;
  if(byId[id]) openReader(id); else if(!id) closeReader();
});
if(subtitleCount) subtitleCount.textContent=DATA.length; // F6 — dynamic count, never hardcoded
renderApplied();
render();
// deep-link: #id opens the reader on load
if(location.hash){ var id0=decodeURIComponent(location.hash.slice(1)); if(byId[id0]) openReader(id0); }
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
  // D5 — area option shows the renamed display label while keeping the RAW super_category as the value.
  assert(html.includes('<option value="Product">Product Management</option>'), 'area option uses SUPER_CATEGORY_LABELS display label with raw value');
  assert(html.includes('value="Product"') && !html.includes('<option value="Product Management"'), 'option VALUE stays the raw super_category (rename is presentation-only)');
  assert(/PM&#39;s take|PM's take/.test(html), "PM's take block present");
  assert(html.includes('<strong>Reach</strong>'), 'markdown bold rendered');
  assert(html.includes('<li>'), 'markdown list rendered');
  assert(html.includes('https://x.com/a'), 'reference link present');

  // --- views + group-by + masthead ---
  assert(html.includes('data-view="compact"') && html.includes('data-view="detailed"') && html.includes('data-view="list"'), 'three view-switch controls present');
  assert(html.includes('id="groupBy"') && html.includes('>Product Areas<') && html.includes('>Tags<'), 'group-by control with Product Areas + Tags');
  assert(html.includes('class="wordmark">PMOS<') && html.includes('Frameworks Library'), 'PMOS masthead + wordmark present');

  // --- D2: list view is the default (list button active; detailed NOT active) ---
  assert(/data-view="list"[^>]*class="active"/.test(html), 'list button carries class="active" (list is default)');
  assert(!/data-view="detailed"[^>]*class="active"/.test(html), 'detailed button is NOT active');
  assert(html.includes("view: 'list'"), "state.view defaults to 'list'");

  // --- D3: each view-toggle button carries an inline-SVG glyph (offline-safe, decorative) ---
  assert(/<button[^>]*data-view="compact"[^>]*>\s*<svg/.test(html), 'compact toggle has an inline <svg> icon');
  assert(/<button[^>]*data-view="detailed"[^>]*>\s*<svg/.test(html), 'detailed toggle has an inline <svg> icon');
  assert(/<button[^>]*data-view="list"[^>]*>\s*<svg/.test(html), 'list toggle has an inline <svg> icon');

  // --- D4: decision-type + tags as multi-select dropdowns (NO tag-cloud, NO More-filters disclosure) ---
  assert(/data-dd="dt"[^>]*aria-expanded/.test(html) || /aria-expanded[^>]*data-dd="dt"/.test(html), 'decision-type dropdown trigger present (aria-expanded)');
  assert(/data-dd="tags"[^>]*aria-expanded/.test(html) || /aria-expanded[^>]*data-dd="tags"/.test(html), 'tags dropdown trigger present (aria-expanded)');
  assert(html.includes('<input type="checkbox" data-dt="prioritize">'), 'native checkbox per decision type');
  assert(html.includes('<input type="checkbox" data-tag="prioritization">'), 'native checkbox per tag');
  assert(html.includes('id="tagSearch"') && html.includes('class="tag-search"'), 'tag type-to-filter search input present');
  assert(!html.includes('id="tagrow"') && !html.includes('renderTags'), 'old tag-chip cloud removed');
  assert(!html.includes('class="morefilters"') && !html.includes('id="dtFilter"'), 'old More-filters disclosure + single-select dtFilter removed');
  assert(html.includes('selectedKeys(state.dt)'), 'decision-type is a set; passes() uses OR-within membership');

  // --- D4d: per-option counts in the dropdown labels (should) ---
  assert(/class="cnt">\(1\)/.test(html), 'per-option count rendered in dropdown labels');

  // --- D4b: applied-filters bar — facet-labeled removable chips + Clear all ---
  assert(html.includes('id="applied"') && html.includes('renderApplied'), 'applied-filters bar present');
  assert(html.includes('class="applied-chip"') && html.includes('Remove filter:'), 'applied chips are real buttons with accessible names');
  assert(html.includes('data-rm-area') && html.includes('data-rm-dt') && html.includes('data-rm-tag'), 'per-facet chip removal wired');
  assert(html.includes('data-clear-all') && html.includes('>Clear all<'), 'Clear all control present');
  assert(html.includes('syncChecks'), 'chips ↔ checkboxes kept in sync');
  // D4c: count is in an aria-live region; Escape closes + restores focus.
  assert(/id="count"[^>]*aria-live="polite"|aria-live="polite"[^>]*id="count"/.test(html), 'result count is an aria-live region');
  assert(html.includes("'Escape'") && html.includes('closeDropdowns'), 'Escape closes the dropdown panel');

  // --- D1: selection highlight in all 3 views + no page auto-scroll on open ---
  assert(html.includes("f.id===state.openId?' class=\"selected\"'"), 'list/compact items carry the selected class when open');

  // --- F1 (browse-ux): perceived-reload killed — targeted updateSelection, debounced search, scroll-preserving render ---
  // Slice each function's body precisely (start → next top-level `function `) so the assertions
  // don't depend on a brittle char window.
  const sliceFn = (name) => { const a = html.indexOf('function ' + name); if (a < 0) return ''; const b = html.indexOf('\nfunction ', a + 1); return html.slice(a, b < 0 ? a + 600 : b); };
  const openFn = sliceFn('openReader(id)');
  const closeFn = sliceFn('closeReader()');
  const renderFn = sliceFn('render()');
  assert(html.includes('function updateSelection'), 'F1: updateSelection() defined (targeted selection toggle, no full rebuild)');
  assert(openFn.includes('updateSelection()'), 'F1: openReader calls updateSelection() instead of render()');
  assert(closeFn.includes('updateSelection()'), 'F1: closeReader calls updateSelection() instead of render()');
  assert(!/\brender\(\);/.test(openFn), 'F1: openReader no longer calls render() (no wholesale #groups rebuild on open)');
  assert(!/\brender\(\);/.test(closeFn), 'F1: closeReader no longer calls render() either');
  assert(renderFn.includes('var sy=window.scrollY') && renderFn.includes('window.scrollTo(0, sy)'), 'F1: render() captures+restores window.scrollY around the groupsEl rebuild');
  assert(!html.includes("search.addEventListener('input', render)"), 'F1: search input is NOT bound straight to render (must be debounced)');
  assert(html.includes('searchDebounce') && html.includes('clearTimeout') && html.includes('setTimeout'), 'F1: debounce wrapper around the search handler');

  // --- F6: masthead subtitle count comes from DATA.length, not a hardcoded number ---
  assert(html.includes('id="subtitleCount"'), 'F6: subtitle count lives in an id="subtitleCount" element');
  assert(html.includes('subtitleCount.textContent=DATA.length') || /subtitleCount[^;]*DATA\.length/.test(html), 'F6: subtitle count set from DATA.length at runtime');
  assert(!/>272 PM thinking/.test(html), 'F6: no hardcoded 272 in the subtitle');

  // --- F2: detailed-view thumbnails lazy-mount via IntersectionObserver (not all inlined at first paint) ---
  assert(html.includes('IntersectionObserver'), 'F2: IntersectionObserver used for lazy thumbnails');
  assert(html.includes('data-thumb'), 'F2: detailed cards emit a data-thumb placeholder (SVG not inlined at render)');
  assert(/function thumbHtml\(f\)\{[\s\S]{0,160}data-thumb/.test(html) && !/thumbHtml\(f\)\{[^}]*\+f\.thumb\+/.test(html), 'F2: thumbHtml emits a data-thumb placeholder, not the inline thumb SVG');
  assert(html.includes('function mountThumbs'), 'F2: mountThumbs() wires the observer after render');

  // --- F3: reader keyboard + focus management ---
  assert(/Escape[\s\S]{0,400}closeReader\(\)/.test(html) || /reader-open[\s\S]{0,200}closeReader\(\)/.test(html), 'F3: Escape closes the reader when open and no dropdown is open');
  assert(html.includes('lastOpener'), 'F3: closeReader returns focus to the triggering item (lastOpener tracked)');

  // --- F4: deep link — hash on open, guarded hashchange, Copy link action ---
  assert(openFn.includes('location.hash'), 'F4: openReader sets location.hash');
  assert(/hashchange[\s\S]{0,200}state\.openId/.test(html), 'F4: hashchange handler guards against re-opening the current id');
  assert(html.includes('>Copy link<') && html.includes('data-act="copylink"'), 'F4: Copy link action present');

  // --- F5: search clear control + Clear-all resets query + query chip ---
  assert(html.includes('id="searchClear"'), 'F5: explicit search clear (✕) control present');
  assert(/data-clear-all[\s\S]*?state\.q='|data-clear-all[\s\S]{0,400}search\.value=''/.test(html) || /clear-all[\s\S]{0,400}search\.value=''/.test(html), 'F5: Clear all resets the text query');
  assert(html.includes('data-rm-q') && html.includes("appliedChip('Search'"), 'F5: a removable query chip is shown for a non-empty search');

  // --- F7: mobile reader scrolls into view at <=720px ---
  assert(html.includes('scrollIntoView'), 'F7: reader.scrollIntoView() on open');
  assert(/max-width:720px|innerWidth\s*<=\s*720|innerWidth\s*<\s*721/.test(html), 'F7: gated to <=720px viewports');

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

  console.log('build-library --selftest: PASS (list-default + view icons, area rename, dropdown multi-select filters + applied bar, selection highlight + scroll-preserve, group-by, sidebar, share, masthead, inline-anchor diagrams, missing-svg alignment, self-contained)');
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
