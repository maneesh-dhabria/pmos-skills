// lib.mjs — the library-viewer substrate engine. A reusable, zero-dependency, skill-agnostic
// core for faceted, searchable, multi-view "library" pages with a sidebar reader. Consumer
// skills supply a corpus adapter + a viewer config and call
// emitHtml() to get one self-contained HTML file. See guidelines.md for the design contract.
//
// Node-ESM on the BUILD side only. The EMITTED page ships plain vanilla JS (no modules), zero
// deps, no external asset refs, and works offline from file://.
//
// Skill-agnostic invariant (D12): this module never names or branches on a specific skill.

import { readFileSync } from 'node:fs';

// Read + return the canonical Editorial-Technical stylesheet that lives in the sibling
// _shared/html-authoring/ substrate. It carries the :root --pmos-* tokens (light default), the
// prefers-color-scheme dark overrides, the @font-face declarations, and base element styling —
// the single source of truth every pmos HTML artifact shares (D1/D5, INV-2). emitHtml inlines it
// as the base layer of the emitted <style> ahead of this module's component CSS, so all three
// browse pages inherit the theme with zero external requests (INV-1). Fail loud on a
// missing/unreadable file, naming the resolved path — never silently fall back (D6, INV-1).
// Internal (not exported): the public API surface stays emitHtml + the named exports (AC6).
function readBaseCss() {
  const cssUrl = new URL('../html-authoring/assets/style.css', import.meta.url);
  try {
    return readFileSync(cssUrl, 'utf8');
  } catch (err) {
    throw new Error(
      `library-viewer: cannot read canonical stylesheet at ${cssUrl.pathname} `
      + `(expected the _shared/html-authoring/assets/style.css substrate as a sibling of library-viewer/). `
      + `Underlying error: ${err.message}`,
    );
  }
}

// ---- pure helpers ---------------------------------------------------------

export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function inlineMd(s) {
  let t = esc(s);
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return t;
}

// minimal markdown → HTML (tab-nested lists, blockquotes, paragraphs, bold, links).
export function renderMarkdown(md) {
  if (!md) return '';
  const lines = String(md).split('\n');
  const out = [];
  let listDepth = -1;
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
    closeListsTo(-1); closeQuote();
    out.push(`<p>${inlineMd(raw.trim())}</p>`);
  }
  closeListsTo(-1); closeQuote();
  return out.join('\n');
}

// split body_md into ordered blocks (list / quote / para) keeping raw source for anchor matching.
export function parseBlocks(md) {
  const lines = String(md || '').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i].trim() === '') { i++; continue; }
    if (/^\t*-\s+/.test(lines[i])) {
      const rl = [];
      while (i < lines.length && /^\t*-\s+/.test(lines[i])) { rl.push(lines[i]); i++; }
      blocks.push({ type: 'list', raw: rl.join('\n') });
      continue;
    }
    if (/^\s*>\s?/.test(lines[i])) {
      const rl = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) { rl.push(lines[i]); i++; }
      blocks.push({ type: 'quote', raw: rl.join('\n') });
      continue;
    }
    blocks.push({ type: 'para', raw: lines[i] });
    i++;
  }
  return blocks;
}

// Block-aware body renderer: place each insert (an HTML fragment, e.g. a diagram) immediately
// after the FIRST block whose raw source contains its (≥40-char verbatim) anchor; inserts with a
// null/unmatched anchor go to a leading group. `inserts` may be [{html|svg, anchor}] or [string].
// A missing (falsy) earlier insert must NOT re-index a later survivor onto the wrong anchor.
export function renderBody(md, inserts) {
  const list = (inserts || [])
    .map((d) => (typeof d === 'string' ? { html: d, anchor: null } : { html: d && (d.html != null ? d.html : d.svg), anchor: d && d.anchor }))
    .filter((d) => d && d.html);
  const blocks = parseBlocks(md);
  const afterBlock = blocks.map(() => []);
  const leading = [];
  for (const d of list) {
    let placed = false;
    if (d.anchor) {
      const idx = blocks.findIndex((b) => b.raw.includes(d.anchor));
      if (idx >= 0) { afterBlock[idx].push(d.html); placed = true; }
    }
    if (!placed) leading.push(d.html);
  }
  const wrap = (h) => `<div class="diagram">${h}</div>`;
  const out = [];
  if (leading.length) out.push(`<div class="diagrams-lead">${leading.map(wrap).join('')}</div>`);
  blocks.forEach((b, i) => {
    out.push(renderMarkdown(b.raw));
    for (const h of afterBlock[i]) out.push(wrap(h));
  });
  return out.join('\n');
}

// extractFacets(cards, fieldSpecs) → { facets: { key: { values: [{value, count}] } } }.
// fieldSpecs: [{ key, field, array? }]. Values are alpha-sorted by raw value; counts from corpus.
export function extractFacets(cards, fieldSpecs) {
  const facets = {};
  for (const spec of fieldSpecs || []) {
    const counts = new Map();
    for (const c of cards) {
      let vals = c[spec.field];
      if (spec.array) vals = Array.isArray(vals) ? vals : [];
      else vals = (vals === undefined || vals === null || vals === '') ? [] : [vals];
      for (const v of vals) counts.set(v, (counts.get(v) || 0) + 1);
    }
    const values = [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => {
        const la = String(a.value).toLowerCase(), lb = String(b.value).toLowerCase();
        return la < lb ? -1 : la > lb ? 1 : 0;
      });
    facets[spec.key] = { values };
  }
  return { facets };
}

// buildIndex(records, adapter) → normalized cards. adapter(record, i) → card. Identity if absent.
export function buildIndex(records, adapter) {
  if (typeof adapter !== 'function') return (records || []).map((r) => r);
  return (records || []).map((r, i) => adapter(r, i));
}

// filterEngine(cards, state) — the pure filter the emitted client mirrors. OR within a facet,
// AND across facets, AND multi-token search. state = { q, searchFields, facets:[{field, array,
// selected:{val:true}}] }. searchFields entries may be 'name' or { field, array }.
export function filterEngine(cards, state) {
  state = state || {};
  const q = String(state.q || '').trim().toLowerCase();
  const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
  const searchFields = state.searchFields || [];
  const facets = state.facets || [];
  return (cards || []).filter((c) => {
    for (const fc of facets) {
      const selObj = fc.selected || {};
      const sel = Object.keys(selObj).filter((k) => selObj[k]);
      if (!sel.length) continue;
      if (fc.array) {
        const arr = Array.isArray(c[fc.field]) ? c[fc.field] : [];
        if (!sel.some((v) => arr.indexOf(v) >= 0)) return false;
      } else if (!sel.some((v) => c[fc.field] === v)) return false;
    }
    if (tokens.length) {
      const hay = searchFields.map((sf) => {
        if (sf && typeof sf === 'object') { const v = c[sf.field]; return sf.array ? (Array.isArray(v) ? v.join(' ') : '') : (v || ''); }
        return c[sf] || '';
      }).join(' ').toLowerCase();
      if (!tokens.every((t) => hay.indexOf(t) >= 0)) return false;
    }
    return true;
  });
}

// sortGroups(names, { trailing }) — alpha (case-insensitive); trailing buckets pinned last.
export function sortGroups(names, opts) {
  const trailing = {};
  const t = opts && opts.trailing;
  if (Array.isArray(t)) t.forEach((n) => { trailing[n] = 1; });
  else if (t && typeof t === 'object') Object.keys(t).forEach((n) => { trailing[n] = 1; });
  return (names || []).slice().sort((a, b) => {
    const ta = trailing[a] ? 1 : 0, tb = trailing[b] ? 1 : 0;
    if (ta !== tb) return ta - tb;
    const la = a.toLowerCase(), lb = b.toLowerCase();
    return la < lb ? -1 : la > lb ? 1 : 0;
  });
}

// ---- the emitted page -----------------------------------------------------

// Component CSS layer. The canonical style.css (read + inlined ahead of this by emitHtml, see
// readBaseCss) supplies the :root --pmos-* tokens, the prefers-color-scheme dark overrides, the
// @font-face, and base element styling. This block styles ONLY the library-viewer's own
// components (browse layout, cards, facets, chips, reader) and references --pmos-* tokens
// exclusively — never a hardcoded color and never a private --bg/--panel/--card/--accent/--line
// token (INV-2). Light default + dark are inherited for free from the tokens (INV-3): no
// component here hardcodes a dark-only value or adds its own prefers-color-scheme rule. Text on
// an accent fill uses --pmos-surface (the theme-inverse of text — white on burnt-orange in
// light, near-black on light-orange in dark), so it reads in both schemes. Three-voice type:
// sans for controls/headings, serif for reader prose, mono for structural/metadata chrome.
const BASE_CSS = `body{margin:0;font-family:var(--pmos-font-sans);font-size:var(--pmos-fs-md);line-height:1.55;background:var(--pmos-bg);color:var(--pmos-text)}
a{color:var(--pmos-accent)}
.layout{display:flex;align-items:flex-start}
.listing{flex:1;min-width:0}
header{position:sticky;top:0;background:var(--pmos-surface-2);border-bottom:1px solid var(--pmos-border);padding:14px 20px;z-index:5}
.masthead{display:flex;align-items:center;gap:14px;margin-bottom:12px}
.wordmark{font-family:var(--pmos-font-mono);font-weight:700;letter-spacing:.06em;font-size:var(--pmos-fs-base);color:var(--pmos-surface);background:var(--pmos-accent);padding:6px 10px;border-radius:var(--pmos-radius)}
.mast-text h1{margin:0;font-family:var(--pmos-font-sans);font-size:19px}
.subtitle{color:var(--pmos-muted);font-size:var(--pmos-fs-sm);margin-top:2px}
.controls{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.controls input,.controls select{font-family:var(--pmos-font-sans);background:var(--pmos-surface);color:var(--pmos-text);border:1px solid var(--pmos-border);border-radius:var(--pmos-radius);padding:8px 10px;font-size:var(--pmos-fs-base)}
.controls input{flex:1;min-width:200px}
.searchwrap{flex:1;min-width:200px;position:relative;display:flex}
.searchwrap input{flex:1;width:100%}
.search-clear{position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:0;color:var(--pmos-muted);font-size:15px;cursor:pointer;padding:2px 4px;line-height:1}
.search-clear:hover{color:var(--pmos-text)}
.controls label{color:var(--pmos-muted);font-size:var(--pmos-fs-sm);display:flex;gap:6px;align-items:center}
.viewswitch{display:inline-flex;border:1px solid var(--pmos-border);border-radius:var(--pmos-radius);overflow:hidden}
.viewswitch button{font-family:var(--pmos-font-sans);background:var(--pmos-surface);color:var(--pmos-muted);border:0;padding:8px 12px;font-size:var(--pmos-fs-sm);cursor:pointer}
.viewswitch button.active{background:var(--pmos-accent);color:var(--pmos-surface);font-weight:600}
.viewswitch button svg{width:13px;height:13px;vertical-align:-2px;margin-right:5px;fill:currentColor}
.count{color:var(--pmos-muted);font-family:var(--pmos-font-mono);font-size:var(--pmos-fs-sm);margin-left:auto}
.filterbar{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;position:relative}
.dropdown{position:relative}
.dd-trigger{font-family:var(--pmos-font-sans);background:var(--pmos-surface);color:var(--pmos-text);border:1px solid var(--pmos-border);border-radius:var(--pmos-radius);padding:8px 12px;font-size:var(--pmos-fs-sm);cursor:pointer}
.dropdown.open .dd-trigger{border-color:var(--pmos-accent)}
.dropdown .panel{position:absolute;top:calc(100% + 4px);left:0;z-index:10;background:var(--pmos-surface);border:1px solid var(--pmos-border);border-radius:var(--pmos-radius);padding:8px;min-width:230px;max-height:340px;overflow:auto;box-shadow:var(--pmos-shadow-lg)}
.dropdown .panel .opt{display:flex;align-items:center;gap:8px;padding:4px 6px;font-size:var(--pmos-fs-sm);color:var(--pmos-text);cursor:pointer;border-radius:var(--pmos-radius)}
.dropdown .panel .opt:hover{background:var(--pmos-surface-2)}
.dropdown .panel .opt .cnt{color:var(--pmos-muted);font-family:var(--pmos-font-mono);font-size:var(--pmos-fs-xs);margin-left:auto}
.tag-search{width:100%;margin-bottom:6px;background:var(--pmos-surface);color:var(--pmos-text);border:1px solid var(--pmos-border);border-radius:var(--pmos-radius);padding:6px 8px;font-size:var(--pmos-fs-sm)}
.applied{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;align-items:center}
.applied:empty{display:none}
.applied-chip{background:var(--pmos-accent-bg);color:var(--pmos-accent-strong);border:1px solid var(--pmos-border);border-radius:999px;padding:3px 10px;font-size:var(--pmos-fs-xs);cursor:pointer}
.applied-chip:hover{border-color:var(--pmos-accent)}
.applied .clear-all{background:none;color:var(--pmos-muted);border:1px dashed var(--pmos-border);border-radius:999px;padding:3px 10px;font-size:var(--pmos-fs-xs);cursor:pointer}
.applied .clear-all:hover{color:var(--pmos-text);border-color:var(--pmos-accent)}
#groups{padding:18px 20px}
.group{margin-bottom:26px}
.group>h3{margin:0 0 12px;font-family:var(--pmos-font-mono);font-size:var(--pmos-fs-sm);text-transform:uppercase;letter-spacing:.05em;color:var(--pmos-muted);border-bottom:1px solid var(--pmos-rule);padding-bottom:6px}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.card{background:var(--pmos-surface);border:1px solid var(--pmos-border);border-radius:var(--pmos-radius-lg);padding:14px 16px;cursor:pointer;transition:border-color .15s}
.card:hover,.card.open{border-color:var(--pmos-accent)}
.card .thumb{background:var(--pmos-surface);border-radius:var(--pmos-radius);padding:6px;margin:-2px 0 10px;max-height:130px;overflow:hidden;display:flex;justify-content:center}
.card .thumb[data-thumb]:empty{min-height:60px;background:var(--pmos-surface-2);border:1px dashed var(--pmos-border)}
.card .thumb svg{max-width:100%;max-height:118px;height:auto}
.card h4.name{margin:0 0 4px;font-family:var(--pmos-font-sans);font-size:16px}
.card .cat{color:var(--pmos-muted);font-family:var(--pmos-font-mono);font-size:var(--pmos-fs-sm);text-transform:uppercase;letter-spacing:.04em}
.card .sum{margin:8px 0 10px;color:var(--pmos-text)}
.tags{display:flex;flex-wrap:wrap;gap:6px}
.tag{background:var(--pmos-accent-bg);color:var(--pmos-accent-strong);border:1px solid var(--pmos-border);border-radius:999px;padding:2px 8px;font-size:var(--pmos-fs-xs)}
.dt{display:inline-block;background:var(--pmos-surface-2);color:var(--pmos-accent);border-radius:999px;padding:2px 8px;font-size:var(--pmos-fs-xs);margin-top:8px}
.compact .row{margin:4px 0;line-height:1.7}
.compact .row a{margin-right:2px}
.compact .row a.selected{color:var(--pmos-surface);background:var(--pmos-accent);border-radius:4px;padding:1px 5px;font-weight:600}
ul.listview{margin:0;padding-left:18px}
ul.listview li{margin:6px 0}
ul.listview li.selected{background:var(--pmos-accent-bg);border-radius:var(--pmos-radius);padding:2px 8px;margin-left:-8px;border-left:3px solid var(--pmos-accent)}
ul.listview li.selected>a{color:var(--pmos-accent);font-weight:600}
ul.listview .ls{color:var(--pmos-muted)}
.empty{color:var(--pmos-muted);text-align:center;padding:40px}
.reader{width:0;overflow:hidden;background:var(--pmos-surface-2);border-left:1px solid var(--pmos-border);transition:width .18s ease;align-self:stretch;position:sticky;top:0;max-height:100vh;overflow-y:auto}
.layout.reader-open .reader{width:min(440px,42%);padding:18px 20px}
.reader h2{margin:0 2px 2px 0;font-family:var(--pmos-font-sans)}
.reader .meta{color:var(--pmos-muted);font-family:var(--pmos-font-mono);font-size:var(--pmos-fs-sm);margin-bottom:12px}
.reader .actions{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 14px}
.reader .actions button{font-family:var(--pmos-font-sans);background:var(--pmos-surface);color:var(--pmos-text);border:1px solid var(--pmos-border);border-radius:var(--pmos-radius);padding:6px 10px;font-size:var(--pmos-fs-sm);cursor:pointer}
.reader .actions button:hover{border-color:var(--pmos-accent)}
.reader button.close{float:right;color:var(--pmos-muted)}
.reader .body{font-family:var(--pmos-font-serif)}
.take{background:var(--pmos-accent-bg);border-left:3px solid var(--pmos-accent);padding:10px 14px;border-radius:var(--pmos-radius);margin:12px 0;color:var(--pmos-text)}
.take b{color:var(--pmos-accent-strong)}
.when{display:flex;gap:18px;flex-wrap:wrap;margin:10px 0}
.when div{flex:1;min-width:160px}
.when h4{margin:0 0 4px;font-family:var(--pmos-font-mono);font-size:var(--pmos-fs-sm);text-transform:uppercase;color:var(--pmos-muted)}
.body ul{margin:6px 0;padding-left:20px}
.body blockquote{border-left:3px solid var(--pmos-rule);margin:8px 0;padding:2px 12px;color:var(--pmos-muted)}
.diagram{margin:10px 0}
.diagram svg{max-width:100%;height:auto;background:var(--pmos-surface);border-radius:var(--pmos-radius);padding:8px}
.diagrams-lead{margin-bottom:8px}
.refs a{margin-right:12px}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--pmos-accent);color:var(--pmos-surface);font-weight:600;padding:8px 16px;border-radius:var(--pmos-radius);opacity:0;transition:opacity .2s;pointer-events:none;z-index:20}
.toast.show{opacity:1}
@media(max-width:720px){.layout{flex-direction:column}.layout.reader-open .reader{width:100%;border-left:0;border-top:1px solid var(--pmos-border);position:static;max-height:none}}`;

// Additive reader-mode seam (default-off): styles for config.reader.mode === 'iframe'. Injected
// into <style> ONLY in iframe mode, so a consumer that does not opt in emits byte-identical CSS.
const IFRAME_READER_CSS = `
.reader-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:0 0 12px}
.reader-head h2{margin:0}
.reader .open-tab{font-size:var(--pmos-fs-sm);white-space:nowrap}
.reader-frame{width:100%;height:calc(100vh - 96px);border:1px solid var(--pmos-border);border-radius:var(--pmos-radius);background:var(--pmos-surface)}
.reader-empty{color:var(--pmos-muted);text-align:center;padding:36px 8px}`;

// default inline-SVG glyphs for the view switch (decorative, offline-safe).
const DEFAULT_VIEW_ICONS = {
  compact: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1" y="2.5" width="14" height="2" rx="1"/><rect x="1" y="7" width="14" height="2" rx="1"/><rect x="1" y="11.5" width="14" height="2" rx="1"/></svg>',
  detailed: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="1.5" width="6" height="6" rx="1"/><rect x="8.5" y="1.5" width="6" height="6" rx="1"/><rect x="1.5" y="8.5" width="6" height="6" rx="1"/><rect x="8.5" y="8.5" width="6" height="6" rx="1"/></svg>',
  list: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="2.5" cy="3.5" r="1.3"/><rect x="5.5" y="2.7" width="9.5" height="1.7" rx="0.8"/><circle cx="2.5" cy="8" r="1.3"/><rect x="5.5" y="7.2" width="9.5" height="1.7" rx="0.8"/><circle cx="2.5" cy="12.5" r="1.3"/><rect x="5.5" y="11.7" width="9.5" height="1.7" rx="0.8"/></svg>',
};
const DEFAULT_VIEW_LABELS = { compact: 'Compact', detailed: 'Detailed', list: 'List' };
const DEFAULT_VIEW_ARIA = { compact: 'Compact list view', detailed: 'Detailed cards view', list: 'List view' };

const jsonScript = (id, obj) => `<script id="${id}" type="application/json">${JSON.stringify(obj).replace(/<\/script>/gi, '<\\/script>')}</script>`;
const jsStr = (s) => JSON.stringify(s == null ? '' : s);

// emitHtml(opts) → a single self-contained HTML string. See guidelines.md / lib.test.mjs for the
// config shape. Skill-specific behaviour rides the adapter (cards), facet specs, bodyRenderer,
// extraHead, extraScript seams — never a skill name inside this module.
export function emitHtml(opts) {
  const o = opts || {};
  const cards = o.cards || [];
  const facets = o.facets || [];
  const cfg = o.config || {};
  const masthead = o.masthead || {};
  const reader = cfg.reader || {};

  const idField = cfg.idField || 'id';
  const nameField = cfg.nameField || 'name';
  const summaryField = cfg.summaryField || 'summary';
  const categoryField = cfg.categoryField || 'category';
  const thumbField = cfg.thumbField || 'thumb';
  const bodyHtmlField = cfg.bodyHtmlField || 'body_html';
  const searchFields = cfg.searchFields || [nameField, summaryField];

  // optional build-time bodyRenderer fills each card's reader body (e.g. inline diagrams).
  const enriched = (typeof o.bodyRenderer === 'function')
    ? cards.map((c) => ({ ...c, [bodyHtmlField]: o.bodyRenderer(c) }))
    : cards;

  const single = facets.filter((f) => (f.kind || 'single-select') === 'single-select');
  const multi = facets.filter((f) => f.kind === 'multi-dropdown');

  // ---- head + masthead ----
  const skillMeta = cfg.skillMeta ? `<meta name="pmos:skill" content="${esc(cfg.skillMeta)}">\n` : '';
  const subtitleHtml = String(masthead.subtitleTemplate || '{count}')
    .replace('{count}', `<span id="subtitleCount">${enriched.length}</span>`);

  // ---- controls ----
  const views = cfg.views || [
    { id: 'compact' }, { id: 'detailed' }, { id: 'list', default: true },
  ];
  const defaultView = (views.find((v) => v.default) || views[views.length - 1]).id;
  const viewButtons = views.map((v) => {
    const icon = v.icon || DEFAULT_VIEW_ICONS[v.id] || '';
    const label = v.label || DEFAULT_VIEW_LABELS[v.id] || v.id;
    const aria = v.aria || DEFAULT_VIEW_ARIA[v.id] || label;
    const active = v.id === defaultView ? ' class="active"' : '';
    return `<button type="button" data-view="${esc(v.id)}"${active} aria-label="${esc(aria)}">${icon}${esc(label)}</button>`;
  }).join('\n');

  const groupBy = cfg.groupBy || [];
  const groupByControl = groupBy.length
    ? `<label>Group by <select id="groupBy" aria-label="Group by">${groupBy.map((g) => `<option value="${esc(g.value)}">${esc(g.label)}</option>`).join('')}</select></label>`
    : '';

  const singleControls = single.map((f) => {
    const valueLabel = (v) => (f.valueLabels && f.valueLabels[v] != null ? f.valueLabels[v] : v);
    const opts2 = (f.values || []).map((v) => `<option value="${esc(v.value)}">${esc(valueLabel(v.value))}</option>`).join('');
    return `<select id="${esc(f.controlId || f.key)}" aria-label="${esc(f.ariaLabel || ('Filter by ' + (f.label || f.key)))}"><option value="">${esc(f.allLabel || 'All')}</option>${opts2}</select>`;
  }).join('\n');

  const multiDropdowns = multi.map((f) => {
    const itemAttr = f.itemAttr || f.key;
    const optsHtml = (f.values || []).map((v) => {
      const dataOpt = f.search ? ` data-${esc(itemAttr)}opt="${esc(v.value)}"` : '';
      return `<label class="opt"${dataOpt}><input type="checkbox" data-${esc(itemAttr)}="${esc(v.value)}"> ${esc(v.value)} <span class="cnt">(${v.count || 0})</span></label>`;
    }).join('');
    const searchBox = f.search
      ? `<input type="search" class="tag-search" id="${esc(f.searchInputId || (f.key + 'Search'))}" placeholder="${esc(f.searchPlaceholder || 'Filter…')}" aria-label="${esc(f.searchAria || 'Type to filter the list')}">`
      : '';
    const checklistOpen = f.search ? `<div class="checklist" id="${esc(f.checklistId || (f.key + 'Checklist'))}">` : '';
    const checklistClose = f.search ? '</div>' : '';
    return `<div class="dropdown" id="dd-${esc(f.key)}">
<button type="button" class="dd-trigger" data-dd="${esc(f.key)}" aria-expanded="false" aria-controls="dd-${esc(f.key)}-panel">${esc(f.triggerLabel || f.key)} <span class="caret" aria-hidden="true">▾</span></button>
<div class="panel" id="dd-${esc(f.key)}-panel" role="group" aria-label="${esc(f.panelAria || ('Filter by ' + (f.label || f.key)))}" hidden>${searchBox}${checklistOpen}${optsHtml}${checklistClose}</div>
</div>`;
  }).join('\n');
  const filterbar = multiDropdowns ? `<div class="filterbar" id="filterbar">\n${multiDropdowns}\n</div>` : '<div class="filterbar" id="filterbar"></div>';

  // ---- client config (baked as JSON; the client runtime reads it) ----
  const clientCfg = {
    fields: { id: idField, name: nameField, summary: summaryField, category: categoryField, thumb: thumbField, bodyHtml: bodyHtmlField },
    searchFields,
    defaultView,
    groupBy: groupBy.map((g) => ({ value: g.value, field: g.field, array: !!g.array, emptyLabel: g.emptyLabel || '(untagged)' })),
    defaultGroupValue: cfg.defaultGroupValue || (groupBy[0] && groupBy[0].value) || 'category',
    single: single.map((f) => ({ key: f.key, field: f.field, controlId: f.controlId || f.key, chipLabel: f.chipLabel || f.label || f.key })),
    multi: multi.map((f) => ({ key: f.key, field: f.field, itemAttr: f.itemAttr || f.key, array: !!f.array, chipLabel: f.chipLabel || f.key, search: !!f.search, searchInputId: f.searchInputId || (f.key + 'Search'), checklistId: f.checklistId || (f.key + 'Checklist') })),
    reader: {
      metaPrimaryField: reader.metaPrimaryField || categoryField,
      authorField: reader.authorField || null,
      pillField: reader.pillField || null,
      // labelHtml is caller-provided HTML (e.g. an entity-encoded apostrophe) — passed through, not re-escaped.
      take: reader.take ? { field: reader.take.field, labelHtml: reader.take.label || '' } : null,
      columns: (reader.columns || []).map((c) => ({ field: c.field, label: c.label })),
      refsField: reader.refsField || 'references',
      markdownBodyField: reader.markdownBodyField || 'body_md',
      // Additive reader-mode seam (default-off): only present when a consumer opts into the
      // iframe reader, so absent-mode config JSON stays byte-identical (back-compat).
      ...(reader.mode === 'iframe' ? { mode: 'iframe', iframeField: reader.iframeField || 'href' } : {}),
    },
    // optional skill-agnostic card-extras hook (badges, link-out titles, metarow pills).
    // Absent → cards render via the default reader-driven path (back-compat). Present →
    // titles link out (no in-page reader), with an optional badge + a declarative pill row.
    card: cfg.card ? {
      link: cfg.card.link ? { hrefField: cfg.card.link.hrefField, existsField: cfg.card.link.existsField || null } : null,
      badge: cfg.card.badge ? { field: cfg.card.badge.field } : null,
      pills: (cfg.card.pills || []).map((p) => ({
        field: p.field || null, suffix: p.suffix || '', thousands: !!p.thousands,
        skip: p.skip || [], whenFalse: p.whenFalse || null, text: p.text || '', cls: p.cls || '',
      })),
    } : null,
  };
  // value-label maps for single-select applied chips (presentation-only).
  const valueLabels = {};
  single.forEach((f) => { if (f.valueLabels) valueLabels[f.key] = f.valueLabels; });

  // iframe reader-mode CSS/runtime are appended ONLY when opted in; '' otherwise → byte-identical.
  const iframeReaderCss = reader.mode === 'iframe' ? IFRAME_READER_CSS : '';
  const iframeReaderRuntime = reader.mode === 'iframe' ? IFRAME_READER_RUNTIME : '';
  const canonicalCss = readBaseCss();
  const style = `<style>\n${canonicalCss}\n${BASE_CSS}${iframeReaderCss}${o.extraHead ? '\n' + o.extraHead : ''}\n</style>`;
  // bake the default view as a literal so `view: '<v>'` is correct before any JS runs / config reads.
  const client = CLIENT_RUNTIME.replace('__DEFAULT_VIEW__', defaultView) + iframeReaderRuntime + (o.extraScript ? '\n' + o.extraScript : '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="data:,">
${skillMeta}<title>${esc(masthead.title || 'Library')}</title>
${style}
</head>
<body>
<div class="layout" id="layout">
<main class="listing">
<header>
<div class="masthead"><span class="wordmark">${esc(masthead.wordmark || 'PMOS')}</span><div class="mast-text"><h1>${esc(masthead.title || 'Library')}</h1><div class="subtitle">${subtitleHtml}</div></div></div>
<div class="controls">
<span class="searchwrap"><input id="search" type="search" placeholder="${esc(cfg.searchPlaceholder || 'Search…')}" aria-label="${esc(cfg.searchAria || 'Search')}"><button id="searchClear" type="button" class="search-clear" aria-label="Clear search" hidden>✕</button></span>
<div class="viewswitch" role="tablist" aria-label="View">
${viewButtons}
</div>
${groupByControl}
${singleControls}
<span class="count" id="count" aria-live="polite"></span>
</div>
${filterbar}
<div class="applied" id="applied"></div>
</header>
<div id="groups"></div>
</main>
<aside class="reader" id="reader" aria-label="Reader" aria-hidden="true"></aside>
</div>
<div class="toast" id="toast"></div>
${jsonScript('lv-data', enriched)}
${jsonScript('lv-config', clientCfg)}
${jsonScript('lv-labels', valueLabels)}
<script>
${client}
</script>
</body>
</html>
`;
}

// The in-page client runtime — PLAIN vanilla JS (no modules), config-driven. Generated facet
// keys (e.g. state.dt, state.tags) come straight from the baked config so per-facet code reads
// like hand-written single-purpose code.
const CLIENT_RUNTIME = `
var DATA = JSON.parse(document.getElementById('lv-data').textContent);
var CFG = JSON.parse(document.getElementById('lv-config').textContent);
var VALUE_LABELS = JSON.parse(document.getElementById('lv-labels').textContent);
var F = CFG.fields;
function valueLabel(key, v){ var m=VALUE_LABELS[key]; return (m && m[v]!=null)?m[v]:v; }
var layout = document.getElementById('layout');
var reader = document.getElementById('reader');
var groupsEl = document.getElementById('groups');
var filterbar = document.getElementById('filterbar');
var appliedEl = document.getElementById('applied');
var search = document.getElementById('search');
var searchClear = document.getElementById('searchClear');
var groupBy = document.getElementById('groupBy');
var countEl = document.getElementById('count');
var subtitleCount = document.getElementById('subtitleCount');
var toastEl = document.getElementById('toast');
var byId = {}; DATA.forEach(function(f){ byId[f[F.id]]=f; });
var lastOpener = null;
var thumbObserver = null;
// state.<facetKey>: single-select → string; multi-dropdown → set (object map val→true).
var state = { view: '__DEFAULT_VIEW__', groupBy: CFG.defaultGroupValue, q: '', openId: null };
CFG.single.forEach(function(f){ state[f.key]=''; });
CFG.multi.forEach(function(f){ state[f.key]={}; });

function esc(s){var d=document.createElement('div');d.textContent=s==null?'':s;return d.innerHTML;}
function selectedKeys(obj){return Object.keys(obj).filter(function(k){return obj[k];});}
// ---- optional card-extras hook (CFG.card): link-out titles, badge, metarow pills ----
function cardLinkOut(){ return !!(CFG.card && CFG.card.link); }
function cardLinks(f){ var c=CFG.card&&CFG.card.link; if(!c) return true; if(!c.existsField) return true; return f[c.existsField]!==false; }
function cardHref(f){ var c=CFG.card&&CFG.card.link; return (c && f[c.hrefField]) ? f[c.hrefField] : ('#'+encodeURIComponent(f[F.id])); }
// title cell: when linking out, an <a href> that navigates (or plain text if the target is missing);
// otherwise the default in-page reader anchor (intercepted click → openReader).
function titleCell(f, cls){
  var t=esc(f[F.name]); var c=cls?(' class="'+cls+'"'):'';
  if(cardLinkOut()){ return cardLinks(f) ? '<a href="'+esc(cardHref(f))+'"'+c+'>'+t+'</a>' : '<span'+c+'>'+t+'</span>'; }
  return '<a href="#'+encodeURIComponent(f[F.id])+'" data-id="'+esc(f[F.id])+'"'+c+'>'+t+'</a>';
}
function cardBadge(f){ var b=CFG.card&&CFG.card.badge; if(!b||!b.field) return ''; var v=f[b.field]; if(v==null||v==='') return ''; return '<span class="badge '+esc(String(v).toLowerCase())+'">'+esc(v)+'</span>'; }
function cardPills(f){
  var ps=CFG.card&&CFG.card.pills; if(!ps||!ps.length) return '';
  var out=[];
  ps.forEach(function(p){
    if(p.whenFalse){ if(f[p.whenFalse]===false) out.push('<span class="pill '+esc(p.cls||'')+'">'+esc(p.text)+'</span>'); return; }
    var v=f[p.field]; if(v==null||v===''||(p.skip&&p.skip.indexOf(v)>=0)) return;
    var disp=(p.thousands&&typeof v==='number')?v.toLocaleString():v;
    out.push('<span class="pill">'+esc(disp)+esc(p.suffix||'')+'</span>');
  });
  return out.length?('<div class="metarow">'+out.join('')+'</div>'):'';
}
function matches(f, q){
  if(!q) return true;
  var parts=[];
  CFG.searchFields.forEach(function(sf){
    if(sf && typeof sf==='object'){ var v=f[sf.field]; parts.push(sf.array?((v||[]).join(' ')):(v||'')); }
    else parts.push(f[sf]||'');
  });
  var hay=parts.join(' ').toLowerCase();
  return q.toLowerCase().split(/\\s+/).filter(Boolean).every(function(t){return hay.indexOf(t)>=0;});
}
function passes(f){
  for(var i=0;i<CFG.single.length;i++){ var s=CFG.single[i]; if(state[s.key] && f[s.field]!==state[s.key]) return false; }
  for(var j=0;j<CFG.multi.length;j++){
    var m=CFG.multi[j]; var sel=selectedKeys(state[m.key]);
    if(sel.length){
      var any = m.array
        ? sel.some(function(v){return (f[m.field]||[]).indexOf(v)>=0;})
        : sel.some(function(v){return f[m.field]===v;});
      if(!any) return false; // OR within a facet
    }
  }
  return matches(f, state.q); // AND across facets + search
}
function primaryCat(f){ return f[F.category]||'Uncategorized'; }
function groupKeysFor(f){
  if(state.view==='compact') return [primaryCat(f)];
  for(var i=0;i<CFG.groupBy.length;i++){
    var g=CFG.groupBy[i];
    if(state.groupBy===g.value){
      if(g.array){ var a=f[g.field]; return (a&&a.length)?a.slice():[g.emptyLabel]; }
      return [f[g.field]||'Uncategorized'];
    }
  }
  return [primaryCat(f)];
}
function trailingMap(){ var t={'Uncategorized':1}; CFG.groupBy.forEach(function(g){ if(g.array) t[g.emptyLabel]=1; }); return t; }
function sortGroupNames(names){ var trailing=trailingMap(); return names.sort(function(a,b){ var ta=trailing[a]?1:0, tb=trailing[b]?1:0; if(ta!==tb) return ta-tb; var la=a.toLowerCase(), lb=b.toLowerCase(); return la<lb?-1:la>lb?1:0; }); }
function buildGroups(list){ var map={}; list.forEach(function(f){ groupKeysFor(f).forEach(function(k){ (map[k]=map[k]||[]).push(f); }); }); return map; }
function thumbHtml(f){ return f[F.thumb]?('<div class="thumb" data-thumb="'+esc(f[F.id])+'"></div>'):''; }
function injectThumb(el){ var f=byId[el.getAttribute('data-thumb')]; if(f&&f[F.thumb]&&!el.firstChild){ el.innerHTML=f[F.thumb]; } }
function mountThumbs(){
  var placeholders=groupsEl.querySelectorAll('[data-thumb]');
  if(!('IntersectionObserver' in window)){ Array.prototype.forEach.call(placeholders, injectThumb); return; }
  if(thumbObserver) thumbObserver.disconnect();
  thumbObserver=new IntersectionObserver(function(entries){ entries.forEach(function(en){ if(en.isIntersecting){ injectThumb(en.target); thumbObserver.unobserve(en.target); } }); }, { rootMargin: '200px 0px' });
  Array.prototype.forEach.call(placeholders, function(el){ thumbObserver.observe(el); });
}
function updateSelection(){
  Array.prototype.forEach.call(groupsEl.querySelectorAll('[data-id]'), function(el){
    var on=el.getAttribute('data-id')===state.openId;
    if(el.classList.contains('card')){ el.classList.toggle('open', on); } else { el.classList.toggle('selected', on); }
  });
}
function cardHtml(f){
  if(CFG.card){
    // card-extras layout: badge + category, link-out title, declarative metarow.
    return '<div class="card" data-id="'+esc(f[F.id])+'">'
      +'<div class="top">'+cardBadge(f)+'<span class="cat">'+esc(f[F.category])+'</span></div>'
      +'<h4 class="name">'+titleCell(f)+'</h4>'
      +cardPills(f)+'</div>';
  }
  return '<div class="card'+(f[F.id]===state.openId?' open':'')+'" data-id="'+esc(f[F.id])+'">'
    +thumbHtml(f)
    +'<div class="cat">'+esc(f[F.category])+'</div><h4 class="name">'+esc(f[F.name])+'</h4>'
    +'<div class="sum">'+esc(f[F.summary])+'</div>'
    +'<div class="tags">'+(f.tags||[]).map(function(t){return '<span class="tag">'+esc(t)+'</span>';}).join('')+'</div>'
    +(f[CFG.reader.pillField]?'<span class="dt">'+esc(f[CFG.reader.pillField])+'</span>':'')+'</div>';
}
function render(){
  var sy=window.scrollY;
  state.q=search.value.trim();
  if(searchClear) searchClear.hidden=!state.q;
  var list=DATA.filter(passes);
  countEl.textContent=list.length+' of '+DATA.length;
  if(groupBy) groupBy.disabled=(state.view==='compact');
  if(!list.length){ groupsEl.innerHTML='<div class="empty">No matches. Try fewer words or clear the filters.</div>'; window.scrollTo(0, sy); return; }
  var map=buildGroups(list);
  var names=sortGroupNames(Object.keys(map));
  var html='';
  names.forEach(function(name){
    var items=map[name].slice().sort(function(a,b){return a[F.name].toLowerCase()<b[F.name].toLowerCase()?-1:1;});
    html+='<div class="group"><h3>'+esc(name)+'</h3>';
    if(state.view==='compact'){
      html+='<div class="compact"><div class="row">'+items.map(function(f){
        if(CFG.card) return titleCell(f, f[F.id]===state.openId?'selected':'');
        return '<a href="#'+encodeURIComponent(f[F.id])+'" data-id="'+esc(f[F.id])+'"'+(f[F.id]===state.openId?' class="selected"':'')+'>'+esc(f[F.name])+'</a>';
      }).join(', ')+'</div></div>';
    } else if(state.view==='list'){
      html+='<ul class="listview">'+items.map(function(f){
        if(CFG.card) return '<li>'+cardBadge(f)+titleCell(f)+cardPills(f)+'</li>';
        return '<li'+(f[F.id]===state.openId?' class="selected"':'')+'><a href="#'+encodeURIComponent(f[F.id])+'" data-id="'+esc(f[F.id])+'">'+esc(f[F.name])+'</a> <span class="ls">— '+esc(f[F.summary])+'</span></li>';
      }).join('')+'</ul>';
    } else {
      html+='<div class="cards">'+items.map(cardHtml).join('')+'</div>';
    }
    html+='</div>';
  });
  groupsEl.innerHTML=html;
  if(state.view==='detailed') mountThumbs();
  window.scrollTo(0, sy);
}
function readerHtml(f){
  var refs=(f[CFG.reader.refsField]||[]).map(function(r){return '<a href="'+esc(r.url)+'" target="_blank" rel="noopener">'+esc(r.type||'Link')+'</a>';}).join('');
  var meta=esc(f[CFG.reader.metaPrimaryField]);
  if(CFG.reader.authorField && f[CFG.reader.authorField]) meta+=' · '+esc(f[CFG.reader.authorField]);
  if(CFG.reader.pillField && f[CFG.reader.pillField]) meta+=' · <span class="dt">'+esc(f[CFG.reader.pillField])+'</span>';
  var take='';
  if(CFG.reader.take && f[CFG.reader.take.field]) take='<div class="take"><b>'+CFG.reader.take.labelHtml+':</b> '+esc(f[CFG.reader.take.field])+'</div>';
  var cols='';
  CFG.reader.columns.forEach(function(c){ if(f[c.field]) cols+='<div><h4>'+esc(c.label)+'</h4>'+esc(f[c.field])+'</div>'; });
  var when=cols?('<div class="when">'+cols+'</div>'):'';
  return '<button class="close" type="button" data-act="close">close ✕</button>'
    +'<h2>'+esc(f[F.name])+'</h2><div class="meta">'+meta+'</div>'
    +'<div class="actions"><button type="button" data-act="copy">Copy markdown</button><button type="button" data-act="copylink">Copy link</button><button type="button" data-act="share">Share</button></div>'
    +take+when
    +'<div class="body">'+(f[F.bodyHtml]||'')+'</div>'
    +(refs?'<div class="refs"><h4>References</h4>'+refs+'</div>':'');
}
function openReader(id){
  var f=byId[id]; if(!f) return;
  var opener=null;
  Array.prototype.forEach.call(groupsEl.querySelectorAll('[data-id]'), function(el){ if(el.getAttribute('data-id')===id) opener=el; });
  if(opener) lastOpener=opener;
  state.openId=id;
  reader.innerHTML=readerHtml(f);
  reader.setAttribute('aria-hidden','false');
  layout.classList.add('reader-open');
  reader.scrollTop=0;
  updateSelection();
  if(decodeURIComponent(location.hash.slice(1))!==id){ location.hash=encodeURIComponent(id); }
  var cb=reader.querySelector('button.close'); if(cb) cb.focus();
  if(window.matchMedia&&window.matchMedia('(max-width:720px)').matches){ reader.scrollIntoView({behavior:'smooth',block:'start'}); }
}
function closeReader(){
  state.openId=null; layout.classList.remove('reader-open'); reader.setAttribute('aria-hidden','true'); reader.innerHTML='';
  updateSelection();
  if(location.hash){ history.replaceState(null,'',location.pathname+location.search); }
  if(lastOpener&&lastOpener.focus){ lastOpener.focus(); lastOpener=null; }
}
function toMarkdown(f){
  var md='# '+f[F.name]+'\\n\\n';
  if(f[F.summary]) md+=f[F.summary]+'\\n\\n';
  CFG.reader.columns.forEach(function(c){ if(f[c.field]) md+='**'+c.label+':** '+f[c.field]+'\\n\\n'; });
  if(f[CFG.reader.markdownBodyField]) md+=f[CFG.reader.markdownBodyField]+'\\n\\n';
  var refs=f[CFG.reader.refsField]||[];
  if(refs.length){ md+='**References:**\\n'; refs.forEach(function(r){ md+='- ['+(r.type||'Link')+']('+r.url+')\\n'; }); }
  return md.replace(/\\s+$/,'')+'\\n';
}
function toShare(f){
  var s=f[F.name]+(f[F.summary]?' — '+f[F.summary]:'');
  var col0=CFG.reader.columns[0];
  if(col0 && f[col0.field]) s+='\\n'+col0.label+': '+f[col0.field];
  var ref=(f[CFG.reader.refsField]||[]).filter(function(r){return r.url;})[0];
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
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(function(){toast('Copied ✓');},function(){fallbackCopy(t);}); }
  else { fallbackCopy(t); }
}
function appliedChip(facet,value,attr){ return '<button type="button" class="applied-chip" '+attr+' aria-label="Remove filter: '+esc(value)+'">'+esc(facet)+': '+esc(value)+' ✕</button>'; }
function renderApplied(){
  var html='';
  var q=(search.value||'').trim();
  if(q) html+=appliedChip('Search', q, 'data-rm-q="1"');
  CFG.single.forEach(function(s){ if(state[s.key]) html+=appliedChip(s.chipLabel, valueLabel(s.key, state[s.key]), 'data-rm-single="'+esc(s.key)+'"'); });
  CFG.multi.forEach(function(m){ selectedKeys(state[m.key]).forEach(function(v){ html+=appliedChip(m.chipLabel, v, 'data-rm-multi="'+esc(m.key)+'" data-rm-val="'+esc(v)+'"'); }); });
  if(html) html+='<button type="button" class="clear-all" data-clear-all="1">Clear all</button>';
  appliedEl.innerHTML=html;
}
function syncChecks(){
  CFG.multi.forEach(function(m){
    Array.prototype.forEach.call(document.querySelectorAll('input[data-'+m.itemAttr+']'), function(c){ c.checked=!!state[m.key][c.getAttribute('data-'+m.itemAttr)]; });
  });
}
function closeDropdowns(except){
  Array.prototype.forEach.call(document.querySelectorAll('.dropdown'), function(dd){
    if(dd===except) return;
    dd.classList.remove('open');
    var t=dd.querySelector('.dd-trigger'); if(t) t.setAttribute('aria-expanded','false');
    var p=dd.querySelector('.panel'); if(p) p.hidden=true;
  });
}
var searchDebounce=null;
search.addEventListener('input', function(){ clearTimeout(searchDebounce); searchDebounce=setTimeout(function(){ render(); renderApplied(); }, 120); });
searchClear.addEventListener('click', function(){ search.value=''; search.focus(); render(); renderApplied(); });
CFG.single.forEach(function(s){
  var el=document.getElementById(s.controlId); if(!el) return;
  el.addEventListener('change', function(){ state[s.key]=el.value; renderApplied(); render(); });
});
if(groupBy) groupBy.addEventListener('change', function(){ state.groupBy=groupBy.value; render(); });
document.querySelector('.viewswitch').addEventListener('click', function(e){
  var b=e.target.closest('button[data-view]'); if(!b) return;
  state.view=b.getAttribute('data-view');
  Array.prototype.forEach.call(this.querySelectorAll('button'), function(x){x.classList.toggle('active', x===b);});
  render();
});
filterbar.addEventListener('click', function(e){
  var t=e.target.closest('.dd-trigger'); if(!t) return;
  var dd=t.closest('.dropdown'); var wasOpen=dd.classList.contains('open');
  closeDropdowns();
  if(!wasOpen){ dd.classList.add('open'); t.setAttribute('aria-expanded','true'); dd.querySelector('.panel').hidden=false; }
});
filterbar.addEventListener('change', function(e){
  var c=e.target.closest('input[type=checkbox]'); if(!c) return;
  CFG.multi.forEach(function(m){
    if(c.hasAttribute('data-'+m.itemAttr)){ var v=c.getAttribute('data-'+m.itemAttr); if(c.checked) state[m.key][v]=true; else delete state[m.key][v]; }
  });
  renderApplied(); render();
});
CFG.multi.forEach(function(m){
  if(!m.search) return;
  var si=document.getElementById(m.searchInputId); var cl=document.getElementById(m.checklistId);
  if(!si||!cl) return;
  si.addEventListener('input', function(){
    var q=si.value.trim().toLowerCase();
    Array.prototype.forEach.call(cl.querySelectorAll('[data-'+m.itemAttr+'opt]'), function(l){ l.style.display=(!q || l.getAttribute('data-'+m.itemAttr+'opt').toLowerCase().indexOf(q)>=0)?'':'none'; });
  });
});
appliedEl.addEventListener('click', function(e){
  var b=e.target.closest('button'); if(!b) return;
  if(b.hasAttribute('data-clear-all')){
    state.q=''; search.value='';
    CFG.single.forEach(function(s){ state[s.key]=''; var el=document.getElementById(s.controlId); if(el) el.value=''; });
    CFG.multi.forEach(function(m){ state[m.key]={}; });
  }
  else if(b.hasAttribute('data-rm-q')){ state.q=''; search.value=''; }
  else if(b.hasAttribute('data-rm-single')){ var sk=b.getAttribute('data-rm-single'); state[sk]=''; var el=document.getElementById((CFG.single.filter(function(s){return s.key===sk;})[0]||{}).controlId); if(el) el.value=''; }
  else if(b.hasAttribute('data-rm-multi')){ var mk=b.getAttribute('data-rm-multi'); delete state[mk][b.getAttribute('data-rm-val')]; }
  syncChecks(); renderApplied(); render();
});
document.addEventListener('keydown', function(e){
  if(e.key!=='Escape') return;
  var open=document.querySelector('.dropdown.open');
  if(open){ var t=open.querySelector('.dd-trigger'); closeDropdowns(); if(t) t.focus(); return; }
  if(layout.classList.contains('reader-open')) closeReader();
});
document.addEventListener('click', function(e){ if(!e.target.closest('.dropdown')) closeDropdowns(); });
groupsEl.addEventListener('click', function(e){
  if(cardLinkOut()) return; // titles are real <a href> links — let the browser navigate
  var el=e.target.closest('[data-id]'); if(!el) return; e.preventDefault(); openReader(el.getAttribute('data-id'));
});
reader.addEventListener('click', function(e){
  var b=e.target.closest('button[data-act]'); if(!b) return;
  var act=b.getAttribute('data-act');
  var f=DATA.filter(function(x){return x[F.id]===state.openId;})[0];
  if(act==='close') closeReader();
  else if(act==='copy'&&f) copyText(toMarkdown(f));
  else if(act==='copylink'&&f) copyText(location.origin+location.pathname+'#'+encodeURIComponent(f[F.id]));
  else if(act==='share'&&f) copyText(toShare(f));
});
window.addEventListener('hashchange', function(){
  if(cardLinkOut()) return; // no in-page reader when titles link out
  var id=decodeURIComponent(location.hash.slice(1));
  if(id===state.openId) return;
  if(byId[id]) openReader(id); else if(!id) closeReader();
});
if(subtitleCount) subtitleCount.textContent=DATA.length;
renderApplied();
render();
if(!cardLinkOut() && location.hash){ var id0=decodeURIComponent(location.hash.slice(1)); if(byId[id0]) openReader(id0); }
`;

// Additive reader-mode seam (default-off): appended to the client runtime ONLY when
// config.reader.mode === 'iframe'. It overrides openReader so a card-open lazily loads the
// opened card's iframeField URL into a sandboxed <iframe> (the item's own standalone HTML doc)
// instead of rendering markdown columns — closest to "read without leaving", offline from file://.
// Sandbox is reading-only: NEVER allow-same-origin + allow-scripts together (escape risk);
// allow-popups* lets the "Open in new tab" affordance work. Only the opened card's src is set —
// never eager — so a large corpus does not load every document up front. Empty-state when no source.
const IFRAME_READER_RUNTIME = `
(function(){
  function iframeReaderHtml(f){
    var src=f[CFG.reader.iframeField];
    var head='<div class="reader-head"><h2>'+esc(f[F.name])+'</h2>'
      +(src?'<a class="open-tab" href="'+esc(src)+'" target="_blank" rel="noopener">Open in new tab ↗</a>':'')
      +'</div>';
    var pane=src
      ? '<iframe class="reader-frame" sandbox="allow-popups allow-popups-to-escape-sandbox" title="'+esc(f[F.name])+'"></iframe>'
      : '<div class="reader-empty">Nothing to preview for this item.</div>';
    return '<button class="close" type="button" data-act="close">close ✕</button>'+head+pane;
  }
  openReader=function(id){
    var f=byId[id]; if(!f) return;
    var opener=null;
    Array.prototype.forEach.call(groupsEl.querySelectorAll('[data-id]'), function(el){ if(el.getAttribute('data-id')===id) opener=el; });
    if(opener) lastOpener=opener;
    state.openId=id;
    reader.innerHTML=iframeReaderHtml(f);
    var fr=reader.querySelector('iframe.reader-frame');
    if(fr){ fr.src=f[CFG.reader.iframeField]; } // lazy: src set on open only, never eager
    reader.setAttribute('aria-hidden','false');
    layout.classList.add('reader-open');
    reader.scrollTop=0;
    updateSelection();
    if(decodeURIComponent(location.hash.slice(1))!==id){ location.hash=encodeURIComponent(id); }
    var cb=reader.querySelector('button.close'); if(cb) cb.focus();
    if(window.matchMedia&&window.matchMedia('(max-width:720px)').matches){ reader.scrollIntoView({behavior:'smooth',block:'start'}); }
  };
})();
`;
