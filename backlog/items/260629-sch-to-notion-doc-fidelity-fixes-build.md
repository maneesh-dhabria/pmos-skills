---
schema_version: 1
id: 260629-sch
kind: story
parent: 260629-7hm
title: "/to-notion-doc fidelity fixes — honest report, single-owner stub pipeline, dl/annexure detection, per-phase banner"
type: enhancement
priority: should
route: skill
dependencies: []
plugin: pmos-utilities
status: in-progress
feature_folder: docs/pmos/features/2026-06-29_to-notion-doc-fidelity/
plan_doc: docs/pmos/features/2026-06-29_to-notion-doc-fidelity/stories/260629-sch/03_plan.html
tasks: docs/pmos/features/2026-06-29_to-notion-doc-fidelity/stories/260629-sch/tasks.yaml
worktree: feat/260629-sch
claimed_by: build:b0c61220-0a97-4ab0-afcb-144a7c4df518
driver_holder: build:b0c61220-0a97-4ab0-afcb-144a7c4df518
build_branch:
build_commit:
labels: [pmos-utilities, to-notion-doc, notion, document-conversion, skill, from-feedback]
created: 2026-06-29
updated: 2026-06-30
---

<!-- status: planned at define (Loop 1); tasks.yaml authored, route:skill. Build via /skill-sdlc build --story 260629-sch -->

## Context

The whole epic (260629-7hm) is one story: all seven findings revise the single skill
`plugins/pmos-utilities/skills/to-notion-doc/` — its `SKILL.md` plus the scripts `parse-doc.mjs`,
`map-to-notion.mjs`, `upload-image.mjs`, and the reference `notion-blocks.md`. Decisions, FRs, and invariants
live in the `design_doc:` (`../../02_design.html`). One `/execute` run.

The image findings (F2 dual-write, F3 stub shape, F4 caption de-nest) share the stub pipeline and resolve
together: `map-to-notion.mjs` becomes the single positional owner (D1), the stub is one caption-inline callout
(D2), and Phase 2 only fills the map-emitted slot. The structure findings (F5 dl→table, F6 annexure grouping)
are additive `parse-doc.mjs` detectors. F1 (honest report) is a SKILL.md Phase 5 section; F7 (status banner) is
a one-line emit at every phase boundary.

## Acceptance Criteria

- [ ] **AC1 (F1)** Phase 5 always emits a Post-conversion actions section: (a) count of in-page anchor links
  written as plain text + reason + manual fix; (b) `fit-page-width="true"` confirmed on all N tables + the
  page-level "Full width" toggle note. Present even when verification is clean; counts derived from the map
  plan, not hard-coded.
- [ ] **AC2 (F2)** `map-to-notion.mjs` emits exactly one stub callout per image node and per ambiguous-media
  node at correct nesting depth, with a fillable caption slot. Phase 2 fills it; the SKILL.md no longer injects
  a second callout. A new selftest asserts no duplicate "Unresolved svg" + stub pair and correct indentation.
- [ ] **AC3 (F3/F4)** `upload-image.mjs` `buildStub()` returns a single callout
  `🖼 [filename] · Caption: [original caption]` + copied relative path + drag hint (no separate placeholder
  block); caption falls back alt→filename. Phase 2 prints the "no native image-upload field" banner up front
  when ≥1 local image hits the stub rung. `notion-blocks.md` §5 updated to the single-callout shape.
- [ ] **AC4 (F5)** `parse-doc.mjs` detects `<dl>/<dt>/<dd>` and clean alternating label→description div
  subtrees, emits each as a 2-column `Attribute | Description` table; Phase 1 census reports "N detected as
  table candidates → converted"; tables flow through the §3 fidelity contract. Conservative predicate — prose
  divs are never mis-tabled.
- [ ] **AC5 (F6)** `parse-doc.mjs` detects ≥3 sibling top-level sections sharing a leading token
  ("Annexure"/"Appendix", case-insensitive); Phase 1 asks once (Recommended = group under one parent toggle;
  AUTO-PICK group under `--non-interactive`).
- [ ] **AC6 (F7)** Each phase ends with a one-line compaction-surviving banner to chat
  (`Phase N complete — <counts>. Phase N+1 starting.`).
- [ ] **AC7 (no-regression)** A source with no images / no dl-or-label-divs / no annexure clusters converts
  byte-identically (INV-4); all five script selftests green with new assertions (INV-2); `notion-blocks.md`
  stays the one home (INV-3); non-interactive block byte-identical, `allowed-tools: Bash, Read` unchanged
  (INV-5).
- [ ] **AC8 (conformance)** Conforms to `skill-patterns.md §A–§L`; passes `skill-eval.md` (`[D]`+`[J]`); 4
  hygiene lints (`lint-non-interactive-inline`, `lint-flags-vs-hints`, `lint-phase-refs`, `audit-recommended`)
  green. No release-prerequisite tasks in waves (§G — `/complete-dev` owns those).

## Notes

- Build sequence: parser detectors (AC4, AC5) and the stub-owner refactor (AC2/AC3) are the script-heavy core;
  SKILL.md edits (AC1 report, AC2 Phase-2 fill-not-inject, AC3 banner, AC5 Phase-1 ask, AC6 banner) follow and
  cite the updated scripts/reference. See `tasks.yaml` waves.
