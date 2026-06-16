---
schema_version: 1
id: 260616-f7w
kind: story
parent: 260616-tqf
title: Extract _shared/library-viewer/ substrate + retrofit /frameworks onto it (zero regression)
type: feature
priority: should
status: in-progress
route: skill
dependencies: []
feature_folder: docs/pmos/features/2026-06-16_curated-references-overlay/
plan_doc: docs/pmos/features/2026-06-16_curated-references-overlay/stories/260616-f7w/03_plan.html
tasks: docs/pmos/features/2026-06-16_curated-references-overlay/stories/260616-f7w/tasks.yaml
worktree:
claimed_by: build:cron-9ab6e541
driver_holder: build:cron-9ab6e541
labels: [pmos-learnkit, library-viewer, frameworks, browse, web-ui]
created: 2026-06-16
updated: 2026-06-16
---

<!-- status: planned at define (Loop 1); plan_doc + tasks.yaml authored. Build via /feature-sdlc build --story 260616-f7w -->

## Context

Deliverable B (substrate half) of epic `260616-tqf`: extract the rediscovered "faceted listing
page" into a new `_shared/library-viewer/` substrate, and **prove** it by refactoring the richest
existing viewer (`/frameworks`, ~796-line `build-library.mjs`) onto it in the same story — a
consumer-less abstraction is premature; the richest case makes the API right and freezes it for
S3 (`/primer`) and S4 (`/learn-list`). Builds against `02_design.html` (anchors
`#deliverable-b-viewer-substrate-h`, `#b-substrate`, `#cross-skill-coherence-h`,
`#risks-open-questions-h`) + the skill-authoring criteria. Hard constraint preserved: the in-page
client is plain vanilla JS (no ES modules in browser assets); offline from `file://`, zero-dep.

## Acceptance Criteria

(Carries epic AC5–AC6.)

- [ ] AC5 — `_shared/library-viewer/` exists: `guidelines.md` (the three views, facet/chip behaviour, search, sort, sidebar reader, mobile, masthead/theme, offline/zero-dep/no-ESM constraints) + a reusable zero-dep Node-ESM engine (facets+counts, filter/search/sort, chips, view toggles, single-file emit) with a frozen public API + substrate-level tests; the engine is skill-agnostic (source grep).
- [ ] AC6 — `/frameworks` `build-library.mjs` is refactored onto the substrate, preserving every shipped feature (inline SVG diagrams + anchoring, sidebar reader, multi-select facets, three views, lazy thumbs, deep-link hash, copy/share, masthead); `frameworks/tests/build-library.test.sh` + `--selftest` stay green; a live Playwright dogfood of the rebuilt 272-record browse page confirms no regression.

## Notes

Plan + `tasks.yaml` authored at define (9 tasks, TDD): guidelines → failing API test (RED) →
engine (GREEN) → substrate selftest + agnostic grep → frameworks refactor → two parallel
regression gates (`--selftest` + shipped `build-library.test.sh`) → lints/skill-eval → load-bearing
live Playwright dogfood. Frozen API seam: `extractFacets`, `buildIndex`, `filterEngine`,
`sortGroups`, `emitHtml({…bodyRenderer, extraHead})` — frameworks keeps its diagram pipeline +
super-category labels + corpus adapter via the `bodyRenderer` seam. No deps — pickable
immediately (the spine S3/S4 build on). Build via `/feature-sdlc build --story 260616-f7w`.
