---
schema_version: 1
id: 0014
kind: story
title: /feature-sdlc define mode has no exit/cleanup step at its terminal docs-only merge — leaves the session parked in the define/<epic-id> worktree
type: tech-debt
status: in-progress
priority: should
route: skill
parent: 0015
dependencies: []
worktree: ../agent-skills-0014-feature-sdlc-define-no-worktree-exit
plan_doc: docs/pmos/features/2026-06-12_define-worktree-exit/stories/0014-feature-sdlc-define-no-worktree-exit/03_plan.html
tasks_file: docs/pmos/features/2026-06-12_define-worktree-exit/stories/0014-feature-sdlc-define-no-worktree-exit/tasks.yaml
claimed_by: feature-sdlc-build-loop
labels: [feature-sdlc, define, worktree, three-loop]
created: 2026-06-12
updated: 2026-06-12
source: 2026-06-12 /reflect on the epic 0011 (compact-mode-setting) define→build→release run
pr:
---

## Context

`#define-mode` step 5 (Definition merge, D20) ends the define loop with: path-scope check → merge `define/<epic-id>` to main (docs-only) → epic → `defined` → **STOP** + a log line. That's the whole tail — there is **no `ExitWorktree` and no worktree removal**. Define is *complete* (not *paused*, so there's no `--resume` reason to retain the worktree), yet the session is left parked inside `define/<epic-id>`.

This cascades through the rest of the three-loop:

1. Define merges docs + STOPs, never exits its worktree → the session stays in `define/<epic-id>`.
2. The natural next step (`/feature-sdlc build`) gets run from **inside** the stale define worktree.
3. Build then builds stories on the define branch instead of spinning fresh per-story `feat/00NN` worktrees (the `#build-mode` step 3 contract).
4. The `/complete-dev --epic` release train has **one branch carrying everything** instead of per-story branches → the merge can't fast-forward → needs `--no-ff`.

Observed live on epic 0011: stories 0012 + 0013 were built on `define/compact-mode-setting`, and the release hit `Diverging branches can't be fast-forwarded` (recovered with `--no-ff`). Root cause traces entirely back to the missing exit step.

**Secondary gap — no owner for the define worktree teardown.** The `--epic` release train's cleanup (`#epic-train` step 6) removes only **per-STORY** worktrees (each story's `worktree:` field). The `define/<epic-id>` worktree is not a story worktree, so it falls through and is never cleaned by any documented path. On epic 0011 it was only removed because the stories had ridden the define branch (making it the de-facto work tree), so the manual Phase 16a removal happened to catch it.

## Acceptance Criteria

- [ ] After the docs-only definition merge in `#define-mode` step 5 (both `route: feature` and `route: skill` variants — the worktree/merge/STOP semantics are shared), `define` calls `ExitWorktree` back to the root/main checkout before the STOP log line, so the next loop (`build`) starts from root by default.
- [ ] The now-redundant `define/<epic-id>` worktree is removed (its output already landed on main) — OR, if intentionally retained, the STOP log line tells the user it's safe to remove and where to `cd`. Pick one and document it.
- [ ] A documented owner exists for `define/<epic-id>` worktree teardown — either define removes it at step 5 (preferred), or `#epic-train` step 6 is extended to also remove the epic's define worktree alongside the story worktrees.
- [ ] The STOP log line nudges toward root: e.g. `definition merged; epic <id> → defined. cd <root> && /feature-sdlc build --next` (platform-correct invocation).
- [ ] Resume safety preserved: if a define run is genuinely *paused* (not merged), the worktree is still retained for `--resume` — only the terminal *completed* merge triggers exit/cleanup.

## Notes

- Related: `#build-mode` step 3 (creates `feat/<story-id>` fresh from main), `#epic-train` step 6 (per-story worktree cleanup), `/complete-dev` Phase 16a (feature-pipeline worktree teardown — the pattern define lacks).
- Interim workaround (captured as a `## /feature-sdlc` learning candidate): after `define`, `cd` to the root checkout before running `build`.
- This is a workflow-correctness gap, not a data-loss bug — the release still ships correctly; the cost is the avoidable `--no-ff` merge and the orphan worktree.
