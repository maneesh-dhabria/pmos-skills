---
schema_version: 1
id: 260614-8v4
kind: story
title: "/backlog web viewer — plain labels, legend, kind pills, grouped status filter, @null fix, Releases cleanup"
type: enhancement
priority: should
status: done
route: skill
feature_folder: docs/pmos/features/2026-06-14_backlog-web-clarity/
parent: 260614-q3h
dependencies: []
worktree: feat/260614-8v4
plan_doc: docs/pmos/features/2026-06-14_backlog-web-clarity/stories/260614-8v4-backlog-web-viewer-clarity/03_plan.html
tasks_file: docs/pmos/features/2026-06-14_backlog-web-clarity/stories/260614-8v4-backlog-web-viewer-clarity/tasks.yaml
labels: [backlog, pmos-toolkit, design-crit, ux]
claimed_by: build:explainer-a3g-loop
driver_holder: build:explainer-a3g-loop
created: 2026-06-14
updated: 2026-06-14
released:
---

## Context

The single fused `route: skill` story for epic `260614-q3h`. Implements the translation layer over the `/backlog web` viewer per `02_design.html` (FR-1..FR-9). All edits land in three files: `web/viewer.html` (presentation), `scripts/serve-web-lib.mjs` (derivation: `null`-literal coercion, grouped-status facet, Releases not-started exclusion), and `tests/serve-web.test.mjs` (coverage). No server/protocol change.

## Acceptance Criteria

- [x] FR-1 plain column labels + subtitles (Needs you / Ready to build / Releases).
- [x] FR-2 one-line legend under the title (Epic⊃Story, Define→Build→Release, Tree vs Queues).
- [x] FR-3 `EPIC` / `story` kind pills in the tree; singleton epics distinguishable.
- [x] FR-4 status filter split into lifecycle-ordered Epic-status / Story-status groups.
- [x] FR-5 `@null` never renders — `parseScalar` coerces `null`/`~`/empty to empty (canonical); viewer guard treats `"null"`/`"undefined"` as empty.
- [x] FR-6 Releases excludes 0-done epics, shows done/total badge, sub-header "In progress".
- [x] FR-7 tooltips on progress bar + route chip.
- [x] FR-8 new tests for FR-5/FR-4/FR-6; existing `tests/serve-web.test.mjs` stays green.
- [x] FR-9 passes `skill-eval` ([D]+[J]) and the 4 repo lints.

## Notes

### Build write-back (Loop 2, 2026-06-14)

Built on branch `feat/260614-8v4` (commits `6bfb65c` T2 tests-first, `17a036a` T3 serve-web-lib, `4488fc8` T4 viewer). **Verdict: PASS** — all 9 FRs verified with live evidence. Three files only (`scripts/serve-web-lib.mjs`, `web/viewer.html`, `tests/serve-web.test.mjs`); no server/protocol change; `SKILL.md` untouched.

- **Tests/lints:** `serve-web.test.mjs` 43/43 (8 new for FR-5/FR-4/FR-6, written failing first then made green); `claim-lock.test.sh` + `id-scheme.test.sh` green; all 4 repo lints green (flags-vs-hints, phase-refs, non-interactive-inline, audit-recommended).
- **skill-eval Phase 6a:** `[D]` 2 pre-existing fails only — `d-learnings-load-line` + `d-capture-learnings-phase` (the backlog tracker SKILL.md has never carried a learnings-load phase; `grep -c learnings.md SKILL.md` = 0; no build commit touched SKILL.md → **accepted_residuals**, not introduced). `[J]` baseline unchanged (SKILL.md prose untouched); the `## web` section still accurately describes the viewer as "the same three queues plus an epic→story tree" — the relabeling is web-viewer-only, the terminal `/backlog` dashboard (`#groom`/`#releases`) is deliberately out of scope. Combined gated ≥ floor 43.
- **Browser-evidence gate (T6 live dogfood):** real `serve-web.mjs` served the worktree's 30-epic backlog; Playwright drove it. DOM assertions confirmed every FR: legend (FR-2), 30 epic + 36 story kind pills (FR-3), grouped "Epic status"/"Story status" facets (FR-4), **0 `@null` chips** (FR-5), progress + route tooltips (FR-7), lane headers "Needs you/Ready to build/Releases" + subtitles (FR-1), "In progress" sub-header with done/total badges `1/1·1/2·1/2` and 0-done epics excluded (FR-6). Screenshots `backlog-8v4-tree.png` + `backlog-8v4-queues.png` (untracked dogfood evidence in the worktree).

Code merge + release happen at Loop 3 (`/complete-dev --epic 260614-q3h`).

### accepted_residuals

- `d-learnings-load-line` `[D]` — pre-existing; backlog SKILL.md has no `~/.pmos/learnings.md` load line (never did). Out of scope for a viewer-only story.
- `d-capture-learnings-phase` `[D]` — pre-existing; backlog has no numbered Capture-Learnings phase (a tracker/capture utility, not a pipeline skill). Out of scope.
