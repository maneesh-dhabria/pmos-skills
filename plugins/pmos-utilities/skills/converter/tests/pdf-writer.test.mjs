#!/usr/bin/env node
// pdf-writer.test.mjs — the vendored Markdown→PDF writer (T1 / AC1).
//   node pdf-writer.test.mjs [--selftest]

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const { writePdf, parseMarkdownBlocks } = require(path.join(here, '..', 'lib', 'pdf-writer.js'));

const EXPECTED_CHECKS = 7;
const selftest = process.argv.includes('--selftest');
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) { passed += 1; process.stdout.write(`  ok   ${name}\n`); }
  else { failures.push(name); process.stdout.write(`  FAIL ${name}\n`); }
}

// (1) writePdf on a markdown string returns a Buffer starting with %PDF-
const pdf = writePdf('# Title\n\nHello world');
const ascii = pdf.toString('latin1');
check('writePdf returns a Buffer', Buffer.isBuffer(pdf));
check('output starts with %PDF-', ascii.startsWith('%PDF-'));

// (2) contains an xref table
check('output contains xref', /\bxref\b/.test(ascii));

// (3) contains trailer and %%EOF
check('output contains trailer and %%EOF', /\btrailer\b/.test(ascii) && /%%EOF\s*$/.test(ascii));

// (4) a long document emits more than one /Type /Page object
const longItems = Array.from({ length: 200 }, (_v, n) => `- list item number ${n + 1} with some padding text\n`).join('');
const longPdf = writePdf(longItems);
const longAscii = longPdf.toString('latin1');
const pageMatches = (longAscii.match(/\/Type\s*\/Page\b/g) || []).filter((m) => !/\/Pages/.test(m));
check('long document emits more than one /Type /Page', pageMatches.length > 1);

// (5) parseMarkdownBlocks yields a heading block and a code block
const blocks = parseMarkdownBlocks('# Hi\n\n```\ncode line\n```\n');
const hasHeading = blocks.some((b) => b.type === 'heading' && b.level === 1 && b.text === 'Hi');
const hasCode = blocks.some((b) => b.type === 'code' && /code line/.test(b.text));
check('parseMarkdownBlocks returns heading and code blocks', hasHeading && hasCode);

// (6) writePdf accepts a pre-parsed block array too
const arrPdf = writePdf([
  { type: 'heading', level: 2, text: 'Section' },
  { type: 'paragraph', text: 'A paragraph.' },
  { type: 'list', ordered: true, items: ['one', 'two'] },
]);
check('writePdf accepts a pre-parsed block array', Buffer.isBuffer(arrPdf) && arrPdf.toString('latin1').startsWith('%PDF-'));

process.stdout.write(`\n${passed}/${EXPECTED_CHECKS} checks passed\n`);
if (selftest && passed !== EXPECTED_CHECKS) {
  process.stderr.write(`selftest: expected ${EXPECTED_CHECKS}, got ${passed}\n`);
  process.exit(1);
}
process.exit(failures.length === 0 ? 0 : 1);
