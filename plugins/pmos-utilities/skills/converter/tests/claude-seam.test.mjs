#!/usr/bin/env node
// claude-seam.test.mjs — the claude-CLI PDF→Markdown seam (T2 / AC2). NO live claude.
//
// The seam extracts the PDF's own text deterministically, then asks `claude` to reflow
// ONLY that text — it never hands the CLI a file path or filesystem access. These checks
// pin that contract (incl. the safety regression guard found at dogfood: no path, empty
// tool allowlist) and the typed CLI_UNAVAILABLE fallbacks.
//   node claude-seam.test.mjs [--selftest]

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const { runClaudePdfToMd, CLI_UNAVAILABLE } = require(path.join(here, '..', 'lib', 'claude-pdf.js'));

const EXPECTED_CHECKS = 6;
const selftest = process.argv.includes('--selftest');
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) { passed += 1; process.stdout.write(`  ok   ${name}\n`); }
  else { failures.push(name); process.stdout.write(`  FAIL ${name}\n`); }
}

const buf = Buffer.from('%PDF-1.4 fake');
// A deterministic stub extractor so the seam never touches the real FlateDecode path here.
const extractText = () => ({ text: 'Quarter revenue grew. Costs fell.', markdown: '', caveat: '' });

// 1 + 2: success path reflows the extracted text; the extracted text reaches the CLI prompt.
{
  let seenArgv = null;
  const md = await runClaudePdfToMd(buf, {
    extractText,
    exec: async (cli, argv) => { seenArgv = argv; return { stdout: '# Canned\n\nHello from mock.' }; },
  });
  check('success path resolves to the (mock) claude markdown', md.includes('Canned'));
  check('the extracted PDF text is delivered to the CLI prompt', seenArgv.some((a) => /Quarter revenue grew/.test(a)));
}

// 3: SAFETY regression guard — no file path is ever passed, and tool access is disabled.
// (Earlier the seam passed a tmp .pdf path with default tools enabled; the CLI then
//  wandered the filesystem and surfaced unrelated local content.)
{
  let seenArgv = null;
  await runClaudePdfToMd(buf, {
    extractText,
    exec: async (cli, argv) => { seenArgv = argv; return { stdout: '# ok' }; },
  });
  const noPath = !seenArgv.some((a) => /\.pdf$|^\/|\\/.test(a));
  const ai = seenArgv.indexOf('--allowedTools');
  const emptyTools = ai !== -1 && seenArgv[ai + 1] === '';
  check('no filesystem path is passed to the CLI (safety)', noPath);
  check('tool access is disabled via an empty --allowedTools (safety)', emptyTools);
}

// 4: ENOENT (CLI not installed) → typed CLI_UNAVAILABLE error.
{
  let code = null;
  try {
    await runClaudePdfToMd(buf, {
      extractText,
      exec: async () => { const e = new Error('spawn claude ENOENT'); e.code = 'ENOENT'; throw e; },
    });
  } catch (e) { code = e.code; }
  check('ENOENT rejects with CLI_UNAVAILABLE typed error', code === CLI_UNAVAILABLE);
}

// 5: no extractable text (scanned/image-only PDF) → typed error so the caller falls back + caveat.
{
  let code = null;
  try {
    await runClaudePdfToMd(buf, {
      extractText: () => ({ text: '', markdown: '', caveat: 'scanned' }),
      exec: async () => ({ stdout: '# should-not-run' }),
    });
  } catch (e) { code = e.code; }
  check('no extractable text rejects with CLI_UNAVAILABLE typed error', code === CLI_UNAVAILABLE);
}

process.stdout.write(`\n${passed}/${EXPECTED_CHECKS} checks passed\n`);
if (selftest && passed !== EXPECTED_CHECKS) {
  process.stderr.write(`selftest: expected ${EXPECTED_CHECKS}, got ${passed} (failures: ${failures.join(', ')})\n`);
  process.exit(1);
}
process.exit(failures.length === 0 ? 0 : 1);
