---
schema_version: 1
id: 260626-fdh
kind: epic
title: "/poker fixes — hero seat overlaps the action-bar status text; random mode minimum 2 opponents"
type: feature
status: released
priority: should
labels: [pmos-gamekit, poker, polish, bug]
route: skill
created: 2026-06-26
updated: 2026-06-27
released: pmos-gamekit/v0.10.1
defined: 2026-06-26
source: docs/pmos/features/2026-06-26_poker-fixes/02_design.html
feature_folder: docs/pmos/features/2026-06-26_poker-fixes/
design_doc: docs/pmos/features/2026-06-26_poker-fixes/02_design.html
parent:
dependencies: []
---

## Context

`/poker` is a launch-only pmos-gamekit skill serving one self-contained, offline No-Limit Texas Hold'em file
(`plugins/pmos-gamekit/skills/poker/game/poker.html`, ~1575 lines) through the shared zero-dependency game
launcher. All gameplay lives in that one file; the engine (`window.PokerEngine`) is a pure, browser-agnostic
module (`createHand`, the 7-card evaluator, `buildSidePots`, `decide`, `personaFor`, `randomTable`, the static
preflop reference data) and the UI/render layer (guarded by `document`) renders the felt, seats, and action bar.
Tests live in `tests/run.mjs` (engine selftest, `node run.mjs --selftest`).

The maintainer reported two first-run rough edges, both confined to that single file:

- **F1** — the bottom "You" (hero) seat overlaps the "Your move — …" action-bar status text on the table view,
  worse as the window narrows. Root cause: `.table-col` (line ~155) stacks `.table-wrap` + `.actionbar` with only
  an 8px gap; the hero seat at `SLOTS[0] = { l:50, t:92 }` (line 914) is a fixed-height block while the felt
  (`aspect-ratio: 16/10`) scales with width, so the hero's nameplate/stack overhangs the felt bottom onto
  `.actionbar .msg` (overhang grows at narrow widths). Symmetric opponent seats are unaffected (only the hero
  shows full-height face-up cards at the bottom edge).
- **F2** — "Random" opponents mode can deal a single opponent (heads-up). `newGame()` (line 1239) picks
  `1 + Math.floor(rng()*5)` → 1..5 bots.

The one genuinely open question was resolved with the maintainer up front: **"at least 2 players" = at least 2
opponents** — random deals 2–5 bots (3-to-6-handed), never heads-up (D3). The F1 fix applies BOTH levers
(fixed clearance below the felt + pull the hero slot up, D2). Full FRs (FR1–FR2), decisions (D1–D6), and the
coherence invariants (Inv-1..Inv-5) live in the `design_doc:` (02_design.html).

Both fixes touch the same one file and ship as one `/poker` release, so this is a **one-story skill epic**
(D24 litmus: confined to one file, not independently shippable). **Out of scope:** raising the random opponent
*cap* (stays 5); any engine/rules change; version-bump / changelog / README work (`/complete-dev`'s, D6).

## Story split

- **260626-vpj** — `/poker` layout + random-table fixes (F1 hero-seat/action-bar overlap + F2 random ≥2 opponents)
  in `game/poker.html`. `route: skill`, plugin `pmos-gamekit`, no dependencies. One `/execute` run.

## Acceptance Criteria

- The hero ("You") seat block never overlaps `.actionbar` / `.actionbar .msg` on the table view; verified at
  desktop (1280px), tablet, and narrow (~640px) widths; the felt is not clipped or pushed off-screen. (FR1)
- "Random" opponents always deals at least 2 opponents (3-to-6-handed), never heads-up; the upper bound stays 5;
  explicit count buttons are unaffected; the new-game log wording stays correct. (FR2, D3)
- Both changes are presentation/UI-config only — engine purity, the deal, betting, side-pots, and showdown are
  unchanged; `node tests/run.mjs --selftest` stays green. (Inv-1..Inv-5)
- `SKILL.md` + game conform to `skill-patterns.md §A–§L` and the host `CLAUDE.md` (canonical skill path, gamekit
  launch contract). No version-bump / changelog / README tasks here — those are `/complete-dev`'s. (D6)
