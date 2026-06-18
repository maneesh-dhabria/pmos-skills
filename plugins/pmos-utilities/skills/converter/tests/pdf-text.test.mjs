#!/usr/bin/env node
// pdf-text.test.mjs — the vendored zero-dep PDF→text fallback (T3 / AC3).
//   node pdf-text.test.mjs [--selftest]

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import zlib from 'node:zlib';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const { extractText } = require(path.join(here, '..', 'lib', 'pdf-text.js'));

const EXPECTED_CHECKS = 5;
const selftest = process.argv.includes('--selftest');
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) { passed += 1; process.stdout.write(`  ok   ${name}\n`); }
  else { failures.push(name); process.stdout.write(`  FAIL ${name}\n`); }
}

// --- committed FlateDecode fixture (read, never generate at runtime) -----
const fixtureBytes = fs.readFileSync(path.join(here, 'fixtures', 'hello-flate.pdf'));
const res = extractText(fixtureBytes);

check('extracts the first text line from a FlateDecode stream',
  res.text.includes('Hello PDF World'));
check('extracts the second text line', res.text.includes('Second line here'));
check('caveat names the built-in fallback parser',
  typeof res.caveat === 'string' && res.caveat.length > 0 && /fallback/i.test(res.caveat));

// --- a PDF with NO text layer (Flate stream of non-text operators) -------
function buildNoTextPdf() {
  const content = 'q 1 0 0 1 0 0 cm Q';
  const z = zlib.deflateSync(Buffer.from(content, 'latin1'));
  const head = Buffer.from(`4 0 obj\n<< /Length ${z.length} /Filter /FlateDecode >>\nstream\n`, 'latin1');
  const tail = Buffer.from('\nendstream\nendobj\n', 'latin1');
  return Buffer.concat([Buffer.from('%PDF-1.4\n', 'latin1'), head, z, tail]);
}
let noTextRes;
let noThrowNoText = true;
try { noTextRes = extractText(buildNoTextPdf()); } catch (_e) { noThrowNoText = false; }
check('a text-layerless PDF returns empty text + a scanned/image caveat and never throws',
  noThrowNoText && noTextRes.text === '' &&
  typeof noTextRes.caveat === 'string' && noTextRes.caveat.length > 0 &&
  /scann|image/i.test(noTextRes.caveat));

// --- garbage bytes never throw ------------------------------------------
let garbageRes;
let noThrowGarbage = true;
try { garbageRes = extractText(Buffer.from('not a pdf at all')); } catch (_e) { noThrowGarbage = false; }
check('garbage bytes do not throw and yield a result object with a caveat',
  noThrowGarbage && garbageRes && typeof garbageRes.caveat === 'string' && garbageRes.caveat.length > 0);

process.stdout.write(`\n${passed}/${EXPECTED_CHECKS} checks passed\n`);
if (selftest && passed !== EXPECTED_CHECKS) {
  process.stderr.write(`selftest: expected ${EXPECTED_CHECKS}, got ${passed}\n`);
  process.exit(1);
}
process.exit(failures.length === 0 ? 0 : 1);
