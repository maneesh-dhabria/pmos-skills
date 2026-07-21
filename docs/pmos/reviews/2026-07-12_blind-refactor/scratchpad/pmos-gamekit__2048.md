## Pass 1 — reviewer findings

### 2048-F1 [Should-fix] Tautological selftest check can never fail
- Where: plugins/pmos-gamekit/skills/2048/tests/run.mjs:172
- Quote: "ok(!eqArr(a.board, c.board) || true, 'different seed (usually) differs'); // tolerant: collisions are rare but legal"
- Problem: `<expr> || true` is always true, so this check is pure theater — it passes even if `makeRng` ignores the seed entirely and every board is identical. It is counted in EXPECTED_CHECKS=38, inflating the apparent contract surface. Either assert something falsifiable (e.g. that at least one of several distinct seeds yields a distinct board) or delete the check and drop the count; a deterministic gate that cannot fail violates the repo's own §H ethos (deterministic = hard gate).

### 2048-F2 [Should-fix] Undo engine surface (snapshot/restore) has zero test coverage despite the harness claiming to assert the contract
- Where: plugins/pmos-gamekit/skills/2048/tests/run.mjs:4
- Quote: "documented Game2048Engine contract. Run: node tests/run.mjs --selftest"
- Problem: One-step undo is advertised in the skill description and SKILL.md ("**U** undo (one step)"), and the engine ships `snapshot`/`restore` explicitly for it (2048.html:297 "One-deep undo snapshot helpers (the UI owns the single snapshot; the engine provides clone/restore)"), yet run.mjs contains not a single check touching snapshot/restore — a round-trip (move → snapshot equality after restore of board/score/moves/won/over) is a 4-line test. The header's "asserts the documented Game2048Engine contract" overclaims: an advertised gameplay feature's entire logic layer is unverified.

### 2048-F3 [Should-fix] Stop instruction contradicts the prescribed background launch
- Where: plugins/pmos-gamekit/skills/2048/SKILL.md:88
- Quote: "**Launch** in the background so the server keeps running while you play:"
- Problem: Step 3 tells the agent to launch serve.js in the background (Bash run_in_background), but step 4 (SKILL.md:99) tells the user "Stopping is `Ctrl-C` in the launcher terminal" — in the prescribed launch mode there IS no launcher terminal the user can Ctrl-C; the process is a detached background task owned by the agent session. The user is handed a stop instruction that cannot work as written. The report step should say how to actually stop it in this mode (ask the agent to kill the background task / kill the printed PID), reserving Ctrl-C for the manual-launch fallback. game-launcher.md#launch-contract ("reports … that Ctrl-C stops the server") bakes the same assumption in and is in scope for the same fix.

### 2048-F4 [Should-fix] ~30 lines of dead mandated contract dominate a prompt-free launcher — the W14 exemption taxonomy is missing a "prompt-free" class
- Where: plugins/pmos-gamekit/skills/2048/SKILL.md:33
- Quote: "The non-interactive contract block below is inlined only to satisfy the\n  repo-wide W14 lint; no checkpoint ever fires."
- Problem: Token economy. The frozen 27-line non-interactive block (SKILL.md:43-71) is roughly a third of this SKILL.md's context cost, and the skill itself admits it is inert — there are no prompts, no artifacts, no subagents. The W14 posture already has two self-documenting exemption markers (`refused`, `delegated`) but none for "provably prompt-free", so every gamekit launcher pays this dead-weight tax on every invocation, multiplied across 7 sibling games. The fix belongs in the substrate/lint, not this skill: add a third marker (e.g. `<!-- non-interactive: prompt-free -->`) gated on the skill body containing zero AskUserQuestion call sites. game-launcher.md:57-58 even punts on this ("Whether a prompt-free skill still needs the canonical non-interactive inline block is decided by `lint-non-interactive-inline.sh`, not here") — nobody owns the question, so the waste persists.

### 2048-F5 [Nit] Comment references a Playwright e2e that does not exist anywhere in the plugin
- Where: plugins/pmos-gamekit/skills/2048/game/2048.html:541
- Quote: "// test seam — lets the Playwright e2e drive deterministic states without touching engine internals."
- Problem: `window.__2048_TEST__` (incl. `loadBoard`) is justified by a Playwright e2e, but a plugin-wide grep for playwright/e2e finds nothing — the only test is the Node vm selftest, which never uses this seam. Either the e2e was planned and dropped (the win/over overlay flows are consequently untested end-to-end) or the comment is stale; either way the stated justification for shipping a debug hook in the production HTML is dangling.

### 2048-F6 [Nit] Undo while the win overlay is showing leaves a stale "You win!" overlay over a restored pre-win board
- Where: plugins/pmos-gamekit/skills/2048/game/2048.html:444
- Quote: "canUndo = false; undoSnap = null;\n    overOverlay.hidden = true;\n    render();"
- Problem: `undo()` hides only the game-over overlay. The keydown handler lets **U** fire while the win overlay is visible; restore() sets `won` back to false and removes the 2048 tile, but `winOverlay` stays up saying "You win!" over a board that no longer has a winning tile. Symmetric fix: also `winOverlay.hidden = true` (or guard undo while overlays are up, matching doMove's guard).

### 2048-F7 [Nit] Dead `busy` guard — declared, checked, reset, never set
- Where: plugins/pmos-gamekit/skills/2048/game/2048.html:420
- Quote: "if (busy || !state || startOverlay.hidden === false) return;"
- Problem: `busy` is initialized false, reset to false in newGame(), and gated on in doMove(), but no code path ever sets it true — it is a vestigial animation-lock that guards nothing. Dead state variables in a hand-audited single-file artifact invite a future reader to assume a concurrency discipline that isn't there; delete it or actually set it during the transition window.

### 2048-F8 [Nit] Frozen block's end-of-skill summary hardcodes the wrong plugin name for gamekit
- Where: plugins/pmos-gamekit/skills/2048/SKILL.md:70
- Quote: "Print to stderr at exit: `pmos-toolkit: /<skill> finished — outcome=<clean|deferred|error>"
- Problem: The byte-identical frozen block bakes a `pmos-toolkit:` prefix into the NFR-07 summary line, so a gamekit skill that honored it would announce itself as the wrong plugin. Unfixable per-skill (byte-identity is the lint contract) — the canonical `_shared/non-interactive.md` should parameterize the prefix (`<plugin>:` like it already does `/<skill>`). Substrate defect surfaced from this unit.

**Pass 1 verdict:** 0 blockers / 4 should-fix / 4 nits — material findings

## Pass 1 — author response

### 2048-F1 — Accepted
- Fix: `tests/run.mjs` · deterministic-RNG block (lines 166–173) · Replace the tautological `ok(!eqArr(a.board, c.board) || true, …)` with a falsifiable check: create initial states for a small set of distinct seeds (e.g. 2024, 2025, 3000, 7777, 424242) and assert that at least two of the resulting boards differ (`ok(boards.some(b => !eqArr(b, boards[0])), 'distinct seeds do not all collapse to one board')`). Additionally assert `makeRng` stream determinism directly: two `makeRng(2024)` instances produce identical first-8-draw sequences. Adjust `EXPECTED_CHECKS` to the new true count.
- Rationale: A check that cannot fail is worse than no check — it inflates the count the `--selftest` gate asserts and would stay green even if seeding were entirely broken. "Some seed differs across 5 seeds" is falsifiable and collision-proof in practice (a 5-way collision means the RNG ignores the seed, which is exactly the bug we want caught).
- Blast radius: `tests/run.mjs` only (EXPECTED_CHECKS constant changes; any release-train gate that pins "38 checks" in prose should be greped — none found in SKILL.md).

### 2048-F2 — Accepted
- Fix: `tests/run.mjs` · new test block after the score-accumulation block · Add snapshot/restore round-trip coverage: (1) create a state, take `snap = E.snapshot(s)`, apply a mutating `E.move`, then `E.restore(s, snap)` and assert board/score/moves/won/over all equal the pre-move values; (2) assert the snapshot is a deep copy — mutate `s.board` after snapshotting and confirm `snap.board` is unchanged; (3) restore across a win: rig a board one merge from 2048, move (won=true), restore, assert `won === false` and no 2048 tile. Bump `EXPECTED_CHECKS` (coordinated with F1's adjustment).
- Rationale: Undo is an advertised gameplay feature (SKILL.md line 97 "**U** undo (one step)") and the engine ships `snapshot`/`restore` solely for it; the harness header claims to assert "the documented Game2048Engine contract" but leaves that surface at zero coverage. A 6–8 line addition closes the overclaim.
- Blast radius: `tests/run.mjs` only; shares the EXPECTED_CHECKS bump with F1.

### 2048-F3 — Accepted
- Fix: two files. (a) `SKILL.md` · Phase 0 step 4 (line 98–99) · Change "Stopping is `Ctrl-C` in the launcher terminal" to a mode-aware instruction: when launched via the prescribed background Bash task, tell the user to ask the agent to stop the server (agent kills the background task / the printed PID); mention `Ctrl-C` only for the manual-launch fallback (the "No Bash tool" path in Platform Adaptation). (b) `../_shared/game-launcher/game-launcher.md` · #launch-contract step 4 (line 54 "Reports the printed `http://127.0.0.1:<port>/` URL and that Ctrl-C stops t[he server]") · Same mode-aware rewording in the canonical home, since SKILL.md merely restates it.
- Rationale: Step 3 mandates a background launch (`run_in_background`), so there is no launcher terminal for the user to Ctrl-C — the reported stop instruction is impossible to follow in the prescribed mode. §K says the launch contract's canonical home is game-launcher.md, so the substrate carries the real fix and the skill's delta text follows.
- Blast radius: game-launcher.md is consumed by all 7 gamekit skills; all 7 SKILL.mds carry the same "Stopping is `Ctrl-C`" sentence (verified by grep: 2048, flappy-bird, poker, snake, solitaire, sudoku, tetris) — flag siblings for the identical one-sentence edit in their own units/passes. No lints/evals key on this wording.

### 2048-F4 — Accepted (substrate escalation; implementation lives outside this unit)
- Fix: three layers, in order. (a) `plugins/pmos-toolkit/tools/lint-non-interactive-inline.sh` · exemption check (line 53) · Extend the accepted marker set to `(refused|delegated|prompt-free)`, with the lint additionally verifying a `prompt-free`-marked SKILL.md contains zero `AskUserQuestion` call sites and no Task-tool subagent dispatch (else fail — the marker would be a lie). (b) Root `CLAUDE.md` · "Non-interactive contract (W14 posture)" bullet · document the third self-documenting marker class. (c) `plugins/pmos-gamekit/skills/2048/SKILL.md` · replace the 29-line inline block (lines 43–71) and the "inlined only to satisfy the repo-wide W14 lint" apology (lines 33–34) with the one-line `<!-- non-interactive: prompt-free — zero prompts, no subagents, no persistent artifact -->` marker.
- Rationale: The skill itself documents that the block is inert ("no checkpoint ever fires"); ~30 dead lines × 7 gamekit launchers × every invocation is pure context tax. The existing exemption taxonomy is already self-documenting-marker-based, so a third class is a natural extension, and gating it on a statically checkable property (zero call sites — the same extraction `audit-recommended.sh` already performs) keeps it deterministic per §H. Clause 4 (subagent dispatch) and clause 8 (summary) are the only non-prompt clauses, and the marker's gate excludes subagent dispatch, so nothing real is lost.
- Blast radius: lint-non-interactive-inline.sh, root CLAUDE.md W14 posture text, potentially `audit-recommended.sh` (extractor reuse), all 7 gamekit SKILL.mds (each in its own unit), and the skill-eval rubric if it cites the two-marker taxonomy. Largest-radius accepted change; must ship substrate-first, skill edits second, or the lint goes red.

### 2048-F5 — Accepted
- Fix: `game/2048.html` · line 541 comment · Reword to reflect reality: "test/debug seam — lets an automated driver (browser e2e or a console session) rig deterministic states without touching engine internals; no bundled e2e uses it yet." Keep the seam itself — `loadBoard`/`overlays` is also what makes the F6 fix manually verifiable and any future e2e possible.
- Rationale: The stated justification ("the Playwright e2e") is dangling — no Playwright/e2e exists anywhere in the plugin (grep confirms the only hits are these comments themselves). A stale justification for a shipped debug hook misleads auditors; an honest comment costs one line.
- Blast radius: 2048.html only. Note: flappy-bird, snake, solitaire game HTMLs carry the same "Playwright e2e" comment — sibling units should apply the same reword.

### 2048-F6 — Accepted
- Fix: `game/2048.html` · `undo()` (lines 441–448) · Add `winOverlay.hidden = true;` alongside the existing `overOverlay.hidden = true;`. Leave `dismissedWin` untouched (still false), so re-reaching 2048 after the undo correctly re-shows the win overlay.
- Rationale: The keydown handler routes **U** to `undo()` with no overlay guard (line 505), and `restore()` sets `won` back to false and removes the 2048 tile — leaving a stale "You win!" overlay over a non-winning board. Hiding both overlays is symmetric with the existing game-over handling and friendlier than blocking undo while an overlay is up (undo-out-of-game-over is clearly intended behavior given the existing line).
- Blast radius: 2048.html UI script only; engine and selftest untouched (UI behavior is outside the vm harness — verify manually via the `__2048_TEST__.loadBoard` seam, tying into F5's honest-comment rewrite).

### 2048-F7 — Accepted
- Fix: `game/2048.html` · lines 340, 410, 420 · Delete the `busy` declaration, its reset in `newGame()`, and the `busy ||` term in `doMove()`'s guard.
- Rationale: Grep confirms `busy` is declared false, reset false, and read — never set true. A vestigial animation lock implies a concurrency discipline that does not exist; the game is synchronous per input event, so nothing needs the lock. Deleting is safer than "actually setting it" — there is no transition window to guard (renders are synchronous; the confetti canvas doesn't block input by design).
- Blast radius: 2048.html only; no test references `busy`.

### 2048-F8 — Accepted (substrate escalation; not fixable inside this unit)
- Fix: `plugins/pmos-toolkit/skills/_shared/non-interactive.md` (canonical frozen block) · clause 8 · Change the hardcoded `pmos-toolkit: /<skill> finished …` summary prefix to the parameterized `<plugin>: /<skill> finished …` (the line already parameterizes `/<skill>`). Then re-paste the byte-identical updated block into every skill carrying it, repo-wide, in one sweep (the lint is the drift detector; the block is hand-maintained by design).
- Rationale: A gamekit skill honoring NFR-07 as written would announce itself as `pmos-toolkit:` — factually wrong plugin attribution in the exit summary. Per-skill divergence is forbidden (byte-identity is the lint contract), so the only legal fix is at the canonical home followed by the fleet re-paste.
- Blast radius: `_shared/non-interactive.md` (canonical, pmos-toolkit), every SKILL.md repo-wide that inlines the frozen block (all plugins), `lint-non-interactive-inline.sh`'s reference copy, and `scripts/sync-shared.sh` intersection copies in consumer plugins. Note interaction with F4: if the prompt-free marker ships first, gamekit launchers drop the block entirely and this fix's gamekit-side re-paste becomes moot for them.

**Author verdict:** 8 accepted (2 as substrate escalations: F4, F8), 0 rejected, 0 invalid.

## Pass 1 — author response (grounding verification + proposal write)

The "Pass 1 — author response" section above was appended by an interrupted prior run of this
same author pass; its cumulative proposal file was never written. This run re-verified every
finding's grounding against the live files before adopting those dispositions:

- 2048-F1 — quote confirmed verbatim at tests/run.mjs:172 (`ok(!eqArr(a.board, c.board) || true, 'different seed (usually) differs');`). VALID. Disposition stands: **Accepted**.
- 2048-F2 — header quote confirmed at tests/run.mjs:4; grep confirms zero `snapshot`/`restore` hits anywhere in run.mjs. VALID. **Accepted**.
- 2048-F3 — quotes confirmed at SKILL.md:88 ("**Launch** in the background so the server keeps running while you play:") and SKILL.md:99 (Ctrl-C stop instruction); game-launcher.md:54 carries the same Ctrl-C claim. VALID. **Accepted**.
- 2048-F4 — quote confirmed at SKILL.md:33 ("inlined only to satisfy the repo-wide W14 lint; no checkpoint ever fires"). VALID. **Accepted** (substrate escalation).
- 2048-F5 — quote confirmed at game/2048.html:541 ("lets the Playwright e2e drive deterministic states"); no Playwright/e2e exists in the plugin. VALID. **Accepted**.
- 2048-F6 — quote confirmed at game/2048.html:444-446; keydown at line 505 routes U to undo() with no win-overlay guard, and undo() hides only overOverlay. VALID. **Accepted**.
- 2048-F7 — quote confirmed at game/2048.html:420; grep confirms `busy` is only ever declared false (340), reset false (410), and read (420) — never set true. VALID. **Accepted**.
- 2048-F8 — quote confirmed at SKILL.md:70 (frozen block clause 8 hardcodes `pmos-toolkit:`). VALID. **Accepted** (substrate escalation).

No dispositions changed; the fix proposals in the section above are adopted as-is. The
cumulative proposal has now been written to proposal/pmos-gamekit__2048.md.

**Author verdict (confirmed):** 8 accepted (F4, F8 as substrate escalations), 0 rejected, 0 invalid.

## Pass 2 — reviewer findings
### 2048-F9 [Should-fix] F3's stop-instruction fix misses the launcher's own stdout line (and cites a PID that is never printed)
- Where: plugins/pmos-gamekit/skills/_shared/game-launcher/serve.js:88
- Quote: "process.stdout.write('Press Ctrl-C to stop the server.\n');"
- Problem: F3 reworded the stop instruction in exactly two files (SKILL.md Phase 0 step 4 and game-launcher.md #launch-contract step 4), but serve.js itself prints "Press Ctrl-C to stop the server." to stdout on every launch — the very output the agent relays to the user. In the prescribed `run_in_background` mode that line is just as inexecutable as the prose F3 fixed, so the accepted fix does not achieve its own rationale ("the reported stop instruction must be executable in the launch mode the skill prescribes"): the user still sees Ctrl-C advice from the launcher's live output. Compounding it, F3's replacement text tells the user the agent "kills the background task / the printed PID" — serve.js prints no PID anywhere (grep-verified), so an implementer following F3 literally would write a reference to output that does not exist. The fix needs a third surface: either serve.js's stdout line becomes mode-neutral (e.g. "stop the server to end the session") or serve.js starts printing its PID so the SKILL.md wording becomes true. game-launcher.md #serve line 69 ("runs until `Ctrl-C` (SIGINT/SIGTERM), then exits 0") also needs the same mode-aware touch if the doc edit is done thoroughly.

### 2048-F10 [Nit] Frozen block clause 5 is a dangling in-plugin cite that neither F4 nor F8 closes if F4's substrate escalation stalls
- Where: plugins/pmos-gamekit/skills/2048/SKILL.md:64
- Quote: "sources the shared call-site extractor from Section D of this file (`_shared/non-interactive.md`)"
- Problem: pmos-gamekit's `skills/_shared/` contains only `game-launcher/` — there is no `non-interactive.md` in this plugin (verified by find), and `tools/audit-recommended.sh` (same clause) lives in pmos-toolkit, not here. So the frozen block self-describes as "this file (`_shared/non-interactive.md`)" while that file does not exist in the plugin the reader is standing in — a dangling substrate cite of exactly the class the repo's own bootstrap-gap lesson warns about. F8 fixes a different clause (the `pmos-toolkit:` prefix) and its parameterize-and-re-paste remedy would leave clause 5's path untouched; F4 only moots this for gamekit if its lint/CLAUDE.md substrate change actually ships. The proposal should either fold a clause-5 path qualification into F8's canonical-block edit (e.g. "pmos-toolkit's `skills/_shared/non-interactive.md`") or record that F10 rides on F4 landing, so a partial implementation doesn't silently leave the lie in place.

### 2048-F11 [Nit] F4(c)'s "lines-33–34 apology" range starts mid-sentence — literal deletion truncates the Platform Adaptation bullet
- Where: plugins/pmos-gamekit/skills/2048/SKILL.md:33
- Quote: "  to degrade. The non-interactive contract block below is inlined only to satisfy the"
- Problem: the apology sentence F4(c) wants removed spans lines 33–34, but line 33 also carries the tail of the bullet's first sentence ("…so there is nothing / to degrade."). An implementer deleting lines 33–34 verbatim leaves line 32 ending "this skill is prompt-free, so there is nothing" — a truncated sentence in the shipped SKILL.md. Category (c) vagueness: the fix should be specified as "delete the second sentence of the No-AskUserQuestion bullet (from 'The non-interactive contract block below…' through '…no checkpoint ever fires.')", not as a line range that splits a sentence.

### 2048-F12 [Nit] Viewport meta disables pinch-zoom — an a11y regression the file's otherwise careful accessibility work contradicts
- Where: plugins/pmos-gamekit/skills/2048/game/2048.html:5
- Quote: "content=\"width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no\""
- Problem: `maximum-scale=1, user-scalable=no` blocks pinch-zoom for low-vision players (WCAG 1.4.4 Resize Text territory), and it is redundant for its presumable purpose — the page already sets `touch-action: manipulation` on body (kills double-tap zoom) and `touch-action: none` on the board (owns swipe gestures). iOS Safari ignores `user-scalable=no` anyway, so the restriction is both harmful where honored and inconsistent across platforms. This file is otherwise unusually a11y-diligent (aria-live announcer, sr-only region, focus-visible outlines, prefers-reduced-motion) — dropping the two zoom-blocking tokens brings the viewport line up to the same standard. Sibling game HTMLs likely share the pattern and deserve the same one-line edit in their own units.

**Pass 2 verdict:** 0 blockers / 1 should-fix / 3 nits — material findings

## Pass 2 — author response

### 2048-F9 — Accepted
- Fix: three coordinated surfaces. (a) `_shared/game-launcher/serve.js` · startup stdout (line 88 `process.stdout.write('Press Ctrl-C to stop the server.\n');`) · Replace with a mode-neutral line that also makes the PID reference true: print the server's own `process.pid` alongside the stop guidance, e.g. "Server pid <pid> — stop it with Ctrl-C (foreground) or by killing the pid / asking your agent to stop the background task." Also update the file-header comment (serve.js:10 "runs until Ctrl-C (SIGINT/SIGTERM) then ex[its]") to the same mode-neutral phrasing. (b) `game-launcher.md` · #serve bullet (line 69 "Prints the URL to stdout and runs until `Ctrl-C` (SIGINT/SIGTERM), then exits 0.") · Reword to "prints the URL and its pid to stdout; runs until stopped (SIGINT/SIGTERM), then exits 0." (c) Amend F3's accepted SKILL.md wording: the "printed PID" reference becomes accurate only once (a) ships — sequencing note added so an implementer does serve.js first, or the SKILL.md text says "the pid serve.js prints" only after it does.
- Rationale: The reviewer is right that F3 as accepted fixed the prose but not the live output the agent relays — the user would still see inexecutable Ctrl-C advice from serve.js itself, and F3's replacement text cited a PID that serve.js never prints (grep-verified). Printing the pid is a 1-line change that makes both the stdout line and the SKILL.md instruction executable in either launch mode.
- Blast radius: serve.js + game-launcher.md are shared by all 7 gamekit launchers (single canonical copy in this plugin's `_shared/`, so one edit covers the fleet); F3's SKILL.md wording in this unit and the 6 sibling SKILL.mds (their own units) inherit the corrected phrasing. No test asserts the exact stdout string (grep of tests/run.mjs and the launcher dir confirms no fixture pins "Press Ctrl-C").

### 2048-F10 — Accepted
- Fix: two-part closure so no partial-implementation path leaves the dangling cite. (a) Fold a clause-5 path qualification into F8's canonical-block edit in `plugins/pmos-toolkit/skills/_shared/non-interactive.md`: change "Section D of this file (`_shared/non-interactive.md`)" to name the canonical home explicitly — "Section D of pmos-toolkit's `skills/_shared/non-interactive.md`" — so the sentence is true from any plugin the block is pasted into (F8's fleet re-paste then propagates it). (b) Record the dependency in the proposal's sequencing notes: for gamekit, F4's `prompt-free` marker removes the block (and this lie with it); if F4 stalls, F8's re-paste with the (a) wording is the fallback closure — one of the two MUST land before this unit is called done.
- Rationale: The reviewer correctly identified that F8 as written fixes clause 8 but leaves clause 5's self-description ("this file (`_shared/non-interactive.md`)") false in every plugin whose `_shared/` lacks the file — exactly the bootstrap-gap dangling-cite class CLAUDE.md warns about. Since F8 already mandates a canonical edit + fleet re-paste, folding one more clause into the same edit is near-zero marginal cost.
- Blast radius: same as F8 (canonical file + repo-wide re-paste + lint reference copy); plus one sequencing-note line in this proposal. No new files.

### 2048-F11 — Accepted
- Fix: `docs` only — respecify F4(c) in the proposal. Replace the "lines 33–34 apology" line-range instruction with a sentence-scoped one: in SKILL.md's Platform Adaptation "No `AskUserQuestion` tool" bullet, delete the SECOND sentence only — from "The non-interactive contract block below is inlined only to satisfy the" through "no checkpoint ever fires." — leaving the first sentence ("Not used — this skill is prompt-free, so there is nothing to degrade.") intact and grammatically complete.
- Rationale: Verified — line 33 opens with "  to degrade. The non-interactive contract block below is inlined only to satisfy the", i.e. the line range splits the first sentence mid-clause; a literal line deletion would ship "…so there is nothing" as a truncated sentence. Fix specs must be sentence-scoped when the target spans partial lines.
- Blast radius: none beyond the proposal text itself (F4(c)'s intent unchanged; only its specification tightened).

### 2048-F12 — Accepted
- Fix: `game/2048.html` · line 5 viewport meta · Change `content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"` to `content="width=device-width, initial-scale=1"` (drop the two zoom-blocking tokens).
- Rationale: `maximum-scale=1, user-scalable=no` blocks pinch-zoom for low-vision players (WCAG 1.4.4 territory) and is redundant for gesture control — the page already sets `touch-action: manipulation` on body and `touch-action: none` on the board, which own double-tap and swipe respectively; iOS Safari ignores `user-scalable=no` anyway, so the restriction is harmful where honored and inconsistent where not. Brings the viewport line up to the standard of the file's otherwise careful a11y work (aria-live announcer, sr-only region, focus-visible, prefers-reduced-motion).
- Blast radius: 2048.html only for this unit; sibling game HTMLs likely share the pattern and should get the same one-line edit in their own units. No test or lint keys on the viewport meta.

**Pass 2 author verdict:** 4 accepted, 0 rejected, 0 invalid. Cumulative: 12 accepted / 0 rejected. Unit CAPPED at pass 2.

## Pass 1 — author response (re-run confirmation, 2026-07-13)

This author run was dispatched as pass 1, but the scratchpad already carries author
responses for both pass 1 (F1–F8) and pass 2 (F9–F12), and the cumulative proposal file
exists and is complete. No finding is open. This run independently re-verified every
finding's grounding quote against the live files before confirming; no disposition changes.

### 2048-F1 — Accepted (confirmed)
- Fix: tests/run.mjs · RNG block (166–173) · replace tautological `ok(!eqArr(a.board, c.board) || true, …)` with falsifiable multi-seed divergence + makeRng stream-determinism checks; adjust EXPECTED_CHECKS (currently 38 at run.mjs:13). Quote re-verified at run.mjs:172.
- Rationale: a check that cannot fail violates the §H deterministic-gate ethos and inflates the asserted contract surface.
- Blast radius: tests/run.mjs only (EXPECTED_CHECKS shared with F2).

### 2048-F2 — Accepted (confirmed)
- Fix: tests/run.mjs · new snapshot/restore round-trip block (restore equality, deep-copy isolation, restore-across-win) + EXPECTED_CHECKS bump. Re-verified: zero `snapshot`/`restore` hits anywhere in run.mjs; header overclaim at run.mjs:4.
- Rationale: undo is an advertised feature (SKILL.md "**U** undo (one step)") with zero engine-layer coverage.
- Blast radius: tests/run.mjs only.

### 2048-F3 — Accepted (confirmed; wording amended by F9)
- Fix: SKILL.md Phase 0 step 4 + game-launcher.md #launch-contract step 4 · mode-aware stop instruction (background task → ask agent / kill pid; Ctrl-C only for the manual fallback). Quotes re-verified at SKILL.md:88 and :99.
- Rationale: the prescribed run_in_background launch has no launcher terminal to Ctrl-C.
- Blast radius: game-launcher.md is shared by all 7 gamekit launchers; sibling SKILL.mds carry the same sentence (their own units).

### 2048-F4 — Accepted (confirmed; substrate escalation; spec tightened by F11)
- Fix: (a) lint-non-interactive-inline.sh gains a third `prompt-free` exemption marker gated on zero AskUserQuestion call sites and no subagent dispatch; (b) root CLAUDE.md W14 bullet documents it; (c) this SKILL.md swaps the 43–71 block for the marker and deletes the apology SENTENCE-scoped per F11. Quote re-verified at SKILL.md:33.
- Rationale: ~30 inert lines × 7 launchers × every invocation; taxonomy is already marker-based.
- Blast radius: lint, root CLAUDE.md, audit-recommended.sh (extractor reuse), 7 gamekit SKILL.mds, skill-eval rubric if it cites the two-marker taxonomy. Substrate-first ordering mandatory.

### 2048-F5 — Accepted (confirmed)
- Fix: game/2048.html:541 · reword the "Playwright e2e" justification to an honest "test/debug seam … no bundled e2e uses it yet"; keep the seam. Quote re-verified.
- Rationale: no Playwright/e2e exists anywhere in the plugin; the stated justification dangles.
- Blast radius: 2048.html; siblings carry the same comment (their own units).

### 2048-F6 — Accepted (confirmed)
- Fix: game/2048.html undo() (441–448) · add `winOverlay.hidden = true;` beside the existing `overOverlay.hidden = true;`; leave dismissedWin untouched. Quote re-verified at 444–446; keydown routes U with no win-overlay guard.
- Rationale: restore() un-wins the board but the "You win!" overlay stays up — stale UI.
- Blast radius: 2048.html UI only.

### 2048-F7 — Accepted (confirmed)
- Fix: game/2048.html · delete `busy` (declared 340, reset 410, read 420 — never set true; grep re-verified).
- Rationale: vestigial lock implying a concurrency discipline that doesn't exist.
- Blast radius: 2048.html only; no test references it.

### 2048-F8 — Accepted (confirmed; substrate escalation; scope widened by F10)
- Fix: canonical pmos-toolkit `skills/_shared/non-interactive.md` · clause 8 `pmos-toolkit:` → `<plugin>:` AND (per F10) clause 5 "this file" → explicit pmos-toolkit path; fleet re-paste. Quote re-verified at SKILL.md:70.
- Rationale: byte-identity is the lint contract, so only the canonical home is a legal fix point.
- Blast radius: canonical file, every inlining SKILL.md repo-wide, lint reference copy, sync-shared intersections. Interacts with F4 (marker moots gamekit re-paste).

### 2048-F9 — Accepted (confirmed)
- Fix: serve.js:88 stdout (quote re-verified: `Press Ctrl-C to stop the server.`) → mode-neutral line printing process.pid; serve.js:10 header + game-launcher.md:69 reworded to match; F3's SKILL.md PID reference sequenced after (a).
- Rationale: F3 fixed prose but not the live output the agent relays; the PID it cited is never printed.
- Blast radius: single shared serve.js + game-launcher.md cover all 7 launchers; no fixture pins the stdout string.

### 2048-F10 — Accepted (confirmed)
- Fix: folded into F8(b) clause-5 rewording + recorded dependency (one of F4 or F8 MUST land; gamekit-side closure otherwise dangles). Quote re-verified at SKILL.md:64; pmos-gamekit `skills/_shared/` contains only `game-launcher/` (ls re-verified).
- Rationale: exactly the bootstrap-gap dangling-cite class root CLAUDE.md warns about.
- Blast radius: same as F8 + one sequencing note.

### 2048-F11 — Accepted (confirmed)
- Fix: proposal-spec only — F4(c)'s apology deletion is sentence-scoped, never lines 33–34 (line 33 re-verified to open with "  to degrade. The non-interactive contract block below is inlined only to satisfy the").
- Rationale: a literal line-range deletion would truncate the bullet's first sentence.
- Blast radius: proposal text only.

### 2048-F12 — Accepted (confirmed)
- Fix: game/2048.html:5 viewport meta → drop `maximum-scale=1, user-scalable=no` (quote re-verified).
- Rationale: WCAG 1.4.4 pinch-zoom block, redundant given touch-action rules, ignored by iOS Safari anyway.
- Blast radius: 2048.html for this unit; siblings in their own units.

**Author verdict (this run):** 12/12 accepted (F4, F8+F10 as substrate escalations), 0 rejected, 0 invalid.
Cumulative proposal at proposal/pmos-gamekit__2048.md re-confirmed complete and self-contained.
