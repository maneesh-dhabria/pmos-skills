#!/usr/bin/env node
// corpus-vocab.mjs — the closed corpus vocabulary + diagram-anchor validator.
// Zero-dep Node ESM. This is the load-bearing substrate validate-corpus.mjs depends
// on: the decision_type / lifecycle_stage enums and the diagram_anchors checker.
// It carries no Notion/sync machinery — the corpus is maintained by direct authoring
// (see reference/corpus-expansion.md); this module is purely the shared vocabulary.
//
// Usage:
//   node corpus-vocab.mjs --selftest
//
// Consumed by validate-corpus.mjs (the corpus gate) — keep it dependency-free.

import { argv } from 'node:process';
import { fileURLToPath } from 'node:url';

// Cognitive-job taxonomy (v0.18 clean break — the pre-v0.18 enum
// judgment/analysis/prioritization/framing/estimation is retired and rejected).
export const DECISION_TYPES = ['prioritize', 'decide', 'diagnose', 'estimate', 'strategize', 'design', 'communicate', 'frame', 'n/a'];
export const LIFECYCLE_STAGES = ['discovery', 'definition', 'delivery', 'growth', 'any'];

// Validate a record's diagram_anchors[] against its diagrams[] + body_md.
// Returns an array of error strings ([] when valid). Each non-null anchor must be a
// ≥40-char verbatim substring of body_md; the array length must match diagrams[].
export function validateAnchors(id, diagrams, anchors, body_md) {
  const errs = [];
  const diagLen = Array.isArray(diagrams) ? diagrams.length : 0;
  if (!Array.isArray(anchors)) { errs.push(`${id}: diagram_anchors must be an array`); return errs; }
  if (anchors.length !== diagLen) errs.push(`${id}: diagram_anchors length ${anchors.length} != diagrams length ${diagLen}`);
  const body = String(body_md || '');
  anchors.forEach((a, i) => {
    if (a == null) return; // null = top-of-body fallback, always valid
    if (typeof a !== 'string') { errs.push(`${id}: diagram_anchors[${i}] must be a string or null`); return; }
    if (a.length < 40) errs.push(`${id}: diagram_anchors[${i}] is ${a.length} chars (need ≥40)`);
    else if (!body.includes(a)) errs.push(`${id}: diagram_anchors[${i}] not a verbatim substring of body_md`);
  });
  return errs;
}

// ---- selftest -------------------------------------------------------------
function assert(cond, msg) { if (!cond) { throw new Error(msg); } }

function runSelftest() {
  // enums are the closed v0.18 vocabulary
  assert(DECISION_TYPES.length === 9 && DECISION_TYPES.includes('strategize') && DECISION_TYPES.includes('n/a'), 'decision_type enum shape');
  assert(LIFECYCLE_STAGES.length === 5 && LIFECYCLE_STAGES.includes('any'), 'lifecycle_stage enum shape');

  const body = 'This forty-plus character sentence lives verbatim in the body_md for anchoring.';
  // valid: one diagram, one ≥40-char substring anchor
  assert(validateAnchors('a/x', ['d.svg'], [body.slice(0, 50)], body).length === 0, 'valid anchor passes');
  // valid: null anchor (top-of-body fallback)
  assert(validateAnchors('a/x', ['d.svg'], [null], body).length === 0, 'null anchor passes');
  // length mismatch
  assert(validateAnchors('a/x', ['d.svg'], [], body).some((e) => /length/.test(e)), 'length mismatch flagged');
  // too-short anchor
  assert(validateAnchors('a/x', ['d.svg'], ['too short'], body).some((e) => /need ≥40/.test(e)), 'short anchor flagged');
  // not a substring
  assert(validateAnchors('a/x', ['d.svg'], ['this forty-plus character string is absent from the body'], body).some((e) => /verbatim substring/.test(e)), 'non-substring anchor flagged');

  console.log('corpus-vocab --selftest: PASS (enums + anchor validation)');
}

// Only run as a CLI when invoked directly — never as an import side-effect
// (validate-corpus.mjs imports this module and runs its own --selftest).
if (argv[1] && fileURLToPath(import.meta.url) === argv[1] && argv.includes('--selftest')) {
  try { runSelftest(); } catch (e) { console.error(`corpus-vocab --selftest: FAIL — ${e.message}`); process.exit(1); }
}
