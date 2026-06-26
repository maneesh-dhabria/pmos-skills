---
schema_version: 1
id: 260626-j9v
kind: story
title: "/mytasks import — paste a text outline, parse (indentation/markers + AI fallback) into projects/tasks/subtasks/labels, confirm the tree, then write items"
type: enhancement
priority: should
status: planned
route: skill
parent: 260626-a8a
dependencies: [260626-71x]
worktree:
plan_doc: docs/pmos/features/2026-06-26_mytasks-web-enhancements/stories/260626-j9v/03_plan.html
tasks_file: docs/pmos/features/2026-06-26_mytasks-web-enhancements/stories/260626-j9v/tasks.yaml
claimed_by: null
pr:
labels: [pmos-toolkit, mytasks, import]
created: 2026-06-26
updated: 2026-06-26
---

## Context

A new `/mytasks import` subcommand that turns a pasted text outline into tasks. Agent-driven (I5): the skill
instructs the model to parse the blob — honoring obvious structure, AI-inferring the ambiguous remainder
(D3) — then confirm before writing. Writes reuse `lib.js` (frontmatter serialize, slugify, INDEX regen) and
`mint-id.mjs`; new projects/labels go through the registry from `260626-71x`.

Epic design: `docs/pmos/features/2026-06-26_mytasks-web-enhancements/02_design.html` (§7). Invariants I2
(no new fields), I5 (agent-driven, not a server endpoint).

## Acceptance Criteria

- [ ] **A1 — Subcommand routing.** `/mytasks import` is a new phase in `SKILL.md` (`#routing` table + a
  `#import` phase). The text to import is taken inline (pasted after the command, or prompted for if absent
  and interactive); `argument-hint` updated.
- [ ] **A2 — Structure-first parse (D3).** The parser honors, in order: leading `#project` line/token →
  project container; indentation / nesting depth → subtask relationship (child of the nearest shallower
  line); bullet & checkbox markers (`-`, `*`, `- [ ]`) → task lines; `+label` tokens → labels; `@handle`
  tokens → people; trailing natural-language dates → `due`. Documented in `#import`.
- [ ] **A3 — AI fallback.** Lines/relationships not resolvable by structure are inferred by the model
  (e.g. a flat list with a header line that reads like a project; a "subtasks of X" phrasing). The skill
  states exactly when structure wins vs. when inference is used (structure always wins on conflict).
- [ ] **A4 — Confirm before writing.** The parsed tree is presented for confirmation — printed inline as an
  indented preview (projects → tasks → subtasks, with inferred labels/people/dates shown) AND genuine
  ambiguities resolved via `AskUserQuestion` (e.g. "Is 'Q3 launch' a project or a task?"). Nothing is written
  until confirmed. Under `--non-interactive` the canonical block applies: AUTO-PICK the recommended
  interpretation and record deferred ambiguities as open questions (no blocking prompt).
- [ ] **A5 — Write.** On confirm: mint a `<YYMMDD>-<rand3>` id per task/subtask (`mint-id.mjs`), set
  `parent` for subtasks, `project`/`labels`/`people`/`due` per the parse, write item files via `lib.js`
  atomic write, register any new project/label (registry), regenerate `INDEX.md` once at the end. People
  tokens are resolved via `/people find` (unresolved tokens are flagged in the report, not invented).
- [ ] **A6 — Report.** A summary report (per `output-formats.md` style) lists every created task/subtask with
  its id, project, and inferred fields; flags any unresolved `@handle`; states the new projects/labels
  created.
- [ ] **A7 — Tests.** Parser fixtures in `tests/` cover: pure-indentation outline, marker-based list,
  `#project`/`+label`/`@handle` tokens, mixed/messy input requiring inference, and the structure-wins-on-
  conflict rule. Existing tests stay green.
- [ ] Conforms to `skill-patterns.md §A–§L` (§I: `import` is a verb not a flag; the confirm prompt carries a
  `(Recommended)` option or a `defer-only` tag); non-interactive block stays inline byte-identical; skill-eval
  `[D]`+`[J]` pass; 4 lints + audit green.
- [ ] Load-bearing dogfood: import a real multi-project outline into a scratch `~/.pmos` and show the created
  files + regenerated INDEX match the confirmed tree; show the `--non-interactive` path records ambiguities as
  open questions instead of blocking.
