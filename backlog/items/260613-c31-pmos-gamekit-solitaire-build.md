---
schema_version: 1
id: 260613-c31
kind: story
parent: 260613-4mw
title: Scaffold pmos-gamekit + _shared/game-launcher substrate + /solitaire (bundled Klondike + tests)
type: feature
priority: could
status: planned
route: skill
dependencies: []
feature_folder: docs/pmos/features/2026-06-13_pmos-gamekit-solitaire/
plan_doc: docs/pmos/features/2026-06-13_pmos-gamekit-solitaire/stories/260613-c31/03_plan.html
tasks: docs/pmos/features/2026-06-13_pmos-gamekit-solitaire/stories/260613-c31/tasks.yaml
worktree:
claimed_by:
driver_holder:
labels: [pmos-gamekit, new-plugin, solitaire, game-launcher]
created: 2026-06-13
updated: 2026-06-13
---

<!-- status: planned at define (Loop 1); plan_doc + tasks.yaml authored. Build via /feature-sdlc build --story 260613-c31 -->

## Context

The single (fused) build story for epic `260613-4mw`. Per the route:skill split rule, the plugin scaffold, the `game-launcher` substrate, and the `/solitaire` skill are mutually dependent (empty plugin not releasable; substrate has no consumer without the skill; skill cannot launch without the substrate) — so they fuse into one vertical story = one `/execute` run = one PR. Built against the design contract `docs/pmos/features/2026-06-13_pmos-gamekit-solitaire/02_design.html` and the standing skill-authoring criteria (`feature-sdlc/reference/skill-patterns.md §A–§L`, repo `CLAUDE.md`).

## Acceptance Criteria

(Drawn from epic `260613-4mw` — the change-set for this story.)

- [ ] AC1 — New plugin scaffold: `plugins/pmos-gamekit/.claude-plugin/plugin.json` + `.codex-plugin/plugin.json` both `version: 0.1.0`, matching `name`/`description`, codex `interface` block, `skills: "./skills/"`; `.claude-plugin/marketplace.json` + `.codex-plugin/marketplace.json` catalog entries (name/description/source/category/homepage, **no `version`**); `CLAUDE.md ## Plugin charters` table + `## Release policy → Plugins list` include `pmos-gamekit` (charter: "…play a casual game").
- [ ] AC2 — Substrate `plugins/pmos-gamekit/skills/_shared/game-launcher/serve.js`: zero-dep Node static server; binds an ephemeral free port on `127.0.0.1`; serves exactly the passed game file at `/` (404 elsewhere); auto-opens default browser (open/xdg-open/start) with graceful "visit <URL> manually" degrade; prints URL; runs until Ctrl-C; read-only / no persistence.
- [ ] AC3 — Substrate doc `game-launcher.md` is the §K canonical home for: the single-file bundling convention (D7), the `game/<name>.html` directory convention, the launch contract a SKILL.md follows, the platform-open matrix, ephemeral-port selection, the Node-prerequisite error contract (D2), and the no-persistence rule (D6). Game skills cite it and state only deltas.
- [ ] AC4 — Substrate self-test (headless, `node`): port binds, correct file served, 404 for other paths, clean shutdown.
- [ ] AC5 — `/solitaire` skill: `plugins/pmos-gamekit/skills/solitaire/SKILL.md` with `name: solitaire` (matches dir); launch-only body (resolve game path → assert Node present with clear error if not → invoke substrate `serve.js` → report URL); cites `game-launcher.md`; prompt-free (no `AskUserQuestion`; free port auto-selected; missing-Node is a hard error). Verify against `lint-non-interactive-inline.sh`; add the canonical NI inline block only if the lint requires it for prompt-free skills.
- [ ] AC6 — Bundled game `plugins/pmos-gamekit/skills/solitaire/game/solitaire.html`: single file, all CSS+JS embedded, offline, no external refs (D7), no persistence (D6). Implements Klondike with draw-1/draw-3 toggle, drag-and-drop + click-to-move, win detection + animation, undo, auto-move to foundations, move counter + timer, new-game/restart, responsive layout, keyboard shortcuts (D3/D4). Card faces via CSS + inline SVG/Unicode (no image files).
- [ ] AC7 — Testability: the embedded script exposes a pure-logic engine (deck creation, legal-move predicate, apply-move, win-check, undo stack) decoupled from rendering on a global. `tests/run.mjs --selftest` reads `game/solitaire.html`, extracts + evaluates the engine in a Node `vm`, and asserts: a deal yields 52 unique cards in correct stock/tableau distribution; foundation/tableau move legality matches Klondike; illegal move rejected; win-check fires only on four complete foundations; undo restores prior state. Exit 0/1; `--selftest` asserts the expected check count (spirit of `skill-eval-check.sh --selftest`).
- [ ] AC8 — `/solitaire` passes `skill-eval.md` (floor 43/47; `name: solitaire` matches dir) and repo `CLAUDE.md` (canonical path, manifest version-sync, §H–§L); repo hygiene lints green where applicable (flags-vs-hints, phase-refs, non-interactive-inline, audit-recommended); zero external runtime deps (Node stdlib only).
- [ ] AC9 — **Dogfood (this story's own load-bearing dogfood):** launch via `serve.js`; `tests/run.mjs --selftest` green; play a full game to a win with win-detection firing; exercise undo, auto-move, draw-1↔draw-3 toggle, and both drag and click once each. Independent judge plays a hand and confirms responsive + frustration-free (no stuck cards, legible faces, sensible auto-move). Objective gates: selftest green; launch opens the served file; lint-phase-refs + skill-eval green. Gaps → fix → re-run, cap 2, then accept-residuals-and-surface. Visual/interaction (Playwright) checks pass at build or are explicitly deferred-to-release (never silently skipped).
- [ ] AC10 — Release prerequisites (new-plugin scaffold completion as a release gate, version `0.1.0`, changelog entry, marketplace registration, learnings header bootstrap) listed under the plan's `## Release prerequisites` only, NOT as `/execute` wave tasks. First release ships via `/complete-dev --plugin pmos-gamekit` (or the `--epic` train).
- [ ] AC11 — **Playwright end-to-end playthrough (required final-verification gate — maintainer-mandated, not deferred):** Playwright drives the real served game in a browser to a win — at least one click-to-move and one drag-and-drop move asserted in the DOM, draw-1↔draw-3 toggle, undo, auto-move, move-counter + timer updates, win-detection UI + animation, and **zero console errors** throughout; a win-state screenshot is captured as browser evidence. If Playwright is unavailable in the build host it is provisioned (it ships as an MCP) — the core playthrough is never silently deferred; only a narrow, explicitly-named unreachable sub-check may be recorded as deferred-to-release and surfaced loudly.

## Notes

Plan + `tasks.yaml` authored at define time (this loop). Build via `/feature-sdlc build --story 260613-c31` (or `build --next`). New-plugin scaffolding rule (`CLAUDE.md ## New-plugin scaffolding`) is a release prerequisite — `/complete-dev` is the sole writer of version/changelog/registration finalization.
