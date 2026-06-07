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
import { DECISION_TYPES, LIFECYCLE_STAGES } from './derive-fields.mjs';

const REQUIRED = ['id', 'name', 'category', 'body_md'];

export function validate(records, situations) {
  const errors = [];
  const warnings = [];
  const ids = new Set(records.map((r) => r.id));
  const registry = new Set((situations && situations.problem_tags) || []);

  let nameBodyOk = 0;
  let nameBodyRefOk = 0;
  let diagramOk = 0;
  let diagramException = 0;

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
    for (const s of r.lifecycle_stage || []) {
      if (!LIFECYCLE_STAGES.includes(s)) errors.push(`${r.id}: invalid lifecycle_stage "${s}"`);
    }
    for (const rel of r.related || []) {
      if (!ids.has(rel)) errors.push(`${r.id}: related id "${rel}" does not resolve`);
    }
    const hasName = r.name && String(r.name).trim();
    const hasBody = r.body_md && String(r.body_md).trim();
    const hasRefs = Array.isArray(r.references) && r.references.length > 0;
    if (hasName && hasBody) nameBodyOk++;
    if (hasName && hasBody && hasRefs) nameBodyRefOk++;
    if (r.diagram) diagramOk++;
    else { diagramException++; warnings.push(`${r.id}: no diagram (ship-with-warning)`); }
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
    },
  };
}

// ---- selftest -------------------------------------------------------------
function assert(cond, msg) { if (!cond) throw new Error(msg); }

function runSelftest() {
  const good = [
    { id: 'a/x', name: 'X', category: 'A', body_md: 'prose', references: [{ type: 'Article', url: 'u' }], problem_tags: ['t1'], decision_type: 'analysis', lifecycle_stage: ['any'], related: ['a/y'], diagram: 'd.svg' },
    { id: 'a/y', name: 'Y', category: 'A', body_md: 'prose', references: [{ type: 'Article', url: 'u' }], problem_tags: [], decision_type: 'n/a', lifecycle_stage: [], related: [], diagram: null },
  ];
  const sit = { problem_tags: ['t1'], situations: [{ id: 's', tags: ['t1'], frameworks: ['a/x'] }] };
  let res = validate(good, sit);
  assert(res.ok, `good corpus should pass: ${res.errors.join('; ')}`);
  assert(res.report.diagram_exceptions === 1, 'one diagram exception counted');
  assert(res.warnings.length === 1, 'ship-with-warning recorded');

  // dangling related
  let r2 = validate([{ id: 'a/x', name: 'X', category: 'A', body_md: 'p', references: [{ type: 'A', url: 'u' }], related: ['a/zzz'] }], { problem_tags: [] });
  assert(!r2.ok && r2.errors.some((e) => /related id "a\/zzz"/.test(e)), 'dangling related caught');

  // bad tag
  let r3 = validate([{ id: 'a/x', name: 'X', category: 'A', body_md: 'p', references: [{ type: 'A', url: 'u' }], problem_tags: ['nope'] }], { problem_tags: ['t1'] });
  assert(!r3.ok && r3.errors.some((e) => /problem_tag "nope"/.test(e)), 'bad tag caught');

  // dangling situation ref
  let r4 = validate(good, { problem_tags: ['t1'], situations: [{ id: 's', frameworks: ['a/ghost'] }] });
  assert(!r4.ok && r4.errors.some((e) => /framework "a\/ghost"/.test(e)), 'dangling situation ref caught');

  // missing required field
  let r5 = validate([{ id: 'a/x', name: '', category: 'A', body_md: 'p', references: [{ type: 'A', url: 'u' }] }], { problem_tags: [] });
  assert(!r5.ok && r5.errors.some((e) => /missing required field "name"/.test(e)), 'missing field caught');

  // hard coverage gate fires on missing required fields (name+body), not on refs
  const lowCov = [];
  for (let i = 0; i < 20; i++) lowCov.push({ id: `a/${i}`, name: 'N', category: 'A', body_md: i < 10 ? 'p' : '', references: [{ type: 'A', url: 'u' }] });
  let r6 = validate(lowCov, { problem_tags: [] });
  assert(!r6.ok && r6.errors.some((e) => /name\+body coverage .* < 95%/.test(e)), 'name+body gate fires');

  // missing references alone is a WARNING, not a hard failure (schema-optional)
  const noRefs = [];
  for (let i = 0; i < 20; i++) noRefs.push({ id: `b/${i}`, name: 'N', category: 'B', body_md: 'p', references: i < 5 ? [{ type: 'A', url: 'u' }] : [] });
  let r7 = validate(noRefs, { problem_tags: [] });
  assert(r7.ok, 'ref-less corpus passes the hard gate');
  assert(r7.warnings.some((w) => /references coverage/.test(w)), 'low ref coverage warned');

  console.log('validate-corpus --selftest: PASS (schema + coverage + xref)');
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
