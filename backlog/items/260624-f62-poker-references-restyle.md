---
schema_version: 1
id: 260624-f62
kind: story
parent: 260624-3nj
title: "/poker References panel + restyle — collapsible right-side panel with 3 static references (hand rankings, interactive preflop chart, pot-odds/Rule-of-2&4), bundled chart data + pure handKey/chartAction helpers, table restyle to poker-coach look, HUD 'Poker' title + pmos watermark, extended selftest"
type: feature
priority: should
route: skill
dependencies: []
plugin: pmos-gamekit
status: planned
feature_folder: docs/pmos/features/2026-06-24_poker-references-restyle/
plan_doc: docs/pmos/features/2026-06-24_poker-references-restyle/stories/260624-f62/03_plan.md
tasks: docs/pmos/features/2026-06-24_poker-references-restyle/stories/260624-f62/tasks.yaml
worktree:
claimed_by:
driver_holder:
labels: [pmos-gamekit, poker, references, restyle, hud, watermark]
created: 2026-06-24
updated: 2026-06-24
---

## Story

Enhance the existing single-file `/poker` game at
`plugins/pmos-gamekit/skills/poker/game/poker.html` (+ `tests/run.mjs`) — a single vertical slice (D8).
This story edits the EXISTING skill; it creates no new `SKILL.md` (it only refreshes the existing
description + launch-report text). Scope is fixed by `02_design.html` §2–§7. Cites `design_doc:` anchors
`#surface`, `#references`, `#rankings`, `#preflop`, `#potodds`, `#restyle`, `#hud`, `#invariants`,
`#story-split`.

## Acceptance criteria

1. **Collapsible References panel (D1, §2)** — a two-column shell (table left, ~340px panel right) with a
   HUD `References` toggle; the table re-fits via the existing `scale()`-to-fit + `ResizeObserver` when the
   panel toggles (readability floor preserved); below ~880px the panel is a full-width overlay dismissed by
   button/Esc; session-only state (no persistence). No Live-Feedback / Coaching tabs.
2. **Hand rankings reference (§3.1)** — all 9 categories strongest-first with examples, rendered from
   bundled data; static; suit glyphs colored consistently with the table cards.
3. **Interactive preflop chart (§3.2)** — 13×13 grid of 169 hands, Position × Facing selectors, cells
   colored raise/fold via `chartAction()`, click-for-detail (hand + action + static win% from the 169-key
   table + rationale); Position defaults to hero seat but is freely changeable (D3); carries the
   baseline-not-solver caveat and an explanatory panel (never an all-fold grid) for unmodeled spots.
4. **Bundled static data + scope discipline (D6, §3.2)** — the 9 ranking rows, per-position open ranges,
   BB-defend buckets, and 169-key equity are inlined as static data **copied** from poker-coach's own JSON
   (not re-derived), and are the single home the references bind. **No** live coaching, equity Monte-Carlo,
   EV table, or persistence is reintroduced.
5. **Pot-odds + Rule-of-2&4 card (§3.3)** — a static card covering counting outs, Rule of 2 & 4 (+big-draw
   caveat), break-even% = toCall/(pot+toCall) with a worked example + small table, and the compare-to-decide
   step. No per-hand readout / state.
6. **Table restyle (D2, §4)** — oval felt with hero bottom-center, seat tiles with per-street chip strips,
   gold hero + winner glow, restyled card faces, aligned action bar — all within the existing
   fixed-design-box scale-to-fit. **No** setup-screen parity (bot pickers/presets/depth), bankroll
   persistence, or reveal animation.
7. **Pure, self-tested engine (§6)** — `handKey()` / `chartAction(cards, position, facing)` /
   `allHands169()` / equity lookup are pure, DOM-free, exposed on `window.PokerEngine`; `tests/run.mjs` is
   extended (fail-first) to assert them over known raise/fold/unmodeled spots and that the engine stays
   window-exposed; `node tests/run.mjs` exits 0.
8. **HUD "Poker" title + pmos watermark (D7, §5)** — the in-game HUD heading reads "Poker" (user-facing
   display strings updated; external skill name/triggers unchanged); a small pmos wordmark links to
   `https://github.com/maneesh-dhabria/pmos-skills` in a new tab (`rel=noopener`), keyboard-focusable, not
   overlapping play controls.
9. **Gates green + dogfood** — `node tests/run.mjs` exits 0; grep-assert no coaching/equity/EV/persistence/
   network reintroduced; the 4 gamekit hygiene lints + skill-eval (the SKILL.md edit is description/launch
   text only) pass; **load-bearing live Playwright dogfood**: launch via game-launcher, toggle the panel
   (table re-fits), verify all three references render correctly, the restyled oval table + chip strips +
   gold hero, the "Poker" HUD heading, and the pmos wordmark opening the repo in a new tab; capture
   screenshots as evidence.

## Notes

Single-story epic (D8) — no dependencies. Everything lands in `game/poker.html` + `tests/run.mjs`.
Preflop chart data is copied from the maintainer's own `poker-coach` (`core/charts/preflopCharts.json` +
`preflopEquity.json`) — their work, no third-party licensing. Keep the "transparent baseline, not solver
output" caveat verbatim so the chart does not overclaim or read as the dropped live coaching.
