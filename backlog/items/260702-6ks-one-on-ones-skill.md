---
schema_version: 1
id: 260702-6ks
title: "/one-on-one skill — per-report rolling records, add/note/plan/log/career verbs, bundled coaching corpus"
type: feature
kind: story
status: planned
route: skill
priority: should
labels: [pmos-managerkit, one-on-one, skill]
created: 2026-07-02
updated: 2026-07-02
parent: 260702-z77
dependencies: []
design_doc: docs/pmos/features/2026-07-02_one-on-ones/02_design.html
plan_doc: docs/pmos/features/2026-07-02_one-on-ones/stories/260702-6ks/03_plan.html
feature_folder: docs/pmos/features/2026-07-02_one-on-ones/
worktree:
---

## Context

The whole `/one-on-one` skill for pmos-managerkit, built as one vertical slice (one `SKILL.md`, one PR). Singleton
epic (D18). Grounded in the epic `design_doc:` (`02_design.html`) — read it for the data model, verb contracts,
coaching corpus, and decisions. Independent of `/interview-feedback` (INV-2); identity via `/people` (INV-1); no
`/mytasks` (INV-3); records under `~/.pmos/one-on-ones/` (INV-4).

## Acceptance Criteria

- [ ] **AC1 — data model & store.** A record parser/serializer reads/writes `~/.pmos/one-on-ones/<report>.md`
  (frontmatter + the three body zones: persistent header, running-agenda inbox, reverse-chron session log) per
  `02_design.html#data-model`. Round-trips byte-stably; creates `~/.pmos/one-on-ones/` on first write; never writes
  inside the repo (INV-4). Unit-tested.
- [ ] **AC2 — `add`.** `/one-on-one add <name>` resolves/creates a `/people` identity (offers create when absent,
  DEFERs under `--non-interactive` — never fabricates) and scaffolds the record with cadence, role, goals, and
  operating-manual fields.
- [ ] **AC3 — `note` (quick-capture).** `/one-on-one note <report> "<item>"` appends one item to the inbox in a
  single command; unattended-safe. Optional intent tag (blocker/growth/morale/feedback-up).
- [ ] **AC4 — `plan`.** `/one-on-one plan <report>` emits a human-first prep agenda assembled from the header
  (goals, standing themes, performance + coaching feedback), open action items, and inbox items — plus
  actively-coached suggestions from the corpus (intent-tagged questions, human-first opener, and flags for
  status-heavy recent sessions + stale action items). Emits a commentable HTML prep artifact via the html-authoring
  substrate (per `02_design.html#prep-output`).
- [ ] **AC5 — `log`.** `/one-on-one log <report>` appends a dated session entry (topics, decisions, action items
  with owner+status, questions) newest-first and clears discussed inbox items; under `--non-interactive` a missing
  session body DEFERs.
- [ ] **AC6 — context management.** Verbs/flags to set-or-update goals, standing themes, **performance feedback**,
  and **coaching feedback** in the persistent header (manager-entered only).
- [ ] **AC7 — `career`.** `/one-on-one career <report>` runs Laraway's 3-part career conversation
  (Life Story → Dreams → Career Action Plan) as a session distinct from weekly prep; writes a career-plan block to
  the header.
- [ ] **AC8 — coaching corpus.** A bundled `reference/` corpus carries the intent-tagged question bank + named
  models + the 12 durable principles, honoring the 4 attribution caveats from `02_design.html#coaching-corpus`
  (10/90 = Horowitz not Grove; Laraway = "vision + short-term plan"; Hogan "Bias Toward" flagged unverified;
  Manager Tools 10/10/10 documented-canon).
- [ ] **AC9 — independence & anchors.** No import of / `_shared` cite to / scorecard read from `/interview-feedback`
  (INV-2, grep-clean). Identity via `/people`; no `/mytasks` (INV-3).
- [ ] **AC10 — conformance.** `skill-patterns.md §A–§L`; the inline non-interactive block; every `AskUserQuestion`
  carries a `(Recommended)` or a `defer-only` tag; passes `skill-eval` (`[D]`+`[J]`); 4 hygiene lints +
  `audit-recommended` green.

## Notes

Sizing: one `/execute` run. ~5 zero-dep Node scripts (record parse/serialize, add, note, plan-assemble,
log) + `SKILL.md` + `reference/` corpus + tests. Reuse the ~/.pmos personal-store + zero-dep-Node + html-authoring
patterns already established by `/people`, `/mytasks`, and `/interview-feedback` (patterns only — no code coupling).
