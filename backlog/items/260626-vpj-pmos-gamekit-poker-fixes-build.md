---
schema_version: 1
id: 260626-vpj
kind: story
parent: 260626-fdh
title: "/poker layout + random-table fixes — hero-seat/action-bar overlap; random mode ≥2 opponents"
type: feature
priority: should
route: skill
dependencies: []
plugin: pmos-gamekit
status: planned
feature_folder: docs/pmos/features/2026-06-26_poker-fixes/
plan_doc: docs/pmos/features/2026-06-26_poker-fixes/stories/260626-vpj/03_plan.html
tasks: docs/pmos/features/2026-06-26_poker-fixes/stories/260626-vpj/tasks.yaml
worktree:
claimed_by:
driver_holder:
build_branch:
build_commit:
labels: [pmos-gamekit, poker, polish, bug]
created: 2026-06-26
updated: 2026-06-26
---

<!-- status: planned at define (Loop 1); tasks.yaml authored, route:skill. Build via /skill-sdlc build --story 260626-vpj -->

## Context

The whole epic (260626-fdh) is one story: both fixes edit the single self-contained game file
`plugins/pmos-gamekit/skills/poker/game/poker.html`. Decisions, FRs, and invariants are in the `design_doc:`
(../../02_design.html). One `/execute` run.

- **F1** — hero seat overlaps the action-bar status text: apply both levers — fixed clearance below the felt
  (`margin-bottom` ~30px on `.table-wrap` / larger `.table-col` gap) AND pull the hero slot up
  (`SLOTS[0].t` 92 → ~88). The overhang grows as the felt shrinks, so the ~640px width is the gating case.
- **F2** — random mode floor: `newGame()` (line ~1239) `numBots = 2 + Math.floor(rng()*4)` → 2..5 opponents.

## Acceptance Criteria

- **AC1 (F1, overlap):** On the table view the hero ("You") seat block (holecards + nameplate + betchip + lastact)
  never overlaps `.actionbar` / `.actionbar .msg`; clearance verified at desktop (1280px), tablet, and narrow
  (~640px) widths; both levers applied (clearance below felt + `SLOTS[0].t` reduced). (FR1, D2)
- **AC2 (F2, floor):** Selecting "Random" deals at least 2 opponents (3-to-6-handed) — never heads-up; random ∈
  {2,3,4,5} opponents; the new-game log singular/plural wording stays correct. (FR2.1/2.2/2.4, D3)
- **AC3 (F2, scope):** Explicit opponent-count buttons are unaffected — only the auto-random path gets the floor;
  the random upper bound stays 5 opponents. (FR2.3)
- **AC4 (no layout regression):** The F1 clearance does not clip the felt, push it off-screen, shrink it below
  usability, or displace opponent seats / the references panel; the table reads correctly at all three widths. (Inv-4)
- **AC5 (engine + harness intact):** Both changes are presentation/UI-config only — no DOM enters `PokerEngine`, and
  the deal / hand evaluation / betting / side-pots / showdown are unchanged; `node tests/run.mjs --selftest` stays
  green (if F2 adds a pure `randomSeatCount` helper it is exported + covered and the EXPECTED count updated). (Inv-1/2/5, D5)
- **AC6 (skill conformance):** `SKILL.md` + game conform to `skill-patterns.md §A–§L` and host `CLAUDE.md` (canonical
  skill path `plugins/pmos-gamekit/skills/poker`, gamekit launch contract). No version-bump / changelog / README
  tasks here — those are `/complete-dev`'s. (D6)
