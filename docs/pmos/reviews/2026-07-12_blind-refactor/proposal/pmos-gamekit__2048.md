# Proposal — pmos-gamekit__2048

**Status:** CAPPED (pass 2) — 2 passes completed (pass 1 review + author response; pass 2 review + author response). Hard cap reached. Re-confirmed 2026-07-13: every finding's grounding quote independently re-verified against the live files; all 12 dispositions stand unchanged.
**Unit files:** `plugins/pmos-gamekit/skills/2048/` (SKILL.md, game/2048.html, tests/run.mjs) + the plugin-shared launcher `plugins/pmos-gamekit/skills/_shared/game-launcher/` (serve.js, game-launcher.md) where fixes escalate to the canonical home.

This document is self-contained: it is the only context the next reader receives. Changes below are DESCRIBED, not implemented — nothing in the repo has been edited.

## Findings ledger

| ID | Severity | Disposition |
|---|---|---|
| 2048-F1 | Should-fix | Accepted (pass 1) |
| 2048-F2 | Should-fix | Accepted (pass 1) |
| 2048-F3 | Should-fix | Accepted (pass 1; wording amended by F9) |
| 2048-F4 | Should-fix | Accepted (pass 1; substrate escalation — implementation lives outside this unit; spec tightened by F11) |
| 2048-F5 | Nit | Accepted (pass 1) |
| 2048-F6 | Nit | Accepted (pass 1) |
| 2048-F7 | Nit | Accepted (pass 1) |
| 2048-F8 | Nit | Accepted (pass 1; substrate escalation; scope widened by F10) |
| 2048-F9 | Should-fix | Accepted (pass 2) |
| 2048-F10 | Nit | Accepted (pass 2) |
| 2048-F11 | Nit | Accepted (pass 2) |
| 2048-F12 | Nit | Accepted (pass 2) |

Accepted: 12 · Rejected: 0 · Invalid: 0.

## Accepted changes (full detail)

### 2048-F1 [Should-fix] — Tautological selftest check can never fail
- **Where:** `tests/run.mjs:172` — `ok(!eqArr(a.board, c.board) || true, 'different seed (usually) differs'); // tolerant: collisions are rare but legal`
- **Defect:** `<expr> || true` is always true; the check passes even if `makeRng` ignores the seed entirely. It is counted in `EXPECTED_CHECKS = 38` (run.mjs:13), inflating the apparent contract surface — a deterministic gate that cannot fail violates the repo's §H ethos.
- **Fix (before → after intent):** In the deterministic-RNG block (run.mjs:166–173), replace the tautological check with falsifiable ones: (a) create initial states for a small set of distinct seeds (e.g. 2024, 2025, 3000, 7777, 424242) and assert at least two resulting boards differ (`ok(boards.some(b => !eqArr(b, boards[0])), …)`); (b) assert stream determinism directly — two `makeRng(2024)` instances produce identical first-8-draw sequences. Adjust `EXPECTED_CHECKS` to the new true count (coordinated with F2's additions).
- **Rationale:** "Some seed differs across 5 seeds" is falsifiable yet collision-proof in practice — a 5-way collision means the RNG ignores the seed, which is exactly the bug worth catching.
- **Blast radius:** `tests/run.mjs` only. No prose in SKILL.md pins "38 checks" (verified by grep).

### 2048-F2 [Should-fix] — snapshot/restore (undo engine surface) has zero test coverage
- **Where:** `tests/run.mjs:4` — `// documented Game2048Engine contract. Run: node tests/run.mjs --selftest`. Grep confirms zero `snapshot`/`restore` occurrences anywhere in run.mjs, while SKILL.md advertises "**U** undo (one step)" and 2048.html:297 documents "One-deep undo snapshot helpers".
- **Defect:** The harness header claims to assert "the documented Game2048Engine contract," but an advertised gameplay feature's entire logic layer is unverified.
- **Fix (before → after intent):** Add a snapshot/restore round-trip block after the score-accumulation block: (1) create a state, `snap = E.snapshot(s)`, apply a mutating `E.move`, then `E.restore(s, snap)`; assert board/score/moves/won/over all equal pre-move values. (2) Deep-copy assertion: mutate `s.board` after snapshotting; confirm `snap.board` unchanged. (3) Restore across a win: rig a board one merge from 2048, move (won=true), restore, assert `won === false` and no 2048 tile. Bump `EXPECTED_CHECKS` (shared with F1's adjustment).
- **Rationale:** A 6–8 line addition closes the header's overclaim on an advertised feature.
- **Blast radius:** `tests/run.mjs` only.

### 2048-F3 [Should-fix] — Stop instruction contradicts the prescribed background launch (wording amended by F9)
- **Where:** `SKILL.md:88` — "**Launch** in the background so the server keeps running while you play:" vs `SKILL.md:99` — stopping is "`Ctrl-C` in the launcher terminal". Same assumption is canonical in `plugins/pmos-gamekit/skills/_shared/game-launcher/game-launcher.md:54` ("Reports the printed `http://127.0.0.1:<port>/` URL and that Ctrl-C stops the server").
- **Defect:** In the prescribed launch mode (Bash `run_in_background`) there is no launcher terminal for the user to Ctrl-C; the process is a detached background task owned by the agent session. The user is handed a stop instruction that cannot work as written.
- **Fix (before → after intent):** Two files. (a) `SKILL.md` Phase 0 step 4 (lines 98–99): make the stop instruction mode-aware — when launched via the background Bash task, tell the user to ask the agent to stop the server (agent kills the background task / the pid serve.js prints — **note:** the PID reference is only accurate once F9(a) ships; see sequencing); mention Ctrl-C only for the manual-launch fallback (the "No Bash tool" Platform Adaptation path). (b) `game-launcher.md` #launch-contract step 4 (line 54): same mode-aware rewording in the canonical home — per §K the launch contract lives there; SKILL.md merely restates it.
- **Rationale:** The reported stop instruction must be executable in the launch mode the skill itself prescribes.
- **Blast radius:** `game-launcher.md` is consumed by all 7 gamekit skills; all 7 SKILL.mds carry the same "Ctrl-C" sentence (grep-verified: 2048, flappy-bird, poker, snake, solitaire, sudoku, tetris) — sibling units should apply the identical one-sentence edit. No lints/evals key on this wording.

### 2048-F4 [Should-fix] — ~30 lines of dead mandated contract in a prompt-free launcher; W14 taxonomy lacks a "prompt-free" exemption class (spec tightened by F11)
- **Where:** `SKILL.md:33` — "The non-interactive contract block below is inlined only to satisfy the repo-wide W14 lint; no checkpoint ever fires." The frozen 27-line block occupies SKILL.md:43–71, roughly a third of the file's context cost.
- **Defect:** The skill admits the block is inert (no prompts, no artifacts, no subagents), yet pays the token tax on every invocation, ×7 gamekit launchers. The W14 posture has two self-documenting exemption markers (`refused`, `delegated`) but none for "provably prompt-free"; `game-launcher.md:57–58` explicitly punts ownership of the question to the lint.
- **Fix (before → after intent), substrate-first ordering mandatory:** (a) `plugins/pmos-toolkit/tools/lint-non-interactive-inline.sh` (exemption check, ~line 53): extend the accepted marker set to `(refused|delegated|prompt-free)`, with the lint verifying a `prompt-free`-marked SKILL.md contains zero `AskUserQuestion` call sites and no Task-tool subagent dispatch (else fail — the marker would be a lie). (b) Root `CLAUDE.md` "Non-interactive contract (W14 posture)" bullet: document the third marker class. (c) `plugins/pmos-gamekit/skills/2048/SKILL.md`: replace the inline block (lines 43–71) with the one-line `<!-- non-interactive: prompt-free — zero prompts, no subagents, no persistent artifact -->` marker, and — per F11 — delete the apology **sentence-scoped, not line-scoped**: in the Platform Adaptation "No `AskUserQuestion` tool" bullet, remove only the second sentence (from "The non-interactive contract block below is inlined only to satisfy the" through "no checkpoint ever fires."), leaving the first sentence ("Not used — this skill is prompt-free, so there is nothing to degrade.") intact. A literal lines-33–34 deletion would truncate the first sentence mid-clause (line 33 begins "  to degrade. The non-interactive contract block…").
- **Rationale:** The exemption taxonomy is already self-documenting-marker-based; a third class gated on a statically checkable property (zero call sites — the same extraction `audit-recommended.sh` already performs) stays deterministic per §H. The frozen block's only non-prompt clauses (subagent dispatch, exit summary) are excluded by the marker's gate, so nothing real is lost.
- **Blast radius (largest accepted change):** lint-non-interactive-inline.sh, root CLAUDE.md W14 text, potentially `audit-recommended.sh` (extractor reuse), all 7 gamekit SKILL.mds (each in its own unit), and the skill-eval rubric if it cites the two-marker taxonomy. Must ship substrate-first, skill edits second, or the lint goes red. Interacts with F8/F10 (see below).

### 2048-F5 [Nit] — Comment cites a Playwright e2e that does not exist
- **Where:** `game/2048.html:541` — "// test seam — lets the Playwright e2e drive deterministic states without touching engine internals." No Playwright/e2e exists anywhere in the plugin (grep-verified; the only test is the Node vm selftest, which never uses `window.__2048_TEST__`).
- **Fix (before → after intent):** Reword the comment to reflect reality: "test/debug seam — lets an automated driver (browser e2e or a console session) rig deterministic states without touching engine internals; no bundled e2e uses it yet." Keep the seam itself — `loadBoard`/`overlays` is what makes the F6 fix manually verifiable and any future e2e possible.
- **Rationale:** A stale justification for a shipped debug hook misleads auditors; the honest comment costs one line.
- **Blast radius:** 2048.html only. Note: flappy-bird, snake, solitaire game HTMLs carry the same "Playwright e2e" comment — sibling units should apply the same reword.

### 2048-F6 [Nit] — Undo during the win overlay leaves a stale "You win!" overlay over a restored pre-win board
- **Where:** `game/2048.html:444–446` — `canUndo = false; undoSnap = null; overOverlay.hidden = true; render();`. The keydown handler (line 505) routes **U** to `undo()` with no overlay guard; `restore()` sets `won` back to false and removes the 2048 tile, but `winOverlay` stays visible.
- **Fix (before → after intent):** In `undo()` (lines 441–448), add `winOverlay.hidden = true;` alongside the existing `overOverlay.hidden = true;`. Leave `dismissedWin` untouched (still false) so re-reaching 2048 after the undo correctly re-shows the win overlay.
- **Rationale:** Symmetric with the existing game-over handling, and friendlier than blocking undo while an overlay is up (undo-out-of-game-over is clearly intended given the existing line).
- **Blast radius:** 2048.html UI script only; engine and selftest untouched (verify manually via the `__2048_TEST__.loadBoard` seam — ties into F5's honest-comment rewrite).

### 2048-F7 [Nit] — Dead `busy` guard: declared, checked, reset, never set
- **Where:** `game/2048.html:420` — `if (busy || !state || startOverlay.hidden === false) return;`. Grep confirms `busy` is declared false (340), reset false in `newGame()` (410), and read (420) — never set true.
- **Fix (before → after intent):** Delete the `busy` declaration, its reset in `newGame()`, and the `busy ||` term in `doMove()`'s guard.
- **Rationale:** A vestigial animation lock implies a concurrency discipline that doesn't exist; the game is synchronous per input event and the confetti canvas doesn't block input by design. Deleting is safer than "actually setting it" — there is no transition window to guard.
- **Blast radius:** 2048.html only; no test references `busy`.

### 2048-F8 [Nit] — Frozen block's exit summary hardcodes `pmos-toolkit:` in a gamekit skill (scope widened by F10)
- **Where:** `SKILL.md:70` — clause 8 of the frozen block: "Print to stderr at exit: `pmos-toolkit: /<skill> finished — outcome=<clean|deferred|error>`". Substrate defect surfaced from this unit; unfixable per-skill because byte-identity to `skills/_shared/non-interactive.md` is the lint contract.
- **Fix (before → after intent):** In the canonical `plugins/pmos-toolkit/skills/_shared/non-interactive.md`, two clause edits in one pass: (a) clause 8 — parameterize the prefix: `pmos-toolkit:` → `<plugin>:` (the line already parameterizes `/<skill>`); (b) **per F10** clause 5 — change the self-description "Section D of this file (`_shared/non-interactive.md`)" to name the canonical home explicitly: "Section D of pmos-toolkit's `skills/_shared/non-interactive.md`", so the sentence is true from any plugin the block is pasted into. Then re-paste the byte-identical updated block into every skill carrying it, repo-wide, in one sweep (the block is hand-maintained by design; the lint is the drift detector).
- **Rationale:** A gamekit skill honoring the NFR-07 summary as written would announce the wrong plugin, and clause 5 self-describes a file that does not exist in the plugin the reader is standing in (pmos-gamekit's `skills/_shared/` contains only `game-launcher/` — find-verified) — a dangling substrate cite of exactly the bootstrap-gap class root CLAUDE.md warns about. Only the canonical home + fleet re-paste is a legal fix.
- **Blast radius:** `_shared/non-interactive.md` (canonical, pmos-toolkit); every SKILL.md repo-wide inlining the frozen block (all plugins); `lint-non-interactive-inline.sh`'s reference copy; `sync-shared.sh` intersection copies in consumer plugins. **Interaction with F4:** if the `prompt-free` marker ships first, gamekit launchers drop the block entirely and this fix's gamekit-side re-paste becomes moot for them.

### 2048-F9 [Should-fix] — F3's fix missed the launcher's own stdout line, and cited a PID that is never printed
- **Where:** `plugins/pmos-gamekit/skills/_shared/game-launcher/serve.js:88` — `process.stdout.write('Press Ctrl-C to stop the server.\n');`. Also serve.js:10 header comment ("runs until Ctrl-C (SIGINT/SIGTERM) then exits…") and `game-launcher.md:69` ("Prints the URL to stdout and runs until `Ctrl-C` (SIGINT/SIGTERM), then exits 0."). Grep confirms serve.js prints no PID anywhere.
- **Defect:** F3 as accepted fixed the prose in two files, but serve.js itself prints Ctrl-C advice on every launch — the very output the agent relays to the user — so the user still sees an inexecutable stop instruction in the prescribed `run_in_background` mode. Compounding it, F3's replacement wording referenced "the printed PID," which does not exist in the output.
- **Fix (before → after intent):** (a) `serve.js` startup stdout (line 88): replace with a mode-neutral line that also prints `process.pid`, e.g. "Server pid <pid> — stop it with Ctrl-C (foreground) or by killing the pid / asking your agent to stop the background task." Update the serve.js:10 header comment to the same mode-neutral phrasing. (b) `game-launcher.md` #serve bullet (line 69): reword to "prints the URL and its pid to stdout; runs until stopped (SIGINT/SIGTERM), then exits 0." (c) F3's SKILL.md wording is amended (see F3 above) so its PID reference becomes true only after (a) ships — sequencing enforced below.
- **Rationale:** Printing the pid is a 1-line change that makes both the stdout line and the SKILL.md instruction executable in either launch mode; without it, F3 fails its own rationale.
- **Blast radius:** serve.js + game-launcher.md are the single canonical copies shared by all 7 gamekit launchers — one edit covers the fleet. No test or fixture pins the exact stdout string (grep-verified in tests/run.mjs and the launcher dir).

### 2048-F10 [Nit] — Frozen block clause 5 is a dangling in-plugin cite that neither F4 nor F8 (as originally scoped) closes
- **Where:** `SKILL.md:64` — clause 5: "sources the shared call-site extractor from Section D of this file (`_shared/non-interactive.md`)". pmos-gamekit's `skills/_shared/` contains only `game-launcher/` (find-verified); `tools/audit-recommended.sh` lives in pmos-toolkit.
- **Fix (before → after intent):** Folded into F8's canonical-block edit (clause-5 rewording to name pmos-toolkit's canonical path — see F8(b) above), plus a recorded dependency: for gamekit, F4's `prompt-free` marker removes the block (and this lie with it); if F4 stalls, F8's re-paste with the corrected clause 5 is the fallback closure. **One of F4 or F8 MUST land before this unit's fixes are considered complete** — a partial implementation must not leave clause 5's false self-description in place.
- **Rationale:** F8's original scope fixed clause 8 only; the reviewer correctly showed its re-paste would leave clause 5 untouched, and F4's mooting of the issue is conditional on a substrate change actually shipping. Folding one more clause into F8's already-mandated canonical edit is near-zero marginal cost.
- **Blast radius:** identical to F8 (canonical file + repo-wide re-paste + lint reference copy); plus the sequencing note below.

### 2048-F11 [Nit] — F4(c)'s "lines 33–34" deletion range starts mid-sentence
- **Where:** `SKILL.md:33` — "  to degrade. The non-interactive contract block below is inlined only to satisfy the" — the line carries both the tail of the bullet's first sentence and the head of the apology sentence.
- **Fix (before → after intent):** Proposal-spec correction only, applied to F4(c) above: the apology deletion is sentence-scoped ("delete the second sentence of the No-AskUserQuestion bullet, from 'The non-interactive contract block below…' through '…no checkpoint ever fires.'"), never a line range. A literal lines-33–34 deletion would ship "…so there is nothing" as a truncated sentence.
- **Rationale:** Fix specs must be sentence-scoped when the target spans partial lines; an implementer following the original range verbatim would corrupt the shipped SKILL.md.
- **Blast radius:** none beyond this proposal's text (F4's intent unchanged; its specification tightened).

### 2048-F12 [Nit] — Viewport meta disables pinch-zoom (a11y regression)
- **Where:** `game/2048.html:5` — `content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"`.
- **Fix (before → after intent):** Change to `content="width=device-width, initial-scale=1"` — drop the two zoom-blocking tokens.
- **Rationale:** `maximum-scale=1, user-scalable=no` blocks pinch-zoom for low-vision players (WCAG 1.4.4 territory) and is redundant for gesture control — the page already sets `touch-action: manipulation` on body (kills double-tap zoom) and `touch-action: none` on the board (owns swipe); iOS Safari ignores `user-scalable=no` anyway, so the restriction is harmful where honored and inconsistent where not. Brings the viewport line up to the standard of the file's otherwise careful a11y work (aria-live announcer, sr-only region, focus-visible outlines, prefers-reduced-motion).
- **Blast radius:** 2048.html only for this unit; sibling game HTMLs likely share the pattern and deserve the same one-line edit in their own units. No test or lint keys on the viewport meta.

## Rejections

None. All 12 findings across both passes were verified as grounded (verbatim quotes confirmed at their cited file:line) and accepted.

## Open questions

None — no unresolved disagreements. Every finding from both passes was accepted; the only conditionalities are sequencing constraints, recorded below.

## Sequencing notes for implementation

1. F4 substrate (lint + root CLAUDE.md) before any gamekit SKILL.md drops its inline block; F4(c)'s apology deletion is sentence-scoped per F11.
2. F8's canonical-block edit now covers BOTH clause 8 (`<plugin>:` prefix) and clause 5 (explicit pmos-toolkit path, per F10) — edit the canonical file before (or bundled with) the fleet re-paste; skip the gamekit re-paste for skills that adopt F4's marker. **F10 closure requires at least one of F4 or F8 to land.**
3. F9(a) (serve.js pid + mode-neutral stop line) must ship before or with F3's SKILL.md rewording, or the SKILL.md must not mention a printed PID.
4. F1 + F2 share one `EXPECTED_CHECKS` bump in `tests/run.mjs`.
5. F3/F9's canonical edits land in `game-launcher.md` + `serve.js` (single shared copies); the 6 sibling launchers need only the matching one-sentence SKILL.md edit in their own units.
