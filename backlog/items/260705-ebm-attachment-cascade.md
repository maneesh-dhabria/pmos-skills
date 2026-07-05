---
schema_version: 1
id: 260705-ebm
title: "/mytasks goal attachment & cascade — goal:/milestone: task fields (+ schema migration), goal-file attached_projects map, effectiveGoal/effectiveMilestone resolver (inherit-by-default, per-task override), attach/detach verbs, tests"
type: feature
kind: story
status: planned
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
---

## Context

Story 2 of epic 260705-n2n. Connects tasks/projects to goals — the "connect work to goals" half.
Grounds in `02_design.html` §3, INV-4/INV-5/INV-6, decisions D5/D8. Depends on S1 (260705-hbe) for the goal
entity — D9 claim-time merge brings S1's branch into this worktree before build.

## Acceptance Criteria

- [ ] **AC1 — task fields + migration (§3.1).** Tasks gain optional `goal:` (goal id | `none` sentinel |
  empty) and `milestone:` (ref | empty) frontmatter, written as bare keys by default. Task `schema_version` → 3
  additively; absent/1/2 files stay valid via a load-time normalization mirroring `migrateWorkstreamKey` (key
  presence only; never rewrites ids or other fields; no-op once normalized).
- [ ] **AC2 — attached_projects map (D8, grill-2).** Goals carry `attached_projects: [<slug>, …]` in
  frontmatter (durable source of truth). The resolver builds the in-memory `projectGoals` map from goals'
  `attached_projects`; `registry.json` is NOT used for attachments (stays the deletable visibility cache). A
  project attached to two goals is a validation error (at most one goal per project).
- [ ] **AC3 — effective resolution (INV-4/INV-5, §3.2).** Pure `effectiveGoal(task, projectGoals)`:
  `task.goal=='none'` → null (explicit detach wins); valid `task.goal` → that goal (direct wins); else
  `projectGoals[task.project]` (inherit); else null. `effectiveMilestone(task)` = `task.milestone` only when the
  goal is set directly. A task counts toward a goal at most once (single resolution function — no double-count).
- [ ] **AC4 — attach/detach verbs (INV-6).** `/mytasks attach <task|project> <goal> [milestone]` and
  `/mytasks detach <task|project>` — attaching a project appends to the goal's `attached_projects`; attaching a
  task sets its `goal:`(+`milestone:`); detach clears (task `goal:` → `none` or empty per flag). NL-first forms.
  Attaching to a non-existent goal/milestone errors and writes nothing; no unrelated field is mutated.
- [ ] **AC5 — tests.** Unit tests: the resolver truth table (direct wins, none-detaches, inherit, no-match →
  null), no-double-count, migration idempotency, two-goals-one-project validation error, attach/detach
  round-trips. `node --test`; green.
- [ ] **AC6 — docs.** `schema.md` documents the new task fields + resolution rule; SKILL.md documents
  attach/detach. Conforms to `skill-patterns.md §A–§L`.
- [ ] **AC7 — release-prereq scope (§G).** No release-prereq tasks in build waves — plan Release prerequisites
  section only.
