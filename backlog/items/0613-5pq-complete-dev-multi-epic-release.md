---
schema_version: 1
id: 0613-5pq
kind: epic
title: /complete-dev --epic multi-select + non-interactive ship-all — release several release-ready epics one-by-one in one session
type: enhancement
priority: should
status: defined
route: skill
feature_folder: docs/pmos/features/2026-06-13_complete-dev-multi-epic-release/
requirements_doc:
spec_doc:
design_doc: docs/pmos/features/2026-06-13_complete-dev-multi-epic-release/02_design.html
labels: [pmos-toolkit, complete-dev, three-loop, release-train, non-interactive]
created: 2026-06-13
updated: 2026-06-13
released:
---

## Context

A revision to the existing `/complete-dev` skill (NOT a new skill). Today `/complete-dev --epic` ships **exactly one epic per invocation**: bare `--epic` offers a *single-select* picker of release-ready epics, and decision D23 makes that picker *DEFER* under `--non-interactive` (releasing is a deliberate human trigger). So draining a queue of N release-ready epics means N separate `/complete-dev --epic` runs, and there is no lights-out path at all.

This epic adds **multi-epic selection** + an **outer sequential train loop** so several release-ready epics ship one-by-one in a single session, and makes **`--non-interactive` bare `--epic` ship ALL release-ready epics** end-to-end (a deliberate, documented amendment of D23 — the explicit `--non-interactive` invocation *is* the human trigger D23 required).

Singleton epic (D18) wrapping one build story — a single-skill revision. Route: skill (the epic carries a `design_doc:`, not an epic-level `/spec`).

Design contract: `docs/pmos/features/2026-06-13_complete-dev-multi-epic-release/02_design.html`.

### Maintainer decisions captured at define (2026-06-13)

- **D1 — non-interactive bare `--epic` ships ALL release-ready epics** (no prompt). Maintainer pick (recommended). Truest to "complete the entire deployment process"; the explicit `--non-interactive` flag is the deliberate trigger D23 required. Rejected: require-explicit-ids; ship-all-single-plugin-only.
- **D2 — stop & report on first failed epic train.** Maintainer pick (recommended). Predictable; no further trains after a failure; already-pushed epics are irreversible so the summary surfaces partial completion. Rejected: continue-and-collect.
- **D3** — interactive bare `--epic` → `multiSelect: true` picker (≥1 required).
- **D4** — `--epic <id1>,<id2>,…` comma-list accepted, mode-agnostic, each precondition-checked (D16).
- **D5** — each epic is a fully independent release (`--plugin` re-resolved per epic, independent bump + tag + changelog + push); NOT a merged super-release.
- **D6** — deterministic ship order: id-list as given; multi-select & ship-all → epic-id ascending.
- **D7** — `--stories` valid only with a single `--epic <id>`; refuse with a multi-epic set.
- **D8** — per-epic destructive DEFER gates preserved; a DEFER-abort halts the loop (D2). "Complete the entire deployment" is bounded by W14 safety gates, never bypasses them.
- **D9** — D23 amended (not deleted): the interactive picker stays a no-Recommended deliberate pick; the NI ship-all is a documented `mode == non-interactive` code branch, not an auto-pick of a deferred `AskUserQuestion`.

## Acceptance Criteria

- [ ] AC1 — Interactive bare `/complete-dev --epic` presents a multi-select picker of release-ready epics and ships each selected epic's full train sequentially.
- [ ] AC2 — `/complete-dev --epic <id1>,<id2>` ships exactly those epics, in order, in both modes; each precondition-checked (D16).
- [ ] AC3 — `/complete-dev --epic --non-interactive` (no ids) ships ALL release-ready epics with no prompt; empty queue → rollup + exit 0.
- [ ] AC4 — The loop stops at the first failed epic, leaves it `blocked`, attempts no further epics, and prints a per-epic shipped/failed/not-attempted summary noting shipped epics are irreversible.
- [ ] AC5 — Each epic releases independently: `--plugin` re-resolved per epic, independent bump + tag + changelog + push; the per-epic `#epic-train` body is byte-unchanged (invariant I1).
- [ ] AC6 — `--stories` with a multi-epic set refuses (exit 64); still valid with a single `--epic <id>`.
- [ ] AC7 — Per-epic destructive DEFER gates preserved; a DEFER-abort halts the loop. The W14 inline block is unchanged.
- [ ] AC8 — All doc surfaces updated in lockstep (argument-hint, `## Arguments`, Phase 0 step 1, `#epic-train`, the amended D23/D9 note); flags-vs-hints + phase-ref lints green; `skill-eval.md` floor still passes.
- [ ] AC9 — Release prerequisites listed under the spec/plan's `## Release prerequisites` only, NOT as `/execute` wave tasks (skill-mode scope rule).

## Stories

- `0613-rhf` — Implement the `/complete-dev` multi-epic + non-interactive change (singleton build story). route: skill.
