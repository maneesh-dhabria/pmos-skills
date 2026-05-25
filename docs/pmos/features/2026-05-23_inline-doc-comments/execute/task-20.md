---
task_number: 20
task_name: "Batch C apply-edit-at-anchor — /ideate /survey-design /survey-analyse"
task_goal_hash: t20-batch-c-apply-edit-shims
plan_path: docs/pmos/features/2026-05-23_inline-doc-comments/03_plan.html
branch: feat/inline-doc-comments
worktree_path: /Users/maneeshdhabria/Desktop/Projects/agent-skills-inline-doc-comments
status: done
started_at: 2026-05-25T01:00:00Z
completed_at: 2026-05-25T02:35:00Z
implementer_commits:
  - 4be0a1a  # feat(T20): Batch C apply-edit-at-anchor — /ideate /survey-design /survey-analyse
  - e29e833  # fix(T19,T20): address code-review Importants — false positives in shims
wave: 4
files_touched:
  - plugins/pmos-toolkit/skills/ideate/{scripts/apply-edit-at-anchor.js,tests/apply-edit-at-anchor.test.js,tests/fixtures/apply-edit-at-anchor/ideate_mini.html,SKILL.md,reference/artifact-template.html}
  - plugins/pmos-toolkit/skills/survey-design/{scripts/apply-edit-at-anchor.js,tests/apply-edit-at-anchor.test.js,tests/fixtures/apply-edit-at-anchor/survey-design_mini.html,SKILL.md}
  - plugins/pmos-toolkit/skills/survey-analyse/{scripts/apply-edit-at-anchor.js,tests/apply-edit-at-anchor.test.js,tests/fixtures/apply-edit-at-anchor/survey-analyse_mini.html,SKILL.md}
  - tests/scripts/assert_apply_edit_at_anchor_{ideate,survey-design,survey-analyse}.sh
---

## What was implemented

T18 pattern for 3 interactive/data-shape skills + skill-specific feasibility refusals per spec:
- **/survey-design:** form-schema edits return `agent_judged_infeasible` `"Form schema is generated from survey.json — edit survey.json and regenerate via /survey-design."` Detector uses `q-*`/`question-*`/`field-*`/`form` id patterns + `<form>` element detection in quote text. Prose around the form IS editable.
- **/survey-analyse:** chart-data edits return `agent_judged_infeasible` `"Chart data is generated from the response set — re-run /survey-analyse with updated responses."` Three detection paths: `chart-*` id prefix (pre-read), `<script type="application/json">` position (post-read), chart-config block.
- **/ideate:** standard prose-editable; generic multi-section-restructure heuristic only.

## Tests

All 4 PASS:
- assert_apply_edit_at_anchor_ideate.sh — 5 cases
- assert_apply_edit_at_anchor_survey-design.sh — 5 cases
- assert_apply_edit_at_anchor_survey-analyse.sh — **6 cases** (1 added in fix loop)
- assert_apply_edit_at_anchor_spec.sh — T9 regression green

## Runtime evidence

N/A — pure library code.

## Reviewer findings

**Spec-compliance:** ✅ all 3 skills + invariants verified. (Subagent falsely claimed it created `assert_apply_edit_at_anchor_spec.sh` "previously absent"; verified via `git diff` at commit time — the T9 wrapper was untouched.)

**Code-quality (round 1):** Changes required — 1 Important, 3 Minor:
1. *Important:* survey-analyse/apply-edit-at-anchor.js `<script>` detector used `lastIndexOf("<script")` which also matched inside `</script>` close tags (since `<script` is a prefix of `</script>`). False-positive `agent_judged_infeasible` for any anchor immediately after a JSON script block. **→ FIXED** in `e29e833`: regex `/<script\b/g` with word-boundary; collect all matches, take last. New (f) sub-case asserts anchor-after-close-tag does NOT trip infeasible.
2. *Minor:* survey-analyse three-path detector (chart-* id + `<script type="application/json">` position + chart-config block) is broader than minimum. Path #3 overlaps with #1/#2. Acceptable per implementer's note; cleanup deferred.
3. *Minor:* survey-analyse id-pattern regex includes `chart-config-` as dead alternative (already matched by `chart-`). Trim deferred.
4. *Minor:* DRY 10th–12th copy. Same extraction flag. Deferred.

**Code-quality (round 2):** **Approved.** Important fixed; (f) sub-case verifies bug-free; regex uses `\b` word-boundary.

## Notes for downstream

- `e29e833` bundles T19 prototype fix + T20 survey-analyse fix in one commit.
- T22 owes minor cleanups (survey-analyse dead `chart-config-` regex alternative + 3-path simplification).
- DRY extraction is the standing cleanup target for the whole wave.
