#!/usr/bin/env node
// backfill-enrichment.mjs — story 260704-e3b, the data-change half of epic 260704-dgq.
//
// Runs the 260704-6rq enrichment engine (enrich-references.mjs — imported, NOT re-implemented,
// INV-1) over all bundled corpus primers (data/primers/*.html + *.sources.json), fully unattended
// and rubric-gated (D5). For each primer it prefilters the curated corpus for that primer's own
// topics, fetch-verifies the top curated candidates THIS run, weaves survivors into the matching
// teaching section + sources.json, regenerates ## References via rgt's injectReferences, and gates
// the result on the engine's deterministic rubric (R1/R11) — a primer that fails after enrichment
// is reverted (INV-6), never shipped. Additive + convergent (INV-4/INV-5): a re-run adds nothing.
//
// LIGHTS-OUT VERIFY (the design's D2, honestly scoped). D2 requires every added source to be
// re-fetch-verified THIS run rather than trusted from the corpus — its stated purpose is guarding
// against corpus LINK-ROT. The curated corpus records were already hard-gated + tier-assessed at
// harvest time (source-tiers.md) and carry a grounded `summary`. So this backfill's injected
// verify is a NODE-NATIVE reachability re-check (link-rot guard) + a heuristic trust tier + the
// corpus's grounded summary as the takeaway. This is deliberately WEAKER than an interactive
// `/primer enrich` run's full LLM pass-bar (identity-match / slop-detection / annotation-grounding
// from sourcing.md) — that judgment already happened at corpus-build time; re-running it per source
// across 61 primers is not lights-out. The trade-off is documented in the run report and the story
// notes. The engine's rubric gate (R1/R11) remains the final ship/revert guard.
//
// Zero-dep Node ESM (matches enrich-references.mjs / build-library.mjs); uses Node 20's global
// fetch. Network run (unlike rgt's pure-transform backfill).
//
// Usage:
//   node backfill-enrichment.mjs [--dry-run] [--limit N] [--cap N] [--only <substr>]
//                                [--primers-dir <path>] [--corpus <path>]
//                                [--report <path>] [--timeout-ms N]
//   --dry-run       prefilter + report candidate counts; NO fetch, NO write.
//   --limit N       process only the first N primers (bounded trial).
//   --cap N         max new sources per primer (default from engine DEFAULTS.cap).
//   --only <substr> process only primers whose filename contains <substr>.
//   --report <path> write the JSON run report here (default: alongside, stdout always prints table).
//   --timeout-ms N  per-URL fetch timeout (default 10000).

import { readFileSync, writeFileSync, readdirSync, renameSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { enrichPrimer, DEFAULTS } from './enrich-references.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = join(HERE, '..'); // plugins/pmos-learnkit/skills/primer
const SHARED = join(SKILL_DIR, '..', '_shared', 'topic-research');

// ---- corpus + vocab loaders -------------------------------------------------
function loadJson(p) {
  return JSON.parse(readFileSync(p, 'utf8'));
}
function loadCorpus(p) {
  const c = loadJson(p);
  return Array.isArray(c) ? c : c.references || c.records || [];
}

// ---- heuristic trust tier (corpus has no tier field; source-tiers.md T1–T4) --
// Domain/source_type heuristic. Conservative: unknown reachable → T4. Tier only orders the
// References list; the hard quality substrate is the curated corpus itself.
const T1_HOSTS = [/(^|\.)arxiv\.org$/, /(^|\.)nist\.gov$/, /(^|\.)nature\.com$/, /(^|\.)acm\.org$/, /(^|\.)ieee\.org$/, /(^|\.)who\.int$/, /(^|\.)\w+\.gov$/, /(^|\.)docs\./, /(^|\.)developer\./];
const T2_HOSTS = [/(^|\.)substack\.com$/, /(^|\.)medium\.com$/, /(^|\.)dev\.to$/, /(^|\.)github\.io$/, /(^|\.)github\.com$/, /(^|\.)stackoverflow\.com$/];
const T3_HOSTS = [/(^|\.)hbr\.org$/, /(^|\.)mckinsey\.com$/, /(^|\.)economist\.com$/, /(^|\.)wired\.com$/, /(^|\.)technologyreview\.com$/, /(^|\.)nngroup\.com$/, /(^|\.)hubspot\.com$/, /(^|\.)coursera\.org$/, /(^|\.)wikipedia\.org$/];
const PAYWALL_HOSTS = [/(^|\.)wsj\.com$/, /(^|\.)ft\.com$/, /(^|\.)nytimes\.com$/, /(^|\.)economist\.com$/, /(^|\.)bloomberg\.com$/];

function hostOf(url) {
  try { return new URL(url).hostname.toLowerCase(); } catch { return ''; }
}
function tierFor(candidate) {
  const host = hostOf(candidate.url);
  const st = String(candidate.source_type || '').toLowerCase();
  if (st === 'paper' || st === 'documentation' || st === 'docs' || T1_HOSTS.some((r) => r.test(host))) return 'T1';
  if (T2_HOSTS.some((r) => r.test(host)) || st === 'blog' || st === 'newsletter') return 'T2';
  if (T3_HOSTS.some((r) => r.test(host)) || st === 'article') return 'T3';
  return 'T4';
}
function isPaywalled(url) {
  const host = hostOf(url);
  return PAYWALL_HOSTS.some((r) => r.test(host));
}

// ---- Node-native reachability verify (the link-rot guard, D2) ----------------
// Module-level cache: the same curated record is matched into many primers; re-fetching each URL
// once per corpus is wasteful. Cache url -> boolean reachable for the whole run.
function makeVerify({ timeoutMs = 10000, cache = new Map(), stats } = {}) {
  const UA = 'Mozilla/5.0 (compatible; pmos-primer-enrich/1.0; +https://github.com/maneesh-dhabria/pmos-skills)';
  async function reachable(url) {
    if (cache.has(url)) return cache.get(url);
    let ok = false;
    try {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), timeoutMs);
      const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctl.signal, headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,*/*', range: 'bytes=0-4095' } });
      ok = res.ok || res.status === 206; // 2xx (or partial-content when the Range is honored)
      // Drain the body so undici releases the socket; swallow any read/abort race.
      try { await res.text(); } catch { /* ignore */ }
      clearTimeout(to);
    } catch {
      ok = false;
    }
    cache.set(url, ok);
    return ok;
  }
  return async (candidate) => {
    if (!candidate || !candidate.url) return null;
    if (stats) stats.fetched += cache.has(candidate.url) ? 0 : 1;
    const ok = await reachable(candidate.url);
    if (!ok) { if (stats) stats.dropped += 1; return null; }
    const takeaway = (candidate.summary && String(candidate.summary).trim()) || String(candidate.title || '').trim();
    return { url: candidate.url, tier: tierFor(candidate), takeaway, paywalled: isPaywalled(candidate.url) };
  };
}

// ---- primer discovery -------------------------------------------------------
function findPrimers(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.html') && f !== 'library.html' && !f.endsWith('.sources.json'))
    .sort()
    .map((f) => ({ name: f, htmlPath: join(dir, f), sourcesPath: join(dir, f.replace(/\.html$/, '.sources.json')) }));
}

// ---- index sources_count refresh (AC5) --------------------------------------
// The enrichment adds sources, so each primer's `sources_count` in primers-index.json grows. Per
// design D8 / "no index churn beyond sources_count": we refresh ONLY sources_count (a pure
// function of the primer's current sources.json — so the pass is convergent: re-running writes the
// same numbers) and leave `word_count` untouched (References is excluded from word_count by
// definition, and the woven prose delta is deliberately not churned into the index). Returns the
// count of entries whose sources_count changed. rgt's backfill-references.mjs never touched the
// index because it added no sources; this backfill does, so it owns the sources_count refresh.
function updateIndex(indexPath, primersDir) {
  const raw = loadJson(indexPath);
  const entries = Array.isArray(raw) ? raw : raw.primers || raw.records || [];
  let changed = 0;
  for (const e of entries) {
    if (!e || !e.id) continue;
    const sp = join(primersDir, `${e.id}.sources.json`);
    let count;
    try { count = loadJson(sp).length; } catch { continue; } // primer with no sibling sources.json — skip
    if (e.sources_count !== count) { e.sources_count = count; changed += 1; }
  }
  if (changed > 0) {
    const tmp = indexPath + '.tmp';
    writeFileSync(tmp, JSON.stringify(raw, null, 2) + '\n');
    renameSync(tmp, indexPath);
  }
  return changed;
}

// ---- CLI --------------------------------------------------------------------
function parseArgs(argv) {
  const o = { dryRun: false, limit: null, cap: DEFAULTS.cap, only: null, primersDir: join(SKILL_DIR, 'data', 'primers'), corpus: join(SHARED, 'curated-references.json'), index: join(SKILL_DIR, 'data', 'primers-index.json'), report: null, timeoutMs: 10000 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') o.dryRun = true;
    else if (a === '--limit') o.limit = Number(argv[++i]);
    else if (a === '--cap') o.cap = Number(argv[++i]);
    else if (a === '--only') o.only = argv[++i];
    else if (a === '--primers-dir') o.primersDir = argv[++i];
    else if (a === '--corpus') o.corpus = argv[++i];
    else if (a === '--index') o.index = argv[++i];
    else if (a === '--report') o.report = argv[++i];
    else if (a === '--timeout-ms') o.timeoutMs = Number(argv[++i]);
  }
  return o;
}

function pad(s, n) { s = String(s); return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length); }

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const corpus = loadCorpus(args.corpus);
  const tagVocabulary = loadJson(join(SHARED, 'tag-vocabulary.json'));
  const tagSynonyms = loadJson(join(SHARED, 'tag-synonyms.json'));

  let primers = findPrimers(args.primersDir);
  if (args.only) primers = primers.filter((p) => p.name.includes(args.only));
  if (args.limit != null) primers = primers.slice(0, args.limit);

  process.stderr.write(`backfill-enrichment: ${primers.length} primer(s); corpus=${corpus.length} records; cap=${args.cap}; ${args.dryRun ? 'DRY-RUN (no fetch, no write)' : 'LIVE (fetch-verify this run)'}\n`);

  const cache = new Map();
  const stats = { fetched: 0, dropped: 0 };
  const verify = args.dryRun ? undefined : makeVerify({ timeoutMs: args.timeoutMs, cache, stats });

  const rows = [];
  for (const p of primers) {
    let outcome;
    try {
      outcome = await enrichPrimer({
        htmlPath: p.htmlPath,
        sourcesPath: p.sourcesPath,
        corpus,
        tagVocabulary,
        tagSynonyms,
        opts: { cap: args.cap, dryRun: args.dryRun },
        deps: verify ? { verify } : {},
      });
    } catch (e) {
      rows.push({ primer: p.name, error: String(e && e.message || e) });
      process.stderr.write(`  ERROR ${p.name}: ${e && e.message || e}\n`);
      continue;
    }
    if (args.dryRun) {
      const perTopic = outcome.candidates || {};
      const cand = Object.values(perTopic).reduce((n, a) => n + a.length, 0);
      rows.push({ primer: p.name, considered: outcome.considered, candidates: cand, skipped_topics: (outcome.skipped_topics || []).length, dryRun: true });
    } else {
      rows.push({
        primer: p.name,
        considered: outcome.considered,
        verified: outcome.verified,
        added: outcome.added,
        skipped_topics: (outcome.skipped_topics || []).length,
        reverted: !!outcome.reverted,
        degraded: !!outcome.degraded,
        failing_checks: (outcome.failing_checks || []).map((f) => f.check_id),
      });
    }
  }

  // ---- refresh primers-index.json sources_count (AC5; skip on dry-run / --limit slices so we
  // never write partial counts, and skip if the index isn't where we expect) ----
  let index_updated = 0;
  if (!args.dryRun && args.limit == null && !args.only) {
    try {
      index_updated = updateIndex(args.index, args.primersDir);
      process.stderr.write(`index: refreshed sources_count on ${index_updated} entr${index_updated === 1 ? 'y' : 'ies'} in ${args.index}\n`);
    } catch (e) {
      process.stderr.write(`index: WARN could not refresh ${args.index}: ${e && e.message || e}\n`);
    }
  }

  // ---- report ----
  const totals = args.dryRun
    ? { primers: rows.length, candidates: rows.reduce((n, r) => n + (r.candidates || 0), 0) }
    : {
        primers: rows.length,
        enriched: rows.filter((r) => r.added > 0).length,
        noop: rows.filter((r) => !r.error && r.added === 0 && !r.reverted).length,
        reverted: rows.filter((r) => r.reverted).length,
        errors: rows.filter((r) => r.error).length,
        sources_added: rows.reduce((n, r) => n + (r.added || 0), 0),
        urls_fetched: stats.fetched,
        urls_dropped_unreachable: stats.dropped,
        index_sources_count_updated: index_updated,
      };

  const lines = [];
  if (args.dryRun) {
    lines.push(`${pad('PRIMER', 52)} ${pad('CONSID', 7)} ${pad('CANDS', 6)} ${pad('SKIP-T', 6)}`);
    for (const r of rows) lines.push(r.error ? `${pad(r.primer, 52)} ERROR ${r.error}` : `${pad(r.primer, 52)} ${pad(r.considered, 7)} ${pad(r.candidates, 6)} ${pad(r.skipped_topics, 6)}`);
    lines.push('');
    lines.push(`TOTALS: primers=${totals.primers} candidates=${totals.candidates}`);
  } else {
    lines.push(`${pad('PRIMER', 52)} ${pad('CONSID', 7)} ${pad('VERIF', 6)} ${pad('ADDED', 6)} ${pad('SKIP-T', 6)} ${pad('REVERT', 6)}`);
    for (const r of rows) lines.push(r.error ? `${pad(r.primer, 52)} ERROR ${r.error}` : `${pad(r.primer, 52)} ${pad(r.considered, 7)} ${pad(r.verified, 6)} ${pad(r.added, 6)} ${pad(r.skipped_topics, 6)} ${pad(r.reverted ? 'YES' : '-', 6)}`);
    lines.push('');
    lines.push(`TOTALS: primers=${totals.primers} enriched=${totals.enriched} no-op=${totals.noop} reverted=${totals.reverted} errors=${totals.errors} sources_added=${totals.sources_added} urls_fetched=${totals.urls_fetched} dropped_unreachable=${totals.urls_dropped_unreachable}`);
  }
  const table = lines.join('\n');
  process.stdout.write(table + '\n');

  const report = { generated_run: 'backfill-enrichment', dry_run: args.dryRun, cap: args.cap, verify: 'node-native reachability re-check (link-rot guard, D2); tier=domain/source_type heuristic; takeaway=corpus grounded summary', totals, rows };
  if (args.report) {
    const tmp = args.report + '.tmp';
    writeFileSync(tmp, JSON.stringify(report, null, 2));
    renameSync(tmp, args.report);
    process.stderr.write(`report written: ${args.report}\n`);
  }
  // Non-zero exit if any primer errored (never on reverts/no-ops — those are expected outcomes).
  if (!args.dryRun && totals.errors > 0) process.exitCode = 1;
}

// Only run main() when invoked directly (not when imported by a test).
if (process.argv[1] && basename(process.argv[1]) === 'backfill-enrichment.mjs') {
  main().catch((e) => { process.stderr.write(String(e && e.stack || e) + '\n'); process.exitCode = 2; });
}

export { makeVerify, tierFor, isPaywalled, findPrimers, loadCorpus };
