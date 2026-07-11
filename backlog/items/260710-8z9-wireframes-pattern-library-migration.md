---
schema_version: 1
id: 260710-8z9
title: "/wireframes — recompose all 41 pattern skeletons from named SVG primitives and re-point every heuristic cite at the new rubric, in one cutover with zero dangling ids"
type: feature
kind: story
status: done
route: skill
priority: should
labels: [pmos-toolkit, wireframes, skill]
created: 2026-07-10
updated: 2026-07-11
parent: 260710-grd
feature_folder: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/
design_doc: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/02_design.html
plan_doc: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/stories/260710-8z9/03_plan.html
tasks_file: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/stories/260710-8z9/tasks.yaml
dependencies: [260710-p5x, 260710-dsc]
---

## Context

The bulk of the epic. All 41 pattern files (navigation 7, forms 8, data-display 6, feedback 8, actions 4, layout 4,
content 4) carry a `## Skeleton` block that is **CSS class names, not geometry** — `mock-*` HTML that no longer
describes what the skill emits. Every one is recomposed from the named primitives in `reference/primitives.md`.

One coherent cutover, no dual-dialect tolerance to build and later remove (D4). Their judgment layer — the
`## Best practices` and `## Common mistakes` prose, and the when/why the reference's `components.md` entirely
lacks — is **preserved**. That layer is our advantage over the reference and is explicitly not in scope for
deletion.

**Why this story depends on 260710-dsc, not merely on the substrate:** the 41 files cite rubric ids. Retiring
`A1`–`A5` and `D1`–`D4` (design D3) would leave dangling cites, so the re-citation folds into this same edit pass
rather than becoming a follow-up sweep. Live cite counts: `A2`×34, `A1`×25, `A3`×24, `D1`×20, `A4`×20, `A5`×8,
`D3`×4, `D2`×3, `D4`×0. Note `A2` — the most-cited id in the library — is in the retired set (amendment A1); the
seed's acceptance grep omitted it.

Coherence contract: `02_design.html` — D3, D4; amendment A1; §7 risk 5.

## Change surface

- `plugins/pmos-toolkit/skills/wireframes/patterns/**/*.md` (41 files)
- `plugins/pmos-toolkit/skills/wireframes/patterns/README.md` (the index + its cross-reference claim)

## Acceptance Criteria

- [x] Every one of the 41 `## Skeleton` blocks is recomposed as a composition of named primitives from
  `reference/primitives.md`, on the 8px grid, in the closed palette. No `mock-*` class name survives in a skeleton.
- [x] Every skeleton that a screen could emit passes `scripts/lint-wireframe-svg.mjs`.
- [x] Every heuristic cite is re-pointed at the surviving id set defined by 260710-dsc (`N1`–`N10`, `F1`–`F2`,
  `G1`–`G4`, `S1`–`S4`, `C1`–`C3`). Where a retired id carried real guidance (e.g. an `A5` tap-target note), the
  guidance is either restated as prose without an id, or dropped as now-enforced-by-lint — never left pointing at a
  dead id.
- [x] **Dangling-cite gate (`[D]`, corrected per amendment A1):**
  `grep -Eo '\b(A1|A2|A3|A4|A5|D1|D2|D3|D4)\b'` across all 41 pattern files **and** `patterns/README.md` yields
  **zero matches**. The check asserts zero matches explicitly rather than relying on a zero exit code — the seed's
  BRE pattern `grep 'A1|A3|…'` matched a literal pipe string and returned 0 hits on every file, making the gate
  unfailable.
- [x] `patterns/README.md`'s stated file count and per-category counts match the actual inventory, and its claim
  that best-practices are "cross-referenced to `eval-rubric.md` heuristic IDs" is still true of the new id set.
- [x] The `## Best practices` / `## Common mistakes` judgment layer is preserved in every file. This story rewrites
  skeletons and cites; it does not thin the guidance.
- [x] Work proceeds in reviewable batches (roughly by category, ~7 batches); each batch is checked against
  `reference/primitives.md` before the next begins. A bad batch poisons generation everywhere (§7 risk 5).
- [x] Conforms to `skill-patterns.md §A–§L` + repo `CLAUDE.md`; `skill-eval.md` and all four hygiene lints stay
  green; the frozen non-interactive block stays byte-identical.
