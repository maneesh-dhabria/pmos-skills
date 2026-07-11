---
schema_version: 1
id: 260710-rgb
title: "/wireframes — rewrite html-template.md for the inline-SVG payload, add the pmos-wireframe-meta screen manifest as the machine-readable home for fields/components/states/annotations, and adopt the numbered annotation-list output convention"
type: feature
kind: story
status: in-progress
route: skill
priority: should
labels: [pmos-toolkit, wireframes, skill]
created: 2026-07-10
updated: 2026-07-11
claimed_by: build:0d5e385f-c675-46f6-a126-345344fa277d
driver_holder: build:0d5e385f-c675-46f6-a126-345344fa277d
worktree: .claude/worktrees/feat-260710-rgb
parent: 260710-grd
feature_folder: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/
design_doc: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/02_design.html
plan_doc: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/stories/260710-rgb/03_plan.html
tasks_file: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/stories/260710-rgb/tasks.yaml
dependencies: [260710-p5x, 260710-xrh]
---

## Context

The emit contract. Each per-screen `.html` keeps its shell — `<meta name="pmos:skill" content="wireframes">`, the
comments substrate, `wf-chrome` state tabs, the footer — and the body of each `<section class="wf-state">` becomes
an inline monochrome `<svg>` at the device's canvas token (D1).

This story also lands the artifact that makes the refactor *safe*. Today `/prototype` builds its mock-data entity
model by grepping wireframe HTML for `<th>`, `<label>`, `<dt>` and `data-field` (`prototype/SKILL.md:183,219`;
`reference/mock-data-prompt.md:8–10`). Those tags do not exist in SVG — a form field becomes a `<text>` node. Left
alone, that grep returns **an empty entity model rather than an error**: the dangerous failure class. A per-screen
`<script type="application/json" id="pmos-wireframe-meta">` manifest replaces the fragile tag-grep with a declared
contract, and it is simply the structured form of the numbered annotation list the reference already mandates. One
artifact retires the grep *and* gives us the text-reviewable output we lack.

Story 260710-n67 is the reader side; this is the writer side. Do not defer n67.

Coherence contract: `02_design.html` — D1; §7 risks 1 and 2; amendments A6 (the shim that consumes these anchors).

## Change surface

- `plugins/pmos-toolkit/skills/wireframes/reference/html-template.md`
- `plugins/pmos-toolkit/skills/wireframes/SKILL.md` (`#generate`, `#index-serve` emit contract, output convention)

## Acceptance Criteria

- [ ] `reference/html-template.md` is rewritten for the SVG payload. The skeleton shows, **verbatim** (the file's
  own standing rationale: *"Subagents drift on these unless the format is shown verbatim"*): the `<svg>` root with
  its `viewBox`, root `stroke`/`fill`, one `<g data-region="…">` per region carrying `<title>`/`<desc>`, and the
  `<g data-region="annotations">` group that is the **only** place `#d33` may appear.
- [ ] Every `<g>` and top-level `<rect>`/`<path>` carries `data-anchor` — emitted directly or via `retrofitSvg()`
  (`_shared/html-authoring/assets/svg-anchor.js:120`), which already handles an `<svg>` nested inside a larger HTML
  document and retrofits **every** `<svg>` block in the string, so all state sections are covered.
- [ ] A new inline `<script type="application/json" id="pmos-wireframe-meta">` is emitted per screen, carrying
  `{fields, components, states, annotations}`. `fields` is the declared replacement for the `<th>`/`<label>`/`<dt>`
  grep; `annotations` is the numbered list, keyed to the `<!-- N: … -->` comments above each primitive.
- [ ] The manifest is emitted for **every** state section, and `states` enumerates them, so a multi-state screen is
  fully described.
- [ ] The numbered annotation-list output convention is adopted from the reference: each screen's annotations are
  rendered in the footer **and** restated in the skill's chat reply, alongside the assumptions the generator made.
- [ ] One `.html` per `(component × device)` as before. `index.html`, `canvas.html`, `canvas.json`,
  `build-canvas.js`'s screen discovery (filename + `<title>` fallback) and `extract-screens.js` (which keys on
  `data-screen`, not `.wf-state`) all keep working — verified, not assumed.
- [ ] No `--emit-svg` flag; no standalone `.svg` deliverable (D1).
- [ ] `scripts/lint-wireframe-svg.mjs` (260710-p5x) passes on every screen the rewritten template produces.
- [ ] Conforms to `skill-patterns.md §A–§L` + repo `CLAUDE.md`; `skill-eval.md` and all four hygiene lints stay
  green; `check-comments-coverage.sh` passes; the frozen non-interactive block stays byte-identical.
