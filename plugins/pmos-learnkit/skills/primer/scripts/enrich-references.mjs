#!/usr/bin/env node
// enrich-references.mjs — per-primer curated-corpus enrichment engine for /primer.
//
// Design anchor: docs/pmos/features/2026-07-04_primer-references-enrichment/02_design.html
//   §4 (engine architecture), §4.1 (per-primer procedure), D1/D2/D4/D7,
//   INV-1/INV-2/INV-3/INV-4/INV-5/INV-6. Story 260704-6rq (this engine);
//   story 260704-e3b runs enrichPrimer() over all 61 bundled primers.
//
// What it does, per primer: recover the primer's topics from its sources.json, prefilter
// the ~1,800-record curated corpus for each topic via the EXISTING
// curated-references-match.mjs (INV-1 — never a second relevance mechanism), dedup
// candidates against the primer's current sources (INV-5), apply the overlay coverage gate
// (T=3, S=0), fetch-verify the survivors THIS run (INV-2 — injected `verify`, ~30% yield,
// capped per primer D4), weave verified survivors into the matching H2 prose + append to
// sources.json (additive only, INV-4), regenerate `## References` via 260704-rgt's
// injectReferences (INV-3), then rubric-gate the result and revert on failure (INV-6/D5).
//
// Determinism: the topic-recovery, prefilter, dedup, coverage-gate, cap, weave, and the
// deterministic R1/R11 rubric subset are pure/scriptable. The two non-deterministic parts —
// fetch-verify (network) and (optionally) an LLM prose weaver — are INJECTED via `deps`, so
// the deterministic core is unit-testable and the backfill (e3b) runs lights-out. Zero-dep
// Node ESM (matches build-library.mjs / references-section.mjs); no Date, no Math.random.

import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { match as corpusMatch } from '../../_shared/topic-research/curated-references-match.mjs';
import { injectReferences } from './references-section.mjs';

// ---- defaults ---------------------------------------------------------------

export const DEFAULTS = {
  k: 30, // prefilter top-K per topic (curated-references.md step 2 default)
  scoreFloor: 0, // coverage gate S (prefilter already drops score <= 0)
  T: 3, // coverage gate: min candidates above S for a topic to be injected
  cap: 5, // max ADMITTED new sources per primer (D4 — ~4-6 / depth-floor delta)
  maxTags: 8, // query tags per topic (curated-references.md step 1: ~5-8)
};

// ---- step 1: topic recovery (pure) -----------------------------------------

// Distinct sources.json[].topic set, in first-seen order (INV-1 step 1).
export function recoverTopics(sources) {
  const seen = new Set();
  const out = [];
  for (const s of Array.isArray(sources) ? sources : []) {
    if (s && typeof s.topic === 'string' && s.topic && !seen.has(s.topic)) {
      seen.add(s.topic);
      out.push(s.topic);
    }
  }
  return out;
}

// ---- step 2: query-tag pick (deterministic default; LLM-overridable) --------

function vocabSet(tagVocabulary) {
  const arr = (tagVocabulary && Array.isArray(tagVocabulary.tags) && tagVocabulary.tags) || [];
  return new Set(arr.map((t) => String(t).toLowerCase()));
}

// Deterministic tag pick: tokenize the topic id, map each token to a canonical vocabulary
// member (direct hit or via the synonym map), keep the closed-vocabulary members. The
// overlay's LLM tag-pick (curated-references.md step 1) can override via deps.tagPicker; this
// default keeps the engine pure + testable and is sufficient for the lights-out backfill.
export function defaultTagPicker(topicId, tagVocabulary, tagSynonyms, { maxTags = DEFAULTS.maxTags } = {}) {
  const vocab = vocabSet(tagVocabulary);
  const syn = (tagSynonyms && tagSynonyms.synonyms) || {};
  const tokens = String(topicId).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const picked = [];
  const seen = new Set();
  for (const tok of tokens) {
    let canon = null;
    if (vocab.has(tok)) canon = tok;
    else if (syn[tok] && vocab.has(String(syn[tok]).toLowerCase())) canon = String(syn[tok]).toLowerCase();
    if (canon && !seen.has(canon)) {
      seen.add(canon);
      picked.push(canon);
      if (picked.length >= maxTags) break;
    }
  }
  return picked;
}

// ---- step 2/3: prefilter + dedup + coverage gate (pure) --------------------

// Returns { perTopic: { topic: candidates[] }, skipped_topics: [{topic, count}], considered }.
// Excludes any candidate whose url is already a verbatim member of the primer's sources.json
// (dedup, INV-5). A topic with fewer than T candidates above S is skipped and recorded (the
// overlay coverage gate). A primer whose every topic is skipped yields an empty perTopic.
export function prefilterCandidates({ topics, sources, corpus, tagVocabulary, tagSynonyms, tagPicker, opts = {} } = {}) {
  const { k = DEFAULTS.k, scoreFloor = DEFAULTS.scoreFloor, T = DEFAULTS.T, maxTags = DEFAULTS.maxTags } = opts;
  const existingUrls = new Set((Array.isArray(sources) ? sources : []).map((s) => s && s.url).filter(Boolean));
  const pick = tagPicker || ((topic) => defaultTagPicker(topic, tagVocabulary, tagSynonyms, { maxTags }));

  const perTopic = {};
  const skipped_topics = [];
  let considered = 0;
  for (const topic of Array.isArray(topics) ? topics : []) {
    const tags = pick(topic);
    const matched = corpusMatch({ tags, corpus, k, scoreFloor });
    // dedup against the primer's current sources (INV-5)
    const fresh = matched.filter((r) => r && r.url && !existingUrls.has(r.url));
    if (fresh.length < T) {
      skipped_topics.push({ topic, count: fresh.length });
      continue;
    }
    perTopic[topic] = fresh;
    considered += fresh.length;
  }
  return { perTopic, skipped_topics, considered };
}

// ---- step 5: deterministic additive weave (LLM-overridable) ----------------

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

// Cleaned host label, mirrors references-section.mjs cleanHost (kept local to stay zero-cross-dep).
function hostLabel(url) {
  let host;
  try {
    host = new URL(String(url)).hostname;
  } catch {
    const m = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/i.exec(String(url));
    host = m ? m[1] : String(url);
  }
  return host.replace(/^www\./i, '');
}

// First sentence of a takeaway (grounds the woven pointer without dumping the whole blurb).
function firstSentence(text) {
  const t = String(text || '').trim();
  if (!t) return '';
  const m = /^(.*?[.!?])(\s|$)/s.exec(t);
  return (m ? m[1] : t).trim();
}

// Locate the [start, end) byte span of the H2 section whose id === topic (from the <h2 ...>
// opening tag to the next <h2 or </main>). Returns null when the id is absent.
function sectionSpan(html, topicId) {
  const openRe = new RegExp(`<h2\\s+id="${topicId.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}"[^>]*>`, 'i');
  const m = openRe.exec(html);
  if (!m) return null;
  const bodyStart = m.index + m[0].length;
  const tail = html.slice(bodyStart);
  const nextH2 = tail.search(/<h2[\s>]/i);
  const mainClose = tail.search(/<\/main>/i);
  const bounds = [nextH2, mainClose].filter((x) => x !== -1);
  const endRel = bounds.length ? Math.min(...bounds) : tail.length;
  return { start: m.index, bodyStart, end: bodyStart + endRel };
}

// Deterministic default weaver: append one grounded pointer <p> to the END of the H2 section
// whose id matches the source's topic (additive only — never rewrites/deletes existing prose,
// INV-4). Returns the mutated html, or the original unchanged when the H2 is absent. The
// woven <a href> url is added to sources.json by the caller so R1 stays satisfied.
export function defaultWeaver(html, source) {
  const span = sectionSpan(html, source.topic);
  if (!span) return { html, woven: false };
  const href = escapeAttr(source.url);
  const label = escapeHtml(hostLabel(source.url));
  const gist = escapeHtml(firstSentence(source.takeaway) || label);
  const para = `\n<p class="primer-enriched">Further reading: <a href="${href}">${label}</a> — ${gist}</p>\n`;
  const mutated = html.slice(0, span.end) + para + html.slice(span.end);
  return { html: mutated, woven: true };
}

// ---- step 7: deterministic rubric subset (R1 + R11) ------------------------

// Teaching-body hrefs, excluding the References section (which lists every source by design
// and must not self-trip R1). Scoped to the <main class="pmos-artifact-body"> subtree so the
// primer's footer/header CHROME links (the pmos wordmark, repo brand-mark) — which are not and
// must not be sources.json members — never trip R1. Mirrors references-section.mjs's
// strip+collect without importing privates.
function bodyHrefsExcludingReferences(html) {
  let body = String(html);
  // Scope to the teaching body; chrome (toolbar/footer) lives outside <main>.
  const mainOpen = /<main[^>]*class="[^"]*pmos-artifact-body[^"]*"[^>]*>/i.exec(body);
  if (mainOpen) {
    const afterOpen = mainOpen.index + mainOpen[0].length;
    const rest = body.slice(afterOpen);
    const close = rest.search(/<\/main>/i);
    body = close === -1 ? rest : rest.slice(0, close);
  }
  const refStart = /<h2\s+id="references"[^>]*>/i.exec(body);
  if (refStart) {
    const after = body.slice(refStart.index + refStart[0].length);
    const nextH2 = after.search(/<h2[\s>]/i);
    const mainClose = after.search(/<\/main>/i);
    const bounds = [nextH2, mainClose].filter((x) => x !== -1);
    const endRel = bounds.length ? Math.min(...bounds) : after.length;
    body = body.slice(0, refStart.index) + body.slice(refStart.index + refStart[0].length + endRel);
  }
  const hrefs = [];
  const re = /<a\s[^>]*?href\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  let m;
  while ((m = re.exec(body))) hrefs.push(m[1] != null ? m[1] : m[2]);
  return hrefs;
}

// Decode the handful of HTML entities that appear in URL attributes/text. A URL with query
// params (`?a=1&b=2`) is entity-encoded to `&amp;` when written into an HTML attribute or link
// text — correct HTML — but sources.json stores the RAW url. Both R1 and R11 compare hrefs read
// from the rendered HTML against the raw sources.json urls, so both sides must be normalised to
// the same (decoded) space or every `&`-bearing url spuriously trips the membership check.
function decodeEntities(s) {
  return String(s)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&amp;/g, '&'); // last, so `&amp;lt;` -> `&lt;`
}

// Deterministic R1 (cites-real-urls) + R11 (references-complete membership) — the subset the
// enrichment gate can verify with no re-fetch. Returns { pass, failing_checks: [...] }.
// The full taste-tier rubric is out of scope here (the enriched body is additive over an
// already-passing primer); the trust checks R1/R11 are what enrichment can break.
export function deterministicRubric(html, sources) {
  const failing = [];
  const urls = new Set((Array.isArray(sources) ? sources : []).map((s) => s && s.url).filter(Boolean).map(decodeEntities));
  // R1: every inline body href must be a verbatim member of sources.json[].url (entity-normalised)
  for (const h of bodyHrefsExcludingReferences(html)) {
    if (!urls.has(decodeEntities(h))) {
      failing.push({ check_id: 'R1', evidence: `body href not in sources.json: ${h}` });
      break;
    }
  }
  // R11: every sources.json url must appear in the References section (entity-normalised haystack)
  const refMatch = /<h2\s+id="references"[^>]*>[\s\S]*?(?:<\/main>|$)/i.exec(html);
  const refBlock = decodeEntities(refMatch ? refMatch[0] : '');
  for (const u of urls) {
    if (!refBlock.includes(u)) {
      failing.push({ check_id: 'R11', evidence: `sources url missing from References: ${u}` });
      break;
    }
  }
  return { pass: failing.length === 0, failing_checks: failing };
}

// ---- the orchestrator: enrichPrimer ----------------------------------------

// Injected via `deps` (all optional):
//   readFile(path) -> string          (default: fs readFileSync utf8)
//   writeFile(path, str)              (default: atomic temp-then-rename)
//   verify(candidate) -> Promise<{url,tier,takeaway,paywalled}|null>
//                                     (default: null-for-all — WebFetch-absent degraded mode,
//                                      per reference/source-floor.md: verification impossible ->
//                                      add nothing, log the degraded run)
//   weaver(html, source) -> {html, woven}   (default: defaultWeaver)
//   rubric(html, sources) -> {pass, failing_checks}  (default: deterministicRubric)
//   tagPicker(topic) -> string[]      (default: defaultTagPicker over the vocab/synonyms)
//   log(msg)                          (default: console.error)
//
// Returns the outcome record { primer, considered, verified, added, skipped_topics, reverted,
// failing_checks, degraded }. dryRun stops after prefilter (no fetch, no write) and returns the
// candidate set in `candidates`.
export async function enrichPrimer({ htmlPath, sourcesPath, corpus, tagVocabulary, tagSynonyms, opts = {}, deps = {} } = {}) {
  const o = { ...DEFAULTS, ...opts };
  const readFile = deps.readFile || ((p) => readFileSync(p, 'utf8'));
  const writeFile = deps.writeFile || atomicWrite;
  const verify = deps.verify || (async () => null);
  const weaver = deps.weaver || defaultWeaver;
  const rubric = deps.rubric || deterministicRubric;
  const log = deps.log || ((m) => process.stderr.write(String(m) + '\n'));

  const htmlBefore = readFile(htmlPath);
  const sourcesBefore = JSON.parse(readFile(sourcesPath));
  const topics = recoverTopics(sourcesBefore);

  const { perTopic, skipped_topics, considered } = prefilterCandidates({
    topics,
    sources: sourcesBefore,
    corpus,
    tagVocabulary,
    tagSynonyms,
    tagPicker: deps.tagPicker,
    opts: o,
  });

  const primer = basename(htmlPath);
  const base = { primer, considered, verified: 0, added: 0, skipped_topics, reverted: false, failing_checks: [], degraded: false };

  if (o.dryRun) {
    return { ...base, candidates: perTopic };
  }

  if (considered === 0) {
    log(`enrich: ${primer} — no candidates after coverage gate (${skipped_topics.length} topics skipped); no-op`);
    return base;
  }

  // Convergence ceiling (INV-5): the cap is a per-PRIMER total, not per-run. Each source this
  // mechanism adds welds exactly one `<p class="primer-enriched">` paragraph, so their count is
  // the ground truth of how much a primer has already been enriched. A re-run may only top up to
  // the ceiling; a primer already at the cap is a no-op (byte-identical re-run). Without this a
  // re-run keeps adding the NEXT cap's worth of fresh candidates every time — never convergent.
  const alreadyEnriched = (htmlBefore.match(/<p class="primer-enriched"/g) || []).length;
  const remainingCap = Math.max(0, o.cap - alreadyEnriched);
  if (remainingCap === 0) {
    log(`enrich: ${primer} — already at cap (${alreadyEnriched}/${o.cap} enriched); convergent no-op`);
    return { ...base };
  }

  // Flatten candidates deterministically, ROUND-ROBIN across topics (topics in first-seen
  // order, each topic's candidates already score-sorted by corpusMatch) so the per-primer cap
  // (D4) spreads enrichment across sections instead of draining one topic. Fetch-verify in that
  // order until the cap is hit.
  const queues = topics.map((t) => (perTopic[t] ? { topic: t, cands: perTopic[t].slice() } : null)).filter(Boolean);
  const flat = [];
  for (let more = true; more; ) {
    more = false;
    for (const q of queues) {
      const c = q.cands.shift();
      if (c) {
        flat.push({ ...c, topic: q.topic });
        more = true;
      }
    }
  }
  const verified = [];
  let attemptedAny = false;
  for (const c of flat) {
    if (verified.length >= o.cap) break;
    attemptedAny = true;
    const v = await verify(c);
    if (v && v.url) verified.push({ url: v.url, takeaway: v.takeaway || '', topic: c.topic, tier: v.tier || 'T3', paywalled: !!v.paywalled });
  }

  if (attemptedAny && verified.length === 0 && deps.verify == null) {
    // Default verify (no WebFetch) — degraded run per source-floor.md: add nothing.
    log(`enrich: ${primer} — no verify() provided (WebFetch-absent); admitting nothing (degraded)`);
    return { ...base, degraded: true };
  }
  if (verified.length === 0) {
    log(`enrich: ${primer} — ${considered} considered, 0 verified; no additions`);
    return base;
  }

  // Weave + append (additive only, INV-4). Only sources that actually weave in are appended
  // to sources.json (so R1's body-href set and sources.json stay in lockstep).
  let html = htmlBefore;
  const sources = sourcesBefore.slice();
  let added = 0;
  for (const src of verified) {
    const { html: next, woven } = weaver(html, src);
    if (!woven) {
      log(`enrich: ${primer} — no H2 for topic "${src.topic}"; skipping source ${src.url}`);
      continue;
    }
    html = next;
    sources.push({ url: src.url, takeaway: src.takeaway, topic: src.topic, tier: src.tier, paywalled: src.paywalled });
    added += 1;
  }

  if (added === 0) {
    log(`enrich: ${primer} — ${verified.length} verified but none woven (no matching H2); no-op`);
    return { ...base, verified: verified.length };
  }

  // Regenerate References from the enriched sources (INV-3 — rgt's one generator).
  html = injectReferences(html, sources);

  // Rubric gate (INV-6/D5): pass -> atomic write; fail -> revert (write nothing).
  const { pass, failing_checks } = rubric(html, sources);
  if (!pass) {
    log(`enrich: ${primer} — rubric FAIL [${failing_checks.map((f) => f.check_id).join(', ')}]; reverting`);
    return { ...base, verified: verified.length, added: 0, reverted: true, failing_checks };
  }

  writeFile(htmlPath, html);
  writeFile(sourcesPath, JSON.stringify(sources, null, 2) + '\n');
  log(`enrich: ${primer} — ${considered} considered, ${verified.length} verified, ${added} added (rubric PASS)`);
  return { ...base, verified: verified.length, added };
}

// ---- small fs helpers ------------------------------------------------------

function atomicWrite(path, str) {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, str);
  renameSync(tmp, path);
}

function basename(p) {
  return String(p).split('/').pop();
}

// ---- thin CLI --------------------------------------------------------------
// node enrich-references.mjs <primer.html> [--dry-run] [--cap N] [--corpus <path>]
//   Deterministic-only entry (default verify() admits nothing — a real /primer enrich run
//   drives fetch-verify through the SKILL.md verb, which injects a WebFetch-backed verify).
//   Used for the prefilter dry-run + as the module the SKILL.md verb / backfill import.

function parseArgs(argv) {
  const out = { htmlPath: null, dryRun: false, cap: DEFAULTS.cap, corpus: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--cap') out.cap = parseInt(argv[++i], 10);
    else if (a === '--corpus') out.corpus = argv[++i];
    else if (!a.startsWith('--')) out.htmlPath = a;
  }
  return out;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.htmlPath) {
    process.stderr.write('usage: enrich-references.mjs <primer.html> [--dry-run] [--cap N] [--corpus <path>]\n');
    process.exit(64);
  }
  const sourcesPath = args.htmlPath.replace(/\.html$/, '.sources.json');
  const corpusPath = args.corpus || fileURLToPath(new URL('../../_shared/topic-research/curated-references.json', import.meta.url));
  const vocabPath = fileURLToPath(new URL('../../_shared/topic-research/tag-vocabulary.json', import.meta.url));
  const synPath = fileURLToPath(new URL('../../_shared/topic-research/tag-synonyms.json', import.meta.url));
  const corpusData = JSON.parse(readFileSync(corpusPath, 'utf8'));
  const corpus = Array.isArray(corpusData) ? corpusData : corpusData.references || [];
  const tagVocabulary = JSON.parse(readFileSync(vocabPath, 'utf8'));
  const tagSynonyms = JSON.parse(readFileSync(synPath, 'utf8'));
  enrichPrimer({
    htmlPath: args.htmlPath,
    sourcesPath,
    corpus,
    tagVocabulary,
    tagSynonyms,
    opts: { dryRun: args.dryRun, cap: args.cap },
  }).then((outcome) => {
    console.log(JSON.stringify(outcome, null, 2));
  }).catch((err) => {
    process.stderr.write(`enrich-references: ${err && err.stack ? err.stack : err}\n`);
    process.exit(1);
  });
}
