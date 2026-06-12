#!/usr/bin/env node
// run.mjs — /logos self-test entry. SKILL.md Phase 0 runs `node tests/run.mjs`.
// Runs all unit + fixture suites, prints a TAP-ish summary, exits 0 if all pass else 1.
// No test framework — a hand-rolled assert wrapper over node:assert that counts checks.

import assertLib from 'node:assert';
import { run as runSvgMetrics } from './svg-metrics.test.mjs';
import { run as runExtractPalette } from './extract-palette.test.mjs';

let pass = 0;
let fail = 0;
const failures = [];

// Wrap node:assert so each assertion is a counted TAP line.
function wrap(name) {
  const make = (fn) => (...args) => {
    const msg = args[args.length - 1];
    const label = typeof msg === 'string' ? msg : name;
    try {
      fn(...args);
      pass++;
      console.log(`ok ${pass + fail} - ${label}`);
    } catch (e) {
      fail++;
      console.log(`not ok ${pass + fail} - ${label}`);
      console.log(`  ---`);
      console.log(`  message: ${e.message.split('\n')[0]}`);
      console.log(`  ...`);
      failures.push({ label, message: e.message });
    }
  };
  return {
    ok: make((v, m) => assertLib.ok(v, m)),
    strictEqual: make((a, b, m) => assertLib.strictEqual(a, b, m)),
    deepStrictEqual: make((a, b, m) => assertLib.deepStrictEqual(a, b, m)),
  };
}

const suites = [
  ['svg-metrics', runSvgMetrics],
  ['extract-palette', runExtractPalette],
];

console.log('TAP version 13');
for (const [name, suite] of suites) {
  console.log(`# ${name}`);
  try {
    suite(wrap(name));
  } catch (e) {
    fail++;
    console.log(`not ok ${pass + fail} - ${name} suite threw before assertions`);
    console.log(`  message: ${e.message.split('\n')[0]}`);
    failures.push({ label: `${name} suite`, message: e.message });
  }
}

const total = pass + fail;
console.log(`1..${total}`);
console.log(`# pass ${pass}`);
console.log(`# fail ${fail}`);

if (fail > 0) {
  console.error('\nFAILURES:');
  for (const f of failures) console.error(`  - ${f.label}: ${f.message.split('\n')[0]}`);
  process.exit(1);
}
process.exit(0);
