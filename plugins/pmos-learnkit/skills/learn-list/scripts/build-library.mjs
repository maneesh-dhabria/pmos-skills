#!/usr/bin/env node
// build-library.mjs — the scrubbed curated-references corpus
// (../../_shared/topic-research/curated-references.json) → a single self-contained,
// offline (file://) reference viewer, rendered through the shared library-viewer substrate
// (../../_shared/library-viewer/lib.mjs). This file is THIN: it supplies ONLY the corpus
// adapter (record → card, a strict field allowlist) + the learn-list facet config. All the
// generic browse behaviour — three views, group-by, the sidebar reader, multi-select
// dropdown facets + applied-filters bar, debounced search, deep-link hash, masthead — lives
// in the substrate and is inherited unchanged. Zero-dep Node ESM; no external asset refs.
//
// Usage:
//   node build-library.mjs --out <library.html> [--corpus <curated-references.json>]
//   node build-library.mjs --selftest
//
// The committed corpus is resolved relative to THIS script's location, not CWD, so the skill
// works wherever the plugin is installed. A missing corpus degrades to a visible empty-state
// (exit 0) — the overlay is optional/if-present per the design.
//
// PII CONTRACT (#corpus-and-pii-h): the adapter WHITELISTS exactly the allowed corpus fields
// {id,url,title,source_type,publication_date,tags,summary,summary_grounded}. It NEVER
// blanket-spreads a record, so no notion-specific field (page_id, database_id, occurrence,
// snapshot, workspace, notion_*) can ever reach the emitted DOM.

import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { argv } from 'node:process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { esc, extractFacets, emitHtml } from '../../_shared/library-viewer/lib.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR_DEFAULT = resolve(SCRIPT_DIR, '..');                                  // skills/learn-list
const CORPUS_DEFAULT = resolve(SKILL_DIR_DEFAULT, '..', '_shared', 'topic-research', 'curated-references.json');

// The strict field allowlist — the ONLY corpus fields this viewer is permitted to read.
const ALLOWED = ['id', 'url', 'title', 'source_type', 'publication_date', 'tags', 'summary', 'summary_grounded'];

// adapter: a raw curated-reference record → a normalized viewer card. WHITELIST ONLY — every
// card field is derived from an ALLOWED corpus field; a record is never spread. Forbidden
// keys present on the record are simply never read, so they cannot reach the DOM.
function toCard(r) {
  r = r || {};
  const title = typeof r.title === 'string' && r.title ? r.title : (r.id || 'Untitled');
  const url = typeof r.url === 'string' ? r.url : '';
  const date = typeof r.publication_date === 'string' ? r.publication_date : '';
  const ym = date.match(/^(\d{4})/);
  const year = ym ? ym[1] : '';
  const tags = Array.isArray(r.tags) ? r.tags.filter((t) => typeof t === 'string' && t) : [];
  const summary = typeof r.summary === 'string' ? r.summary : '';
  const sourceType = typeof r.source_type === 'string' && r.source_type ? r.source_type : 'other';
  return {
    id: typeof r.id === 'string' ? r.id : '',
    title,
    url,
    source_type: sourceType,
    publication_date: date,
    year,
    tags,
    grounded: r.summary_grounded === true ? 'grounded' : '',
    summary,
    // reader sidebar body — the summary, plus a grounded note. Derived from allowlisted fields.
    body_html: summary ? '<p>' + esc(summary) + '</p>' : '<p class="muted">No summary available.</p>',
    // the source link shown in the reader's References block.
    references: url ? [{ type: 'Visit source ↗', url }] : [],
  };
}

// Extra CSS — small presentational touches layered over the substrate BASE_CSS.
const LL_CSS = `.badge-grounded{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#5fe3df}
.muted{color:var(--muted)}`;

// buildHtml(records) — records is the raw corpus array (possibly empty). Empty → a page with a
// visible empty-state (graceful degrade), never a crash.
export function buildHtml(records) {
  const recs = Array.isArray(records) ? records : [];
  // ship a stable order: newest publication_date first, then title.
  const cards = recs
    .map(toCard)
    .sort((a, b) => (b.publication_date || '').localeCompare(a.publication_date || '') || a.title.localeCompare(b.title));

  const sourceValues = extractFacets(cards, [{ key: 'source', field: 'source_type' }]).facets.source.values;
  const yearValues = extractFacets(cards, [{ key: 'year', field: 'year' }]).facets.year.values
    .filter((v) => v.value) // drop the empty-year bucket from the dropdown
    .sort((a, b) => String(b.value).localeCompare(String(a.value))); // newest year first
  const tagValues = extractFacets(cards, [{ key: 'tags', field: 'tags', array: true }]).facets.tags.values;

  const empty = cards.length === 0;
  // Graceful degrade: a static, greppable empty-state injected ONLY when the corpus is absent
  // or empty. Replaces the substrate's filter-no-match message with a corpus-absent one.
  const extraScript = empty
    ? `(function(){var g=document.getElementById('groups');if(g){g.innerHTML='<div class="empty" id="empty-corpus">No curated references found. The curated-references corpus is not present \\u2014 run /learn-list to build it, or pass --corpus &lt;path&gt;.</div>';}})();`
    : '';

  const count = cards.length;
  const sub = empty
    ? 'No curated references found'
    : '{count} curated references — search or filter by source, tag, or year';

  return emitHtml({
    cards,
    facets: [
      {
        key: 'source', field: 'source_type', kind: 'single-select',
        label: 'source type', allLabel: 'All sources', controlId: 'f-source',
        ariaLabel: 'Filter by source type', chipLabel: 'Source', values: sourceValues,
      },
      {
        key: 'year', field: 'year', kind: 'single-select',
        label: 'year', allLabel: 'All years', controlId: 'f-year',
        ariaLabel: 'Filter by publication year', chipLabel: 'Year', values: yearValues,
      },
      {
        key: 'tags', field: 'tags', array: true, kind: 'multi-dropdown', itemAttr: 'tag',
        triggerLabel: 'Tags', chipLabel: 'Tag', label: 'tag',
        search: true, searchInputId: 'tagSearch', checklistId: 'tagChecklist',
        searchPlaceholder: 'Filter tags…', searchAria: 'Type to filter the tag list',
        values: tagValues,
      },
    ],
    config: {
      idField: 'id', nameField: 'title', summaryField: 'summary', categoryField: 'source_type',
      bodyHtmlField: 'body_html',
      searchFields: ['title', 'summary'],
      searchPlaceholder: 'Search references by title or summary…', searchAria: 'Search references',
      groupBy: [
        { value: 'source_type', label: 'Source type', field: 'source_type' },
        { value: 'year', label: 'Year', field: 'year', emptyLabel: '(undated)' },
        { value: 'tags', label: 'Tags', field: 'tags', array: true, emptyLabel: '(untagged)' },
      ],
      defaultGroupValue: 'source_type',
      skillMeta: 'learn-list',
      reader: {
        metaPrimaryField: 'source_type', pillField: 'year',
        columns: [
          { field: 'publication_date', label: 'Published' },
          { field: 'grounded', label: 'Summary' },
        ],
        refsField: 'references',
      },
    },
    masthead: {
      wordmark: 'PMOS', title: 'Reference Library',
      subtitleTemplate: sub,
    },
    extraHead: LL_CSS,
    extraScript,
  });
}

// ---- corpus load (graceful: absent → empty, never throw on missing) ----
function loadCorpus(corpusPath) {
  if (!existsSync(corpusPath)) return [];
  const raw = JSON.parse(readFileSync(corpusPath, 'utf8'));
  if (Array.isArray(raw)) return raw;
  return Array.isArray(raw.references) ? raw.references : [];
}

// ---- selftest -------------------------------------------------------------
function assert(cond, msg) { if (!cond) throw new Error(msg); }

function runSelftest() {
  const recs = [
    {
      id: 'ref_self01', url: 'https://example.com/a', title: 'Empowered Teams',
      source_type: 'article', publication_date: '2021-05-02', tags: ['product', 'teams'],
      summary: 'Why empowered product teams beat feature factories.', summary_grounded: true,
    },
    {
      id: 'ref_self02', url: 'https://example.com/v', title: 'Pricing Tiers Explained',
      source_type: 'video', publication_date: '2023-09-10', tags: ['pricing'],
      summary: 'Packaging and willingness-to-pay basics.', summary_grounded: false,
      // poison keys — MUST NOT reach the emitted HTML (allowlist contract).
      page_id: 'PAGEID_X', database_id: 'DBID_X', occurrence: 'OCC_X',
      snapshot: 'SNAP_X', workspace: 'WS_X', notion_id: 'NID_X',
    },
  ];
  const html = buildHtml(recs);

  assert(html.startsWith('<!DOCTYPE html>'), 'no doctype');
  assert(/<meta name="pmos:skill" content="learn-list">/.test(html), 'missing pmos:skill meta');
  assert(html.includes('id="search"'), 'search control missing');
  assert(html.includes('id="f-source"') && html.includes('id="f-year"'), 'source/year facet missing');
  assert(html.includes('data-dd="tags"'), 'tags dropdown missing');
  assert(html.includes('id="applied"') && html.includes('data-clear-all'), 'applied-filter bar missing');
  assert(html.includes('class="wordmark"') && html.includes('Reference Library'), 'masthead missing');
  assert(/<div id="groups"><\/div>/.test(html), 'cards container should be empty (cards render client-side)');
  // offline / self-contained
  assert(!/(?:src|href)\s*=\s*["']https?:\/\//i.test(html), 'external http(s) asset/link reference found');
  assert(!/<link\b[^>]+href\s*=\s*["'](?!data:)/i.test(html) && !/<script[^>]+\bsrc=/i.test(html), 'external <link>/<script src> found');
  // facet options + reader body present in embedded data
  assert(html.includes('<option value="article">') && html.includes('<option value="video">'), 'source options missing');
  assert(html.includes('"body_html"'), 'reader body not embedded');

  // PII allowlist: NONE of the poison keys/values may appear anywhere.
  for (const bad of ['page_id', 'database_id', 'occurrence', 'snapshot', 'workspace', 'notion_', 'PAGEID_X', 'DBID_X', 'OCC_X', 'SNAP_X', 'WS_X', 'NID_X']) {
    assert(!new RegExp(bad, 'i').test(html), `PII leak: forbidden token reached DOM: ${bad}`);
  }

  // graceful degrade: empty corpus → visible empty-state + zero cards.
  const emptyHtml = buildHtml([]);
  assert(/no curated references found/i.test(emptyHtml), 'empty-state marker missing on empty corpus');
  const m = emptyHtml.match(/<script id="lv-data"[^>]*>([\s\S]*?)<\/script>/);
  assert(m && JSON.parse(m[1]).length === 0, 'empty corpus should embed 0 cards');

  console.log('build-library --selftest: PASS (facets, single-file/offline, reader, PII allowlist, graceful empty-state)');
}

function main() {
  const args = argv.slice(2);
  if (args.includes('--selftest')) {
    try { runSelftest(); } catch (e) { console.error(`build-library --selftest: FAIL — ${e.message}`); process.exit(1); }
    return;
  }
  const getArg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
  const out = getArg('--out');
  if (!out) { console.error('usage: build-library.mjs --out <library.html> [--corpus <curated-references.json>]'); process.exit(64); }
  const corpusPath = getArg('--corpus') || CORPUS_DEFAULT;
  const outAbs = resolve(out);

  const records = loadCorpus(corpusPath);          // absent → [] → graceful empty-state
  const html = buildHtml(records);

  const tmp = outAbs + '.tmp';
  writeFileSync(tmp, html);
  renameSync(tmp, outAbs);
  if (records.length === 0) {
    console.log(`build-library: wrote ${outAbs} — corpus absent/empty at ${corpusPath} (empty-state page)`);
  } else {
    console.log(`build-library: wrote ${outAbs} — ${records.length} curated references`);
  }
}

if (argv[1] && fileURLToPath(import.meta.url) === resolve(argv[1])) {
  main();
}
