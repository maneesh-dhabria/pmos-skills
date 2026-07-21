# Proposal — pmos-gamekit__snake

**Status: CAPPED (pass 2 of 2 complete — hard cap reached).**
Passes: pass 1 (8 findings F1–F8, all accepted), pass 2 (3 findings F9–F11, all accepted). This document is the complete, self-contained cumulative proposal. All changes are DESCRIBED, never implemented.

Unit files: `plugins/pmos-gamekit/skills/snake/` — `SKILL.md` (109 lines), `game/snake.html` (614 lines), `tests/run.mjs` (186 lines, 20-check vm engine harness with `--selftest`). Cited §K canonical home: `plugins/pmos-gamekit/skills/_shared/game-launcher/game-launcher.md`.

## Disposition table

| ID | Severity | Title | Disposition |
|---|---|---|---|
| snake-F1 | Should-fix | Decision-id namespace mismatch vs cited canonical home (D9 vs D6; engine D7/D4 collide/dangle) | Accepted (C1) |
| snake-F2 | Should-fix | Board-fill-win check: escape-hatch disjunct + dead fixture + invalid off-board snake | Accepted (C2) |
| snake-F3 | Should-fix | ~29 lines of inert non-interactive contract text; lint lacks a `prompt-free` exemption | Accepted (C3 — cross-unit, owner pmos-toolkit; snake's slice is a 1-line swap) |
| snake-F4 | Nit | Frozen block's self-cite `_shared/non-interactive.md` resolves nowhere in this plugin | Accepted (C4 — mooted in-plugin by C3; durable fix in canonical block source) |
| snake-F5 | Should-fix | Invalid CSS color `#243css` — D-pad press feedback silently dropped | Accepted (C5) |
| snake-F6 | Nit | "New best!" shown on a tie with the prior session best | Accepted (C6) |
| snake-F7 | Nit | HUD "Speed" level keeps climbing after the real tick has floored | Accepted (C7) |
| snake-F8 | Nit | Hook comment advertises a non-shipped Playwright e2e; `startDeterministic` permanently mutates COLS/ROWS | Accepted (C8, amended by F10) |
| snake-F9 | Should-fix | C3's naive-grep precondition would false-positive on the canonical Platform Adaptation bullet in all 7 gamekit skills | Accepted (amends C3) |
| snake-F10 | Nit | C8's restore point is singular but there are two new-game paths; `showStart()` redraws the grid from COLS/cell | Accepted (amends C8) |
| snake-F11 | Nit | Global Space `preventDefault` swallows Space-activation of focused Start / Play again buttons | Accepted (C9) |

Rejections/invalid: none. Cumulative: 11/11 accepted.

## Accepted changes

### C1 — Fix dangling/colliding decision-id cites (F1, Should-fix)
- **Files:** `SKILL.md` lines 100 and 108; `game/snake.html` comments at lines 206, 210, 279.
- **Before → after:** SKILL.md cites the no-persistence rule as **D9** twice; the canonical home defines it as **D6** (`## No persistence (D6)` at game-launcher.md:106) — replace both `D9` → `D6`. In snake.html, engine comments cite `(D4)` (lines 206, 210 — speed floor; exists nowhere in the shipped unit) and `(D7)` (line 279 — 180°-reverse guard; collides with the launcher home's D7 = single-file bundling, game-launcher.md:19). Drop the bare ids and describe by concept: "the hard speed floor", "the anti-instant-self-kill guard".
- **Rationale:** SKILL.md names game-launcher.md the §K canonical home; a decision cite resolving to nothing (D9, D4) or the wrong decision (D7) is the ghost-reference failure §J anchors exist to prevent. Concept-not-id is the same remedy as the recorded zero-match-gate lesson.
- **Blast radius:** two files in this unit only. `tests/run.mjs` matches `root.SnakeEngine`, not comments; `lint-phase-refs.sh` checks Phase/`{#slug}` refs, not D-ids. No lint/eval/test touched.

### C2 — Repair the board-fill-win [D] gate (F2, Should-fix)
- **File:** `tests/run.mjs` section 10 (lines 143–162).
- **Before → after:** (1) delete the dead `sb` 3x1 fixture (line 144) and its musing comments — created, commented, never asserted. (2) Replace the steer-toward-food loop on the auto-created 2x2 state — whose centered length-3 snake places a segment at x=-1, off-board (the engine has no `cols >= 3` guard) — with a hand-built valid fixture in the style of sections 6/7: `E.createState({cols:2,rows:2,...})` then overwrite `snake = [{x:0,y:0},{x:0,y:1},{x:1,y:1}]` (all on-board), `dir/nextDir = DIRS.right`, `food = {x:1,y:0}` (the sole free cell); one `E.step` → length 4 fills the 4-cell board. (3) Tighten the assertion to strictly `sb2.status === 'won'`, removing the `|| sb2.food === null` escape hatch (`createState` itself returns `food: null` when no free cell exists, so the disjunct lets the gate pass without ever winning).
- **Rationale:** the sole gate for SKILL.md's "board-fill states" feature-list claim can currently green without a win, carries coverage-shaped dead code, and proves the win only on an invalid off-board snake. A [D] gate must fail when its claim is false. Pass-2 reviewer independently verified the replacement fixture wins in one step (head (0,0) heading right eats (1,0); `placeFood` finds 0 free cells → `status:'won'`).
- **Blast radius:** run.mjs only. Check count stays exactly 20 (verified pass 2: 3+2+2+1+2+1+1+4+2+1+1), so `EXPECTED_CHECKS`/`--selftest` are untouched. No SKILL.md text cites the check count.

### C3 — `prompt-free` W14 exemption marker at lint/rubric level (F3 Should-fix, amended by F9 Should-fix)
- **Owner:** pmos-toolkit (cross-unit; must ship as its own coordinated story, NOT folded into snake-local fixes). Until it lands, snake keeps the byte-identical frozen block — hand-editing it locally is forbidden.
- **Change:** `tools/lint-non-interactive-inline.sh` gains a third self-documenting exemption marker `<!-- non-interactive: prompt-free -->`, accepted only when the lint deterministically verifies the precondition: zero real `AskUserQuestion` call sites and zero Task-dispatch lines in the skill body.
- **F9 amendment (precondition sharpening — REQUIRED):** the precondition MUST NOT be a naive token grep. All 7 gamekit SKILL.md files (2048:32, flappy-bird:36, poker:39, snake:33, solitaire:33, sudoku:36, tetris:33) carry the canonical Platform Adaptation bullet containing the literal token `AskUserQuestion` ("No `AskUserQuestion` tool: Not used — this skill is prompt-free…"), and that bullet SURVIVES C3 — a naive grep would reject the marker on the exact 7 skills it exists for (the known zero-match-gate-scans-meta-prose trap). Instead, the lint reuses the SAME shared call-site extractor `tools/audit-recommended.sh` already uses — the one that skips the two provably-never-a-prompt line shapes (the canonical "No `AskUserQuestion` tool" degradation bullet and negative prose like "Do NOT block on `AskUserQuestion`"). If that extractor is currently inline in audit-recommended.sh, factor it into a sourceable helper so both tools share one decision contract rather than two greps that can drift (preserve audit-recommended.sh's green-run semantics; re-run it on all plugins after the refactor).
- **Also:** document the marker alongside `refused`/`delegated` in `feature-sdlc/reference/skill-patterns.md` (W14 section) and mirror 1:1 in `skill-eval.md` (verify the rubric's counted-check constants if the W14 wording is a counted check); update game-launcher.md:57-58's "decided by the lint, not here" note to name the marker. Then, in a coordinated follow-up, all 7 gamekit SKILL.md files swap the ~29-line frozen block for the one-line marker. Snake's own slice: that one-line swap plus deleting the "inlined only to satisfy the repo-wide W14 lint; no checkpoint ever fires" apology at SKILL.md:34-35. The Platform Adaptation degradation bullet at SKILL.md:33 STAYS (canonical convention; the extractor exempts it).
- **Rationale:** the skill's own prose admits the block is inert — /snake issues zero prompts, produces no persistent artifact, dispatches no subagents; ~29 lines (~28% of the SKILL.md body) of unreachable contract text load on every invocation, duplicated 7×. The W14 posture (self-documenting markers, never a hidden allowlist) is preserved — this adds a marker, not an allowlist entry.
- **Blast radius:** LARGE — lint script, possible shared-extractor refactor of audit-recommended.sh, skill-patterns.md, skill-eval.md, game-launcher.md, 7 gamekit SKILL.md files.

### C4 — Dangling `_shared/non-interactive.md` self-cite in the frozen block (F4, Nit)
- **Primary remedy:** C3 — once gamekit skills carry the `prompt-free` marker instead of the block, the dangling cite ("sources the shared call-site extractor from Section D of this file (`_shared/non-interactive.md`)", SKILL.md:65) vanishes from this plugin entirely (`plugins/pmos-gamekit/skills/_shared/` contains only `game-launcher/`).
- **Durable fix (owner pmos-toolkit):** one-phrase reword in the canonical block source `skills/_shared/non-interactive.md` — "Section D of this file" → a plugin-agnostic cite ("pmos-toolkit's `skills/_shared/non-interactive.md`") — then a byte-identical re-paste into every consumer repo-wide (the lint enforces identity, so the re-paste is mechanical and lint-verified). Sequence AFTER C3 so the gamekit files are already out of the consumer set.
- **Rationale:** the block assumes it lives in the plugin that owns non-interactive.md; in every other plugin the self-reference resolves nowhere. Cannot be fixed snake-locally without breaking byte-identity.
- **Blast radius:** every user-invocable skill carrying the block, repo-wide (dozens of files) + the lint's reference copy.

### C5 — Fix invalid CSS color `#243css` on D-pad press state (F5, Should-fix)
- **File:** `game/snake.html:91` — `.dpad button:active { background: #243css; }`.
- **Before → after:** `#243css` (invalid — `css` are not hex digits; the declaration is dropped by every browser) → a valid hex one step lighter than the base `#1a2742`, e.g. `#243c5c`. Intent: visible press-state feedback on the primary touch control.
- **Rationale:** on a touch device with no keyboard the D-pad — called out in the SKILL.md feature list — gives zero press feedback. The vm engine harness never loads CSS, so nothing catches this today.
- **Blast radius:** none — CSS-only; no test/lint reads it. (Candidate follow-up: manual touch smoke row; out of scope.)

### C6 — "New best!" shown on a tie (F6, Nit)
- **File:** `game/snake.html` `endGame()` (lines 483–485).
- **Before → after:** `best` is updated first (`if (state.score > best) best = state.score;`), so `els.overBest.textContent = state.score >= best ? 'New best!' : …` is also true when the run merely ties the prior best. Capture `var prevBest = best;` before the update; display `state.score > prevBest ? 'New best!' : ('Best: ' + best)`.
- **Rationale:** the game-over card claims "New best!" for equalling the prior session best. `winGame()` verified to not display best — fix is endGame-only.
- **Blast radius:** none — UI-only string; not covered by run.mjs.

### C7 — HUD "Speed" level climbs past the real speed floor (F7, Nit)
- **File:** `game/snake.html` `speedLevel()` (lines 216–219).
- **Before → after:** `speedLevel` returns `foodsEaten + 1` unconditionally while `speedFor` clamps the real tick at `SPEED_FLOOR_MS = 60` (reached after ~9–10 foods on Fast). Cap the displayed level at the step where `speedFor` first reaches the floor: compute the smallest n with `speedFor(n, startSpeed) === SPEED_FLOOR_MS`, display `min(foodsEaten, n) + 1`, optionally suffix "(max)" at the cap. Chosen over renaming the stat ("Foods") because the HUD already implies speed and the length stat already tracks growth.
- **Rationale:** past the floor the "Speed" stat counts up while the tick is constant — it silently stops meaning its label.
- **Blast radius:** snake.html only. run.mjs tests `speedFor` (section 9), not `speedLevel` — no check touched; a future `speedLevel` check should assert the cap.

### C8 — Test-hook comment honesty + COLS/ROWS restore in BOTH new-game paths (F8 Nit, amended by F10 Nit)
- **File:** `game/snake.html` test hook (lines 572–590) + new-game wiring.
- **Before → after:** (1) comment at line 572 — drop "the Playwright e2e" (no Playwright spec ships anywhere in the unit); describe the actual consumer: "Test hook for automated drivers + the deterministic win path". (2) `startDeterministic` reassigns closure-level `COLS`/`ROWS` (line 584: `COLS = opts.cols || COLS; ROWS = opts.rows || ROWS;`) with no restore. Snapshot the shipped 20x20 defaults as `BASE_COLS`/`BASE_ROWS` next to their declaration (~line 364) and restore `COLS = BASE_COLS; ROWS = BASE_ROWS; cell = Math.floor(canvas.width / COLS);` at the top of **both** user-facing entry points. **F10 amendment:** there are TWO entry points, not one — `startGame()` (startBtn, overRestart, winRestart, R/N keys) AND `showStart()` (the ↻ New game button at snake.html:560; it sets `state = null` then calls `draw()`, which renders the background grid from `COLS`/`cell` — restoring only in `startGame()` would leave the start-screen backdrop drawn at tiny-board scale, e.g. 2 giant cells, until Start is pressed). Naming both call sites makes the spec impossible to implement half-way.
- **Rationale:** a comment advertising a consumer that doesn't exist misleads maintainers into hunting for a spec; the un-restored mutation makes the hook non-idempotent with the live UI it shares closure state with.
- **Blast radius:** snake.html only; run.mjs never loads the DOM script — no check touched.

### C9 — Space `preventDefault` swallows Space-activation of focused buttons (F11, Nit)
- **File:** `game/snake.html` keydown handler, line 534.
- **Before → after:** the Space/P branch (`if (e.key === 'p' || e.key === 'P' || e.key === ' ' || e.key === 'Spacebar') { togglePause(); e.preventDefault(); return; }`) runs unconditionally, but `togglePause()` guards `if (!state || state.status !== 'playing') return;` (line 500) — so with no active game, Space on a focused "Start ▶" / "Play again ↻" `<button>` does nothing AND has its default button-activation cancelled. Make the branch conditional: `if (state && state.status === 'playing') { togglePause(); e.preventDefault(); } return;` — only swallow Space when the toggle will actually act; otherwise let the browser activate the focused button. (Equivalent alternative — early-return when `e.target.closest('button')` — the state-guard is preferred as it also covers Space on `<body>` after game over.) P stays inside the same guard (no conflicting default). The R/N branch is intentionally left unconditional: `startGame()` is safe from any state.
- **Rationale:** the page ships `:focus-visible` outlines on every control (snake.html:70/80/92) — keyboard operation is explicit design intent; a keyboard user Tabbing to Start and pressing Space gets silently nothing (Enter works, and "Resume" works coincidentally because Space toggles pause directly, which is why this hides).
- **Blast radius:** snake.html only; invisible to run.mjs (DOM script never loaded). Verification: manual keyboard smoke (Tab to Start, press Space).

## Sequencing notes
- C1, C2, C5, C6, C7, C8, C9 are snake-local and independent — can land together as one story.
- C3 is a cross-unit lint/rubric change (owner pmos-toolkit) and must ship as its own coordinated story; the gamekit block-swap (including snake's 1-line slice) follows it.
- C4's durable fix (canonical block reword + repo-wide byte-identical re-paste) sequences AFTER C3.

## Open questions
None — all 11 findings across both passes were accepted; no unresolved disagreements between reviewer and author.
