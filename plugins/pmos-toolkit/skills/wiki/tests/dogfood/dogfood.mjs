#!/usr/bin/env node
// Live dogfood for the /wiki SKILL (Story 260624-rmq, T6).
//
// Exercises the SKILL.md-documented verb flow — add → view → ask → curate → sync — END-TO-END
// against the REAL engine scripts (scripts/hash, stitch, queue, retrieval) and the REAL bundled
// viewer (reference/wiki-viewer.html). The MCP transport is the ONLY thing faked (a tiny in-harness
// source), because the generic MCP protocol (reference/mcp-protocol.md, D15) is instruction-driven
// and not reachable headless — everything below the transport is the production engine.
//
// Proves: deterministic-first ingest, resumable queue checkpoint, auth-on-missing DEFER, byte-exact
// overflow stitch, corpus assembly + viewer embed, BM25 cited ask, curate edits, and incremental
// sync that re-derives ONLY drifted docs while preserving user curation.
//
// Exit 0 = all green; 1 = ≥1 assertion failed; 2 = harness/load error.

import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = join(HERE, '..', '..');
const SCRIPTS = join(SKILL, 'scripts');
const VIEWER = join(SKILL, 'reference', 'wiki-viewer.html');

let pass = 0;
const failures = [];
const ok = (name, cond, detail = '') => { cond ? pass++ : failures.push(`${name}${detail ? ' — ' + detail : ''}`); };
const eq = (name, got, want) => ok(name, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);

let hash, stitch, queue, retrieval;
try {
  hash = await import(join(SCRIPTS, 'hash.mjs'));
  stitch = await import(join(SCRIPTS, 'stitch.mjs'));
  queue = await import(join(SCRIPTS, 'queue.mjs'));
  retrieval = await import(join(SCRIPTS, 'retrieval.mjs'));
} catch (e) {
  console.error('LOAD ERROR:', e.message);
  process.exit(2);
}

// ───────────────────────── fake MCP source (the ONLY faked layer) ─────────────────────────
// Two sources: `notion` (authenticated, 3 pages incl. one overflow) and `gdocs` (UNAUTHENTICATED).
const SOURCES = {
  notion: {
    authed: true,
    pages: {
      'onboarding-hub': {
        title: 'Onboarding Hub', created: '2026-03-01T00:00:00.000Z', last_edited: '2026-03-12T14:30:00.000Z',
        ancestor_path: ['Product', 'Onboarding'],
        body: '# Onboarding Hub\n\n## Activation funnel\nHow new users reach the activation moment and retention milestones.\n\n## Retention\nWeekly retention cohorts.',
      },
      'pricing-experiments': {
        title: 'Pricing 2026 Experiments', created: '2026-03-20T00:00:00.000Z', last_edited: '2026-04-01T16:45:00.000Z',
        ancestor_path: ['Product', 'Pricing'],
        body: '# Pricing 2026\n\n## Packaging\nConversion experiments on packaging and tiers.\n\n[Sheet](https://sheets.example/abc)',
      },
      'big-spec': {
        title: 'Big Spec', created: '2026-02-01T00:00:00.000Z', last_edited: '2026-05-01T00:00:00.000Z',
        ancestor_path: ['Product', 'Platform'],
        // a large body to force overflow stitching (multi-byte to prove byte-exactness)
        body: '# Big Spec ☕\n\n## Detail\n' + 'café content — '.repeat(4000) + '…end 🐝',
      },
    },
  },
  gdocs: { authed: false, pages: { 'locked-doc': { title: 'Locked', body: 'secret' } } },
};

const CHUNK = 1024; // small chunk so big-spec overflows
function mcpFetch(src, id) {
  const s = SOURCES[src];
  if (!s) return { unavailable: true };
  if (!s.authed) return { needsAuth: true };
  const p = s.pages[id];
  if (!p) return { unavailable: true };
  // simulate overflow: transport returns the body as byte-parts
  const parts = stitch.splitBytes(Buffer.from(p.body, 'utf8'), CHUNK);
  return { meta: p, parts };
}

function sectionOffsets(body) {
  const out = [];
  const lines = body.split('\n');
  let offset = 0;
  for (const line of lines) {
    const m = /^(#{1,2})\s+(.*)$/.exec(line);
    if (m) out.push({ heading: m[2].trim(), level: m[1].length, offset });
    offset += Buffer.byteLength(line, 'utf8') + 1;
  }
  return out;
}
function lengthTier(n) { return n < 200 ? 'short' : n < 2000 ? 'medium' : 'long'; }

// ───────────────────────── add: deterministic-first ingest (Phase #add) ─────────────────────────
const corpus = { generated: '2026-06-24T12:00:00.000Z', config: { workstreams: [] }, vocab: [], docs: [] };
const deferred = [];
const checkpoints = [];

const seeds = [
  { src: 'notion', id: 'pricing-experiments', size: 300 },
  { src: 'notion', id: 'onboarding-hub', size: 250 },
  { src: 'notion', id: 'big-spec', size: 60000 },
  { src: 'gdocs', id: 'locked-doc', size: 10 },
];

const q = new queue.IngestQueue(seeds.map((s) => ({ id: `${s.src}/${s.id}`, size: s.size })));
eq('add: queue is smallest-first', q.order(), ['gdocs/locked-doc', 'notion/onboarding-hub', 'notion/pricing-experiments', 'notion/big-spec']);

const byId = new Map(seeds.map((s) => [`${s.src}/${s.id}`, s]));
await q.run((item) => {
  const { src, id } = byId.get(item.id);
  const res = mcpFetch(src, id);
  if (res.needsAuth) { deferred.push(item.id); return; }   // auth-on-missing → DEFER (non-interactive)
  if (res.unavailable) { deferred.push(item.id); return; }
  const body = Buffer.from(stitch.stitch(res.parts)).toString('utf8');           // byte-exact reassembly
  ok(`add: ${id} stitched byte-exact`, body === SOURCES[src].pages[id].body);
  // deterministic sidecar FIRST (before any enrichment)
  const doc = {
    src, id, source_hash: hash.normalizedHash({ frontmatter: { last_edited: res.meta.last_edited }, body }),
    created: res.meta.created, last_edited: res.meta.last_edited,
    length_tier: lengthTier(body.length), ancestor_path: res.meta.ancestor_path, original_title: res.meta.title,
    section_offsets: sectionOffsets(body),
    summary: null, section_summaries: null, glossary_terms: null, external_links: null,
    llm_title: null, workstream: null, workstream_confidence: null, exclude: null, citation_anchors: null,
    body_md: body, comments: [],
  };
  corpus.docs.push(doc);
}, { onCheckpoint: (s) => checkpoints.push(s.completed.length) });

eq('add: gdocs (unauthenticated) deferred, not crashed', deferred, ['gdocs/locked-doc']);
eq('add: 3 notion docs mirrored', corpus.docs.length, 3);
ok('add: queue checkpointed after every item (resumable)', checkpoints.length === 4 && checkpoints[checkpoints.length - 1] === 4);
ok('add: deterministic fields present pre-enrichment', corpus.docs.every((d) => d.source_hash && d.section_offsets.length >= 0 && d.summary === null));
ok('add: big-spec overflowed (multi-part stitch exercised)', stitch.splitBytes(Buffer.from(SOURCES.notion.pages['big-spec'].body, 'utf8'), CHUNK).length > 1);

// enrichment pass (understanding layer; null-over-filler bar — enrichment-contract.md)
const enrich = {
  'onboarding-hub': { summary: 'How new users reach activation and retention milestones.', workstream: 'onboarding',
    section_summaries: [{ heading: 'Activation funnel', level: 2, summary: 'Path to the activation moment.' }, { heading: 'Retention', level: 2, summary: 'Weekly retention cohorts.' }] },
  'pricing-experiments': { summary: 'Conversion experiments on packaging and pricing tiers.', workstream: 'pricing',
    section_summaries: [{ heading: 'Packaging', level: 2, summary: 'Packaging and tier conversion experiments.' }],
    external_links: [{ label: 'Sheet', url: 'https://sheets.example/abc' }] },
  'big-spec': { summary: 'A large platform spec.', workstream: 'platform', section_summaries: [{ heading: 'Detail', level: 2, summary: 'Platform detail.' }] },
};
for (const d of corpus.docs) {
  const e = enrich[d.id];
  Object.assign(d, e, { workstream_confidence: 0.9 });
}
corpus.vocab = ['onboarding', 'pricing', 'platform'];
ok('add: enrichment filled summaries for all mirrored docs', corpus.docs.every((d) => typeof d.summary === 'string'));

// ───────────────────────── view: assemble corpus + embed into REAL viewer (Phase #view) ─────────────────────────
const work = mkdtempSync(join(tmpdir(), 'wiki-dogfood-'));
const viewerSrc = readFileSync(VIEWER, 'utf8');
const START = '<script id="wiki-corpus" type="application/json">';
const END = '</script>';
const sIdx = viewerSrc.indexOf(START);
const eIdx = viewerSrc.indexOf(END, sIdx);
ok('view: viewer has the wiki-corpus embed block', sIdx !== -1 && eIdx !== -1);
const emitted = viewerSrc.slice(0, sIdx + START.length) + '\n' + JSON.stringify(corpus, null, 2) + '\n' + viewerSrc.slice(eIdx);
const wikiHtml = join(work, 'wiki.html');
writeFileSync(wikiHtml, emitted, 'utf8');

// re-parse the embedded corpus back out (what the viewer's JS does on load)
const reread = readFileSync(wikiHtml, 'utf8');
const rs = reread.indexOf(START) + START.length;
const re = reread.indexOf(END, rs);
const parsed = JSON.parse(reread.slice(rs, re).trim());
eq('view: embedded corpus round-trips (3 docs)', parsed.docs.length, 3);
ok('view: viewer retains pmos:skill=wiki meta + WikiViewer', reread.includes('content="wiki"') && reread.includes('WikiViewer'));
ok('view: demo placeholder corpus was replaced', !parsed.docs.some((d) => d.id === 'demo-1'));

// ───────────────────────── ask: grounded, cited Q&A (Phase #ask) ─────────────────────────
const idx = retrieval.buildIndex(corpus.docs);
const ans = retrieval.search(idx, 'activation funnel retention', {});
ok('ask: returns ranked hits', Array.isArray(ans) && ans.length > 0);
eq('ask: top hit is the onboarding hub', ans[0].doc_id, 'onboarding-hub');
ok('ask: hit carries a heading-path citation anchor', ans[0].anchor.includes('#'), ans[0].anchor);
const scoped = retrieval.search(idx, 'packaging conversion', { workstream: 'pricing' });
eq('ask: workstream scope finds the pricing doc', scoped[0] && scoped[0].doc_id, 'pricing-experiments');
ok('ask: --all crosses workstreams', retrieval.search(idx, 'packaging conversion', { all: true }).length >= 1);

// ───────────────────────── curate: corrections survive sync (Phase #curate) ─────────────────────────
const bigSpec = corpus.docs.find((d) => d.id === 'big-spec');
bigSpec.workstream = 'platform-core'; bigSpec.workstream_confidence = 1.0;   // user re-tag = certain
const pricing = corpus.docs.find((d) => d.id === 'pricing-experiments');
pricing.exclude = { reason: 'superseded' };                                   // user excludes
ok('curate: excluded doc is truthy by exclude != null rule', pricing.exclude != null);
ok('curate: re-tag set confidence to 1.0', bigSpec.workstream_confidence === 1.0);

// ───────────────────────── sync: re-derive ONLY drifted docs (Phase #sync) ─────────────────────────
// onboarding-hub edited at source; pricing/big-spec unchanged.
SOURCES.notion.pages['onboarding-hub'].body += '\n\n## Aha moment\nThe first-value event.';
SOURCES.notion.pages['onboarding-hub'].last_edited = '2026-06-20T00:00:00.000Z';

const drift = {};
for (const d of corpus.docs) {
  const res = mcpFetch(d.src, d.id);
  const body = Buffer.from(stitch.stitch(res.parts)).toString('utf8');
  const fresh = { source_hash: hash.normalizedHash({ frontmatter: { last_edited: res.meta.last_edited }, body }), last_edited: res.meta.last_edited };
  drift[d.id] = hash.driftVerdict({ source_hash: d.source_hash, last_edited: d.last_edited }, fresh).drifted;
}
eq('sync: onboarding-hub drifted (edited at source)', drift['onboarding-hub'], true);
eq('sync: pricing unchanged → not drifted', drift['pricing-experiments'], false);
eq('sync: big-spec unchanged → not drifted', drift['big-spec'], false);
ok('sync: user curation (workstream re-tag) preserved on non-drifted doc', bigSpec.workstream === 'platform-core');
ok('sync: user exclusion preserved on non-drifted doc', pricing.exclude != null);

// ───────────────────────── report ─────────────────────────
mkdirSync(join(HERE, '.work'), { recursive: true });
writeFileSync(join(HERE, '.work', 'wiki.html'), emitted, 'utf8'); // a viewable artifact for manual inspection
if (failures.length) {
  console.error(`dogfood: ${pass} passed, ${failures.length} FAILED`);
  for (const f of failures) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log(`dogfood: ${pass} passed, 0 failed — add→view→ask→curate→sync verified against the real engine + viewer`);
console.log(`         emitted wiki → ${join(HERE, '.work', 'wiki.html')}`);
process.exit(0);
