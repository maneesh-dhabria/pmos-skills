/**
 * /verify frontend slop gate — contract tests (story 260624-y9m).
 *
 * Pins, before/around the SKILL.md wiring:
 *   AC1  the gate runs the vendored _shared/slop-engine/detect.mjs via the Node
 *        path — no Playwright / browser tool / network.
 *   AC2  the category→severity map is deterministic: quality→[Blocker]/[Should-fix]
 *        (can gate), slop→[Should-fix]/[Nit] (advisory, never gates).
 *   AC4  Inv-5 graceful degradation: engine absent → non-fatal skip, exit 0.
 *   AC7  Inv-4 neg-control: the gate + engine make zero network/LLM calls (offline).
 *
 * Run: node --test plugins/pmos-toolkit/skills/verify/tests/slop-gate.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const GATE = join(HERE, '..', 'scripts', 'slop-gate.mjs');
const FIX = (name) => join(HERE, 'fixtures', name);
const ENGINE_DIR = resolve(HERE, '..', '..', '_shared', 'slop-engine');

// Run the gate; resolve with {code, stdout, stderr} — never reject on non-zero
// exit (exit 2 is the gate-fires signal, a normal outcome we assert on).
function runGate(extraArgs) {
  return new Promise((res) => {
    execFile('node', [GATE, ...extraArgs], { encoding: 'utf8' }, (err, stdout, stderr) => {
      res({ code: err ? (err.code ?? 1) : 0, stdout, stderr });
    });
  });
}

test('AC2/AC1 — quality contrast fault maps to [Blocker] and the gate fires (exit 2)', async () => {
  const { code, stdout } = await runGate(['--source', FIX('contrast-fail.html'), '--quiet']);
  const report = JSON.parse(stdout);
  assert.equal(code, 2, 'a blocking quality fault must exit 2 (gate fires)');
  assert.equal(report.skipped, false);
  assert.equal(report.counts.blockers, 1);
  const lc = report.blockers.find((b) => b.id === 'low-contrast');
  assert.ok(lc, 'low-contrast must be reported');
  assert.equal(lc.category, 'quality');
  assert.equal(lc.severity, 'Blocker');
  assert.equal(report.counts.slop, 0, 'the contrast fixture carries no slop tell');
});

test('AC2 — slop tell maps to advisory [Should-fix]/[Nit] and NEVER gates (exit 0)', async () => {
  const { code, stdout } = await runGate(['--source', FIX('gradient-only.html'), '--quiet']);
  const report = JSON.parse(stdout);
  assert.equal(code, 0, 'slop-only artifact must exit 0 — slop never hard-blocks');
  assert.equal(report.counts.blockers, 0, 'slop produces no blocker');
  assert.equal(report.counts.quality, 0, 'contrast is fixed in this fixture');
  const gt = report.slop.find((s) => s.id === 'gradient-text');
  assert.ok(gt, 'gradient-text slop tell must be surfaced');
  assert.equal(gt.category, 'slop');
  assert.ok(['Should-fix', 'Nit'].includes(gt.severity), `slop severity must be advisory, got ${gt.severity}`);
});

test('AC2 — the category→severity map is deterministic (identical output across runs)', async () => {
  const a = JSON.parse((await runGate(['--source', FIX('gradient-only.html'), '--quiet'])).stdout);
  const b = JSON.parse((await runGate(['--source', FIX('gradient-only.html'), '--quiet'])).stdout);
  assert.deepEqual(a.slop, b.slop);
  assert.deepEqual(a.quality, b.quality);
});

test('AC4/Inv-5 — engine absent → non-fatal skip, exit 0 (correct PASS never flipped)', async () => {
  const { code, stdout, stderr } = await runGate([
    '--source', FIX('contrast-fail.html'),
    '--engine', '/no/such/detect.mjs',
  ]);
  const report = JSON.parse(stdout);
  assert.equal(code, 0, 'tooling absence must not fail /verify');
  assert.equal(report.skipped, true);
  assert.equal(report.counts.blockers, 0);
  assert.match(stderr, /slop gate skipped — engine\/parser unavailable/);
});

test('AC1/AC7/Inv-4 — gate + engine are offline: no Playwright/browser/network calls', () => {
  // Static neg-control: the gate runner and the Node-path detector it drives must
  // contain no browser-automation or network primitives. detect.mjs reads files +
  // imports the vendored parser bundle only.
  const sources = [
    readFileSync(GATE, 'utf8'),
    readFileSync(join(ENGINE_DIR, 'detect.mjs'), 'utf8'),
  ].join('\n');
  // Strip line/block comments so prose like "no Playwright" doesn't false-positive —
  // the neg-control targets executable imports/calls, not documentation.
  const code = sources
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/[^\n]*/g, '$1');
  assert.doesNotMatch(code, /from\s+['"]playwright['"]|require\(\s*['"]playwright['"]\s*\)/i, 'no Playwright import in the Node path');
  assert.doesNotMatch(code, /\bchromium\b/, 'no Chromium launch in the Node path');
  // Real browser-automation tool calls (playwright MCP verbs) — NOT the
  // BROWSER_ONLY_RULES coverage constant, which is a degradation list, not a call.
  assert.doesNotMatch(sources, /browser_(navigate|click|evaluate|screenshot|snapshot|type|press_key|wait_for|hover)/, 'no browser_* automation call in the Node path');
  assert.doesNotMatch(sources, /\bpage\.(goto|screenshot|evaluate|\$\$?eval|addScriptTag)\b/, 'no Playwright page API in the Node path');
  assert.doesNotMatch(sources, /\bfetch\s*\(/, 'no fetch() — the gate is offline');
  assert.doesNotMatch(sources, /from ['"]node:https?['"]|require\(['"]https?['"]\)/, 'no http(s) client — the gate is offline');
});
