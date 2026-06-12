---
id: 0009
title: /feature-sdlc has no mid-flight base-drift check — origin can advance during a long single-session run, surfacing only at /complete-dev Phase 9 stale-bump
type: enhancement
status: wontfix
priority: should
labels: [feature-sdlc, complete-dev, base-drift]
created: 2026-05-13
updated: 2026-06-12
source: 2026-05-13 /complete-dev session for feat/fsdlc-base-drift-and-release-scope (the session that just landed 2.46.0)
spec_doc:
plan_doc:
pr:
parent:
dependencies: []
---

## Context

The base-drift fixes landed in 2.46.0 cover two of three drift windows:

- **Branch time** — Phase 0a Step 2.5 `git fetch <remote> <base>` + behind check before `git worktree add`. Caught.
- **Resume time** — Phase 0b origin-moved check re-runs the same fetch+diff when the user runs `/feature-sdlc --resume`. Caught.
- **Mid-flight (uncovered)** — a long *single-session* run that branches cleanly, never resumes, and pushes to `/complete-dev` after origin has advanced. No drift check fires until `/complete-dev` Phase 9 stale-bump.

This is exactly what happened in the 2.46.0 release session itself: I branched off main at the start of the session, did the work, and by the time I reached `/complete-dev` Phase 3 merge, the concurrent `/ideate` session had shipped 2.45.0 — a stale-bump that `/complete-dev` Phase 9 caught and recovered from. The recovery worked, but it cost a hard-reset, a re-rebase, and an entire re-application of the ceremony commit.

Phase 9 stale-bump is the safety net — but it fires *after* the user has already done version-bump + changelog + tag-prep work. A cheaper check earlier in the session would let the user re-base or wait before doing ceremony work that becomes throwaway.

## Acceptance Criteria

- [ ] `/feature-sdlc` adds a mid-flight base-drift check at a sensible point — either (a) before Phase 5 `/plan` dispatch (the next heavy phase after `/spec`), (b) before Phase 6 `/execute` (the heaviest), or (c) as a pre-hand-off to `/complete-dev` from Phase 8. Pick the cheapest meaningful position.
- [ ] The check is identical in shape to Phase 0a Step 2.5 — `git fetch <remote> <base>` + `behind` count, with `state.base_drift` updated when drift is observed.
- [ ] Drift detection mid-flight is **observability-only** (do NOT prompt or block) — the run continues; `/complete-dev` Phase 9 still handles the actual stale-bump recovery. The point is to surface the gap early so the user can choose to pause and rebase before committing more work to a stale base.
- [ ] A chat log line `mid-flight base-drift: behind=<N> remote=<remote> base=<base> (since branch time: +<M>)` makes the situation visible.

## Notes

- Related: 2.46.0 Phase 0a Step 2.5 (branch-time check), 2.46.0 Phase 0b origin-moved (resume-time check), `/complete-dev` Phase 9 stale-bump (merge-time recovery).
- A cron-style mid-session check would be intrusive — once per heavy phase is the right cadence.
- The 2.46.0 changelog already calls out that Phase 9 recovery worked correctly under exactly this scenario; this backlog item is about reducing the cost of recovery, not about a defect in the existing flow.
