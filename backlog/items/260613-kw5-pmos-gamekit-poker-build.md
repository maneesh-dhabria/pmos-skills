---
schema_version: 1
id: 260613-kw5
kind: story
parent: 260613-wqw
title: Build the /poker skill — single-file No-Limit Hold'em (6-max random bots, heuristic AI, side pots) + tests
type: feature
priority: could
status: done
route: skill
dependencies: [260613-4mw]
feature_folder: docs/pmos/features/2026-06-13_pmos-gamekit-poker/
plan_doc: docs/pmos/features/2026-06-13_pmos-gamekit-poker/stories/260613-kw5/03_plan.html
tasks: docs/pmos/features/2026-06-13_pmos-gamekit-poker/stories/260613-kw5/tasks.yaml
labels: [pmos-gamekit, poker, texas-holdem, game-launcher]
worktree: 
claimed_by: build:explainer-a3g-loop
driver_holder: build:explainer-a3g-loop
created: 2026-06-13
updated: 2026-06-15
build_commit: da46d4c
released: 0.5.0
---

<!-- status: planned at define (Loop 1); plan_doc + tasks.yaml authored. Build via /feature-sdlc build --story 260613-kw5 -->

## Context

The single (fused) build story for epic `260613-wqw`. There is one new skill (`/poker`) and no separable substrate — the `_shared/game-launcher/` machinery already exists (from epic `260613-4mw`) and is consumed unchanged — so the natural unit is one vertical story = one `/execute` run = one PR: `SKILL.md` + bundled `game/poker.html` + `tests/run.mjs`.

Built against the design contract `docs/pmos/features/2026-06-13_pmos-gamekit-poker/02_design.html` and the standing skill-authoring criteria (`feature-sdlc/reference/skill-patterns.md §A–§L`, repo `CLAUDE.md`). Engine logic ported from the `poker-coach` reference project (`/Users/maneeshdhabria/Desktop/Projects/personal/poker-coach`, `core/*` pure-TS NLHE engine).

### Dependency

`dependencies: [260613-4mw]` — the build loop will not pick this story until epic `260613-4mw` (pmos-gamekit + `_shared/game-launcher/` + `/solitaire`) is `done`/`released` and on `main`. The launcher substrate and the plugin must exist before `/poker` can build/launch. This is the enforcement point for the epic-level dependency.

## Acceptance Criteria

- [x] **AC1 — Skill scaffold:** `plugins/pmos-gamekit/skills/poker/SKILL.md` with `name: poker` (matches dir), launch-only + prompt-free body that resolves `game/poker.html`, asserts Node present (clear error if absent — D2, no silent `file://` fallback), invokes `../_shared/game-launcher/serve.js`, and reports the URL + in-game controls. Cites `../_shared/game-launcher/game-launcher.md`; states only the poker delta (game file, title); no restating the launch contract. Canonical NI inline block added iff `lint-non-interactive-inline.sh` requires it for prompt-free skills.
- [x] **AC2 — Single-file game (D8):** `game/poker.html` is ONE self-contained file — all CSS+JS embedded, no external references, offline, no build step; card faces CSS + inline SVG/Unicode; inline data-URI favicon (the `/solitaire` favicon-404 lesson).
- [x] **AC3 — Engine decoupled + on a global:** the embedded script exposes a pure-logic engine on `window.PokerEngine` decoupled from DOM render — deck/shuffle/deal, betting state machine (legal-action predicate, apply-action, street advance), 7-card hand evaluator (5-best-of-7, kickers, splits), side-pot calculator, showdown/winner resolver, heuristic bot decision.
- [x] **AC4 — Game rules (D3/D4/D5/D6/D7):** No-Limit Hold'em cash game; 6-max with a **random 1–5 bots per new game**; post blinds → 2 hole cards → preflop/flop/turn/river betting (fold/check/call/bet/raise/all-in with min-raise + all-in enforcement, raise slider + ½-pot/pot/all-in quick buttons); correct **side pots** for multi-way all-ins (chips conserved, eligibility correct); rotating button/blinds; top-up to starting stack each hand; showdown names the winning hand and awards/splits the pot; heuristic bots (hand strength + draws + pot odds + position + light bluffing); **pure play — no coaching/equity panel**; no persistence.
- [x] **AC5 — Polish:** chip + pot animation, winner highlight, hand/action log, "next hand" + "new game" (re-randomize opponents, reset stacks), responsive (laptop + phone), keyboard shortcuts (F fold, C check/call, R raise, Enter confirm, N next hand), accessible focus + ARIA.
- [x] **AC6 — Behavioral selftest:** `tests/run.mjs --selftest` reads `game/poker.html`, extracts the engine `<script>`, evaluates in a Node `vm`, and asserts: 52 unique cards + correct hole/board distribution; hand-evaluator correctness (ranks ordered, kicker tie-breaks, split detection — known fixtures); illegal-action rejection (sub-min-raise, out-of-turn, over-stack); side-pot math for a multi-way all-in (chip conservation + eligibility); street advances only when betting closed; bot decision returns a legal action for representative spots. Exit 0/1 with a `--selftest` count assertion.
- [x] **AC7 — Launch works:** `node _shared/game-launcher/serve.js game/poker.html` binds a free loopback port, serves the one file, auto-opens the browser (graceful degrade headless), prints the URL, runs until Ctrl-C; missing-Node → the D2 error verbatim.
- [x] **AC8 — Dogfood (load-bearing):** play real hands via the launcher — multiple hands, ≥1 showdown, ≥1 all-in producing a side pot, each human action exercised, new-game re-randomizes opponent count; independent blind judge confirms responsive + frustration-free (sensible bot pace, clear betting controls, obvious winner, no stuck/illegal-action lockups); gaps → fix → re-run (cap 2, then accept-residuals-and-surface).
- [x] **AC9 — Playwright e2e (maintainer-mandated, NOT deferred):** drive the real served game in a browser to a showdown — human fold/call/raise (raise-slider asserted in DOM), bots act, board runs out, winner awarded with hand named, stacks update, an all-in yields a correct side-pot award, **zero console errors**; showdown screenshot captured as evidence. Playwright provisioned if absent; only narrow named unreachable sub-checks may defer (surfaced loudly).
- [x] **AC10 — Gates + conventions:** Phase 6a skill-eval [D] all-pass + [J] ≥ floor (43/47); 4 repo hygiene lints green (flags-vs-hints, phase-refs, non-interactive-inline, audit-recommended); zero external runtime deps (Node stdlib only); single-file contract holds; canonical path + manifest version-sync (`v0.2.0` minor bump at release, D9) honored.

## Tasks

See `tasks.yaml` (authored at define). Summary:

- **T1** — Study `poker-coach` `core/*` (eval, gameEngine, sidepots, botEngine/personas, handFlow) + the `/solitaire` `game/solitaire.html` structure + `game-launcher.md` contract.
- **T2** — Engine (TDD): `window.PokerEngine` — cards/deck/deal, hand evaluator (7-best-of-5), betting state machine, side-pot calculator, showdown resolver, heuristic bot. `tests/run.mjs --selftest` drives this.
- **T3** — Render/UI layer over the engine: table, seats, board, pot, betting controls (slider + quick bets), animations, log, keyboard, responsive, ARIA; inline favicon.
- **T4** — `SKILL.md` (launch-only, cites substrate; NI block iff lint demands).
- **T5** — Load-bearing dogfood (objective + blind-judge subjective; cap-2 fix loop).
- **T6** — Playwright e2e to showdown (NOT deferred) + skill-eval [D]/[J] + 4 lints.

## Build Notes (Loop 2 — 2026-06-15)

BUILT on `feat/260613-kw5`, build commit `da46d4c`. route:skill. All 10 ACs verified.

- **Three files, one new skill:** `plugins/pmos-gamekit/skills/poker/{SKILL.md, game/poker.html, tests/run.mjs}`. The `_shared/game-launcher/` machinery is consumed unchanged. Modeled on the shipped `/solitaire` + `/snake` (engine-on-a-global, vm-extract selftest, launch-only SKILL.md, inline data-URI favicon).
- **Engine (`window.PokerEngine`):** faithful port of the `poker-coach` `core/*` pure-TS NLHE engine to browser/vm-compatible JS. Pure, DOM-decoupled, deterministic given an injected RNG (Date-free / Math.random-free, so it runs in a Node `vm`). Surface: `makeDeck`/`shuffle`/`mulberry32`; `rank5`/`rank7` 7-card evaluator (base-15 encode, 9 categories, wheel A-2-3-4-5, kickers, splits) + `categoryOf`/`winningCards`/`handCategoryLabel`; `Hand` betting state machine (`postBlinds`/`legalActions`/`apply`/`advanceStreet`/`result` with one-time-award guard); `buildSidePots` (layered by commitment level, eligibility excludes folders); `decide`/`preflopStrength`/`handStrength`/`personaFor`/`randomTable` heuristic bots.
- **UI/render layer (guarded `if (typeof document !== 'undefined')`):** felt table with up to 6 seats (human bottom), board + pot pill, per-seat betchip + last-action + D/S/B badges, bot hole cards face-down until showdown, winning-card highlight; betting controls (fold/check/call + raise-size slider bound to the legal `[minRaiseTo, maxRaiseTo]` range + ½-pot/Pot/Min/All-in quick-bets); action log (aria-live) + whose-turn `.acting` ring; 720 ms bot pacing; showdown reveal naming the hand + multi-pot summary; confetti on human win (honors `prefers-reduced-motion`); full keyboard (F/C/R/Enter/N); start overlay opponent picker (Random / 1–5); `window.__POKER_TEST__` test seam (`dealRigged` etc.).
- **Phase 6a /skill-eval (route:skill, hard):** `[D]` all pass, **0 fail, EXIT 0, no residuals** (`a-name-matches-dir` = `poker`, NI block byte-identical to canonical, flag-contract + phase-refs clean). `[J]` all applicable checks pass (async reviewer, quotes validate).
- **Phase 7 /verify GREEN:** `node tests/run.mjs --selftest` → **39/39** (vm-extract, `EXPECTED_CHECKS=39`); 4 hygiene lints (`lint-non-interactive-inline`, `audit-recommended`, `lint-flags-vs-hints`, `lint-phase-refs`) all PASS; single-file contract held (no external refs / all inline + data-URI).
- **AC8/AC9 dogfood + Playwright e2e (load-bearing, TN−1):** launched the real game through `serve.js` on `http://127.0.0.1:62457/` (HTTP 200), drove it in Chromium. Proved live — start overlay → 2-opponent deal; preflop raise via the **Pot** quick-bet + Raise button (pot → 75); a **natural hand played preflop→flop→turn→river to showdown** naming `Two Pair, Fives & Threes`; then a **deterministic side-pot all-in** via `window.__POKER_TEST__.dealRigged` (short stack with the best hand wins **main pot 300**, deeper second-best wins **side pot 800**, loser gets nothing, net **+200/+300/−500 = 0** chips conserved) rendered as `You win 300 with Three of a Kind, Aces · Ivo wins 800 with Three of a Kind, Kings (2 pots: 300 + 800)`; **0 console errors**. Independent blind judge **VERDICT: SHIP** (5/5/5/4/4). Evidence: `stories/260613-kw5/dogfood/{EVIDENCE.md, poker-sidepot-showdown.png}`.
- **Live bug caught + fixed (cap-2, 1 of 2 used):** the action log + showdown banner conjugated every seat in third person, including the human ("You checks", "You wins 75"). Added an `isYou(seat)` helper + second-person conjugation in `describeAction`/`finishHand`; re-verified live (`You win 300 …`). Engine untouched — selftest still 39/39.
- **Non-blocking polish surfaced by the judge (future, not blocking):** winner/folded seat-state leans on color+glow with no text-equivalent beyond the log; **R** focuses the slider rather than raising-min immediately (Enter confirms). Neither raised as a defect.

**Next (Loop 3):** `/complete-dev --epic 260613-wqw` — pmos-gamekit minor bump v0.1.0→**v0.2.0** (new skill). `/sudoku` (260613-e35) and `/snake` (260613-v3y) are also on the gamekit shelf; whichever ships first takes v0.2.0.
