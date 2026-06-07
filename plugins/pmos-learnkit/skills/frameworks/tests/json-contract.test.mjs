#!/usr/bin/env node
// json-contract.test.mjs — FR-JSON-1/2/3: assert the --json contract shape over a
// fixture corpus. This is the "proven contract" standing in for a live consumer.
import { toJsonContract } from '../scripts/match.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const corpus = JSON.parse(readFileSync(join(here, 'fixtures', 'mini-corpus.json'), 'utf8'));
let failures = 0;
const check = (cond, msg) => { if (!cond) { console.error(`  FAIL: ${msg}`); failures++; } };

const TOP_KEYS = ['query', 'count', 'low_confidence', 'matches'];
const MATCH_KEYS = ['id', 'name', 'why', 'score', 'category', 'decision_type', 'diagram'];

function assertShape(obj, query) {
  check(TOP_KEYS.every((k) => k in obj), `top-level keys present for "${query}"`);
  check(obj.query === query, 'query echoed');
  check(typeof obj.low_confidence === 'boolean', 'low_confidence boolean');
  check(Array.isArray(obj.matches), 'matches is array');
  check(obj.count === obj.matches.length, 'count == matches.length');
  check(obj.matches.length <= 5, `cap ≤5 (got ${obj.matches.length})`);
  if (obj.low_confidence) check(obj.matches.length <= 2, 'low_confidence cap ≤2');
  for (const m of obj.matches) {
    check(MATCH_KEYS.every((k) => k in m), 'match keys present');
    check(typeof m.id === 'string' && typeof m.name === 'string' && typeof m.why === 'string', 'string fields');
    check(typeof m.score === 'number' && m.score >= 0 && m.score <= 1, `score in [0,1]: ${m.score}`);
    check(m.diagram === null || typeof m.diagram === 'string', 'diagram string|null');
  }
}

// confident query
const a = toJsonContract('how do I prioritize my product roadmap', corpus, {});
assertShape(a, 'how do I prioritize my product roadmap');
check(a.matches[0].id.startsWith('product/'), `prioritization query tops a product framework: ${a.matches[0].id}`);
check(!a.low_confidence, 'roadmap query confident');

// low-confidence query
const b = toJsonContract('xyzzy plugh frobnicate', corpus, {});
assertShape(b, 'xyzzy plugh frobnicate');
check(b.low_confidence, 'nonsense low_confidence');

// JSON-only / round-trips cleanly through JSON.parse(JSON.stringify(...))
const c = toJsonContract('irreversible decision', corpus, {});
check(JSON.stringify(c) === JSON.stringify(JSON.parse(JSON.stringify(c))), 'serializes to pure JSON');

if (failures) { console.error(`json-contract.test: ${failures} FAILED`); process.exit(1); }
console.log('json-contract.test: PASS (FR-JSON shape over fixture corpus)');
