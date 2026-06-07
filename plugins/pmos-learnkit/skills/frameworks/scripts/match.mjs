#!/usr/bin/env node
// match.mjs — deterministic problem → ranked frameworks prefilter + the --json
// contract. Zero-dep Node ESM. (See reference/matching.md.)
//
// Usage:
//   node match.mjs --query "<problem>" [--floor N] [--json] [--corpus <path>] [--top N]
//   node match.mjs --selftest
//
// Without --json: prints the top ~15 candidates (id, score) for an LLM re-rank.
// With --json: emits the FR-JSON contract object (cap ≤5) and nothing else to stdout.

import { readFileSync } from 'node:fs';
import { argv } from 'node:process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const STOPWORDS = new Set(('a an the of to for and or but in on at by with from is are be do does how what which '
  + 'when should i my we our you your this that it its as need want help me about into over under can could '
  + 'would will not no do dont them they their he she his her us').split(/\s+/));

export function tokenize(s) {
  return String(s)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t && t.length > 1 && !STOPWORDS.has(t));
}

export function scoreRecord(queryTokens, rec) {
  const q = new Set(queryTokens);
  if (q.size === 0) return 0;
  const tagTokens = new Set((rec.problem_tags || []).flatMap((t) => tokenize(t)));
  const nameTokens = new Set([...tokenize(rec.name || ''), ...(rec.aliases || []).flatMap((a) => tokenize(a))]);
  const ctxTokens = new Set([...tokenize(rec.when_to_use || ''), ...tokenize(rec.summary || '')]);
  let score = 0;
  for (const t of q) {
    if (tagTokens.has(t)) score += 3;
    else if (nameTokens.has(t)) score += 2;
    else if (ctxTokens.has(t)) score += 1;
  }
  // normalize by the max achievable for this query (every token a ×3 tag hit).
  return score / (q.size * 3);
}

export function match(query, records, { floor = 0.15, top = 15 } = {}) {
  const qt = tokenize(query);
  const scored = records
    .map((r) => ({ rec: r, score: scoreRecord(qt, r) }))
    .sort((a, b) => (b.score - a.score) || (a.rec.id < b.rec.id ? -1 : 1));
  const nonzero = scored.filter((s) => s.score > 0);
  const topScore = scored.length ? scored[0].score : 0;
  const low_confidence = topScore < floor;
  const pool = low_confidence ? scored.slice(0, 2) : nonzero.slice(0, top);
  return { low_confidence, topScore, candidates: pool };
}

function signalsFor(queryTokens, rec) {
  const q = new Set(queryTokens);
  const hits = [];
  for (const t of (rec.problem_tags || [])) if ([...q].some((x) => tokenize(t).includes(x))) hits.push(t);
  return hits.length ? `tags: ${hits.join(', ')}` : `name/context overlap`;
}

export function toJsonContract(query, records, { floor = 0.15 } = {}) {
  const qt = tokenize(query);
  const { low_confidence, candidates } = match(query, records, { floor, top: 15 });
  const cap = low_confidence ? 2 : 5;
  const matches = candidates.slice(0, cap).map(({ rec, score }) => ({
    id: rec.id,
    name: rec.name,
    why: low_confidence
      ? `low-confidence match (${signalsFor(qt, rec)})`
      : `matched on ${signalsFor(qt, rec)}`,
    score: +score.toFixed(4),
    category: rec.category || null,
    decision_type: rec.decision_type || 'n/a',
    diagram: rec.diagram || null,
  }));
  return { query, count: matches.length, low_confidence, matches };
}

// ---- selftest -------------------------------------------------------------
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const FIXTURE = [
  { id: 'product/rice', name: 'RICE', aliases: ['RICE scoring'], category: 'Product', decision_type: 'prioritization', diagram: 'data/diagrams/product__rice.svg', problem_tags: ['prioritization', 'roadmap'], when_to_use: 'When ranking features on a roadmap.', summary: 'Score features by reach impact confidence effort.' },
  { id: 'decision-making/regret-minimization', name: 'Regret Minimization', aliases: [], category: 'Decision Making', decision_type: 'judgment', diagram: null, problem_tags: ['irreversible-decision', 'high-stakes'], when_to_use: 'When facing a big irreversible life decision.', summary: 'Project to age 80 and minimize future regret.' },
  { id: 'product/kano', name: 'Kano Model', aliases: [], category: 'Product', decision_type: 'prioritization', diagram: 'data/diagrams/product__kano.svg', problem_tags: ['prioritization', 'user-satisfaction'], when_to_use: 'When classifying features by satisfaction.', summary: 'Classify features into basic performance delight.' },
];

function runSelftest() {
  // obvious prioritization query ranks a prioritization framework first
  const r = match('how should I prioritize features on my roadmap', FIXTURE, {});
  assert(!r.low_confidence, 'prioritization query should be confident');
  assert(['product/rice', 'product/kano'].includes(r.candidates[0].rec.id), `top should be a prioritization framework, got ${r.candidates[0].rec.id}`);

  // nonsense query → low confidence, ≤2 returned, never padded to 5
  const j = toJsonContract('zxqw flibber nonsense gibberish', FIXTURE, {});
  assert(j.low_confidence, 'nonsense should be low_confidence');
  assert(j.count <= 2, `low-confidence cap ≤2, got ${j.count}`);

  // json contract shape + cap ≤5 + score range
  const j2 = toJsonContract('irreversible high-stakes decision', FIXTURE, {});
  assert(j2.matches.length >= 1 && j2.matches.length <= 5, 'cap ≤5');
  assert(j2.matches[0].id === 'decision-making/regret-minimization', `regret-min should top, got ${j2.matches[0].id}`);
  for (const m of j2.matches) {
    assert(typeof m.id === 'string' && typeof m.name === 'string' && typeof m.why === 'string', 'match field types');
    assert(typeof m.score === 'number' && m.score >= 0 && m.score <= 1, `score in [0,1]: ${m.score}`);
    assert('diagram' in m && 'category' in m && 'decision_type' in m, 'required match keys');
  }
  // deterministic ordering: same input → same output
  const a = JSON.stringify(toJsonContract('prioritize roadmap', FIXTURE, {}));
  const b = JSON.stringify(toJsonContract('prioritize roadmap', FIXTURE, {}));
  assert(a === b, 'deterministic output');

  console.log('match --selftest: PASS (scorer + floor + json contract)');
}

function main() {
  const args = argv.slice(2);
  if (args.includes('--selftest')) {
    try { runSelftest(); } catch (e) { console.error(`match --selftest: FAIL — ${e.message}`); process.exit(1); }
    return;
  }
  const flag = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : null; };
  const query = flag('query');
  if (!query) { console.error('usage: match.mjs --query "<problem>" [--floor N] [--json] [--corpus <path>] [--top N]'); process.exit(64); }
  const here = dirname(fileURLToPath(import.meta.url));
  const corpusPath = flag('corpus') || join(here, '..', 'data', 'frameworks.json');
  const records = JSON.parse(readFileSync(corpusPath, 'utf8'));
  const floor = flag('floor') != null ? parseFloat(flag('floor')) : 0.15;
  if (args.includes('--json')) {
    process.stdout.write(JSON.stringify(toJsonContract(query, records, { floor })) + '\n');
  } else {
    const top = flag('top') != null ? parseInt(flag('top'), 10) : 15;
    const { low_confidence, candidates } = match(query, records, { floor, top });
    process.stdout.write(JSON.stringify({ low_confidence, candidates: candidates.map((c) => ({ id: c.rec.id, name: c.rec.name, score: +c.score.toFixed(4) })) }, null, 2) + '\n');
  }
}

if (argv[1] && fileURLToPath(import.meta.url) === argv[1]) {
  main();
}
