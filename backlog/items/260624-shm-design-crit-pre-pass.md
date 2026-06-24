---
schema_version: 1
id: 260624-shm
kind: story
parent: 260624-3jp
title: "/design-crit — deterministic slop pre-pass: inject the browser detector into the existing Playwright session, surface engine findings ahead of the LLM critique"
type: feature
priority: should
route: skill
dependencies: [260624-cg6]
plugin: pmos-toolkit
status: in-progress
feature_folder: docs/pmos/features/2026-06-24_design-slop-engine/
plan_doc: docs/pmos/features/2026-06-24_design-slop-engine/stories/260624-shm/03_plan.md
tasks: docs/pmos/features/2026-06-24_design-slop-engine/stories/260624-shm/tasks.yaml
worktree: .claude/worktrees/feat-260624-shm
claimed_by: build:6681ff46-e6d7-4cb7-854d-4ca3ea2b44ff
driver_holder: build:6681ff46-e6d7-4cb7-854d-4ca3ea2b44ff
labels: [pmos-toolkit, design-crit, slop-engine, detect]
created: 2026-06-24
updated: 2026-06-24
---

<!-- status: planned at define (Loop 1); route:skill. Build via /skill-sdlc build --story 260624-shm -->

## Context

Consumer story of epic `260624-3jp` (dep: 260624-cg6 — the engine must be present, merged at claim
time per D9). Design contract: `02_design.html#c-design-crit` + `#d-stack` + `#non-duplication`.
`/design-crit` already launches Playwright; this story injects the slop engine into that open page.

## Acceptance criteria

1. `/design-crit` runs a deterministic **slop pre-pass before** its LLM Nielsen/WCAG/PSYCH critique:
   inject `_shared/slop-engine/browser.js`, call `window.pmosDesignScan()`, read findings from
   `.pmos-slop-*` in the DOM (read programmatically, not via screenshot).
2. Engine findings are presented as a **distinct lane** (rule id + snippet + fix guidance), reported
   **first**, with the LLM critique layered after — a reader can tell machine-flagged tells from judged
   UX issues (D-STACK).
3. **Additive + graceful (Inv-5):** if the engine fails to load, `/design-crit` behaves exactly as
   today, with a logged note. No regression to the existing critique flow.
4. Does **not** replace the LLM critique (non-duplication); the engine complements it.
5. `SKILL.md` edit conforms to `skill-patterns.md §A–§L`; passes `skill-eval` (the `[D]` half + judge);
   4 lints + audit clean; no release-prereq tasks in the plan (those are /complete-dev's).
6. Live dogfood: run `/design-crit` against an HTML artifact that contains a known slop tell (e.g. a
   `side-tab` accent border) and confirm the engine lane flags it, then the LLM lane adds judgement.
7. Inv-3 holds: no `impeccable` string introduced into `/design-crit` (engine is referenced by its
   pmos-native paths/globals).
