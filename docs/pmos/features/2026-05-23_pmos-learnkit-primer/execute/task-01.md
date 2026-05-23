---
task_number: 1
task_name: "Parameterize template.html attribution + byte-stability test"
plan_path: "docs/pmos/features/2026-05-23_pmos-learnkit-primer/03_plan.html"
branch: "feat/pmos-learnkit-primer"
worktree_path: "/Users/maneeshdhabria/Desktop/Projects/agent-skills-pmos-learnkit-primer"
status: done
started_at: 2026-05-23T14:55:00Z
completed_at: 2026-05-23T15:02:00Z
files_touched:
  - plugins/pmos-toolkit/skills/_shared/html-authoring/template.html
  - plugins/pmos-toolkit/skills/_shared/html-authoring/tests/template-bytestable.sh
---

## Decisions / deviations

- Implementer added a `sed_esc()` helper to the test script (escapes `&`/`|` before substitution). The plan's verbatim script would have failed because sed's replacement side treats `&` as the matched-pattern backreference. Accepted deviation — script's intent (assert byte-stability) preserved; the three grep assertions unchanged.
- Doc-comment placed before `<!DOCTYPE html>` documenting `{{plugin_name}}`, `{{plugin_name_nbsp}}`, `{{plugin_url}}` defaults. HTML5-spec compliant.

## Verification

- Pre-T1 test run (against original template via git stash): FAIL exit 1 (as expected — no tokens, no `data-pmos-plugin`).
- Post-T1 test run: `PASS: template byte-stable for pmos-toolkit defaults`, exit 0.
- `grep -c '{{plugin_' template.html` → 10 (≥6 expected; doc-comment inflates count).
- `grep -c 'data-pmos-plugin' template.html` → 2 (exact).

## Notes

- Step 6 render-diff against `docs/pmos/features/2026-05-13_survey-analyse/02_spec.html`: that artifact does not exist in this worktree; check skipped (informational only). Substrate byte-stability proven structurally by the test script.
