---
schema_version: 1
id: 260614-q4r
kind: epic
title: Enhance /summary-tldr (crash-safe emit-before-diagram, compact source table) + /diagram (eval diagnostics, palette hard-constraint) + shared first-run docs_path default
type: enhancement
priority: should
status: released
route: skill
dependencies: []
feature_folder: docs/pmos/features/2026-06-14_summary-tldr-diagram-enhancements/
requirements_doc:
spec_doc:
design_doc: docs/pmos/features/2026-06-14_summary-tldr-diagram-enhancements/02_design.html
labels: [summary-tldr, diagram, html-authoring, pipeline-setup, retro, ux, robustness]
created: 2026-06-14
updated: 2026-06-15
released: 2.82.0
---

## Context

From maintainer observations + two `/reflect` retros (2026-06-14), surfaced while dogfooding `/summary-tldr` against a 170 KB Porter Metric Store POV (example artifact: `~/Desktop/Projects/porter/pm-docs/metrics-store/docs/pmos/summary-tldr/2026-06-14-porter-metric-store-pov.html`). Three skills' worth of fixes, grouped as one `route: skill` epic of independent stories.

Design contract (the cross-skill coherence doc the stories cite by anchor): `docs/pmos/features/2026-06-14_summary-tldr-diagram-enhancements/02_design.html`.

### The finding set (consolidated)

**/summary-tldr** (`plugins/pmos-toolkit/skills/summary-tldr/SKILL.md`):
- **[blocker] Approved summary lost to context compaction.** The Phase 6 `/diagram` loop spans many turns (eval iterations, repeated source reads) and can trigger a context compaction. The Phase 4/5-approved summary text lives only in conversation context, so Phase 7 had to re-read the source and reconstruct from scratch — the emitted artifact was *not* the approved draft.
- **[obs-2] Emit the summary before the optional `/diagram` step.** The diagram step is slow; the reader should be free to read the summary while it runs.
- **[obs-3] Compact the "Source & confidence" appendix** (currently a `<dl>` of dt/dd) — render it as a compact table.

**/diagram** (`plugins/pmos-toolkit/skills/diagram/...`):
- **[friction] Opaque contrast hard-fail diagnostics.** When the contrast checker falls back to a non-immediate-parent background because the nearest ancestor is excluded via `class="legend"`, the hard-fail string gives no hint why a valid-looking fill fails — cost ~6 source reads to diagnose.
- **[nit] First-draft non-palette colors despite the editorial theme** (e.g. `#059669` green, `#D97706` amber) — the palette constraint registers too late during draft authoring.

**Shared substrate** (`plugins/pmos-toolkit/skills/_shared/pipeline-setup.md`):
- **[friction] First-run `docs_path` AskUserQuestion has no `(Recommended)` option** → under `--non-interactive` it DEFERs and the run cannot proceed. Affects *every* skill's first-run, not just `/summary-tldr`.

### Key design synthesis (decisions live in 02_design.html)

- **obs-2 structurally subsumes the blocker.** Reordering so the summary HTML is **emitted to disk before** the slow `/diagram` loop runs makes the approved text crash-safe by construction (it is already persisted in the real artifact); the diagram is then injected into the on-disk file afterward. The retro's `.summary.tmp` mechanism becomes unnecessary — one fix resolves both findings.
- **obs-1 (h1 title) is OUT of this epic.** A substrate-level body-`<h1>` is already owned by **epic 260613-ev1** (Pipeline-doc CSS readability, status `defined`) via `_shared/html-authoring/template.html` (toolbar title → breadcrumb + real body `<h1>` from `{{title}}`, for every artifact). `/summary-tldr` already supplies a meaningful `{{title}}`. Re-implementing an h1 here would duplicate that fix (violates §K one-fact-one-home). Maintainer decision (2026-06-14): defer obs-1 to ev1; no `/summary-tldr` change.

### Single plugin / release unit (D17)

All three stories land in **pmos-toolkit**. The substrate edit (Story C) is authored canonically in pmos-toolkit and synced to pmos-learnkit at release via `scripts/sync-shared.sh --from=pmos-toolkit`; it rides the pmos-toolkit minor bump. `/complete-dev` (Loop 3) is the sole writer of the version bump, changelog, and tag.

## Stories

- **260614-s7m** — `/summary-tldr`: emit-before-diagram reorder (crash-safe; obs-2 + blocker) + compact Source&confidence table (obs-3).
- **260614-d3g** — `/diagram`: contrast-checker `class="legend"` diagnostic note (friction) + editorial-theme palette hard-constraint preamble (nit).
- **260614-p8k** — `_shared/pipeline-setup.md`: mark `docs/pmos/` as the `(Recommended)` first-run `docs_path` default (friction; substrate).

All three are independent (`dependencies: []`) — different files, no inter-story coupling.

## Acceptance Criteria (epic-level)

- [ ] Three `route: skill` stories defined, each with ≥1 AC, a plan, and `tasks.yaml`; each targets pmos-toolkit (D17).
- [ ] `02_design.html` records the decisions: obs-2-subsumes-blocker, obs-1-deferred-to-ev1, substrate-rides-pmos-toolkit, the exact fix shape per finding.
- [ ] obs-1 is explicitly NOT in scope (deferred to 260613-ev1) — documented, not silently dropped.
- [ ] No release-prerequisite work at define/build (version bump, changelog, README row, manifest sync) — `/complete-dev` owns those at Loop 3.
