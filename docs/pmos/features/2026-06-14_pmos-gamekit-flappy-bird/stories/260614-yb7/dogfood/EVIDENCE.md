# Dogfood evidence — /flappy-bird (story 260614-yb7)

Load-bearing dogfood for the `/flappy-bird` build (T5 + T6). The real game was served through
the shared zero-dependency launcher (`_shared/game-launcher/serve.js`) and driven live in
Chromium via Playwright at `http://127.0.0.1:63179/`. Both an objective gate matrix and an
independent blind-judge verdict are recorded.

## Objective gates (live, served game)

| # | Gate | Result |
|---|------|--------|
| O1 | Server binds a free loopback port + serves the single file | PASS — `Game ready at http://127.0.0.1:63179/` |
| O2 | Start screen → Easy/Normal/Hard picker → Play boots a game | PASS — start overlay + 3-mode picker shown (Normal `aria-pressed=true`); `newGame` seats a `ready` bird, `overlays.start=false` after start |
| O3 | Engine on `window.FlappyEngine`, board 360×640, ground at 544 | PASS — `createState` builds bird at (120,320), `groundY=544`, first pipe queued at x=360; selftest covers all constants |
| O4 | Real **Space** input flaps + the bird responds | PASS — a live `Space` keypress flipped `ready→playing` and set `vy=-402` (the upward impulse) |
| O5 | Flap → **rise-then-fall arc** under gravity | PASS — after a flap, y went 320 → rose to 260 → fell back to 310 (`rose=true, fellBack=true`); semi-implicit Euler |
| O6 | **Pipe threaded** → score increments | PASS — a seeded autopilot (flap-to-gap) drove the real `step`/`flap` path past a pipe → `score 0 → 1`, still `playing` |
| O7 | **Score exactly once** per pipe | PASS (engine selftest) — a cleared pipe is marked `scored`; a second step past it never double-counts |
| O8 | **Forced collision** → game-over overlay | PASS — withholding flaps drove the bird to the ground → `status:'over'`, `overlays.over=true`, start hidden |
| O9 | Real **R** keypress → restart → fresh game | PASS — live `r` press → `status:'ready'`, `score:0`, bird re-centered at y=320, overlay hidden, 1 pipe queued |
| O10 | **Ceiling clamp** — no death at the top | PASS (engine selftest) — hammering flap pins y at the radius; y never < r and the game never ends at the top |
| O11 | **Ground + pipe** are lethal | PASS — `collides` true on ground (`y+r≥groundY`) and on a pipe-rect overlap; step flips to `over` |
| O12 | **Difficulty bands** distinct + ordered | PASS — read live: gap 200 > 162 > 132 (easy→hard), speed 118 < 150 < 188; the run reads `params` once (constant within a run) |
| O13 | **Session high score** updates across runs | PASS — a run scoring 2 set `sessionBest=2`; a later run preserved it |
| O14 | **New-best flourish** fires | PASS — after a reload (session reset, best 0), a run scoring 1 → `newBest=true`, flourish shown with 40 spark elements; motion-reduced-aware |
| O15 | **Pause** (P) overlay toggles | PASS — a live `p` press while playing → `overlays.pause=true` |
| O16 | **Zero console errors** across the session | PASS — `browser_console_messages(error, all:false)` → 0 errors on the game origin (inline data-URI favicon, no external refs) |
| O17 | Engine selftest | PASS — `node tests/run.mjs --selftest` → **47/47** (vm-extract, `EXPECTED_CHECKS=47`) |
| O18 | Single-file contract (no external runtime refs) | PASS — all CSS/JS inline, inline data-URI SVG favicon; the only `http://` is the SVG namespace inside the favicon data-URI (not a fetch); no external `src=`/`href=` |
| O19 | Never color-alone | PASS — pipes carry a lip + white highlight stripe (shape cue), "★ New best!" is text+label, difficulty buttons carry text labels + `aria-pressed` |
| O20 | Deterministic RNG | PASS (engine selftest) — `makeRng(seed)` repeats; `createState({seed})` gives the same first `gapY` |

Deterministic scenarios were driven via the `window.__FLAPPY_TEST__` hook (`newGame({difficulty,
seed})`, `flap()`, `advance(n, dt)`, `pause()`, `overlays()`, `getState()`). `advance` steps the
**real** engine `step(state, dt)` at a fixed `dt` (no wall-clock / Date), and `flap()` calls the
real `flap()` — so scoring, collisions, and overlays surface exactly as in play (no test-only
shortcuts around the lock path). Real keyboard input (`Space`, `r`, `p`) was dispatched through
Playwright to prove the live input bindings, then the deterministic hook pinned the physics.

Screenshots (full viewport, in this directory):
- `flappy-play.png` — live mid-game (Easy): the yellow bird aloft mid-stage, a green pipe pair with
  a gap (lips + highlight stripe), the textured ground strip, score `0` + `BEST 1` HUD.
- `flappy-gameover.png` — the game-over overlay with "★ New best!", final Score/Best, Play-again, and
  the control hints over a rendered board.
- `flappy-start.png` — the start screen: "🐤 Flappy Bird", the Easy/Normal/Hard picker (Normal
  selected), Play button, and the control-hint row.

## Subjective blind-judge verdict

Independent agent, given only the game file + the dimensions to score, no authorship context.

| Dimension | Score | Note |
|---|---|---|
| Rules correctness | 5/5 | Correct semi-implicit Euler (`vy += g·dt` then `y += vy·dt`); ceiling clamps without death; ground + circle-rect pipe collision; score-exactly-once via the `scored` flag at the pipe's trailing edge; monotonic difficulty bands (gap 200→162→132, speed 118→150→188); mulberry32 seedable RNG; `difficultyParams` returns a copy; difficulty read once → constant within a run. |
| Feedback & legibility | 5/5 | Live score + BEST HUD with tabular-nums; pipe lip + highlight stripe; velocity-tied bird rotation; ready-state bob hint; three `aria-modal` overlays; `aria-live` announcements for new-game / pause / game-over. |
| Input ergonomics | 5/5 | Space/↑/click/tap flap; P pause; R/N restart; first flap starts the run; Space on an overlay routes to new-game; overlay gating early-returns input. |
| Polish & accessibility | 5/5 | Inline data-URI favicon (no 404); `prefers-reduced-motion` honored in CSS *and* JS; never color-alone; responsive `min(94vw,56vh)` + aspect-ratio; `:focus-visible` with an older-browser fallback; `touch-action:manipulation`. |
| Failure modes | 5/5 | Single rAF loop with an idempotent `arm()` guard (no double-schedule); self-disarms on over/pause; fixed-timestep accumulator + 0.25s frame clamp + `lastT` reset on resume → deterministic, no pause teleport; ceiling clamp → no top-out soft-lock; test hook drives via fixed `dt`. |

**VERDICT: SHIP** (5/5/5/5/5). **Real code defects: none found.**

The judge logged five informational, non-blocking observations: (1) the `loop()` over-path has a
belt-and-suspenders top-guard + tail `onOver()` — verified to fire **exactly once** today (the tail
`return` disarms `running` and schedules no further rAF, so the top guard never re-fires for the
same death); (2) `syncHud` uses `Math.max(sessionBest, state.best)` over two agreeing "best" sources
(harmless redundancy); (3) scoring waits for the pipe's trailing edge (confirmed correct/conservative);
(4) no persistent high score / no audio (both out-of-scope v1 per D8/D9); (5) pause is `playing`-only
(intentional — nothing moves in `ready`). None are defects.

**Verdict line:** satisfied; accepted_residuals = [] (no cap-2 fix loop needed — the blind judge found
zero real code defects; the five observations are benign/out-of-scope and require no change).
