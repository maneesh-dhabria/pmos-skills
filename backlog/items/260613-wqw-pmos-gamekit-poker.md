---
schema_version: 1
id: 260613-wqw
kind: epic
title: pmos-gamekit — /poker (No-Limit Texas Hold'em, single-player vs heuristic bots, cash game)
type: feature
priority: could
status: released
route: skill
dependencies: [260613-4mw]
feature_folder: docs/pmos/features/2026-06-13_pmos-gamekit-poker/
requirements_doc:
spec_doc:
design_doc: docs/pmos/features/2026-06-13_pmos-gamekit-poker/02_design.html
labels: [pmos-gamekit, poker, texas-holdem, browser-game, game-launcher]
created: 2026-06-13
updated: 2026-06-15
released: 0.5.0
---

## Context

From maintainer request (2026-06-13): add a second game to `pmos-gamekit` — `/poker`, a single-player No-Limit **Texas Hold'em** game played against bots in the browser. Same delivery shape as `/solitaire`: a single self-contained HTML file (all CSS+JS embedded, offline, no persistence) launched via the existing `_shared/game-launcher/` serve substrate. Reference/inspiration for the engine logic: the maintainer's `poker-coach` project (`/Users/maneeshdhabria/Desktop/Projects/personal/poker-coach`) — a full TypeScript NLHE engine (hand eval, side pots, heuristic bots, equity) that confirms every piece is pure logic and is ported, not invented.

Design contract (the cross-skill coherence doc the story cites by anchor): `docs/pmos/features/2026-06-13_pmos-gamekit-poker/02_design.html`.

### Hard dependency (maintainer-requested)

This epic **depends on epic `260613-4mw`** (pmos-gamekit plugin + `_shared/game-launcher/` substrate + `/solitaire`). At define time `260613-4mw` is **built but not yet released** — the plugin scaffold and the launcher substrate live only on branch `feat/260613-c31`, not on `main`. `/poker` cannot be built or released until `pmos-gamekit` and the launcher exist on `main` (Loop-3 `/complete-dev --plugin pmos-gamekit` `v0.1.0`). The build story `260613-kw5` carries `dependencies: [260613-4mw]`, so Loop-2 `/backlog next` will not pick `/poker` until the solitaire work is `done`/`released`.

### Maintainer decisions captured at define (2026-06-13, AskUserQuestion grill)

- **D1 — Delivery: ship a pre-built bundled game** (inherits /solitaire D1). Tested single-file `poker.html`, launched — no per-run LLM regeneration.
- **D2 — Launch: reuse `_shared/game-launcher/` verbatim** (inherits /solitaire D2). Zero-dep Node server + auto-open; Node hard prerequisite; no silent `file://` fallback. Launcher unchanged.
- **D3 — Game: No-Limit Texas Hold'em, cash-game format.** Fixed blinds; top up to a starting stack each hand; play indefinitely (over tournament / both).
- **D4 — Table: 6-max, random number of opponents (1–5 bots) per new game.** Engine handles multi-way pots + **side pots**; positions/blinds rotate.
- **D5 — Bots: heuristic + hand-strength** (over simple rule-based and over equity-aware Monte-Carlo personas). Ported from `poker-coach`'s heuristic bot: made-hand strength + draw potential, pot odds, position, light randomized bluffing.
- **D6 — Pure play, no coaching** (no per-decision verdict, no equity panel). Optional light hints (hand name, pot odds) explicitly out of scope for v1.
- **D7 — No persistence** (inherits /solitaire D6). Fresh session each launch; no chip carryover, no stats.
- **D8 — Single-file is a hard contract** (inherits /solitaire D7). All CSS/JS embedded; offline; no build step; card faces CSS + inline SVG/Unicode.
- **D9 — Single plugin / release unit:** lands in `pmos-gamekit`; rides a minor bump (`v0.2.0`) of the already-released plugin, not a new `0.1.0`.
- **D10 — Singleton epic:** one fused story (skill + bundled game + tests = one vertical slice).

## Acceptance Criteria

- [ ] **Dependency respected:** `/poker` is built only after `pmos-gamekit` + `_shared/game-launcher/` are on `main` (epic `260613-4mw` `released`); the build story carries `dependencies: [260613-4mw]`.
- [ ] **No new plugin/substrate:** no plugin scaffold and no launcher changes beyond the routine release version bump (D9) — `serve.js` and `game-launcher.md` are consumed unchanged; `/poker` cites the substrate and states only its delta.
- [ ] **/poker skill:** `plugins/pmos-gamekit/skills/poker/SKILL.md` (`name: poker` matches dir; launch-only, prompt-free; cites `../_shared/game-launcher/game-launcher.md`) + `game/poker.html` (pre-built single-file NLHE per D1/D3/D4/D7/D8) + `tests/run.mjs`.
- [ ] **Game correctness:** standard No-Limit Hold'em — 6-max with a random 1–5 bots per new game; preflop/flop/turn/river betting with fold/check/call/bet/raise/all-in; min-raise + all-in rules; correct **side-pot** computation for multi-way all-ins; rotating button/blinds; cash top-up each hand; 5-best-of-7 hand evaluation with kickers + split pots; heuristic bots; pure play. Single file, offline, no persistence.
- [ ] **Testability (single-file AND testable):** the embedded script exposes a pure-logic engine (deck/deal, betting state machine, 7-card evaluator, side-pot calculator, showdown resolver, bot decision) decoupled from rendering on a global (`window.PokerEngine`); `tests/run.mjs --selftest` extracts + evaluates it and asserts objective gates (52 unique cards + correct distribution; hand-ranking correctness incl. kicker/split; illegal-action rejection; side-pot chip-conservation + eligibility; street advance only when betting closed; bot returns a legal action); exit 0/1 with a self-test count assertion.
- [ ] **Launch works:** `serve.js game/poker.html` binds a free localhost port, serves the file, opens the browser, prints the URL; missing-Node yields the clear actionable error (D2).
- [ ] **Dogfood (load-bearing):** real hands are played through the launcher — multiple hands incl. ≥1 showdown and ≥1 all-in with a side pot; each human action exercised; new-game re-randomizes opponent count; independent judge confirms responsive + frustration-free; gaps → fix → re-run (cap 2, then accept-residuals-and-surface).
- [ ] **Playwright end-to-end (required final-verification gate):** Playwright drives the real served game to a showdown — human fold/call/raise (slider asserted), bots act, board runs out, winner awarded with hand named, stacks update, an all-in yields a correct side-pot award, zero console errors — with a showdown screenshot as evidence. Maintainer-mandated; not deferred (Playwright provisioned if absent; only narrow named sub-checks may defer, surfaced loudly).
- [ ] **Conventions:** `/poker` passes `skill-eval.md` (floor 43/47) + repo `CLAUDE.md` (canonical path, manifest version-sync, §H–§L); zero external runtime dependencies (Node stdlib only); repo hygiene lints green where applicable.
- [ ] **Single plugin (D9):** all changes land in `pmos-gamekit`; release is a minor bump (`v0.2.0`).

## Stories

- `260613-kw5` — Build the `/poker` skill (SKILL.md + bundled `game/poker.html` NLHE + `tests/run.mjs`). route: skill. deps: `260613-4mw`. *(fused singleton — load-bearing)*
