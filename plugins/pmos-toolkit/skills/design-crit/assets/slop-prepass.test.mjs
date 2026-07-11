/**
 * Tests for assets/slop-prepass.mjs — the deterministic slop pre-pass helper.
 *
 * T1 (AC1, AC7): the helper drives a Playwright page, injects the vendored
 *   slop-engine, calls window.pmosDesignScan(), and reads .pmos-slop-* findings
 *   from the live DOM (not a screenshot). Against a fixture carrying a known
 *   side-tab tell it must surface that rule id + its quoted snippet — and ONLY
 *   that tell (the engine must not flag its own injected chrome/source).
 * T2 (AC3, Inv-5): pointed at a missing engine bundle it degrades gracefully —
 *   exit 0, a single stderr skip note, an empty (skipped) findings file, no
 *   propagated exception — so /design-crit proceeds exactly as today.
 *
 * playwright resolves via Node's upward node_modules lookup (installed at the
 * repo/home level, same as assets/capture.mjs relies on); these tests are
 * skipped with a clear note if it is genuinely absent on the host.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileP = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const HELPER = join(HERE, 'slop-prepass.mjs');
const FIXTURE = join(HERE, '__fixtures__', 'slop-prepass-side-tab.html');
// A monochrome-SVG /wireframes artifact (carries <meta name="pmos:skill" content="wireframes">).
const WIREFRAME_FIXTURE = join(
  HERE, '..', '..', 'wireframes', 'tests', 'fixtures', 'apply-edit-at-anchor', 'wireframes_svg_mini.html'
);
const ENV = { ...process.env, SLOP_PREPASS_STAMP: 'test-fixed-stamp' };

let playwrightPresent = true;
try {
  await import('playwright');
} catch {
  playwrightPresent = false;
}

// Run the helper as a child process; never throw on non-zero exit — return the
// captured {code, stdout, stderr} so each test asserts the contract explicitly.
async function runHelper(args) {
  try {
    const { stdout, stderr } = await execFileP('node', [HELPER, ...args], { env: ENV });
    return { code: 0, stdout, stderr };
  } catch (err) {
    return { code: err.code ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
  }
}

async function withOutDir(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'slop-prepass-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('T1: reads the side-tab tell (and only it) from the live DOM', { skip: playwrightPresent ? false : 'playwright not installed' }, async () => {
  await withOutDir(async (out) => {
    const { code } = await runHelper(['--source', FIXTURE, '--out', out]);
    assert.equal(code, 0, 'helper exits 0 on a clean engine run');

    const report = JSON.parse(await readFile(join(out, 'slop-findings.json'), 'utf8'));
    const ids = report.findings.map((f) => f.id);

    // The genuine tell on the fixture is flagged.
    assert.ok(ids.includes('side-tab'), `expected side-tab in ${JSON.stringify(ids)}`);

    // Its snippet carries the engine's quoted/identifying convention for the tell.
    const sideTab = report.findings.find((f) => f.id === 'side-tab');
    assert.match(sideTab.snippet, /border-left/, 'side-tab snippet names the offending border');
    assert.match(sideTab.snippet, /border-radius/, 'side-tab snippet names the rounding it pairs with');

    // The engine must NOT flag its own injected chrome/source: the side-tab
    // fixture is otherwise clean, so these page-level tells would be phantoms
    // produced by the engine scanning its own overlay <style> / injected source.
    assert.ok(!ids.includes('gradient-text'), 'no phantom gradient-text from engine chrome');
    assert.ok(!ids.includes('theater-slop-phrase'), 'no phantom theater-slop-phrase from engine source');

    // Findings were read from the rendered DOM, not a screenshot: overlays exist.
    assert.ok(report.overlaysRendered > 0, 'engine rendered .pmos-slop-* overlay nodes');
  });
});

test('T3: a monochrome-SVG wireframe artifact is exempted with an earned skip (epic 260710-grd A9)', { skip: playwrightPresent ? false : 'playwright not installed' }, async () => {
  await withOutDir(async (out) => {
    const { code, stderr } = await runHelper(['--source', WIREFRAME_FIXTURE, '--out', out]);

    // Never hard-fails — the exemption reuses the same graceful-degradation exit path.
    assert.equal(code, 0, 'wireframe exemption exits 0');
    // The contracted skip-note fires (no silent cap — the run SAYS it skipped and why).
    assert.match(stderr, /slop-engine unavailable — skipping deterministic pre-pass/, 'contracted skip-note fired');
    assert.match(stderr, /wireframe SVG artifact/, 'skip reason names the wireframe exemption');

    // The findings file records the earned skip in the existing shape.
    const report = JSON.parse(await readFile(join(out, 'slop-findings.json'), 'utf8'));
    assert.equal(report.skipped, true, 'report records the skip');
    assert.match(report.reason, /monochrome SVG payload has no surface to scan/, 'reason explains why');
    assert.deepEqual(report.findings, [], 'no findings on an exempted wireframe');
  });
});

test('T2: missing engine bundle degrades gracefully (Inv-5)', { skip: playwrightPresent ? false : 'playwright not installed' }, async () => {
  await withOutDir(async (out) => {
    const missing = join(HERE, '__fixtures__', 'does-not-exist-engine.js');
    const { code, stderr } = await runHelper(['--source', FIXTURE, '--out', out, '--engine', missing]);

    // Never hard-fails — /design-crit proceeds exactly as today.
    assert.equal(code, 0, 'engine-absent exits 0, not an error');
    assert.match(stderr, /slop-engine unavailable — skipping deterministic pre-pass/, 'single clear stderr skip note fired');

    // A skip-marked, empty findings file is written (no bogus content).
    const report = JSON.parse(await readFile(join(out, 'slop-findings.json'), 'utf8'));
    assert.equal(report.skipped, true, 'report records the skip');
    assert.deepEqual(report.findings, [], 'no findings on a skipped run');
  });
});
