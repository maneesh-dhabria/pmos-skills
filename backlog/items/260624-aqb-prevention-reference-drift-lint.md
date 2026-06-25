---
schema_version: 1
id: 260624-aqb
kind: story
parent: 260624-3jp
title: "Prevention reference + drift-lint: generate _shared/design-slop-rules.md from the registry, cite it as a floor in /wireframes /prototype /execute, add tools/lint-slop-rules.sh to skill-hygiene.yml"
type: feature
priority: should
route: skill
dependencies: [260624-cg6]
plugin: pmos-toolkit
status: done
feature_folder: docs/pmos/features/2026-06-24_design-slop-engine/
plan_doc: docs/pmos/features/2026-06-24_design-slop-engine/stories/260624-aqb/03_plan.md
tasks: docs/pmos/features/2026-06-24_design-slop-engine/stories/260624-aqb/tasks.yaml
worktree: .claude/worktrees/feat-260624-aqb
claimed_by: build:6681ff46-e6d7-4cb7-854d-4ca3ea2b44ff
driver_holder: build:6681ff46-e6d7-4cb7-854d-4ca3ea2b44ff
labels: [pmos-toolkit, slop-engine, prevention, drift-lint, ci]
created: 2026-06-24
updated: 2026-06-25
---

<!-- status: planned at define (Loop 1); route:skill. Build via /skill-sdlc build --story 260624-aqb -->

## Context

Consumer story of epic `260624-3jp` (dep: 260624-cg6). Design contract: `02_design.html#c-prevention`
+ `#c-drift-lint` + `#d-gen`. This is impeccable's prevention face + its cross-validator, ported.

## Acceptance criteria

- [ ] `_shared/slop-engine/design-slop-rules.md` (the prevention reference) is **generated from the
   registry** via the story-A generator (`SLOP_RULES.skillGuideline` grouped by `skillSection`), not
   hand-authored (D-GEN, Inv-2). Re-running the generator is idempotent.
- [ ] The generated floor is **cited (one-line, per §K) as a design floor** in all three UI-generating
   surfaces — `/wireframes`, `/prototype`, **and** frontend `/execute` (grill-confirmed) — alongside
   the existing `DESIGN.md` house-style cite. No restating of the rules at the call sites.
- [ ] `tools/lint-slop-rules.sh` (repo-root, bash-3.2-safe) asserts every `SLOP_RULES` entry with a
   `skillGuideline` has that substring present in `design-slop-rules.md`; **fails loudly on drift**
   (ports impeccable's `validateAntipatternRules()`).
- [ ] The lint is wired into `.github/workflows/skill-hygiene.yml` alongside the existing lints; a
   deliberately-broken fixture proves it fails.
- [ ] Inv-3 holds: a grep for `impeccable` over the new/edited files returns hits only in design-doc
   lineage prose / the engine `NOTICE` (not introduced by this story).
- [ ] The three SKILL.md edits conform to `skill-patterns.md §A–§L`; `skill-eval` passes for each touched
   skill; 4 lints + audit clean; no release-prereq tasks in the plan.
- [ ] Live dogfood: edit a rule's `skillGuideline` without updating the floor → the lint fails; regenerate
   the floor → the lint passes.

## Build notes (Loop-2, 2026-06-25)

BUILT on `feat/260624-aqb` (branch commit `4d6b6c16`; cg6 D9 claim-time merge `4628491b`). Pure
consumer of the cg6 engine — `registry.mjs` + `gen-rules-doc.mjs` left untouched (Inv-1).

- **T1** — `_shared/slop-engine/design-slop-rules.md` generated via `gen-rules-doc.mjs` (37 guidelines
  across 6 sections; idempotent). Coverage/idempotence test `tests/gen-rules-doc.test.mjs` (3/3) also
  asserts committed floor == generator output.
- **T2** — one-line floor cites (§K, no rule text restated) in `/wireframes` `#generate`, `/prototype`
  `#generate-devices`, frontend `/execute` `#per-task-loop` UI-tasks step, each alongside the existing
  DESIGN.md cite.
- **T3** — `tools/lint-slop-rules.sh` (bash-3.2-safe; node extracts `SLOP_RULES[].skillGuideline`, greps
  the floor verbatim). Exit 0 in-sync / 1 drift (names rule) / 2 invocation error. TDD `tools/tests/
  lint-slop-rules.test.sh` 5/5.
- **T4** — wired into `.github/workflows/skill-hygiene.yml` (lint + test steps; engine/floor/lint paths in
  `paths:` trigger); broken fixture `tools/tests/fixtures/slop-rules/floor-drifted.md` proves failure.
- **T5** — Inv-3 grep clean (reworded one lint comment to drop the upstream name); skill-eval `/wireframes`
  EXIT 0, `/execute` EXIT 0 (added canonical `## Track Progress`), `/prototype` EXIT 1 = the single
  **pre-existing** `c-reference-toc` residual on 5 untouched `reference/*.md` files (recorded, not
  weakened); 4 repo lints + audit (3/3) + comments-coverage all PASS.
- **T6** — live dogfood `stories/260624-aqb/dogfood-run.md`: drift the floor → lint FAIL (exit 1, names
  `flat-type-hierarchy`) → regenerate → PASS (exit 0) → byte-identical revert.

Gates: engine+floor tests 9/9, lint test 5/5, Inv-3 clean, skill-eval as above, all repo
lints/audit/coverage PASS. Blind adversarial judge **SHIP 5/5/5/5/5, zero defects** (independently
re-broke `em-dash-overuse` to confirm the lint fires). **Registry smell flagged to story A:** two
sub-3-word `skillGuideline` values (`marketing-buzzword`, `aphoristic-cadence`) — handled correctly by
construction, not edited here (Inv-1). Branch KEPT for Loop-3. **EPIC 260624-3jp NOW FULLY BUILT**
(cg6+shm+y9m+aqb) → `/complete-dev --epic 260624-3jp`. unpushed.
