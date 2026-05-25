---
task_number: 19
task_name: "Batch B apply-edit-at-anchor — /wireframes /prototype /diagram"
task_goal_hash: t19-batch-b-apply-edit-shims
plan_path: docs/pmos/features/2026-05-23_inline-doc-comments/03_plan.html
branch: feat/inline-doc-comments
worktree_path: /Users/maneeshdhabria/Desktop/Projects/agent-skills-inline-doc-comments
status: done
started_at: 2026-05-25T01:00:00Z
completed_at: 2026-05-25T02:35:00Z
implementer_commits:
  - 89d5549  # feat(T19): Batch B apply-edit-at-anchor — /wireframes /prototype /diagram
  - e29e833  # fix(T19,T20): address code-review Importants — false positives in shims
wave: 4
files_touched:
  - plugins/pmos-toolkit/skills/wireframes/{scripts/apply-edit-at-anchor.js,tests/apply-edit-at-anchor.test.js,tests/fixtures/apply-edit-at-anchor/wireframes_mini.html,SKILL.md,reference/html-template.md}
  - plugins/pmos-toolkit/skills/prototype/{scripts/apply-edit-at-anchor.js,tests/apply-edit-at-anchor.test.js,tests/fixtures/apply-edit-at-anchor/prototype_mini.html,SKILL.md}
  - plugins/pmos-toolkit/skills/diagram/{scripts/apply-edit-at-anchor.js,tests/apply-edit-at-anchor.test.js,tests/fixtures/apply-edit-at-anchor/diagram_mini.html,SKILL.md}
  - tests/scripts/assert_apply_edit_at_anchor_{wireframes,prototype,diagram}.sh
---

## What was implemented

T18 pattern for 3 visual/SVG-shape skills + skill-specific feasibility refusals:
- **/wireframes:** edits inside individual screen files applyable; edits to index.html nav/screen-list structure return `agent_judged_infeasible` ("regenerate via /wireframes"). FR-21 two-emit references: per-screen html-template.md skeleton AND index.html both bake the comments.js + comments.css references; meta-tag bake required on both.
- **/prototype:** `<section>` region edits applyable; edits inside `<script>` JSX or simulated-mock-data blocks return `agent_judged_infeasible` ("regenerate the prototype via /prototype"). Heuristic: verb+keyword bigram regex (see Reviewer findings round 2).
- **/diagram:** SVG `<text>` element edits applyable; geometry edits (shape coords/paths) deferred to T23 SVG retrofit. Dual id/data-anchor resolution adds ~30 LOC over canonical — legitimately diagram-specific.

## Tests

All 4 PASS:
- assert_apply_edit_at_anchor_wireframes.sh — 5 cases
- assert_apply_edit_at_anchor_prototype.sh — **6 cases** (1 added in fix loop)
- assert_apply_edit_at_anchor_diagram.sh — 5 cases
- assert_apply_edit_at_anchor_spec.sh — T9 regression green

## Runtime evidence

N/A — pure library code. Per-skill test sub-cases cover all paths.

## Reviewer findings

**Spec-compliance:** ✅ all 3 skills + invariants verified; wireframes FR-21 dual-emit confirmed at per-screen template AND index.html SKILL.md instructions.

**Code-quality (round 1):** Changes required — 1 Important, 3 Minor:
1. *Important:* prototype/apply-edit-at-anchor.js infeasibility regex over-blocked legitimate prose mentions of keywords like "mock-data" / "window.__". E.g., "Add a note explaining that mock-data lives in window.__mockData" was incorrectly judged infeasible. **→ FIXED** in `e29e833`: new regex requires verb+keyword bigram: `\b(edit|change|modify|restructure|rewrite|refactor|update)\s+(the\s+)?(jsx|react\s+component|mock.?data|runtime\.js|components\.js|window\.__)\b`. Existing (d) sub-case body updated; new (f) sub-case asserts keyword-without-verb does NOT trip infeasible.
2. *Minor:* wireframes' `path.basename === 'index.html'` gate is fragile if downstream emit renames the index. Acceptable for now (current emit always uses `index.html`); TODO marker recommended. Deferred.
3. *Minor:* DRY 7th–9th copy after T18; same `_shared/comments/apply-edit-at-anchor-core.js` extraction flag. Deferred.

**Code-quality (round 2):** **Approved.** Important fixed; new (f) sub-case + updated (d) sub-case verified; regex requires bigram.

## Notes for downstream

- `e29e833` also bundles the T20 survey-analyse fix (one consolidated fix commit covers both wave Importants).
- T22 owes the wireframes basename TODO marker.
- DRY extraction (target `_shared/comments/apply-edit-at-anchor-core.js`) is flagged by every wave-4 reviewer; first natural cleanup task.
