---
schema_version: 1
id: 0017
kind: story
title: /frameworks browse-UI fixes — selection highlight + no auto-scroll, list-default, view icons, multi-select filters + applied bar, area rename
type: enhancement
priority: should
status: in-progress
parent: 0016
claimed_by: feature-sdlc-build-loop
route: skill
plugin: pmos-learnkit
feature_folder: docs/pmos/features/2026-06-12_frameworks-browse-ux/
spec_doc: docs/pmos/features/2026-06-12_frameworks-browse-ux/02_design.html
plan: docs/pmos/features/2026-06-12_frameworks-browse-ux/stories/0017-frameworks-browse-ux/03_plan.html
tasks: docs/pmos/features/2026-06-12_frameworks-browse-ux/stories/0017-frameworks-browse-ux/tasks.yaml
dependencies: []
labels: [frameworks, browse-ui, filters, pmos-learnkit]
created: 2026-06-12
updated: 2026-06-12
---

## Context

The single implementation story for epic 0016. Edits `plugins/pmos-learnkit/skills/frameworks/
scripts/build-library.mjs` (the generator emitting `index.html`), its `--selftest`, the structure
+ build tests, SKILL.md prose, and re-derives `index.html`. Design contract + filter research:
`../../02_design.html`.

## Acceptance Criteria

- [ ] AC1 — Selection highlights the active item in compact/detailed/list; opening the reader does not scroll the page away from the clicked item (D1)
- [ ] AC2 — List view is the default on load (D2)
- [ ] AC3 — Each view-toggle button has a representative inline-SVG icon; accessible names preserved; offline-safe (D3)
- [ ] AC4 — Decision type + tags are dropdown multi-selects (tags: type-to-filter search); inline tag cloud + More-filters disclosure removed (D4)
- [ ] AC5 — Applied-filters bar above results: removable ✕ chips labeled with facet (Area/Decision/Tag) + Clear all; chips ↔ checkboxes synced (D4b)
- [ ] AC6 — OR-within / AND-across; dropdowns stay open across selections; Escape closes + restores focus; count in aria-live region (D4a/D4c)
- [ ] AC7 — Four product areas display renamed; presentation-only (corpus / --json / match.mjs unchanged) (D5)
- [ ] AC8 (should) — Per-option counts in filter dropdowns (D4d)
- [ ] AC9 — build-library.mjs --selftest + tests/structure.test.sh + tests/build-library.test.sh green (assertions updated to new contract); SKILL.md doc-synced; index.html re-derived

## Notes

Single `/execute` run, one file's emit + tests + docs. No cross-story deps (D24 litmus holds).
