---
schema_version: 1
id: 260614-p8k
kind: story
parent: 260614-q4r
title: _shared/pipeline-setup.md — mark docs/pmos/ as the (Recommended) first-run docs_path default
type: enhancement
priority: should
status: in-progress
route: skill
dependencies: []
feature_folder: docs/pmos/features/2026-06-14_summary-tldr-diagram-enhancements/
plan_doc: docs/pmos/features/2026-06-14_summary-tldr-diagram-enhancements/stories/260614-p8k/03_plan.html
tasks: docs/pmos/features/2026-06-14_summary-tldr-diagram-enhancements/stories/260614-p8k/tasks.yaml
plugin: pmos-toolkit
worktree: feat/260614-p8k
labels: [pipeline-setup, substrate, non-interactive, cross-plugin]
claimed_by: build:explainer-a3g-loop
driver_holder: build:explainer-a3g-loop
created: 2026-06-14
updated: 2026-06-14
---

<!-- status: planned at define (Loop 1); plan_doc + tasks.yaml authored. Build via /feature-sdlc build --story 260614-p8k -->

## Context

A `/reflect` friction finding surfaced via `/summary-tldr` but rooted in **shared substrate**: the first-run `docs_path` setup `AskUserQuestion` (in `plugins/pmos-toolkit/skills/_shared/pipeline-setup.md`, Section A first-run setup) offers options like `pov/`, `docs/pmos/`, `.` with **no `(Recommended)` option**. Under `--non-interactive` the canonical classifier therefore **DEFERs** (no option ends in `(Recommended)`) and the run cannot proceed — a hard stop for any first-run headless invocation of *any* pmos skill that inlines pipeline-setup.

Fix: mark `docs/pmos/` as the recommended default (`docs/pmos/ (Recommended)`), since it matches every other pmos-toolkit output convention and is the obvious first-run choice. This lets non-interactive first-runs AUTO-PICK it instead of dead-ending.

Built against the design contract `docs/pmos/features/2026-06-14_summary-tldr-diagram-enhancements/02_design.html` (§substrate) and the standing skill-authoring criteria.

### Single plugin / release unit (D17)

`pipeline-setup.md` is canonical in **pmos-toolkit** and synced to pmos-learnkit via `scripts/sync-shared.sh --from=pmos-toolkit` at release. This story authors the canonical pmos-toolkit copy and rides the pmos-toolkit minor bump; the cross-plugin sync happens at Loop 3. `dependencies: []` — independent of the summary-tldr and diagram stories.

## Acceptance Criteria

- [ ] **AC1 — Recommended default added.** In `plugins/pmos-toolkit/skills/_shared/pipeline-setup.md` Section A first-run setup, the `docs_path` prompt's `docs/pmos/` option label ends in ` (Recommended)` (byte-exact, so the non-interactive classifier AUTO-PICKs it). It is the first option (per repo convention: Recommended option first). Other offered paths remain available for interactive choice.
- [ ] **AC2 — Non-interactive first-run no longer dead-ends.** Document/verify that under `--non-interactive`, a first-run (no `.pmos/settings.yaml`) now AUTO-PICKs `docs/pmos/` rather than DEFERring. If pipeline-setup carries a `<!-- defer-only: … -->` tag on this prompt that would force a defer, reconcile it so a Recommended option governs (this is a non-destructive path choice — AUTO-PICK is correct).
- [ ] **AC3 — Audit + lints green.** `tools/audit-recommended.sh` recognizes the prompt as classified (Recommended present); the change is consistent with `skill-patterns.md §I`/the non-interactive contract. No other pipeline-setup behavior changes. Cross-plugin sync is deferred to release (`sync-shared.sh --from=pmos-toolkit`), not done in this story. No release-prereq work (that's `/complete-dev` at Loop 3).
- [ ] **AC4 — Dogfood (load-bearing).** Simulate a first-run non-interactive path (no settings.yaml) and confirm the setup resolves `docs/pmos/` without deferring; confirm an interactive run still presents the full choice list with `docs/pmos/` recommended. Gaps → fix → re-run (cap 2, then accept-residuals-and-surface).
