#!/usr/bin/env node
// pdf-descriptors.test.mjs — the PDF↔MD descriptors via auto-discovery (T4 / AC2/AC3/AC4).
// No live `claude` call: the pdf→md primary path is driven through ctx.exec (mocked); the
// fallback path forces CLI-absence and exercises the vendored extractor on a real fixture.
//   node pdf-descriptors.test.mjs [--selftest]

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
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
function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

const reg = createRegistry();
reg.discover(path.join(here, '..', 'lib', 'converters'));
const ids = reg.list().map((d) => d.id).sort();

// In this story's worktree only the foundation (4 data ids) + this PDF pair are present;
// HTML↔MD is a sibling story (260617-rck), not a dependency of this one.
check('auto-discovery registered the 6 ids (4 data + PDF pair)',
  eq(ids, ['csv→json', 'json→csv', 'json→yaml', 'md→pdf', 'pdf→md', 'yaml→json']));

const pdfToMd = reg.list().find((d) => d.id === 'pdf→md');
const mdToPdf = reg.list().find((d) => d.id === 'md→pdf');

check('pdf→md is kind:llm, binary→text', pdfToMd && pdfToMd.kind === 'llm' && pdfToMd.inputMode === 'binary' && pdfToMd.outputMode === 'text');
check('pdf→md requires the claude-cli (drives the UI badge)', pdfToMd && eq(pdfToMd.requires, ['claude-cli']));
check('md→pdf is kind:pure, text→binary', mdToPdf && mdToPdf.kind === 'pure' && mdToPdf.inputMode === 'text' && mdToPdf.outputMode === 'binary');
// The descriptor's contentType survives registration so the server serves application/pdf (Inv-6) —
// list() carries it, not just get(). Without this the binary download falls back to octet-stream.
check('md→pdf descriptor carries contentType:application/pdf (Inv-6)', mdToPdf && mdToPdf.contentType === 'application/pdf');

// pdf→md PRIMARY path — mocked claude returns canned Markdown (no live API).
const fixture = fs.readFileSync(path.join(here, 'fixtures', 'hello-flate.pdf'));
const mockExec = async () => ({ stdout: '# Canned\n\nClaude-extracted markdown.' });
const primary = await reg.get('pdf→md').convert(fixture, { exec: mockExec });
check('pdf→md primary path returns the (mocked) claude markdown', /Canned/.test(primary) && /Claude-extracted/.test(primary));

// pdf→md FALLBACK path — force CLI absence; the vendored extractor reads the fixture text.
const enoent = async () => { const e = new Error('spawn claude ENOENT'); e.code = 'ENOENT'; throw e; };
const fallback = await reg.get('pdf→md').convert(fixture, { exec: enoent });
check('pdf→md fallback extracts the fixture text via the vendored parser', /Hello PDF World/.test(fallback));
check('pdf→md fallback surfaces a quality caveat', /⚠️|caveat|fallback|approximate/i.test(fallback));

// pdf→md NEVER throws even on garbage input (Inv-5).
let threw = false;
try { await reg.get('pdf→md').convert(Buffer.from('not a pdf'), { exec: enoent }); } catch (_e) { threw = true; }
check('pdf→md never crashes on garbage input (Inv-5)', threw === false);

// md→pdf — pure, yields %PDF bytes (Inv-6 binary).
const pdfBytes = mdToPdf ? reg.get('md→pdf').convert('# Title\n\nA paragraph of text.\n\n- one\n- two') : Buffer.alloc(0);
check('md→pdf yields a Buffer beginning %PDF-', Buffer.isBuffer(pdfBytes) && pdfBytes.slice(0, 5).toString('latin1') === '%PDF-');

process.stdout.write(`\n${passed}/${EXPECTED_CHECKS} checks passed\n`);
if (selftest && passed !== EXPECTED_CHECKS) {
  process.stderr.write(`selftest: expected ${EXPECTED_CHECKS}, got ${passed} (failures: ${failures.join(', ')})\n`);
  process.exit(1);
}
process.exit(passed === EXPECTED_CHECKS ? 0 : 1);
