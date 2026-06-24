---
schema_version: 1
id: 260624-y9m
kind: story
parent: 260624-3jp
title: "/verify — frontend slop gate: run the engine via the cheap Node path (no Playwright), route findings through dispositions, tiered mandatory-for-UI, slop advisory / quality blocking"
type: feature
priority: should
route: skill
dependencies: [260624-cg6]
plugin: pmos-toolkit
status: planned
feature_folder: docs/pmos/features/2026-06-24_design-slop-engine/
plan_doc: docs/pmos/features/2026-06-24_design-slop-engine/stories/260624-y9m/03_plan.md
tasks: docs/pmos/features/2026-06-24_design-slop-engine/stories/260624-y9m/tasks.yaml
worktree:
claimed_by:
driver_holder:
labels: [pmos-toolkit, verify, slop-engine, detect, gate]
created: 2026-06-24
updated: 2026-06-24
---

<!-- status: planned at define (Loop 1); route:skill. Build via /skill-sdlc build --story 260624-y9m -->

## Context

Consumer story of epic `260624-3jp` (dep: 260624-cg6). Design contract: `02_design.html#c-verify` +
`#d-tier` (grill-confirmed: quality blocks, slop advisory). `/verify` is non-skippable; the slop gate
must degrade gracefully and never block non-UI work.

## Acceptance criteria

1. `/verify`'s frontend-QA phase runs `_shared/slop-engine/detect.mjs` on the generated HTML via the
   **Node path (no Playwright)** — cheap, fast.
2. Findings route through `_shared/findings-dispositions.md` (Fix / Modify / Skip / Defer; severity
   `[Blocker]/[Should-fix]/[Nit]`). **quality**-category faults can be `[Blocker]` and **gate the
   release**; **slop** tells are `[Should-fix]/[Nit]`, surfaced loudly but **never hard-block**
   (grill-confirmed D-TIER).
3. **Tiered:** mandatory when the existing frontend-detection signal is positive; **skipped-with-log**
   for non-UI features (reuse `/verify`'s existing frontend-detection — do not re-invent).
4. **Graceful degradation (Inv-5):** if the engine/parser is unavailable, log a non-fatal note and
   continue — never flip a correct PASS to fail on tooling absence.
5. Surfaced in the `/verify` report (and inherited by `/complete-dev`'s summary) as a distinct
   slop-findings section.
6. `SKILL.md` edit conforms to `skill-patterns.md §A–§L`; passes `skill-eval`; 4 lints + audit clean;
   no release-prereq tasks in the plan.
7. Inv-4 holds: the gate calls no LLM and no network (deterministic, offline). Inv-3: no `impeccable`
   string introduced.
8. Live dogfood: `/verify` on a UI artifact with a planted WCAG contrast failure blocks (quality
   [Blocker]); the same artifact with only a `gradient-text` slop tell passes with an advisory note.
