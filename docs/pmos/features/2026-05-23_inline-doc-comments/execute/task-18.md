---
task_number: 18
task_name: "Batch A apply-edit-at-anchor — /requirements /plan /artifact"
task_goal_hash: t18-batch-a-apply-edit-shims
plan_path: docs/pmos/features/2026-05-23_inline-doc-comments/03_plan.html
branch: feat/inline-doc-comments
worktree_path: /Users/maneeshdhabria/Desktop/Projects/agent-skills-inline-doc-comments
status: done
started_at: 2026-05-25T01:00:00Z
completed_at: 2026-05-25T01:50:00Z
implementer_commit: 83ba955
wave: 4
files_touched:
  - plugins/pmos-toolkit/skills/requirements/{scripts/apply-edit-at-anchor.js,tests/apply-edit-at-anchor.test.js,tests/fixtures/apply-edit-at-anchor/requirements_mini.html,SKILL.md}
  - plugins/pmos-toolkit/skills/plan/{scripts/apply-edit-at-anchor.js,tests/apply-edit-at-anchor.test.js,tests/fixtures/apply-edit-at-anchor/plan_mini.html,SKILL.md}
  - plugins/pmos-toolkit/skills/artifact/{scripts/apply-edit-at-anchor.js,tests/apply-edit-at-anchor.test.js,tests/fixtures/apply-edit-at-anchor/artifact_mini.html,SKILL.md}
  - tests/scripts/assert_apply_edit_at_anchor_{requirements,plan,artifact}.sh
---

## What was implemented

3 skills × 4 files each, mirroring T9 (/spec) canonical pattern:
- `<meta name="pmos:skill" content="<slug>">` byte-exact in fixture + SKILL.md write-step instruction.
- "Apply comment-resolver edit" phase appended to SKILL.md citing `_shared/apply-edit-at-anchor.md`.
- Asset-substrate copy list updated: `comments.js`, `comments.css`, `diff_match_patch.js`, `comments-open.{command,sh,bat}`.
- Per-skill `scripts/apply-edit-at-anchor.js` (~211 LOC) with id-first → Bitap → diff-match-patch dispatch.
- Per-skill `tests/apply-edit-at-anchor.test.js` (~97 LOC, 5 sub-cases: happy id / quote-fallback / orphan / infeasible / §9.3 idempotency).
- Per-skill fixture under `tests/fixtures/apply-edit-at-anchor/<slug>_mini.html`.
- Per-skill bash assert wrapper using BASH_SOURCE-fallback + walk-up boilerplate.

DMP path uses `_shared/html-authoring/assets/diff-match-patch.js` (T9 canonical) — both DMP copies in the repo carry identical content; T9 sets the precedent.

## Tests

All 4 PASS:
- assert_apply_edit_at_anchor_requirements.sh — 5 cases
- assert_apply_edit_at_anchor_plan.sh — 5 cases
- assert_apply_edit_at_anchor_artifact.sh — 5 cases
- assert_apply_edit_at_anchor_spec.sh — T9 regression green

## Runtime evidence

N/A — pure library code. Per-skill test sub-cases exercise the full shim end-to-end with mock anchor + fixture.

## Reviewer findings

**Spec-compliance:** ✅ all 3 skills + invariants verified.

**Code-quality (round 1):** Approved — 0 Critical, 0 Important, 4 Minor:
1. Comment loss during mirroring (T9 explanatory comments stripped to save lines; budget not actually pressed). Cosmetic; deferred.
2. `Match_Threshold` trailing comment dropped. Cosmetic; deferred.
3. DRY: 4-way duplicate after T9 + T18×3 (~800 LOC). Extraction target: `plugins/pmos-toolkit/skills/_shared/comments/apply-edit-at-anchor-core.js` exporting `apply(input, { skill })`; per-skill shims would become ~10 LOC each. Deferred to follow-up cleanup task.

**Assessment:** Approved.

## Notes for downstream

- T18 is the post-T9 reference template for T19/T20/T21 batches.
- DRY extraction to `_shared/comments/apply-edit-at-anchor-core.js` is the natural follow-up cleanup task; T19/T20/T21 added 9 more near-duplicates, so the extraction touches 13+ shims when it lands.
