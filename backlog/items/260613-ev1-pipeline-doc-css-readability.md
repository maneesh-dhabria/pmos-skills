---
schema_version: 1
id: 260613-ev1
kind: epic
title: Pipeline-doc CSS readability refresh — type scale, measure, body H1, calmer tables (html-authoring substrate)
type: enhancement
priority: should
status: defined
route: feature
plugin: pmos-toolkit
feature_folder: docs/pmos/features/2026-06-13_pipeline-doc-css-readability/
requirements_doc:
spec_doc: docs/pmos/features/2026-06-13_pipeline-doc-css-readability/02_spec.html
design_doc:
labels: [html-authoring, substrate, typography, readability, design-crit, cross-plugin]
created: 2026-06-13
updated: 2026-06-13
---

## Context

A `/design-crit` of `02_design.html` — the shared `_shared/html-authoring/` CSS that every `/feature-sdlc`
pipeline doc emits through — measured the rendered page (1440×900, getComputedStyle) and found one
structural readability flaw plus several smaller ones:

- **No typographic hierarchy.** Every text element lives in a 12–15px band; the largest body text (h2)
  is 15px, one pixel above the 14px body. h2 and h3 are the *same* 15px/700 — indistinguishable by size.
  The document title renders at 12px in the chrome toolbar; there is no visible page title.
- **Measure too wide.** 880px column at 14px ≈ 115 characters/line (ideal ~66).
- **Smaller:** tables/code at 12px (dense); `--pmos-faint` (#a8a29e ≈ 2.4:1) used for text fails AA;
  all-caps mono section heads hurt longer titles; zebra + full internal borders read busy.

The identity (warm-stone canvas, hairline borders, orange `[NN]` counters, JetBrains Mono display face)
is good and is preserved — this is a readability refresh of the type scale + layout, not a re-skin.

Canonical file: `plugins/pmos-toolkit/skills/_shared/html-authoring/assets/style.css` (+ `template.html`
for the body-H1 fix). Propagated to pmos-learnkit via `scripts/sync-shared.sh --from=pmos-toolkit`.

Spec: `docs/pmos/features/2026-06-13_pipeline-doc-css-readability/02_spec.html`

## Decisions

- **D1** — section heads: drop all-caps → title case (keep mono face + orange `[NN]` counter).
- **D2** — tables: zebra + bottom-borders only (drop internal vertical hairline rules).
- **D3** — include the body-H1 fix this round (template.html; render.js needs no change — global `{{title}}`).
- **D4** — edit canonical pmos-toolkit copy, then `sync-shared.sh` to pmos-learnkit; one release per plugin.
- **D5** — type-scale edits apply to dark-mode automatically; add one `--pmos-fs-md2: 16px` token.

## Acceptance Criteria

- [ ] Real type scale rendered: h1 28px (body) / h2 17px title-case / h3 16px·600 / body 15px — perceptible step each level
- [ ] Prose measure 60–75ch (`.pmos-artifact-body` 720px, body 15px/lh 1.6); tables + `<pre>` may break to 820px
- [ ] A real body `<h1>` carries the doc title; toolbar title demoted to breadcrumb; exactly one `<h1>` per doc
- [ ] Tables: zebra retained, no internal vertical borders, 13px
- [ ] No text node resolves to `--pmos-faint`; text uses `--pmos-muted` (≥4.5:1)
- [ ] No regressions: build_sections_json, chrome-strip, `[NN]` counter sequence, dark-mode all intact
- [ ] pmos-learnkit copy byte-identical after sync; one representative doc re-rendered + measured + screenshotted (load-bearing)

## Notes

Single build story (`260613-h9r`, route: feature) — the CSS + template edits + sync are one `/execute`
run / one PR. No story-level dependencies. Substrate-only cross-plugin change → "ride which release?"
rule at Loop 3: pmos-toolkit and pmos-learnkit each ship the refreshed CSS on their next bump.
