#!/usr/bin/env node
// derive-fields.mjs — merge LLM-derived match-fields into lean records, validating
// every value against the closed vocabulary. Zero-dep Node ESM.
//
// Usage:
//   node derive-fields.mjs --merge <lean.json> <derived.json> [--registry <situations.json>]
//   node derive-fields.mjs --selftest
//
// <lean.json>    : array of lean records from split-corpus.mjs.
// <derived.json> : array of {id, problem_tags, when_to_use, when_not_to_use,
//                  decision_type, lifecycle_stage, related, summary, aliases}
//                  (or a map keyed by id). Any field may be omitted → sparse default.
// Emits the merged full-record array to stdout. Exit 1 on any invalid enum/tag.

import { readFileSync } from 'node:fs';
import { argv } from 'node:process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const DECISION_TYPES = ['judgment', 'analysis', 'prioritization', 'framing', 'estimation', 'n/a'];
export const LIFECYCLE_STAGES = ['discovery', 'definition', 'delivery', 'growth', 'any'];

function firstSentence(body, max = 160) {
  if (!body) return '';
  const text = body.replace(/^[-*\s]+/, '').replace(/[*_`#>]/g, '').replace(/\s+/g, ' ').trim();
  const m = /^(.+?[.!?])(\s|$)/.exec(text);
  let s = m ? m[1] : text;
  if (s.length > max) s = s.slice(0, max - 1).trimEnd() + '…';
  return s.trim();
}

export function deriveMerge(lean, derived, registry) {
  const tagSet = new Set(registry);
  const derivedMap = Array.isArray(derived)
    ? Object.fromEntries(derived.map((d) => [d.id, d]))
    : derived || {};
  const errors = [];
  const out = lean.map((rec) => {
    const d = derivedMap[rec.id] || {};
    const problem_tags = Array.isArray(d.problem_tags) ? d.problem_tags : [];
    for (const t of problem_tags) {
      if (!tagSet.has(t)) errors.push(`${rec.id}: unknown problem_tag "${t}" (not in registry)`);
    }
    let decision_type = d.decision_type || 'n/a';
    if (!DECISION_TYPES.includes(decision_type)) {
      errors.push(`${rec.id}: invalid decision_type "${decision_type}"`);
      decision_type = 'n/a';
    }
    let lifecycle_stage = Array.isArray(d.lifecycle_stage) ? d.lifecycle_stage : [];
    for (const s of lifecycle_stage) {
      if (!LIFECYCLE_STAGES.includes(s)) errors.push(`${rec.id}: invalid lifecycle_stage "${s}"`);
    }
    return {
      ...rec,
      summary: (d.summary && String(d.summary).trim()) || firstSentence(rec.body_md),
      aliases: Array.isArray(d.aliases) ? d.aliases : [],
      problem_tags,
      when_to_use: (d.when_to_use && String(d.when_to_use).trim()) || '',
      when_not_to_use: (d.when_not_to_use && String(d.when_not_to_use).trim()) || '',
      decision_type,
      lifecycle_stage,
      related: Array.isArray(d.related) ? d.related : [],
    };
  });
  return { records: out, errors };
}

function loadRegistry(path) {
  const j = JSON.parse(readFileSync(path, 'utf8'));
  return Array.isArray(j.problem_tags) ? j.problem_tags : [];
}

// ---- selftest -------------------------------------------------------------
function assert(cond, msg) { if (!cond) { throw new Error(msg); } }

function runSelftest() {
  const registry = ['prioritization', 'irreversible-decision', 'high-stakes'];
  const lean = [
    { id: 'a/x', name: 'X', category: 'A', body_md: 'X helps you decide. More prose.' },
    { id: 'a/y', name: 'Y', category: 'A', body_md: 'Y is sparse.' },
  ];
  // valid merge
  const okDerived = [
    { id: 'a/x', problem_tags: ['prioritization'], decision_type: 'prioritization', lifecycle_stage: ['any'], summary: 'X tightened.', related: ['a/y'], aliases: ['Ex'], when_to_use: 'When deciding.' },
  ];
  let { records, errors } = deriveMerge(lean, okDerived, registry);
  assert(errors.length === 0, `unexpected errors: ${errors.join('; ')}`);
  assert(records[0].summary === 'X tightened.', 'summary merge');
  assert(records[0].problem_tags[0] === 'prioritization', 'tag merge');
  assert(records[0].decision_type === 'prioritization', 'decision_type merge');
  assert(records[1].summary === 'Y is sparse.', `sparse summary fallback: ${records[1].summary}`);
  assert(records[1].problem_tags.length === 0, 'sparse record validates with empty tags');
  assert(records[1].decision_type === 'n/a', 'sparse decision_type default');

  // invalid tag → error
  const badTag = deriveMerge(lean, [{ id: 'a/x', problem_tags: ['not-a-tag'] }], registry);
  assert(badTag.errors.some((e) => /unknown problem_tag "not-a-tag"/.test(e)), 'unknown tag rejected');

  // invalid decision_type → error
  const badEnum = deriveMerge(lean, [{ id: 'a/x', decision_type: 'vibes' }], registry);
  assert(badEnum.errors.some((e) => /invalid decision_type "vibes"/.test(e)), 'bad enum rejected');

  // invalid lifecycle_stage → error
  const badStage = deriveMerge(lean, [{ id: 'a/x', lifecycle_stage: ['someday'] }], registry);
  assert(badStage.errors.some((e) => /invalid lifecycle_stage "someday"/.test(e)), 'bad stage rejected');

  console.log('derive-fields --selftest: PASS (merge + vocab validation)');
}

function main() {
  const args = argv.slice(2);
  if (args.includes('--selftest')) {
    try { runSelftest(); } catch (e) { console.error(`derive-fields --selftest: FAIL — ${e.message}`); process.exit(1); }
    return;
  }
  const mi = args.indexOf('--merge');
  if (mi < 0 || !args[mi + 1] || !args[mi + 2]) {
    console.error('usage: derive-fields.mjs --merge <lean.json> <derived.json> [--registry <situations.json>]');
    process.exit(64);
  }
  const lean = JSON.parse(readFileSync(args[mi + 1], 'utf8'));
  const derived = JSON.parse(readFileSync(args[mi + 2], 'utf8'));
  const ri = args.indexOf('--registry');
  const here = dirname(fileURLToPath(import.meta.url));
  const registryPath = ri >= 0 && args[ri + 1] ? args[ri + 1] : join(here, '..', 'data', 'situations.json');
  const registry = loadRegistry(registryPath);
  const { records, errors } = deriveMerge(lean, derived, registry);
  if (errors.length) {
    console.error(`derive-fields: ${errors.length} validation error(s):`);
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  process.stdout.write(JSON.stringify(records, null, 2) + '\n');
}

if (argv[1] && fileURLToPath(import.meta.url) === argv[1]) {
  main();
}
