#!/usr/bin/env node
// match.mjs — deterministic topic → ranked case-studies prefilter + the --json contract.
// Zero-dep Node ESM. (See reference/matching.md.)
//
// Usage:
//   node match.mjs --query "<topic>" [--floor N] [--json] [--corpus <path>] [--top N]
//   node match.mjs --selftest
//
// Without --json: prints the full nonzero candidate pool (≤ --top) for an in-session LLM
// re-rank (the chat retrieve path). With --json: emits the FR-JSON contract object (cap ≤5;
// reranked:false) and nothing else to stdout — no prose, no library open. (D4, INV-5.)

import { readFileSync } from 'node:fs';
import { argv } from 'node:process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const STOPWORDS = new Set(('a an the of to for and or but in on at by with from is are be do does how what which '
  + 'when should i my we our you your this that it its as need want help me about into over under can could '
  + 'would will not no dont them they their he she his her us did done get got use using used case study studies').split(/\s+/));

export function tokenize(s) {
  return String(s)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t && t.length > 1 && !STOPWORDS.has(t));
}

// weights: a query token landing in the record's topics is the strongest signal (×3); the
// title or company name is next (×2); the curated abstract / what-they-built prose is the
// weakest but still useful context (×1). First hit per token wins (topics beats title beats
// prose) so a token never double-counts.
export function scoreRecord(queryTokens, rec) {
  const q = new Set(queryTokens);
  if (q.size === 0) return 0;
  const topicTokens = new Set((rec.topics || []).flatMap((t) => tokenize(t)));
  const nameTokens = new Set([...tokenize(rec.title || ''), ...tokenize(rec.company || '')]);
  const ctxTokens = new Set([...tokenize(rec.summary || ''), ...tokenize(rec.what_they_built || '')]);
  let score = 0;
  for (const t of q) {
    if (topicTokens.has(t)) score += 3;
    else if (nameTokens.has(t)) score += 2;
    else if (ctxTokens.has(t)) score += 1;
  }
  // normalize by the max achievable for an *effective* query of ≤6 tokens (every token a ×3
  // topic hit), clamped to [0,1]. Capping the denominator keeps verbose, natural topic
  // statements — the input style the skill invites — from being punished for their length.
  return Math.min(1, score / (Math.min(q.size, 6) * 3));
}

export function match(query, records, { floor = 0.15, top = 15 } = {}) {
  const qt = tokenize(query);
  const scored = records
    .map((r) => ({ rec: r, score: scoreRecord(qt, r) }))
    .sort((a, b) => (b.score - a.score) || (a.rec.id < b.rec.id ? -1 : 1));
  const nonzero = scored.filter((s) => s.score > 0);
  const topScore = nonzero.length ? nonzero[0].score : 0;
  const low_confidence = topScore < floor;
  // low_confidence caps the *output* (≤2, applied by callers / toJsonContract), never the
  // candidate pool — the in-session re-rank must see the full pool to rescue a verbose query
  // the bag-of-words scorer under-rated. Zero-score records are never returned: pure-nonsense
  // input yields an empty pool, not fabricated matches.
  return { low_confidence, topScore, candidates: nonzero.slice(0, top) };
}

function signalsFor(queryTokens, rec) {
  const q = new Set(queryTokens);
  const hits = [];
  for (const t of (rec.topics || [])) if ([...q].some((x) => tokenize(t).includes(x))) hits.push(t);
  return hits.length ? `topics: ${hits.join(', ')}` : `title/company/abstract overlap`;
}

export function toJsonContract(query, records, { floor = 0.15 } = {}) {
  const qt = tokenize(query);
  const { low_confidence, candidates } = match(query, records, { floor, top: 15 });
  const cap = low_confidence ? 2 : 5;
  const matches = candidates.slice(0, cap).map(({ rec, score }) => ({
    id: rec.id,
    title: rec.title || '(untitled)',
    company: rec.company || '',
    why: low_confidence
      ? `low-confidence match (${signalsFor(qt, rec)})`
      : `matched on ${signalsFor(qt, rec)}`,
    score: +score.toFixed(4),
    pillar: rec.pillar || null,
    topics: Array.isArray(rec.topics) ? rec.topics : [],
    url: rec.url || '',
  }));
  // reranked:false = deterministic prefilter answer. An in-session agent that re-ranks before
  // returning the object sets reranked:true (see reference/matching.md).
  return { query, count: matches.length, low_confidence, reranked: false, matches };
}

// ---- selftest -------------------------------------------------------------
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const FIXTURE = [
  { id: 'acme-pricing-flip', title: 'Acme flips to flat pricing', company: 'Acme', pillar: 'business-model', topics: ['pricing-strategy', 'packaging'], summary: 'Acme scrapped tiered pricing for a single flat plan.', what_they_built: 'A flat monthly plan.', url: 'https://example.com/acme' },
  { id: 'globex-onboarding-rebuild', title: 'Globex rebuilds onboarding', company: 'Globex', pillar: 'core-pm-craft', topics: ['onboarding', 'activation'], summary: 'Globex reduced signup friction.', what_they_built: 'A three-step wizard.', url: 'https://example.com/globex' },
  { id: 'initech-pricing-experiment', title: 'Initech pricing experiments', company: 'Initech', pillar: 'business-model', topics: ['pricing-strategy', 'experimentation'], summary: 'Initech ran pricing A/B tests.', what_they_built: 'A pricing experiment framework.', url: 'https://example.com/initech' },
];

function runSelftest() {
  // obvious topic query ranks a pricing case study first, tie-broken by id
  const r = match('how did companies change their pricing strategy', FIXTURE, {});
  assert(!r.low_confidence, 'pricing query should be confident');
  assert(r.candidates[0].rec.id === 'acme-pricing-flip', `top should be acme (id tie-break), got ${r.candidates[0].rec.id}`);

  // nonsense query → low confidence, zero-score records excluded — count 0, never fabricated
  const j = toJsonContract('zxqw flibber nonsense gibberish', FIXTURE, {});
  assert(j.low_confidence, 'nonsense should be low_confidence');
  assert(j.count === 0, `zero-score records must be excluded — nonsense returns 0 matches, got ${j.count}`);

  // verbose natural topic statement → still clears the floor (length-insensitive denominator)
  const v = match('we are a saas company and i want to see how other teams approached pricing strategy and packaging decisions', FIXTURE, {});
  assert(!v.low_confidence, 'verbose realistic query should not trip the confidence floor');

  // low_confidence keeps the full nonzero pool for the re-rank; only the JSON output is capped ≤2
  const lc = match('pricing onboarding activation experimentation', FIXTURE, { floor: 0.99 });
  assert(lc.low_confidence, 'high floor should flag low_confidence');
  assert(lc.candidates.length === 3, `low_confidence must keep the full nonzero pool (3), got ${lc.candidates.length}`);
  const lcj = toJsonContract('pricing onboarding activation experimentation', FIXTURE, { floor: 0.99 });
  assert(lcj.count <= 2, `json output cap ≤2 under low confidence, got ${lcj.count}`);

  // json contract shape + cap ≤5 + score range + required keys + url always present
  const j2 = toJsonContract('pricing strategy', FIXTURE, {});
  assert(j2.matches.length >= 1 && j2.matches.length <= 5, 'cap ≤5');
  assert(j2.reranked === false, 'deterministic path emits reranked:false');
  assert(j2.count === j2.matches.length, 'count == matches length');
  for (const m of j2.matches) {
    assert(typeof m.id === 'string' && typeof m.title === 'string' && typeof m.company === 'string' && typeof m.why === 'string', 'match string field types');
    assert(typeof m.score === 'number' && m.score >= 0 && m.score <= 1, `score in [0,1]: ${m.score}`);
    assert('pillar' in m && Array.isArray(m.topics), 'pillar + topics keys present');
    assert(typeof m.url === 'string' && m.url.length > 0, 'url always present and non-empty');
  }
  // deterministic ordering: same input → same output
  const a = JSON.stringify(toJsonContract('pricing strategy', FIXTURE, {}));
  const b = JSON.stringify(toJsonContract('pricing strategy', FIXTURE, {}));
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
  if (!query) { console.error('usage: match.mjs --query "<topic>" [--floor N] [--json] [--corpus <path>] [--top N]'); process.exit(64); }
  const here = dirname(fileURLToPath(import.meta.url));
  const corpusPath = flag('corpus') || join(here, '..', 'data', 'case-studies.json');
  const records = JSON.parse(readFileSync(corpusPath, 'utf8'));
  const floor = flag('floor') != null ? parseFloat(flag('floor')) : 0.15;
  if (args.includes('--json')) {
    process.stdout.write(JSON.stringify(toJsonContract(query, records, { floor })) + '\n');
  } else {
    const top = flag('top') != null ? parseInt(flag('top'), 10) : 15;
    const { low_confidence, candidates } = match(query, records, { floor, top });
    process.stdout.write(JSON.stringify({
      low_confidence,
      candidates: candidates.map((c) => ({ id: c.rec.id, title: c.rec.title, company: c.rec.company, score: +c.score.toFixed(4) })),
    }, null, 2) + '\n');
  }
}

if (argv[1] && fileURLToPath(import.meta.url) === argv[1]) {
  main();
}
