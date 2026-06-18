#!/usr/bin/env node
// run.mjs — the /converter test harness. Runs every *.test.mjs in this directory as a
// child process, in --selftest mode (each asserts its own EXPECTED_CHECKS), and aggregates.
// Exit 0 iff all suites pass.
//   node tests/run.mjs

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// Deterministic order; server test last (it spawns a subprocess of its own).
const ORDER = ['registry', 'yaml', 'csv', 'descriptors', 'markdown', 'html-parser', 'html-descriptors', 'roundtrip', 'deps', 'server'];
const suites = fs.readdirSync(here)
  .filter((f) => f.endsWith('.test.mjs'))
  .sort((a, b) => {
    const ai = ORDER.indexOf(a.replace('.test.mjs', ''));
    const bi = ORDER.indexOf(b.replace('.test.mjs', ''));
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || a.localeCompare(b);
  });

function runSuite(file) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(here, file), '--selftest'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('exit', (code) => {
      const m = out.match(/(\d+)\/(\d+) checks passed/);
      resolve({ file, code, line: m ? m[0] : '(no count line)', out });
    });
  });
}

const results = [];
for (const s of suites) results.push(await runSuite(s));

let failed = 0;
let totalChecks = 0;
process.stdout.write('\n=== /converter test suites ===\n');
for (const r of results) {
  const ok = r.code === 0;
  if (!ok) failed += 1;
  const cm = r.line.match(/(\d+)\/(\d+)/);
  if (cm) totalChecks += Number(cm[2]);
  process.stdout.write(`  ${ok ? 'PASS' : 'FAIL'}  ${r.file.padEnd(22)} ${r.line}\n`);
  if (!ok) process.stdout.write(r.out.split('\n').map((l) => `        ${l}`).join('\n') + '\n');
}
process.stdout.write(`\n${results.length - failed}/${results.length} suites passed (${totalChecks} checks total)\n`);
process.exit(failed === 0 ? 0 : 1);
