---
schema_version: 1
id: 260710-p5x
title: "/wireframes — normative grid/palette/type substrate (single home) + ~24 monochrome SVG primitives + blank canvas assets + the deterministic lint that parses its allowlist out of that home"
type: feature
kind: story
status: done
released: v2.105.0
route: skill
priority: should
labels: [pmos-toolkit, wireframes, skill]
created: 2026-07-10
updated: 2026-07-11
parent: 260710-grd
feature_folder: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/
design_doc: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/02_design.html
plan_doc: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/stories/260710-p5x/03_plan.html
tasks_file: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/stories/260710-p5x/tasks.yaml
dependencies: []
---

## Context

Root story of epic 260710-grd. Nothing in this epic can be composed, linted, or cited until the house style has a
single canonical home.

The substrate and its enforcing lint are **fused into one story** per design amendment A3: §K forbids the palette
living in three places (`grid-system.md`, an inline SKILL.md table, and a hardcoded array in the lint) with nothing
binding the copies. The lint therefore *parses* its allowlist out of `grid-system.md` — and a lint that parses a
file cannot be `skill-eval`'d apart from the file it parses. Same reasoning that fused the scorecard anchor with
its validator in epic 260709-xhr.

Per amendment A2 (§H), the deterministic checks that the seed had put in the judgment rubric live **here**, in the
script: 8px snap, the palette allowlist, `#d33` quarantine, `stroke="none"` on text, `viewBox` match, the 44px
tap-target geometry check, and `<title>`/`<desc>` presence. The model never does this arithmetic.

Coherence contract: `02_design.html` — D1, D3, D4; amendments A1, A2, A3, A10.

## Change surface

- `plugins/pmos-toolkit/skills/wireframes/reference/grid-system.md` (new — the single home)
- `plugins/pmos-toolkit/skills/wireframes/reference/primitives.md` (new)
- `plugins/pmos-toolkit/skills/wireframes/assets/canvas-desktop.svg` (new)
- `plugins/pmos-toolkit/skills/wireframes/assets/canvas-wide.svg` (new)
- `plugins/pmos-toolkit/skills/wireframes/assets/canvas-tablet.svg` (new)
- `plugins/pmos-toolkit/skills/wireframes/assets/canvas-mobile.svg` (new)
- `plugins/pmos-toolkit/skills/wireframes/scripts/lint-wireframe-svg.mjs` (new)
- `plugins/pmos-toolkit/skills/wireframes/tests/` (lint fixtures — good + broken per check)

## Acceptance Criteria

- [ ] `reference/grid-system.md` is the **single canonical home** (§K) for: the closed 6-token palette (`#000` ink,
  `#fff` paper, `#666` mute, `#e6e6e6` placeholder, `#f4f4f4` zebra, `#d33` annotation); the 8px base unit and snap
  rule; outer margins (24 desktop/tablet, 16 mobile) and gutters; the desktop 12-column math; the four canvas
  presets (desktop 1280×800, wide 1440×900, tablet 768×1024, mobile 375×812); the type scale (12/14/20/28 at
  weights 400/400/600/700, single system font stack); the standard component-size table; the coordinate
  conventions; and the negative-space rule. It opens with the normative sentence that these are the only values
  permitted.
- [ ] `reference/primitives.md` ships **~24 copy-paste monochrome SVG primitives** grouped Inputs / Layout /
  Navigation / Content / Media / Overlay / Annotation. Every primitive is wrapped in
  `<g transform="translate(0,0)">` so its internal coordinates start at origin and it is copy-pastable across
  screens. It closes with a "Common composition mistakes" section covering at minimum: the `<text>` stroke halo,
  off-grid coordinates, stray fills, multiple typefaces, annotation-colour bleed, and a missing `viewBox`.
  **The primitive count stated in prose matches the actual inventory** (the count-claim drift class the `[J]` gate
  caught on epic 260709-23a).
- [ ] The four `assets/canvas-*.svg` blanks carry 8px grid guides
  (`<g data-region="grid" stroke="#e6e6e6" stroke-width="0.5">`) and dashed margin rulers, at the canvas dimensions
  named in `grid-system.md`.
- [ ] `scripts/lint-wireframe-svg.mjs` **reads its hex allowlist from `grid-system.md`** (or a JSON emitted beside
  it) rather than hardcoding the six values. Editing the palette in its home cannot leave the enforcer disagreeing
  (§K, A3).
- [ ] The lint hard-gates, per `[D]` / §H — the model performs none of this arithmetic (A2):
  - every `x` / `y` / `width` / `height` on every element is a multiple of 8;
  - every colour literal is in the allowlist;
  - `#d33` appears **only** within a `[data-region="annotations"]` subtree;
  - every `<text>` carries `stroke="none"`;
  - `viewBox` is present and matches the declared `width`/`height`;
  - on a mobile canvas, every interactive primitive's tap target is ≥44px in its smaller dimension;
  - every `data-region` group carries a `<title>` and a `<desc>`.
- [ ] The lint additionally asserts that `design-overlay.css` **generates without error** when a DESIGN.md is
  present, so a generation regression still fails fast now that wireframe screens no longer render it (A10).
- [ ] `--selftest` covers each gate with a passing and a failing fixture. Its assertion count is reported and the
  suite is green.
- [ ] The lint exits non-zero on any violation and prints the offending file, element, and value. No silent caps —
  if it declines to check something, it logs why.
- [ ] Conforms to `skill-patterns.md §A–§L` + repo `CLAUDE.md`; `skill-eval.md` and all four hygiene lints stay
  green; the frozen non-interactive block stays byte-identical.
