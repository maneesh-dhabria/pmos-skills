---
task_number: 12
task_name: "14-surface fanout assertion"
task_goal_hash: t12-fanout-assertion
plan_path: "docs/pmos/features/2026-05-28_inline-html-artifacts/03_plan.html"
branch: "feat/inline-html-artifacts"
worktree_path: "/Users/maneeshdhabria/Desktop/Projects/agent-skills-inline-html-artifacts"
status: done
started_at: 2026-05-28T03:40:00Z
completed_at: 2026-05-28T03:50:00Z
files_touched:
  - plugins/pmos-toolkit/skills/_shared/html-authoring/tests/fanout.test.sh
  - plugins/pmos-learnkit/skills/_shared/html-authoring/tests/fanout.test.sh  # substrate sync
---

## Outcome

New static-assertion test renders one sample artifact per emit skill through `renderArtifact()` and asserts three FR-29/30/§14.4 promises hold for every surface:

1. inline `<style>` block (FR-01 — CSS baked into the template, not externally linked at emit time)
2. inline `pmos-comments:start` sentinel (FR-04 — comments block baked into every emit)
3. `<meta name="pmos:skill" content="<slug>">` (FR-21 — every emit self-identifies its originating skill)

Matrix: 13 originating skills (architecture, artifact, diagram, ideate, plan, polish, prototype, readme, requirements, spec, survey-analyse, survey-design, wireframes) + the /feature-sdlc orchestrator = 14 surfaces.

## Key decisions / deviations

- **DEVIATION (node invocation).** Plan's snippet inlined the skill slug + paths into the JS via bash string interpolation (`require('$HERE/../render.js')`). Rewrote to `node --input-type=module -e '…' <render.js> <template.html> <skill>` with `process.argv` indexing — same safety reasoning as T10: paths and slug pass as argv, not into the JS source. Also makes the test compatible with `render.js` being either CJS or ESM (uses dynamic `await import()`).
- **TDD-fail was skipped — the test passed on first run.** Reason: T1 + T4 already wired the inline `<style>` / comments sentinel / `pmos:skill` meta into the template, so the substrate is correct; T12 is the assertion that locks the invariant against future regressions, not a new feature to drive in. Per the plan's `**TDD: yes — new-feature**` field, the intent is to prove the surface meets the promise; the script does that already. Documenting that the red→green TDD pair collapsed to green-from-the-start; the test still catches future regressions if any of the 14 surfaces drift.
- **Sub-tree synced to pmos-learnkit.** Drift hook will reject a commit that has a new test file in the toolkit substrate without its learnkit twin.
- **/diagram standalone-svg path NOT covered** per FR-30 explicit carve-out — that path emits raw SVG, not an HTML artifact, so `renderArtifact()` doesn't apply. The /diagram **embedded** path (HTML wrapper) is covered because it goes through renderArtifact like any other surface.

## Verification

```
$ bash plugins/pmos-toolkit/skills/_shared/html-authoring/tests/fanout.test.sh
OK: 14-surface fanout — 14 surfaces, all carry inline <style> + comments sentinel + pmos:skill meta

$ md5 -q plugins/{pmos-toolkit,pmos-learnkit}/skills/_shared/html-authoring/tests/fanout.test.sh
# Both copies match — substrate sync clean.
```

