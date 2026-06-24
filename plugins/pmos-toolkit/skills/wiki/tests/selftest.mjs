#!/usr/bin/env node
// Script selftest for the /wiki engine (Story 260624-1e5).
// Pure Node stdlib, zero deps. Asserts the four helpers' frozen contracts (sidecar-schema.md)
// against tests/fixtures/corpus.sample.json. Authored FAIL-FIRST (T2): red against empty scripts/,
// turned green by T3 (hash) + T4 (stitch, queue) + T5 (retrieval).
//
// Exit 0 = all green; exit 1 = ≥1 assertion failed; exit 2 = harness/load error.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPTS = join(HERE, '..', 'scripts');
const FIXTURE = join(HERE, 'fixtures', 'corpus.sample.json');

let pass = 0;
const failures = [];
function ok(name, cond, detail = '') {
  if (cond) { pass++; }
  else { failures.push(`${name}${detail ? ' — ' + detail : ''}`); }
}
function eq(name, got, want) {
  ok(name, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
}

const corpus = JSON.parse(readFileSync(FIXTURE, 'utf8'));
const docs = corpus.docs;

let hash, stitch, queue, retrieval;
try {
  hash = await import(join(SCRIPTS, 'hash.mjs'));
  stitch = await import(join(SCRIPTS, 'stitch.mjs'));
  queue = await import(join(SCRIPTS, 'queue.mjs'));
  retrieval = await import(join(SCRIPTS, 'retrieval.mjs'));
} catch (e) {
  console.error('LOAD ERROR (expected red before T3–T5 land):', e.message);
  console.error('selftest: 0 passed, scripts not yet present');
  process.exit(2);
}

// ---------- hash.mjs (T3) ----------
{
  const a = { frontmatter: { title: 'X', last_edited: '2026-01-01', fetched_at: '2026-06-24T01:00:00Z' }, body: 'Hello   world\n\n\nfoo' };
  // same content, only fetched_at differs and whitespace differs -> SAME normalized hash
  const b = { frontmatter: { fetched_at: '2026-06-24T09:99:99Z', last_edited: '2026-01-01', title: 'X' }, body: 'Hello world\nfoo' };
  const c = { frontmatter: { title: 'X', last_edited: '2026-01-01' }, body: 'Hello world CHANGED' };
  const ha = hash.normalizedHash(a);
  const hb = hash.normalizedHash(b);
  const hc = hash.normalizedHash(c);
  ok('hash.normalizedHash returns hex string', typeof ha === 'string' && /^[0-9a-f]{32,}$/.test(ha), ha);
  ok('hash ignores fetch-ts + whitespace + key order (stable)', ha === hb, `${ha} vs ${hb}`);
  ok('hash changes when body content changes', ha !== hc);

  // two-factor drift: last_edited present on both
  const prevSame = { source_hash: ha, last_edited: '2026-01-01' };
  const v1 = hash.driftVerdict(prevSame, b); // last_edited equal -> not drifted (pre-filter)
  eq('drift two-factor: unchanged last_edited -> not drifted', v1.drifted, false);
  eq('drift two-factor: method label', v1.method, 'two-factor');

  const fresh2 = { ...b, last_edited: '2026-02-02' }; // last_edited changed but content identical
  const v2 = hash.driftVerdict({ source_hash: ha, last_edited: '2026-01-01' }, fresh2);
  eq('drift two-factor: last_edited changed but hash same -> NOT drifted', v2.drifted, false);

  const fresh3 = { ...c, last_edited: '2026-02-02' }; // last_edited changed AND content changed
  const v3 = hash.driftVerdict({ source_hash: ha, last_edited: '2026-01-01' }, fresh3);
  eq('drift two-factor: last_edited + content changed -> drifted', v3.drifted, true);

  // hash-only degrade: last_edited absent
  const v4 = hash.driftVerdict({ source_hash: ha, last_edited: null }, { ...b, last_edited: null });
  eq('drift hash-only: method label', v4.method, 'hash-only');
  eq('drift hash-only: identical content -> not drifted', v4.drifted, false);
  const v5 = hash.driftVerdict({ source_hash: ha, last_edited: null }, { ...c, last_edited: null });
  eq('drift hash-only: changed content -> drifted', v5.drifted, true);
}

// ---------- stitch.mjs (T4) ----------
{
  // multi-byte content (emoji + accented) to prove BYTE-exact (not lossy string) concat
  const original = Buffer.from('Overflow stitch: café ☕ — ' + 'x'.repeat(5000) + ' …end 🐝', 'utf8');
  const parts = stitch.splitBytes(original, 1000); // split at arbitrary byte boundaries (mid-codepoint)
  ok('stitch.splitBytes returns >1 part for large input', parts.length > 1, `${parts.length}`);
  const total = parts.reduce((n, p) => n + p.length, 0);
  eq('stitch.splitBytes preserves total byte length', total, original.length);
  const restored = stitch.stitch(parts);
  ok('stitch round-trips byte-exact', Buffer.compare(Buffer.from(restored), original) === 0);
  // accepts string parts too
  const r2 = stitch.stitch(['ab', 'cd', 'ef']);
  eq('stitch concatenates string parts', Buffer.from(r2).toString('utf8'), 'abcdef');
}

// ---------- queue.mjs (T4) ----------
{
  const items = [
    { id: 'big', size: 9000 },
    { id: 'tiny', size: 10 },
    { id: 'mid', size: 500 },
  ];
  const q = new queue.IngestQueue(items);
  eq('queue orders smallest-first', q.order(), ['tiny', 'mid', 'big']);

  // full run, checkpoint after each
  const processed = [];
  const checkpoints = [];
  const res = await q.run((it) => processed.push(it.id), { onCheckpoint: (s) => checkpoints.push(s.completed.slice()) });
  eq('queue.run processes smallest-first', processed, ['tiny', 'mid', 'big']);
  eq('queue.run marks done', res.done, true);
  eq('queue checkpoints after every item', checkpoints.length, 3);
  eq('queue final checkpoint = all ids', checkpoints[checkpoints.length - 1].sort(), ['big', 'mid', 'tiny']);

  // clean halt mid-run leaves a resumable snapshot, then resume to completion with NO dupes
  const all = [];
  let calls = 0;
  const q2 = new queue.IngestQueue(items);
  const r1 = await q2.run((it) => {
    calls++;
    if (it.id === 'mid') throw new queue.RateLimitHalt('rate limited');
    all.push(it.id);
  }, {});
  eq('queue halts cleanly', r1.halted, true);
  ok('queue halt snapshot is resumable', r1.snapshot && Array.isArray(r1.snapshot.completed));
  eq('queue processed tiny before halt at mid', all, ['tiny']);

  const q3 = new queue.IngestQueue(items, { state: r1.snapshot });
  const resumed = [];
  const r3 = await q3.run((it) => { calls++; resumed.push(it.id); }, {});
  eq('queue resume processes only remaining', resumed.sort(), ['big', 'mid']);
  eq('queue resume completes', r3.done, true);
  // tiny(1) + [tiny halt-call counts? no: tiny done, mid threw] : run1 = tiny ok + mid threw = 2 calls;
  // run2 = mid + big = 2 calls; total 4, and 'tiny' never reprocessed (no dupes)
  eq('queue no-dupes across resume (total process calls)', calls, 4);
}

// ---------- retrieval.mjs (T5) ----------
{
  const idx = retrieval.buildIndex(docs);
  ok('retrieval.buildIndex returns an index object', idx && typeof idx === 'object');

  const r = retrieval.search(idx, 'activation funnel retention', {});
  ok('retrieval.search returns ranked results', Array.isArray(r) && r.length > 0);
  eq('retrieval top hit is the onboarding hub', r[0].doc_id, 'hub-onboarding');
  ok('retrieval result carries a heading-path citation anchor', typeof r[0].anchor === 'string' && r[0].anchor.includes('#'), r[0].anchor);
  ok('retrieval anchor is scoped to the doc', r[0].anchor.startsWith('hub-onboarding'), r[0].anchor);
  ok('retrieval scores descending', r.every((x, i) => i === 0 || r[i - 1].score >= x.score));

  // workstream scoping
  const rp = retrieval.search(idx, 'conversion packaging', { workstream: 'pricing' });
  ok('retrieval workstream scope returns only that workstream', rp.every((x) => {
    const d = docs.find((dd) => dd.id === x.doc_id);
    return d && d.workstream === 'pricing';
  }), JSON.stringify(rp.map((x) => x.doc_id)));
  eq('retrieval workstream scope finds the pricing doc', rp[0] && rp[0].doc_id, 'pricing-2026-experiments');

  // index pins sidecar fields, not full body mirror: a term ONLY in body_md must not rank a doc
  // ('make dev' appears only in platform-readme body, which has null summary/sections)
  const rb = retrieval.search(idx, 'make dev env copy', { all: true });
  ok('retrieval does NOT index full body (sidecar-only)', !rb.some((x) => x.doc_id === 'platform-readme' && x.score > 0),
    JSON.stringify(rb));
}

// ---------- report ----------
if (failures.length) {
  console.error(`selftest: ${pass} passed, ${failures.length} FAILED`);
  for (const f of failures) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log(`selftest: ${pass} passed, 0 failed`);
process.exit(0);
