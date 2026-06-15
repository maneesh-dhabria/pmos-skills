# T5/T6 — Live dogfood + Playwright e2e evidence (story 260613-f71, /sudoku)

Launched the **real** bundled game through the shared zero-dependency launcher
(`node _shared/game-launcher/serve.js game/sudoku.html`, ephemeral port, loopback),
served over `http://127.0.0.1:62180/`, and drove it in a real Chromium via Playwright.

## Objective gates — all GREEN

| Gate | Result |
|---|---|
| Engine selftest | `node tests/run.mjs --selftest` → **29/29** checks, exit 0 |
| Launcher binds + serves | `Game ready at http://127.0.0.1:<port>/`; `curl /` → **200** |
| Console errors on load | **0 errors / 0 warnings** (inline data-URI favicon — the `/solitaire` 404 lesson held) |
| skill-eval `[D]` | **16/16 pass, 0 fail**, no residuals (`a-name-matches-dir` = `sudoku`) |
| Hygiene lints (4) | `lint-non-interactive-inline` (NI block byte-identical to /solitaire), `audit-recommended`, `lint-flags-vs-hints`, `lint-phase-refs` — all PASS |
| Single-file contract | one self-contained `game/sudoku.html`, no external refs, inline CSS+JS+favicon |
| Generation reliability | 30 seeds × 3 difficulties: **90/90 grade-match, 0 degraded, every puzzle unique** (easy 40 givens, medium 22–27, hard 23–27) |

## Live Playwright e2e — every AC assertion proven on the served game

Started a game via the **real UI** (clicked *Easy* / *Hard* on the start screen), then drove
the board through the real DOM + a thin `window.__SUDOKU_TEST__` seam (select / place / known-solution
fill) so single assertions are deterministic.

| Behaviour | Live measurement |
|---|---|
| Easy game generates + starts | unique puzzle, **40 givens**, start screen hidden |
| Cell entry (keyboard + pad) | selected an empty cell, typed the digit → board updated; pad remaining-count badge updated |
| **Real physical keydown** | `page.keyboard.press('8')` into the selected cell → `board[3] === 8` (correct solution digit) |
| Arrow-key navigation | `ArrowRight` keydown → selection moved `sel → sel+1` |
| Pencil notes | Notes mode + digit 7 → `.notes` sub-grid in that cell rendered "7" |
| Auto-notes | filled legal pencil candidates into **every** empty cell (count == empties) |
| On-demand **Check** | wrong entry → that cell flagged `.badcell`; a **correct** filled cell and an **empty** cell were **not** flagged (D7: never flags empties) |
| Peer / selection highlight | selecting a cell lit **20 peers** + 1 `.sel`, same-digit cells highlighted |
| **Hint** (tiered) | revealed one logical step → +1 filled cell, value matched the unique solution, message `Hint: R3C2 has only one candidate (3).` |
| Hard game generates | live `generate('hard')` → grade **hard**, 24 givens, unique solution |
| **Win celebration** | completed board → `won:true`, win overlay shown, **90 confetti** nodes, stats `Level easy · 0:36 · 0 mistakes` |
| Console | **0 errors / 0 warnings** across the whole session |

Screenshot: `sudoku-hard-autonotes.png` — live hard board mid-game with auto-filled pencil
candidates in every empty cell, thick 3×3 box borders, selected-cell + peer highlight,
HUD (Hard / time / mistakes), number pad with remaining-count badges, and the full action row.

## Bug caught + fixed live (cap-2 fix loop, 1 of 2 used)

Clicking **New** *after winning* left the win overlay mounted on top of the start screen,
intercepting all pointer events (Playwright `click` timed out — the win `<div>` "intercepts
pointer events"). Root cause: the `btn-new` handler showed the start screen but never hid
`winEl`. **Fix:** `btn-new` now hides the win overlay before showing the start screen
(`winEl.classList.add('hidden')`). Re-verified live: a fresh Hard game from *New* after a
prior win shows `winHidden:true` and is fully playable. No second iteration needed.

## Subjective verdict (load-bearing dogfood)

Clean, modern single-screen logic puzzle. Givens read boldly against entries; the selected
cell, its peers, and same-digit cells are clearly differentiated (never color-alone — the
selection also carries an inset border). Pencil candidates sit unobtrusively in 3×3 sub-grids.
The number pad's remaining-count badges and the action row (Notes / Auto-notes / Erase / Hint /
Check / Auto-check / Undo / Redo) make every affordance discoverable, with a keyboard legend
below. Difficulty is graded by the actual techniques required (verified: easy=singles,
medium=pairs, hard=X-Wing/XY-Wing), and every puzzle is provably unique. **Verdict: PASS.**

## Notes

- `window.__SUDOKU_TEST__` is test-only scaffolding (getState / setGame / select / place /
  solveAllButOne / winNow / isWon); no real user input path depends on it.
- Game keeps no save state (D6) — the timer + mistakes are per session; closing the tab discards the puzzle.
