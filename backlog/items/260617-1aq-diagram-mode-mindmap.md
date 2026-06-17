---
schema_version: 1
id: 260617-1aq
kind: story
parent: 260617-jy8
title: "/diagram --mode mindmap — vendored zero-dep tidy-tree/radial auto-layout → themed SVG"
type: feature
priority: should
route: skill
dependencies: []
plugin: pmos-toolkit
status: planned
feature_folder: docs/pmos/features/2026-06-17_summary-tldr-modes/
plan_doc: docs/pmos/features/2026-06-17_summary-tldr-modes/stories/260617-1aq/03_plan.html
tasks: docs/pmos/features/2026-06-17_summary-tldr-modes/stories/260617-1aq/tasks.yaml
worktree:
claimed_by:
driver_holder:
labels: [pmos-toolkit, diagram, mindmap, layout]
created: 2026-06-17
updated: 2026-06-17
---

<!-- status: planned at define (Loop 1); tasks.yaml authored, route:skill. Build via /skill-sdlc build --story 260617-1aq -->

## Context

Foundational story of epic `260617-jy8`. The define-time spike found `/diagram` has no auto-layout engine and
hard-fails above 30 hand-placed nodes, so it cannot reliably draw a mindmap. Add a new `--mode mindmap` backed by
a **vendored, zero-dependency** tidy-tree / radial layout that computes coordinates, then have `/diagram` author
**themed** SVG from them and run the existing eval (node-cap relaxed for the mode). No npm / npx / network /
browser (design `#decisions` D5). Independently shippable + `skill-eval`'d; `/summary-tldr`'s mindmap mode (story
`260617-xn4`) depends on it. Design seed: `docs/pmos/features/2026-06-17_summary-tldr-modes/02_design.html`
(`#frs-mindmap-engine`, `#decisions` D5/D6, `#spike`).

## Acceptance criteria

1. **New `--mode mindmap` (FR-A1).** `/diagram --mode mindmap` is parsed in Phase 0 alongside `diagram`/`infographic`;
   it accepts a hierarchical input (root + nested nodes) from `--source` and/or the description, and a flat input
   degrades to a single-level radial. `--mode mindmap` works under every theme that supports it (at least the
   default theme); an unsupported theme refuses cleanly with the existing exit-2 contract.
2. **Vendored zero-dep layout (FR-A2, D5).** A new layout module (e.g. `scripts/mindmap-layout.mjs`) computes
   tidy-tree + radial coordinates as **pure functions** with a `--selftest` over committed fixtures. No external
   package, no `npx`, no network. Deterministic — no `Math.random`/`Date` (resume-safe per repo bash/JS rules).
3. **Themed SVG from computed coordinates (FR-A3).** The mindmap drawing path authors SVG using the active theme's
   tokens (palette/typography/strokes; curved connectors for the tree/radial edges per the theme's connector
   rules) at the layout's coordinates, and writes the sidecar with `layoutEngine` + computed `positions`.
4. **Node-cap relaxed, eval intact (FR-A4, D6).** The `>30`-node hard-fail is relaxed for `--mode mindmap` up to a
   documented ceiling (~60); the overlap / edge-tunnel / legibility / angular-resolution checks still run and
   still gate (no gate weakened for non-mindmap modes).
5. **Non-interactive contract preserved (FR-A5).** Optional `--approach` (e.g. `radial` vs `tree`),
   `--on-failure drop|ship-with-warning|exit-nonzero` honored, returns an SVG a caller can inject; the exit-code
   contract (0/2/3/4/64) is unchanged for existing modes.
6. **Tests + regression (FR-A6).** Fixture-based layout selftest + an eval/apply test pass; the shipped
   `/diagram` `tests/` stay green (existing `diagram`/`infographic` behavior unchanged). A live render of a sample
   ~15-node mindmap is captured as dogfood evidence (renders a clean tree/radial, no overlaps/tunnels).
7. **Skill-eval + conventions.** Conforms to `skill-patterns.md §A–§L` + host `CLAUDE.md` (canonical path,
   non-interactive inline block byte-identical, every `AskUserQuestion` has a Recommended option or defer-only
   tag). Passes the `[D]` half of `skill-eval.md`. Version bump / changelog / README row / manifest sync are
   **release prerequisites for /complete-dev**, not `/execute` tasks.
