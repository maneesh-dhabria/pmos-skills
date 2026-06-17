#!/usr/bin/env node
// csv.test.mjs — standalone test runner for the vendored RFC-4180 CSV lib.
//
//   node csv.test.mjs            normal run
//   node csv.test.mjs --selftest asserts the expected check count, exits 0/1
//
// Covers TDD acceptance fixtures: quoted-comma, quoted-newline, escaped-quotes,
// multi-row round-trip, embedded-quote serialize+reparse, custom (tab) delimiter,
// and CRLF == LF parsing.

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const csv = require(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'csv.js'),
);

const EXPECTED_CHECKS = 10;
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
function eq(name, actual, expected) {
  check(name, JSON.stringify(actual) === JSON.stringify(expected));
}

// 1. Quoted field containing the delimiter.
{
  const rows = csv.parse('a,b\n"x,y",z\n');
  eq('parse: quoted field with comma', rows, [{ a: 'x,y', b: 'z' }]);
}

// 2. Quoted field containing a newline.
{
  const rows = csv.parse('a,b\n"line1\nline2",z\n');
  eq('parse: quoted field with newline', rows, [{ a: 'line1\nline2', b: 'z' }]);
}

// 3. Escaped quotes ("" -> ") inside a quoted field.
{
  const rows = csv.parse('a,b\n"he said ""hi""",z\n');
  eq('parse: escaped quotes -> single quote', rows, [{ a: 'he said "hi"', b: 'z' }]);
}

// 4. Multi-row round-trip: rows -> serialize -> parse deepEqual rows.
{
  const rows = [
    { name: 'Ada', city: 'London', note: 'first, programmer' },
    { name: 'Alan', city: 'Wilmslow', note: 'line\nbreak' },
    { name: 'Grace', city: 'New York', note: 'said "hello"' },
  ];
  const round = csv.parse(csv.serialize(rows));
  eq('round-trip: multi-row serialize -> parse deepEqual', round, rows);
}

// 5. Embedded quotes serialize with doubled quotes and re-parse equal.
{
  const rows = [{ q: 'a "quoted" word', n: 'plain' }];
  const text = csv.serialize(rows);
  check('serialize: doubles embedded quotes', text.includes('""quoted""'));
  eq('serialize: embedded-quote round-trip', csv.parse(text), rows);
}

// 6. Custom delimiter (tab) round-trips.
{
  const rows = [
    { a: 'has,comma', b: 'b1' },
    { a: 'plain', b: 'b2' },
  ];
  const text = csv.serialize(rows, { delimiter: '\t' });
  check('serialize: tab delimiter not comma-quoted', text.includes('has,comma'));
  eq('round-trip: tab delimiter', csv.parse(text, { delimiter: '\t' }), rows);
}

// 7. CRLF line endings parse the same as LF.
{
  const crlf = csv.parse('a,b\r\n1,2\r\n3,4\r\n');
  const lf = csv.parse('a,b\n1,2\n3,4\n');
  eq('parse: CRLF == LF', crlf, lf);
}

// Extra: ragged rows — short pads with '', long drops extras.
{
  const rows = csv.parse('a,b,c\n1,2\n1,2,3,4\n');
  eq('parse: ragged rows pad short / drop extra', rows, [
    { a: '1', b: '2', c: '' },
    { a: '1', b: '2', c: '3' },
  ]);
}

process.stdout.write(`\n${passed}/${EXPECTED_CHECKS} checks passed\n`);
if (selftest && passed !== EXPECTED_CHECKS) {
  process.stderr.write(`selftest: expected ${EXPECTED_CHECKS} checks, got ${passed}\n`);
  process.exit(1);
}
process.exit(failures.length === 0 ? 0 : 1);
