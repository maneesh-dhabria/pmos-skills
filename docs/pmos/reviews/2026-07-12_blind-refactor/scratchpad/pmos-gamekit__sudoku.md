## Pass 1 — reviewer findings

### sudoku-F1 [Should-fix] Degraded generation silently mislabels difficulty in the HUD
- Where: plugins/pmos-gamekit/skills/sudoku/game/sudoku.html:597 (engine) and :696 (UI)
- Quote: "if (best) { best.degraded = true; return best; }"
- Problem: When 150 attempts fail to hit the requested tier, `generate()` returns the closest puzzle with `degraded: true` — but the UI never reads that flag. `newGame()` sets the HUD from the *requested* difficulty (`document.getElementById('hud-diff').textContent = difficulty.charAt(0).toUpperCase()...`), so a user who asked for Hard can silently get a Medium-graded puzzle labeled "Hard". The SKILL.md sells "graded by the actual solving techniques it requires" and the repo's own D2 posture is "fail loud, no silent downgrade" — the engine honors that (it sets the flag) and the UI drops it on the floor. One `setMsg()` line would fix it.

### sudoku-F2 [Should-fix] ~40% of SKILL.md is a frozen non-interactive contract the skill itself declares dead
- Where: plugins/pmos-gamekit/skills/sudoku/SKILL.md:37
- Quote: "The non-interactive contract block below is inlined only to satisfy the
  repo-wide W14 lint; no checkpoint ever fires."
- Problem: Token economy / policy defect the skill-eval rubric structurally cannot see (the rubric *requires* the block). The 28-line byte-frozen block (SKILL.md:47–75) — FR-01 mode resolution, OQ buffering, subagent marker prepending, even a `pmos-toolkit: /<skill> finished` stderr summary hard-branded for a *different plugin* (line 74) — loads into context on every `/sudoku` launch of a skill whose entire real body is ~50 lines and which by design issues zero prompts. The W14 exemption system already has self-documenting markers (`refused`, `delegated`); a third `prompt-free` marker (assertable by lint: no `AskUserQuestion` token in body) would eliminate this dead weight across the whole gamekit. The skill even has to spend its Platform Adaptation section apologizing for the block (line 36–38) — a smell that the policy, not the skill, is wrong.

### sudoku-F3 [Should-fix] "New" mid-game leaves the old game keyboard-live behind the overlay, with no cancel
- Where: plugins/pmos-gamekit/skills/sudoku/game/sudoku.html:970
- Quote: "stopTimer(); winEl.classList.add('hidden'); startEl.classList.remove('hidden');"
- Problem: Pressing **New** only stops the timer and shows the difficulty overlay; `G` is neither cleared nor paused. The global keydown handler guards only `if (!G) return;` (line 984), so digits/arrows/H/C still mutate the old board hidden behind the semi-opaque dialog — a stray keystroke can place digits or even trigger `win()` + confetti under the picker. And there is no way to dismiss the picker and resume the game you just hid (no cancel button, no Escape) — an accidental "New" click destroys access to a half-finished puzzle even though its state is intact in memory. Setting `G.paused = true` (or `G = null`) plus a Cancel affordance fixes both.

### sudoku-F4 [Nit] Test seam's comment claims an e2e that doesn't exist anywhere in the plugin
- Where: plugins/pmos-gamekit/skills/sudoku/game/sudoku.html:1002
- Quote: "// ---- minimal test seam (lets the e2e drive the engine deterministically toward a win) ----"
- Problem: `window.__SUDOKU_TEST__` (~30 lines incl. `winNow`, `solveAllButOne`) is referenced by zero files outside the game HTML — `grep -rn __SUDOKU_TEST__ plugins/` finds only the definition, and the skill ships only the vm engine test (`tests/run.mjs`). So the shipped artifact carries dead code whose comment cites nonexistent test infrastructure. Either add the e2e the comment promises (the seam is well-designed for one) or trim the seam/comment.

### sudoku-F5 [Nit] Pause is timer-only: board stays visible and Check still works while paused
- Where: plugins/pmos-gamekit/skills/sudoku/game/sudoku.html:789
- Quote: "function check() {
    if (!G || G.won) return;"
- Problem: `hint()` guards `G.won || G.paused` (line 801) but `check()` omits the `paused` guard — you can freeze the timer and run correctness checks for free. More broadly, pausing never obscures the grid (no pause overlay), so "pause" grants unlimited zero-cost scanning time, making the Time stat soft. Single-player, so you only cheat yourself — but the inconsistency between hint's guard and check's is clearly unintentional.

### sudoku-F6 [Nit] SKILL.md advertises "tiered hints" but every hint immediately fills a cell
- Where: plugins/pmos-gamekit/skills/sudoku/SKILL.md:16 (impl: game/sudoku.html:814–825)
- Quote: "(difficulty picker, pencil notes with auto-candidates, tiered hints, on-demand Check + live"
- Problem: "Tiered hints" reads as progressive disclosure (nudge → technique → reveal), but `hint()` always calls `revealCell()`, which places the digit in one shot; the only "tier" is the internal technique ladder used to pick the step. The reason strings are genuinely nice, but the doc overclaims the UX. Either soften the wording ("technique-explained hints") or add a first tier that highlights the cell/explains without placing.

### sudoku-F7 [Nit] `maximum-scale=1` viewport blocks pinch-zoom
- Where: plugins/pmos-gamekit/skills/sudoku/game/sudoku.html:5
- Quote: "<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">"
- Problem: Disabling user zoom is a WCAG 1.4.4 anti-pattern — pencil notes render at `clamp(7px,2.1vw,11px)` (line 66), exactly the content a low-vision player would need to zoom into. iOS Safari ignores the cap nowadays but Android Chrome honors it. Drop `maximum-scale=1`; `touch-action:manipulation` on the board already suppresses double-tap zoom where it matters.

### sudoku-F8 [Nit] Mistakes stat is only live with Auto-check on, yet is always displayed — and undo rewinds it
- Where: plugins/pmos-gamekit/skills/sudoku/game/sudoku.html:758
- Quote: "if (G.autoCheck && G.solution && d !== G.solution[i]) { G.mistakes++; }"
- Problem: The HUD permanently shows a "Mistakes" stat (line 102), but it only increments when the opt-in Auto-check toggle is on; with it off (the default) a board full of wrong entries reads "0 Mistakes", and manual Check never counts. Additionally `pushHistory()` snapshots `mistakes` pre-move, so undoing a wrong entry erases it from the tally — the win-screen "N mistakes" line is therefore farmable to zero. Fine for a casual game, but the stat's semantics should either be honest (hide it until Auto-check is on) or permanent (don't rewind on undo), not both loose.

**Pass 1 verdict:** 0 blockers / 3 should-fix / 5 nits — material findings

## Pass 1 — author response

### sudoku-F1 — Accepted
- Fix: game/sudoku.html · `newGame()` (~line 690–700) · Before: HUD is set from the *requested* difficulty and `pz.degraded` is never read after generation. After: `newGame()` inspects the returned puzzle object; when `degraded` is true it (a) sets the HUD Level from the puzzle's actual graded tier (the engine's return object, not the request), and (b) emits one `setMsg('Couldn\'t build a true <Requested> in time — closest match served.', 'bad')` so the downgrade is loud. Non-degraded path unchanged.
- Rationale: verified — `best.degraded = true` at line 597 and the fully-degraded fallback at 598 both set the flag; grep shows the only other `degraded` reference (line 760) is the conflict-check fallback, so the UI genuinely drops the flag. SKILL.md sells technique-graded difficulty; the D2 "fail loud" posture demands the label be honest.
- Blast radius: game/sudoku.html only. `tests/run.mjs` exercises the engine, not the DOM — unaffected. SKILL.md untouched.

### sudoku-F2 — Accepted (implementation owned by the shared W14/substrate unit; sudoku's own diff is trivial)
- Fix: policy change first — pmos-toolkit `tools/lint-non-interactive-inline.sh` (its exemption branch currently reads `grep -qE '^[[:space:]]*<!-- non-interactive: (refused|delegated)'`) gains a third self-documenting marker, `<!-- non-interactive: prompt-free -->`, valid ONLY when the lint can also assert the SKILL.md body contains zero `AskUserQuestion` tokens (a deterministic §H hard-gate condition, greppable). Mirror the marker in `skills/_shared/non-interactive.md` (Section on exemptions), `feature-sdlc/reference/skill-patterns.md`, and the paired `skill-eval.md` check so rubric and lint stay 1:1. Then in sudoku's SKILL.md: delete lines 47–75 (the frozen block) and the apology sentence at 36–38, replacing them with the one-line marker + a one-line comment naming why. Same swap applies to the other 6 gamekit launch-only skills (all carry the block per grep).
- Rationale: verified — SKILL.md:37–38 literally documents the block as dead ("inlined only to satisfy the repo-wide W14 lint; no checkpoint ever fires"), and line 74 hard-brands a `pmos-toolkit:` stderr summary inside a pmos-gamekit skill. ~28 dead lines × 7 skills loaded on every launch is real token cost, and the exemption mechanism (self-documenting markers, no hidden allowlist) already exists — this extends it, it doesn't weaken it.
- Blast radius: LARGE and cross-plugin — pmos-toolkit tools/lint-non-interactive-inline.sh, skills/_shared/non-interactive.md (sync-shared intersection!), skill-patterns.md §W14 prose, skill-eval.md paired check (count assertions in skill-eval-check.sh --selftest may need bumping), all 7 pmos-gamekit SKILL.md files, CI skill-hygiene workflow. Must land as one coordinated change in the shared unit; sudoku must NOT strip the block before the lint accepts the marker (lint would go red). If the shared unit declines the policy change, sudoku keeps the block and this finding converts to no-op — the sudoku-local apology prose is already the honest documentation of the constraint.

### sudoku-F3 — Accepted
- Fix: game/sudoku.html · `btn-new` handler (line ~970) + start-overlay markup + keydown handler. Before: handler is `stopTimer(); winEl.classList.add('hidden'); startEl.classList.remove('hidden');` — old `G` stays live and keyboard-reachable, no way back. After: handler additionally sets `G.paused = true` before showing the picker (placeDigit/hint/autoNotes already guard on `paused`, verified lines 742/801/828 — so one flag closes the input leak; add the same guard to `check()` per F5). Start overlay gains a "Resume" / cancel affordance rendered only when `G && !G.won` (plus Escape in the keydown handler closing the picker), which hides the overlay, un-pauses via the existing `togglePause()` clock-rebase logic, and restarts the timer.
- Rationale: verified quote and behavior — the global keydown guard is only `if (!G) return;` (line 984), so digits mutate the hidden board; and the picker is modal with no exit, destroying access to an intact in-memory game.
- Blast radius: game/sudoku.html only (markup + a few JS lines). No engine change; tests/run.mjs unaffected.

### sudoku-F4 — Accepted (minimal form)
- Fix: game/sudoku.html:1002 · comment only. Before: "// ---- minimal test seam (lets the e2e drive the engine deterministically toward a win) ----". After: reword to describe reality — a manual/automation debug seam, e.g. "// ---- test seam: lets browser automation or manual console drive the engine deterministically (no bundled e2e consumes this) ----". Keep the seam itself: it is small, well-designed, and useful for exactly the kind of live dogfood the repo's own memory notes say catches what [D]/[J] gates miss.
- Rationale: verified — `grep -rn __SUDOKU_TEST__` across plugins/ finds only the definition; the comment cites infrastructure that doesn't exist. Adding a real Playwright e2e is out of proportion for a nit; honest comment is the right-sized fix.
- Blast radius: none (comment text in one file).

### sudoku-F5 — Accepted
- Fix: game/sudoku.html · `check()` (line 789). Before: `if (!G || G.won) return;`. After: `if (!G || G.won || G.paused) return;` — matching `hint()`/`autoNotes()`/`placeDigit()` which all already guard `paused` (verified lines 742/801/828). Additionally (small, in-scope polish): when `G.paused`, `render()` applies a board veil class (cells blanked or blurred + a "Paused" label) so pause can't be used as free scan time; render already re-runs on toggle (line 941).
- Rationale: the guard asymmetry is clearly unintentional — every other mutating/assisting action checks `paused`. The veil makes the Time stat honest at trivial cost.
- Blast radius: game/sudoku.html only (one guard token + ~10 lines CSS/render). Interacts positively with F3 (paused-behind-picker).

### sudoku-F6 — Accepted
- Fix: SKILL.md line 16 · Before: "…pencil notes with auto-candidates, tiered hints, on-demand Check…". After: "…pencil notes with auto-candidates, technique-explained hints, on-demand Check…". Doc-only; no UX change — the reveal-with-reason behavior is fine, the claim just overstates it.
- Rationale: verified — `hint()` always ends in `revealCell()`; there is no nudge/technique/reveal ladder in the UX, only in step *selection*. "Technique-explained" is accurate to the genuinely good reason strings.
- Blast radius: SKILL.md prose only. The frontmatter description doesn't use "tiered" (verified) — no trigger/description impact, no lint impact.

### sudoku-F7 — Accepted
- Fix: game/sudoku.html:5 · Before: `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">`. After: drop `, maximum-scale=1`.
- Rationale: verified quote; WCAG 1.4.4 — and the 7px-floor pencil notes (`font-size:clamp(7px,2.1vw,11px)`, line 66) are precisely the content low-vision players need to zoom. `touch-action` already handles double-tap suppression where it matters.
- Blast radius: game/sudoku.html one attribute. Worth an eyeball on Android Chrome that board layout survives pinch-zoom (it should — zoom is viewport-scale, not reflow).

### sudoku-F8 — Accepted (partial: make the counter honest-monotonic; keep it displayed)
- Fix: game/sudoku.html · `pushHistory()`/`undo()`/`redo()` (lines 719–735) + `win()` (line ~780). Before: `pushHistory()` snapshots `mistakes` and undo/redo restore it, so wrong entries can be rewound out of the tally. After: (a) remove `mistakes` from the history/future snapshots — the counter becomes monotonic for the game, matching the convention of every mainstream sudoku app; (b) the win-stats line reports mistakes only when Auto-check was ever enabled this game (a one-bit `G.autoCheckUsed` flag), otherwise omits the clause, so "0 mistakes" is never claimed for an unchecked game; HUD stat shows "—" until the flag is set. I reject the alternative of hiding the stat entirely — discoverability of the Auto-check feature benefits from the visible slot.
- Rationale: verified — increment only under `G.autoCheck` (line 758) and snapshot at line 720. Both loosenesses are real; fix (a)+(b) makes the stat's semantics self-consistent without redesigning manual Check (counting on manual Check would double-count re-checks and is out of proportion for a nit).
- Blast radius: game/sudoku.html only. `tests/run.mjs` is engine-level (generation/solve/grading) — mistakes bookkeeping lives in the UI layer, unaffected. The `__SUDOKU_TEST__.setGame` state object includes `mistakes: 0` — unchanged shape.

**Author verdict:** 8/8 accepted (F2 conditional on the shared W14-policy unit; F4 and F8 in reduced/minimal form). 0 rejected, 0 invalid.
