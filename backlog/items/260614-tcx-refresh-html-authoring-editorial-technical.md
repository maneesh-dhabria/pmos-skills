---
schema_version: 1
id: 260614-tcx
kind: story
parent: 260614-m68
title: Refresh html-authoring substrate to "Editorial Technical" — serif body + sans headings + mono structure, centered doc, breakout tables, body H1, AA contrast, inline comments, dark mode; sync to pmos-learnkit
type: enhancement
priority: should
route: feature
dependencies: []
plugin: pmos-toolkit
status: in-progress
feature_folder: docs/pmos/features/2026-06-14_html-authoring-typography-refresh/
plan_doc:
tasks: docs/pmos/features/2026-06-14_html-authoring-typography-refresh/stories/260614-tcx/tasks.yaml
worktree: feat/260614-tcx
labels: [html-authoring, substrate, typography, readability, cross-plugin, aesthetic]
claimed_by: build:explainer-a3g-loop
driver_holder: build:explainer-a3g-loop
created: 2026-06-14
updated: 2026-06-14
---

<!-- status: planned at define (Loop 1); tasks.yaml authored, route:feature (no plan_doc HTML — lean). Build via /feature-sdlc build --story 260614-tcx -->

## Context

The single build story for epic `260614-m68`. The whole change is to the canonical html-authoring substrate —
`assets/style.css` (type system, palette, layout, tables), `template.html` (body-H1 + breadcrumb), and
`assets/comments.css`/`comments.js` (inline comment treatment) — then a `sync-shared.sh` propagation to
pmos-learnkit. One vertical slice = one `/execute` run = one PR; no separable sub-units, no cross-story
dependencies (D24 litmus holds). Supersedes story `260613-h9r`.

Built against the design doc `docs/pmos/features/2026-06-14_html-authoring-typography-refresh/02_design.html`
(FR-1…FR-11) and the approved specimen `mockups/v2-design-doc.html`.

## Acceptance Criteria

- [ ] **AC1 — Tokens & faces (FR-1):** add `--pmos-font-serif` (system serif), `--pmos-font-sans` (system grotesque); keep `--pmos-font-display` (mono); add new type-scale + warm-palette tokens; token names already consumed elsewhere preserved.
- [ ] **AC2 — Type scale (FR-2):** rendered body serif 17px/lh1.66, h1 34px sans, h2 21px sans (`text-transform:none`, top rule, mono `[NN]` above), h3 17px/600 sans; perceptible step each level.
- [ ] **AC3 — Measure & layout (FR-3):** `.pmos-artifact-body` centered ~730px (60–75ch); full-bleed toolbar/footer with centered inner content; `table, pre` break out to ~880px to the RIGHT only (left edge aligned with prose).
- [ ] **AC4 — Body H1 (FR-4):** `template.html` demotes toolbar title to a non-heading breadcrumb and emits `<h1 class="pmos-doc-title">{{title}}</h1>` as first child of the body; `render.js` unchanged; exactly one `<h1>` per doc.
- [ ] **AC5 — Lead & eyebrow (FR-5):** mono uppercase eyebrow; labelled lead (mono chip + serif lead); no italic-left-rule mission block.
- [ ] **AC6 — Tables (FR-6):** 15px; zebra retained; `th,td` bottom-border only (no vertical rules); `thead th` mono uppercase + heavier bottom border.
- [ ] **AC7 — Contrast (FR-7):** audit every `color: var(--pmos-faint)`; text contexts → `--pmos-muted`; decoration may keep faint; all body text ≥4.5:1 (AA).
- [ ] **AC8 — Inline comments (FR-8):** `comments.css` (+ `comments.js` if needed) renders commented text with a warm tint a shade darker than canvas + thin accent underline, and the thread inline on the same paper; no white panel/overlay toolbar; long threads collapse to one line, expand on click; opening a thread never reflows the body.
- [ ] **AC9 — Dark mode (FR-9):** `prefers-color-scheme: dark` palette for every new token; renders correctly.
- [ ] **AC10 — Sync (FR-10):** run `scripts/sync-shared.sh --from=pmos-toolkit`; pmos-learnkit's `_shared/html-authoring/` copies byte-identical (`diff` clean).
- [ ] **AC11 — No regressions (FR-11):** `build_sections_json.js` derives correct sections for a doc with a body h1 (h1 excluded); `chrome-strip.js` unaffected; `h2::before` counter sequence unchanged.
- [ ] **AC12 — Live verification (load-bearing dogfood):** re-render ≥1 representative pipeline doc AND ≥1 comment-bearing doc through the substrate, serve over http, screenshot at 1440×900, assert by `getComputedStyle` body=17 / h1=34 / h2=21 (none uppercase) / h3=17 / column≈730 / prose 60–75ch / tables left-aligned & wider; before/after screenshots attached. Independent blind-judge confirms hierarchy skimmable + tables calmer + comment treatment clean; gaps → fix → re-run (cap 2, then accept-residuals-and-surface).

## Tasks

See `tasks.yaml`. No release-prerequisite tasks in any wave — version bump / changelog / manifest sync are
`/complete-dev`'s job at Loop 3 (substrate change → "ride which release?" for both plugins).
