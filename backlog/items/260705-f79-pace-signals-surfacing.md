---
schema_version: 1
id: 260705-f79
title: "/mytasks goal pace signals & surfacing — schedule-adherence (dated) + attention/starved (per-goal cadence, real-progress-only) signals, derived+manual progress, goals view + index summary + morning-brief hook + read-only web, tests"
type: feature
kind: story
status: ready
route: skill
priority: should
labels: [pmos-toolkit, mytasks, goals, signals, morning-brief, skill]
created: 2026-07-05
updated: 2026-07-05
parent: 260705-n2n
dependencies: [260705-hbe, 260705-ebm]
design_doc: docs/pmos/features/2026-07-05_mytasks-goals-milestones/02_design.html
plan_doc: docs/pmos/features/2026-07-05_mytasks-goals-milestones/stories/260705-f79/03_plan.html
feature_folder: docs/pmos/features/2026-07-05_mytasks-goals-milestones/
---

## Context

Story 3 of epic 260705-n2n. The pace-sensing half (Job B) + the visibility half of Job A.
Grounds in `02_design.html` §4+§5, INV-7/INV-8/INV-9, decisions D1/D2/D3/D4/D7. Depends on S1+S2 (goal entity +
resolver) — D9 claim-time merges both branches in before build.

## Acceptance Criteria

- [ ] **AC1 — schedule signal (FR-10, §4.1, D2).** Pure `scheduleSignal(goal, today)` → {on-track, at-risk,
  behind, done} from milestone `due` vs today + met/derived state. **Open-ended goals return null (never
  "behind").** `AT_RISK_DAYS`/`AT_RISK_PCT` are named constants (default 7 / 50%). Script-computed (§H); the
  model never estimates the band.
- [ ] **AC2 — attention signal (FR-11, §4.2, D1/D7).** Pure `attentionSignal(goal, effectiveTasks, today)` →
  {fed, starved, no-tasks-yet}. Starved = no **real progress** (a completed OR created attached task — a bare
  `updated` bump does NOT count, D7) within `cadenceWindow(goal.cadence)`. Zero effective tasks → `no-tasks-yet`
  (grace state, INV-9); never falsely starved/behind.
- [ ] **AC3 — progress (FR-12, §4.3, D3/INV-8).** `derivedProgress` from effective attached-task completion;
  a manual milestone `met` flag overrides for that milestone. Goal with zero effective tasks → "no tasks yet",
  not 0%.
- [ ] **AC4 — goals view + index summary (D4a/b).** `/mytasks goals` view renders each active goal (type, both
  signal bands, progress, next milestone+due), behind/starved sorted first. Bare `/mytasks` index gains a
  compact `## Goals` summary listing only behind/starved/at-risk goals (quiet when all healthy). Derived on read.
- [ ] **AC5 — morning-brief hook (D4c).** `lib.js` exposes `goalsForBrief()` returning behind+starved goals;
  `/morning-brief` consumes it to emit a "goals needing attention" lane (mirrors how the brief reads other
  sources — an integration point, not a re-implementation). Verify against the real morning-brief pipeline.
- [ ] **AC6 — read-only web (D4).** `serve.js` gains `GET /api/goals`; the web app shows goals read-only. Full
  web CRUD is out of scope.
- [ ] **AC7 — determinism + tests (INV-7).** All signal/progress functions have `--selftest` + unit tests:
  schedule bands incl. open-ended→null, attention incl. no-tasks-yet + real-progress-only (updated-bump does
  NOT feed), derived+manual progress, goals-for-brief filter, index summary quiet-when-healthy. `node --test`;
  green. SKILL body cites the functions and never re-derives arithmetic (§H).
- [ ] **AC8 — docs.** SKILL.md documents `goals` view, signals semantics, morning-brief integration; Anti-
  patterns gains "never estimate a pace band the script computes" + "don't let a trivial edit read as progress".
  Conforms to `skill-patterns.md §A–§L`.
- [ ] **AC9 — release-prereq scope (§G).** No release-prereq tasks in build waves — plan Release prerequisites
  section only.
