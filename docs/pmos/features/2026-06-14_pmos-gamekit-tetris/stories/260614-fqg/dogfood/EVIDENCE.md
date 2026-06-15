# Dogfood evidence — /tetris (story 260614-fqg)

Load-bearing dogfood for the `/tetris` build (T5 + T6). The real game was served through the
shared zero-dependency launcher (`_shared/game-launcher/serve.js`) and driven live in Chromium
via Playwright at `http://127.0.0.1:62999/`. Both an objective gate matrix and an independent
blind-judge verdict are recorded.

## Objective gates (live, served game)

| # | Gate | Result |
|---|------|--------|
| O1 | Server binds a free loopback port + serves the single file | PASS — `Game ready at http://127.0.0.1:62999/` |
| O2 | Start screen → start-level picker (0–15) → Play boots a game | PASS — start overlay + level picker shown; `newGame` seats an active piece, `overlays.start=false` after Play |
| O3 | Engine on `window.TetrisEngine`, board 10×20 | PASS — `createGame` builds a 20×10 field; engine selftest covers `WIDTH/HEIGHT` |
| O4 | Real **Arrow** input moves + rotates | PASS — `ArrowLeft` then `ArrowUp` moved the S piece to x=2 and rotated to rot=1 (live keypresses) |
| O5 | Move + rotate via the engine API through the live DOM | PASS — `move(1)×2` → active x=5; `rotate(1)` advanced rot and changed the piece |
| O6 | **Hard drop** (Space) scores + locks + spawns next | PASS — real `Space`: HUD score → 16 (matches engine), a new O piece spawned, `over=false` |
| O7 | **Hold** stashes a piece + the hold panel paints it | PASS — `hold()` → `state.hold='T'`, hold mini-canvas painted (>50 non-blank px) |
| O8 | Hold is one-per-drop | PASS (engine selftest) — a second `holdActive` returns `false` until the next spawn |
| O9 | **Ghost** piece renders below the active piece | PASS — with the active piece up high, `ghostY (11) > active.y`; ghost silhouette visible in the screenshot |
| O10 | **Line clear** + lines counter (1/2/3/4) | PASS — rigged Tetris via vertical-I into a full-except-col0 board → `cleared 4`, HUD lines = 4 |
| O11 | **Level-up** every 10 lines + speed-up | PASS — drove 4 + 4 + 2 line clears → lines 10, `level 0 → 1`, HUD level matches; `dropInterval` shrinks with level (selftest) |
| O12 | Guideline **scoring** accumulates | PASS — score > 0 after clears; selftest covers single<double<triple<Tetris, T-spin/B2B/combo/level scaling |
| O13 | **Top-out** → game-over overlay with final score | PASS — full-except-col9 stack + center drop → `over=true`, over overlay shown, "Final score 0 · level 0" |
| O14 | **Pause** (P) overlay toggles | PASS (UI) — `P` toggles `pauseOv`; engine selftest + live overlays helper confirm overlay state |
| O15 | **Zero console errors** across the session | PASS — `browser_console_messages(error, all:false)` → 0 errors on the game origin (inline data-URI favicon, no external refs) |
| O16 | Engine selftest | PASS — `node tests/run.mjs --selftest` → **53/53** (vm-extract, `EXPECTED_CHECKS=53`) |
| O17 | Single-file contract (no external runtime refs) | PASS — all CSS/JS inline, inline data-URI SVG favicon; the only `http://` is the SVG namespace inside the favicon data-URI (not a fetch); no external `src=`/`href=` |
| O18 | Never color-alone | PASS — every tile draws its **type letter** (I/O/T/S/Z/J/L) + a border; visible in the screenshot |

Deterministic scenarios were driven via the `window.__TETRIS_TEST__` hook (`newGame({startLevel,
seed})`, `rig(field, active)`, `move/rotate/hardDrop/hold`, `getState`, `overlays`). `rig` sets the
field + active piece and renders, then the **real** `hardDrop`/`commitLock` path runs so overlays,
scoring, and line clears surface exactly as in play (no test-only shortcuts around the lock path).
The Tetris/level-up fixtures use a vertical I dropped into the one empty column of an otherwise-full
bottom band; the top-out fixture fills columns 0–8 (col 9 empty, so no row ever clears) and drops a
piece into the buried spawn region.

Screenshots (full viewport, in this directory):
- `tetris-play.png` — live mid-game at level 5: HOLD (T) + Score/Lines/Level/Best HUD + NEXT-3 (Z/T/J)
  panels, a colored stack with **letter glyphs on every tile**, an active O piece with its translucent
  **ghost** silhouette below, and the controls legend.
- `tetris-gameover.png` — the game-over overlay over a buried board with the final-score line.
- `tetris-start.png` — the start screen with the 0–15 start-level picker and Play.

## Subjective blind-judge verdict

Independent agent, given only the game file + the dimensions to score, no authorship context.

| Dimension | Score | Note |
|---|---|---|
| Rules correctness | 4/5 | Correct Fisher-Yates 7-bag refilled at ≤7; SRS kick tables for JLSTZ + I with the right y-up→y-down conversion (`ny = piece.y - kicks[i][1]`); O no-op rotate; collision, `ghostY`, `clearLines` (partial rows kept), guideline scoring (level mult, B2B ×1.5, combo 50×n, soft/hard-drop bonuses), monotonic gravity, top-out, hold all correct. Gap: T-spin is a flat 3-corner test (no mini-vs-full / front-corner distinction); pieces spawn in-field rather than a vanish-zone buffer. |
| Feedback & legibility | 5/5 | Score/Lines/Level/Best HUD, next-3 + hold panels, translucent ghost, animated Tetris/T-Spin/B2B/Combo flash, `aria-live` announcements. |
| Input ergonomics | 4/5 | Full mapping (←/→ +A/D, ↓ soft +S, Space hard, ↑/X CW, Z CCW, C/Shift hold, P, R), lock delay 500ms with capped re-arm, start-level picker 0–15 with `aria-pressed`. Gap: no DAS/ARR auto-repeat tuning (relies on OS key-repeat). |
| Polish & accessibility | 5/5 | Never color-alone (border + piece-letter glyph on every cell), `prefers-reduced-motion` in CSS + JS, inline data-URI favicon, responsive `@media`, ARIA labels, tabular-nums. |
| Failure modes | 4/5 | Single rAF loop that stops on over/pause; overlays gate input; top-out → restart, no soft-lock. Gap flagged: pause-resume could double-schedule the rAF loop. |

**VERDICT: SHIP** (4/5, 5/5, 4/5, 5/5, 4/5).

Of the four enumerated gaps: **DAS/ARR auto-repeat tuning** and the **mini-vs-full T-spin
distinction** are explicitly out-of-scope for v1 per the design (D7 "DAS/ARR tuning UI" out of scope;
the documented T-spin rule is the flat 3-corner test); the **in-field spawn vs. vanish-zone buffer**
is cosmetic. The one genuine code defect — **pause-resume double-scheduling the rAF loop** — was
**fixed in the same build** (the `loop()` paused branch now returns without re-arming; the P-key
resume re-arms exactly once with `lastTime` reset) and re-verified live (pause overlay toggles,
resume keeps gravity advancing, 0 console errors). The remaining three gaps are accepted residuals,
surfaced here for `/complete-dev` and a future polish pass.

**Verdict line:** satisfied; accepted_residuals = [DAS/ARR auto-repeat (out-of-scope D7),
mini-vs-full T-spin scoring (beyond documented 3-corner rule), in-field spawn buffer (cosmetic)].
