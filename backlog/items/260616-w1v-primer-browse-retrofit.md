---
schema_version: 1
id: 260616-w1v
kind: story
parent: 260616-tqf
title: Retrofit /primer browse viewer onto the library-viewer substrate (preserve Curated/Yours)
type: feature
priority: should
status: in-progress
route: skill
dependencies: [260616-f7w]
feature_folder: docs/pmos/features/2026-06-16_curated-references-overlay/
plan_doc: docs/pmos/features/2026-06-16_curated-references-overlay/stories/260616-w1v/03_plan.html
tasks: docs/pmos/features/2026-06-16_curated-references-overlay/stories/260616-w1v/tasks.yaml
worktree: ~/Desktop/Projects/agent-skills-260616-w1v
claimed_by: build:cron-w1v
driver_holder: build:cron-w1v
labels: [pmos-learnkit, library-viewer, primer, browse, web-ui]
created: 2026-06-16
updated: 2026-06-16
---

<!-- status: planned at define (Loop 1); plan_doc + tasks.yaml authored. Build via /feature-sdlc build --story 260616-w1v -->

## Context

Deliverable B (primer retrofit) of epic `260616-tqf`: refactor the existing `/primer` browse
viewer onto the shared `_shared/library-viewer/` substrate built in `260616-f7w`, treating that
story's public API as frozen. Preserves every shipped behaviour — dual-population Curated vs Yours,
the `data/primers-index.json` + `data/primers/*.html` inputs, and the browse/list/bare verb.
Builds against `02_design.html` (anchors `#deliverable-b-viewer-substrate-h`, `#b-substrate`,
`#cross-skill-coherence-h`) + the skill-authoring criteria. **Depends on `260616-f7w`** — the
substrate must exist + its API frozen first.

## Acceptance Criteria

(Carries epic AC7; offline/lints from AC9.)

- [ ] AC7 — `/primer` `build-library.mjs` is refactored so its facet/filter/search/sort/view/masthead logic comes from the substrate, leaving only a primer corpus adapter + extras; the dual-population Curated/Yours sections, the corpus inputs, and the browse/list/bare verb are all preserved.
- [ ] AC7b — `primer/tests/build-library.test.sh` + `--selftest` stay green (regression gate); a live Playwright dogfood confirms Curated/Yours + facets + no regression; the page opens offline from `file://` with zero external requests; skill-eval `[D]` floor + four lints green.

## Notes

Plan + `tasks.yaml` authored at define. Regression-green is the spine; port incrementally onto the
frozen S2 API. Any API need S2 might not cover is flagged as a coordination risk in the plan, not
silently assumed. **Blocked until `260616-f7w` is done** (deps gate pickup). Build via
`/feature-sdlc build --story 260616-w1v` (or `build --next` once the dep clears).
