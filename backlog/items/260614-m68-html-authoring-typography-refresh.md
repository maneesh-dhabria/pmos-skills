---
schema_version: 1
id: 260614-m68
kind: epic
title: html-authoring typography & layout refresh ("Editorial Technical") — serif body + sans headings + mono structural layer, centered doc, inline comments (supersedes 260613-ev1)
type: enhancement
priority: should
route: feature
plugin: pmos-toolkit
status: released
feature_folder: docs/pmos/features/2026-06-14_html-authoring-typography-refresh/
requirements_doc:
spec_doc:
design_doc: docs/pmos/features/2026-06-14_html-authoring-typography-refresh/02_design.html
supersedes: [260613-ev1]
labels: [html-authoring, substrate, typography, readability, design-crit, cross-plugin, aesthetic]
created: 2026-06-14
updated: 2026-06-15
released: 2.80.0 (+pmos-learnkit/v0.24.0)
---

## Context

Every pmos pipeline doc emits through one shared stylesheet —
`plugins/pmos-toolkit/skills/_shared/html-authoring/assets/style.css` (+ `template.html`). The user asked for
"good typography, visual layout and good reading experience" across all pmos-toolkit docs, supplying a warm-canvas
serif teaching page as a reference aesthetic to *evolve toward, not copy*.

The current substrate has no real hierarchy (everything 12–15px; h2 one pixel above body; title at 12px in chrome),
an 880px measure (~115ch), and dense 12px tables. This epic replaces it with an **"Editorial Technical"** system:

- **Three type voices:** system serif body (17px / lh 1.66) + system sans headings (34/21/17, sentence case) +
  JetBrains Mono structural layer (section numbers, eyebrow, labels, table heads, wordmark, code). Zero new bundle
  weight — only the already-bundled mono is non-system.
- **Centered doc, full-bleed chrome;** section number `[NN]` retained, above the title.
- **Tables/code break out to the right only** (left edge aligned with prose).
- **Inline comments** — warm-tinted annotated text + inline thread on the same paper; no white overlay panel;
  long threads collapse/expand; opening a thread never reflows the body.

Identity preserved: mono wordmark + accent caret, burnt-orange accent (prose accent `#b8431a`, hue family kept for
diagram coherence), `[NN]` counters. Distinct from the all-serif reference via the sans heading voice + mono structure.

Design + decisions + FRs + mockups: `docs/pmos/features/2026-06-14_html-authoring-typography-refresh/02_design.html`
(approved specimen: `mockups/v2-design-doc.html`).

## Decisions

- **D1** — serif reading body, 17px / lh 1.66.
- **D2** — sans headings, sentence case (h1 34 / h2 21 / h3 17); distinct from the reference's all-serif heads.
- **D3** — mono `[NN]` section number retained, above the title (not hung in the margin).
- **D4** — labelled lead (mono "Bottom line" chip + serif lead), replacing italic-left-rule "mission".
- **D5** — centered doc + full-bleed chrome; no reserved side column.
- **D6** — tables/code break out to the RIGHT only; left edge stays aligned with prose.
- **D7** — inline comments: warm-tint annotation + accent underline + inline thread on same paper; no white panel; long threads collapse/expand; never reflow the body.
- **D8** — real body `<h1>` via `template.html` (toolbar title → breadcrumb; exactly one h1; render.js unchanged). *(folds ev1 D3)*
- **D9** — AA contrast: no body text uses `--pmos-faint`; text uses `--pmos-muted` (≥4.5:1); faint = decoration only. *(folds ev1)*
- **D10** — calmer tables: zebra + bottom borders only, no vertical rules. *(folds ev1 D2)*
- **D11** — dark-mode parity for every new token. *(folds ev1)*
- **D12** — edit canonical pmos-toolkit copy, then `sync-shared.sh --from=pmos-toolkit` to pmos-learnkit; one release per plugin. *(folds ev1 D4)*

## Acceptance Criteria

- [ ] Rendered scale (getComputedStyle): body 17px serif / h1 34 sans / h2 21 sans (none uppercase) / h3 17 — perceptible step each level
- [ ] Article column ≈730px (60–75ch); tables/`pre` reach ~880px, left-aligned with prose
- [ ] Exactly one body `<h1>`; toolbar title demoted to breadcrumb; `render.js` diff empty
- [ ] No text node resolves to `--pmos-faint`; all body text ≥4.5:1 (AA)
- [ ] Tables: zebra + bottom borders only, no vertical rules, mono uppercase header
- [ ] Comments inline (warm-tint annotation + inline thread, no white panel); long threads collapse/expand; thread open never reflows the body
- [ ] Dark mode renders correctly for all new tokens
- [ ] No regressions: build_sections_json (h1 excluded), chrome-strip, `[NN]` counter sequence
- [ ] pmos-learnkit copy byte-identical after sync (`diff` clean)
- [ ] Load-bearing live dogfood: re-render a representative doc + a comment-bearing doc, serve over http, screenshot 1440×900, assert metrics by getComputedStyle, blind-judge confirms skimmable hierarchy + calmer tables + clean comment treatment; gaps → fix → re-run (cap 2)

## Notes

Single build story (`260614-tcx`, route: feature) — style.css + template.html + comments.css edits + sync are one
`/execute` run / one PR; no separable sub-units, no cross-story dependencies (D24 litmus holds). Substrate-only
cross-plugin change → "ride which release?" at Loop 3: pmos-toolkit and pmos-learnkit each ship on their next bump.

**Supersedes `260613-ev1`** (epic) and `260613-h9r` (story) — both marked `superseded`. Every ev1 requirement is
folded into D8–D12 / the FRs above; ev1's `--pmos-fs-md2` token is absorbed into the new full type scale.
