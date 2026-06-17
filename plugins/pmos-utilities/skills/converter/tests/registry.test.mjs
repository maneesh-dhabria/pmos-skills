#!/usr/bin/env node
// registry.test.mjs — the converter registry contract (T2 / Inv-1).
//   node registry.test.mjs            normal run
//   node registry.test.mjs --selftest asserts EXPECTED_CHECKS, exits 0/1

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const { createRegistry } = require(path.join(here, '..', 'lib', 'registry.js'));

const EXPECTED_CHECKS = 9;
const selftest = process.argv.includes('--selftest');
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) { passed += 1; process.stdout.write(`  ok   ${name}\n`); }
  else { failures.push(name); process.stdout.write(`  FAIL ${name}\n`); }
}
function throws(fn) { try { fn(); return false; } catch (_e) { return true; } }

const base = { from: 'a', to: 'b', label: 'A → B', convert: () => 'x' };

// register + lookup
const reg = createRegistry();
reg.register({ ...base, id: 'a→b' });
reg.register({ ...base, id: 'b→a', from: 'b', to: 'a', label: 'B → A' });
check('register two descriptors → list() has both', reg.list().length === 2);
check('get(id) returns the descriptor with convert fn', typeof reg.get('a→b').convert === 'function');
check('list() metadata omits the convert fn', reg.list().every((d) => !('convert' in d)));
check('list() metadata carries id/from/to/label/kind/requires/modes',
  (() => { const d = reg.list()[0]; return d.id && d.from && d.to && d.label && d.kind && Array.isArray(d.requires) && d.inputMode && d.outputMode; })());
check('kind defaults to pure, modes default to text',
  (() => { const d = reg.get('a→b'); return d.kind === 'pure' && d.inputMode === 'text' && d.outputMode === 'text'; })());

// duplicate id rejected
check('duplicate id throws', throws(() => reg.register({ ...base, id: 'a→b' })));

// malformed descriptors rejected
const reg2 = createRegistry();
check('missing from/to throws', throws(() => reg2.register({ id: 'x', label: 'X', convert: () => {} })));
check('missing convert throws', throws(() => reg2.register({ id: 'x', from: 'a', to: 'b', label: 'X' })));
check('invalid kind throws', throws(() => reg2.register({ ...base, id: 'y', kind: 'magic' })));

process.stdout.write(`\n${passed}/${EXPECTED_CHECKS} checks passed\n`);
if (selftest && passed !== EXPECTED_CHECKS) {
  process.stderr.write(`selftest: expected ${EXPECTED_CHECKS}, got ${passed}\n`);
  process.exit(1);
}
process.exit(failures.length === 0 ? 0 : 1);
