---
schema_version: 1
id: 260614-d3g
kind: story
parent: 260614-q4r
title: /diagram — contrast-checker class="legend" diagnostic note + editorial-theme palette hard-constraint preamble
type: enhancement
priority: should
status: planned
route: skill
dependencies: []
feature_folder: docs/pmos/features/2026-06-14_summary-tldr-diagram-enhancements/
plan_doc: docs/pmos/features/2026-06-14_summary-tldr-diagram-enhancements/stories/260614-d3g/03_plan.html
tasks: docs/pmos/features/2026-06-14_summary-tldr-diagram-enhancements/stories/260614-d3g/tasks.yaml
plugin: pmos-toolkit
labels: [diagram, eval, diagnostics, editorial-theme]
created: 2026-06-14
updated: 2026-06-14
---

<!-- status: planned at define (Loop 1); plan_doc + tasks.yaml authored. Build via /feature-sdlc build --story 260614-d3g -->

## Context

Two `/diagram` findings from the `/reflect` retro of a nested diagram run (it produced a spec-compliant SVG but the eval diagnostics cost an unneeded multi-turn debug cycle). Built against the design contract `docs/pmos/features/2026-06-14_summary-tldr-diagram-enhancements/02_design.html` (§diagram) and the standing skill-authoring criteria.

**[friction] Opaque contrast hard-fail.** The contrast checker (the eval's SVG-metrics half — `/diagram`'s `scripts/run.py` or its imported checker module) computes a fill's contrast against its background. When the nearest ancestor that would be the background source is excluded because it carries `class="legend"`, the checker falls back to a non-immediate-parent background and emits a hard-fail like `contrast: text 'DEFINED' fill=#F4EFE6 on #DCE0F0 ratio=1.15:1` — with no hint that a chip rect's `class="legend"` is what suppressed the expected background. The agent read the checker source ~6 times to diagnose this. Fix: when the checker uses a fallen-back (non-immediate-parent) background *because* the nearest ancestor was excluded by `class="legend"`, append a diagnostic suffix to the hard-fail string, e.g. `(nearest ancestor excluded by class=legend — remove class=legend from the chip rect if it is the actual background source)`.

**[nit] First-draft non-palette colors despite the editorial theme.** The first draft used `#059669` (green) and `#D97706` (amber), off the editorial palette, because the palette constraint registers too late during creative color selection. Fix: add a one-line `PALETTE HARD CONSTRAINT — only these hex values are permitted` block to the editorial `themes/editorial/style.md` preamble, immediately above the color table, so it registers before color selection begins.

`dependencies: []` — touches only `/diagram` files (the contrast checker source + `themes/editorial/style.md`); independent of the other stories.

## Acceptance Criteria

- [ ] **AC1 — Contrast diagnostic note.** Locate the contrast checker in `plugins/pmos-toolkit/skills/diagram/` (the code that emits the `contrast: …` hard-fail strings and that excludes `class="legend"` elements from background detection). When a contrast hard-fail is produced for an element whose background was resolved by *falling back past* a nearest ancestor that was excluded due to `class="legend"`, append the diagnostic suffix `(nearest ancestor excluded by class=legend — remove class=legend from the chip rect if it is the actual background source)` to that specific hard-fail message. Non-legend-related contrast fails are unchanged.
- [ ] **AC2 — Diagnostic is accurate + scoped.** The suffix is appended ONLY in the legend-fallback case (not on every contrast fail); the existing `class="legend"` exclusion behavior itself is unchanged (this is a message enrichment, not a logic change). The fill/background/ratio facts already in the message are preserved.
- [ ] **AC3 — Editorial palette hard-constraint preamble.** `plugins/pmos-toolkit/skills/diagram/themes/editorial/style.md` gains a one-line `PALETTE HARD CONSTRAINT — only these hex values are permitted` block positioned immediately above the existing color table, listing/referencing the permitted hex set so it is read before color selection. Wording is consistent with the theme's existing voice; no palette values change.
- [ ] **AC4 — Tests + compliance.** A unit/selftest asserts the legend-fallback diagnostic suffix appears for a synthetic legend-excluded contrast fail and does NOT appear for a normal contrast fail (extend the diagram tests, e.g. alongside `tests/test_editorial_theme.py` or the checker's own tests). Existing diagram tests (golden/editorial, defects) stay green. `skill-eval-check.sh` ≥ floor; hygiene lints green where applicable. No release-prereq work (that's `/complete-dev` at Loop 3).
- [ ] **AC5 — Dogfood (load-bearing).** Generate a diagram with the editorial theme using chip rects that previously triggered the opaque failure: confirm (a) a first draft no longer reaches for off-palette greens/ambers, and (b) if a legend-fallback contrast fail does occur, the hard-fail string now carries the diagnostic suffix that points straight at the `class="legend"` chip. Gaps → fix → re-run (cap 2, then accept-residuals-and-surface).
