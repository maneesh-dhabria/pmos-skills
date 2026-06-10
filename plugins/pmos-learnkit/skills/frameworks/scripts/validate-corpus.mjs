#!/usr/bin/env node
// validate-corpus.mjs — schema + coverage validator for frameworks.json (and the
// situations.json cross-refs). Zero-dep Node ESM. Exit 1 on any failure, 0 on pass.
//
// Usage:
//   node validate-corpus.mjs <frameworks.json> [<situations.json>]
//   node validate-corpus.mjs --selftest
//
// Gates (see reference/corpus-schema.md → Validation rules):
//   - required lean fields present (id, name, category, body_md);
//   - problem_tags ⊆ registry; decision_type / lifecycle_stage ∈ enums;
//   - related[] ids resolve; situations[].frameworks[] ids resolve;
//     situations[].tags[] ⊆ registry;
//   - coverage: ≥95% name+body+references; 100% diagram OR logged exceptions; 0 bad tags.

import { readFileSync } from 'node:fs';
import { argv } from 'node:process';
import { fileURLToPath } from 'node:url';
import { DECISION_TYPES, LIFECYCLE_STAGES, validateAnchors } from './derive-fields.mjs';

const REQUIRED = ['id', 'name', 'category', 'body_md'];
// decision_type distribution gate — guards against a mega-bucket facet re-forming.
const DT_MAX_SHARE = 0.30; // no single value may exceed 30% of records
const NA_MAX_SHARE = 0.05; // n/a residual capped at 5%

export function validate(records, situations) {
  const errors = [];
  const warnings = [];
  const ids = new Set(records.map((r) => r.id));
  const registry = new Set((situations && situations.problem_tags) || []);

  let nameBodyOk = 0;
  let nameBodyRefOk = 0;
  let diagramOk = 0;
  let diagramException = 0;
  const dtCounts = {}; // decision_type → count, for the distribution gate

  for (const r of records) {
    for (const f of REQUIRED) {
      if (r[f] == null || String(r[f]).trim() === '') errors.push(`${r.id || '<no id>'}: missing required field "${f}"`);
    }
    if (registry.size) {
      for (const t of r.problem_tags || []) {
        if (!registry.has(t)) errors.push(`${r.id}: problem_tag "${t}" not in registry`);
      }
    }
    if (r.decision_type && !DECISION_TYPES.includes(r.decision_type)) errors.push(`${r.id}: invalid decision_type "${r.decision_type}"`);
    if (r.decision_type) dtCounts[r.decision_type] = (dtCounts[r.decision_type] || 0) + 1;
    for (const s of r.lifecycle_stage || []) {
      if (!LIFECYCLE_STAGES.includes(s)) errors.push(`${r.id}: invalid lifecycle_stage "${s}"`);
    }
    for (const rel of r.related || []) {
      if (!ids.has(rel)) errors.push(`${r.id}: related id "${rel}" does not resolve`);
    }
    // diagram_anchors — required on every record; parallel + substring-valid (FR-SCHEMA-5).
    if (!('diagram_anchors' in r)) errors.push(`${r.id}: missing required field "diagram_anchors"`);
    else for (const e of validateAnchors(r.id, r.diagrams, r.diagram_anchors, r.body_md)) errors.push(e);
    const hasName = r.name && String(r.name).trim();
    const hasBody = r.body_md && String(r.body_md).trim();
    const hasRefs = Array.isArray(r.references) && r.references.length > 0;
    if (hasName && hasBody) nameBodyOk++;
    if (hasName && hasBody && hasRefs) nameBodyRefOk++;
    if (r.diagram) diagramOk++;
    else { diagramException++; warnings.push(`${r.id}: no diagram (ship-with-warning)`); }
  }

  // decision_type distribution gate (FR-SCHEMA-4) — no mega-bucket, capped n/a residual.
  const dtTotal = Object.values(dtCounts).reduce((a, b) => a + b, 0);
  if (dtTotal > 0) {
    for (const [val, c] of Object.entries(dtCounts)) {
      const share = c / dtTotal;
      if (val !== 'n/a' && share > DT_MAX_SHARE) {
        errors.push(`decision_type "${val}" is ${(share * 100).toFixed(1)}% of corpus (> ${(DT_MAX_SHARE * 100)}% gate)`);
      }
    }
    const naShare = (dtCounts['n/a'] || 0) / dtTotal;
    if (naShare > NA_MAX_SHARE) errors.push(`decision_type "n/a" is ${(naShare * 100).toFixed(1)}% of corpus (> ${(NA_MAX_SHARE * 100)}% gate)`);
  }

  if (situations && Array.isArray(situations.situations)) {
    for (const s of situations.situations) {
      for (const fid of s.frameworks || []) {
        if (!ids.has(fid)) errors.push(`situation "${s.id}": framework "${fid}" does not resolve`);
      }
      for (const t of s.tags || []) {
        if (registry.size && !registry.has(t)) errors.push(`situation "${s.id}": tag "${t}" not in registry`);
      }
    }
  }

  const n = records.length || 1;
  // Hard gate: required-field (name+body) extraction completeness. references are
  // schema-optional (FR-SCHEMA-2) — some source frameworks cite no link — so they
  // are reported, not gated, to avoid checking source completeness as if it were
  // extraction quality.
  const nbCoverage = nameBodyOk / n;
  const nbrCoverage = nameBodyRefOk / n;
  if (nbCoverage < 0.95) errors.push(`name+body coverage ${(nbCoverage * 100).toFixed(1)}% < 95% (required fields)`);
  if (nbrCoverage < 0.95) warnings.push(`references coverage ${(nbrCoverage * 100).toFixed(1)}% — ${records.length - nameBodyRefOk} frameworks have no source reference (optional per schema)`);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    report: {
      count: records.length,
      name_body_coverage: +(nbCoverage * 100).toFixed(1),
      name_body_ref_coverage: +(nbrCoverage * 100).toFixed(1),
      diagram_coverage: +((diagramOk / n) * 100).toFixed(1),
      diagram_exceptions: diagramException,
      decision_type_distribution: dtCounts,
    },
  };
}

// ---- selftest -------------------------------------------------------------
function assert(cond, msg) { if (!cond) throw new Error(msg); }

function runSelftest() {
  // a balanced good corpus: 8 records spanning distinct decision_types (no value > 30%),
  // each carrying a present (possibly empty) diagram_anchors array.
  const DT8 = ['prioritize', 'decide', 'diagnose', 'estimate', 'strategize', 'design', 'communicate', 'frame'];
  const good = DT8.map((dt, i) => ({
    id: `a/${i}`, name: `F${i}`, category: 'A', body_md: 'prose body for the framework',
    references: [{ type: 'Article', url: 'u' }], problem_tags: i === 0 ? ['t1'] : [],
    decision_type: dt, lifecycle_stage: ['any'], related: [],
    diagram: i === 7 ? null : 'd.svg', diagrams: i === 7 ? [] : ['d.svg'],
    diagram_anchors: i === 7 ? [] : [null],
  }));
  const sit = { problem_tags: ['t1'], situations: [{ id: 's', tags: ['t1'], frameworks: ['a/0'] }] };
  let res = validate(good, sit);
  assert(res.ok, `good corpus should pass: ${res.errors.join('; ')}`);
  assert(res.report.diagram_exceptions === 1, 'one diagram exception counted');

  // a valid ≥40-char substring anchor passes (no decision_type → distribution gate inert)
  const anchored = [{ id: 'a/x', name: 'X', category: 'A', body_md: 'Reach × Impact × Confidence ÷ Effort is the core formula here.', references: [{ type: 'A', url: 'u' }], diagram: 'd.svg', diagrams: ['d.svg'], diagram_anchors: ['Reach × Impact × Confidence ÷ Effort is the core formula'] }];
  assert(validate(anchored, { problem_tags: [] }).ok, `valid substring anchor passes: ${validate(anchored, { problem_tags: [] }).errors.join('; ')}`);

  // OLD enum value rejected (clean break)
  const oldEnum = [{ id: 'a/x', name: 'X', category: 'A', body_md: 'p', references: [{ type: 'A', url: 'u' }], decision_type: 'framing', diagram_anchors: [] }];
  let rOld = validate(oldEnum, { problem_tags: [] });
  assert(!rOld.ok && rOld.errors.some((e) => /invalid decision_type "framing"/.test(e)), 'retired enum value rejected');

  // distribution gate: a value > 30% fails
  const skewed = [];
  for (let i = 0; i < 10; i++) skewed.push({ id: `s/${i}`, name: 'N', category: 'A', body_md: 'p', references: [{ type: 'A', url: 'u' }], decision_type: i < 5 ? 'frame' : DT8[i], diagram_anchors: [] });
  let rSkew = validate(skewed, { problem_tags: [] });
  assert(!rSkew.ok && rSkew.errors.some((e) => /decision_type "frame" is .*> 30% gate/.test(e)), 'distribution gate fires on mega-bucket');

  // n/a residual > 5% fails
  const naHeavy = [];
  for (let i = 0; i < 20; i++) naHeavy.push({ id: `na/${i}`, name: 'N', category: 'A', body_md: 'p', references: [{ type: 'A', url: 'u' }], decision_type: i < 2 ? 'n/a' : DT8[i % 8], diagram_anchors: [] });
  let rNa = validate(naHeavy, { problem_tags: [] });
  assert(!rNa.ok && rNa.errors.some((e) => /decision_type "n\/a" is .*> 5% gate/.test(e)), 'n/a residual gate fires');

  // missing diagram_anchors field rejected (clean break — required on every record)
  const noAnchorField = [{ id: 'a/x', name: 'X', category: 'A', body_md: 'p', references: [{ type: 'A', url: 'u' }], decision_type: 'frame', diagrams: ['d.svg'] }];
  let rNoAnc = validate(noAnchorField, { problem_tags: [] });
  assert(!rNoAnc.ok && rNoAnc.errors.some((e) => /missing required field "diagram_anchors"/.test(e)), 'missing diagram_anchors caught');

  // anchor length mismatch vs diagrams rejected
  const badLen = [{ id: 'a/x', name: 'X', category: 'A', body_md: 'p', references: [{ type: 'A', url: 'u' }], decision_type: 'frame', diagrams: ['d.svg'], diagram_anchors: [] }];
  let rBadLen = validate(badLen, { problem_tags: [] });
  assert(!rBadLen.ok && rBadLen.errors.some((e) => /diagram_anchors length 0 != diagrams length 1/.test(e)), 'anchor length mismatch caught');

  // dangling related
  let r2 = validate([{ id: 'a/x', name: 'X', category: 'A', body_md: 'p', references: [{ type: 'A', url: 'u' }], related: ['a/zzz'], diagram_anchors: [] }], { problem_tags: [] });
  assert(!r2.ok && r2.errors.some((e) => /related id "a\/zzz"/.test(e)), 'dangling related caught');

  // bad tag
  let r3 = validate([{ id: 'a/x', name: 'X', category: 'A', body_md: 'p', references: [{ type: 'A', url: 'u' }], problem_tags: ['nope'], diagram_anchors: [] }], { problem_tags: ['t1'] });
  assert(!r3.ok && r3.errors.some((e) => /problem_tag "nope"/.test(e)), 'bad tag caught');

  // dangling situation ref
  let r4 = validate(good, { problem_tags: ['t1'], situations: [{ id: 's', frameworks: ['a/ghost'] }] });
  assert(!r4.ok && r4.errors.some((e) => /framework "a\/ghost"/.test(e)), 'dangling situation ref caught');

  // missing required field
  let r5 = validate([{ id: 'a/x', name: '', category: 'A', body_md: 'p', references: [{ type: 'A', url: 'u' }], diagram_anchors: [] }], { problem_tags: [] });
  assert(!r5.ok && r5.errors.some((e) => /missing required field "name"/.test(e)), 'missing field caught');

  // hard coverage gate fires on missing required fields (name+body), not on refs
  const lowCov = [];
  for (let i = 0; i < 20; i++) lowCov.push({ id: `a/${i}`, name: 'N', category: 'A', body_md: i < 10 ? 'p' : '', references: [{ type: 'A', url: 'u' }], diagram_anchors: [] });
  let r6 = validate(lowCov, { problem_tags: [] });
  assert(!r6.ok && r6.errors.some((e) => /name\+body coverage .* < 95%/.test(e)), 'name+body gate fires');

  // missing references alone is a WARNING, not a hard failure (schema-optional)
  const noRefs = [];
  for (let i = 0; i < 20; i++) noRefs.push({ id: `b/${i}`, name: 'N', category: 'B', body_md: 'p', references: i < 5 ? [{ type: 'A', url: 'u' }] : [], decision_type: DT8[i % 8], diagram_anchors: [] });
  let r7 = validate(noRefs, { problem_tags: [] });
  assert(r7.ok, `ref-less corpus passes the hard gate: ${r7.errors.join('; ')}`);
  assert(r7.warnings.some((w) => /references coverage/.test(w)), 'low ref coverage warned');

  console.log('validate-corpus --selftest: PASS (schema + coverage + xref + dist + anchors)');
}

function main() {
  const args = argv.slice(2);
  if (args.includes('--selftest')) {
    try { runSelftest(); } catch (e) { console.error(`validate-corpus --selftest: FAIL — ${e.message}`); process.exit(1); }
    return;
  }
  const pos = args.filter((a) => !a.startsWith('--'));
  if (!pos[0]) { console.error('usage: validate-corpus.mjs <frameworks.json> [<situations.json>]'); process.exit(64); }
  const records = JSON.parse(readFileSync(pos[0], 'utf8'));
  const situations = pos[1] ? JSON.parse(readFileSync(pos[1], 'utf8')) : null;
  const res = validate(records, situations);
  console.error(`corpus: ${res.report.count} frameworks · name+body ${res.report.name_body_coverage}% · with-refs ${res.report.name_body_ref_coverage}% · diagram ${res.report.diagram_coverage}% (${res.report.diagram_exceptions} exceptions)`);
  if (res.warnings.length) console.error(`warnings: ${res.warnings.length} (ship-with-warning diagrams)`);
  if (!res.ok) {
    console.error(`validate-corpus: ${res.errors.length} error(s):`);
    res.errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.error('validate-corpus: PASS');
}

if (argv[1] && fileURLToPath(import.meta.url) === argv[1]) {
  main();
}
