// lib.test.mjs — frozen public API of the library-viewer substrate.
// TDD: this exercises the not-yet-written engine, so it fails first (module missing).
// Run: node --test plugins/pmos-learnkit/skills/_shared/library-viewer/tests/
//
// The substrate engine must be PURE (no DOM, runs under node) and its emitHtml output must be
// a single self-contained HTML string (no external asset refs). Skill-specific behaviour is
// NOT tested here — that lives in each consumer's own regression test (e.g. frameworks selftest).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  esc, renderMarkdown, parseBlocks, renderBody,
  extractFacets, buildIndex, filterEngine, sortGroups, emitHtml,
} from '../lib.mjs';

test('esc — escapes HTML metacharacters', () => {
  assert.equal(esc('<a href="x">&'), '&lt;a href=&quot;x&quot;&gt;&amp;');
  assert.equal(esc(null), '');
});

test('renderMarkdown — bold, links, nested lists, blockquotes', () => {
  const h = renderMarkdown('- **Reach**: how many.\n\t- nested\n\n> a quote');
  assert.match(h, /<strong>Reach<\/strong>/);
  assert.match(h, /<ul>[\s\S]*<li>nested<\/li>/);
  assert.match(h, /<blockquote>/);
  assert.equal(renderMarkdown(''), '');
});

test('parseBlocks — splits into ordered list/quote/para blocks keeping raw source', () => {
  const blocks = parseBlocks('- one\n- two\n\npara line\n\n> q');
  assert.equal(blocks[0].type, 'list');
  assert.ok(blocks[0].raw.includes('- one'));
  assert.equal(blocks[1].type, 'para');
  assert.equal(blocks[2].type, 'quote');
});

test('renderBody — anchored insert lands after its block; null anchor leads; missing keeps alignment', () => {
  const anchor = 'SECONDBLOCK target sentence well over forty characters long for sure here.';
  const md = '- First intro block of the overview here.\n- ' + anchor;
  const html = renderBody(md, [
    { html: '<svg id="lead-null"></svg>', anchor: null },
    { html: '<svg id="after-anchor"></svg>', anchor },
  ]);
  assert.match(html, /diagrams-lead/);
  assert.ok(html.indexOf('lead-null') < html.indexOf('after-anchor'), 'leading before anchored');
  assert.ok(html.indexOf('after-anchor') > html.lastIndexOf(anchor.slice(0, 40)), 'anchored after its block');
  // a missing (falsy) earlier insert must not re-index the survivor onto the wrong anchor
  const gap = renderBody(md, [
    { html: '', anchor: null },
    { html: '<svg id="survivor"></svg>', anchor },
  ]);
  assert.ok(gap.indexOf('survivor') > gap.lastIndexOf(anchor.slice(0, 40)), 'survivor keeps its own anchor');
  // accepts a legacy plain-string insert too
  assert.match(renderBody('hello world', ['<svg id="s"></svg>']), /diagrams-lead/);
});

test('extractFacets — per-value counts across cards, array fields flattened, alpha-sorted', () => {
  const cards = [
    { kind: 'a', tags: ['x', 'y'] },
    { kind: 'b', tags: ['x'] },
    { kind: 'a', tags: [] },
  ];
  const { facets } = extractFacets(cards, [
    { key: 'kind', field: 'kind' },
    { key: 'tags', field: 'tags', array: true },
  ]);
  assert.deepEqual(facets.kind.values, [{ value: 'a', count: 2 }, { value: 'b', count: 1 }]);
  assert.deepEqual(facets.tags.values, [{ value: 'x', count: 2 }, { value: 'y', count: 1 }]);
});

test('buildIndex — maps raw records through a consumer adapter (pure)', () => {
  const cards = buildIndex([{ n: 'A' }, { n: 'B' }], (r, i) => ({ id: i, name: r.n.toLowerCase() }));
  assert.deepEqual(cards, [{ id: 0, name: 'a' }, { id: 1, name: 'b' }]);
  // identity adapter
  assert.deepEqual(buildIndex([{ x: 1 }]), [{ x: 1 }]);
});

test('filterEngine — OR within a facet, AND across facets, AND multi-token search', () => {
  const cards = [
    { name: 'RICE score', dt: 'prioritize', tags: ['prioritization'] },
    { name: 'Kano model', dt: 'prioritize', tags: ['satisfaction'] },
    { name: 'JTBD', dt: 'discovery', tags: ['research'] },
  ];
  const spec = { searchFields: ['name'], facets: [{ field: 'dt' }, { field: 'tags', array: true }] };
  // single facet, OR-within
  let out = filterEngine(cards, { q: '', facets: [{ field: 'dt', selected: { prioritize: true } }, { field: 'tags', selected: {} }] });
  assert.deepEqual(out.map((c) => c.name), ['RICE score', 'Kano model']);
  // AND across facets: prioritize AND tag=prioritization
  out = filterEngine(cards, { searchFields: ['name'], q: '', facets: [{ field: 'dt', selected: { prioritize: true } }, { field: 'tags', array: true, selected: { prioritization: true } }] });
  assert.deepEqual(out.map((c) => c.name), ['RICE score']);
  // multi-token AND search
  out = filterEngine(cards, { searchFields: ['name'], q: 'kano model', facets: [] });
  assert.deepEqual(out.map((c) => c.name), ['Kano model']);
  void spec;
});

test('sortGroups — alpha with trailing buckets pinned last', () => {
  assert.deepEqual(
    sortGroups(['Zeta', '(untagged)', 'Alpha', 'Uncategorized', 'Mid'], { trailing: ['Uncategorized', '(untagged)'] }),
    ['Alpha', 'Mid', 'Zeta', '(untagged)', 'Uncategorized'],
  );
});

test('emitHtml — single self-contained page with three views, facet UI, applied bar, reader', () => {
  const cards = buildIndex(
    [
      { id: 'a', name: 'Alpha', cat: 'One', kind: 'k1', tags: ['t1'], body: 'hello', summary: 'first' },
      { id: 'b', name: 'Beta', cat: 'Two', kind: 'k2', tags: ['t2'], body: 'world', summary: 'second' },
    ],
    (r) => ({
      id: r.id, name: r.name, category: r.cat, super_category: r.cat,
      kind: r.kind, tags: r.tags, summary: r.summary,
      thumb: '<svg id="th-' + r.id + '"></svg>',
      body_html: renderMarkdown(r.body),
    }),
  );
  const facetSpecs = [
    { key: 'kind', field: 'kind' },
    { key: 'tags', field: 'tags', array: true },
  ];
  const { facets } = extractFacets(cards, facetSpecs);
  const html = emitHtml({
    cards,
    facets: [
      { key: 'area', field: 'super_category', kind: 'single-select', label: 'group', allLabel: 'All groups', controlId: 'superFilter', values: extractFacets(cards, [{ key: 'area', field: 'super_category' }]).facets.area.values },
      { key: 'kind', field: 'kind', kind: 'multi-dropdown', triggerLabel: 'Kind', chipLabel: 'Kind', values: facets.kind.values },
      { key: 'tags', field: 'tags', array: true, kind: 'multi-dropdown', triggerLabel: 'Tags', chipLabel: 'Tag', search: true, values: facets.tags.values },
    ],
    config: {
      idField: 'id', nameField: 'name', summaryField: 'summary', categoryField: 'category',
      searchFields: ['name', 'summary'], thumbField: 'thumb', bodyHtmlField: 'body_html',
      groupBy: [{ value: 'category', label: 'Categories', field: 'category' }, { value: 'tags', label: 'Tags', field: 'tags', array: true }],
      defaultGroupValue: 'category',
      reader: { columns: [], refsField: 'references' },
    },
    masthead: { wordmark: 'PMOS', title: 'Test Library', subtitleTemplate: '{count} things' },
  });
  // self-contained — no external asset references
  assert.doesNotMatch(html, /<link[^>]+href="https?:/i, 'no external stylesheet');
  assert.doesNotMatch(html, /<script[^>]+src="https?:/i, 'no external script');
  assert.doesNotMatch(html, /<img\s/i, 'no <img> (assets inlined)');
  assert.doesNotMatch(html, /(href|src)="https?:\/\/[^"]*amazonaws/i, 'no S3 refs');
  // three views, list default + active
  assert.match(html, /data-view="compact"/);
  assert.match(html, /data-view="detailed"/);
  assert.match(html, /data-view="list"[^>]*class="active"/, 'list view default active');
  assert.match(html, /view: 'list'/, 'state.view defaults to list');
  // facet UI
  assert.match(html, /id="superFilter"/, 'single-select facet control');
  assert.match(html, /data-dd="kind"/, 'multi-dropdown facet trigger');
  assert.match(html, /id="tagSearch"|class="tag-search"/, 'searchable dropdown has a type-to-filter input');
  // applied bar + clear all + reader + masthead + dynamic count
  assert.match(html, /id="applied"/);
  assert.match(html, /data-clear-all/);
  assert.match(html, /<aside class="reader"/);
  assert.match(html, /class="wordmark">PMOS</);
  assert.match(html, /subtitleCount\.textContent=DATA\.length/, 'count from DATA.length at runtime');
  // debounced search + targeted selection (no perceived reload)
  assert.match(html, /searchDebounce/);
  assert.match(html, /function updateSelection/);
  // value labels stay raw value / display label remap is presentation-only
  assert.match(html, /id="subtitleCount"/);
});

test('emitHtml — value labels remap option display while keeping the raw value', () => {
  const cards = [{ id: 'a', name: 'A', category: 'Raw', super_category: 'Raw', summary: '', tags: [], body_html: '' }];
  const html = emitHtml({
    cards,
    facets: [{ key: 'area', field: 'super_category', kind: 'single-select', label: 'area', allLabel: 'All', controlId: 'superFilter', valueLabels: { Raw: 'Pretty' }, values: [{ value: 'Raw', count: 1 }] }],
    config: { idField: 'id', nameField: 'name', summaryField: 'summary', categoryField: 'category', searchFields: ['name'], groupBy: [{ value: 'category', label: 'Cats', field: 'category' }], defaultGroupValue: 'category', reader: { columns: [] } },
    masthead: { wordmark: 'PMOS', title: 'T', subtitleTemplate: '{count}' },
  });
  assert.match(html, /<option value="Raw">Pretty<\/option>/, 'display label remapped, raw value kept');
  assert.doesNotMatch(html, /<option value="Pretty"/, 'value stays raw');
});

test('emitHtml — emits a data: favicon so an offline page makes zero network requests', () => {
  const html = emitHtml({
    cards: [{ id: 'a', name: 'A', category: 'C', summary: '', tags: [], body_html: '' }],
    facets: [], config: { idField: 'id', nameField: 'name', categoryField: 'category', reader: { columns: [] } },
    masthead: { wordmark: 'PMOS', title: 'T', subtitleTemplate: '{count}' },
  });
  assert.match(html, /<link rel="icon" href="data:,">/, 'inline data: favicon present');
});

test('emitHtml — config.card hook: link-out titles + badge + metarow pills (default-off, skill-agnostic)', () => {
  const cards = [
    { id: 'c1', title: 'Curated One', category: 'Cat', collection: 'Curated', audience: 'PMs', depth: 'deep', sources_count: 5, word_count: 2400, date: '2026-01-02', href: 'data/primers/c1.html', exists: true },
    { id: 'y1', title: 'Yours One', category: 'Your primers', collection: 'Yours', date: '2026-01-01', href: '2026-01-01_x.html', exists: false },
  ];
  const html = emitHtml({
    cards,
    facets: [{ key: 'collection', field: 'collection', kind: 'single-select', controlId: 'f-collection', label: 'Collection', values: [{ value: 'Curated', count: 1 }, { value: 'Yours', count: 1 }] }],
    config: {
      idField: 'id', nameField: 'title', categoryField: 'category', summaryField: 'summary',
      searchFields: ['title', 'category'],
      views: [{ id: 'detailed', default: true }],
      groupBy: [{ value: 'collection', label: 'Collection', field: 'collection' }],
      defaultGroupValue: 'collection',
      reader: { columns: [] },
      card: {
        link: { hrefField: 'href', existsField: 'exists' },
        badge: { field: 'collection' },
        pills: [
          { field: 'audience', skip: ['—'] },
          { field: 'word_count', suffix: ' words', thousands: true },
          { whenFalse: 'exists', text: 'file missing', cls: 'warn' },
        ],
      },
    },
    masthead: { wordmark: 'PMOS', title: 'Primer Library', subtitleTemplate: '1 curated · 1 of yours' },
  });
  // the baked client config carries the normalized card hook
  assert.match(html, /"card":\{"link":\{"hrefField":"href","existsField":"exists"\}/, 'card.link plumbed into client config');
  assert.match(html, /"badge":\{"field":"collection"\}/, 'card.badge plumbed');
  // runtime helpers that drive link-out rendering are present
  assert.match(html, /function cardLinkOut\(\)/);
  assert.match(html, /function titleCell\(f, cls\)/);
  assert.match(html, /function cardBadge\(f\)/);
  assert.match(html, /function cardPills\(f\)/);
  // link-out cards do NOT intercept clicks for the in-page reader
  assert.match(html, /if\(cardLinkOut\(\)\) return; \/\/ titles are real/);
  // subtitle bakes the two-population string verbatim (no {count} placeholder needed)
  assert.match(html, /1 curated · 1 of yours/);
  // default-off: a config WITHOUT card normalizes to null (frameworks path unaffected)
  const plain = emitHtml({
    cards: [{ id: 'a', name: 'A', category: 'C', summary: '', tags: [], body_html: '' }],
    facets: [], config: { idField: 'id', nameField: 'name', categoryField: 'category', reader: { columns: [] } },
    masthead: { wordmark: 'PMOS', title: 'T', subtitleTemplate: '{count}' },
  });
  assert.match(plain, /"card":null/, 'no card config → card:null (back-compat)');
});
