#!/usr/bin/env node
// build-library.mjs — frameworks.json + owned SVG diagrams → a single self-contained
// index.html, rendered through the shared library-viewer substrate
// (../../_shared/library-viewer/lib.mjs). This file is now THIN: it supplies only the
// frameworks corpus adapter + skill-specific extras (the SUPER_CATEGORY_LABELS display map,
// the diagram pipeline, and the area / decision-type / tags facet config). All the generic
// browse behaviour — three views (compact / detailed / list, defaulting to LIST), group-by,
// the layout-shifting sidebar reader, multi-select dropdown facets + applied-filters bar,
// debounced search, lazy thumbnails, deep-link hash, copy/share, masthead — lives in the
// substrate and is inherited unchanged. Offline from file://. Zero-dep Node ESM.
// (See reference/matching.md / reference/corpus-schema.md / SKILL.md.)
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
import {
  esc, renderMarkdown, parseBlocks, renderBody, extractFacets, emitHtml,
} from '../../_shared/library-viewer/lib.mjs';

// Re-export the markdown/diagram helpers from the substrate for back-compat (callers that
// imported them from this module keep working; the implementations now live in lib.mjs).
export { renderMarkdown, parseBlocks, renderBody };

// D5 — presentation-only product-area display labels. Applied wherever a super_category is
// SHOWN (the area-filter <option> labels and the applied-bar area chip) via the substrate's
// single-select `valueLabels` seam. The filter VALUE stored in state and compared in passes()
// stays the raw super_category, so matching, grouping, --json, and match.mjs are unchanged.
// Unmapped values fall back to the raw string (forward-safe if the corpus grows a new value).
export const SUPER_CATEGORY_LABELS = {
  'Analytics, Design & Finance': 'Cross Functional Skills',
  'People, Personal & Career': 'PM Skills & Mindset',
  'Product': 'Product Management',
  'Strategy & Business': 'Business & Strategy',
};

// adapter: a raw frameworks record + its inlined SVG diagrams → a normalized viewer card.
// Diagrams are zipped to the record's diagram_anchors[] BY INDEX (a missing/unreadable SVG
// stays a falsy slot until after the zip, so survivors keep their own anchor), then placed
// inline at their anchor inside body_html via the substrate renderBody().
function toCard(r, svgs) {
  const anchors = Array.isArray(r.diagram_anchors) ? r.diagram_anchors : [];
  const diagrams = svgs
    .map((svg, i) => ({ svg, anchor: anchors[i] != null ? anchors[i] : null }))
    .filter((d) => d.svg);                 // drop missing SVGs AFTER pairing — never before
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
    body_md: r.body_md || '',                       // raw — for copy-as-markdown
    thumb: diagrams[0] ? diagrams[0].svg : '',       // primary diagram as card thumbnail
    body_html: renderBody(r.body_md || '', diagrams), // inline-anchored diagrams
  };
}

// buildHtml(records, diagramsFor) — unchanged public signature. diagramsFor(r) → array of
// inlined SVG strings (primary first, then extras), index-aligned with diagram_anchors[].
// Back-compat: a legacy diagramFor(r) returning a single string is wrapped to [string].
export function buildHtml(records, diagramsFor) {
  const svgsFor = (r) => {
    if (!diagramsFor) return [];
    const v = diagramsFor(r);
    if (Array.isArray(v)) return v;
    return v ? [v] : [];
  };
  const cards = records.map((r) => toCard(r, svgsFor(r)));

  // facets (per-value counts from the corpus) via the substrate.
  const areaValues = extractFacets(cards, [{ key: 'area', field: 'super_category' }]).facets.area.values;
  const dtValues = extractFacets(cards, [{ key: 'dt', field: 'decision_type' }]).facets.dt.values;
  const tagValues = extractFacets(cards, [{ key: 'tags', field: 'tags', array: true }]).facets.tags.values;

  return emitHtml({
    cards,
    facets: [
      // single-select area filter — D5 display labels, raw super_category value kept.
      {
        key: 'area', field: 'super_category', kind: 'single-select',
        label: 'area', allLabel: 'All areas', controlId: 'superFilter',
        ariaLabel: 'Filter by area', chipLabel: 'Area',
        valueLabels: SUPER_CATEGORY_LABELS, values: areaValues,
      },
      // decision-type multi-select dropdown (checkboxes are data-dt).
      {
        key: 'dt', field: 'decision_type', kind: 'multi-dropdown', itemAttr: 'dt',
        triggerLabel: 'Decision type', chipLabel: 'Decision',
        label: 'decision type', values: dtValues,
      },
      // tags multi-select dropdown + type-to-filter search (checkboxes are data-tag).
      {
        key: 'tags', field: 'tags', array: true, kind: 'multi-dropdown', itemAttr: 'tag',
        triggerLabel: 'Tags', chipLabel: 'Tag', label: 'tag',
        search: true, searchInputId: 'tagSearch', checklistId: 'tagChecklist',
        searchPlaceholder: 'Filter tags…', searchAria: 'Type to filter the tag list',
        values: tagValues,
      },
    ],
    config: {
      idField: 'id', nameField: 'name', summaryField: 'summary', categoryField: 'category',
      thumbField: 'thumb', bodyHtmlField: 'body_html',
      searchFields: ['name', 'summary', 'category', { field: 'tags', array: true }, 'when_to_use'],
      searchPlaceholder: 'Describe a problem or search a framework…', searchAria: 'Search frameworks',
      groupBy: [
        { value: 'category', label: 'Product Areas', field: 'category' },
        { value: 'tags', label: 'Tags', field: 'tags', array: true, emptyLabel: '(untagged)' },
      ],
      defaultGroupValue: 'category',
      skillMeta: 'frameworks',
      reader: {
        metaPrimaryField: 'category', authorField: 'author', pillField: 'decision_type',
        take: { field: 'commentary', label: 'PM&#39;s take' }, // labelHtml — entity-encoded apostrophe
        columns: [
          { field: 'when_to_use', label: 'When to use' },
          { field: 'when_not_to_use', label: 'When not to use' },
        ],
        refsField: 'references', markdownBodyField: 'body_md',
      },
    },
    masthead: {
      wordmark: 'PMOS', title: 'Frameworks Library',
      subtitleTemplate: '{count} PM thinking tools — describe a problem or browse',
    },
  });
}

// ---- selftest -------------------------------------------------------------
// The frameworks regression gate. Behavioural coverage is unchanged from the pre-substrate
// builder; three assertions that pinned frameworks-local JS identifiers were PORTED to the
// substrate's generic equivalents (the substrate renders per-facet code generically):
//   selectedKeys(state.dt)            → selectedKeys(state[m.key])     (OR-within set membership)
//   data-rm-area / -dt / -tag         → data-rm-single / -multi + -val (per-facet chip removal)
//   f.id===state.openId?' class…'     → f[F.id]===state.openId?' class…' (targeted selection)
// No guarantee is weakened — the same behaviours are still asserted, against the new identifiers.
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
  assert(html.includes('selectedKeys(state[m.key])'), 'decision-type/tags are sets; passes() uses OR-within membership (substrate-generic)');

  // --- D4d: per-option counts in the dropdown labels (should) ---
  assert(/class="cnt">\(1\)/.test(html), 'per-option count rendered in dropdown labels');

  // --- D4b: applied-filters bar — facet-labeled removable chips + Clear all ---
  assert(html.includes('id="applied"') && html.includes('renderApplied'), 'applied-filters bar present');
  assert(html.includes('class="applied-chip"') && html.includes('Remove filter:'), 'applied chips are real buttons with accessible names');
  assert(html.includes('data-rm-single') && html.includes('data-rm-multi') && html.includes('data-rm-val'), 'per-facet chip removal wired (substrate-generic single/multi)');
  assert(html.includes('data-clear-all') && html.includes('>Clear all<'), 'Clear all control present');
  assert(html.includes('syncChecks'), 'chips ↔ checkboxes kept in sync');
  // D4c: count is in an aria-live region; Escape closes + restores focus.
  assert(/id="count"[^>]*aria-live="polite"|aria-live="polite"[^>]*id="count"/.test(html), 'result count is an aria-live region');
  assert(html.includes("'Escape'") && html.includes('closeDropdowns'), 'Escape closes the dropdown panel');

  // --- D1: selection highlight in all 3 views + no page auto-scroll on open ---
  assert(html.includes("f[F.id]===state.openId?' class=\"selected\"'"), 'list/compact items carry the selected class when open (substrate-generic field access)');

  // --- F1 (browse-ux): perceived-reload killed — targeted updateSelection, debounced search, scroll-preserving render ---
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
  assert(/function thumbHtml\(f\)\{[\s\S]{0,200}data-thumb/.test(html) && !/thumbHtml\(f\)\{[^}]*\+f\.thumb\+/.test(html), 'F2: thumbHtml emits a data-thumb placeholder, not the inline thumb SVG');
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
  assert(/data-clear-all[\s\S]*?search\.value=''/.test(html) || /clear-all[\s\S]{0,400}search\.value=''/.test(html), 'F5: Clear all resets the text query');
  assert(html.includes('data-rm-q') && html.includes("appliedChip('Search'"), 'F5: a removable query chip is shown for a non-empty search');

  // --- F7: mobile reader scrolls into view at <=720px ---
  assert(html.includes('scrollIntoView'), 'F7: reader.scrollIntoView() on open');
  assert(/max-width:720px|innerWidth\s*<=\s*720|innerWidth\s*<\s*721/.test(html), 'F7: gated to <=720px viewports');

  // --- sidebar reader: layout-shift, not a fixed overlay, no backdrop ---
  assert(html.includes('<aside class="reader"'), 'reader is an aside in normal flow');
  assert(html.includes('.layout.reader-open'), 'reader opens by layout-shift (width), not overlay');
  assert(!/\.reader\{[^}]*position:fixed/.test(html), 'reader is not position:fixed');
  assert(!/class="backdrop"/.test(html), 'no modal backdrop');
  assert(html.includes('closeReader') && html.includes('state.openId=null'), 'close clears the selection');

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
  const gapRec = [{ ...anchorRec[0], diagram_anchors: [null, null, aTxt] }];
  const gapH = buildHtml(gapRec, () => ['<svg id="thumb0"></svg>', '', '<svg id="survivor-after"></svg>']);
  assert(gapH.indexOf('survivor-after') >= 0, 'surviving diagram still rendered when an earlier one is missing');
  assert(gapH.indexOf('survivor-after') > gapH.lastIndexOf(aTxt.slice(0, 40)), 'survivor pairs with its OWN anchor (after the block), not the missing diagram\'s null anchor');

  console.log('build-library --selftest: PASS (substrate-driven: list-default + view icons, area rename, dropdown multi-select filters + applied bar, selection highlight + scroll-preserve, group-by, sidebar, share, masthead, inline-anchor diagrams, missing-svg alignment, self-contained)');
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
    const name = String(relOrName).split('/').pop();
    const p = join(diagramsDir, name);
    return existsSync(p) ? readFileSync(p, 'utf8') : '';
  };
  const diagramsFor = (r) => {
    const list = Array.isArray(r.diagrams) && r.diagrams.length ? r.diagrams : (r.diagram ? [r.diagram] : []);
    return list.map(readSvg);   // keep '' for missing files — index must stay aligned with diagram_anchors
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

// keep `esc` reachable for any consumer that imported it indirectly (no-op re-export guard).
void esc;
