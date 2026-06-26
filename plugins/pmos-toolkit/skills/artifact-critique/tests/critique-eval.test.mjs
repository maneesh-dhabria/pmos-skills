#!/usr/bin/env node
// Tests for critique-eval.mjs (story 260624-aa8). Runs the gate as a subprocess against
// the fbd corpus-samples fixtures (which double as the gate's golden inputs) plus a battery
// of deliberately-broken mutants — every E-check must fail-first on its targeted defect and
// pass on the clean fixture. skill-patterns §H: the gate is a script, this is its proof.
//
// Exit 0 (all assertions pass) / 1 (≥1 failed). Zero deps.

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const EVAL = join(HERE, '../scripts/critique-eval.mjs');
const ROOT = resolve(HERE, '../../../../../');
const CORPUS = join(ROOT, 'docs/pmos/features/2026-06-24_artifact-critique/corpus-samples');

let passed = 0;
const failures = [];
const ok = (name) => { passed++; };
const bad = (name, msg) => failures.push(`${name}: ${msg}`);

// run the gate; returns {code, stdout, stderr}
function runGate(sourcePath, findingsObjOrPath) {
  const argv = ['--source', sourcePath];
  if (typeof findingsObjOrPath === 'string') argv.push('--findings', findingsObjOrPath);
  else argv.push('--findings-json', JSON.stringify(findingsObjOrPath));
  try {
    const stdout = execFileSync('node', [EVAL, ...argv], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { code: 0, stdout, stderr: '' };
  } catch (e) {
    return { code: e.status ?? -1, stdout: e.stdout?.toString() ?? '', stderr: e.stderr?.toString() ?? '' };
  }
}

function assertPass(name, src, findings) {
  const r = runGate(src, findings);
  if (r.code === 0 && /PASS/.test(r.stdout)) ok(name);
  else bad(name, `expected exit 0/PASS, got code=${r.code} stderr=${r.stderr.trim()}`);
}
function assertFail(name, src, findings, check) {
  const r = runGate(src, findings);
  if (r.code === 1 && r.stderr.includes(check)) ok(name);
  else bad(name, `expected exit 1 with [${check}], got code=${r.code} stderr=${r.stderr.trim().slice(0, 200)}`);
}
function assertError(name, argvTail, needle) {
  try {
    execFileSync('node', [EVAL, ...argvTail], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    bad(name, `expected exit 2, got exit 0`);
  } catch (e) {
    if ((e.status === 2) && (!needle || (e.stderr?.toString() ?? '').includes(needle))) ok(name);
    else bad(name, `expected exit 2${needle ? ` with "${needle}"` : ''}, got code=${e.status} stderr=${(e.stderr?.toString() ?? '').trim().slice(0, 160)}`);
  }
}

// ── fixtures ──
if (!existsSync(CORPUS)) { console.error(`FATAL: corpus dir missing: ${CORPUS}`); process.exit(1); }
const aiSrc = join(CORPUS, 'prd-ai-assistant.md');
const aiJson = join(CORPUS, 'prd-ai-assistant.json');
const base = JSON.parse(readFileSync(aiJson, 'utf8'));
const clone = () => JSON.parse(JSON.stringify(base));

// 1. clean fixtures all PASS
for (const j of ['prd-ai-assistant.json', 'prd-internal-platform.json', 'strategy-marketplace.json']) {
  const src = join(CORPUS, j.replace(/\.json$/, '.md'));
  assertPass(`clean:${j}`, src, join(CORPUS, j));
}

// 2. E-schema — wrong schema id
{ const m = clone(); m.schema = 'pmos-critique-findings/v0'; assertFail('E-schema:bad-id', aiSrc, m, 'E-schema'); }
// 2b. E-schema — missing bottom_line.must_dos
{ const m = clone(); delete m.bottom_line.must_dos; assertFail('E-schema:no-must-dos', aiSrc, m, 'E-schema'); }

// 3. E-axes-complete — wrong order
{ const m = clone(); [m.axes[0], m.axes[1]] = [m.axes[1], m.axes[0]]; assertFail('E-axes:order', aiSrc, m, 'E-axes-complete'); }
// 3b. E-axes-complete — only 9 axes
{ const m = clone(); m.axes.pop(); assertFail('E-axes:count', aiSrc, m, 'E-axes-complete'); }
// 3c. E-axes-complete — invalid verdict
{ const m = clone(); m.axes[0].verdict = 'GREAT'; assertFail('E-axes:verdict', aiSrc, m, 'E-axes-complete'); }

// 4. E-applicable-consistency — applicable=true but verdict=N/A (and vice versa)
{ const m = clone(); const p = m.axes.find(a => a.axis === 'Pricing'); p.applicable = true; assertFail('E-applic:true-but-na', aiSrc, m, 'E-applicable-consistency'); }
{ const m = clone(); const c = m.axes.find(a => a.axis === 'Customer'); c.applicable = false; assertFail('E-applic:false-but-verdict', aiSrc, m, 'E-applicable-consistency'); }

// 5. E-quote-len — quote under 40 chars
{ const m = clone(); m.axes[0].quote = 'too short'; assertFail('E-quote-len:axis', aiSrc, m, 'E-quote-len'); }

// 6. E-quote-in-source — ≥40-char quote that is NOT in the source (hallucination)
{ const m = clone(); m.axes[0].quote = 'This sentence is fabricated and absolutely not present in the source doc at all.'; assertFail('E-quote-in-source:axis', aiSrc, m, 'E-quote-in-source'); }
// 6b. whitespace-normalization: collapsing internal whitespace still passes (not a false fail)
{ const m = clone(); m.axes[0].quote = base.axes[0].quote.replace(/ /g, '   '); assertPass('E-quote-in-source:ws-tolerant', aiSrc, m); }

// 7. E-gap-named — WEAK axis with empty reason
{ const m = clone(); const ai = m.axes.find(a => a.axis === 'AI'); ai.reason = '   '; assertFail('E-gap-named:weak', aiSrc, m, 'E-gap-named'); }

// 8. E-weakest-ranked — 4 claims; and non-unique ranks
{ const m = clone(); m.weakest_claims = [...m.weakest_claims, m.weakest_claims[0], m.weakest_claims[0]]; assertFail('E-weakest:too-many', aiSrc, m, 'E-weakest-ranked'); }
{ const m = clone(); m.weakest_claims[1].rank = 1; assertFail('E-weakest:dup-rank', aiSrc, m, 'E-weakest-ranked'); }
// 8b. empty weakest_claims list is allowed (Inv-4 — never padded)
{ const m = clone(); m.weakest_claims = []; assertPass('E-weakest:empty-ok', aiSrc, m); }

// 9. E-opening — 0 entries / 4 entries
{ const m = clone(); m.opening.pushing_hardest_on = []; assertFail('E-opening:empty', aiSrc, m, 'E-opening'); }
{ const m = clone(); m.opening.pushing_hardest_on = ['a', 'b', 'c', 'd']; assertFail('E-opening:four', aiSrc, m, 'E-opening'); }

// 10. script-error posture (exit 2)
assertError('err:no-source', ['--findings', aiJson], 'missing --source');
assertError('err:no-findings', ['--source', aiSrc], 'missing --findings');
assertError('err:bad-json', ['--source', aiSrc, '--findings-json', '{not json'], 'did not parse');
assertError('err:missing-source-file', ['--source', '/no/such/file.md', '--findings', aiJson], 'source file not found');

// ── report ──
if (failures.length) {
  console.error(`critique-eval.test: FAIL — ${failures.length} of ${passed + failures.length}:`);
  for (const f of failures) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log(`critique-eval.test: PASS — ${passed} assertions (clean fixtures pass; every E-check fails-first on its mutant; exit-2 posture holds).`);
process.exit(0);
