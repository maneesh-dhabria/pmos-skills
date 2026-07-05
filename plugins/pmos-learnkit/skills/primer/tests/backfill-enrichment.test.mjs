// backfill-enrichment.test.mjs — unit tests for the e3b lights-out backfill driver.
// Run: node --test
//
// Covers the driver's own deterministic surface (story 260704-e3b): the Node-native reachability
// verify (the D2 link-rot guard, with its url cache), the heuristic trust-tier assignment, the
// paywall flag, and primer discovery. The enrichment engine itself is tested by
// enrich-references.test.mjs (INV-1 — the driver imports, never re-implements, it).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeVerify, tierFor, isPaywalled, findPrimers } from '../scripts/backfill-enrichment.mjs';

// ---- verify (reachability re-check + cache) ---------------------------------

function stubFetch(map) {
  // map: url -> {ok, status} | throws when url absent (network error)
  return async (url) => {
    if (!(url in map)) throw new Error(`network error: ${url}`);
    const { ok = true, status = 200 } = map[url];
    return { ok, status, async text() { return ''; } };
  };
}

test('verify admits a reachable candidate with corpus takeaway + heuristic tier', async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = stubFetch({ 'https://arxiv.org/abs/1706.03762': { ok: true, status: 200 } });
  try {
    const verify = makeVerify({});
    const out = await verify({ url: 'https://arxiv.org/abs/1706.03762', title: 'Attention', summary: 'Grounded takeaway.', source_type: 'paper' });
    assert.equal(out.url, 'https://arxiv.org/abs/1706.03762');
    assert.equal(out.tier, 'T1'); // arxiv.org / paper
    assert.equal(out.takeaway, 'Grounded takeaway.');
    assert.equal(out.paywalled, false);
  } finally { globalThis.fetch = orig; }
});

test('verify drops an unreachable (404) candidate — the link-rot guard', async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = stubFetch({ 'https://dead.example/gone': { ok: false, status: 404 } });
  try {
    const verify = makeVerify({});
    assert.equal(await verify({ url: 'https://dead.example/gone', title: 't' }), null);
  } finally { globalThis.fetch = orig; }
});

test('verify drops a candidate whose fetch throws (network error)', async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = stubFetch({}); // any url -> throws
  try {
    const verify = makeVerify({});
    assert.equal(await verify({ url: 'https://unresolvable.invalid/x', title: 't' }), null);
  } finally { globalThis.fetch = orig; }
});

test('verify caches by url — the same url is fetched at most once across candidates', async () => {
  const orig = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return { ok: true, status: 200, async text() { return ''; } }; };
  try {
    const stats = { fetched: 0, dropped: 0 };
    const verify = makeVerify({ stats });
    await verify({ url: 'https://x.example/a', summary: 's' });
    await verify({ url: 'https://x.example/a', summary: 's' }); // second time — served from cache
    assert.equal(calls, 1, 'network hit once');
    assert.equal(stats.fetched, 1, 'stats count unique fetches only');
  } finally { globalThis.fetch = orig; }
});

test('verify falls back to title when the corpus record has no summary', async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = stubFetch({ 'https://x.example/notitle': { ok: true } });
  try {
    const verify = makeVerify({});
    const out = await verify({ url: 'https://x.example/notitle', title: 'Just a title' });
    assert.equal(out.takeaway, 'Just a title');
  } finally { globalThis.fetch = orig; }
});

// ---- tier heuristic ---------------------------------------------------------

test('tierFor: primary sources (paper / gov / docs host) → T1', () => {
  assert.equal(tierFor({ url: 'https://arxiv.org/x', source_type: 'article' }), 'T1');
  assert.equal(tierFor({ url: 'https://nist.gov/x', source_type: '' }), 'T1');
  assert.equal(tierFor({ url: 'https://example.com/x', source_type: 'documentation' }), 'T1');
});

test('tierFor: practitioner hosts (substack/medium/github) → T2', () => {
  assert.equal(tierFor({ url: 'https://foo.substack.com/p/x', source_type: '' }), 'T2');
  assert.equal(tierFor({ url: 'https://medium.com/@a/x', source_type: '' }), 'T2');
});

test('tierFor: reputable publications → T3; unknown reachable → T4', () => {
  assert.equal(tierFor({ url: 'https://hbr.org/2020/x', source_type: 'article' }), 'T3');
  assert.equal(tierFor({ url: 'https://some-random-blog.example/x', source_type: '' }), 'T4');
});

test('isPaywalled flags known paywall hosts', () => {
  assert.equal(isPaywalled('https://www.wsj.com/articles/x'), true);
  assert.equal(isPaywalled('https://arxiv.org/abs/x'), false);
});

// ---- primer discovery -------------------------------------------------------

test('findPrimers lists *.html sorted, excluding library.html and *.sources.json', () => {
  const dir = mkdtempSync(join(tmpdir(), 'primers-'));
  for (const f of ['b.html', 'a.html', 'library.html', 'a.sources.json']) writeFileSync(join(dir, f), '<html></html>');
  const found = findPrimers(dir).map((p) => p.name);
  assert.deepEqual(found, ['a.html', 'b.html']);
  const a = findPrimers(dir).find((p) => p.name === 'a.html');
  assert.ok(a.sourcesPath.endsWith('a.sources.json'));
});
