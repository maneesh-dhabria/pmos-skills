---
schema_version: 1
id: 260614-d3g
kind: story
parent: 260614-q4r
title: /diagram — contrast-checker class="legend" diagnostic note + editorial-theme palette hard-constraint preamble
type: enhancement
priority: should
status: done
route: skill
dependencies: []
feature_folder: docs/pmos/features/2026-06-14_summary-tldr-diagram-enhancements/
plan_doc: docs/pmos/features/2026-06-14_summary-tldr-diagram-enhancements/stories/260614-d3g/03_plan.html
tasks: docs/pmos/features/2026-06-14_summary-tldr-diagram-enhancements/stories/260614-d3g/tasks.yaml
plugin: pmos-toolkit
worktree: 
labels: [diagram, eval, diagnostics, editorial-theme]
claimed_by:
driver_holder:
created: 2026-06-14
updated: 2026-06-15
released: 2.82.0
---

<!-- status: planned at define (Loop 1); plan_doc + tasks.yaml authored. Build via /feature-sdlc build --story 260614-d3g -->

## Context

Two `/diagram` findings from the `/reflect` retro of a nested diagram run (it produced a spec-compliant SVG but the eval diagnostics cost an unneeded multi-turn debug cycle). Built against the design contract `docs/pmos/features/2026-06-14_summary-tldr-diagram-enhancements/02_design.html` (§diagram) and the standing skill-authoring criteria.

**[friction] Opaque contrast hard-fail.** The contrast checker (the eval's SVG-metrics half — `/diagram`'s `scripts/run.py` or its imported checker module) computes a fill's contrast against its background. When the nearest ancestor that would be the background source is excluded because it carries `class="legend"`, the checker falls back to a non-immediate-parent background and emits a hard-fail like `contrast: text 'DEFINED' fill=#F4EFE6 on #DCE0F0 ratio=1.15:1` — with no hint that a chip rect's `class="legend"` is what suppressed the expected background. The agent read the checker source ~6 times to diagnose this. Fix: when the checker uses a fallen-back (non-immediate-parent) background *because* the nearest ancestor was excluded by `class="legend"`, append a diagnostic suffix to the hard-fail string, e.g. `(nearest ancestor excluded by class=legend — remove class=legend from the chip rect if it is the actual background source)`.

**[nit] First-draft non-palette colors despite the editorial theme.** The first draft used `#059669` (green) and `#D97706` (amber), off the editorial palette, because the palette constraint registers too late during creative color selection. Fix: add a one-line `PALETTE HARD CONSTRAINT — only these hex values are permitted` block to the editorial `themes/editorial/style.md` preamble, immediately above the color table, so it registers before color selection begins.

`dependencies: []` — touches only `/diagram` files (the contrast checker source + `themes/editorial/style.md`); independent of the other stories.

## Acceptance Criteria

- [x] **AC1 — Contrast diagnostic note.** Locate the contrast checker in `plugins/pmos-toolkit/skills/diagram/` (the code that emits the `contrast: …` hard-fail strings and that excludes `class="legend"` elements from background detection). When a contrast hard-fail is produced for an element whose background was resolved by *falling back past* a nearest ancestor that was excluded due to `class="legend"`, append the diagnostic suffix `(nearest ancestor excluded by class=legend — remove class=legend from the chip rect if it is the actual background source)` to that specific hard-fail message. Non-legend-related contrast fails are unchanged.
- [x] **AC2 — Diagnostic is accurate + scoped.** The suffix is appended ONLY in the legend-fallback case (not on every contrast fail); the existing `class="legend"` exclusion behavior itself is unchanged (this is a message enrichment, not a logic change). The fill/background/ratio facts already in the message are preserved.
- [x] **AC3 — Editorial palette hard-constraint preamble.** `plugins/pmos-toolkit/skills/diagram/themes/editorial/style.md` gains a one-line `PALETTE HARD CONSTRAINT — only these hex values are permitted` block positioned immediately above the existing color table, listing/referencing the permitted hex set so it is read before color selection. Wording is consistent with the theme's existing voice; no palette values change.
- [x] **AC4 — Tests + compliance.** A unit/selftest asserts the legend-fallback diagnostic suffix appears for a synthetic legend-excluded contrast fail and does NOT appear for a normal contrast fail (extend the diagram tests, e.g. alongside `tests/test_editorial_theme.py` or the checker's own tests). Existing diagram tests (golden/editorial, defects) stay green. `skill-eval-check.sh` ≥ floor; hygiene lints green where applicable. No release-prereq work (that's `/complete-dev` at Loop 3).
- [x] **AC5 — Dogfood (load-bearing).** Generate a diagram with the editorial theme using chip rects that previously triggered the opaque failure: confirm (a) a first draft no longer reaches for off-palette greens/ambers, and (b) if a legend-fallback contrast fail does occur, the hard-fail string now carries the diagnostic suffix that points straight at the `class="legend"` chip. Gaps → fix → re-run (cap 2, then accept-residuals-and-surface).

## Notes

### Build write-back (Loop 2, 2026-06-14)

Built on branch `feat/260614-d3g` (claim `3a5d64c`, build `9be8441`; branched from main `3a5d64c`).
**Verdict: PASS** — all 5 ACs verified with live evidence. route:skill inner pipeline ran
skill-tier-resolve (tier 2, location `plugins/pmos-toolkit/skills/diagram/`, platform claude-code) →
execute (T1–T6) → skill-eval → verify.

- **T1 (locate):** contrast checker lives in `tests/run.py` (the code-metrics harness, not `scripts/run.py`).
  Emit site `run.py:830`; bg resolution `812-827` (defaults `canvas_fill`, walks `nodes` for smallest enclosing
  in-palette fill); `class="legend"` rects excluded from `nodes` at line 658 via `has_legend_class`. Legend-area
  *text* is still collected in `text_records`, so its bg falls back to canvas → the opaque fail.
- **T2/T3 (suffix):** added a `shape_bbox` helper + a `legend_rects` capture (legend-classed bg candidates,
  collected without touching node collection), and in the contrast loop append the diagnostic suffix when a
  `class="legend"` rect is the nearest enclosing background but smaller than the resolved `bg` area (i.e. bg fell
  back past it). Message-only; the legend-exclusion logic and the fill/bg/ratio facts are byte-unchanged (AC1/AC2).
  TDD red proven by stashing run.py: positive test failed with `fill=#F4EFE6 on #FFFFFF ratio=1.15:1` (no suffix).
- **T4 (palette preamble):** `PALETTE HARD CONSTRAINT` block added immediately above the §5.2 color table in
  `themes/editorial/style.md`, listing the 8 permitted hexes + pointing at `theme.yaml` as source of truth (AC3).
- **T5 (regression+compliance):** new contrast tests green; full diagram pytest suite **68 passed**; `run.py`
  corpus (golden + defects) all PASS incl. `low-contrast` unchanged (`contrast: … on #C2410C`, no spurious suffix);
  `skill-eval-check.sh --target claude-code` = 18 pass / 4 fail with the fail-set **identical to main**
  (0 new); both repo hygiene lints green (AC4).
- **T6 (load-bearing dogfood):** authored a faithful editorial diagram (dashed container + mono eyebrow + on-palette
  nodes + a `<g class="legend">` chip stack) and ran the real `evaluate()`. (a) Correctly-authored variant (ink text
  on chips) → **0 hard-fails, fully on-palette**; (b) the mistake variant (cream text on `class="legend"` chips) →
  contrast fail now carries the actionable suffix `…remove class=legend from the chip rect…` pointing straight at
  the chip (AC5).

Files changed (3): `tests/run.py`, `tests/test_editorial_theme.py`, `themes/editorial/style.md`. SKILL.md /
reference/ / eval/ byte-identical to main → no skill-authoring-surface change.

Code merge + release at Loop 3 (`/complete-dev --epic 260614-q4r` — rides with siblings 260614-s7m, 260614-p8k once built).

### accepted_residuals

- **skill-eval `[D]` 4 pre-existing residuals** — `c-reference-toc` (sidecar-schema.md >100 lines, no ToC),
  `c-portable-paths` (an example `file:///Users/.../` URL in render-to-raster.md), `d-capture-learnings-phase`
  (no numbered Capture-Learnings phase in SKILL.md), `e-scripts-dir` (`wrapper/*.py` outside `scripts/`). All four
  fail **identically on the base tree** (this story touched none of those files); out of scope for a contrast-message
  enrichment. Surfaced, not blocking.
