---
schema_version: 1
id: 0613-rhf
kind: story
parent: 0613-5pq
title: Implement /complete-dev multi-epic release + non-interactive ship-all — multi-select picker, id-list, outer sequential train loop, stop-and-report
type: enhancement
priority: should
status: done
route: skill
dependencies: []
feature_folder: docs/pmos/features/2026-06-13_complete-dev-multi-epic-release/
plan_doc: docs/pmos/features/2026-06-13_complete-dev-multi-epic-release/stories/0613-rhf/03_plan.html
tasks: docs/pmos/features/2026-06-13_complete-dev-multi-epic-release/stories/0613-rhf/tasks.yaml
worktree: ../agent-skills-0613-rhf
claimed_by:
driver_holder:
labels: [pmos-toolkit, complete-dev, release-train, non-interactive]
created: 2026-06-13
updated: 2026-06-13
released:
---

<!-- status: planned at define (Loop 1); plan_doc + tasks.yaml authored. Build via /feature-sdlc build --story 0613-rhf -->

## Context

The single build story for epic `0613-5pq`. Revises the existing pmos-toolkit `/complete-dev` skill (a doc-only skill change — `SKILL.md` plus, if needed, a small note in `reference/lastrun-schema.md`) against the design contract `docs/pmos/features/2026-06-13_complete-dev-multi-epic-release/02_design.html` and the standing skill-authoring criteria (`feature-sdlc/reference/skill-patterns.md §A–§L`, repo `CLAUDE.md` conventions). One `/execute` run = one PR.

**Surgical-edit constraint:** the per-epic `#epic-train` body must stay byte-unchanged (invariant I1). The change is purely additive — multi-epic *selection* in Phase 0 step 1 and an *outer loop* wrapping the existing train. Do not refactor the train's internals.

## Acceptance Criteria

(Inherited verbatim from epic `0613-5pq` — they are the change-set for this story.)

- [ ] AC1 — Interactive bare `/complete-dev --epic` presents a multi-select picker of release-ready epics and ships each selected epic's full train sequentially.
- [ ] AC2 — `/complete-dev --epic <id1>,<id2>` ships exactly those epics, in order, in both modes; each precondition-checked (D16).
- [ ] AC3 — `/complete-dev --epic --non-interactive` (no ids) ships ALL release-ready epics with no prompt; empty queue → rollup + exit 0.
- [ ] AC4 — The loop stops at the first failed epic, leaves it `blocked`, attempts no further epics, and prints a per-epic shipped/failed/not-attempted summary noting shipped epics are irreversible.
- [ ] AC5 — Each epic releases independently: `--plugin` re-resolved per epic, independent bump + tag + changelog + push; the per-epic `#epic-train` body is byte-unchanged (invariant I1).
- [ ] AC6 — `--stories` with a multi-epic set refuses (exit 64); still valid with a single `--epic <id>`.
- [ ] AC7 — Per-epic destructive DEFER gates preserved; a DEFER-abort halts the loop. The W14 inline block is unchanged.
- [ ] AC8 — All doc surfaces updated in lockstep (argument-hint, `## Arguments`, Phase 0 step 1, `#epic-train`, the amended D23/D9 note); flags-vs-hints + phase-ref lints green; `skill-eval.md` floor still passes.
- [ ] AC9 — Release prerequisites listed under the spec/plan's `## Release prerequisites` only, NOT as `/execute` wave tasks (skill-mode scope rule).

## Notes

Plan + `tasks.yaml` authored at define time (this loop). Build via `/feature-sdlc build --story 0613-rhf` (or `build --next`).

### Build 2026-06-13 (route:skill, `--non-interactive` via `/loop`) — PASS → done

Built on `feat/0613-rhf` (worktree `../agent-skills-0613-rhf`); branch + worktree retained for the Loop-3 release train (`/complete-dev --epic 0613-5pq`). Surgical additive edit: `complete-dev/SKILL.md` (+ a leading ToC to `reference/lastrun-schema.md`); 39 insertions / 8 deletions.

- **T1–T5 done.** argument-hint widened to `[--epic [<id>|<id1>,<id2>,…]]`; `## Arguments` `--epic`/`--stories` entries + NL equivalents; Phase 0 `#sanity-state` ordered-epic-set resolution (multiSelect interactive, NI ship-all mode branch D1/D9, id-list both modes, `--stories` guard D7); `#epic-train` outer sequential loop + stop-and-report + per-epic outcome summary; D23 amended → D9 (dated pointer).
- **AC1–AC9: all PASS.** I1 verified — `#epic-train` steps 1–6 byte-unchanged vs main. I4 verified — W14 inline block byte-unchanged (lint green).
- **Gates green:** `[D]` skill-eval 22/0 (+ idempotent `/verify` re-run); `lint-flags-vs-hints`, `lint-phase-refs`, `lint-non-interactive-inline` (41/41), `audit-recommended` (8 calls, all marked) all PASS; release-prereq scope clean (AC9).
- **`/skill-eval` `[J]` (ran once):** 25/29 pass. 1 in-scope fix applied (`k-one-fact-one-home` — DEFER-gate mention rephrased to a pointer). **3 accepted residuals (pre-existing, not introduced by this story; KNOWN, carried forward):** `j-phases-integer` (Phase 0a/15a/16a established structure — refactor barred by surgical-edit scope), `l-dispatch-model-tier` (coherence reviewer dispatch sits inside the I1-locked byte-unchanged `#epic-train` step 2 — fixing would violate I1), `e-script-selftest` (`diff_router.sh` self-test docs out of scope). Recommend grooming these as a separate complete-dev hygiene story.
