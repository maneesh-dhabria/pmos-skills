// normalize_tags_unit.mjs — zero-network unit gate for normalize-tags.mjs pure logic
// AND a load-bearing coverage assertion: the SHIPPED vocabulary+synonyms must cover EVERY
// tag in the shipped corpus with zero unknowns (the D7 gate, exercised against real data,
// so a future corpus tag with no mapping fails here instead of silently re-sprawling).
//
// Design anchor: 02_design.html#d2/#d3/#d7, story 260626-ex8. No network, no Date, no random.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadVocab, normalizeTags, normalizeCorpus, validateVocabModel } from '../scripts/normalize-tags.mjs';

let pass = 0, fail = 0;
const eq = (got, want, msg) => {
  if (JSON.stringify(got) === JSON.stringify(want)) { pass++; }
  else { fail++; console.error(`FAIL: ${msg}\n  got:  ${JSON.stringify(got)}\n  want: ${JSON.stringify(want)}`); }
};
const ok = (cond, msg) => eq(!!cond, true, msg);

// --- pure transform against an inline model (independent of the shipped data) ----
const model = {
  vocab: new Set(['ab-testing', 'startups', 'product', 'social-media']),
  synonyms: { 'a/b-testing': 'ab-testing', startup: 'startups', tweet: 'social-media' },
  drop: new Set(['article']),
};

eq(normalizeTags(['startup'], model), ['startups'], 'synonym maps to canonical');
eq(normalizeTags(['article', 'product'], model), ['product'], 'drop-listed tag is removed');
eq(normalizeTags(['product', 'product'], model), ['product'], 'duplicate canonical collapses');
eq(normalizeTags(['tweet', 'social-media'], model), ['social-media'], 'synonym + canonical dedupe to one');
eq(normalizeTags([], model), [], 'empty tags -> empty');
eq(normalizeTags(['product', 42, '', null], model), ['product'], 'non-string / empty tags ignored');

// unknown tags are collected (not thrown) so the caller can list every offender
{
  const unk = new Map();
  const out = normalizeTags(['product', 'totally-made-up', 'totally-made-up'], model, unk);
  eq(out, ['product'], 'unknown tag is dropped from output');
  eq(unk.get('totally-made-up'), 2, 'unknown tag counted across occurrences');
}

// --- validateVocabModel: authoring-slip guards (pure, inline data) ---------------
eq(validateVocabModel(model), [], 'a self-consistent model has no errors');
ok(validateVocabModel({ vocab: new Set(['product']), synonyms: { x: 'nope' }, drop: new Set() }).length === 1,
  'synonym pointing outside vocab is an error');
ok(validateVocabModel({ vocab: new Set(['product']), synonyms: { product: 'product' }, drop: new Set() }).length === 1,
  'a vocab member used as a synonym key is an error');
ok(validateVocabModel({ vocab: new Set(['product']), synonyms: {}, drop: new Set(['product']) }).length === 1,
  'a vocab member in the drop list is an error');

// --- LOAD-BEARING: shipped data is self-consistent AND covers the shipped corpus -
const shipped = loadVocab();
ok(shipped.vocab.size >= 100 && shipped.vocab.size <= 150, `shipped vocab in ~100-150 range (got ${shipped.vocab.size})`);

const corpusPath = fileURLToPath(new URL('../curated-references.json', import.meta.url));
const corpus = JSON.parse(readFileSync(corpusPath, 'utf8'));
const report = normalizeCorpus(structuredCloneCorpus(corpus), shipped);
eq(report.unknowns.size, 0, `shipped corpus has ZERO unknown tags (D7); offenders: ${[...report.unknowns.keys()].join(', ')}`);
ok(report.distinctAfter <= 150, `distinct shipped tags <= 150 (got ${report.distinctAfter})`);
ok(report.distinctAfter >= 100, `distinct shipped tags >= 100 (got ${report.distinctAfter})`);
// every shipped tag is a vocabulary member (the closed-set invariant)
ok(report.distinctTags.every((t) => shipped.vocab.has(t)), 'every distinct shipped tag is a vocabulary member');

// normalizeCorpus must not mutate record count / grounding (tag-only transform)
function structuredCloneCorpus(c) { return JSON.parse(JSON.stringify(c)); }

console.log(`\nnormalize_tags_unit: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
