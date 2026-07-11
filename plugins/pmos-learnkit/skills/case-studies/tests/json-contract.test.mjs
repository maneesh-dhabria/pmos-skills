#!/usr/bin/env node
// json-contract.test.mjs — proves match.mjs's --json contract over a fixture corpus (D4, INV-5,
// AC5). Runs the ACTUAL CLI (stdout-only discipline) and also imports toJsonContract for shape
// assertions. Zero-dep Node ESM. Deterministic; run ≥2×.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { toJsonContract } from '../scripts/match.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const MATCH = join(HERE, '..', 'scripts', 'match.mjs');
const CORPUS = join(HERE, 'fixtures', 'mini-corpus.json');
const records = JSON.parse(readFileSync(CORPUS, 'utf8'));

let fail = 0;
const ok = (m) => console.log('  ok:', m);
const assert = (c, m) => { if (!c) { console.error('  FAIL:', m); fail = 1; } else ok(m); };

function runJson(query, extra = []) {
  const out = execFileSync('node', [MATCH, '--query', query, '--json', '--corpus', CORPUS, ...extra], { encoding: 'utf8' });
  // --json prints EXACTLY one object and nothing else — the whole stdout must parse as one JSON value.
  return JSON.parse(out);
}

// 1) CLI stdout is exactly one JSON object, no prose
const j = runJson('pricing strategy');
assert(typeof j === 'object' && j !== null && !Array.isArray(j), 'CLI --json emits a single JSON object');
assert(j.query === 'pricing strategy', 'query echoed');
assert(typeof j.count === 'number' && j.count === j.matches.length, 'count == matches.length');
assert(j.count <= 5, `count ≤5 (got ${j.count})`);
assert(j.low_confidence === false, 'confident query is not low_confidence');
assert(j.reranked === false, 'script alone emits reranked:false');

// 2) every match has the exact contract keys + bounds + url always present
for (const m of j.matches) {
  assert(typeof m.id === 'string' && typeof m.title === 'string' && typeof m.company === 'string' && typeof m.why === 'string', `string fields on ${m.id}`);
  assert(typeof m.score === 'number' && m.score >= 0 && m.score <= 1, `score ∈ [0,1] on ${m.id} (${m.score})`);
  assert('pillar' in m && Array.isArray(m.topics), `pillar + topics[] on ${m.id}`);
  assert(typeof m.url === 'string' && m.url.length > 0, `url always present on ${m.id}`);
}
// pricing query should surface a pricing study first, id-tie-broken deterministically
assert(j.matches[0].id === 'acme-pricing-flip', `top pick is acme-pricing-flip (id tie-break), got ${j.matches[0].id}`);

// 3) nonsense query → empty pool, low_confidence, never fabricated
const n = runJson('zxqw flibber nonsense gibberish');
assert(n.count === 0 && n.matches.length === 0, 'nonsense query returns 0 matches');
assert(n.low_confidence === true, 'nonsense query is low_confidence');

// 4) low_confidence caps output ≤2 (high floor forces it)
const lc = runJson('pricing onboarding activation', ['--floor', '0.99']);
assert(lc.low_confidence === true, 'high floor flags low_confidence');
assert(lc.count <= 2, `low_confidence caps output ≤2 (got ${lc.count})`);

// 5) imported toJsonContract matches the CLI output byte-for-byte (same contract, both paths)
const direct = toJsonContract('pricing strategy', records, {});
assert(JSON.stringify(direct) === JSON.stringify(j), 'imported toJsonContract == CLI --json output');

if (fail) { console.error('json-contract.test.mjs: FAILED'); process.exit(1); }
console.log('json-contract.test.mjs: PASS (--json contract shape, cap, bounds, url-present, empty-pool)');
