# Proposal — pmos-gamekit__solitaire

**Unit:** `plugins/pmos-gamekit/skills/solitaire/` (SKILL.md 109 lines; `game/solitaire.html` 1073 lines; `tests/run.mjs` 169 lines, self-test 24/24 green). Cited substrate: `plugins/pmos-gamekit/skills/_shared/game-launcher/{game-launcher.md,serve.js}`.

**Status:** CAPPED (pass 2 of 2 — hard cap reached). 2 review passes + 2 author responses completed. Re-verified 2026-07-13: all finding quotes re-grounded against current files; no disposition changes.

**This document is cumulative and self-contained** — it describes proposed changes only; nothing has been implemented.

## Disposition table

| ID | Severity | One-line | Disposition |
|---|---|---|---|
| solitaire-F1 | Should-fix | Undo desyncs draw-mode toggle from `state.drawCount` | **Accepted** (C1) |
| solitaire-F2 | Should-fix | Deadlock banner under-fires: reversible shuttles count as "productive" | **Accepted (modified)** (C2) |
| solitaire-F3 | Should-fix | ~28-line dead non-interactive block + dangling cross-plugin cites | **Accepted (contract-level, staged)** (C3) |
| solitaire-F4 | Should-fix | No workable shutdown story for background launch ("Ctrl-C" has no terminal) | **Accepted** (C4) |
| solitaire-F5 | Nit | D2 hard Node requirement vs loud file:// fallback | **Rejected** |
| solitaire-F6 | Nit | Cards aria-labeled but keyboard-unreachable | **Accepted** (C5) |
| solitaire-F7 | Nit | `isDeadlocked` full stock-cycle scan runs redundantly (worse: per input event) | **Accepted** (C6) |
| solitaire-F8 | Nit | Engine tests never exercise draw-3 or recycle ordering | **Accepted** (C7) |
| solitaire-F9 | Should-fix | C5 as written targets a two-tap selection model that does not exist (`clickMove` is single-tap auto-target) | **Accepted** (amends C5) |
| solitaire-F10 | Should-fix | C5 keyboard mode unusable without focus restoration — `render()` destroys every focusable node per move | **Accepted** (amends C5) |
| solitaire-F11 | Nit | C6's stated cache-safety invariant is false — `setDrawMode` mutates state outside the recompute paths | **Accepted** (amends C6) |
| solitaire-F12 | Nit | serve.js/game-launcher.md still print/state the "Ctrl-C" instruction C4 removes from SKILL.md | **Accepted** (extends C4) |
| solitaire-F13 | Nit | Phase 1 instructs a file append but `allowed-tools: Bash, Read` grants no write tool | **Accepted (modified)** (C8) |

## Accepted changes (full detail)

### C1 — Undo preserves the player's draw-mode preference (F1, Should-fix)
- **File/section:** `game/solitaire.html`, `undo()` (lines 564–570).
- **Before:** `undo()` does `state = history.pop(); moves += 1; render(); afterStateChange();`. History snapshots capture `drawCount`, but `setDrawMode` (539–543) mutates `state.drawCount` in place with no history entry — so play a move in Draw 1 → toggle Draw 3 → press U: the engine reverts to draw-1 while the header buttons still show Draw 3 pressed (`aria-pressed` desync) until the user re-toggles.
- **After:** capture `state.drawCount` before the pop, restore the snapshot, then reapply the captured value via `setDrawMode(...)` — draw mode is treated as a player preference that undo never reverts. (Deliberately NOT the pass-1 reviewer's alternative of re-deriving the toggle from the popped snapshot, which fixes the desync but silently flips the player's chosen mode.)
- **Rationale:** UI and engine must agree; preference-preserving restore also matches user intent. `_setState` (line 1059) already re-syncs via `setDrawMode(state.drawCount)`, so the test seam is unaffected.
- **Blast radius:** `game/solitaire.html` only; add one Playwright e2e assertion (toggle → move → undo → `aria-pressed` and `getState().drawCount` agree). `tests/run.mjs` untouched.

### C2 — Tighten the deadlock scan's "productive" definition with a one-ply lookahead (F2, Should-fix)
- **File/section:** `game/solitaire.html`, engine `firstProductiveMove`/`isDeadlocked` (lines 411–484); comment at 460–464; new tests in `tests/run.mjs`.
- **Before:** the deadlock scan treats any legal non-stock move as productive, including provably no-progress self-inverse shuttles (foundation→tableau pulls, a red 6 shuttling between two black 7 tops, a lone King bouncing between empty columns). A deal whose only moves are shuttles is genuinely stuck yet never flags, so the SKILL.md:99 "no moves left — deal a new game?" promise is broken exactly when it matters.
- **After:** add a scan-only `isProgressMove` predicate (the hint path keeps the permissive `firstProductiveMove`). Progress = wasteToFoundation | tableauToFoundation | wasteToTableau | tableauToTableau that exposes a face-down card or meaningfully vacates a column (not a King empty→empty shuttle). One-ply lookahead: an otherwise-excluded move still counts as productive if applying it immediately enables a progress move (this is the modification — a bare exclusion of foundation→tableau, as the pass-1 reviewer sketched, would violate Inv-4 since a foundation pull can legitimately enable a waste→tableau play). Amend the Inv-4 comment to document the new residual: multi-ply enabling chains (≥2 non-progress moves before progress) can produce a rare false-positive banner — acceptable because the banner is non-blocking and dismissible. The draw-3 stride limitation (scan forces draw-1) stays as-is, documented — and note C6/F11: the deadlock cache's safety depends on that force staying.
- **Rationale:** closes the shuttle hole that makes the banner miss most real dead ends while keeping false positives to a vanishingly rare, documented case.
- **Blast radius:** engine section of `game/solitaire.html`; `tests/run.mjs` gains cases (shuttle-only stuck state flags; foundation-pull-enables-play state does NOT flag) with the `EXPECTED_CHECKS` bump coordinated with C7; SKILL.md:99 unchanged (becomes true). If the scan ever becomes draw-mode-aware, C6's cache invalidation must be extended (see C6).

### C3 — Replace the dead non-interactive block via a new W14 `prompt-free` exemption (F3, Should-fix; staged, cross-plugin)
- **Files/sections:** Stage 1 (contract home, pmos-toolkit): `skills/_shared/non-interactive.md` exemption vocabulary + `tools/lint-non-interactive-inline.sh`. Stage 2 (this unit): `SKILL.md` lines 44–72 (frozen block) and 34–35 (self-exemption apology).
- **Before:** SKILL.md self-declares prompt-free ("inlined only to satisfy the repo-wide W14 lint; no checkpoint ever fires", :35) yet carries the full ~28-line byte-identical block — ~a quarter of the body, loaded on every deal — whose internal cites (`tools/audit-recommended.sh`, "`_shared/non-interactive.md`" at :65) are dangling inside pmos-gamekit, whose `_shared/` holds only `game-launcher/`. The lint's exemption vocabulary (`refused`/`delegated`) has no marker for prompt-free skills, so a per-skill deletion would fail the lint.
- **After:** Stage 1 adds a third self-documenting marker — `<!-- non-interactive: prompt-free — skill issues no prompts; contract vacuously satisfied -->` — to the canonical W14 doc and teaches the lint to accept it. Stage 2 replaces the block and the :34–35 apology with the one-line marker. Stage 2 MUST NOT land before Stage 1 (lint would fail).
- **Rationale:** fixes both facets at the root — token economy and the one-fact-one-home violation of baking toolkit-internal cites into gamekit. This skill is the exemplar; the marker then lets all 7 gamekit skills drop the dead block.
- **Blast radius:** LARGE / cross-plugin — pmos-toolkit `_shared/non-interactive.md`, `lint-non-interactive-inline.sh`, re-run `audit-recommended.sh` (no call sites expected), `.github/workflows/skill-hygiene.yml`, verify skill-eval's non-interactive `[D]` check keys off the lint (CLAUDE.md: lint is source of truth), and the 6 sibling gamekit skills as follow-up stories. Requires a pmos-toolkit release before the gamekit change.

### C4 — Honest shutdown + pre-launch sweep for the background launch, aligned with the substrate (F4, Should-fix; extended by F12, Nit)
- **Files/sections:** `SKILL.md` Phase 0 `{#launch}`, steps 3–4 (lines 89, 96–101); PLUS (F12) `_shared/game-launcher/serve.js` line 88 and `game-launcher.md` line 69.
- **Before:** step 3 launches serve.js as a background Bash task ("**Launch** in the background so the server keeps running while you play"); step 4 says "Stopping is `Ctrl-C` in the launcher terminal." — but a background task has no terminal to Ctrl-C, so every `/solitaire` orphans a node server holding a port. Additionally (F12), the substrate restates the same misleading instruction: `serve.js:88` unconditionally prints `Press Ctrl-C to stop the server.` on every launch (including background), and `game-launcher.md:69` states the server "runs until `Ctrl-C`".
- **After — SKILL.md:** (a) step 3 gains a pre-launch sweep — stop any still-running solitaire `serve.js` background task from this session first; (b) the launch step notes the background task id / PID from launch output; (c) step 4's stop sentence becomes mode-aware — agent-launched: agent stops the background task (or `kill <pid>`) when done or on the next `/solitaire`; `Ctrl-C` applies only to the no-Bash platform path where the user ran the command themselves; (d) an explicit delta note that background launch supersedes `game-launcher.md#launch-contract`'s foreground Ctrl-C for shutdown (deltas-only pattern, SKILL.md:18–27).
- **After — substrate (F12):** `serve.js:88` softens to a mode-neutral line, e.g. "Stop the server process to end the session (Ctrl-C if running in a terminal)."; `game-launcher.md:69`'s serve-contract bullet gains the matching qualifier ("until the process is stopped — Ctrl-C when foreground"). Both substrate edits land together in the canonical home so the delta and its home stop drifting.
- **Rationale:** the current instruction is unexecutable in the skill's own default launch mode; fixing the delta while the canonical home contradicts it would be exactly the one-fact-one-home drift the repo's rules exist to prevent. The substrate wording fix is behavior-free and benefits all 7 gamekit skills.
- **Blast radius:** solitaire SKILL.md (re-run `tools/lint-phase-refs.sh`); `_shared/game-launcher/serve.js` + `game-launcher.md` (shared by all 7 gamekit skills — wording-only, no protocol change; grep gamekit tests for the old "Press Ctrl-C" string before landing). The SKILL.md-side defect likely exists in all 6 sibling gamekit skills — flagged as a follow-up sweep, not folded here.

### C5 — Minimal keyboard playability layered on click-to-move (F6, Nit; corrected by F9 and F10, Should-fix)
- **File/section:** `game/solitaire.html` render/input layer (`cardEl` :607–625, `clickMove` :697–723, `srcFromEl`, `wire()`, `render()` :~660–685); one line in SKILL.md Phase 0 step 4's controls list.
- **Before:** every face-up card gets an aria-label (:620), the stats bar is aria-live, the win banner is role=alertdialog — but no card element is focusable; only pointer + global hotkeys work. Labels imply an affordance that doesn't exist.
- **After:**
  1. Add `tabindex="0"` + `role="button"` to actionable elements (stock, waste top, movable-run head cards, foundations, empty-column slots) with a `:focus-visible` ring.
  2. **Activation mapping (corrected per F9):** map Enter/Space on the focused element to `clickMove(srcFromEl(focusedEl))` — the EXISTING single-activation auto-target handler at :697: it picks the destination itself (foundation first, else first legal tableau column) and moves immediately. There is NO two-tap select-source→select-destination model in this game and none is to be built (pass-1's C5 text wrongly described one; the only "select" in the file is `user-select: none`). "No new movement logic" stands.
  3. **Focus restoration (added per F10):** `render()` (:668 and siblings) wipes and rebuilds every card node per committed move, so without restoration the first Enter drops focus to `<body>` and the player must re-Tab through ~30 stops after every move. Before invoking `clickMove`, record the activated element's identity (`data-id` for cards, zone for piles); after `commit → render()`, re-focus the element with that `data-id` if still present, else its destination pile, else the source pile.
  4. The Playwright keyboard smoke must assert BOTH that Enter moves the card AND that `document.activeElement` is a game element (not `<body>`) after the move completes — otherwise the e2e passes while the feature ships broken.
  5. SKILL.md controls line mentions Enter/Space activation.
- **Rationale:** the a11y gap is real (labels without reachability is an affordance lie); the fix is cheap because `clickMove` already implements single-tap auto-targeting — keyboard is a focus + activation mapping. Focus restore is load-bearing, not polish: without it the feature is unusable in practice.
- **Blast radius:** `game/solitaire.html` (activation mapping + small focus-restore helper); Playwright e2e keyboard smoke with the focus assertion; one SKILL.md line; `tests/run.mjs` untouched.

### C6 — Cache the deadlock scan; compute once per state change, with the TRUE safety invariant documented (F7, Nit; corrected by F11, Nit)
- **File/section:** `game/solitaire.html` — `afterStateChange` (:949–955), `armIdleHint` (:887–893), `updateDeadlockBanner` (:901–907), `newGame`, `_setState`; note `setDrawMode` (:539–543).
- **Before:** `E.isDeadlocked(state)` (a full simulated stock cycle with per-step `JSON.parse(JSON.stringify(...))` clones) runs twice per commit/undo — and once per `onActivity`, which is wired capture-phase to `pointerdown`/`keydown` (:1044–1045), i.e. per input event.
- **After:** module-level `deadlockCached`, recomputed exactly once in `afterStateChange` (and on `newGame`/`_setState`); banner and idle-hint read the cache.
- **Cache-safety invariant (corrected per F11):** pass-1's claim "state only mutates through those paths, so the cache cannot go stale" is FALSE as stated — `setDrawMode` mutates `state.drawCount` in place via the Draw 1/Draw 3 buttons and the `1`/`3` hotkeys without passing through any recompute path. The cache is nevertheless safe, but only because `isDeadlocked` clones and forces `st.drawCount = 1` (and C2 keeps that force), making the scan result independent of the one field that mutates outside the recompute paths. The code comment (and this proposal) must state that real invariant verbatim: "recomputed on every mutation path EXCEPT `setDrawMode`, which is safe only because the scan is drawCount-independent (forces draw-1); if the scan ever becomes draw-mode-aware, `setDrawMode` must also invalidate the cache."
- **Rationale:** strict simplification; single source of truth for "is this position dead". Documenting the true dependency converts a maintainer trap (plausible C2 follow-up: draw-3-aware scan → silent stale cache) into a signposted edge.
- **Blast radius:** `game/solitaire.html` only; re-run the deadlock-banner e2e.

### C7 — Draw-3 and recycle-order coverage in the engine self-test (F8, Nit)
- **File/section:** `tests/run.mjs` (all 24 current checks use `drawCount: 1`, line 53; `EXPECTED_CHECKS = 24` at line 20).
- **Before:** the `Math.min(st.drawCount, st.stock.length)` draw-3 path (including the short final draw) and the recycle-order LIFO invariant ship with zero coverage — core Klondike rules, exactly the §H script-gate territory the harness exists for.
- **After:** add checks: draw-3 with stock ≥3 moves exactly 3; short final draw (stock 1–2) draws the remainder; correct waste-top ordering after a draw-3; LIFO recycle invariant (post-recycle re-draw yields the same sequence as the first pass); recycle illegal while stock non-empty. Bump `EXPECTED_CHECKS` once, jointly with C2's new deadlock cases.
- **Rationale:** the self-asserting count makes drift visible; sweep for external "24/24" claims before landing (only known one is the review scratchpad itself).
- **Blast radius:** `tests/run.mjs` only; selftest entry point unchanged.

### C8 — Name the sanctioned append mechanism for Capture Learnings; keep the tool grant minimal (F13, Nit; accepted with modification)
- **File/section:** `SKILL.md` Phase 1 Capture Learnings (:104–108); frontmatter `allowed-tools: Bash, Read` (:6) unchanged.
- **Before:** Phase 1 instructs "append a one-line entry under `## /solitaire` in `~/.pmos/learnings.md`" while the frontmatter grants no Write/Edit tool — the only compliant path is an unstated shell redirection, which the pass-2 reviewer flags as a file mutation smuggled past the harness's edit-review surface and brittle (heredoc quoting, `~` expansion).
- **After (modification vs the reviewer's either/or):** do NOT widen the tool grant. Instead the phase text names the mechanism explicitly: append via a single Bash `printf '%s\n' '<entry>' >> ~/.pmos/learnings.md` one-liner (printf, not a heredoc, sidestepping the quoting brittleness; `>>` creates the file if absent, which also covers the Load Learnings first-run case).
- **Rationale:** granting Write/Edit for one optional out-of-repo line is a wider tool surface than the phase needs, and `~/.pmos/learnings.md` lives outside the project so the edit-review argument is weakest exactly there; naming the exact Bash mechanism resolves the instruction/grant mismatch at zero grant cost.
- **Blast radius:** solitaire SKILL.md Phase 1 text only; re-run `tools/lint-phase-refs.sh` and `lint-non-interactive-inline.sh` after edit. The same mismatch likely exists in the 6 sibling gamekit skills — follow-up sweep, same bucket as C4's sibling sweep.

## Rejections

### solitaire-F5 (Nit) — D2 hard Node requirement / loud file:// fallback — REJECTED (pass 1; uncontested in pass 2)
Reviewer argued the single-file game plays fine from `file://`, so failing closed on a missing Node runtime is a product-sense miss; proposed a *loud* fallback ("Node not found; opening from file://…").

Author rejection: (1) D2's canonical home is `_shared/game-launcher/game-launcher.md`, shared by all 7 gamekit skills — a solitaire-local softening violates §K (one fact, one home) and forks the launch contract. (2) A supported file:// mode is a second play mode the plugin must keep true forever; solitaire happens to work from file:// today, but the contract also covers games where file:// breaks (fetch, audio, multi-file), and a per-game "does file:// work?" matrix is exactly the complexity D2 buys out of. (3) The failure is rare (Claude Code hosts overwhelmingly have Node) and the error contract names the fix. The finding itself concedes this is a "deliberate, documented decision". Legitimate to re-raise as a game-launcher.md D2 review — a different unit; as a Nit against an acknowledged trade-off it does not clear the bar for a cross-cutting contract change. No change. The pass-2 reviewer did not contest this rejection.

## Open questions

- **solitaire-F5** is the only disagreement on record: author rejected (argument above), and the pass-2 reviewer raised no counter, so it stands rejected-uncontested. If it is to be revisited, it belongs to a `_shared/game-launcher` (D2 contract) review unit, not this one.
- All five pass-2 findings (F9–F13) were accepted (F13 with a modification the reviewer's either/or framing already permits: "either add Write/Edit to allowed-tools or have the phase state the sanctioned mechanism explicitly" — C8 takes the second branch). No unresolved pass-2 disagreements.

## Sequencing notes for the implementer
- C3 is two-stage and cross-plugin: pmos-toolkit lint/contract change first, then this SKILL.md.
- C2 + C7 share one `EXPECTED_CHECKS` bump in `tests/run.mjs` — land together or coordinate the count.
- C4 now spans SKILL.md AND the shared substrate (`serve.js` + `game-launcher.md`) — the substrate wording edits are shared by all 7 gamekit skills; land them with (or before) the SKILL.md edit.
- C1, C5, C6 are independent `game/solitaire.html` edits; C5's focus-restore helper (F10) and C6's corrected invariant comment (F11) are mandatory parts of those changes, not optional polish. C8 is SKILL.md-only.
- Follow-up sweeps flagged (not folded here): sibling gamekit skills for the C4 shutdown-story defect, the C3 dead-block removal (post Stage 1), and the C8 append-mechanism mismatch.
