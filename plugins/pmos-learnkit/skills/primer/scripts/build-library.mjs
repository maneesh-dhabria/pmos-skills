#!/usr/bin/env node
// build-library.mjs — primers-index.json (the committed corpus) + any user-generated
// primers found beside the output page → a single self-contained, offline (file://)
// filterable library.html. Modeled on /frameworks' build-library.mjs (committed corpus,
// gitignored output), adapted for /primer. Each primer is a standalone HTML document, so a
// card OPENS the primer IN-PAGE in the substrate's sidebar reader using its lazy iframe mode
// (reader.mode:'iframe') — closest to /frameworks' read-without-leaving feel — with an
// "Open in new tab" affordance retained. Renders BOTH populations on one page, distinguished
// by a Collection facet: the shipped corpus (Collection=Curated) and the user's own primers
// in the output directory (Collection=Yours). Zero external deps; Node ESM; no external asset
// refs (inline CSS + JS only) so it opens from file://.
//
// The faceting / filtering / search / sort / three-view / sidebar-reader / masthead chrome
// comes from the shared _shared/library-viewer/ substrate (frozen API). This script is THIN:
// it supplies only the primer corpus adapter (record → card fields, a single named toCard +
// ALLOWED whitelist) and the skill-specific extras the substrate's card hook exposes:
// dual-population badge + the metarow pill set, plus the super_category display-label map.
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
import { extractFacets, emitHtml } from '../../_shared/library-viewer/lib.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR_DEFAULT = resolve(SCRIPT_DIR, '..');           // skills/primer
const INDEX_DEFAULT = join(SKILL_DIR_DEFAULT, 'data', 'primers-index.json');

// href from the output page's directory to a target file, as a forward-slash URL path.
function hrefFrom(outDir, targetAbs) {
  return relative(outDir, targetAbs).split(sep).join('/');
}

// The strict card-field allowlist — the ONLY fields a primer card is permitted to carry.
// toCard() reads each one explicitly (never spreads), so no stray index/scan field can reach
// the emitted DOM. Mirrors /learn-list's toCard + ALLOWED adapter shape (D6).
const ALLOWED = ['collection', 'id', 'title', 'super_category', 'category', 'audience', 'depth', 'sources_count', 'word_count', 'date', 'href', 'exists'];

// adapter: a raw primer record (from either loader) → a normalized viewer card. WHITELIST
// ONLY — every card field is derived field-by-field from an ALLOWED key; a record is never
// spread. Both loadCurated() and scanUserPrimers() feed their raw records through this.
function toCard(rec) {
  rec = rec || {};
  const id = typeof rec.id === 'string' ? rec.id : '';
  return {
    collection: rec.collection === 'Yours' ? 'Yours' : 'Curated',
    id,
    title: typeof rec.title === 'string' && rec.title ? rec.title : (id || 'Untitled'),
    super_category: typeof rec.super_category === 'string' && rec.super_category ? rec.super_category : 'Uncategorized',
    category: typeof rec.category === 'string' && rec.category ? rec.category : 'Uncategorized',
    audience: typeof rec.audience === 'string' && rec.audience ? rec.audience : '—',
    depth: typeof rec.depth === 'string' && rec.depth ? rec.depth : '—',
    sources_count: typeof rec.sources_count === 'number' ? rec.sources_count : null,
    word_count: typeof rec.word_count === 'number' ? rec.word_count : null,
    date: typeof rec.date === 'string' ? rec.date : '',
    href: typeof rec.href === 'string' ? rec.href : '',
    exists: rec.exists === true,
  };
}
void ALLOWED; // documentation/contract constant — toCard enumerates the same field set explicitly

// ---- Curated corpus (the shipped 61-primer index) -------------------------------------
export function loadCurated(indexPath, skillDir, outDir) {
  const arr = JSON.parse(readFileSync(indexPath, 'utf8'));
  if (!Array.isArray(arr)) throw new Error(`index is not an array: ${indexPath}`);
  return arr.map((e) => {
    const primerAbs = resolve(skillDir, e.html);            // e.html = "data/primers/<id>.html"
    return toCard({
      collection: 'Curated',
      id: e.id,
      title: e.title || e.id,
      super_category: e.super_category,
      category: e.category,
      audience: e.audience,
      depth: e.depth,
      sources_count: e.sources_count,
      word_count: e.word_count,
      date: e.generated_date || '',
      href: hrefFrom(outDir, primerAbs),
      exists: existsSync(primerAbs),
    });
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
      return toCard({
        collection: 'Yours',
        id: f,
        title,
        super_category: 'Your primers',
        category: 'Your primers',
        audience: '—',
        depth: '—',
        date: dm ? dm[1] : '',
        href: f,
        exists: true,
      });
    });
}

// D4 — presentation-only super_category display labels. Applied wherever a super_category is
// SHOWN (the Area filter <option> labels + the applied-bar Area chip) via the substrate's
// single-select `valueLabels` seam. The filter VALUE stored in state and compared in passes()
// stays the raw super_category, so matching, grouping, and facet counts are unchanged.
// Unmapped values (e.g. 'Your primers', 'Uncategorized') fall back to the raw string.
export const PRIMER_SUPER_CATEGORY_LABELS = {
  'Cross Functional Skills': 'Cross-Functional Skills',
  'Product Management Tactics': 'PM Tactics',
};

// Primer-specific extras supplied through the substrate's skill-agnostic card hook: a
// Curated/Yours badge + the metarow pill set. Cards OPEN the in-page iframe reader (no
// card.link → the substrate renders reader-opening cards, not link-out titles). The substrate
// owns facets / filter / search / sort / three-view / sidebar-reader / masthead.
const PRIMER_CARD = {
  badge: { field: 'collection' },
  pills: [
    { field: 'audience', skip: ['—'] },
    { field: 'depth', skip: ['—'] },
    { field: 'sources_count', suffix: ' sources' },
    { field: 'word_count', suffix: ' words', thousands: true },
    { field: 'date' },
    { whenFalse: 'exists', text: 'file missing', cls: 'warn' },
  ],
};

// Primer-specific styling layered over the substrate BASE_CSS (badge + pill chrome only —
// the three-view switch is inherited from the substrate, not hidden).
const PRIMER_CSS = `.card .top{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:2px}
.card h4.name{margin:2px 0 0}
.badge{font-size:10px;text-transform:uppercase;letter-spacing:.05em;border-radius:999px;padding:2px 8px;font-weight:700}
.badge.curated{background:var(--pmos-accent-bg);color:var(--pmos-accent-strong);border:1px solid var(--pmos-border)}
.badge.yours{background:var(--pmos-surface-2);color:var(--pmos-muted);border:1px solid var(--pmos-border)}
.metarow{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.pill{background:var(--pmos-surface-2);color:var(--pmos-muted);border-radius:999px;padding:2px 8px;font-size:var(--pmos-fs-xs)}
.pill.warn{background:var(--pmos-surface-2);color:var(--pmos-warning);border:1px solid var(--pmos-warning)}
ul.listview .badge{margin-right:6px}
ul.listview .metarow{margin-top:4px}`;

export function buildHtml(records) {
  // Newest-first within the data; the client sorts/filters, but ship a stable order.
  const recs = records.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.title.localeCompare(b.title));
  const curatedN = recs.filter((r) => r.collection === 'Curated').length;
  const yoursN = recs.length - curatedN;
  // Dynamic library count: the {count} token is replaced by the substrate with a runtime
  // #subtitleCount span (DATA.length = curated + yours), so the count is never baked-in.
  const sub = yoursN
    ? `{count} primers — ${curatedN} curated · ${yoursN} of yours`
    : `{count} primers — search or filter the library`;

  // facet extraction (counts) over the merged record array — the substrate engine owns the rest.
  const { facets } = extractFacets(recs, [
    { key: 'collection', field: 'collection' },
    { key: 'super_category', field: 'super_category' },
    { key: 'category', field: 'category' },
    { key: 'audience', field: 'audience' },
    { key: 'depth', field: 'depth' },
  ]);

  return emitHtml({
    cards: recs,
    facets: [
      // collection, area, depth stay single-select; area gets the valueLabels display-rename (D4).
      { key: 'collection', field: 'collection', kind: 'single-select', controlId: 'f-collection', label: 'Collection', allLabel: 'All collections', ariaLabel: 'Filter by collection', chipLabel: 'Collection', values: facets.collection.values },
      { key: 'super_category', field: 'super_category', kind: 'single-select', controlId: 'f-super', label: 'Area', allLabel: 'All areas', ariaLabel: 'Filter by area', chipLabel: 'Area', valueLabels: PRIMER_SUPER_CATEGORY_LABELS, values: facets.super_category.values },
      // category — multi-select dropdown + type-to-filter search (10 areas warrant search).
      { key: 'category', field: 'category', kind: 'multi-dropdown', itemAttr: 'cat', triggerLabel: 'Category', chipLabel: 'Category', label: 'category', search: true, searchInputId: 'catSearch', checklistId: 'catChecklist', searchPlaceholder: 'Filter categories…', searchAria: 'Type to filter the category list', values: facets.category.values },
      // audience — multi-select dropdown.
      { key: 'audience', field: 'audience', kind: 'multi-dropdown', itemAttr: 'aud', triggerLabel: 'Audience', chipLabel: 'Audience', label: 'audience', values: facets.audience.values },
      { key: 'depth', field: 'depth', kind: 'single-select', controlId: 'f-depth', label: 'Depth', allLabel: 'All depths', ariaLabel: 'Filter by depth', chipLabel: 'Depth', values: facets.depth.values },
    ],
    config: {
      idField: 'id', nameField: 'title', categoryField: 'category',
      searchFields: ['title', 'category', 'super_category'],
      searchPlaceholder: 'Search primers by title or category…',
      searchAria: 'Search primers',
      skillMeta: 'primer',
      groupBy: [
        { value: 'collection', label: 'Collection', field: 'collection' },
        { value: 'category', label: 'Category', field: 'category' },
      ],
      defaultGroupValue: 'collection',
      // In-page reader = a lazy sandboxed iframe of the primer's own standalone HTML (D3).
      reader: { mode: 'iframe', iframeField: 'href' },
      card: PRIMER_CARD,
    },
    masthead: { wordmark: 'PMOS', title: 'Primer Library', subtitleTemplate: sub },
    extraHead: PRIMER_CSS,
  });
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
  assert(/<link rel="icon" href="data:,">/.test(html), 'missing data: favicon (offline zero-request)');
  // single-select facet controls present (collection / area / depth)
  assert(html.includes('id="f-collection"') && html.includes('id="f-super"') && html.includes('id="f-depth"'), 'a single-select facet control is missing');
  // D4 — category + audience are multi-select dropdowns (data-dd trigger + native checkboxes), not <select>s
  assert(/data-dd="category"[^>]*aria-expanded/.test(html) || /aria-expanded[^>]*data-dd="category"/.test(html), 'category multi-dropdown trigger missing');
  assert(/data-dd="audience"[^>]*aria-expanded/.test(html) || /aria-expanded[^>]*data-dd="audience"/.test(html), 'audience multi-dropdown trigger missing');
  assert(html.includes('data-cat="AI"'), 'category checkbox (data-cat) missing');
  assert(html.includes('data-aud="all-pms"'), 'audience checkbox (data-aud) missing');
  assert(html.includes('id="catSearch"'), 'category type-to-filter search input missing');
  assert(!html.includes('id="f-category"') && !html.includes('id="f-audience"'), 'old single-select category/audience <select> controls should be gone');
  // D4 — area valueLabels rename: display label shown, RAW super_category kept as the value
  assert(html.includes('<option value="Cross Functional Skills">Cross-Functional Skills</option>'), 'area option must use the valueLabels display label with the raw value');
  assert(html.includes('value="Cross Functional Skills"') && !html.includes('<option value="Cross-Functional Skills"'), 'area option VALUE must stay the raw super_category (rename is presentation-only)');
  // D5 — three views present and NOT CSS-hidden (the .viewswitch{display:none} hack is gone)
  assert(html.includes('data-view="compact"') && html.includes('data-view="detailed"') && html.includes('data-view="list"'), 'three view-switch controls missing');
  assert(!/\.viewswitch\{display:none\}/.test(html), 'the .viewswitch{display:none} hide hack must be removed');
  assert(/data-view="list"[^>]*class="active"/.test(html), 'list view must be the default (substrate default)');
  assert(/<div id="groups"><\/div>/.test(html), 'groups container should be empty (cards render client-side)');
  // self-contained / offline: no external asset refs (curated hrefs are relative file paths)
  assert(!/(?:src|href)\s*=\s*["']https?:\/\//i.test(html), 'external http(s) asset/link reference found');
  assert(!/<link\b[^>]+href\s*=\s*["'](?!data:)/i.test(html) && !/<script[^>]+\bsrc=/i.test(html), 'external <link>/<script src> found');
  // data round-trips the synthetic user record (substrate embeds it in the lv-data block)
  assert(html.includes('"collection":"Yours"'), 'user record not embedded');
  assert(html.includes('>Curated<') && html.includes('>Yours<'), 'collection facet options missing');
  // dual-population presentation: substrate sections by collection
  assert(html.includes('"defaultGroupValue":"collection"'), 'page is not sectioned by collection');
  // D3 — in-page iframe reader plumbed (NOT link-out cards): reader.mode in CFG + iframe runtime + lazy src
  assert(/"reader":\{[^}]*"mode":"iframe"/.test(html), 'reader.mode:"iframe" not plumbed into the client CFG');
  assert(/"iframeField":"href"/.test(html), 'reader.iframeField not plumbed');
  assert(/"card":\{"link":null/.test(html), 'cards must no longer be link-out (card.link must normalize to null → in-page reader opens)');
  assert(html.includes('class="reader-frame"') || html.includes("'reader-frame'") || html.includes('reader-frame'), 'iframe reader element missing');
  assert(html.includes('sandbox="allow-popups allow-popups-to-escape-sandbox"') || html.includes('allow-popups allow-popups-to-escape-sandbox'), 'iframe sandbox attribute missing/incorrect');
  assert(!/sandbox="[^"]*allow-same-origin[^"]*allow-scripts/.test(html), 'iframe must not combine allow-same-origin + allow-scripts');
  assert(/fr\.src\s*=\s*f\[CFG\.reader\.iframeField\]/.test(html), 'iframe src must be set lazily from the iframeField on open');
  assert(/Open in new tab/.test(html), '"Open in new tab" affordance missing from the iframe reader');
  assert(/reader-empty/.test(html), 'iframe reader empty-state missing');
  // F6/bug-fix — dynamic subtitle count: {count} → an id="subtitleCount" span set from DATA.length
  assert(html.includes('id="subtitleCount"'), 'subtitle count must live in an id="subtitleCount" span ({count} token)');
  assert(/subtitleCount[^;]*DATA\.length/.test(html) || html.includes('subtitleCount.textContent=DATA.length'), 'subtitle count must be set from DATA.length at runtime');
  assert(/· 1 of yours/.test(html), 'masthead subtitle does not report the Yours count');

  console.log(`build-library --selftest: PASS (${curated.length} curated + 1 synthetic user; multi-select facets + valueLabels, three views, in-page iframe reader, dynamic {count}, single-file/offline, dual-population)`);
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
