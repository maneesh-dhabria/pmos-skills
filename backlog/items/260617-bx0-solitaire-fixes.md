---
schema_version: 1
id: 260617-bx0
kind: epic
title: "/solitaire first-run fixes (header wording, per-game card backs, idle auto-hint, no-moves detection, draw animation)"
type: feature
status: released
priority: should
labels: [pmos-gamekit, solitaire, polish]
route: skill
created: 2026-06-17
updated: 2026-06-18
defined: 2026-06-17
source: docs/pmos/features/2026-06-17_solitaire-fixes/02_design.html
feature_folder: docs/pmos/features/2026-06-17_solitaire-fixes/
design_doc: docs/pmos/features/2026-06-17_solitaire-fixes/02_design.html
parent:
dependencies: []
released: v0.8.0
---

## Context

`/solitaire` is a launch-only pmos-gamekit skill serving one self-contained, offline Klondike file
(`plugins/pmos-gamekit/skills/solitaire/game/solitaire.html`, ~820 lines) through the shared game launcher.
All gameplay lives in that file; the engine (`window.SolitaireEngine`) is a pure, browser-agnostic module
(`isLegalMove`/`applyMove`/`clone`/`newGame`/`isWin`/`findFoundationMove`/…) and the UI/render layer renders it.

The maintainer reported five first-run rough edges, all confined to that single file:

- **F1** — remove "Klondike" from the user-facing header (`<title>` + `<h1>`).
- **F2** — the card back should change every game; ship a curated set of covers.
- **F3** — auto-hint a possible move after a period of inactivity.
- **F4** — detect when no moves are possible and suggest dealing a new game.
- **F5** — the draw animation (waste fan shift + card slide) feels poor.

Product decisions on the two open questions were resolved with the maintainer up front:
**card backs** = ship ~6 curated CSS/SVG covers, auto-rotate one per game, no picker (D2);
**draw animation** = animate the drawn card flying stock→waste with the fan easing into place (D5).
Full FRs (FR1–FR5), decisions (D1–D8), and the coherence invariants (Inv-1..Inv-5) live in the
`design_doc:` (02_design.html).

All five touch the same one file and ship as one `/solitaire` release, so this is a **one-story skill epic**
(D24 litmus: tightly coupled, not independently shippable). **Out of scope:** a card-back picker UI (deferred,
D2 runner-up); any rules change (stays Klondike); version-bump / changelog / README work (`/complete-dev`'s).

## Story split

- **260617-ks1** — `/solitaire` first-run fixes batch (all five F1–F5 in `game/solitaire.html` + engine selftests).
  `route: skill`, plugin `pmos-gamekit`, no dependencies. One `/execute` run.

## Acceptance Criteria

- Header shows "Solitaire" (no "Klondike") in both `<h1>` and `<title>`; rules unchanged.
- Each new game shows a randomly-chosen, self-contained card back from a curated set; fixed for that game; no network/assets.
- After ~8s idle, the first productive legal move is outlined (manual `H` reuses the same finder); clears on interaction.
- When no productive move exists across a full stock cycle (and not won), a non-blocking "deal a new game?" banner appears — never on a winnable position.
- Drawing animates the card from stock to the top of the waste fan with the fan easing into place; honors `prefers-reduced-motion`; rapid draws degrade cleanly.
- Engine stays pure (new finders/deadlock helpers exported + covered in `tests/run.mjs`); cosmetic features never enter undo/history.
