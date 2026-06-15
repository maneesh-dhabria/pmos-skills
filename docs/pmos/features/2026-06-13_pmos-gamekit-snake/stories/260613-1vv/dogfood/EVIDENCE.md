# T5/T6 — Live dogfood + Playwright e2e evidence (story 260613-1vv, /snake)

Launched the **real** bundled game through the shared zero-dependency launcher
(`node _shared/game-launcher/serve.js game/snake.html`, ephemeral port, loopback),
served over `http://127.0.0.1:61812/`, and drove it in a real Chromium via Playwright.

## Objective gates — all GREEN

| Gate | Result |
|---|---|
| Engine selftest | `node tests/run.mjs --selftest` → **20/20** checks, exit 0 |
| Launcher binds + serves | `Game ready at http://127.0.0.1:<port>/`; `curl /` → **200** |
| Console errors on load | **0 errors / 0 warnings** (inline data-URI favicon — the `/solitaire` 404 lesson held) |
| skill-eval `[D]` | **16/16 pass, 0 fail**, no residuals (`a-name-matches-dir` = `snake`) |
| Hygiene lints (4) | `lint-non-interactive-inline` (NI block byte-identical), `audit-recommended`, `lint-flags-vs-hints`, `lint-phase-refs` — all PASS |
| Single-file contract | one self-contained `game/snake.html`, no external refs, inline CSS+JS+favicon |

## Live Playwright e2e — every AC10 assertion proven on the served game

The driver started a game via the **real UI** (click *Normal* → *Start*), then `freeze()`d
the live `setInterval` loop so single-step assertions aren't raced by real time, and advanced
the engine one deterministic tick at a time through the same end/win handling the live loop uses.

| Behaviour | Live measurement |
|---|---|
| Head advances (deterministic tick) | head `(x,y)` → `(x+1,y)` heading right → `headAdvancedRight: true` |
| Steering (setDirection path) | `setDir('down')` then tick → head `y+1` → `steeredDown: true` |
| **Real key press** path | physical `ArrowRight` keydown then tick → head turned right → `realArrowKeyTurnedRight: true` |
| Eat → grow + score | food placed ahead, tick → length 3→**4**, score 0→**10**, HUD `score=10` `length=4` |
| Wall → game over (wrap off) | drove head into the top edge → `status: 'over'`, **game-over overlay shown**, final score **10** |
| Restart | clicked *Play again* → `status: 'playing'`, length **3**, score **0**, over-overlay hidden |
| **Board-fill win** (tiny 2×2 board, seeded) | steered onto food until the board filled → `status: 'won'`, **win overlay shown**, **80 confetti** nodes |

Screenshot: `snake-midgame.png` — full 20×20 board mid-game (snake length 7, score 40,
speed level 5), HUD + Pause/New-game + D-pad + key-legend all rendered.

## Subjective verdict (load-bearing dogfood)

Clean, modern single-screen arcade game. The snake reads clearly (lighter head vs body),
the food pellet is unambiguous, the HUD surfaces score / length / live speed level / session
best. Start screen makes difficulty and the walls-kill-vs-wrap choice explicit before play.
Controls are discoverable three ways (arrows, WASD, on-screen D-pad) with a visible legend,
and the no-reverse guard is called out. **Verdict: PASS** — no fix-loop iteration needed
(0 of the cap-2 used).

## Notes

- `window.__SNAKE_TEST__` is test-only scaffolding (freeze/setDir/stepEngine/startDeterministic);
  no real user input path mutates board size or bypasses the live loop.
- Game keeps no save state (D9) — the high score is per session; closing the tab discards it.
