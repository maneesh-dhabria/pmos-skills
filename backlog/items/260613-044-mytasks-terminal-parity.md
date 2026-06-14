---
schema_version: 1
id: 260613-044
kind: story
parent: 260613-5av
title: "Terminal parity — /mytasks CLI for projects, subtasks, recurrence, manual order + quick-add token grammar + nested rendering"
type: enhancement
priority: should
status: released
route: skill
dependencies: [260613-7n1]
feature_folder: docs/pmos/features/2026-06-13_mytasks-web/
plan_doc: docs/pmos/features/2026-06-13_mytasks-web/stories/260613-044/03_plan.html
tasks: docs/pmos/features/2026-06-13_mytasks-web/stories/260613-044/tasks.yaml
worktree:
claimed_by:
driver_holder:
build_branch: feat/260613-044
build_commit: 8542224
labels: [pmos-toolkit, mytasks, cli, terminal-parity]
created: 2026-06-13
updated: 2026-06-13
released: pmos-toolkit/v2.76.0
---

<!-- status: planned at define (Loop 1); plan_doc + tasks.yaml authored. Build via /feature-sdlc build --story 260613-044 -->

## Context

Story 2 (terminal parity) of epic `260613-5av`, depends on `260613-7n1` (the schema fields +
migration must exist first; the D9 claim-time dependency merge brings 7n1's branch into this
worktree before build). Makes every web capability reachable from the Claude Code CLI: project
assignment, subtasks, recurrence, and manual order via terminal verbs, plus the Todoist-style
quick-add token grammar and nested rendering in views. No server/web yet (Story C). One
`/execute` run = one PR. Design contract:
`docs/pmos/features/2026-06-13_mytasks-web/02_design.html` (§5 quick-add, §7 terminal parity);
standing criteria `skill-patterns.md §A–§L`, repo `CLAUDE.md`.

## Acceptance Criteria

- [ ] **Extended `set` (Phase 7):** `set <id> project=<p>`, `parent=<pid>`, `recur=<rule>`,
      `order=<n>` validate + write the new fields (enum/format validation; clearing supported);
      editable-field list + skill-managed list updated.
- [ ] **Subtask capture:** `add <text> --parent <id>` (and a natural-language form) captures a
      subtask as a full child task file with `parent:` set; `add`/`refine` prompt the new fields
      where appropriate.
- [ ] **Quick-add token grammar (Phase 2/3):** bare-text capture parses `@person` (resolved via
      `/people find`, with the existing single/multi/no-match disambiguation), `#project`,
      `+label`, and natural-language dates (`inference-heuristics.md`); unresolved `@` tokens stay
      in the title and are surfaced. `@`=person convention preserved (NOT Todoist's @=label).
- [ ] **Recurrence-on-complete (Phase 9 `done`):** completing a task with non-empty `recur:`
      marks it completed AND mints the next instance (fresh id, `due`/`start` advanced, completion
      logged) — the shared spawn-new logic the web `complete` endpoint will also call (Story C).
- [ ] **Nested + project rendering:** `show`, `list`, and named views render `project`, subtasks
      (indented/grouped under their parent), and recurrence; new `in <project>` / `--project`
      filter replaces/renames the `in <workstream>` / `--workstream` filter.
- [ ] **Inference heuristics updated:** `inference-heuristics.md` documents the `#project`/`+label`
      token rules alongside the existing type/date/people/`@` rules.
- [ ] **Quality:** passes `skill-eval` ([D]+[J]) per `skill-patterns.md §A–§L`; non-interactive
      block byte-identical; argument-hint lists only contract flags (§I); repo lints green; no
      release-prereq tasks in the plan.

## Notes

Depends on `260613-7n1`. Design: `docs/pmos/features/2026-06-13_mytasks-web/02_design.html`.
The recurrence-on-complete spawn implemented here is the canonical home (§K) the Story-C web
`POST /complete` endpoint reuses — not reimplemented. Ships with the epic at Loop 3.
