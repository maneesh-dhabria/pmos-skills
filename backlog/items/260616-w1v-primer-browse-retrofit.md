---
schema_version: 1
id: 260616-w1v
kind: story
parent: 260616-tqf
title: Retrofit /primer browse viewer onto the library-viewer substrate (preserve Curated/Yours)
type: feature
priority: should
status: done
released: 0.27.0
route: skill
dependencies: [260616-f7w]
feature_folder: docs/pmos/features/2026-06-16_curated-references-overlay/
plan_doc: docs/pmos/features/2026-06-16_curated-references-overlay/stories/260616-w1v/03_plan.html
tasks: docs/pmos/features/2026-06-16_curated-references-overlay/stories/260616-w1v/tasks.yaml
worktree:
claimed_by:
driver_holder:
labels: [pmos-learnkit, library-viewer, primer, browse, web-ui]
created: 2026-06-16
updated: 2026-06-17
---

<!-- status: done at build (Loop 2, 2026-06-17, holder build:cron-w1v, branch feat/260616-w1v @ 2a7f6f0). /primer build-library.mjs refactored onto the _shared/library-viewer/ substrate. R3 resolved: frozen S2 had no card-render/link-out seam, so per R3 ("re-open S2 to add the capability — never fork inside primer") an additive, default-off, skill-agnostic config.card seam (badge / link-out / metarow pills) + a universal data:, favicon were added to lib.mjs; frameworks byte-inert. substrate lib.test.mjs 12/12; frameworks --selftest + test.sh green (zero regression); D12 grep clean; primer --selftest + build-library.test.sh (T3 substrate-import failing-first→green) + structure.test.sh green; 4 lints + skill-eval [D] EXIT 0; live Playwright dogfood PASS (both Collection sections, 5 facets + search, applied chip add/clear, subtitle "61 curated · 1 of yours", link-out cards, 0 console errors, 1 network request). Worktree KEPT for Loop-3 (/complete-dev --epic 260616-tqf). -->

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

- [x] AC7 — `/primer` `build-library.mjs` is refactored so its facet/filter/search/sort/view/masthead logic comes from the substrate, leaving only a primer corpus adapter + extras; the dual-population Curated/Yours sections, the corpus inputs, and the browse/list/bare verb are all preserved.
- [x] AC7b — `primer/tests/build-library.test.sh` + `--selftest` stay green (regression gate); a live Playwright dogfood confirms Curated/Yours + facets + no regression; the page opens offline from `file://` with zero external requests; skill-eval `[D]` floor + four lints green.

## Notes

Plan + `tasks.yaml` authored at define. Regression-green is the spine; port incrementally onto the
frozen S2 API. Any API need S2 might not cover is flagged as a coordination risk in the plan, not
silently assumed. **Blocked until `260616-f7w` is done** (deps gate pickup). Build via
`/feature-sdlc build --story 260616-w1v` (or `build --next` once the dep clears).
