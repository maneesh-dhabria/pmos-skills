/**
 * Prevention floor — generator idempotence + coverage (story 260624-aqb, AC1 / D-GEN / Inv-2).
 *
 * The floor `_shared/slop-engine/design-slop-rules.md` is GENERATED from the registry, never
 * hand-authored, so detection (registry) and prevention (floor) cannot drift. These tests pin:
 *   • the generator is IDEMPOTENT (pure fn of the registry — two runs are byte-identical);
 *   • the COMMITTED floor is exactly the generator's current output (no manual edits crept in);
 *   • every SLOP_RULES entry with a non-empty skillGuideline appears under its skillSection.
 *
 * Run: node --test plugins/pmos-toolkit/skills/_shared/slop-engine/tests/gen-rules-doc.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateRulesDoc } from '../gen-rules-doc.mjs';
import { SLOP_RULES } from '../registry.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FLOOR = join(HERE, '..', 'design-slop-rules.md');

test('AC1 — generator is idempotent (two runs byte-identical)', () => {
  assert.equal(generateRulesDoc(), generateRulesDoc(), 'generateRulesDoc must be a pure fn of the registry');
});

test('AC1 — the committed floor is exactly the generator output (no hand edits)', () => {
  const onDisk = readFileSync(FLOOR, 'utf8');
  assert.equal(onDisk, generateRulesDoc(), 'design-slop-rules.md must equal `node gen-rules-doc.mjs` — regenerate, never hand-edit');
});

test('AC1 — every rule with a skillGuideline appears under its skillSection heading', () => {
  const doc = generateRulesDoc();
  const withGuideline = SLOP_RULES.filter((r) => r.skillGuideline && r.skillSection);
  assert.ok(withGuideline.length >= 30, `expected the registry to carry many guidelines, got ${withGuideline.length}`);
  for (const r of withGuideline) {
    assert.ok(doc.includes(`## ${r.skillSection}`), `section heading "## ${r.skillSection}" must be present for rule ${r.id}`);
    // the DON'T line embeds the skillGuideline verbatim and tags the rule id — both must be present
    assert.ok(doc.includes(r.skillGuideline), `floor must embed rule ${r.id}'s skillGuideline verbatim: "${r.skillGuideline}"`);
    assert.ok(doc.includes(`(rule: \`${r.id}\`)`), `floor must tag rule id \`${r.id}\` on its DON'T line`);
  }
});
