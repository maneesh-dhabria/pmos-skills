# Dogfood evidence — /2048 (story 260613-nay)

Load-bearing dogfood for the `/2048` build. The real game was served through the shared
zero-dependency launcher (`_shared/game-launcher/serve.js`) and driven live in Chromium via
Playwright at `http://127.0.0.1:62824/`. Both an objective gate matrix and an independent
blind-judge verdict are recorded.

## Objective gates (live, served game)

| # | Gate | Result |
|---|------|--------|
| O1 | Server binds a free loopback port + serves the single file | PASS — `Game ready at http://127.0.0.1:62824/` |
| O2 | Start screen → board-size picker → Play deals a board | PASS — picked **5×5**, `aria-pressed="true"`, Play seated a 25-cell board |
| O3 | Board-size correctness (4×4/5×5/6×6) | PASS — 5×5 → 25 cells, `state.size === 5`; engine selftest also covers 16/25/36 |
| O4 | Initial state validity | PASS — exactly two tiles, both in {2,4}, score 0, move count 0 |
| O5 | Real **Arrow** input slides + merges + spawns | PASS — `ArrowLeft` then `w`: 2 moves registered, score → 4 (a merge), 3 tiles rendered |
| O6 | Real **WASD** input works (`w`/`a`/`s`/`d`) | PASS — `w` and `d` both advanced the move counter and changed the board |
| O7 | DOM tiles match engine board | PASS — `#tiles .tile` count equals engine non-zero cells after every move |
| O8 | **Undo** restores prior board + score | PASS — board and score reverted to pre-move snapshot |
| O9 | Undo is one-deep (D5) | PASS — Undo button `disabled` immediately after an undo (cannot undo twice) |
| O10 | No-op move does nothing | PASS (engine selftest) — `moved:false`, no spawn, empty-count + move counter unchanged |
| O11 | **Win at 2048** → win overlay + 2048 tile | PASS — rigged `[1024,1024,…]` + left-merge → `state.won`, `.tile.t2048` in DOM, win overlay shown |
| O12 | **Keep playing** dismisses overlay, play continues | PASS — overlay cleared, subsequent moves still register |
| O13 | **Game over** only when no slide AND no merge | PASS — staircase board, one real left-move locks it → `over` overlay "No more moves. Final score 7." |
| O14 | Session **best** tracks the max score across games | PASS — Best held `10048` after a high-score game then reset board |
| O15 | Move counter (HUD) increments per successful move | PASS — `#moves` mirrors `state.moves` |
| O16 | **Zero console errors** across the full session | PASS — `browser_console_messages(error, all:false)` → 0 errors on the game origin (the only 404s observed were stale `localhost:8011/8013` favicons from prior unrelated servers, not `127.0.0.1:62824`) |
| O17 | Engine selftest | PASS — `node tests/run.mjs --selftest` → **38/38** (vm-extract, `EXPECTED_CHECKS=38`) |
| O18 | Single-file contract (no external runtime refs) | PASS — all CSS/JS inline, inline data-URI SVG favicon, no `http(s)://`/protocol-relative `src=`/external `href` (the sole `<link>` is the data-URI favicon) |

Deterministic win/over scenarios were set up via the `window.__2048_TEST__.loadBoard` seam
(rig a board, bypass spawn, then drive a **real** move through the normal `doMove` path so
the overlay surfaces exactly as it does in play). The game-over board is a "staircase" with
exactly one mergeable pair; the post-merge spawn lands on a cell whose neighbours are 16 and
64, so it can never create a merge — the lock is deterministic regardless of spawn value.

Screenshots (full viewport):
- `2048-play.png` — live 4×4 play after several real key moves (score 4, tiles grid-aligned, D-pad + Undo/New game).
- `2048-win.png` — gold **You win!** overlay with the 2048 tile and Keep playing / New game.
- `2048-gameover.png` — full locked board across the colour ramp (4→256) with **Game over · Final score 7**.

## Subjective blind-judge verdict

Independent agent, given only the game file + the dimensions to score, no authorship context.

| Dimension | Score | Note |
|---|---|---|
| Rules correctness | 5/5 | `collapseLine` compresses → merges adjacent equals exactly once (`i += 1` partner-skip) → recompresses → pads; `spawnTile` 2@90%/4@10% on a uniform-random empty cell; `move` only spawns/advances when `moved`; `canMove` true on any empty OR any equal H/V neighbour, so `over` only when no slide AND no merge; `hasWon` at ≥2048. |
| Feedback & legibility | 5/5 | Score/Best/Moves HUD, canonical colour ramp t2–t2048 + `big`, distinct win (gold) / game-over overlays, spawn `pop` + merged `bump`, `aria-live` polite score + assertive announce region, win confetti, digit-count font scaling. |
| Input ergonomics | 5/5 | Arrows + WASD (both cases), 24px swipe threshold, on-screen D-pad, U undo (one-deep, disabled-state bound), N/R new game, Esc closes overlays, 4/5/6 board-size picker — all wired. |
| Polish & accessibility | 4/5 | `prefers-reduced-motion` in CSS + confetti guard, `:focus-visible`, ARIA labels, `role=grid`/`gridcell` positional labels, responsive + resize re-render, size selection via `aria-pressed` + border (not colour-alone). Minor: tiles lean on colour+number (the number carries it). |
| Failure modes | 5/5 | No timers to leak; `busy` + overlay guards block moves while overlays up; undo clears a premature game-over; no-op moves leave snapshot + turn untouched; confetti self-terminates; "Keep playing" sets `dismissedWin` so it never re-nags; geometry recomputes on resize. No dead-ends or lock-ups. |

**VERDICT: SHIP.**

The one non-blocking 4/5 note (tile state leaning on colour+number, where the number already
carries the value) is logged as future polish; it was not raised as a defect.
