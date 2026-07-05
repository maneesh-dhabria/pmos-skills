---
schema_version: 1
id: 260705-n2n
title: "/mytasks goals & milestones — a durable goal object with dated milestones, project/task attachment (project-attachment cascades to tasks), and a dual pace signal (schedule adherence + attention allocation) surfaced so goals stop going invisible"
type: feature
kind: epic
status: defined
route: skill
priority: should
labels: [pmos-toolkit, mytasks, goals, milestones, skill]
created: 2026-07-05
updated: 2026-07-05
design_doc: docs/pmos/features/2026-07-05_mytasks-goals-milestones/02_design.html
feature_folder: docs/pmos/features/2026-07-05_mytasks-goals-milestones/
parent:
dependencies: []
---

## Context

Shaped via `/shape` — problem brief at `docs/pmos/shape/2026-07-05_goals-milestones-mytasks.html`.

The shaped problem (unified framing): **Maneesh's goals live outside `/mytasks`, so they go invisible and he
steers by his reactive task list; and even when he recalls a goal he has no trustworthy signal of whether he is
on-schedule against its checkpoints or starving it of attention — so he can't tell if his daily work is adding
up.** Two co-equal jobs: **A — capture + keep visible** (goals get a durable home + surfacing) and **B — sense
the pace** (dual signal: schedule adherence via dated milestones + attention allocation via attached activity).

**Ceiling-breaker constraint (from the shape brief):** the pace signal can recreate the very problem it solves —
open-ended goals must not read "behind" forever, and stale attachment data must not cry "starved" falsely. Any
design must *earn trust in the signal*, not merely display one.

This is a **skill revision** to the shipped `/mytasks` (route: skill), single plugin (pmos-toolkit), one release
unit. Grounded in the real `/mytasks` model: global user store `~/.pmos/tasks/items/`, free-string `project`
containers, `parent:` subtasks, derived-on-read index (`lib.js`), web app (`webapp/` + `serve.js`), shared
`_shared/tracker-crudl.md` contract.

## Acceptance Criteria

- [ ] A durable goal entity lives in `/mytasks` (`~/.pmos/tasks/goals/`) with embedded dated milestones, a
  dated/open-ended type, and a per-goal cadence; goals are captured, shown, and archived via new verbs.
- [ ] Tasks and projects attach to goals; project attachment cascades to tasks (inherit-by-default, per-task
  override wins); a task counts toward a goal at most once.
- [ ] Two trustworthy pace signals per goal — schedule adherence (dated goals) + attention allocation
  (per-goal cadence, real-progress-only) — plus derived+manual progress, none of which cry wolf (open-ended
  goals never "behind"; zero-task goals read "no tasks yet"; trivial edits don't feed a goal).
- [ ] Goals surface in a `/mytasks goals` view, a compact index summary (behind/starved only), and a
  `/morning-brief` hook; read-only web display.
- [ ] Backwards compatible (existing tasks stay valid; additive schema bump). Conforms to `skill-patterns.md
  §A–§L`; `skill-eval` (`[D]`+`[J]`) passes; 4 hygiene lints + `audit-recommended` green. Single plugin, one
  release unit.

## Stories

- **260705-hbe** — goal & milestone core (§2): new goal file kind, embedded milestones, enums, goal/milestone
  CRUD verbs, lib.js load/save, schema.md, tests. Deps: none.
- **260705-ebm** — attachment & cascade (§3): `goal:`/`milestone:` task fields + migration, goal-file
  `attached_projects` map, effective-resolution (inherit-by-default, per-task override), attach/detach, tests.
  Deps: 260705-hbe.
- **260705-f79** — pace signals, progress & surfacing (§4+§5): schedule + attention signals, derived+manual
  progress, `goals` view + index summary + morning-brief hook + read-only web, tests. Deps: 260705-hbe,
  260705-ebm.

## Release prerequisites

- pmos-toolkit `plugin.json` ×2 version bump (new capability on an existing skill → minor).
- Changelog entry; manifest version-sync; no new README row (existing skill).
- All owned by `/complete-dev` (Loop 3) — never in a build wave (§G).
