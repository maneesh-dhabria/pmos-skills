#!/usr/bin/env node
// apply-rederive.mjs — merge a Stage-B re-derive batch ({id, decision_type,
// diagram_anchors}) into frameworks.json, validating every entry. Zero-dep Node ESM.
//
// Usage:
//   node apply-rederive.mjs --in <derived.json> [--corpus <frameworks.json>]
//   node apply-rederive.mjs --selftest
//
// <derived.json> : an array (or {id: entry} map) of
//   { id, decision_type: <one of the 8 | n/a>, diagram_anchors: [<≥40-char body_md substr> | null, ...] }
//   diagram_anchors.length MUST equal the record's diagrams.length.
//
// Incremental + idempotent: only records present in <derived.json> are touched; the rest
// are left byte-identical. A valid entry is applied; an INVALID entry is skipped (the old
// values are kept) and reported. Exit 1 if any entry was invalid or named an unknown id —
// so the operator can fix just those and re-run (loop until clean). The corpus is still
// written with the valid subset applied, so re-runs converge. Final corpus-wide presence /
// distribution gating is validate-corpus.mjs's job, not this script's.

import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { argv } from 'node:process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DECISION_TYPES, validateAnchors } from './derive-fields.mjs';

export function applyRederive(records, derived) {
  const map = Array.isArray(derived)
    ? Object.fromEntries(derived.map((d) => [d.id, d]))
    : (derived || {});
  const ids = new Set(records.map((r) => r.id));
  const errors = [];
  let applied = 0;

  for (const did of Object.keys(map)) {
    if (!ids.has(did)) errors.push(`${did}: id not found in corpus (typo in re-derive batch?)`);
  }

  const out = records.map((r) => {
    const d = map[r.id];
    if (!d) return r; // not in this batch — leave untouched
    const errs = [];
    if (!DECISION_TYPES.includes(d.decision_type)) {
      errs.push(`${r.id}: invalid decision_type "${d.decision_type}"`);
    }
    const anchors = Array.isArray(d.diagram_anchors) ? d.diagram_anchors : null;
    if (anchors === null) errs.push(`${r.id}: diagram_anchors missing or not an array in re-derive entry`);
    else errs.push(...validateAnchors(r.id, r.diagrams, anchors, r.body_md));
    if (errs.length) { errors.push(...errs); return r; } // keep old values, report
    applied++;
    return { ...r, decision_type: d.decision_type, diagram_anchors: anchors };
  });

  return { records: out, errors, applied };
}

// ---- selftest -------------------------------------------------------------
function assert(cond, msg) { if (!cond) throw new Error(msg); }

function runSelftest() {
  const corpus = [
    { id: 'a/x', name: 'X', body_md: 'RICE scores each feature on Reach, Impact, Confidence, Effort here.', diagrams: ['data/diagrams/a__x.svg'], decision_type: 'n/a' },
    { id: 'a/y', name: 'Y', body_md: 'Y has two structural sub-models that the diagrams illustrate well.', diagrams: ['data/diagrams/a__y.svg', 'data/diagrams/a__y__2.svg'], decision_type: 'n/a' },
    { id: 'a/z', name: 'Z', body_md: 'Z is a purely textual framework with no diagram at all.', diagrams: [], decision_type: 'n/a' },
  ];

  // valid batch — applies decision_type + anchors
  const good = [
    { id: 'a/x', decision_type: 'prioritize', diagram_anchors: ['RICE scores each feature on Reach, Impact, Confidence, Effort'] },
    { id: 'a/y', decision_type: 'design', diagram_anchors: ['Y has two structural sub-models that the diagrams illustrate well.', null] },
    { id: 'a/z', decision_type: 'frame', diagram_anchors: [] },
  ];
  let res = applyRederive(corpus, good);
  assert(res.errors.length === 0, `good batch should apply cleanly: ${res.errors.join('; ')}`);
  assert(res.applied === 3, 'all three applied');
  assert(res.records[0].decision_type === 'prioritize', 'decision_type applied');
  assert(res.records[0].diagram_anchors.length === 1, 'anchor applied');
  assert(res.records[1].diagram_anchors[1] === null, 'null anchor preserved');

  // incremental: a partial batch touches only its ids
  let partial = applyRederive(corpus, [{ id: 'a/x', decision_type: 'decide', diagram_anchors: [null] }]);
  assert(partial.records[0].decision_type === 'decide', 'partial applied to a/x');
  assert(partial.records[1].decision_type === 'n/a', 'a/y untouched by partial batch');

  // bad enum rejected, old value kept
  let badEnum = applyRederive(corpus, [{ id: 'a/x', decision_type: 'vibes', diagram_anchors: [null] }]);
  assert(badEnum.errors.some((e) => /invalid decision_type "vibes"/.test(e)), 'bad enum rejected');
  assert(badEnum.records[0].decision_type === 'n/a', 'invalid entry leaves old value intact');

  // retired old-enum value rejected (clean break)
  let oldEnum = applyRederive(corpus, [{ id: 'a/x', decision_type: 'framing', diagram_anchors: [null] }]);
  assert(oldEnum.errors.some((e) => /invalid decision_type "framing"/.test(e)), 'retired enum rejected');

  // anchor not a substring rejected
  let badAnchor = applyRederive(corpus, [{ id: 'a/x', decision_type: 'prioritize', diagram_anchors: ['this forty-plus character string is not in the body text'] }]);
  assert(badAnchor.errors.some((e) => /not a verbatim substring of body_md/.test(e)), 'non-substring anchor rejected');

  // anchor too short rejected
  let shortAnchor = applyRederive(corpus, [{ id: 'a/x', decision_type: 'prioritize', diagram_anchors: ['too short'] }]);
  assert(shortAnchor.errors.some((e) => /need ≥40/.test(e)), 'short anchor rejected');

  // length mismatch rejected
  let lenMismatch = applyRederive(corpus, [{ id: 'a/y', decision_type: 'design', diagram_anchors: [null] }]);
  assert(lenMismatch.errors.some((e) => /diagram_anchors length 1 != diagrams length 2/.test(e)), 'length mismatch rejected');

  // unknown id rejected
  let unknown = applyRederive(corpus, [{ id: 'a/ghost', decision_type: 'frame', diagram_anchors: [] }]);
  assert(unknown.errors.some((e) => /a\/ghost: id not found in corpus/.test(e)), 'unknown id rejected');

  console.log('apply-rederive --selftest: PASS (merge + enum + anchor validation, incremental)');
}

function main() {
  const args = argv.slice(2);
  if (args.includes('--selftest')) {
    try { runSelftest(); } catch (e) { console.error(`apply-rederive --selftest: FAIL — ${e.message}`); process.exit(1); }
    return;
  }
  const flag = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : null; };
  const here = dirname(fileURLToPath(import.meta.url));
  const inPath = flag('in');
  if (!inPath) { console.error('usage: apply-rederive.mjs --in <derived.json> [--corpus <frameworks.json>]'); process.exit(64); }
  const corpusPath = flag('corpus') || join(here, '..', 'data', 'frameworks.json');
  const records = JSON.parse(readFileSync(corpusPath, 'utf8'));
  const derived = JSON.parse(readFileSync(inPath, 'utf8'));
  const { records: out, errors, applied } = applyRederive(records, derived);

  // write the valid subset (atomic temp-then-rename); a re-run converges remaining ids.
  const tmp = corpusPath + '.tmp';
  writeFileSync(tmp, JSON.stringify(out, null, 2) + '\n');
  renameSync(tmp, corpusPath);
  console.error(`apply-rederive: applied ${applied} record(s) to ${corpusPath}`);

  if (errors.length) {
    console.error(`apply-rederive: ${errors.length} entry error(s) — fix these ids and re-run:`);
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.error('apply-rederive: PASS (all batch entries valid)');
}

if (argv[1] && fileURLToPath(import.meta.url) === argv[1]) {
  main();
}
