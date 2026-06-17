#!/usr/bin/env node
// html-descriptors.test.mjs — the HTML↔MD document pair via auto-discovery (T4 / AC3 / AC4).
// Proves the new descriptors register against the EXISTING registry with no server/UI edits.
//   node html-descriptors.test.mjs [--selftest]

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const { createRegistry } = require(path.join(here, '..', 'lib', 'registry.js'));

const EXPECTED_CHECKS = 10;
const selftest = process.argv.includes('--selftest');
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) { passed += 1; process.stdout.write(`  ok   ${name}\n`); }
  else { failures.push(name); process.stdout.write(`  FAIL ${name}\n`); }
}

const reg = createRegistry();
reg.discover(path.join(here, '..', 'lib', 'converters'));
const ids = reg.list().map((d) => d.id).sort();

// AC3 — both directions are registered via auto-discovery, alongside the 4 data pairs.
check('auto-discovery registered md→html', ids.includes('md→html'));
check('auto-discovery registered html→md', ids.includes('html→md'));
check('the full registry is the 6 expected ids (4 data + HTML↔MD pair)',
  JSON.stringify(ids) === JSON.stringify(['csv→json', 'html→md', 'json→csv', 'json→yaml', 'md→html', 'yaml→json']));

// AC4 — both new descriptors are pure, text↔text.
const mh = reg.get('md→html');
const hm = reg.get('html→md');
check('md→html is kind:pure, text→text',
  mh.kind === 'pure' && mh.inputMode === 'text' && mh.outputMode === 'text');
check('html→md is kind:pure, text→text',
  hm.kind === 'pure' && hm.inputMode === 'text' && hm.outputMode === 'text');
check('neither descriptor declares external requires',
  Array.isArray(mh.requires) && mh.requires.length === 0 && Array.isArray(hm.requires) && hm.requires.length === 0);

// AC1 — golden cases, both directions.
check('md→html: # Hi -> <h1>Hi</h1>', mh.convert('# Hi') === '<h1>Hi</h1>');
check('html→md: <h1>Hi</h1> -> # Hi', hm.convert('<h1>Hi</h1>').trim() === '# Hi');
check('md→html: inline emphasis renders strong/em',
  mh.convert('a **b** *c*').includes('<strong>b</strong>') && mh.convert('a **b** *c*').includes('<em>c</em>'));

// Determinism (Inv-2) — same input twice yields byte-identical output.
check('html→md is deterministic',
  hm.convert('<p>x <em>y</em></p>') === hm.convert('<p>x <em>y</em></p>'));

process.stdout.write(`\n${passed}/${EXPECTED_CHECKS} checks passed\n`);
if (selftest && passed !== EXPECTED_CHECKS) {
  process.stderr.write(`selftest: expected ${EXPECTED_CHECKS}, got ${passed} (failures: ${failures.join(', ')})\n`);
  process.exit(1);
}
process.exit(failures.length === 0 ? 0 : 1);
