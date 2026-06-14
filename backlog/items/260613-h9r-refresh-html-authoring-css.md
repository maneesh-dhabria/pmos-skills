---
schema_version: 1
id: 260613-h9r
kind: story
parent: 260613-ev1
title: Refresh html-authoring CSS — type scale, 720px measure, body H1, calmer tables + contrast; sync to pmos-learnkit
type: enhancement
priority: should
status: superseded
superseded_by: 260614-tcx
route: feature
dependencies: []
plugin: pmos-toolkit
feature_folder: docs/pmos/features/2026-06-13_pipeline-doc-css-readability/
plan_doc:
tasks: docs/pmos/features/2026-06-13_pipeline-doc-css-readability/stories/260613-h9r/tasks.yaml
labels: [html-authoring, substrate, typography, readability, cross-plugin]
created: 2026-06-13
updated: 2026-06-14
---

> **Superseded by story [260614-tcx](260614-tcx-refresh-html-authoring-editorial-technical.md)** (epic 260614-m68, 2026-06-14). All of this story's ACs are folded into tcx's AC1–AC12. Build `260614-tcx`, not this.

<!-- status: superseded by 260614-tcx (epic 260614-m68 supersedes 260613-ev1). Do not build. -->

## Context

The single (only) build story for epic `260613-ev1`. The whole change is to the canonical
html-authoring substrate — `assets/style.css` (type scale, measure, tables, contrast) plus
`template.html` (body-H1 emit) — then a `sync-shared.sh` propagation to pmos-learnkit. It is one
vertical slice = one `/execute` run = one PR; no separable sub-units and no cross-story dependencies,
so it stays a single story (D24 litmus holds — no task here depends on another story).

Built against the spec `docs/pmos/features/2026-06-13_pipeline-doc-css-readability/02_spec.html`
(FR-1…FR-6) and grounded in the design-crit measurements captured there.

## Acceptance Criteria

- [ ] **AC1 — Type scale (FR-1):** rendered h1=28px body, h2=17px title-case (`text-transform:none`), h3=16px/600, body=15px; perceptible step at each level; `--pmos-fs-md2: 16px` token added; h2 `[NN]` counter + section `border-top` retained.
- [ ] **AC2 — Measure (FR-2):** `.pmos-artifact-body` max-width 720px; `html,body` 15px / line-height 1.6; `.pmos-artifact-body table, pre` may break to 820px and center; measured prose line length 60–75ch.
- [ ] **AC3 — Body H1 (FR-3):** `template.html` demotes the toolbar title from `<h1>` to a non-heading breadcrumb and adds `<h1 class="pmos-doc-title">{{title}}</h1>` as the first child of `.pmos-artifact-body`; `.pmos-doc-title { margin-bottom: var(--pmos-sp-5) }`; render.js unchanged; exactly one `<h1>` per emitted doc.
- [ ] **AC4 — Tables (FR-4):** `table` 13px; `th,td` bottom-border only (no vertical rules); `thead th` keeps a heavier bottom border; zebra striping retained.
- [ ] **AC5 — Contrast (FR-5):** audit every `color: var(--pmos-faint)` — text contexts switch to `--pmos-muted`; decoration (borders, anchor icon) may keep faint.
- [ ] **AC6 — No regressions (FR-3 constraint, AC6 epic):** `build_sections_json.js` derives correct sections.json for a doc with a body h1 (h1 excluded); `chrome-strip.js` unaffected; `h2::before` counter sequence unchanged; dark-mode (`prefers-color-scheme`) renders correctly.
- [ ] **AC7 — Sync (FR-6):** run `scripts/sync-shared.sh --from=pmos-toolkit`; pmos-learnkit's `_shared/html-authoring/assets/style.css` + `template.html` byte-identical to canonical (`diff` clean).
- [ ] **AC8 — Live verification (load-bearing dogfood):** re-render ≥1 representative pipeline doc through the substrate, serve over http, screenshot at 1440×900, and assert by `getComputedStyle` that h1=28 / h2=17 (none uppercase) / h3=16 / body=15 / column≈720px and prose measure 60–75ch; before/after screenshots attached. Independent blind-judge confirms hierarchy is now skimmable + tables calmer; gaps → fix → re-run (cap 2, then accept-residuals-and-surface).

## Tasks

See `tasks.yaml`. No release-prerequisite tasks in any wave — version bump / changelog / manifest sync
are `/complete-dev`'s job at Loop 3 (substrate change → "ride which release?" for both plugins).
