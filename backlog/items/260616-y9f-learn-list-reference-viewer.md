---
schema_version: 1
id: 260616-y9f
kind: story
parent: 260616-tqf
title: Build the /learn-list reference viewer on the substrate + curated corpus
type: feature
priority: should
status: done
released: 0.27.0
route: skill
dependencies: [260616-f7w, 260616-v4h]
feature_folder: docs/pmos/features/2026-06-16_curated-references-overlay/
plan_doc: docs/pmos/features/2026-06-16_curated-references-overlay/stories/260616-y9f/03_plan.html
tasks: docs/pmos/features/2026-06-16_curated-references-overlay/stories/260616-y9f/tasks.yaml
worktree:
claimed_by: null
driver_holder: null
labels: [pmos-learnkit, library-viewer, learn-list, browse, curated-references, web-ui]
created: 2026-06-16
updated: 2026-06-17
---

<!-- status: planned at define (Loop 1); plan_doc + tasks.yaml authored. Build via /feature-sdlc build --story 260616-y9f -->
<!-- status: done at build (Loop 2, 2026-06-17). Branch feat/260616-y9f @ d83d64a. THIN substrate consumer
     learn-list/scripts/build-library.mjs (record→card 8-field WHITELIST adapter — never spreads; source/year/tags
     facets; graceful empty-state; atomic write) + build-library.test.sh + mini-corpus poison fixture + browse/list
     verb dispatch + #browse phase. Gates GREEN: build-library.test.sh PASS, generator --selftest PASS, substrate
     lib.test.mjs 10/10 + frameworks --selftest PASS (ZERO regression), D12 grep clean, 4 lints PASS, skill-eval [D]
     EXIT 0 (no residuals), [J] reviewer SHIP 22/22. LIVE DOGFOOD (real 1817-rec corpus, localhost): all 6 driven —
     1817 cards render, source/year/tags facets filter, title+summary search narrows, reader opens w/ pill+columns+
     source link+deep-link hash, applied chips + Clear-all reset; LIVE-DOM PII assertion keys⊆allowlist + 0 field-key
     tokens (pii_clean). Only console error = benign favicon 404 (browser-auto, page references no favicon). See
     dogfood/DOGFOOD.md. COMPLETES epic 260616-tqf (all stories built). Claim released. Worktree KEPT for Loop-3. -->

## Context

The user's headline ask: give `/learn-list` its own browse/list reference-viewer listing page
(like `/frameworks` and `/primer`), built ON the shared `_shared/library-viewer/` substrate
(`260616-f7w`) and reading the scrubbed curated-references corpus shipped by `260616-v4h`. A thin
consumer: a new `learn-list/scripts/build-library.mjs` + a `browse`/`list`/bare verb + `#browse`
phase + tests. Builds against `02_design.html` (anchors `#deliverable-b-viewer-substrate-h`,
`#b-learnlist-viewer`, `#b-substrate`, `#corpus-and-pii-h`, `#cross-skill-coherence-h`) + the
skill-authoring criteria. **Depends on `260616-f7w` (substrate API) AND `260616-v4h` (corpus
JSON).**

## Acceptance Criteria

(Carries epic AC8; offline/lints from AC9.)

- [x] AC8 — `/learn-list` gains a thin `scripts/build-library.mjs` (consumes the substrate) that renders a faceted (source_type / tags / publication-year), searchable (title+summary), sortable single-file offline reference viewer from `_shared/topic-research/curated-references.json`, with a reader/detail view + applied-filter chips + masthead; `browse`/`list`/bare verb + `#browse` phase document it.
- [x] AC8b — The viewer surfaces ONLY the allowlisted corpus fields (no notion-specific field appears in the DOM — gated by a test); degrades to a graceful empty-state when the corpus is absent; opens offline from `file://` with zero external requests; `learn-list/tests/build-library.test.sh` green; skill-eval `[D]` floor + four lints green.

## Notes

Plan + `tasks.yaml` authored at define (TDD: tests-first for the build + the no-PII-fields gate;
final load-bearing live Playwright dogfood asserting facets/search work offline, corpus renders,
no notion-specific field in the DOM). **Blocked until both `260616-f7w` and `260616-v4h` are done**
(deps gate pickup) — pickable last. Build via `/feature-sdlc build --story 260616-y9f` (or
`build --next` once both deps clear).
