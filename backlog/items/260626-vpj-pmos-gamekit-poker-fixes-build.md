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
status: released
feature_folder: docs/pmos/features/2026-06-26_poker-fixes/
plan_doc: docs/pmos/features/2026-06-26_poker-fixes/stories/260626-vpj/03_plan.html
tasks: docs/pmos/features/2026-06-26_poker-fixes/stories/260626-vpj/tasks.yaml
worktree:
claimed_by:
driver_holder:
build_branch: feat/260626-vpj
build_commit: f603bc86
labels: [pmos-gamekit, poker, polish, bug]
created: 2026-06-26
updated: 2026-06-27
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

## Build outcome (Loop 2, 2026-06-27)

BUILT on `feat/260626-vpj` (impl commit `f603bc86`, worktree kept). route:skill inner pipeline
(skill-tier-resolve T1 → execute → skill-eval → verify). **Singleton epic 260626-fdh — COMPLETES the epic
(1/1).** Both fixes are presentation/UI-config only, confined to the one self-contained game file
`game/poker.html`; the pure `PokerEngine` and the engine selftest are untouched (Inv-1/Inv-2/Inv-5).

Three edits (`game/poker.html`):
- **F1 lever 1 — clearance below the felt:** `.table-wrap { … margin-bottom: 44px }` (design D2; starting
  ~30px raised to 44px during the 3-width self-check for comfortable clearance — the margin sits below the
  width-driven aspect-ratio felt so it never shrinks/clips the felt).
- **F1 lever 2 — pull hero up:** `SLOTS[0].t` `92 → 88` (the hero's fixed-height face-up block overhangs the
  felt's bottom edge; pulling the anchor up reduces the overhang).
- **F2 — random floor:** `newGame()` `numBots = numBotsOpt || (2 + Math.floor(rng()*4))` → random ∈ {2,3,4,5}
  opponents (3-to-6-handed), never heads-up; cap stays 5 (D3, FR2.1/2.2). Explicit count buttons pass
  `numBotsOpt` and short-circuit the floor (FR2.3); plural log wording correct across the range (FR2.4).

Verification (offline, no engine change so the gate is a rendered/Playwright check per D4):
- **F1 (AC1/AC4):** Playwright bounding-rect measurement, game dealt, hero-seat-bottom vs actionbar-top, at
  **640 / 834 / 1280** + an intermediate sweep (750/790/800/820/860). **Zero hero↔actionbar overlap at every
  width**; stable clearance **21px** (640–860) rising to **45px** at 1280; felt never clipped or off-screen;
  references panel + opponent seats intact. (Two transient sub-21 readings on fresh page-load resolved to 21px
  once the flex layout settled, and were still positive/no-overlap mid-transition.) Narrow-width screenshot
  evidence at `stories/260626-vpj/dogfood/f1-narrow-640.png` (also shows the live "New game — 4 opponents …"
  log line — F2 proven in the same shot).
- **F2 (AC2/AC3):** 200k-sample range check → observed set exactly `{2,3,4,5}`, min 2 / max 5; plural wording
  correct for all values; explicit-button path (`newGame(picked || undefined)`) confirmed to honour counts
  1–5 and bypass the floor.
- **AC5:** `node plugins/pmos-gamekit/skills/poker/tests/run.mjs --selftest` → **47/47 green** (engine
  untouched; one-line UI default per D5, no helper needed). `SKILL.md` unchanged — neither fix alters controls
  or rules, so no user-facing copy changed.
- **AC6:** skill-eval `--target claude-code` **[D] EXIT 0** (17 checks pass); the 4 hygiene lints
  (non-interactive-inline, flags-vs-hints, phase-refs) + audit-recommended all **PASS** (poker has 0
  `AskUserQuestion` calls — correct for a launch-only skill). No release-prereq tasks (D6).

All 6 ACs satisfied. 0 new deps; no contract flags added; canonical skill path intact.

**Epic 260626-fdh: FULLY BUILT 1/1** → Loop-3 `/complete-dev --epic 260626-fdh`.
