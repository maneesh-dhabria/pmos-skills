---
schema_version: 1
id: 260613-7n1
kind: story
parent: 260613-5av
title: "Foundation — /mytasks schema extension (project/parent/order/recur) + workstream→project migration + id-scheme correctness fix"
type: enhancement
priority: should
status: done
route: skill
dependencies: []
feature_folder: docs/pmos/features/2026-06-13_mytasks-web/
plan_doc: docs/pmos/features/2026-06-13_mytasks-web/stories/260613-7n1/03_plan.html
tasks: docs/pmos/features/2026-06-13_mytasks-web/stories/260613-7n1/tasks.yaml
worktree:
claimed_by:
driver_holder:
build_branch: feat/260613-7n1
build_commit: 281fdb9
labels: [pmos-toolkit, mytasks, schema, migration]
created: 2026-06-13
updated: 2026-06-13
released:
---

<!-- status: planned at define (Loop 1); plan_doc + tasks.yaml authored. Build via /feature-sdlc build --story 260613-7n1 -->

## Context

Story 1 (foundation) of epic `260613-5av`. Extends the `/mytasks` file model with the four
new fields the web UI and Todoist-class features need, migrates the existing `workstream`
field to `project`, and folds in the pre-existing id-scheme correctness fix. No web, no new
CLI verbs yet (those are Stories B/C) — this is the data-model + correctness foundation both
later stories build on. One `/execute` run = one PR. Design contract:
`docs/pmos/features/2026-06-13_mytasks-web/02_design.html` (§4 data model, §6 id fix);
standing criteria `feature-sdlc/reference/skill-patterns.md §A–§L`, repo `CLAUDE.md`.

## Acceptance Criteria

- [ ] **Schema fields:** `schema.md` documents `project:` (replaces `workstream:`),
      `parent:` (optional id; subtask = full child task), `order:` (optional integer; manual
      sort within a project), `recur:` (optional recurrence rule). `schema_version` bumped;
      enum table + defaults updated; empty-optional bare-key binding preserved (new optional
      fields written as bare keys, never omitted).
- [ ] **Subtask + recurrence semantics documented:** completing a parent does NOT auto-complete
      children (independent status); on `complete` of a task with non-empty `recur:`, the task is
      marked completed and a NEW task (fresh `<YYMMDD>-<rand3>` id, same fields incl. `recur:`)
      is minted with `due`/`start` advanced — the spawn-new-instance model (D8). Recurrence rule
      grammar finalized (which phrases; how `due`/`start` advance; month-clamping reusing the
      existing check-in `monthly` last-day rule).
- [ ] **Migration:** an idempotent pass renames `workstream:`→`project:` in every
      `~/.pmos/tasks/items/**.md` and `archive/**.md`, folded into `rebuild-index` (Phase 12);
      runs once, safe to re-run; tasks with no value land in Inbox (no `project:`).
- [ ] **INDEX binding updated:** `INDEX.md` format reflects `project` (was `workstream`); decide
      and document whether subtask nesting surfaces in INDEX or stays flat (design §9 open item —
      resolve here).
- [ ] **ID correctness fix:** Phase 6 `#show` locate/normalize triple-accepts
      `<YYMMDD>-<rand3>` / `<MMDD>-<rand3>` / legacy `0001` (per `_shared/tracker-crudl.md §2.1`);
      locate via `items/{id}-*.md` glob with NO "zero-pad to 4 digits" mangling of non-serial ids.
- [ ] **Examples/fixtures refreshed:** stale `0042`/`0001` examples updated to representative
      date-rnd ids in `schema.md`, `output-formats.md`, `tests/scenarios.md`, `tests/fixtures/**`;
      ≥1 legacy-id fixture retained to prove the triple validator still accepts old files.
- [ ] **Quality:** passes `skill-eval` ([D]+[J]) per `skill-patterns.md §A–§L`; non-interactive
      block byte-identical; canonical skill path; repo lints (flags-vs-hints, phase-refs,
      non-interactive-inline, audit-recommended) green; no release-prereq tasks in the plan.

## Notes

Design + decisions: `docs/pmos/features/2026-06-13_mytasks-web/02_design.html`. Build first
(044 + yfr depend on this story's schema + migration). All three stories ship together at epic
release (Loop 3).
