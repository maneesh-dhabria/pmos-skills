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
status: planned
feature_folder: docs/pmos/features/2026-06-24_design-slop-engine/
plan_doc: docs/pmos/features/2026-06-24_design-slop-engine/stories/260624-aqb/03_plan.md
tasks: docs/pmos/features/2026-06-24_design-slop-engine/stories/260624-aqb/tasks.yaml
worktree:
claimed_by:
driver_holder:
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
