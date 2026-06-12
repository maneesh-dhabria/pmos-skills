---
schema_version: 1
id: 0612-2w7
kind: story
title: Implement build-loop reconcile-in-flight — resume-first step 0, claim-ownership, forward-progress poison guard
type: feature
priority: should
status: released
released: pmos-toolkit/v2.69.0
route: skill
plugin: pmos-toolkit
parent: 0612-w4e
feature_folder: docs/pmos/features/2026-06-12_build-resume-reconcile/
spec_doc: docs/pmos/features/2026-06-12_build-resume-reconcile/02_design.html
plan: docs/pmos/features/2026-06-12_build-resume-reconcile/stories/0612-2w7-build-resume-reconcile/03_plan.html
tasks: docs/pmos/features/2026-06-12_build-resume-reconcile/stories/0612-2w7-build-resume-reconcile/tasks.yaml
dependencies: []
worktree:
labels: [backlog, build-loop, resume, resilience, claim-lock]
created: 2026-06-12
updated: 2026-06-12
---

## Context

The single implementation story for epic 0612-w4e. One coherent change to the build loop spanning
`feature-sdlc/SKILL.md` (#build-mode step 0 + driver-identity contract), `backlog/SKILL.md`
(in-progress query + holder threading + skill-managed fields), `backlog/scripts/claim-lock.js`
(holder-ownership reclaim), and `reference/state-schema.md` (build phases[] + per-inner-phase
status). All pmos-toolkit; co-designed, can only be skill-eval'd / shipped as a unit. Design + full
decision log + ripple surface: `../../02_design.html`.

## Acceptance Criteria

- [x] AC1 — `reconcile-in-flight` step 0 before pick: resume a resumable in-progress story then STOP, else fall through to today's planned pick unchanged (D1, `02_design.html#decisions`)
- [x] AC2 — resumable iff claim absent / stale / own-holder; fresh foreign-held claim is skipped (D2)
- [x] AC3 — build driver claims with a stable per-loop `--holder`; `claim-lock.js` reclaims a same-holder lock without the TTL wait; foreign-holder TTL semantics unchanged; tests cover both (D3)
- [x] AC4 — `resume_attempts` + last-progress marker tracked on the story; reset to 0 on new commits since prior attempt; cap (2) fires only on consecutive unproductive resumes (D4)
- [x] AC5 — cap → `status: blocked` + `unclaim` + a note with observable facts (attempts, last completed task/sha, in-flight phase, timestamps); loop never head-of-line-blocked (D5)
- [x] AC6 — resume re-enters via the Phase 0b cursor; a crash after `/verify` PASS finalizes (write-back) without re-running `/verify`; build `phases[]` exposes per-inner-phase status (D6)
- [x] AC7 — `resume_attempts` + marker are skill-managed (rejected by `/backlog set`); reconcile touches only in-progress stories, never blocked/done/released (D7)
- [x] AC8 — skill-eval green against `skill-patterns.md §A–§L`; backlog + claim-lock tests updated; no regression to the zero-crash pick path (D8)

## Notes

Single `/execute` run, multi-file but cohesive (no internal story-split — D24 litmus: a task in the
build-mode change depends on the claim-lock holder-ownership task, so they fuse into one story).
`claim-lock.js` holder-ownership is the substrate the reconcile step consumes — keep it
scheme-agnostic and preserve the existing TTL-only reclaim for foreign holders. Release-prereq
tasks (version bump, changelog, manifest sync) belong under the plan's `## Release prerequisites`,
not the waves — `/complete-dev` owns them. Out of scope: heartbeat / multi-driver liveness.
