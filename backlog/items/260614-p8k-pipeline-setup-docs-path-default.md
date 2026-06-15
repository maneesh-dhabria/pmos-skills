---
schema_version: 1
id: 260614-p8k
kind: story
parent: 260614-q4r
title: _shared/pipeline-setup.md — mark docs/pmos/ as the (Recommended) first-run docs_path default
type: enhancement
priority: should
status: done
route: skill
dependencies: []
feature_folder: docs/pmos/features/2026-06-14_summary-tldr-diagram-enhancements/
plan_doc: docs/pmos/features/2026-06-14_summary-tldr-diagram-enhancements/stories/260614-p8k/03_plan.html
tasks: docs/pmos/features/2026-06-14_summary-tldr-diagram-enhancements/stories/260614-p8k/tasks.yaml
plugin: pmos-toolkit
worktree: 
labels: [pipeline-setup, substrate, non-interactive, cross-plugin]
claimed_by:
driver_holder:
created: 2026-06-14
updated: 2026-06-15
released: 2.82.0
---

<!-- status: planned at define (Loop 1); plan_doc + tasks.yaml authored. Build via /feature-sdlc build --story 260614-p8k -->

## Context

A `/reflect` friction finding surfaced via `/summary-tldr` but rooted in **shared substrate**: the first-run `docs_path` setup `AskUserQuestion` (in `plugins/pmos-toolkit/skills/_shared/pipeline-setup.md`, Section A first-run setup) offers options like `pov/`, `docs/pmos/`, `.` with **no `(Recommended)` option**. Under `--non-interactive` the canonical classifier therefore **DEFERs** (no option ends in `(Recommended)`) and the run cannot proceed — a hard stop for any first-run headless invocation of *any* pmos skill that inlines pipeline-setup.

Fix: mark `docs/pmos/` as the recommended default (`docs/pmos/ (Recommended)`), since it matches every other pmos-toolkit output convention and is the obvious first-run choice. This lets non-interactive first-runs AUTO-PICK it instead of dead-ending.

Built against the design contract `docs/pmos/features/2026-06-14_summary-tldr-diagram-enhancements/02_design.html` (§substrate) and the standing skill-authoring criteria.

### Single plugin / release unit (D17)

`pipeline-setup.md` is canonical in **pmos-toolkit** and synced to pmos-learnkit via `scripts/sync-shared.sh --from=pmos-toolkit` at release. This story authors the canonical pmos-toolkit copy and rides the pmos-toolkit minor bump; the cross-plugin sync happens at Loop 3. `dependencies: []` — independent of the summary-tldr and diagram stories.

## Acceptance Criteria

- [x] **AC1 — Recommended default added.** In `plugins/pmos-toolkit/skills/_shared/pipeline-setup.md` Section A first-run setup, the `docs_path` prompt's `docs/pmos/` option label ends in ` (Recommended)` (byte-exact, so the non-interactive classifier AUTO-PICKs it). It is the first option (per repo convention: Recommended option first). Other offered paths remain available for interactive choice.
- [x] **AC2 — Non-interactive first-run no longer dead-ends.** Document/verify that under `--non-interactive`, a first-run (no `.pmos/settings.yaml`) now AUTO-PICKs `docs/pmos/` rather than DEFERring. If pipeline-setup carries a `<!-- defer-only: … -->` tag on this prompt that would force a defer, reconcile it so a Recommended option governs (this is a non-destructive path choice — AUTO-PICK is correct).
- [x] **AC3 — Audit + lints green.** `tools/audit-recommended.sh` recognizes the prompt as classified (Recommended present); the change is consistent with `skill-patterns.md §I`/the non-interactive contract. No other pipeline-setup behavior changes. Cross-plugin sync is deferred to release (`sync-shared.sh --from=pmos-toolkit`), not done in this story. No release-prereq work (that's `/complete-dev` at Loop 3).
- [x] **AC4 — Dogfood (load-bearing).** Simulate a first-run non-interactive path (no settings.yaml) and confirm the setup resolves `docs/pmos/` without deferring; confirm an interactive run still presents the full choice list with `docs/pmos/` recommended. Gaps → fix → re-run (cap 2, then accept-residuals-and-surface).

## Notes

### Build write-back (Loop 2, 2026-06-14)

Built on branch `feat/260614-p8k` (claim `da5574f`, build `e07e5db`; branched from main `da5574f`).
**Verdict: PASS** — all 4 ACs verified with live evidence. route:skill inner pipeline ran
skill-tier-resolve (tier 1, location `_shared/pipeline-setup.md`, platform claude-code) →
execute (T1–T4) → skill-eval → verify.

- **T1 (locate):** the dead-end prompt is `_shared/pipeline-setup.md` §A.2 **Q1** ("Where should pipeline
  artifacts live?"). Old options were `Recommended (legacy detected): docs/` and `Recommended (fresh repo):
  docs/pmos/` plus `Other...` — **none ended in the byte-exact ` (Recommended)` suffix** the canonical
  classifier looks for. No `<!-- defer-only -->` tag is adjacent, so the dead-end was purely the
  "no option ends in `(Recommended)` → DEFER" rule firing on a first-run (no `.pmos/settings.yaml`).
- **T2 (fix):** reordered Q1 so `docs/pmos/` is the **first** option and its line **ends in ` (Recommended)`**
  (byte-exact); `docs/` kept as the second option with its legacy-preservation note (auto-recommended in an
  *interactive* run when A.1 detects a legacy `docs/{requirements,specs,plans,features}/` tree). Exactly **one**
  option ends in `(Recommended)` → AUTO-PICK is unambiguous. Added a clarifying paragraph that the suffix governs
  only the headless default. Wording-only; no other pipeline-setup behavior changed (AC1/AC2). AC2's reconcile
  clause was a no-op — there was no defer-only tag to remove.
- **T3 (audit + lints):** `tools/audit-recommended.sh` → **exit 0, PASS** ("all calls in 36 skill(s) are marked",
  0 unmarked); `tools/lint-non-interactive-inline.sh` → exit 0. Cross-plugin `sync-shared.sh` deliberately NOT
  run (Loop-3/release step) (AC3).
- **T4 (load-bearing dogfood):** traced the canonical non-interactive classifier over the edited Q1 — it
  **AUTO-PICKs `docs/pmos/`** (no DEFER; the old dead-end is gone); an interactive run still presents all 3
  options; exactly-one-Recommended holds (AC4).
- **Scope:** branch code diff vs main = the single file `_shared/pipeline-setup.md` (4 insertions / 2 deletions).
  No SKILL.md / reference touched.

Code merge + release at Loop 3 (`/complete-dev --epic 260614-q4r` — rides with siblings 260614-s7m, 260614-d3g
once s7m is built). **Cross-plugin sync to pmos-learnkit** (`sync-shared.sh --from=pmos-toolkit`) is a Loop-3
release step, not part of this story.

### accepted_residuals

- **skill-eval-check.sh could not execute (host fork-exhaustion).** Under heavy concurrent load (parallel
  worktrees / cron) the deterministic `skill-eval-check.sh` and a re-run of `audit-recommended.sh` returned
  `fork: Resource temporarily unavailable` (exit 128) — a host process-limit condition, not a content failure.
  This is **non-load-bearing for this story**: it edits substrate only, and the representative consumer
  `feature-sdlc/SKILL.md` (+ its reference files) is **byte-identical to main** (`git diff --stat main` empty),
  so skill-eval over it is invariant — no regression is provable by input-equality without a fresh run. The
  change-specific deterministic gate (`audit-recommended.sh`) DID run **green (exit 0)** earlier this turn, after
  the edit. Per the skill-eval fallback contract (exit 2 / can't-run → fall back), recorded and surfaced.
