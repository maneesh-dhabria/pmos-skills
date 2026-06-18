#!/usr/bin/env node
// yaml.test.mjs — standalone ESM test runner for the vendored YAML lib (/converter).
//
//   node yaml.test.mjs            normal run
//   node yaml.test.mjs --selftest asserts the expected check count, exits 0/1
//
// TDD acceptance fixtures for lib/yaml.js: round-trip parse(stringify(x)) over
// nested maps, arrays of objects, mixed scalars, a realistic PM config, and a
// doc-frontmatter block; comment-stripping; quoting of `:`/`#`-leading values;
// flow arrays/maps; and a colon-space string round-trip.

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert';

const require = createRequire(import.meta.url);
const yaml = require(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'yaml.js'));

const EXPECTED_CHECKS = 18;
const selftest = process.argv.includes('--selftest');

let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) {
    passed += 1;
    process.stdout.write(`  ok   ${name}\n`);
  } else {
    failures.push(name);
    process.stdout.write(`  FAIL ${name}\n`);
  }
}

function eq(a, b) {
  try {
    assert.deepStrictEqual(a, b);
    return true;
  } catch {
    return false;
  }
}

function roundtrip(name, x) {
  const y = yaml.stringify(x);
  let parsed;
  try {
    parsed = yaml.parse(y);
  } catch (e) {
    process.stdout.write(`       (parse threw: ${e.message})\n  emitted:\n${y}\n`);
    return check(name, false);
  }
  const ok = eq(parsed, x);
  if (!ok) {
    process.stdout.write(`       emitted YAML:\n${y}\n       got: ${JSON.stringify(parsed)}\n`);
  }
  return check(name, ok);
}

// ---- round-trip fixtures ----

roundtrip('round-trip: nested map', {
  app: { name: 'pmos', meta: { version: 2, stable: true } },
  owner: 'maneesh',
});

roundtrip('round-trip: array of objects', [
  { name: 'a', n: 1 },
  { name: 'b', n: 2 },
]);

roundtrip('round-trip: mixed scalars', {
  s: 'hello',
  n: 42,
  f: 3.14,
  neg: -7,
  yes: true,
  no: false,
  nothing: null,
});

roundtrip('round-trip: realistic PM config', {
  project: 'converter',
  priority: 'high',
  estimate_days: 3.5,
  blocked: false,
  owners: ['pm', 'eng'],
  rollout: { stage: 'beta', percent: 25, regions: ['us', 'eu'] },
  notes: null,
});

roundtrip('round-trip: doc frontmatter block', {
  title: 'A great post',
  tags: ['x', 'y'],
  draft: false,
});

roundtrip('round-trip: nested arrays of objects', {
  items: [
    { id: 1, label: 'one', done: true },
    { id: 2, label: 'two', done: false },
  ],
  count: 2,
});

// ---- comment handling ----

{
  const src = [
    '# top-of-file comment',
    'name: widget   # trailing comment',
    'count: 3',
    '# standalone comment line',
    'tags:',
    '  - a   # inline list comment',
    '  - b',
    'note: "has # hash inside quotes"',
  ].join('\n');
  const parsed = yaml.parse(src);
  check('comments are ignored', eq(parsed, {
    name: 'widget',
    count: 3,
    tags: ['a', 'b'],
    note: 'has # hash inside quotes',
  }));
}

// ---- quoting of indicator-leading values ----

{
  const x = { weird: ':starts-with-colon' };
  const y = yaml.stringify(x);
  check('stringify quotes a value starting with `:`', /"/.test(y.split('\n')[0]));
  check('`:`-leading value re-parses equal', eq(yaml.parse(y), x));
}

{
  const x = { weird: '#starts-with-hash' };
  const y = yaml.stringify(x);
  check('stringify quotes a value starting with `#`', /"/.test(y.split('\n')[0]));
  check('`#`-leading value re-parses equal', eq(yaml.parse(y), x));
}

// ---- flow style ----

check('flow array [1, 2, 3] parses', eq(yaml.parse('nums: [1, 2, 3]'), { nums: [1, 2, 3] }));
check('flow map {a: 1, b: 2} parses', eq(yaml.parse('m: {a: 1, b: 2}'), { m: { a: 1, b: 2 } }));
check('nested flow parses', eq(
  yaml.parse('cfg: {list: [1, 2], nested: {x: true}}'),
  { cfg: { list: [1, 2], nested: { x: true } } },
));

// ---- quoted scalar with colon-space ----

roundtrip('round-trip: string containing colon-space', { url: 'http://x', msg: 'time: now' });

{
  const parsed = yaml.parse('msg: "time: now"');
  check('quoted colon-space string parses literally', eq(parsed, { msg: 'time: now' }));
}

// ---- single-quote escaping ----

check("single-quote '' unescapes", eq(yaml.parse("q: 'it''s here'"), { q: "it's here" }));

// ---- newline value round-trips via double-quote ----

roundtrip('round-trip: value with embedded newline', { body: 'line1\nline2' });

// ---- finish ----

process.stdout.write(`\n${passed}/${EXPECTED_CHECKS} checks passed\n`);

if (selftest && passed !== EXPECTED_CHECKS) {
  process.stderr.write(`selftest: expected ${EXPECTED_CHECKS} checks, got ${passed}\n`);
  process.exit(1);
}
process.exit(failures.length === 0 ? 0 : 1);
