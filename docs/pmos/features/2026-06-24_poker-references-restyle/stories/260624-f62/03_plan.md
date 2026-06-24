# Plan — Story 260624-f62: /poker static References panel + table restyle + HUD/watermark

**Spec:** [`../../02_design.html`](../../02_design.html) — anchors `#surface` (§2), `#references` (§3),
`#rankings` / `#preflop` / `#potodds` (§3.1–3.3), `#restyle` (§4), `#hud` (§5), `#invariants` (§6),
`#story-split` (§7), `#decisions` (§8).
**Tasks:** [`tasks.yaml`](./tasks.yaml).

## Overview

A single vertical slice (D8) landing entirely in the one self-contained
`plugins/pmos-gamekit/skills/poker/game/poker.html` (plus its `tests/run.mjs`). It bolts a **collapsible
right-hand References panel** onto the existing game, fills it with **three static references** (hand
rankings, an interactive preflop chart, a pot-odds / Rule-of-2&4 card), **restyles the table** to match the
maintainer's `poker-coach` look (oval felt, seat tiles, gold hero highlight, per-street chip strips),
renames the in-game HUD heading to **"Poker"**, and adds a **pmos wordmark** linking to the pmos-skills
GitHub repo. No live coaching, no equity engine, no persistence — the launch contract, zero-dep
self-contained file, and pure window-exposed engine are all preserved (§6).

Why no split: every change shares the same file, the same layout, and the same CSS surface; nothing is
independently shippable; parallel branches would conflict everywhere (§7, D24 litmus). The engine stays
pure and selftested — the new pure chart-lookup helpers (`chartAction`, `handKey`) are added to
`tests/run.mjs` (§H: deterministic logic gated by a script, not the model).

## Tasks (mirror of tasks.yaml)

- **T1** — Two-column layout shell + collapsible References panel + HUD `References` toggle; table
  `scale()`-to-fit re-fits on toggle; <880px overlay fallback. *(AC1)*
- **T2** — Bundle the static reference DATA as inline JS (hand-ranking rows, per-position open ranges +
  BB-defend, 169-key equity table) adapted from poker-coach JSON; add pure `handKey()` /
  `chartAction(cards, position, facing)` helpers on the engine. *(AC4, AC7)* — fail-first tests in T6.
- **T3** — Hand-rankings reference (9 categories, examples) rendered from the bundled data. *(AC2)*
- **T4** — Interactive preflop chart: 13×13 grid, Position × Facing selectors, raise/fold coloring,
  click-for-detail (win% + rationale), baseline-not-solver caveat + explanatory panel for unmodeled spots;
  defaults Position to hero seat (browsable). *(AC3)*
- **T5** — Pot-odds + Rule-of-2&4 static card (outs, ×2/×4, break-even formula + table, putting-it-together).
  *(AC5)*
- **T6** — Table restyle to poker-coach look (oval felt, seat tiles + per-street chip strips, gold hero +
  winner glow, card faces, action bar styling) within the existing fixed-design-box scale-to-fit. *(AC6)*
- **T7** — HUD heading → "Poker" (all in-game display strings) + pmos wordmark linking to
  `github.com/maneesh-dhabria/pmos-skills` (new tab, focusable). *(AC8)*
- **T8** — Green bar: extend `tests/run.mjs` (fail-first in T2) to cover `handKey`/`chartAction` over known
  spots; assert engine stays pure/window-exposed; confirm no coaching/equity/network/persistence code
  reintroduced; live Playwright dogfood (panel toggles, all 3 references render, chart cell detail,
  restyled table, "Poker" HUD, watermark link). *(AC1–AC8)*

Dependency shape: T1 → (T3, T4, T5 panel content) ; T2 → T4 (chart needs the data + lookup) and → T6-tests ;
T3/T5 depend on T1 only ; T6 (restyle) and T7 (HUD/watermark) are layout-adjacent to T1 ; T8 fans in all to
the green bar + dogfood.

## Decisions / risks

- **D6 data fidelity.** The bundled ranges/equity are adapted from the maintainer's own poker-coach JSON —
  copy the tables, don't re-derive. Keep the "transparent baseline, not solver output" note verbatim so the
  chart doesn't overclaim (and doesn't read as the dropped coaching).
- **Layout risk.** The references panel narrows the table column; rely on the existing `scale()`-to-fit +
  `ResizeObserver` + `MIN_TABLE_SCALE` floor rather than re-laying-out the felt. Re-fit must fire on panel
  toggle. <880px → overlay (§2).
- **Scope discipline (D2/D3).** Resist pulling in any live readout, equity Monte-Carlo, EV table, or
  setup-screen parity — those are explicitly out (§9). The chart's win% column is the *precomputed static*
  169-key table, never a runtime equity call.
- **Engine purity (§6).** New helpers must be pure and live on the window-exposed engine so `run.mjs` can
  test them in a VM; no DOM access inside them.

## Release prerequisites (NOT tasks here)

Version bump (pmos-gamekit), CHANGELOG, README row, and manifest version-sync are owned by `/complete-dev`
at epic release — not included in any wave above. This story edits an existing skill; it creates no new
`SKILL.md` (it edits the existing one's description/launch text only).

## Final verification checklist

1. `node tests/run.mjs` exits 0 — pure, no network/DOM, covers new chart helpers.
2. Panel toggles open/closed from the HUD; table re-fits; <880px overlay works.
3. All three references render correct content (rankings 9 rows; chart 169 cells with raise/fold coloring +
   Position×Facing + click detail + caveat; pot-odds card with Rule-of-2&4 + break-even).
4. Table shows the restyled oval felt, seat tiles, per-street chip strips, gold hero + winner glow.
5. HUD heading reads "Poker"; pmos wordmark opens `github.com/maneesh-dhabria/pmos-skills` in a new tab.
6. No coaching/equity/EV/persistence/network code present; engine still `window`-exposed and pure.
7. Skill still launches via game-launcher; opens offline from file://.
