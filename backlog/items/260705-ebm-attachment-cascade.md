---
schema_version: 1
id: 260705-ebm
title: "/mytasks goal attachment & cascade — goal:/milestone: task fields (+ schema migration), goal-file attached_projects map, effectiveGoal/effectiveMilestone resolver (inherit-by-default, per-task override), attach/detach verbs, tests"
type: feature
kind: story
status: done
route: skill
priority: should
labels: [pmos-toolkit, mytasks, goals, attachment, skill]
created: 2026-07-05
updated: 2026-07-05
parent: 260705-n2n
dependencies: [260705-hbe]
design_doc: docs/pmos/features/2026-07-05_mytasks-goals-milestones/02_design.html
plan_doc: docs/pmos/features/2026-07-05_mytasks-goals-milestones/stories/260705-ebm/03_plan.html
feature_folder: docs/pmos/features/2026-07-05_mytasks-goals-milestones/
worktree: .claude/worktrees/feat-260705-ebm
claimed_by:
driver_holder:
---

## Context

Story 2 of epic 260705-n2n. Connects tasks/projects to goals — the "connect work to goals" half.
Grounds in `02_design.html` §3, INV-4/INV-5/INV-6, decisions D5/D8. Depends on S1 (260705-hbe) for the goal
entity — D9 claim-time merge brings S1's branch into this worktree before build.

## Acceptance Criteria

- [x] **AC1 — task fields + migration (§3.1).** Tasks gain optional `goal:` (goal id | `none` sentinel |
  empty) and `milestone:` (ref | empty) frontmatter, written as bare keys by default. Task `schema_version` → 3
  additively; absent/1/2 files stay valid via a load-time normalization mirroring `migrateWorkstreamKey` (key
  presence only; never rewrites ids or other fields; no-op once normalized).
- [x] **AC2 — attached_projects map (D8, grill-2).** Goals carry `attached_projects: [<slug>, …]` in
  frontmatter (durable source of truth). The resolver builds the in-memory `projectGoals` map from goals'
  `attached_projects`; `registry.json` is NOT used for attachments (stays the deletable visibility cache). A
  project attached to two goals is a validation error (at most one goal per project).
- [x] **AC3 — effective resolution (INV-4/INV-5, §3.2).** Pure `effectiveGoal(task, projectGoals)`:
  `task.goal=='none'` → null (explicit detach wins); valid `task.goal` → that goal (direct wins); else
  `projectGoals[task.project]` (inherit); else null. `effectiveMilestone(task)` = `task.milestone` only when the
  goal is set directly. A task counts toward a goal at most once (single resolution function — no double-count).
- [x] **AC4 — attach/detach verbs (INV-6).** `/mytasks attach <task|project> <goal> [milestone]` and
  `/mytasks detach <task|project>` — attaching a project appends to the goal's `attached_projects`; attaching a
  task sets its `goal:`(+`milestone:`); detach clears (task `goal:` → `none` or empty per flag). NL-first forms.
  Attaching to a non-existent goal/milestone errors and writes nothing; no unrelated field is mutated.
- [x] **AC5 — tests.** Unit tests: the resolver truth table (direct wins, none-detaches, inherit, no-match →
  null), no-double-count, migration idempotency, two-goals-one-project validation error, attach/detach
  round-trips. `node --test`; green.
- [x] **AC6 — docs.** `schema.md` documents the new task fields + resolution rule; SKILL.md documents
  attach/detach. Conforms to `skill-patterns.md §A–§L`.
- [x] **AC7 — release-prereq scope (§G).** No release-prereq tasks in build waves — plan Release prerequisites
  section only.

## Build outcome (Loop 2 — 2026-07-05)

Built on `feat/260705-ebm` (impl commit 58072700); D9 dep-merge brought S1 (`feat/260705-hbe`) into the
worktree first. All 7 ACs satisfied.

- **lib.js** — task schema → v3: `FIELD_ORDER` gains bare `goal:`/`milestone:`; `normalizeTaskSchema` (mirrors
  `migrateWorkstreamKey` — key-presence only, idempotent, wired into `loadAllItems`) adds them + stamps
  `schema_version:3` on any `<3` file (AC1). Goals gain an `attached_projects` list field (`GOAL_LIST_FIELDS`,
  parsed/serialized as `[a, b]`/`[]`); `buildProjectGoals` folds them into the `{slug→goalId}` map and rejects a
  project on two goals (`registry.json` never load-bearing — D8/AC2). Pure `effectiveGoal`/`effectiveMilestone`
  resolvers (none-detaches / direct-wins / inherit / else-null; milestone only when goal set directly — single
  function ⇒ no double-count, INV-4/5). `attachTaskToGoal`/`detachTask({clear})`/`attachProjectToGoal`/
  `detachProject` each validate the target BEFORE any write (attach-to-missing throws, mutates nothing — INV-6).
- **serve.js** — new tasks born at `schema_version:3` with bare attachment keys, so the read-path normalizer
  never rewrites a fresh task out from under a client's optimistic-concurrency version token (caught by the
  live API test regressing before the fix).
- **tests/run.mjs** — `testAttachment()`: migration idempotency, the full resolver truth table, no-double-count,
  two-goals-one-project error, attach/detach round-trips, write-nothing-on-error. Full suite **201 passed, 0 failed**.
- **schema.md** — task `goal:`/`milestone:` fields, effective-goal resolution rule, goal `attached_projects` +
  the map-lives-here (not `registry.json`) note; `schema_version`→3.
- **SKILL.md** — Phase 17 attach/detach (NL-first, task/project target disambiguation); `argument-hint` + routing row.
- **Live dogfood** — attached a project → 3 tasks inherit; overrode one task to a second goal (direct wins);
  detached one → `none` (null); direct + milestone → `effectiveMilestone` resolves; 3 invalid attaches errored
  cleanly; `attached_projects` persisted.
- **Gates** — lint-flags-vs-hints / lint-phase-refs / audit-recommended (2 calls / 1 Recommended / 1 defer-only) /
  lint-non-interactive-inline (59 skills): all PASS. skill-eval-check **15 pass / 3 fail** — the 3
  (learnings-load-line, Capture-Learnings phase, Track Progress) are **pre-existing + structural** to a
  verb-dispatch router (merge base fails them too — no regression). No release-prereq edits (§G / AC7).

Unblocks final sibling story **260705-f79** (pace signals & surfacing). Impl awaits Loop-3 `/complete-dev --epic`.
