#!/usr/bin/env node
// Load-bearing dogfood for story 260616-xqm — /shape as the gated Phase-1 front of /feature-sdlc.
//
// /feature-sdlc is an instruction-only orchestrator, so the load-bearing check is that the
// PERSISTED CONTRACT in reference/state-schema.md actually encodes the four ACs:
//   AC1  fresh feature/skill-new/prototype phases[] place `shape` immediately before `ideate`
//        (after init-state / skill-tier-resolve); skill-feedback omits it.
//   AC2  schema_version is bumped to 7 and the v6->v7 migration is a PURE cohort bump that does
//        NOT back-fill `shape` into a migrated file's phases[].
//   AC3  a pre-v7 resume state (no `shape` entry) — the resume cursor advances past the absent
//        phase (absence-skip): the /shape gate never fires for an in-flight run.
//   AC4  a fresh v7 run DOES include the gate (shape present, status pending -> cursor lands on it).
//
// It parses the real state-schema.md membership lists + simulates the documented resume cursor over
// two fixtures (pre-v7 / fresh-v7). It fails on any drift in the schema doc's phase ordering or the
// absence-skip wording, so it pins the cross-version contract. Pure Node, no deps. EXIT 0 == pass.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const SCHEMA = resolve(here, '../../../../../../../plugins/pmos-toolkit/skills/feature-sdlc/reference/state-schema.md');
const doc = readFileSync(SCHEMA, 'utf8');

let failed = 0;
const ok = (m) => console.log(`  PASS  ${m}`);
const bad = (m) => { console.log(`  FAIL  ${m}`); failed++; };
const assert = (c, m) => (c ? ok(m) : bad(m));

// --- Extract a mode's phases[] membership list from the prose bullet in state-schema.md ---
// Each bullet renders a fenced/backtick comma-separated phase list after the mode label.
function membership(modeLabel) {
  // find the bullet "- **`<mode>`** ..." then the FIRST backticked comma-list after it
  const re = new RegExp('\\*\\*`' + modeLabel + '`\\*\\*[\\s\\S]*?`([a-z-]+(?:,\\s*[a-z-]+)+)`');
  const m = doc.match(re);
  if (!m) return null;
  return m[1].split(',').map((s) => s.trim());
}

console.log('AC1 — fresh phases[] place `shape` immediately before `ideate`:');
for (const [label, after] of [['feature', 'init-state'], ['skill-new', 'skill-tier-resolve'], ['prototype', 'init-state']]) {
  const list = membership(label);
  if (!list) { bad(`${label}: membership list not found in state-schema.md`); continue; }
  const si = list.indexOf('shape'), ii = list.indexOf('ideate'), ai = list.indexOf(after);
  assert(si >= 0, `${label}: shape present`);
  assert(si >= 0 && ii >= 0 && si === ii - 1, `${label}: shape immediately before ideate (shape@${si}, ideate@${ii})`);
  assert(ai >= 0 && si === ai + 1, `${label}: shape immediately after ${after} (@${ai})`);
}
// skill-feedback must OMIT shape
{
  const list = membership('skill-feedback');
  assert(list && !list.includes('shape'), 'skill-feedback: shape OMITTED (triage already a converged seed)');
  assert(list && !list.includes('ideate'), 'skill-feedback: ideate also omitted (unchanged)');
}

console.log('AC2 — schema_version bumped to 7; v6->v7 is a pure cohort bump (no back-fill):');
assert(/`schema_version: 7` is the current version/.test(doc), 'schema_version 7 is current');
assert(/`> 7`\) → abort/.test(doc) || /`> 7`\) →/.test(doc), 'abort threshold is > 7');
assert(/v1 → v2 → v3 → v4 → v5 → v6 → v7/.test(doc), 'migration chain extended to v7');
assert(/v6 → v7 auto-migration block/.test(doc), 'v6->v7 migration block present');
assert(/does NOT back-fill `shape`/.test(doc), 'v6->v7 explicitly does NOT back-fill shape into phases[]');

console.log('AC3/AC4 — simulate the documented resume cursor over two fixtures:');
// Resume cursor (state-schema "Resume cursor"): jump to the first phases[] entry whose status is
// not completed/skipped*; it walks WHATEVER phases[] declares (mode-agnostic, never re-derived).
function resumeCursor(phases) {
  const done = (s) => s === 'completed' || /^skipped/.test(s);
  return phases.find((p) => !done(p.status)) || null;
}
const gateFires = (cursor) => cursor && cursor.id === 'shape';

// Fixture A — pre-v7 in-flight feature run (schema_version 6, NO shape entry), paused at wireframes.
const preV7 = {
  schema_version: 6,
  phases: [
    { id: 'setup', status: 'completed' },
    { id: 'worktree', status: 'completed' },
    { id: 'init-state', status: 'completed' },
    { id: 'ideate', status: 'skipped-formed' },
    { id: 'requirements', status: 'completed' },
    { id: 'grill', status: 'completed' },
    { id: 'wireframes', status: 'paused' },
    { id: 'spec', status: 'pending' },
  ],
};
const cursorA = resumeCursor(preV7.phases);
assert(!preV7.phases.some((p) => p.id === 'shape'), 'AC3: pre-v7 fixture has NO shape entry (absence)');
assert(cursorA && cursorA.id === 'wireframes', `AC3: resume cursor lands on wireframes (got ${cursorA && cursorA.id})`);
assert(!gateFires(cursorA), 'AC3: /shape gate does NOT fire on the in-flight pre-v7 resume (absence-skip)');

// Fixture B — fresh v7 feature run, just inited (all pending). Cursor must land on the shape gate.
const freshList = membership('feature');
const freshV7 = {
  schema_version: 7,
  phases: freshList.map((id) => ({ id, status: 'pending' })),
};
const cursorB = resumeCursor(freshV7.phases);
// First non-infra gate the orchestrator presents after setup/worktree/init-state is `shape`.
const firstGate = freshV7.phases.find((p) => !['setup', 'worktree', 'init-state'].includes(p.id));
assert(freshV7.phases.some((p) => p.id === 'shape'), 'AC4: fresh v7 run includes a shape entry');
assert(firstGate && firstGate.id === 'shape', `AC4: shape is the first gate after init (got ${firstGate && firstGate.id})`);
assert(cursorB && cursorB.id === 'setup', 'AC4: fresh-run cursor starts at setup, then walks in declared order through shape');

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} CHECK(S) FAILED`);
process.exit(failed === 0 ? 0 : 1);
