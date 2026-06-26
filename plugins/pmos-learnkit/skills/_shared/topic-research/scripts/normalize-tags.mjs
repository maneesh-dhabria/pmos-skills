// normalize-tags.mjs — closed-vocabulary tag normalization for curated-references.json.
//
// Design anchors: 02_design.html#d2 (vocab-as-data), #d3 (normalize at import time),
// #d7 (closed-set gate), story 260626-ex8 AC2/AC3/AC4/AC5.
//
// The SINGLE enforcement point for which tags may ship. The closed vocabulary lives in
// tag-vocabulary.json and the variant->canonical map + drop list in tag-synonyms.json
// (siblings of this substrate dir) — both reviewable data, tuned without editing code
// (D2). `import-curated-references.mjs` calls normalizeTags() at its per-record tag-write
// point so a future refresh stays clean (D3); this file also exposes a CLI that re-tags an
// existing corpus in place (a pure, tag-only transform that preserves titles/summaries —
// used to apply the vocabulary to the af6-backfilled corpus without a destructive
// re-import).
//
// D7 gate: a tag that, after synonym mapping, is neither a vocabulary member nor an
// explicit drop is UNKNOWN. A non-zero unknown count is a BUILD FAILURE (loud, listing the
// offenders) — never a silent pass — so the taxonomy cannot silently re-sprawl: the
// maintainer either adds the tag to the vocabulary or extends the synonym/drop map.
//
// Pure: no network, no Date, no Math.random.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const VOCAB_URL = new URL('../tag-vocabulary.json', import.meta.url);
const SYN_URL = new URL('../tag-synonyms.json', import.meta.url);

// ---- vocabulary loading -----------------------------------------------------

// Load the closed vocabulary + synonym/drop map into the shapes normalizeTags wants.
// Validates the data files themselves (every synonym target must be a vocabulary member;
// no tag may be in two coverage sets) so an authoring slip in the data fails fast.
export function loadVocab(vocabUrl = VOCAB_URL, synUrl = SYN_URL) {
  const vocabRaw = JSON.parse(readFileSync(vocabUrl, 'utf8'));
  const synRaw = JSON.parse(readFileSync(synUrl, 'utf8'));
  const model = {
    vocab: new Set(vocabRaw.tags),
    synonyms: synRaw.synonyms || {},
    drop: new Set(synRaw.drop || []),
  };
  const errors = validateVocabModel(model);
  if (errors.length) throw new Error(`tag vocabulary data is inconsistent:\n  - ${errors.join('\n  - ')}`);
  return model;
}

// validateVocabModel(model) — pure. Returns a list of human-readable problems (empty when
// the data is self-consistent): every synonym target must be a vocabulary member, and the
// three coverage sets (vocab / synonym-keys / drop) must be disjoint so each tag has
// exactly one home. Exported so the unit gate can exercise it with inline data.
export function validateVocabModel({ vocab, synonyms, drop }) {
  const errors = [];
  for (const [variant, canonical] of Object.entries(synonyms)) {
    if (!vocab.has(canonical)) errors.push(`synonym "${variant}" -> "${canonical}" is not a vocabulary member`);
    if (vocab.has(variant)) errors.push(`"${variant}" is both a vocabulary member and a synonym key`);
    if (drop.has(variant)) errors.push(`"${variant}" is both a synonym key and a drop entry`);
  }
  for (const d of drop) if (vocab.has(d)) errors.push(`"${d}" is both a vocabulary member and a drop entry`);
  return errors;
}

// ---- the transform ----------------------------------------------------------

// normalizeTags(tags, model, unknowns?) — pure. Maps each tag through the synonym map,
// drops explicit drops, keeps vocabulary members, and records anything else in `unknowns`
// (a Map of tag -> count) for the caller's D7 gate. Returns a deduped, order-preserving
// array of canonical tags. Never throws on an unknown tag — collecting-then-gating lets the
// caller report EVERY offender in one pass rather than dying on the first.
export function normalizeTags(tags, model, unknowns = new Map()) {
  const { vocab, synonyms, drop } = model;
  const out = [];
  const seen = new Set();
  for (const raw of Array.isArray(tags) ? tags : []) {
    if (typeof raw !== 'string' || !raw) continue;
    if (drop.has(raw)) continue;
    const canonical = Object.prototype.hasOwnProperty.call(synonyms, raw) ? synonyms[raw] : raw;
    if (!vocab.has(canonical)) {
      unknowns.set(raw, (unknowns.get(raw) || 0) + 1);
      continue;
    }
    if (!seen.has(canonical)) { seen.add(canonical); out.push(canonical); }
  }
  return out;
}

// normalizeCorpus(corpus, model) — applies normalizeTags to every record's `tags`
// in place (tag-only; title/summary/id untouched) and returns a report. Collects unknowns
// across the whole corpus so the D7 gate can list all offenders at once.
export function normalizeCorpus(corpus, model = loadVocab()) {
  const unknowns = new Map();
  let before = 0;
  let after = 0;
  const distinct = new Set();
  for (const r of corpus.references) {
    before += Array.isArray(r.tags) ? r.tags.length : 0;
    r.tags = normalizeTags(r.tags, model, unknowns);
    after += r.tags.length;
    for (const t of r.tags) distinct.add(t);
  }
  return {
    records: corpus.references.length,
    assignmentsBefore: before,
    assignmentsAfter: after,
    distinctAfter: distinct.size,
    distinctTags: [...distinct].sort(),
    unknowns,
  };
}

// ---- CLI: re-tag an existing corpus in place + D7 gate ----------------------
//
// node normalize-tags.mjs <corpus.json> [--write]
//   default: dry-run report (exits 1 on any unknown tag — the D7 build gate).
//   --write: rewrites <corpus.json> with normalized tags (only after the gate passes).

function main(argv) {
  const args = argv.slice(2);
  const write = args.includes('--write');
  const path = args.find((a) => !a.startsWith('--'));
  if (!path) {
    console.error('usage: node normalize-tags.mjs <corpus.json> [--write]');
    process.exit(64);
  }
  const model = loadVocab();
  const corpus = JSON.parse(readFileSync(path, 'utf8'));
  const report = normalizeCorpus(corpus, model);

  console.error(`normalize-tags: ${report.records} records | tag-assignments ${report.assignmentsBefore} -> ${report.assignmentsAfter} | distinct tags -> ${report.distinctAfter} (vocab size ${model.vocab.size})`);

  if (report.unknowns.size) {
    const offenders = [...report.unknowns.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} (${n})`);
    console.error(`\nBUILD FAILURE (D7): ${report.unknowns.size} tag(s) outside the closed vocabulary after normalization:`);
    console.error(`  ${offenders.join('\n  ')}`);
    console.error('\nFix: add each to tag-vocabulary.json, or map/drop it in tag-synonyms.json.');
    process.exit(1);
  }

  if (write) {
    // Re-derive meta.counts? No — tag normalization does not change record count or
    // grounding. Keep meta untouched; only `tags[]` mutated.
    writeFileSync(path, JSON.stringify(corpus, null, 2) + '\n');
    console.error(`wrote ${path} (tags normalized; ${report.distinctAfter} distinct tags)`);
  } else {
    console.error('gate PASS — re-run with --write to apply.');
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) main(process.argv);
