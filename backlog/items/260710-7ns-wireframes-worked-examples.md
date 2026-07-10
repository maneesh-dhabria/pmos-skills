---
schema_version: 1
id: 260710-7ns
title: "/wireframes — ship four complete worked examples in our format (desktop dashboard, mobile form, modal overlay, multi-state screen) and make #generate start from the nearest example rather than from blank"
type: feature
kind: story
status: planned
route: skill
priority: should
labels: [pmos-toolkit, wireframes, skill]
created: 2026-07-10
updated: 2026-07-10
parent: 260710-grd
feature_folder: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/
design_doc: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/02_design.html
plan_doc: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/stories/260710-7ns/03_plan.html
tasks_file: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/stories/260710-7ns/tasks.yaml
dependencies: [260710-p5x, 260710-rgb]
---

## Context

We ship **zero** worked examples, and the skill already admits the cost. `reference/html-template.md` carries a
section titled *"Strict format requirements — Subagents drift on these unless the format is shown verbatim,"* and
`#review`'s Rigor & Corner-Cut Protocol calls out high-variance findings like *"one wireframe with 31 aria-labels,
another with 1."* That is the signature of fan-out generation without an exemplar. The reference skill's own
instruction is blunt: *start from the example and modify, rather than building from blank.*

Three of the four examples mirror the reference's. The fourth is ours alone: a **multi-state screen**
(empty / loading / error), which the reference has no concept of and cannot demonstrate. It is the example most
likely to be copied wrong, so it is the one we most need to show.

Coherence contract: `02_design.html` — goal 3, D1; §7 risk 5 (the lint runs on every example).

## Change surface

- `plugins/pmos-toolkit/skills/wireframes/reference/examples.md` (new)
- `plugins/pmos-toolkit/skills/wireframes/SKILL.md` (`#generate`)

## Acceptance Criteria

- [ ] `reference/examples.md` ships **four complete screens**, each a full inline-SVG payload in the emit format
  story 260710-rgb defines — not fragments, not ellipses:
  1. a desktop dashboard on the 1280×800 canvas (sidebar, metrics, table);
  2. a mobile form on the 375×812 canvas (inputs, tap targets ≥44px);
  3. a modal confirmation overlay;
  4. a **multi-state screen** showing `default` / `empty` / `loading` / `error` sections in one file.
- [ ] Each example carries its numbered annotation list and the assumptions its author made, per the output
  convention adopted in 260710-rgb.
- [ ] Every example composes from named primitives in `reference/primitives.md` — no ad-hoc geometry, no primitive
  invented inline. Where an example needs something the library lacks, the primitive is **added to the library**
  (and its stated count updated) rather than one-offed here.
- [ ] `scripts/lint-wireframe-svg.mjs` passes on all four examples. This is a `[D]` gate, and it is the mechanism by
  which a bad exemplar cannot ship (§7 risk 5).
- [ ] `#generate` instructs the generator, in the body: *start from the nearest example and modify it; do not build
  from blank.* The instruction names `reference/examples.md` and states how to pick the nearest one.
- [ ] Any count-claim in prose ("four examples", "N primitives used") matches the actual inventory — the drift class
  the `[J]` coherence gate caught on epic 260709-23a.
- [ ] Conforms to `skill-patterns.md §A–§L` + repo `CLAUDE.md`; `skill-eval.md` and all four hygiene lints stay
  green; the frozen non-interactive block stays byte-identical.
