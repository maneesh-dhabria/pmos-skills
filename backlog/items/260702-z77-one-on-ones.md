---
schema_version: 1
id: 260702-z77
title: "/one-on-ones — help managers run effective 1:1s: per-report rolling records (goals, performance/coaching feedback, standing themes, action items), zero-friction discussion-item capture, and actively-coached session prep grounded in a bundled 1:1 best-practices corpus"
type: feature
kind: epic
status: defined
route: skill
priority: should
labels: [pmos-managerkit, one-on-ones, 1-1, management, coaching, skill]
created: 2026-07-02
updated: 2026-07-02
design_doc: docs/pmos/features/2026-07-02_one-on-ones/02_design.html
requirements_doc: docs/pmos/features/2026-07-02_one-on-ones/01_requirements.html
feature_folder: docs/pmos/features/2026-07-02_one-on-ones/
parent:
dependencies: []
---

## Context

New pmos-managerkit skill `/one-on-ones` (charter: help me do manager work). It helps a manager run **effective**
one-on-ones with their direct reports — not merely organize notes. Shaped via `/shape`
(`docs/pmos/shape/2026-07-02_effective-one-on-ones.html`, Framing B — "per-report relationship thread").

The core object is **one rolling record per report** (`~/.pmos/one-on-ones/<report>.md`): a persistent header
(who, cadence, goals/growth focus, standing themes, open action items, operating-manual answers, and
manager-entered **performance feedback** + **coaching feedback**), a **running-agenda inbox** for zero-friction
mid-week discussion-item capture, and a reverse-chron **session log**. Prep for a 1:1 assembles all of this into a
tailored, human-first agenda; logging a session appends to the log and clears discussed inbox items.

The skill is **actively coaching** (user decision): it bakes in a bundled 1:1 best-practices corpus — an
intent-tagged question bank and named models (Grove, Horowitz 10/90, Rands' Update/Vent/Disaster, Laraway's Career
Conversations, GitLab's agenda template, Hogan's first-1:1 questions) — and nudges the manager toward human-first
openers, listening-heavy sessions, status-creep resistance, closing the loop on action items, and running the
periodic career conversation separately from the weekly tactical 1:1. The research corpus + its 4 attribution
caveats are captured in the shape brief's "Research grounding" section and carried into the design.

**Independence (user constraint):** `/one-on-ones` is **fully independent of `/interview-feedback`** — no interop,
no shared substrate, no reading its scorecards. Past performance / coaching feedback are **entered by the manager**
into the 1:1 record, never pulled from another skill. Report **identity** is anchored in `/people`
(`~/.pmos/people`); there is **no `/mytasks` dependency** (a manager may not own their reports' task lists).

**Privacy:** records live under `~/.pmos/one-on-ones/` — outside the repo, like `~/.pmos/people` and
`~/.pmos/tasks` — so sensitive employee content is never committed (local-store-hygiene precedent, not a code
dependency on `/interview-feedback`).

Full decisions (D1–D14), invariants (INV-1..4), verbs, data model, and the story split are in the `design_doc:`
(`02_design.html`).

## Acceptance Criteria

- [ ] A manager can **add a direct report** (`/one-on-ones add <name>`): the skill ensures a `/people` identity
  (offers to create one when absent — never fabricates) and creates the per-report 1:1 record with cadence, role,
  goals, and operating-manual fields — INV-1 (identity in `/people`, record owned here).
- [ ] A manager can **quick-capture a discussion item** in one command
  (`/one-on-ones note <report> "<item>"`) that appends to that report's running-agenda inbox and seeds the next
  session — zero-friction, `/backlog add`-style.
- [ ] A manager can **plan/prep a 1:1** (`/one-on-ones plan <report>`): the skill assembles a human-first agenda
  from the persistent header (goals, standing themes, performance + coaching feedback), open action items, and
  inbox items, and surfaces **actively-coached** suggestions (intent-tagged questions, human-first opener,
  status-creep + stale-action-item flags) grounded in the bundled corpus.
- [ ] A manager can **log a session** (`/one-on-ones log <report>`): capture topics, decisions, action items
  (owner + status), and questions to the reverse-chron session log; clear discussed inbox items.
- [ ] A manager can **keep report context in view** — set/update goals, standing themes, **performance feedback**,
  and **coaching feedback** in the persistent header; all manager-entered, stored only in the 1:1 record.
- [ ] A **periodic career conversation** (`/one-on-ones career <report>`, Laraway's 3-part model) is offered
  separately from the weekly tactical prep.
- [ ] The skill is **fully independent of `/interview-feedback`** — INV-2 (no import, no `_shared` cite, no
  scorecard read). Report identity uses `/people`; **no `/mytasks`** dependency — INV-3.
- [ ] Records live under `~/.pmos/one-on-ones/` and are never written inside the repo — INV-4 (privacy).
- [ ] Non-interactive: `note`/`log` run unattended (Recommended → AUTO-PICK); a missing `/people` identity or a
  missing session-content DEFERs, never fabricated.
- [ ] Conforms to `skill-patterns.md §A–§L`; passes `skill-eval` (`[D]`+`[J]`); 4 hygiene lints +
  `audit-recommended` green. Single plugin, one release unit.

## Stories

- **260702-6ks** — the `/one-on-ones` skill end-to-end: data model + record parser/serializer, the five verbs
  (`add` · `note` · `plan` · `log` · `career`) + bare overview, the bundled coaching corpus, non-interactive
  contract, and tests (no deps — singleton epic, D18 wrap).

## Release prerequisites

- pmos-managerkit `plugin.json` ×2 version bump (a new user-invocable skill → minor bump from 0.2.0).
- README row for `/one-on-ones`; changelog entry; manifest version-sync.
- All owned by `/complete-dev` (Loop 3) — never in a build wave (§G).
