// curated-references-match.mjs — deterministic rarity-weighted prefilter.
//
// Design anchor: 02_design.html#a-prefilter. Zero-dep Node ESM. No Date, no Math.random,
// no network, no API — a pure function + a thin CLI. Narrows the ~1.8k-record overlay to
// the top-K candidates for a topic's query tags so the curated-references subagent can
// reason over a few dozen, not the whole corpus.
//
// Scoring: score(record) = Σ over (queryTags ∩ recordTags) of w(tag),
//   w(tag) = log( N / (1 + df(tag)) )   — IDF-style rarity weight (natural log),
//   N = corpus size, df(tag) = document frequency of the tag across the corpus.
// A record with summary_grounded === false is multiplied by GROUNDED_FALSE_PENALTY
// (down-weighted, not dropped — verification re-checks it at fetch time, #junk-policy).
//
// Pre-rejection (before scoring): bot-wall / 4xx-5xx titles (BOTWALL_RE) and records whose
// URL host is in HARD_BLOCKED_DOMAINS (forbes.com) are skipped entirely.
//
// Determinism: stable sort by (score desc, id asc). Returns at most `k` records, each a
// shallow clone of the input record plus a numeric `score`, filtered to score > scoreFloor
// (default 0 — zero-overlap records never returned).

const GROUNDED_FALSE_PENALTY = 0.5;

// Bot-wall + HTTP-error titles the fetcher would waste a request on (#a-prefilter, spike §).
const BOTWALL_RE =
  /just a moment|attention required|cloudflare|\b4\d{2}\b|\b5\d{2}\b|page not found|access denied|forbidden|are you (a )?human|verify you are (a )?human|enable javascript|checking your browser|request blocked/i;

const HARD_BLOCKED_DOMAINS = ['forbes.com'];

function hostOf(url) {
  try {
    return new URL(String(url)).host.toLowerCase();
  } catch (_) {
    // best-effort host extraction for malformed inputs
    const m = String(url).match(/^[a-z]+:\/\/([^/]+)/i);
    return m ? m[1].toLowerCase() : '';
  }
}

function isBlockedDomain(url) {
  const host = hostOf(url);
  if (!host) return false;
  return HARD_BLOCKED_DOMAINS.some((d) => host === d || host.endsWith('.' + d));
}

function isBotWallTitle(title) {
  return BOTWALL_RE.test(String(title || ''));
}

// match({tags, corpus, k, scoreFloor}) — pure. `corpus` is an array of records.
export function match({ tags, corpus, k = 30, scoreFloor = 0 } = {}) {
  const queryTags = Array.isArray(tags) ? tags.filter((t) => typeof t === 'string' && t) : [];
  const records = Array.isArray(corpus) ? corpus : [];
  const N = records.length;
  if (queryTags.length === 0 || N === 0) return [];

  // Document frequency of every tag across the whole corpus (denominator basis = all
  // records, so rarity is measured against the full corpus, not the eligible subset).
  const df = Object.create(null);
  for (const rec of records) {
    const seen = new Set(Array.isArray(rec.tags) ? rec.tags : []);
    for (const t of seen) df[t] = (df[t] || 0) + 1;
  }
  const weight = (tag) => Math.log(N / (1 + (df[tag] || 0)));

  const querySet = new Set(queryTags);
  const scored = [];
  for (const rec of records) {
    if (isBotWallTitle(rec.title)) continue;       // pre-reject bot-wall / 4xx-5xx
    if (isBlockedDomain(rec.url)) continue;         // skip hard-blocked domains
    const recTags = Array.isArray(rec.tags) ? rec.tags : [];
    let score = 0;
    const counted = new Set();
    for (const t of recTags) {
      if (querySet.has(t) && !counted.has(t)) {
        counted.add(t);
        score += weight(t);
      }
    }
    if (rec.summary_grounded === false) score *= GROUNDED_FALSE_PENALTY;
    if (score > scoreFloor) scored.push({ ...rec, score });
  }

  // Stable order: score desc, then id asc (deterministic tie-break).
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  return scored.slice(0, k);
}

// ---- thin CLI ---------------------------------------------------------------
// node curated-references-match.mjs --tags pricing,monetization [--k 30] [--score-floor 0]
//      [--corpus <path>]   (defaults to the sibling curated-references.json)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function parseArgs(argv) {
  const out = { tags: [], k: 30, scoreFloor: 0, corpus: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--tags') out.tags = (argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--k') out.k = parseInt(argv[++i], 10);
    else if (a === '--score-floor') out.scoreFloor = parseFloat(argv[++i]);
    else if (a === '--corpus') out.corpus = argv[++i];
  }
  return out;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  const corpusPath = args.corpus || fileURLToPath(new URL('./curated-references.json', import.meta.url));
  const data = JSON.parse(readFileSync(corpusPath, 'utf8'));
  const corpus = Array.isArray(data) ? data : data.references || [];
  const out = match({ tags: args.tags, corpus, k: args.k, scoreFloor: args.scoreFloor });
  console.log(JSON.stringify(
    out.map((r) => ({ id: r.id, score: Number(r.score.toFixed(4)), title: r.title, url: r.url, summary_grounded: r.summary_grounded })),
    null, 2,
  ));
  console.error(`matched ${out.length} of ${corpus.length} for tags [${args.tags.join(', ')}] (k=${args.k}, scoreFloor=${args.scoreFloor})`);
}

export { BOTWALL_RE, HARD_BLOCKED_DOMAINS, GROUNDED_FALSE_PENALTY, hostOf, isBotWallTitle, isBlockedDomain };
