---
schema_version: 1
id: 260702-b6q
title: "/morning-brief core coverage — source abstraction + sweep, GTD-4D categorize/rank, show-everything brief with coverage manifest, /mytasks read-only lane, cursor"
type: feature
kind: story
status: planned
route: skill
priority: should
labels: [pmos-toolkit, morning-brief, coverage, connectors, skill]
created: 2026-07-02
updated: 2026-07-02
parent: 260702-kck
dependencies: []
design_doc: docs/pmos/features/2026-07-02_morning-brief/02_design.html
plan_doc: docs/pmos/features/2026-07-02_morning-brief/stories/260702-b6q/03_plan.html
feature_folder: docs/pmos/features/2026-07-02_morning-brief/
worktree:
---

## Context

The read-only half of the NEW pmos-toolkit skill `/morning-brief`: everything from declared sources to an
emitted brief, with zero mutations. Grounded in the epic `design_doc:` (`02_design.html`) — data model (§3),
source abstraction (§4), verbs (§5), pipeline steps 1–4 + 8 (§6), manifest (§7), artifact (§8), policy notes
(§11), decisions D1–D3, D5–D7, D9–D10. Invariants INV-1 (derive, don't store), INV-2 (show everything,
structurally), INV-3 (user-declared, never assumed), INV-4 (privacy residency) all bind here. The batch
confirm / act / correct lane (§6 steps 5–7, §9) is story 260702-ww7, which extends this SKILL.md.

## Acceptance Criteria

- [ ] **AC1 — skill + verbs.** `plugins/pmos-toolkit/skills/morning-brief/SKILL.md` exists at the canonical
  path with the three-verb surface (bare run · `sources` · `rules` — D1); bare run with no `sources.yaml`
  routes into guided setup. In this story the bare run executes §6 steps 1–4 + 8 and then STOPS after
  emitting the brief (prints the action-proposal lane as informational only; the confirm/act lane lands in
  ww7).
- [ ] **AC2 — sources verb + config.** Guided setup writes `~/.pmos/morning-brief/sources.yaml` per §3:
  per-source id/kind/connector/priority/dismiss/scope plus `settings.first_window_days` (default 7, D9) and
  `settings.carryover_horizon_days` (default 14, D10). Priority is user-indicated, never suggested from
  observed volume (INV-3).
- [ ] **AC3 — sweep.** The run resolves each declared source's connector at run time (ToolSearch by hint,
  D5) and sweeps per the §4 kind contracts: new-since-cursor + still-unresolved-in-source carryover within
  the horizon. An unreachable source is recorded as failed-with-reason and never aborts the run.
- [ ] **AC4 — categorize + rank.** Items are categorized against `rules.md` (seeded GTD-4D taxonomy on
  first use; cold start, no priors); un-matched items are flagged `no-rule-matched`. Ranking places every
  item in exactly one of three prominence tiers; heuristics affect prominence only, never inclusion (INV-2).
- [ ] **AC5 — brief artifact.** A self-contained static HTML brief is written to
  `~/.pmos/morning-brief/briefs/YYYY-MM-DD.html` (same-day suffixing, D7) with the §8 layout: header with
  window + one-line coverage status, manifest, three tiers, `/mytasks` read-only lane, per-source collapsed
  FYI counts, per-item source badge / category / why-this-tier / deep link. No external requests; nothing
  written inside any repo (INV-4).
- [ ] **AC6 — coverage manifest.** Per §7: per-source swept/failed status, script-computed counts (§H),
  cursor window, `no-rule-matched` list, and per-source beyond-horizon counts (D10).
- [ ] **AC7 — /mytasks lane.** Due / overdue / check-ins / waiting-on read from the `/mytasks` store via its
  own lib, rendered read-only (INV-6).
- [ ] **AC8 — cursor.** `cursor.yaml` written atomically at end of run, only when all reachable sources
  swept cleanly (D6); no other run-state persists (INV-1).
- [ ] **AC9 — rules verb.** `/morning-brief rules` shows `rules.md` and supports add / edit / retire
  (delete) — FR-10.
- [ ] **AC10 — scripts + tests.** Deterministic work (cursor I/O, sources parse/validate, manifest counts,
  brief render from a JSON model) in zero-dependency Node scripts, each with `--selftest`, all green.
- [ ] **AC11 — non-interactive.** Steps 1–4 run unattended; setup DEFERs (free-form); W14 block inlined
  byte-identical; `audit-recommended.sh` green.
- [ ] **AC12 — conformance.** `skill-patterns.md §A–§L`; `skill-eval` `[D]`+`[J]` pass (or residuals proven
  pre-existing); 4 hygiene lints green.
