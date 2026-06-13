---
schema_version: 1
id: 260613-kw5
kind: story
parent: 260613-wqw
title: Build the /poker skill — single-file No-Limit Hold'em (6-max random bots, heuristic AI, side pots) + tests
type: feature
priority: could
status: planned
route: skill
dependencies: [260613-4mw]
feature_folder: docs/pmos/features/2026-06-13_pmos-gamekit-poker/
plan_doc: docs/pmos/features/2026-06-13_pmos-gamekit-poker/stories/260613-kw5/03_plan.html
tasks: docs/pmos/features/2026-06-13_pmos-gamekit-poker/stories/260613-kw5/tasks.yaml
labels: [pmos-gamekit, poker, texas-holdem, game-launcher]
created: 2026-06-13
updated: 2026-06-13
---

<!-- status: planned at define (Loop 1); plan_doc + tasks.yaml authored. Build via /feature-sdlc build --story 260613-kw5 -->

## Context

The single (fused) build story for epic `260613-wqw`. There is one new skill (`/poker`) and no separable substrate — the `_shared/game-launcher/` machinery already exists (from epic `260613-4mw`) and is consumed unchanged — so the natural unit is one vertical story = one `/execute` run = one PR: `SKILL.md` + bundled `game/poker.html` + `tests/run.mjs`.

Built against the design contract `docs/pmos/features/2026-06-13_pmos-gamekit-poker/02_design.html` and the standing skill-authoring criteria (`feature-sdlc/reference/skill-patterns.md §A–§L`, repo `CLAUDE.md`). Engine logic ported from the `poker-coach` reference project (`/Users/maneeshdhabria/Desktop/Projects/personal/poker-coach`, `core/*` pure-TS NLHE engine).

### Dependency

`dependencies: [260613-4mw]` — the build loop will not pick this story until epic `260613-4mw` (pmos-gamekit + `_shared/game-launcher/` + `/solitaire`) is `done`/`released` and on `main`. The launcher substrate and the plugin must exist before `/poker` can build/launch. This is the enforcement point for the epic-level dependency.

## Acceptance Criteria

- [ ] **AC1 — Skill scaffold:** `plugins/pmos-gamekit/skills/poker/SKILL.md` with `name: poker` (matches dir), launch-only + prompt-free body that resolves `game/poker.html`, asserts Node present (clear error if absent — D2, no silent `file://` fallback), invokes `../_shared/game-launcher/serve.js`, and reports the URL + in-game controls. Cites `../_shared/game-launcher/game-launcher.md`; states only the poker delta (game file, title); no restating the launch contract. Canonical NI inline block added iff `lint-non-interactive-inline.sh` requires it for prompt-free skills.
- [ ] **AC2 — Single-file game (D8):** `game/poker.html` is ONE self-contained file — all CSS+JS embedded, no external references, offline, no build step; card faces CSS + inline SVG/Unicode; inline data-URI favicon (the `/solitaire` favicon-404 lesson).
- [ ] **AC3 — Engine decoupled + on a global:** the embedded script exposes a pure-logic engine on `window.PokerEngine` decoupled from DOM render — deck/shuffle/deal, betting state machine (legal-action predicate, apply-action, street advance), 7-card hand evaluator (5-best-of-7, kickers, splits), side-pot calculator, showdown/winner resolver, heuristic bot decision.
- [ ] **AC4 — Game rules (D3/D4/D5/D6/D7):** No-Limit Hold'em cash game; 6-max with a **random 1–5 bots per new game**; post blinds → 2 hole cards → preflop/flop/turn/river betting (fold/check/call/bet/raise/all-in with min-raise + all-in enforcement, raise slider + ½-pot/pot/all-in quick buttons); correct **side pots** for multi-way all-ins (chips conserved, eligibility correct); rotating button/blinds; top-up to starting stack each hand; showdown names the winning hand and awards/splits the pot; heuristic bots (hand strength + draws + pot odds + position + light bluffing); **pure play — no coaching/equity panel**; no persistence.
- [ ] **AC5 — Polish:** chip + pot animation, winner highlight, hand/action log, "next hand" + "new game" (re-randomize opponents, reset stacks), responsive (laptop + phone), keyboard shortcuts (F fold, C check/call, R raise, Enter confirm, N next hand), accessible focus + ARIA.
- [ ] **AC6 — Behavioral selftest:** `tests/run.mjs --selftest` reads `game/poker.html`, extracts the engine `<script>`, evaluates in a Node `vm`, and asserts: 52 unique cards + correct hole/board distribution; hand-evaluator correctness (ranks ordered, kicker tie-breaks, split detection — known fixtures); illegal-action rejection (sub-min-raise, out-of-turn, over-stack); side-pot math for a multi-way all-in (chip conservation + eligibility); street advances only when betting closed; bot decision returns a legal action for representative spots. Exit 0/1 with a `--selftest` count assertion.
- [ ] **AC7 — Launch works:** `node _shared/game-launcher/serve.js game/poker.html` binds a free loopback port, serves the one file, auto-opens the browser (graceful degrade headless), prints the URL, runs until Ctrl-C; missing-Node → the D2 error verbatim.
- [ ] **AC8 — Dogfood (load-bearing):** play real hands via the launcher — multiple hands, ≥1 showdown, ≥1 all-in producing a side pot, each human action exercised, new-game re-randomizes opponent count; independent blind judge confirms responsive + frustration-free (sensible bot pace, clear betting controls, obvious winner, no stuck/illegal-action lockups); gaps → fix → re-run (cap 2, then accept-residuals-and-surface).
- [ ] **AC9 — Playwright e2e (maintainer-mandated, NOT deferred):** drive the real served game in a browser to a showdown — human fold/call/raise (raise-slider asserted in DOM), bots act, board runs out, winner awarded with hand named, stacks update, an all-in yields a correct side-pot award, **zero console errors**; showdown screenshot captured as evidence. Playwright provisioned if absent; only narrow named unreachable sub-checks may defer (surfaced loudly).
- [ ] **AC10 — Gates + conventions:** Phase 6a skill-eval [D] all-pass + [J] ≥ floor (43/47); 4 repo hygiene lints green (flags-vs-hints, phase-refs, non-interactive-inline, audit-recommended); zero external runtime deps (Node stdlib only); single-file contract holds; canonical path + manifest version-sync (`v0.2.0` minor bump at release, D9) honored.

## Tasks

See `tasks.yaml` (authored at define). Summary:

- **T1** — Study `poker-coach` `core/*` (eval, gameEngine, sidepots, botEngine/personas, handFlow) + the `/solitaire` `game/solitaire.html` structure + `game-launcher.md` contract.
- **T2** — Engine (TDD): `window.PokerEngine` — cards/deck/deal, hand evaluator (7-best-of-5), betting state machine, side-pot calculator, showdown resolver, heuristic bot. `tests/run.mjs --selftest` drives this.
- **T3** — Render/UI layer over the engine: table, seats, board, pot, betting controls (slider + quick bets), animations, log, keyboard, responsive, ARIA; inline favicon.
- **T4** — `SKILL.md` (launch-only, cites substrate; NI block iff lint demands).
- **T5** — Load-bearing dogfood (objective + blind-judge subjective; cap-2 fix loop).
- **T6** — Playwright e2e to showdown (NOT deferred) + skill-eval [D]/[J] + 4 lints.
