#!/usr/bin/env node
// descriptors.test.mjs — the data-pair descriptors via auto-discovery (T5 / AC5 / AC6).
//   node descriptors.test.mjs [--selftest]

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const { createRegistry } = require(path.join(here, '..', 'lib', 'registry.js'));
const yaml = require(path.join(here, '..', 'lib', 'yaml.js'));

const EXPECTED_CHECKS = 8;
const selftest = process.argv.includes('--selftest');
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) { passed += 1; process.stdout.write(`  ok   ${name}\n`); }
  else { failures.push(name); process.stdout.write(`  FAIL ${name}\n`); }
}
function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

const reg = createRegistry();
reg.discover(path.join(here, '..', 'lib', 'converters'));
const ids = reg.list().map((d) => d.id).sort();

const DATA_IDS = ['csv→json', 'json→csv', 'json→yaml', 'yaml→json'];
check('auto-discovery registered the four data-pair ids',
  DATA_IDS.every((id) => ids.includes(id)));
check('the four data-pair descriptors are kind:pure',
  reg.list().filter((d) => DATA_IDS.includes(d.id)).every((d) => d.kind === 'pure'));

// JSON → YAML → JSON round-trips
const obj = { name: 'pmos', tags: ['a', 'b'], nested: { n: 1, ok: true }, note: null };
const asYaml = reg.get('json→yaml').convert(JSON.stringify(obj));
check('json→yaml yields YAML that re-parses to the original', eq(yaml.parse(asYaml), obj));
const backJson = reg.get('yaml→json').convert(asYaml);
check('yaml→json round-trips the object', eq(JSON.parse(backJson), obj));

// CSV ↔ JSON
const csvText = 'name,role\nAda,eng\nGrace,pm\n';
const asJson = reg.get('csv→json').convert(csvText);
check('csv→json maps header rows to objects',
  eq(JSON.parse(asJson), [{ name: 'Ada', role: 'eng' }, { name: 'Grace', role: 'pm' }]));
const backCsv = reg.get('json→csv').convert(asJson);
check('json→csv re-parses to the same rows via csv→json',
  eq(JSON.parse(reg.get('csv→json').convert(backCsv)), JSON.parse(asJson)));

// json→csv rejects non-array input with a clear error
let rejected = false;
try { reg.get('json→csv').convert('{"a":1}'); } catch (e) { rejected = /array of flat objects/.test(e.message); }
check('json→csv rejects a non-array with an actionable error', rejected);

// json→yaml rejects invalid JSON
let badJson = false;
try { reg.get('json→yaml').convert('{not json'); } catch (e) { badJson = /not valid JSON/.test(e.message); }
check('json→yaml surfaces an invalid-JSON error', badJson);

process.stdout.write(`\n${passed}/${EXPECTED_CHECKS} checks passed\n`);
if (selftest && passed !== EXPECTED_CHECKS) {
  process.stderr.write(`selftest: expected ${EXPECTED_CHECKS}, got ${passed}\n`);
  process.exit(1);
}
process.exit(failures.length === 0 ? 0 : 1);
