// enrich-references.test.mjs — unit + fixture tests for the /primer enrichment engine
// (story 260704-6rq). Run: node --test
//
// Covers the deterministic parts (design §4.3, AC8): topic recovery, dedup against existing
// sources.json, coverage-gate no-op, cap enforcement, revert-on-rubric-fail, and one
// integration fixture proving an added+verified source lands in prose + sources.json +
// References and passes R1/R11. The LLM prose weaver and live fetch-verify are injected
// stubs here (exercised for real in the story dogfood); the engine's determinism is what
// these assert.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  recoverTopics,
  defaultTagPicker,
  prefilterCandidates,
  defaultWeaver,
  deterministicRubric,
  enrichPrimer,
  DEFAULTS,
} from '../scripts/enrich-references.mjs';

// ---- fixtures ---------------------------------------------------------------

const TAG_VOCAB = { version: 1, tags: ['pricing', 'monetization', 'analytics', 'growth', 'onboarding'] };
const TAG_SYN = { version: 1, synonyms: { price: 'pricing', metrics: 'analytics' }, drop: [] };

// A corpus with pricing/monetization records PLUS filler so `pricing` stays rare enough to
// carry a positive IDF weight (match() drops score<=0). Real corpus is ~1,800 records; here
// N is padded to ~20 so log(N/(1+df(pricing))) > 0.
const FILLER = Array.from({ length: 15 }, (_, i) => ({
  id: `ref_fill_${i}`,
  url: `https://fill.example/${i}`,
  title: `Filler ${i}`,
  tags: [['onboarding', 'retention', 'design', 'research', 'api'][i % 5]],
  summary_grounded: true,
}));
const CORPUS = [
  { id: 'ref_a', url: 'https://a.example/pricing-1', title: 'Pricing 1', tags: ['pricing', 'monetization'], summary_grounded: true },
  { id: 'ref_b', url: 'https://b.example/pricing-2', title: 'Pricing 2', tags: ['pricing'], summary_grounded: true },
  { id: 'ref_c', url: 'https://c.example/pricing-3', title: 'Pricing 3', tags: ['pricing', 'monetization'], summary_grounded: true },
  { id: 'ref_d', url: 'https://d.example/pricing-4', title: 'Pricing 4', tags: ['pricing'], summary_grounded: true },
  { id: 'ref_e', url: 'https://e.example/analytics-1', title: 'Analytics 1', tags: ['analytics'], summary_grounded: true },
  ...FILLER,
];

// A primer whose topics are the H2 ids. sources.json already includes one pricing url (dedup target).
const SOURCES = [
  { url: 'https://a.example/pricing-1', takeaway: 'Existing pricing source.', topic: 'pricing', tier: 'T2', paywalled: false },
  { url: 'https://x.example/growth-seed', takeaway: 'Existing growth source.', topic: 'growth', tier: 'T2', paywalled: false },
];

function fixtureHtml() {
  return `<main class="pmos-artifact-body" data-pmos-role="body">
<h1 class="pmos-doc-title">A Primer</h1>
<h2 id="pricing">Pricing</h2>
<p>Pricing intro. See <a href="https://a.example/pricing-1">the existing source</a>.</p>
<h2 id="growth">Growth</h2>
<p>Growth intro.</p>
<h2 id="references">References</h2>
<ol class="primer-references">
<li><a href="https://a.example/pricing-1">a.example</a></li>
<li><a href="https://x.example/growth-seed">x.example</a></li>
</ol>
</main>`;
}

// ---- topic recovery ---------------------------------------------------------

test('recoverTopics returns distinct topics in first-seen order', () => {
  assert.deepEqual(recoverTopics(SOURCES), ['pricing', 'growth']);
  assert.deepEqual(recoverTopics([{ topic: 'a' }, { topic: 'a' }, { topic: 'b' }]), ['a', 'b']);
  assert.deepEqual(recoverTopics([]), []);
  assert.deepEqual(recoverTopics(null), []);
});

test('defaultTagPicker maps topic-id tokens to closed-vocabulary members (direct + synonym)', () => {
  assert.deepEqual(defaultTagPicker('pricing', TAG_VOCAB, TAG_SYN), ['pricing']);
  // "price" is not a vocab member but maps via synonyms -> pricing
  assert.deepEqual(defaultTagPicker('price-and-monetization', TAG_VOCAB, TAG_SYN), ['pricing', 'monetization']);
  // tokens with no vocab home drop out
  assert.deepEqual(defaultTagPicker('what-this-is-about', TAG_VOCAB, TAG_SYN), []);
});

// ---- dedup + coverage gate --------------------------------------------------

test('prefilter dedups candidates already in sources.json (INV-5)', () => {
  const { perTopic } = prefilterCandidates({
    topics: ['pricing'],
    sources: SOURCES,
    corpus: CORPUS,
    tagVocabulary: TAG_VOCAB,
    tagSynonyms: TAG_SYN,
    opts: { T: 1 },
  });
  const urls = (perTopic.pricing || []).map((c) => c.url);
  assert.ok(!urls.includes('https://a.example/pricing-1'), 'already-present url must be excluded');
  assert.ok(urls.includes('https://b.example/pricing-2'), 'fresh pricing candidate must survive');
});

test('coverage gate skips a topic with fewer than T fresh candidates (no-op path)', () => {
  const { perTopic, skipped_topics } = prefilterCandidates({
    topics: ['growth'], // no corpus record tagged growth -> 0 candidates
    sources: SOURCES,
    corpus: CORPUS,
    tagVocabulary: TAG_VOCAB,
    tagSynonyms: TAG_SYN,
    opts: { T: DEFAULTS.T },
  });
  assert.equal(perTopic.growth, undefined);
  assert.deepEqual(skipped_topics.map((s) => s.topic), ['growth']);
});

test('a primer whose every topic is skipped yields empty perTopic (no-op)', () => {
  const { perTopic, considered } = prefilterCandidates({
    topics: ['growth'],
    sources: SOURCES,
    corpus: CORPUS,
    tagVocabulary: TAG_VOCAB,
    tagSynonyms: TAG_SYN,
    opts: { T: 3 },
  });
  assert.deepEqual(perTopic, {});
  assert.equal(considered, 0);
});

// ---- weave ------------------------------------------------------------------

test('defaultWeaver appends an additive pointer <p> inside the matching H2, preserving prior prose', () => {
  const html = fixtureHtml();
  const src = { url: 'https://b.example/pricing-2', takeaway: 'B explains tiered pricing. More detail follows.', topic: 'pricing', tier: 'T2' };
  const { html: out, woven } = defaultWeaver(html, src);
  assert.equal(woven, true);
  assert.match(out, /primer-enriched/);
  assert.match(out, /<a href="https:\/\/b\.example\/pricing-2">b\.example<\/a>/);
  // additive: the original existing anchor is still present, unchanged
  assert.match(out, /See <a href="https:\/\/a\.example\/pricing-1">the existing source<\/a>/);
  // only the first sentence of the takeaway is used
  assert.match(out, /B explains tiered pricing\./);
  assert.ok(!out.includes('More detail follows'), 'weave uses first sentence only');
});

test('defaultWeaver is a no-op when no H2 matches the source topic', () => {
  const { html: out, woven } = defaultWeaver(fixtureHtml(), { url: 'https://z.example/x', takeaway: 'x', topic: 'no-such-topic' });
  assert.equal(woven, false);
  assert.equal(out, fixtureHtml());
});

// ---- deterministic rubric (R1 + R11) ---------------------------------------

test('deterministicRubric passes when every body href is in sources and every source is in References', () => {
  const { pass } = deterministicRubric(fixtureHtml(), SOURCES);
  assert.equal(pass, true);
});

test('deterministicRubric fails R1 when a body href is not in sources.json', () => {
  const broken = fixtureHtml().replace('<p>Growth intro.</p>', '<p>Growth intro. <a href="https://rogue.example/nope">rogue</a></p>');
  const { pass, failing_checks } = deterministicRubric(broken, SOURCES);
  assert.equal(pass, false);
  assert.ok(failing_checks.some((f) => f.check_id === 'R1'));
});

// ---- enrichPrimer integration ----------------------------------------------

// Build an in-memory harness: readFile/writeFile stubs (no disk), a verify stub that admits
// specific urls, so we assert the full weave -> append -> regen -> gate -> write path.
function harness({ files, verifyUrls = [], cap }) {
  const store = { ...files };
  const writes = {};
  return {
    store,
    writes,
    deps: {
      readFile: (p) => store[p],
      writeFile: (p, s) => {
        writes[p] = s;
        store[p] = s;
      },
      verify: async (c) => (verifyUrls.includes(c.url) ? { url: c.url, tier: 'T2', takeaway: `Verified ${c.url}.`, paywalled: false } : null),
      log: () => {},
    },
    opts: { T: 1, cap: cap ?? DEFAULTS.cap },
  };
}

test('integration: a verified source lands in prose + sources.json + References and passes R1/R11', async () => {
  const files = {
    'p.html': fixtureHtml(),
    'p.sources.json': JSON.stringify(SOURCES, null, 2),
  };
  const h = harness({ files, verifyUrls: ['https://b.example/pricing-2'] });
  const outcome = await enrichPrimer({
    htmlPath: 'p.html',
    sourcesPath: 'p.sources.json',
    corpus: CORPUS,
    tagVocabulary: TAG_VOCAB,
    tagSynonyms: TAG_SYN,
    opts: h.opts,
    deps: h.deps,
  });
  assert.equal(outcome.reverted, false);
  assert.equal(outcome.added, 1);
  const html = h.writes['p.html'];
  const sources = JSON.parse(h.writes['p.sources.json']);
  // in prose (inside the pricing H2)
  assert.match(html, /primer-enriched[\s\S]*b\.example\/pricing-2/);
  // in sources.json
  assert.ok(sources.some((s) => s.url === 'https://b.example/pricing-2'));
  // in References (regenerated) — appears twice-ish; assert membership
  const refBlock = /<h2 id="references">[\s\S]*<\/main>/.exec(html)[0];
  assert.ok(refBlock.includes('https://b.example/pricing-2'), 'new source in References');
  // rubric holds on the written artifact
  assert.equal(deterministicRubric(html, sources).pass, true);
});

test('cap enforcement: admitted new sources never exceed the cap', async () => {
  const files = { 'p.html': fixtureHtml(), 'p.sources.json': JSON.stringify(SOURCES, null, 2) };
  // verify admits all pricing candidates, but cap=1
  const h = harness({
    files,
    verifyUrls: ['https://b.example/pricing-2', 'https://c.example/pricing-3', 'https://d.example/pricing-4'],
    cap: 1,
  });
  const outcome = await enrichPrimer({
    htmlPath: 'p.html', sourcesPath: 'p.sources.json', corpus: CORPUS,
    tagVocabulary: TAG_VOCAB, tagSynonyms: TAG_SYN, opts: h.opts, deps: h.deps,
  });
  assert.ok(outcome.verified <= 1, `verified ${outcome.verified} must be <= cap 1`);
  assert.ok(outcome.added <= 1);
});

test('revert-on-rubric-fail: a broken weave reverts, files unchanged, reverted=true', async () => {
  const files = { 'p.html': fixtureHtml(), 'p.sources.json': JSON.stringify(SOURCES, null, 2) };
  const h = harness({ files, verifyUrls: ['https://b.example/pricing-2'] });
  // a weaver that injects a body href WITHOUT the caller being able to append it correctly —
  // simulate by weaving a DIFFERENT rogue url than the source, so R1 breaks.
  h.deps.weaver = (html, source) => {
    const mutated = html.replace('<h2 id="growth">', '<p><a href="https://rogue.example/not-a-source">rogue</a></p>\n<h2 id="growth">');
    return { html: mutated, woven: true };
  };
  const outcome = await enrichPrimer({
    htmlPath: 'p.html', sourcesPath: 'p.sources.json', corpus: CORPUS,
    tagVocabulary: TAG_VOCAB, tagSynonyms: TAG_SYN, opts: h.opts, deps: h.deps,
  });
  assert.equal(outcome.reverted, true);
  assert.ok(outcome.failing_checks.some((f) => f.check_id === 'R1'));
  assert.equal(h.writes['p.html'], undefined, 'no html write on revert');
  assert.equal(h.writes['p.sources.json'], undefined, 'no sources write on revert');
});

test('WebFetch-absent (default verify) admits zero and flags degraded', async () => {
  const files = { 'p.html': fixtureHtml(), 'p.sources.json': JSON.stringify(SOURCES, null, 2) };
  const store = { ...files };
  const writes = {};
  const outcome = await enrichPrimer({
    htmlPath: 'p.html', sourcesPath: 'p.sources.json', corpus: CORPUS,
    tagVocabulary: TAG_VOCAB, tagSynonyms: TAG_SYN,
    opts: { T: 1 },
    deps: {
      readFile: (p) => store[p],
      writeFile: (p, s) => { writes[p] = s; },
      log: () => {},
      // no verify -> default null-for-all
    },
  });
  assert.equal(outcome.degraded, true);
  assert.equal(outcome.added, 0);
  assert.deepEqual(writes, {}, 'nothing written in degraded mode');
});
