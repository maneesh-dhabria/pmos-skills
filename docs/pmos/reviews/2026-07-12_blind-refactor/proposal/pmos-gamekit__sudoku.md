# Proposal — pmos-gamekit__sudoku

**Unit:** `plugins/pmos-gamekit/skills/sudoku/` (SKILL.md, game/sudoku.html, tests/run.mjs)
**Status:** OPEN — pass 1 complete (reviewer pass 1 + author response 1). No changes implemented; this document describes intended changes only.

## Finding ledger

| ID | Severity | Disposition |
|---|---|---|
| sudoku-F1 | Should-fix | Accepted |
| sudoku-F2 | Should-fix | Accepted — conditional on shared W14-policy unit |
| sudoku-F3 | Should-fix | Accepted |
| sudoku-F4 | Nit | Accepted (minimal form: comment reword, seam kept) |
| sudoku-F5 | Nit | Accepted (guard fix + pause veil) |
| sudoku-F6 | Nit | Accepted (doc wording only) |
| sudoku-F7 | Nit | Accepted |
| sudoku-F8 | Nit | Accepted partial (monotonic counter + conditional display; full "count on manual Check" rejected) |

All 8 findings were spot-checked against the files: every quote exists verbatim at the cited line. 0 invalid, 0 rejected outright.

---

## Accepted changes (described, not implemented)

### C1 — Surface degraded generation in the UI (F1, Should-fix)
- **File/section:** `game/sudoku.html`, `newGame()` (~lines 690–700).
- **Before:** `generate()` sets `degraded: true` when 150 attempts miss the requested tier (line 597: `if (best) { best.degraded = true; return best; }`; full-fallback at 598), but `newGame()` sets the HUD from the *requested* difficulty (line 696) and never reads the flag — a user asking for Hard can silently get an easier-graded puzzle labeled "Hard".
- **After:** `newGame()` checks the returned puzzle's `degraded` flag; when set, it (a) labels the HUD Level from the puzzle's actual graded tier as carried on the returned object, and (b) shows one message via the existing `setMsg()` channel, e.g. "Couldn't build a true Hard in time — closest match served." Non-degraded path unchanged.
- **Rationale:** SKILL.md advertises technique-graded difficulty; the repo's D2 posture is fail-loud/no-silent-downgrade. The engine honors it; the UI drops it.
- **Blast radius:** `game/sudoku.html` only. `tests/run.mjs` tests the engine, not the DOM. SKILL.md untouched.

### C2 — Replace the dead 28-line non-interactive block with a lint-recognized `prompt-free` exemption marker (F2, Should-fix; **cross-plugin — implementation owned by the shared W14/substrate unit**)
- **Files/sections:**
  1. pmos-toolkit `tools/lint-non-interactive-inline.sh` — exemption branch (currently `grep -qE '^[[:space:]]*<!-- non-interactive: (refused|delegated)'` at line 53) gains a third marker, `<!-- non-interactive: prompt-free -->`, accepted ONLY when the lint also asserts the SKILL.md body contains zero `AskUserQuestion` tokens (deterministic, greppable — a §H hard gate, not a hidden allowlist).
  2. `skills/_shared/non-interactive.md` exemption docs, `feature-sdlc/reference/skill-patterns.md` (W14 posture), and the paired `skill-eval.md` check — updated in lockstep so rubric and lint stay 1:1 (selftest count assertions in `skill-eval-check.sh --selftest` may need bumping).
  3. `plugins/pmos-gamekit/skills/sudoku/SKILL.md` — delete the frozen block (lines 47–75) and the apology at 36–38 ("The non-interactive contract block below is inlined only to satisfy the repo-wide W14 lint; no checkpoint ever fires."), replacing both with the one-line marker plus a one-line reason comment. Same swap for the other 6 gamekit launch-only skills (all carry the block).
- **Rationale:** ~40% of sudoku's SKILL.md is a byte-frozen contract the skill itself documents as dead, including a `pmos-toolkit:`-branded stderr summary (line 74) inside a gamekit skill — pure context cost on every launch, ×7 skills. The self-documenting-marker mechanism already exists; this extends it without weakening the audit (the zero-AskUserQuestion assertion is stronger than the block for prompt-free skills).
- **Ordering constraint:** sudoku must NOT strip the block before the lint accepts the marker (lint would fail). If the shared unit rejects the policy change, this finding converts to no-op for sudoku — the existing apology prose already documents the constraint honestly.
- **Blast radius:** LARGE — lint script, `_shared/non-interactive.md` (sync-shared intersection file — coordinate the cross-plugin copy), skill-patterns.md, skill-eval.md + its selftest counts, all 7 gamekit SKILL.md files, CI `skill-hygiene.yml` run. One coordinated change.

### C3 — "New" mid-game: pause the old game and add a cancel path (F3, Should-fix)
- **File/section:** `game/sudoku.html`, `btn-new` handler (line ~970), start-overlay markup, global keydown handler.
- **Before:** handler is `stopTimer(); winEl.classList.add('hidden'); startEl.classList.remove('hidden');` — old `G` stays live behind the picker (keydown guard is only `if (!G) return;`, line 984), so stray keys mutate the hidden board; and the picker has no cancel, so an accidental "New" strands an intact half-finished game.
- **After:** the handler also sets `G.paused = true` (closing the input leak — `placeDigit`/`hint`/`autoNotes` already guard `paused`; `check()` gains the guard via C5). The start overlay gains a "Resume" affordance rendered only when `G && !G.won`, plus Escape handling, which hides the picker and un-pauses using the existing `togglePause()` clock-rebase logic.
- **Blast radius:** `game/sudoku.html` only; interacts positively with C5.

### C4 — Fix the test-seam comment's false e2e claim (F4, Nit)
- **File/section:** `game/sudoku.html:1002` comment above `window.__SUDOKU_TEST__`.
- **Before:** "// ---- minimal test seam (lets the e2e drive the engine deterministically toward a win) ----" — but `grep -rn __SUDOKU_TEST__` across `plugins/` finds only the definition; no e2e exists.
- **After:** reword to reality, e.g. "// ---- test seam: lets browser automation or the console drive the engine deterministically (no bundled e2e consumes this) ----". The seam itself is kept — small, well-designed, useful for live dogfooding.
- **Blast radius:** none (comment text).

### C5 — Add `paused` guard to `check()` and veil the board while paused (F5, Nit)
- **File/section:** `game/sudoku.html`, `check()` (line 789) and `render()`.
- **Before:** `check()` guards `if (!G || G.won) return;` while `hint()`/`autoNotes()`/`placeDigit()` all also guard `G.paused` — pause freezes the timer but the grid stays visible and Check still works, granting free scan time.
- **After:** `check()` gains `|| G.paused`; `render()` applies a board-veil class while paused (cell values hidden/blurred + a "Paused" label — render already re-runs on toggle, line 941).
- **Blast radius:** `game/sudoku.html` only (~1 token + ~10 lines CSS/render).

### C6 — Soften "tiered hints" to "technique-explained hints" (F6, Nit)
- **File/section:** `SKILL.md` line 16 body prose.
- **Before:** "…pencil notes with auto-candidates, tiered hints, on-demand Check…" — but `hint()` always ends in `revealCell()`; the "tiers" exist only in step *selection*, not progressive disclosure.
- **After:** "…technique-explained hints…" — accurate to the genuinely good reason strings. Doc-only; no UX change.
- **Blast radius:** SKILL.md prose only; frontmatter description doesn't use "tiered"; no lint/trigger impact.

### C7 — Drop `maximum-scale=1` from the viewport meta (F7, Nit)
- **File/section:** `game/sudoku.html:5`.
- **Before:** `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">` — blocks pinch-zoom on Android Chrome (WCAG 1.4.4), exactly where 7px-floor pencil notes (line 66) need zooming.
- **After:** remove `, maximum-scale=1`. `touch-action:manipulation` already suppresses double-tap zoom on the board.
- **Blast radius:** one attribute; eyeball Android Chrome pinch-zoom afterwards.

### C8 — Make the Mistakes counter monotonic and its display honest (F8, Nit — partial accept)
- **File/section:** `game/sudoku.html`, `pushHistory()`/`undo()`/`redo()` (lines 719–735), `win()` (~780), HUD stat.
- **Before:** mistakes increment only under Auto-check (line 758: `if (G.autoCheck && G.solution && d !== G.solution[i]) { G.mistakes++; }`), yet the HUD always shows the stat ("0 Mistakes" on a wrong-filled board with Auto-check off); and `pushHistory()` snapshots `mistakes`, so undo rewinds the tally — the win-line is farmable to zero.
- **After:** (a) remove `mistakes` from history/future snapshots — counter becomes monotonic per game; (b) track a one-bit `G.autoCheckUsed` flag; win-stats include the mistakes clause only when it's set, and the HUD stat shows "—" until then.
- **Explicitly rejected sub-option:** counting mistakes on manual `check()` — would double-count across re-checks and redesigns the feature; out of proportion for a nit. Also rejected: hiding the stat entirely — the visible slot aids Auto-check discoverability.
- **Blast radius:** `game/sudoku.html` only; `tests/run.mjs` is engine-level (unaffected); `__SUDOKU_TEST__.setGame`'s state shape unchanged.

---

## Rejections

None outright. Partial rejections are documented inline in C4 (no new e2e) and C8 (no manual-Check counting, no stat removal).

## Notes for the next reviewer

- C2 is the only change that leaves this unit's directory; treat its sudoku-local diff (block → marker swap) as blocked-on the shared W14 unit's decision. Everything else is self-contained in `game/sudoku.html` + one SKILL.md prose word.
- C3 and C5 share the `G.paused` mechanism — review them together.
