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
status: done
released: v2.89.0
feature_folder: docs/pmos/features/2026-06-24_design-slop-engine/
plan_doc: docs/pmos/features/2026-06-24_design-slop-engine/stories/260624-y9m/03_plan.md
tasks: docs/pmos/features/2026-06-24_design-slop-engine/stories/260624-y9m/tasks.yaml
worktree:
claimed_by: build:6681ff46-e6d7-4cb7-854d-4ca3ea2b44ff
driver_holder: build:6681ff46-e6d7-4cb7-854d-4ca3ea2b44ff
labels: [pmos-toolkit, verify, slop-engine, detect, gate]
created: 2026-06-24
updated: 2026-06-25
---

<!-- status: planned at define (Loop 1); route:skill. Build via /skill-sdlc build --story 260624-y9m -->

## Context

Consumer story of epic `260624-3jp` (dep: 260624-cg6). Design contract: `02_design.html#c-verify` +
`#d-tier` (grill-confirmed: quality blocks, slop advisory). `/verify` is non-skippable; the slop gate
must degrade gracefully and never block non-UI work.

## Acceptance criteria

- [ ] `/verify`'s frontend-QA phase runs `_shared/slop-engine/detect.mjs` on the generated HTML via the
   **Node path (no Playwright)** — cheap, fast.
- [ ] Findings route through `_shared/findings-dispositions.md` (Fix / Modify / Skip / Defer; severity
   `[Blocker]/[Should-fix]/[Nit]`). **quality**-category faults can be `[Blocker]` and **gate the
   release**; **slop** tells are `[Should-fix]/[Nit]`, surfaced loudly but **never hard-block**
   (grill-confirmed D-TIER).
- [ ] **Tiered:** mandatory when the existing frontend-detection signal is positive; **skipped-with-log**
   for non-UI features (reuse `/verify`'s existing frontend-detection — do not re-invent).
- [ ] **Graceful degradation (Inv-5):** if the engine/parser is unavailable, log a non-fatal note and
   continue — never flip a correct PASS to fail on tooling absence.
- [ ] Surfaced in the `/verify` report (and inherited by `/complete-dev`'s summary) as a distinct
   slop-findings section.
- [ ] `SKILL.md` edit conforms to `skill-patterns.md §A–§L`; passes `skill-eval`; 4 lints + audit clean;
   no release-prereq tasks in the plan.
- [ ] Inv-4 holds: the gate calls no LLM and no network (deterministic, offline). Inv-3: no `impeccable`
   string introduced.
- [ ] Live dogfood: `/verify` on a UI artifact with a planted WCAG contrast failure blocks (quality
   [Blocker]); the same artifact with only a `gradient-text` slop tell passes with an advisory note.

## Build notes (Loop-2, 2026-06-25)

BUILT on `feat/260624-y9m` (commit `122811ed`; cg6 engine merged in). route:skill inner
pipeline: skill-tier-resolve → execute → skill-eval [J] → verify → write-back.

- **Gate runner** `verify/scripts/slop-gate.mjs`: frozen `BLOCKING_QUALITY` id set (§H — script
  computes the bracket, never model arithmetic); exit 2 = [Blocker] quality fault present
  (verdict drops below PASS), 0 = clean/skipped, 64 = usage. Inv-5 graceful skip (engine-absent
  / parser-throw → exit 0, never flips a correct PASS). Inv-4 offline (no Playwright/network/LLM).
- **SKILL.md**: 4d `#slop-gate` pre-check (reuses the browser-mandatory trigger), 4g
  `#slop-routing` (cites `_shared/findings-dispositions.md`), 5f `#slop-findings` distinct lane,
  Phase 8 `#commit-report` folds unfixed [Blocker] quality faults below bare PASS. Added
  `## Track Progress` to clear the pre-existing `d-progress-tracking` [D] fail.
- **Tests** `verify/tests/slop-gate.test.mjs`: 5/5 — both lanes, determinism, Inv-5 skip,
  Inv-4 offline neg-control.

Gates: skill-eval [D] improved 2→1 fail (fixed d-progress-tracking). 4 repo lints + audit +
comments-coverage PASS; Inv-3 grep clean (zero `impeccable`). Live dogfood **satisfied**
(contrast→exit2 [Blocker]; gradient-only→exit0 advisory; engine-absent→exit0 skip);
blind judge **SHIP 5/5/5/5/5**.

**Accepted residual** (pre-existing, on files NOT touched by this story): skill-eval [D]
`c-reference-toc` fails for `verify/reference/folded-phases.md` + `design-drift-check.md`
(>100 lines, no leading ToC). Fails identically on the merge base; out of scope for the slop
gate. Record, do not weaken.
