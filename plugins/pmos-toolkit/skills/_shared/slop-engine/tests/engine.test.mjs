#!/usr/bin/env node
// engine.test.mjs — Node-path acceptance gate for the vendored slop-engine (Story 260624-cg6).
//
// Covers: AC1 (registry shape), AC2/AC3/AC9 (detectHtml over the offline vendored parser path),
// AC7 (gen-rules-doc idempotency), AC8 (two-column flag/pass + ZERO false positives on pmos's own
// editorial chrome/template), and AC5/Inv-3 (the upstream brand string appears only in NOTICE/LICENSE).
// NB: this file deliberately never spells the upstream brand literally, so it isn't a self-hit.
//
// `node --test` — zero runtime deps (the vendored parser bundle is the only import the engine needs).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { SLOP_RULES } from '../registry.mjs';
import { detectHtml } from '../detect.mjs';
import { generateRulesDoc } from '../gen-rules-doc.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ENGINE = join(HERE, '..');
const REPO_ROOT = join(ENGINE, '..', '..', '..', '..', '..'); // -> repo root
const HA = join(ENGINE, '..', 'html-authoring');               // sibling substrate
const ALLOWED_SECTIONS = new Set([
  'Typography', 'Color & Contrast', 'Layout & Space', 'Visual Details',
  'Motion', 'Interaction', 'Responsive', 'UX Writing',
]);

// ── AC1: registry shape ──────────────────────────────────────────────────────
test('AC1: SLOP_RULES has ~44 rules, valid categories + sections', () => {
  assert.ok(SLOP_RULES.length >= 40, `expected ~44 rules, got ${SLOP_RULES.length}`);
  for (const r of SLOP_RULES) {
    assert.ok(['slop', 'quality'].includes(r.category), `bad category on ${r.id}: ${r.category}`);
    assert.ok(typeof r.id === 'string' && r.id.length, 'rule missing id');
    if (r.skillSection) assert.ok(ALLOWED_SECTIONS.has(r.skillSection), `bad section on ${r.id}: ${r.skillSection}`);
  }
  // a healthy share carry the drift-lint key story D consumes
  assert.ok(SLOP_RULES.filter(r => r.skillGuideline).length >= 30, 'too few skillGuideline keys');
});

// ── AC2/AC3/AC9: two-column flag/pass over the offline Node path ──────────────
test('AC8: flag column fires the expected rules; pass column stays clean', async () => {
  const findings = await detectHtml(join(HERE, 'fixtures', 'slop-tells.html'), {});
  const flagged = new Set(findings.map(f => f.antipattern));
  for (const id of ['side-tab', 'low-contrast', 'gradient-text']) {
    assert.ok(flagged.has(id), `expected flag column to trigger "${id}"`);
  }
  // pass column must NOT introduce false positives: the only low-contrast hit is the flag color,
  // never the near-black pass color; side-tab fires exactly once (the single flag card).
  const lowC = findings.filter(f => f.antipattern === 'low-contrast');
  assert.ok(lowC.some(f => /#9ca3af/i.test(f.snippet)), 'flag low-contrast color not reported');
  assert.ok(!lowC.some(f => /#111827/i.test(f.snippet)), 'pass-case near-black color was falsely flagged');
  assert.equal(findings.filter(f => f.antipattern === 'side-tab').length, 1, 'side-tab over-fired into pass column');
});

// ── AC9: detectHtml public API — stable findings shape (consumed by /verify, story C) ─────────
test('AC9: detectHtml accepts a raw HTML string and returns a stable findings shape', async () => {
  const html = '<!DOCTYPE html><html><head><style>.b{border-left:4px solid #6366f1;border-radius:12px;width:300px;padding:20px}</style></head><body><div class="b">x</div></body></html>';
  const findings = await detectHtml(html, {});
  assert.ok(Array.isArray(findings) && findings.length >= 1, 'string input produced no findings');
  for (const f of findings) {
    for (const k of ['antipattern', 'name', 'description', 'severity', 'file', 'line', 'snippet']) {
      assert.ok(k in f, `finding missing "${k}"`);
    }
  }
});

// ── AC8 (correctness gate): ZERO false positives on pmos's own chrome + editorial template ────
test('AC8: pmos editorial chrome + comment-overlay CSS produce zero findings', async () => {
  const tpl = readFileSync(join(HA, 'template.html'), 'utf8');
  const css = readFileSync(join(HA, 'assets', 'style.css'), 'utf8') + '\n'
            + readFileSync(join(HA, 'assets', 'comments.css'), 'utf8');
  const content = '<h2>Overview</h2><p>This section explains the approach in plain prose. '
    + 'It favors restraint over decoration.</p><h2>Details</h2>'
    + '<p>A short paragraph with one aside (set off by a dash) and a list.</p>'
    + '<ul><li>First point</li><li>Second point</li></ul>';
  const html = tpl
    .replace('{{inline_css}}', `<style>${css}</style>`)
    .replace(/{{inline_js}}|{{inline_comments_json}}/g, '')
    .replace(/{{title}}/g, 'Sample Artifact')
    .replace('{{content}}', content)
    .replace(/{{[a-z_]+}}/g, 'x');
  const findings = await detectHtml(html, {});
  assert.equal(findings.length, 0,
    `pmos editorial chrome false-positived: ${findings.map(f => f.antipattern).join(', ')}`);
});

// ── AC7: gen-rules-doc is idempotent (re-run on unchanged registry → byte-identical) ──────────
test('AC7: generateRulesDoc is deterministic/idempotent', () => {
  const a = generateRulesDoc();
  const b = generateRulesDoc();
  assert.equal(a, b, 'generator output is not deterministic');
  // every emitted DON'T line embeds a rule skillGuideline verbatim (the drift-lint key)
  for (const r of SLOP_RULES) {
    if (r.skillGuideline) assert.ok(a.includes(r.skillGuideline), `doc missing skillGuideline: ${r.skillGuideline}`);
  }
});

// ── AC5 / Inv-3: the upstream brand string appears ONLY in NOTICE / LICENSE ────────────────────
test('Inv-3: no upstream-brand string anywhere in slop-engine except NOTICE/LICENSE', () => {
  const BRAND = 'imp' + 'eccable'; // never spelled literally here, so the gate can't self-hit
  let hits = '';
  try {
    hits = execFileSync('grep', ['-rliE', BRAND, ENGINE], { encoding: 'utf8' });
  } catch (e) {
    if (e.status === 1) hits = ''; // grep: no matches
    else throw e;
  }
  const offenders = hits.split('\n').filter(Boolean)
    .filter(p => !/\/NOTICE$/.test(p))
    .filter(p => !new RegExp(`/LICENSE-${BRAND}\\.txt$`).test(p));
  assert.equal(offenders.length, 0, `upstream-brand strings outside NOTICE/LICENSE:\n${offenders.join('\n')}`);
});
