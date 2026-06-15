---
schema_version: 1
id: 260615-dhk
kind: story
parent: 260615-565
title: Implement /primer browse library — transplant 61-primer corpus + build-library.mjs + browse verb + tests
type: feature
priority: should
status: in-progress
route: skill
dependencies: []
feature_folder: docs/pmos/features/2026-06-15_primer-browse-library/
plan_doc: docs/pmos/features/2026-06-15_primer-browse-library/stories/260615-dhk/03_plan.html
tasks: docs/pmos/features/2026-06-15_primer-browse-library/stories/260615-dhk/tasks.yaml
worktree: feat/260615-dhk
claimed_by: build:dhk-loop
driver_holder: build:dhk-loop
labels: [pmos-learnkit, primer, browse, corpus, web-ui]
created: 2026-06-15
updated: 2026-06-15
---

<!-- status: planned at define (Loop 1); plan_doc + tasks.yaml authored. Build via /feature-sdlc build --story 260615-dhk -->

## Context

The single build story for epic `260615-565`. Enhances the existing pmos-learnkit `/primer`
skill with a browse library, modeled on the released `/frameworks` browse (committed corpus +
zero-dep `build-library.mjs` + gitignored single-file offline page). Builds against the design
contract `docs/pmos/features/2026-06-15_primer-browse-library/02_design.html` and the standing
skill-authoring criteria (`feature-sdlc/reference/skill-patterns.md §A–§L`, repo `CLAUDE.md`).
One `/execute` run = one PR.

The 61-primer corpus is transplanted from the never-merged `feat/primer-bundle` branch via a
path-scoped `git checkout feat/primer-bundle -- plugins/pmos-learnkit/skills/primer/data/`
(T1). Key twist: one unified `library.html` renders both the curated corpus and user-generated
primers (Collection facet), retiring the bespoke Phase-5 `primers.html` step.

## Acceptance Criteria

(Inherited verbatim from epic `260615-565` — they are the change-set for this story.)

- [ ] AC1 — Corpus (61 html + 61 sources.json + index) committed under `plugins/pmos-learnkit/skills/primer/data/`; index parses as a 61-entry array.
- [ ] AC2 — `scripts/build-library.mjs` emits a single self-contained `library.html` (offline `file://`, zero external requests); `--selftest` passes.
- [ ] AC3 — All 61 curated primers render as cards (title/category/audience/depth/source-count/word-count/date); each links to a primer HTML that opens from `file://`.
- [ ] AC4 — Facets (Collection, super_category, category, audience, depth) + free-text search work client-side; "Clear all" resets.
- [ ] AC5 — User-generated primers in `{docs_path}/primer/` appear under `Collection=Yours`; shipped corpus under `Curated`; both reachable from one page.
- [ ] AC6 — `/primer browse` / `list` / bare-no-topic build + open `library.html`; `argument-hint` + `#browse` phase document it.
- [ ] AC7 — Phase-5 step-8 regen calls `build-library.mjs` (bespoke `primers.html` retired); a freshly written primer appears in `library.html`.
- [ ] AC8 — No browser / no Playwright → page still written + path printed; opening best-effort, never fails.
- [ ] AC9 — Tests under `skills/primer/tests/` cover `build-library` vs the shipped index; `library.html` gitignored; skill-eval `[D]` floor + four lints green.

## Notes

Plan + `tasks.yaml` authored at define time (this loop): T1 transplant corpus → T2 `build-library.mjs`
→ T3 SKILL.md wiring (browse verb + `#browse` + Phase-5 reconcile) → T4 tests → T5 load-bearing
live dogfood (Playwright at `file://`) → T6 verify gates. Strictly sequential. Build via
`/feature-sdlc build --story 260615-dhk` (or `build --next`).
