#!/usr/bin/env node
// build-library.mjs — case-studies.json → a single self-contained, offline library.html,
// rendered through the shared library-viewer substrate (../../_shared/library-viewer/lib.mjs).
// This file is THIN: it supplies only the case-studies corpus adapter (toCard + a strict
// ALLOWED whitelist), the facet config (pillar single-select group; topics/region/
// artifact_type/year multi-dropdown; a quantified single-select), and the columns reader
// composing the four prose blocks + a "Read the original ↗" link. Every generic browse
// behaviour — three views (list default), group-by, the layout-shifting sidebar reader,
// multi-select dropdown facets + applied-filters bar, debounced search, deep-link hash,
// copy/share, masthead — lives in the substrate and is inherited unchanged. Offline from
// file://. Zero-dep Node ESM. (See reference/matching.md / reference/corpus-expansion.md /
// SKILL.md. INV-1, D1, D6.)
//
// Usage:
//   node build-library.mjs [--out <library.html>] [--corpus <case-studies.json>]
//   node build-library.mjs --selftest
//
// No <img>, no external asset refs (external <a href> link-outs to the source are allowed —
// they are hyperlinks, not asset references), no ES module in the emitted page JS.

import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { argv } from 'node:process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { extractFacets, emitHtml } from '../../_shared/library-viewer/lib.mjs';

// D5-style presentation-only display labels for the pillar single-select. The filter VALUE
// stored in state and compared in passes() stays the RAW pillar, so matching/grouping/search
// are unchanged; only the rendered <option> label is remapped. Unmapped values fall back to
// the raw string (forward-safe if the corpus grows a new pillar).
export const PILLAR_LABELS = {
  'business-model': 'Business Model',
  'core-pm-craft': 'Core PM Craft',
  'design-ux': 'Design & UX',
  'platform': 'Platform',
};

// adapter: a raw case-studies record → a normalized viewer card. Strict ALLOWED whitelist —
// only these fields ever reach the emitted page (no leakage of raw importer internals like
// `language` / `publisher` / `verified_on`). The four prose blocks become reader columns; the
// source url becomes a single "Read the original ↗" reference link-out.
const ALLOWED = [
  'id', 'title', 'company', 'pillar', 'region', 'artifact_type', 'year', 'topics',
  'summary', 'what_they_built', 'evidence', 'why_it_matters', 'url',
  'quantified', 'quantified_label', 'references',
];

function toCard(r) {
  const card = {
    id: r.id,
    title: r.title || '(untitled)',
    company: r.company || '',
    pillar: r.pillar || 'uncategorized',
    region: r.region || 'unknown',
    artifact_type: r.artifact_type || 'unknown',
    year: r.year || 'unknown',
    topics: Array.isArray(r.topics) ? r.topics : [],
    summary: r.summary || '',
    what_they_built: r.what_they_built || '',
    evidence: r.evidence || '',
    why_it_matters: r.why_it_matters || '',
    url: r.url || '',
    quantified: !!r.quantified,
    // derived single-select facet value (the "quantified" filter). Raw boolean is kept above
    // for any consumer; the facet groups on this string.
    quantified_label: r.quantified ? 'quantified' : 'directional',
    // the source link-out, rendered by the reader's refs row with its `type` as the anchor text.
    references: r.url ? [{ type: 'Read the original ↗', url: r.url }] : [],
  };
  // enforce the whitelist — drop anything not explicitly allowed.
  for (const k of Object.keys(card)) if (ALLOWED.indexOf(k) < 0) delete card[k];
  return card;
}

export function buildHtml(records) {
  const cards = records.map(toCard);

  const pillarValues = extractFacets(cards, [{ key: 'pillar', field: 'pillar' }]).facets.pillar.values;
  const topicValues = extractFacets(cards, [{ key: 'topics', field: 'topics', array: true }]).facets.topics.values;
  const regionValues = extractFacets(cards, [{ key: 'region', field: 'region' }]).facets.region.values;
  const atypeValues = extractFacets(cards, [{ key: 'atype', field: 'artifact_type' }]).facets.atype.values;
  const yearValues = extractFacets(cards, [{ key: 'year', field: 'year' }]).facets.year.values;
  const quantValues = extractFacets(cards, [{ key: 'quant', field: 'quantified_label' }]).facets.quant.values;

  return emitHtml({
    cards,
    facets: [
      // pillar — single-select (D5 display labels, raw pillar value kept).
      {
        key: 'pillar', field: 'pillar', kind: 'single-select',
        label: 'pillar', allLabel: 'All pillars', controlId: 'pillarFilter',
        ariaLabel: 'Filter by pillar', chipLabel: 'Pillar',
        valueLabels: PILLAR_LABELS, values: pillarValues,
      },
      // topics — multi-select dropdown + type-to-filter search (98 topics).
      {
        key: 'topics', field: 'topics', array: true, kind: 'multi-dropdown', itemAttr: 'topic',
        triggerLabel: 'Topics', chipLabel: 'Topic', label: 'topic',
        search: true, searchInputId: 'topicSearch', checklistId: 'topicChecklist',
        searchPlaceholder: 'Filter topics…', searchAria: 'Type to filter the topic list',
        values: topicValues,
      },
      // region — multi-select dropdown.
      {
        key: 'region', field: 'region', kind: 'multi-dropdown', itemAttr: 'region',
        triggerLabel: 'Region', chipLabel: 'Region', label: 'region', values: regionValues,
      },
      // artifact_type — multi-select dropdown.
      {
        key: 'atype', field: 'artifact_type', kind: 'multi-dropdown', itemAttr: 'atype',
        triggerLabel: 'Type', chipLabel: 'Type', label: 'artifact type', values: atypeValues,
      },
      // year — multi-select dropdown.
      {
        key: 'year', field: 'year', kind: 'multi-dropdown', itemAttr: 'year',
        triggerLabel: 'Year', chipLabel: 'Year', label: 'year', values: yearValues,
      },
      // quantified — single-select toggle over the derived label.
      {
        key: 'quant', field: 'quantified_label', kind: 'single-select',
        label: 'evidence', allLabel: 'Any evidence', controlId: 'quantFilter',
        ariaLabel: 'Filter by evidence type', chipLabel: 'Evidence',
        valueLabels: { quantified: 'Reports hard numbers', directional: 'Directional / qualitative' },
        values: quantValues,
      },
    ],
    config: {
      idField: 'id', nameField: 'title', summaryField: 'summary', categoryField: 'pillar',
      bodyHtmlField: 'body_html',
      searchFields: ['title', 'company', 'summary', 'what_they_built', { field: 'topics', array: true }, 'pillar'],
      searchPlaceholder: 'Search a company, topic, or problem…', searchAria: 'Search case studies',
      groupBy: [
        { value: 'pillar', label: 'Pillar', field: 'pillar' },
        { value: 'region', label: 'Region', field: 'region' },
        { value: 'year', label: 'Year', field: 'year' },
      ],
      defaultGroupValue: 'pillar',
      skillMeta: 'case-studies',
      reader: {
        metaPrimaryField: 'pillar', authorField: 'company', pillField: 'artifact_type',
        columns: [
          { field: 'summary', label: 'Summary' },
          { field: 'what_they_built', label: 'What they built' },
          { field: 'evidence', label: 'Evidence' },
          { field: 'why_it_matters', label: 'Why it matters' },
        ],
        refsField: 'references',
      },
    },
    masthead: {
      wordmark: 'PMOS', title: 'Case Studies Library',
      subtitleTemplate: '{count} curated product case studies — search or browse',
    },
  });
}

// ---- selftest -------------------------------------------------------------
function assert(cond, msg) { if (!cond) throw new Error(msg); }

function runSelftest() {
  const recs = [
    { id: 'acme-pricing-flip', title: 'Acme flips to flat pricing', company: 'Acme', pillar: 'business-model', region: 'north-america', artifact_type: 'blog_post', year: '2021', topics: ['pricing-strategy', 'packaging'], summary: 'Acme scrapped tiers for a flat plan.', what_they_built: 'A single flat plan.', evidence: 'Conversion rose 12%.', why_it_matters: 'Value-based repositioning.', url: 'https://example.com/acme', quantified: true },
    { id: 'globex-onboarding', title: 'Globex rebuilds onboarding', company: 'Globex', pillar: 'core-pm-craft', region: 'europe', artifact_type: 'talk_writeup', year: '2019', topics: ['onboarding', 'activation'], summary: 'Globex reduced steps.', what_they_built: 'A 3-step wizard.', evidence: 'Directional; team reported faster activation.', why_it_matters: 'Friction removal.', url: 'https://example.com/globex', quantified: false },
  ];
  const html = buildHtml(recs);

  // --- offline / self-contained hard constraints (INV-1, D1) ---
  assert(!/<img\s/i.test(html), 'no <img> tags');
  assert(!/<link[^>]+href="https?:/i.test(html), 'no external stylesheet');
  assert(!/<script[^>]+src="https?:/i.test(html), 'no external script src');
  assert(!/(href|src)="https?:\/\/[^"]*amazonaws/i.test(html), 'no S3/amazonaws asset refs');

  // --- no ES module in the emitted page JS (D6). The corpus DATA lives in a
  // type="application/json" block (not executable JS), so strip it before scanning code. ---
  assert(!/type=["']module["']/i.test(html), 'no <script type="module">');
  const codeOnly = html.replace(/<script[^>]*type="application\/json"[^>]*>[\s\S]*?<\/script>/gi, '');
  assert(!/\bimport\s+[^;\n]*\bfrom\s+['"]/.test(codeOnly), 'no ESM import-from in emitted code');
  assert(!/\bexport\s+(default|function|const|let|var|\{)/.test(codeOnly), 'no ESM export in emitted code');

  // --- external <a href> link-outs ARE allowed (they are hyperlinks to the source) ---
  assert(html.includes('https://example.com/acme'), 'source link-out present (external <a href> allowed)');
  assert(html.includes('Read the original'), 'reader "Read the original ↗" link-out present');

  // --- facets present ---
  assert(html.includes('id="pillarFilter"'), 'pillar single-select present');
  assert(html.includes('id="quantFilter"'), 'quantified single-select present');
  assert(html.includes('data-topic="pricing-strategy"'), 'topics multi-dropdown checkbox present');
  assert(html.includes('data-region="europe"'), 'region multi-dropdown checkbox present');
  assert(html.includes('data-atype="blog_post"'), 'artifact_type multi-dropdown checkbox present');
  assert(html.includes('data-year="2021"'), 'year multi-dropdown checkbox present');
  assert(html.includes('id="topicSearch"'), 'topics type-to-filter search present');
  // D5 — pillar option shows the display label while keeping the RAW value.
  assert(html.includes('<option value="business-model">Business Model</option>'), 'pillar option uses PILLAR_LABELS display label with raw value');
  assert(!html.includes('<option value="Business Model"'), 'pillar option VALUE stays the raw pillar (rename is presentation-only)');

  // --- masthead + views ---
  assert(html.includes('class="wordmark">PMOS<') && html.includes('Case Studies Library'), 'PMOS masthead present');
  assert(html.includes('data-view="list"') && html.includes('data-view="detailed"') && html.includes('data-view="compact"'), 'three view controls present');
  assert(/data-view="list"[^>]*class="active"/.test(html), 'list is the default view');
  assert(html.includes('id="subtitleCount"'), 'dynamic subtitle count element present');

  // --- count == corpus length (DATA embedded as JSON) ---
  const m = html.match(/<script id="lv-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert(m, 'lv-data JSON block present');
  const data = JSON.parse(m[1].replace(/<\\\/script>/gi, '</script>'));
  assert(data.length === recs.length, `DATA length (${data.length}) == corpus length (${recs.length})`);
  // whitelist enforced — no leaked raw fields.
  assert(!('publisher' in data[0]) && !('language' in data[0]) && !('verified_on' in data[0]), 'ALLOWED whitelist strips raw importer fields');

  console.log('build-library --selftest: PASS (offline self-contained, no <img>/external asset/ESM, pillar+topics+region+type+year+quantified facets, columns reader + read-original link, list-default, count==corpus)');
}

function main() {
  const args = argv.slice(2);
  if (args.includes('--selftest')) {
    try { runSelftest(); } catch (e) { console.error(`build-library --selftest: FAIL — ${e.message}`); process.exit(1); }
    return;
  }
  const flag = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : null; };
  const here = dirname(fileURLToPath(import.meta.url));
  const corpus = flag('corpus') || join(here, '..', 'data', 'case-studies.json');
  const out = flag('out') || join(here, '..', 'data', 'library.html');
  const records = JSON.parse(readFileSync(corpus, 'utf8'));
  const html = buildHtml(records);
  const tmp = out + '.tmp';
  writeFileSync(tmp, html);
  renameSync(tmp, out);
  console.error(`build-library: wrote ${out} (${records.length} case studies)`);
}

if (argv[1] && fileURLToPath(import.meta.url) === argv[1]) {
  main();
}
