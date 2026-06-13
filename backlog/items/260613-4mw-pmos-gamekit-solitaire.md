---
schema_version: 1
id: 260613-4mw
kind: epic
title: pmos-gamekit — new casual-games plugin + /solitaire (Klondike) first game, with a reusable game-launcher substrate
type: feature
priority: could
status: defined
route: skill
feature_folder: docs/pmos/features/2026-06-13_pmos-gamekit-solitaire/
requirements_doc:
spec_doc:
design_doc: docs/pmos/features/2026-06-13_pmos-gamekit-solitaire/02_design.html
labels: [pmos-gamekit, new-plugin, solitaire, game-launcher, browser-game]
created: 2026-06-13
updated: 2026-06-13
---

## Context

From maintainer request (2026-06-13): create a new plugin `pmos-gamekit` for casual, single-player, browser-playable games. Games are triggered and built/launched via a skill and played in the browser; no persistence required. A lightweight server is packaged to serve the bundled game and open the browser from the terminal. The game code ships as a **single HTML file with all CSS and JS embedded** (feasibility confirmed: yes — see design `#feasibility`). First game: `/solitaire` (Klondike).

Design contract (the cross-skill coherence doc the story cites by anchor): `docs/pmos/features/2026-06-13_pmos-gamekit-solitaire/02_design.html`.

### Maintainer decisions captured at define (2026-06-13, AskUserQuestion grill)

- **D1 — Delivery: ship a pre-built bundled game.** `/solitaire` ships a tested single-file `solitaire.html` and launches it (not per-run LLM regeneration).
- **D2 — Launch: bundled zero-dep Node server + auto-open** the default browser on an ephemeral localhost port. Node is a hard prerequisite (clear error if absent; no silent `file://` fallback).
- **D3 — Variant: Klondike, in-game draw-1/draw-3 toggle, drag-and-drop AND click-to-move.**
- **D4 — Scope: full casual polish** — win detect+animation, undo, auto-move to foundations, move counter + timer, restart, responsive, keyboard shortcuts.
- **D5 — Shared substrate now:** `plugins/pmos-gamekit/skills/_shared/game-launcher/` holds the launch/server/open + bundling conventions so game #2 reuses it. Fused with the first consumer into one story (neither ships alone).
- **D6 — No persistence** of any kind; each launch is a fresh game.
- **D7 — Single-file is a hard contract:** a shipped game embeds all CSS/JS/assets; no external references; offline; no build step.
- **D17 — Single plugin / release unit:** everything lands in `pmos-gamekit`; new plugin → first release `v0.1.0`.
- **D18 — Singleton epic:** one fused story is valid.

## Acceptance Criteria

- [ ] **Plugin scaffold:** `plugins/pmos-gamekit/.claude-plugin/plugin.json` + `.codex-plugin/plugin.json` (both `version: 0.1.0`, matching `name`/`description`, codex `interface` block, `skills: "./skills/"`); catalog entries in `.claude-plugin/marketplace.json` + `.codex-plugin/marketplace.json` (no `version` field); `CLAUDE.md` charter table + `## Release policy → Plugins list` updated to include `pmos-gamekit`.
- [ ] **Substrate:** `plugins/pmos-gamekit/skills/_shared/game-launcher/` ships `serve.js` (zero-dep static server, ephemeral free port, serves one file, cross-platform auto-open with graceful degrade, runs until Ctrl-C, no persistence), `game-launcher.md` (the §K canonical home for the single-file bundling convention, directory convention, launch contract, platform-open matrix, Node-prerequisite error contract, no-persistence rule), and a substrate self-test.
- [ ] **/solitaire skill:** `plugins/pmos-gamekit/skills/solitaire/SKILL.md` (`name: solitaire` matches dir; launch-only, prompt-free; cites the substrate, states only the solitaire delta) + `game/solitaire.html` (pre-built single-file Klondike per D3/D4/D6/D7) + `tests/run.mjs`.
- [ ] **Game correctness:** the bundled game implements standard Klondike with the draw-1/draw-3 toggle, drag-and-drop + click-to-move, win detection + animation, undo, auto-move to foundations, move counter + timer, restart, responsive layout, and keyboard shortcuts — single file, offline, no persistence.
- [ ] **Testability (single-file AND testable):** the embedded script exposes a pure-logic engine (deck/legal-move/apply/win-check/undo) decoupled from rendering; `tests/run.mjs --selftest` extracts + evaluates it and asserts the objective gates (52 unique cards dealt + correct distribution; move legality; illegal-move rejection; win-check correctness; undo reversibility); exit 0/1 with a self-test count assertion.
- [ ] **Launch works:** `serve.js <game>` binds a free localhost port, serves the file, opens the browser, prints the URL; missing-Node yields a clear actionable error (D2).
- [ ] **Dogfood (load-bearing):** a full game is actually played through the launcher — reaches a win with win-detection firing; undo, auto-move, draw-mode toggle, and both drag + click exercised; independent judge confirms it is responsive and frustration-free; gaps → fix → re-run (cap 2, then accept-residuals-and-surface).
- [ ] **Playwright end-to-end (required final-verification gate):** Playwright drives the real served game in a browser to a win — click-to-move + drag-and-drop moves asserted, draw-1↔draw-3 toggle, undo, auto-move, counter + timer, win-detection UI + animation, zero console errors — with a win-state screenshot as evidence. Maintainer-mandated; not deferred (Playwright is provisioned if absent; only narrow named sub-checks may defer, surfaced loudly).
- [ ] **Conventions:** `/solitaire` passes `skill-eval.md` (floor 43/47) + repo `CLAUDE.md` (canonical path, manifest version-sync, §H–§L); zero external runtime dependencies (Node stdlib only); repo hygiene lints green where applicable.
- [ ] **Single plugin (D17):** all changes land in `pmos-gamekit`; first release `v0.1.0`.

## Stories

- `260613-c31` — Scaffold `pmos-gamekit` + `_shared/game-launcher/` substrate + `/solitaire` skill (bundled Klondike + tests). route: skill. deps: none. *(fused singleton — load-bearing)*
