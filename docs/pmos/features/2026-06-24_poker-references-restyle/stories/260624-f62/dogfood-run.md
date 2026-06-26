# Dogfood run — 260624-f62 (/poker References panel + restyle)

**Date:** 2026-06-25 · **Branch:** `feat/260624-f62` · **Verdict:** SHIP

Load-bearing live dogfood of the enhanced single-file game
(`plugins/pmos-gamekit/skills/poker/game/poker.html`), served through the shared
zero-dependency launcher and driven in a real browser via Playwright. Every surface in
the story's acceptance criteria was exercised against the running page (not the source).

## Automated gates

| Gate | Result |
|---|---|
| `node tests/run.mjs --selftest` | **47/47 passed, exit 0** (was 39; +8 for handKey/allHands169/chartAction/equityOf + source-scan section 16) |
| skill-eval (`skill-eval-check.sh`) | **EXIT 0 — zero residuals** |
| lint-flags-vs-hints | EXIT 0 |
| lint-phase-refs | EXIT 0 |
| lint-non-interactive-inline | EXIT 0 |
| audit-recommended | EXIT 0 |
| comments-coverage | N/A — single-file game, no pmos HTML artifact surface (not in the 14-surface roster) |

## Live Playwright dogfood (real browser, served URL)

- **HUD** heading renders **"Poker"** (was "No-Limit Texas Hold'em"); start-overlay `<h2>` also "Poker".
- **pmos wordmark** present — `href=https://github.com/maneesh-dhabria/pmos-skills`, `target=_blank`, `rel=noopener`, keyboard-focusable.
- **References panel** — `#btn-refs` opens the right-side `aside.refs`; `aria-expanded` flips true; **table column re-fits** when the panel toggles (`tableReflowed: true` — table-col shrank as the 344px aside mounted). **Esc** and the ✕ both close it. Session-only (no persistence).
- **Hand rankings** pane — **9 rows**, strongest-first, with examples; suit glyphs colored (red ♥♦ / dark ♠♣).
- **Preflop chart** pane — **169 cells** rendered; Position defaults to the hero's seat (BTN this deal) and is freely changeable; Facing selector works. Coloring verified: **93 raise + 76 fold** cells for one Position×Facing combo. Click `AA` → detail reads *"AA — Raise · 85.3% vs a random hand · Inside BTN's raise-first-in range."* Switching to **UTG vs raise** shows the all-**unmodeled** explanatory panel (never an all-fold grid) + the baseline-not-solver caveat.
- **Pot-odds card** — break-even% (`toCall/(pot+toCall)`) with worked example + table, Rule-of-2&4 (×2/×4 + big-draw caveat), compare-to-decide. No per-hand state.
- **Table restyle** — oval felt, hero bottom-center with gold nameplate, per-street **chip strips** (observed `P 5` / `P 10` / `P 10`), winner gold glow, restyled card faces + green-gradient backs, aligned action bar with ½ / ¾ / Pot quick-bets.
- **Unit toggle** — "Show BB" flips stacks/bets to big-blinds (`25` chips → `2.5 BB`) and back to chips. Session-only.

Evidence screenshots: `evidence/poker-references-chart.png`, `evidence/poker-chart-colored.png`.

## Blind adversarial judge

Independent general-purpose reviewer (no access to the build narrative), instructed to find
defects and verify claims byte-for-byte rather than trust them:

- **Verdict: SHIP** — data fidelity 5/5, correctness 5/5, completeness 5/5, code quality 5/5, invariant compliance 5/5; **zero defects**.
- Sandbox-loaded the engine and diffed **all 169 EQUITY169 keys** + every open range + BB-defend bucket against `poker-coach`'s `preflopEquity.json` / `preflopCharts.json` → **0 mismatches** (incl. zero-decimal cases preserved exactly).
- Brute-forced `chartAction()` over all 6 positions × 2 facings × 169 hands (2028 calls): **every** unmodeled spot returns `'unmodeled'`, no modeled spot leaks it, **no fabricated fold**.
- Engine IIFE confirmed **DOM-free** (no `document`/`querySelector`/`innerHTML`; `window` only in the closing invocation guard). Source scan: zero `fetch`/`localStorage`/`sessionStorage`/`WebSocket`/`Worker`/`XMLHttpRequest`/"Live Feedback"/"Monte" hits — the only `coach` matches are provenance comments naming the source repo. Single self-contained file, all refs `data:`/`https:`/`#`.

## Honest note — panel-reflow mechanism

The 02_design.html / 03_plan.md framing referred to a "`scale()`-to-fit + ResizeObserver"
re-fit when the panel toggles. **That mechanism never existed in the shipped game** — the
table is sized purely by CSS (`width:100%` / `max-width` / `aspect-ratio`), with no JS scaler
or ResizeObserver. The references panel was therefore integrated with **pure CSS flex**
(`.table-col { flex:1 1 auto; min-width:0 }` beside `aside.refs { flex:0 0 344px }`, with a
`<880px` full-width overlay fallback). This **meets the design intent** — the table demonstrably
re-fits when the panel opens (`tableReflowed: true`) — via the layout primitive the game already
used, rather than introducing a JS resize path the rest of the file didn't have. Recorded here so
the plan/design's named mechanism isn't mistaken for shipped reality.
