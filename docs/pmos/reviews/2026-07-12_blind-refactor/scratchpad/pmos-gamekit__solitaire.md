## Pass 1 — reviewer findings

Scope read in full: SKILL.md (109 lines), game/solitaire.html (1073 lines), tests/run.mjs (169 lines); cited substrates plugins/pmos-gamekit/skills/_shared/game-launcher/{game-launcher.md,serve.js} read in full. Engine self-test executed: `node tests/run.mjs --selftest` → 24/24, exit 0. The plugin's `_shared/` holds only `game-launcher/`.

### solitaire-F1 [Should-fix] Undo silently desyncs the draw-mode toggle from actual game behavior
- Where: plugins/pmos-gamekit/skills/solitaire/game/solitaire.html:566 (undo), :539–543 (setDrawMode)
- Quote: "state = history.pop();
    moves += 1;
    render();
    afterStateChange();"
- Problem: `setDrawMode` mutates `state.drawCount` in place without a history entry, but every `commit` snapshot captures `drawCount`. Sequence: play a move in Draw 1 → toggle Draw 3 → press U. The popped snapshot restores `drawCount: 1`, but `undo()` never calls `setDrawMode`, so the header buttons still show Draw 3 pressed (`aria-pressed="true"`) while the next stock click draws one card. UI and engine state disagree until the user re-toggles. Fix is one line: re-derive the toggle from `state.drawCount` after pop (or have `render()` own the toggle state).

### solitaire-F2 [Should-fix] Deadlock banner under-fires: reversible no-progress shuffles count as "productive", so many genuinely stuck deals never get the prompt SKILL.md promises
- Where: plugins/pmos-gamekit/skills/solitaire/game/solitaire.html:411–415 (firstProductiveMove definition), :465–484 (isDeadlocked); promise at plugins/pmos-gamekit/skills/solitaire/SKILL.md:99
- Quote: "a non-blocking \"no moves left — deal a new game?\" prompt surfaces when the deal is genuinely stuck"
- Problem: "productive" is defined as any legal non-stock move, which includes moves that provably make no progress and are their own inverse — e.g. a red 6 shuttling between two black 7 tops, a lone King bouncing between empty columns, or any foundation→tableau pull. A deal whose only legal moves are such shuttles is genuinely stuck, yet `isDeadlocked` returns false forever and the F4 banner never shows — the exact user moment the feature exists for. (Secondary, documented: the scan forces `drawCount=1`, so draw-3 games where a card is unreachable at stride 3 also never flag — line 464's Inv-4 accepts this, but combined with the shuttle hole the banner misses most real stuck states.) A cheap tightening: exclude foundation→tableau and same-shape tableau→tableau moves that expose no face-down card and don't move onto/off an empty-column King from "productive", or detect a repeated-position cycle.

### solitaire-F3 [Should-fix] The frozen non-interactive block is ~28 lines of dead contract in a self-declared prompt-free skill, and it carries dangling cross-plugin cites
- Where: plugins/pmos-gamekit/skills/solitaire/SKILL.md:44–72 (block), :34–35 (self-exemption note), :65 (dangling cite)
- Quote: "inlined only to satisfy the repo-wide W14 lint; no checkpoint ever fires" (SKILL.md:35); "sources the shared call-site extractor from Section D of this file (`_shared/non-interactive.md`)" (SKILL.md:65)
- Problem: Two facets, one root cause. (a) Token economy: roughly a quarter of the SKILL.md body is mode-resolution/OQ-flush/subagent-dispatch machinery for prompts this skill can never issue — it loads into context on every "deal me a game" and the skill itself admits it is inert. (b) Substrate discipline: the frozen block cites `_shared/non-interactive.md` and `tools/audit-recommended.sh`, neither of which exists in pmos-gamekit (`skills/_shared/` contains only `game-launcher/`) — a dangling cite by the repo's own one-fact-one-home rules, baked in byte-identical because the lint's exemption vocabulary (`refused` / `delegated`) has no `prompt-free` marker. The fix belongs at the lint/contract level (add a self-documenting `<!-- non-interactive: prompt-free -->` exemption), which would delete the dead block from all seven gamekit skills at once. The skill-eval rubric cannot see this — it validates the block's byte-identity, not whether inlining it makes sense.

### solitaire-F4 [Should-fix] No shutdown story for the background launch — "Ctrl-C in the launcher terminal" doesn't exist when the agent launches it
- Where: plugins/pmos-gamekit/skills/solitaire/SKILL.md:89 and :100
- Quote: "**Launch** in the background so the server keeps running while you play" (SKILL.md:89); "Stopping is `Ctrl-C` in the launcher terminal." (SKILL.md:100)
- Problem: Phase 0 step 3 tells the agent to run serve.js as a background Bash task, then step 4 tells the user to stop it with Ctrl-C "in the launcher terminal" — but a background task has no terminal the user can Ctrl-C. Each `/solitaire` (and each sibling game) leaves an orphaned node server holding a port until the session's shells are reaped. The skill needs an honest stop instruction for its own launch mode (kill the background task / `kill <pid>` reported at launch), and ideally a "kill any previous solitaire serve.js before launching" step. game-launcher.md#launch-contract says "Ctrl-C stops the server" for the foreground case; the SKILL.md delta (background) changes that contract and states no delta for shutdown.

### solitaire-F5 [Nit] D2's hard Node requirement adds friction the artifact doesn't need — an explicit, loud file:// fallback would serve the player better
- Where: plugins/pmos-gamekit/skills/solitaire/SKILL.md:40–42; plugins/pmos-gamekit/skills/_shared/game-launcher/game-launcher.md:102–104
- Quote: "The game also opens directly from `file://` for play, but the launch contract uses the server (D2 — no silent `file://` fallback from the skill)."
- Problem: The skill itself concedes the single-file game plays fine from `file://`. D2's stated rationale is that a *silent* downgrade hides the missing prerequisite — but the alternative to silence is a loud one ("Node not found; opening from file:// — install Node for the server experience"), not a hard stop that tells a user who just wants a card game to go install a JS runtime. For a casual gamekit whose value prop is "no setup", failing closed on a zero-benefit prerequisite is a product-sense miss. Deliberate, documented decision — hence Nit — but worth revisiting at the launcher-contract level.

### solitaire-F6 [Nit] Cards are labeled for screen readers but unreachable by keyboard — the a11y effort is half-finished
- Where: plugins/pmos-gamekit/skills/solitaire/game/solitaire.html:620
- Quote: "el.setAttribute('aria-label', lbl + ' of ' + ({S:'spades',H:'hearts',D:'diamonds',C:'clubs'}[card.suit]));"
- Problem: Every card gets an aria-label, the stats bar is aria-live, and the win banner is role=alertdialog — but no card element is focusable (no tabindex, no keyboard selection model), so the only inputs are pointer drag/click plus global hotkeys. The labels can be read while the game cannot be played non-pointer. Either add a minimal keyboard cursor or drop the pretense; as-is the labels imply an affordance that doesn't exist.

### solitaire-F7 [Nit] isDeadlocked (a full simulated stock cycle with per-draw JSON clones) runs twice per state change
- Where: plugins/pmos-gamekit/skills/solitaire/game/solitaire.html:889 and :903
- Quote: "if (won || E.isDeadlocked(state)) return; // paused on win; the banner owns the dead state"
- Problem: `afterStateChange()` calls `updateDeadlockBanner()` (isDeadlocked at :903) and then `armIdleHint()` (isDeadlocked again at :889) on every commit and undo. Each call clones the state and replays up to ~25 draw/recycle steps with `JSON.parse(JSON.stringify(...))` per step. Harmless at 52 cards, but it's a free 2x — compute once in `afterStateChange` and pass it down.

### solitaire-F8 [Nit] Engine tests never exercise draw-3 or recycle ordering — the drawCount branch ships untested
- Where: plugins/pmos-gamekit/skills/solitaire/tests/run.mjs:53
- Quote: "const game = E.newGame({ seed: 12345, drawCount: 1 });"
- Problem: All 24 checks run with `drawCount: 1`. The draw-3 path (`Math.min(st.drawCount, st.stock.length)` including the short final draw), and the LIFO invariant that recycle restores stock order such that re-drawing yields the same sequence, are core Klondike rules with zero coverage — precisely the arithmetic-ish invariants §H says belong in a script, and the self-test harness is already there to hold them.

**Pass 1 verdict:** 0 blockers / 4 should-fix / 4 nits — material findings

## Pass 1 — author response

All eight findings spot-checked: every quote is verbatim in the cited file at (or within a line of) the cited location. No invalid findings.

### solitaire-F1 — Accepted
- Fix: game/solitaire.html · `undo()` (:564–570) · before: `undo()` pops the snapshot and re-renders, leaving the draw-mode buttons showing the pre-pop mode while `state.drawCount` reverts → after: treat draw mode as a *player preference, not an undoable move* — capture `state.drawCount` before the pop, restore the snapshot, then reapply the captured value via `setDrawMode(currentDrawCount)`. UI toggle and engine state stay agreed, and undo never surprises the player by flipping their chosen mode.
- Rationale: The reviewer's one-liner (`setDrawMode(state.drawCount)` after pop) also fixes the desync but silently *changes the player's chosen mode* on undo, which is worse UX — the toggle is a setting the player set deliberately. Preference-preserving restore fixes the desync AND keeps the toggle authoritative. `_setState` (:1059) already calls `setDrawMode(state.drawCount)` so the test seam is unaffected.
- Blast radius: game/solitaire.html only. Add one engine-adjacent assertion to the Playwright e2e (toggle Draw 3 → move → undo → assert `aria-pressed` and `getState().drawCount` agree). tests/run.mjs untouched (UI-layer bug).

### solitaire-F2 — Accepted (with modification)
- Fix: game/solitaire.html · deadlock scan (:411–484) · before: `isDeadlocked` treats ANY legal non-stock move as productive, so shuttle-only positions (foundation→tableau pulls, red-6-between-two-black-7s, King bouncing between empty columns) never flag → after: introduce a scan-only `isProgressMove(state, move)` predicate used by the deadlock scan (the hint's `firstProductiveMove` keeps its current permissive definition). Progress = wasteToFoundation | tableauToFoundation | wasteToTableau | any tableauToTableau that exposes a face-down card (run start index > 0 with a face-down card beneath) or vacates a column for a non-King-shuttle reason; PLUS a one-ply lookahead: any excluded move (foundation→tableau, no-progress tableau→tableau) still counts as productive if applying it immediately enables a progress move. Update the Inv-4 comment (:460–464) to document the residual: multi-ply enabling chains (≥2 non-progress moves before a progress move) can now cause a rare false-positive banner — acceptable because the banner is non-blocking and dismissible, vs. the current state where the banner misses most real dead ends.
- Rationale: Modification needed because the reviewer's bare exclusion ("exclude foundation→tableau … from productive") breaks Inv-4 outright — a foundation pull legitimately enables waste→tableau plays. The one-ply lookahead keeps false positives to the vanishingly rare multi-ply case while closing the shuttle hole that makes the F4 banner miss its whole reason for existing. The draw-3 stride secondary is left as-is (documented Inv-4 trade-off; forcing draw-1 in the scan stays).
- Blast radius: game/solitaire.html engine section; tests/run.mjs gains cases (shuttle-only stuck state flags as deadlocked; a foundation-pull-enables-play state does NOT flag) → `EXPECTED_CHECKS` at tests/run.mjs:20 must be bumped (see F8 — coordinate the bump once); SKILL.md:99 promise becomes true rather than changed; Inv-4 comment amended in place.

### solitaire-F3 — Accepted (contract-level fix, staged)
- Fix: two-stage, because the block is lint-enforced byte-identical and a per-skill deviation would fail `plugins/pmos-toolkit/tools/lint-non-interactive-inline.sh`. Stage 1 (contract home): add a third self-documenting exemption marker `<!-- non-interactive: prompt-free — skill issues no prompts; contract vacuously satisfied -->` to the W14 exemption vocabulary in pmos-toolkit's `skills/_shared/non-interactive.md` (Section A/exemptions) and teach `lint-non-interactive-inline.sh` to accept it alongside `refused`/`delegated`. Stage 2 (this unit): replace SKILL.md:44–72 (the frozen block) and the :34–35 self-exemption apology with the one-line marker. The dangling cross-plugin cites (`tools/audit-recommended.sh`, `_shared/non-interactive.md` at SKILL.md:65) disappear with the block.
- Rationale: The finding is correct on both facets — ~28 lines (~a quarter of the body) of mode-resolution/OQ-flush machinery loads on every "deal me a game" and the skill itself declares it inert; and the block's internal cites resolve only inside pmos-toolkit, violating one-fact-one-home when baked into gamekit. The root cause is a missing exemption class, not this skill — but this skill is the cleanest exemplar to drive the contract change. Stage 2 must not land before Stage 1 (lint would fail).
- Blast radius: LARGE and cross-plugin — pmos-toolkit `skills/_shared/non-interactive.md` (canonical W14 home), `tools/lint-non-interactive-inline.sh`, `tools/audit-recommended.sh` (no change expected — prompt-free skills have no call sites, but re-run it), `.github/workflows/skill-hygiene.yml` (re-run), skill-eval rubric's non-interactive checks (verify the `[D]` check keys off the lint, per CLAUDE.md "lint is source of truth"), and all 7 pmos-gamekit SKILL.md files carry the same dead block (migrate solitaire here; siblings are follow-up stories). Requires a pmos-toolkit release ahead of the gamekit change.

### solitaire-F4 — Accepted
- Fix: SKILL.md · Phase 0 (:89, :96–101) · before: step 3 launches serve.js as a background Bash task, step 4 says "Stopping is `Ctrl-C` in the launcher terminal." → after: (a) step 3 gains a pre-launch sweep: "if a previous solitaire `serve.js` from this session is still running, stop that background task first"; (b) launch step instructs the agent to note the background task id / PID from the launch output; (c) step 4's stop sentence becomes mode-aware: "Stopping: when launched by the agent (background task), the agent stops the task (or `kill <pid>`) when you're done or on the next `/solitaire`; `Ctrl-C` applies only when you ran the launch command yourself (the no-Bash platform path)." (d) add an explicit delta note under the launch-contract cite: background launch supersedes game-launcher.md#launch-contract's foreground Ctrl-C for shutdown.
- Rationale: The reviewer is right that a background task has no terminal to Ctrl-C — the current text gives the user an instruction that cannot be executed and leaks one node process per deal. The delta belongs in this SKILL.md (per the stated deltas-only pattern at :18–27), not in game-launcher.md, whose foreground contract stays canonical.
- Blast radius: solitaire SKILL.md only for this unit; the identical defect almost certainly exists in the 6 sibling gamekit skills (poker, snake, tetris, 2048, sudoku, flappy-bird) — flag as a follow-up sweep, not folded here. `tools/lint-phase-refs.sh` re-run after the edit (Phase 0 anchor untouched).

### solitaire-F5 — Rejected
- Rejection argument: D2's canonical home is `_shared/game-launcher/game-launcher.md`, shared by all 7 gamekit skills — a solitaire-local softening would violate §K (one fact, one home) and fork the launch contract. On the merits: a "loud file:// fallback" creates a second supported play mode this skill must then keep true forever (solitaire happens to work from file:// *today*, but the launcher contract also covers games where file:// breaks — fetch, audio, multi-file — and a per-game "does file:// work?" matrix is exactly the complexity D2 buys out of). The failure is rare (Claude Code hosts overwhelmingly have Node) and the error contract already names the fix. The finding itself concedes this is a "deliberate, documented decision". Legitimate to re-raise as a game-launcher.md D2 review — but that is a different unit, and as a Nit against an acknowledged trade-off it does not clear the bar for a cross-cutting contract change.
- Blast radius: none (no change).

### solitaire-F6 — Accepted
- Fix: game/solitaire.html · render/input layer (:607–625 cardEl, click-to-move handlers, wire()) · before: cards carry aria-labels but no element is focusable; the only inputs are pointer + global hotkeys → after: minimal keyboard model layered on the EXISTING click-to-move path — add `tabindex="0"` + `role="button"` to the actionable elements (stock pile, waste top, each movable-run head card, each foundation, empty-column slots) and a keydown handler mapping Enter/Space to the same select-source→select-destination click handler. No new movement logic; keyboard focus ring styled via `:focus-visible`. Update SKILL.md Phase 0 step 4's controls line to mention Enter/Space activation.
- Rationale: The gap is real — labels without reachability is an affordance lie. The fix is cheap precisely because click-to-move already implements the two-tap selection model; keyboard is a focus + activation mapping, not a new interaction system. Dropping the labels instead would regress the aria-live/win-dialog work for no gain.
- Blast radius: game/solitaire.html; Playwright e2e gains a keyboard smoke (Tab to waste → Enter → Tab to column → Enter moves the card); SKILL.md one line; tests/run.mjs untouched (UI layer).

### solitaire-F7 — Accepted
- Fix: game/solitaire.html · `afterStateChange` (:949–955), `armIdleHint` (:887–893), `updateDeadlockBanner` (:901–907), `newGame`, `_setState` · before: `E.isDeadlocked(state)` runs twice per commit/undo AND once per `onActivity` — which is wired to capture-phase `pointerdown`/`keydown` (:1044–1045), so every click/keypress replays a full simulated stock cycle with per-step JSON clones → after: cache the result in a module var (`deadlockCached`), recomputed exactly once in `afterStateChange` (and on `newGame`/`_setState`); `updateDeadlockBanner` and `armIdleHint` take/read the cached value. State only changes through commit/undo/newGame/_setState, so the cache cannot go stale.
- Rationale: Worse than the reviewer's 2x — the `onActivity` wiring makes it O(full stock scan) per input event. Harmless at 52 cards but the fix is a strict simplification (single source of truth for "is this position dead").
- Blast radius: game/solitaire.html only; deadlock-banner e2e re-run to confirm no behavior change.

### solitaire-F8 — Accepted
- Fix: tests/run.mjs · engine self-test · before: all 24 checks run `drawCount: 1`; the draw-3 branch and recycle ordering ship untested → after: add a draw-3/recycle block: (1) draw-3 with stock ≥3 moves exactly 3 cards; (2) short final draw (stock of 1–2) draws the remainder; (3) drawn cards land on waste in the correct order (which card is waste top); (4) LIFO recycle invariant — after drawing through the full stock and recycling, re-drawing yields the same card sequence as the first pass; (5) recycle is illegal while stock is non-empty. Bump `EXPECTED_CHECKS` at tests/run.mjs:20 from 24 to the new total in the same change (single bump coordinated with F2's new deadlock cases — one count change, not two).
- Rationale: Core Klondike rules with zero coverage, and the harness + §H script-gate posture already exist to hold them. The `EXPECTED_CHECKS` self-assert means the count-claim sweep is built in — but grep the repo for external "24/24" claims before landing (scratchpad line 3 of this review is the only known one).
- Blast radius: tests/run.mjs (+ the F2 cases share the same `EXPECTED_CHECKS` bump); no SKILL.md or eval changes; selftest remains the `node tests/run.mjs --selftest` entry point.

**Pass 1 author verdict:** 7 accepted (F2 with modification, F3 staged at contract level), 1 rejected (F5).

## Pass 2 — reviewer findings

### solitaire-F9 [Should-fix] C5 is specified against an input model that does not exist in the game
- Where: plugins/pmos-gamekit/skills/solitaire/game/solitaire.html:697
- Quote: "// Click-to-move: prefer foundation, else first legal tableau target."
- Problem: The accepted keyboard fix (C5) says to "map Enter/Space to the existing click-to-move select-source→select-destination handler" and calls it "cheap because the two-tap selection model already exists." No such model exists anywhere in the file: `clickMove(src)` is a single-tap auto-target handler — it picks the destination itself (foundation first, else the first legal tableau column) and moves immediately; there is no pending-source state, no destination-pick step, and the only non-CSS occurrence of "select" in the whole file is `user-select: none`. An implementer following the proposal literally will hunt for a selection state machine that isn't there, and may build one (new movement logic, which C5 explicitly forbids: "No new movement logic") or wire Enter to a nonexistent second tap. The correct cheap mapping is Enter/Space → `clickMove(srcFromEl(focusedEl))`, single-activation auto-target — the proposal must say that, because as written it is vague enough to be implemented wrong in exactly the way pass-2 is meant to catch.

### solitaire-F10 [Should-fix] C5 keyboard mode is unusable without focus restoration — render() destroys every focusable node on each move
- Where: plugins/pmos-gamekit/skills/solitaire/game/solitaire.html:668
- Quote: "var tab = document.getElementById('tableau'); clear(tab);"
- Problem: `render()` wipes and rebuilds every card node on every committed move (stock, waste, foundations, and the whole tableau via `clear(...)` + fresh `cardEl()` nodes). C5 adds `tabindex="0"` to those nodes but says nothing about focus management. So the very first Enter activation triggers `commit → render()`, the focused element is removed from the DOM, focus silently falls back to `<body>`, and the keyboard player must Tab from the top of the page through up-to-~30 stops to reach their next card — after every single move. That is not "minimal keyboard playability"; it is a feature that demos once and is abandoned. The fix needs an explicit post-render focus restore (e.g. remember the activated card's `data-id`/zone before commit and re-focus the matching element — or its pile — after `render()`), and the planned Playwright keyboard smoke must assert focus survives a move, not just that Enter moves a card. Without this line item C5 ships broken while passing its own e2e as sketched.

### solitaire-F11 [Nit] C6's cache-safety invariant is stated falsely — setDrawMode mutates state outside the recompute paths
- Where: plugins/pmos-gamekit/skills/solitaire/game/solitaire.html:540
- Quote: "state.drawCount = n;
    document.getElementById('draw1').setAttribute('aria-pressed', String(n === 1));"
- Problem: C6 justifies the deadlock cache with "State only mutates through those paths, so the cache cannot go stale." That claim is false as written: `setDrawMode` mutates `state.drawCount` in place and is reachable from the Draw 1/Draw 3 buttons and the `1`/`3` hotkeys without passing through `afterStateChange`/`newGame`/`_setState`. The cache is in fact safe — but only because of an unstated second fact: `isDeadlocked` clones and forces `st.drawCount = 1`, so the scan result is independent of the one field that mutates outside the recompute paths (and C2 keeps that force). A maintainer who trusts the stated invariant and later makes the scan draw-mode-aware (a plausible follow-up to C2's documented draw-3 stride limitation) gets a silent stale-cache bug. The C6 comment should state the real invariant: "recomputed on every mutation path except setDrawMode, which is safe because the scan is drawCount-independent (forces draw-1)."

### solitaire-F12 [Nit] C4 fixes the SKILL.md shutdown story but leaves serve.js itself printing the contradicting "Ctrl-C" line
- Where: plugins/pmos-gamekit/skills/_shared/game-launcher/serve.js:88
- Quote: "process.stdout.write('Press Ctrl-C to stop the server.\n');"
- Problem: C4 makes the skill's step-4 stop sentence mode-aware (agent stops the background task; Ctrl-C only on the user-run no-Bash path) — but the launcher itself unconditionally prints "Press Ctrl-C to stop the server." to stdout on every launch, including the background launch where there is no terminal to Ctrl-C. Any surface that relays launcher output to the user (or a user reading the background task's output) gets the exact misleading instruction F4 removed from the SKILL.md, restated by the substrate. The proposal's C4 blast radius names only solitaire's SKILL.md and a sibling-skill sweep; the shared `serve.js`/`game-launcher.md#serve` line ("runs until `Ctrl-C`", game-launcher.md:69) is untouched. Cheap alignments exist — e.g. soften to "Stop the server process (Ctrl-C if running in a terminal)." — and belong in the C4 change or an explicit substrate follow-up, not left as drift between the delta and its canonical home.

### solitaire-F13 [Nit] Capture Learnings instructs a file append but the skill's allowed-tools grants no write tool
- Where: plugins/pmos-gamekit/skills/solitaire/SKILL.md:106
- Quote: "wouldn't auto-open, a Node path quirk, a port-binding hiccup), append a one-line entry"
- Problem: Frontmatter declares `allowed-tools: Bash, Read` (SKILL.md:6), yet Phase 1 requires appending to `~/.pmos/learnings.md` (and "Load Learnings" implies the same file may need creating). With no Write/Edit tool, the only compliant path is a Bash shell redirection — a file mutation smuggled past the harness's edit-review surface, and a brittle one (heredoc quoting, `~` expansion). Either add Write/Edit to allowed-tools or have the phase state the sanctioned mechanism explicitly ("append via a Bash `cat >>` heredoc"). The proposal touches this SKILL.md twice (C3, C4) without noticing the tool-grant/instruction mismatch.

**Pass 2 verdict:** 0 blockers / 2 should-fix / 3 nits — material findings

## Pass 2 — author response

All five findings spot-checked against the files: every quote is verbatim at the cited location. No invalid findings. All five target defects in MY pass-1 proposal text (C4/C5/C6) or a gap the proposal walked past twice (F13) — the reviewer is right on every count.

### solitaire-F9 — Accepted
- Fix: proposal C5 · rewrite the activation-mapping sentence · before: "map Enter/Space to the existing click-to-move select-source→select-destination handler" (a two-tap selection model that does not exist anywhere in the file) → after: "map Enter/Space on the focused element to `clickMove(srcFromEl(focusedEl))` — the existing single-activation auto-target handler (:697–723): it picks the destination itself (foundation first, else first legal tableau column) and moves immediately; there is no pending-source state and none is to be built." The "No new movement logic" constraint stays and is now unambiguous.
- Rationale: My pass-1 text described an input model the game doesn't have; an implementer following it literally would either hunt for a nonexistent selection state machine or build one (violating C5's own constraint). Naming the exact function and its single-tap semantics removes the ambiguity.
- Blast radius: proposal text only (C5); the eventual code change is unchanged in scope — arguably smaller, since no destination-pick step is needed.

### solitaire-F10 — Accepted
- Fix: proposal C5 · add a focus-management line item · before: C5 adds `tabindex="0"` to nodes that `render()` (:668 and siblings) destroys and rebuilds on every committed move — first Enter activation drops focus to `<body>`, forcing a full re-Tab after every move → after: C5 gains an explicit post-render focus-restore step: before invoking `clickMove`, record the activated element's identity (`data-id` for cards, zone for piles); after `commit → render()`, re-focus the element with that `data-id` if still present, else its destination pile, else the source pile. The planned Playwright keyboard smoke is strengthened to assert `document.activeElement` is a game element (not `<body>`) AFTER the move completes, not merely that the card moved.
- Rationale: Without restore, keyboard mode "demos once and is abandoned" — and the e2e as I sketched it in pass 1 would pass while the feature ships broken. The reviewer's e2e tightening is the load-bearing part: it makes the gap undeniable in CI.
- Blast radius: game/solitaire.html (one small focus-restore helper in the render/input layer); Playwright keyboard smoke assertion; no engine, tests/run.mjs, or SKILL.md impact beyond C5's existing scope.

### solitaire-F11 — Accepted
- Fix: proposal C6 · correct the stated cache invariant · before: "State only mutates through those paths, so the cache cannot go stale" — false: `setDrawMode` (:539–543) mutates `state.drawCount` in place via the Draw 1/Draw 3 buttons and the `1`/`3` hotkeys without passing through `afterStateChange`/`newGame`/`_setState` → after: the C6 code comment (and proposal text) states the real invariant: "recomputed on every mutation path EXCEPT `setDrawMode`, which is safe only because `isDeadlocked` clones and forces `st.drawCount = 1` (C2 keeps that force) — if the scan ever becomes draw-mode-aware, `setDrawMode` must also invalidate the cache."
- Rationale: The cache is safe today, but for an unstated reason; a maintainer trusting my stated invariant while implementing the plausible C2 follow-up (draw-3-aware scan) gets a silent stale-cache bug. Documenting the true dependency converts a trap into a signposted edge.
- Blast radius: proposal text + one code comment in game/solitaire.html; no behavior change.

### solitaire-F12 — Accepted
- Fix: extend C4 with an explicit substrate-alignment item · before: C4 makes SKILL.md's stop sentence mode-aware but leaves `_shared/game-launcher/serve.js:88` unconditionally printing "Press Ctrl-C to stop the server." (and game-launcher.md:69 stating "runs until `Ctrl-C`") — the substrate restates the exact misleading instruction C4 removes, to any surface relaying launcher output → after: (a) serve.js:88 softens to a mode-neutral line, e.g. "Stop the server process to end the session (Ctrl-C if running in a terminal)."; (b) game-launcher.md:69's serve-contract bullet gains the same qualifier ("until the process is stopped — Ctrl-C when foreground"). Both edits ride together in the substrate's canonical home so the delta and its home stop drifting.
- Rationale: Fixing the delta while the canonical home contradicts it is exactly the one-fact-one-home drift the repo's rules exist to prevent; the wording fix is behavior-free and benefits all 7 gamekit skills at once.
- Blast radius: `_shared/game-launcher/serve.js` + `game-launcher.md` (shared by all 7 gamekit skills — wording-only, no protocol change); any launcher-output assertions in gamekit tests should be grepped for the old Ctrl-C string before landing; solitaire SKILL.md unchanged beyond C4's existing scope.

### solitaire-F13 — Accepted (with modification)
- Fix: SKILL.md · Phase 1 Capture Learnings (:104–108) · before: frontmatter grants `allowed-tools: Bash, Read` (:6) while Phase 1 instructs appending to `~/.pmos/learnings.md` — the only compliant path is an unstated shell redirection → after: keep the tool grant minimal (do NOT add Write/Edit) and state the sanctioned mechanism explicitly in the phase text: append via a Bash `printf '%s\n' '<entry>' >> ~/.pmos/learnings.md` one-liner (printf, not a heredoc, to sidestep the quoting brittleness the reviewer flags; `>>` creates the file if absent, covering the Load Learnings first-run case).
- Rationale: Modification versus the reviewer's either/or: granting Write/Edit for one optional out-of-repo line is a wider tool surface than the phase needs, and `~/.pmos/learnings.md` is outside the project so the harness edit-review argument is weakest there; naming the exact Bash mechanism resolves the instruction/grant mismatch at zero grant cost. Same fix likely applies to the 6 sibling gamekit skills — follow-up sweep, same bucket as C4's sibling sweep.
- Blast radius: solitaire SKILL.md Phase 1 text only; re-run `tools/lint-phase-refs.sh` and the non-interactive lint after edit; sibling sweep flagged, not folded.

**Pass 2 author verdict:** 5 accepted (F13 with modification), 0 rejected. Cap reached — unit CAPPED.

## Pass 1 — author response (re-run reaffirmation, 2026-07-13)

Orchestrator re-dispatched the pass-1 author step, but this scratchpad already carries a complete "Pass 1 — author response" and "Pass 2 — author response", and the proposal file exists in full (status CAPPED). Per the append-only constraint, this section does not rewrite that record — it re-verifies and reaffirms it. Every pass-1 finding's >=40-char quote was re-spot-checked against the current files this run: F1 (solitaire.html:566), F2 (SKILL.md:99–100), F3 (SKILL.md:35, :65), F4 (SKILL.md:89, :100), F5 (SKILL.md:88 / game-launcher.md D2), F6 (solitaire.html:620), F7 (solitaire.html:889), F8 (tests/run.mjs:53). All ground verbatim; no finding is invalid; no disposition changes.

### solitaire-F1 — Accepted (reaffirmed)
- Fix: game/solitaire.html · undo() · preference-preserving restore — capture `state.drawCount` pre-pop, restore snapshot, reapply via `setDrawMode(...)` (proposal C1).
- Rationale: fixes the aria-pressed/engine desync without silently flipping the player's chosen mode.
- Blast radius: game/solitaire.html + one Playwright e2e assertion; tests/run.mjs untouched.

### solitaire-F2 — Accepted with modification (reaffirmed)
- Fix: game/solitaire.html · deadlock scan · scan-only `isProgressMove` predicate + one-ply lookahead; Inv-4 comment amended; new tests (proposal C2).
- Rationale: bare exclusion of foundation→tableau breaks Inv-4; lookahead closes the shuttle hole with only a rare, documented multi-ply false positive.
- Blast radius: engine section; tests/run.mjs `EXPECTED_CHECKS` bump coordinated with C7.

### solitaire-F3 — Accepted, contract-level staged (reaffirmed)
- Fix: Stage 1 add `<!-- non-interactive: prompt-free -->` exemption to pmos-toolkit's non-interactive.md + lint; Stage 2 replace SKILL.md:44–72 block + :34–35 apology with the marker (proposal C3). Stage 2 must not land before Stage 1.
- Rationale: fixes token dead weight and the dangling cross-plugin cites at the root; benefits all 7 gamekit skills.
- Blast radius: LARGE cross-plugin — toolkit W14 home, lint, skill-hygiene CI, skill-eval [D] check verification, sibling gamekit skills as follow-ups.

### solitaire-F4 — Accepted (reaffirmed)
- Fix: SKILL.md Phase 0 · pre-launch sweep + PID note + mode-aware stop sentence + explicit delta vs game-launcher.md#launch-contract (proposal C4; extended by pass-2 F12 to serve.js:88 + game-launcher.md:69 wording).
- Rationale: "Ctrl-C in the launcher terminal" is unexecutable for a background Bash task; current text leaks one node server per deal.
- Blast radius: SKILL.md; shared serve.js + game-launcher.md (wording-only, all 7 gamekit skills); sibling sweep flagged not folded.

### solitaire-F5 — Rejected (reaffirmed)
- Rejection argument: D2 lives in `_shared/game-launcher` (one fact, one home — §K); a supported file:// mode is a second play mode the plugin must keep true forever across games where file:// breaks; failure is rare and the error contract names the fix; the finding itself concedes the decision is deliberate and documented. Re-raise, if at all, as a game-launcher D2 review — a different unit. Pass-2 reviewer did not contest.
- Blast radius: none (no change).

### solitaire-F6 — Accepted (reaffirmed)
- Fix: game/solitaire.html · tabindex/role on actionable elements + Enter/Space → `clickMove(srcFromEl(focusedEl))` single-activation auto-target (per pass-2 F9 correction) + post-render focus restoration by `data-id`/zone (per pass-2 F10) + e2e asserting activeElement is a game element post-move (proposal C5).
- Rationale: labels without reachability is an affordance lie; the fix rides the existing single-tap handler — no new movement logic.
- Blast radius: game/solitaire.html; Playwright keyboard smoke; one SKILL.md controls line.

### solitaire-F7 — Accepted (reaffirmed)
- Fix: game/solitaire.html · module-level `deadlockCached`, recomputed once in afterStateChange/newGame/_setState; banner + idle hint read the cache; TRUE invariant documented per pass-2 F11 (`setDrawMode` mutates outside recompute paths; safe only because the scan forces drawCount=1) (proposal C6).
- Rationale: worse than 2x — onActivity wiring made it O(full stock scan) per input event; caching is a strict simplification.
- Blast radius: game/solitaire.html only; re-run deadlock-banner e2e.

### solitaire-F8 — Accepted (reaffirmed)
- Fix: tests/run.mjs · draw-3 block (exact-3 draw, short final draw, waste-top ordering, LIFO recycle round-trip, recycle-illegal-while-stock-nonempty); single `EXPECTED_CHECKS` bump shared with C2's cases (proposal C7).
- Rationale: core Klondike rules with zero coverage; the self-asserting count keeps the count-claim honest.
- Blast radius: tests/run.mjs only.

**Re-run verdict:** unchanged — pass 1: 7 accepted (F2 modified, F3 staged), 1 rejected (F5). Pass 2 responses (F9–F13, all accepted, F13 modified) remain on record above. Proposal file re-verified as the complete cumulative record; rewritten unchanged this run. Unit remains CAPPED.
