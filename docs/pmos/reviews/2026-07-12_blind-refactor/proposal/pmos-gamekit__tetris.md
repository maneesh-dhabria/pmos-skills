# Refactor proposal — pmos-gamekit__tetris

**Unit:** `plugins/pmos-gamekit/skills/tetris/` (SKILL.md, game/tetris.html, tests/run.mjs; cites gamekit-local `_shared/game-launcher/{game-launcher.md,serve.js}`)
**Status:** CAPPED (pass 2 — hard cap reached; pass-1 dispositions re-verified 2026-07-13, all quotes re-grounded verbatim). Passes: pass 1 (7 findings, 7 accepted) + pass 2 (6 findings, 6 accepted). 13 accepted, 0 rejected, 0 invalid. No changes implemented — this document only describes them.

**Baseline health (verified by pass-1 reviewer, re-spot-checked pass 2 and at re-verification):** tests/run.mjs --selftest 53/53 PASS; serve.test.mjs 5/5; lint-non-interactive-inline, lint-flags-vs-hints, lint-phase-refs all PASS; SRS kick tables, guideline scoring, 7-bag, lock-delay cap, no-persistence (D6) confirmed correct. The one code defect found in the engine's vicinity (F12) is in the UI rAF layer, outside the vm-extracted engine and invisible to the test harness.

## Findings ledger

| ID | Severity | Disposition | One-line |
|---|---|---|---|
| tetris-F1 | Should-fix | **Accepted** (→ C1) | Background launch contradicts the "Ctrl-C in the launcher terminal" stop story — orphaned `node serve.js` every session |
| tetris-F2 | Should-fix | **Accepted** (→ C2) | Launcher-scoped learnings keyed under `## /tetris` — §K fragmentation across 7 sibling games |
| tetris-F3 | Should-fix | **Accepted** (→ C3; convention-level, gated on repo-owner sign-off) | W14 lint has no `prompt-free` exemption; ~28 dead lines inlined per gamekit skill |
| tetris-F4 | Nit | **Accepted** (→ C4) | Canonical frozen block hardcodes `pmos-toolkit:` in the end-of-skill stderr line — wrong plugin name for gamekit |
| tetris-F5 | Nit | **Accepted** (→ C5) | Dead `p2` variable with scratch-work comment in tests/run.mjs:119 |
| tetris-F6 | Nit | **Accepted** (→ C6) | Untested, caller-less duplicate export alias `hold: holdActive` in tetris.html:433 |
| tetris-F7 | Nit | **Accepted** (→ C7) | Phase 1 requires a file append but allowed-tools is `Bash, Read` — state the Bash-append pattern explicitly |
| tetris-F8 | Should-fix | **Accepted** (→ C1 amended) | C1 omitted serve.js — the launcher's own stdout still prints the single-path "Press Ctrl-C" story |
| tetris-F9 | Should-fix | **Accepted** (→ C3 amended) | C3's block removal leaves SKILL.md:33–35 pointing at a "block below" that no longer exists |
| tetris-F10 | Should-fix | **Accepted** (→ C3 amended) | The `prompt-free` marker must count as "rolled out" for FR-08/item-7 pre-rollout detection, else marker-carrying skills discard `--non-interactive` with a false warning |
| tetris-F11 | Should-fix | **Accepted** (→ C4 amended) | C4's atomic plan ignored the byte-identical learnkit mirror of non-interactive.md; the lint "completeness proof" is blind to it — propagate via `sync-shared.sh --from=pmos-toolkit` |
| tetris-F12 | Should-fix | **Accepted** (→ C8, new) | Mid-game R restart schedules a second concurrent rAF loop (one more per restart, no cancelAnimationFrame anywhere); comment at :628 documents a false invariant |
| tetris-F13 | Nit | **Accepted** (→ C2 amended) | The two learnings keys C2 makes tetris read have no precedence rule — define specific-over-general once in the substrate |

## Accepted changes (full detail)

### C1 — Two-path stop story for the launched server (F1 Should-fix; amended by F8 Should-fix)
- **Files:** `plugins/pmos-gamekit/skills/_shared/game-launcher/game-launcher.md` (`#launch-contract` step 4), `plugins/pmos-gamekit/skills/_shared/game-launcher/serve.js` (startup banner, line 88), `plugins/pmos-gamekit/skills/tetris/SKILL.md` (Phase 0 steps 3–4).
- **Before:** SKILL.md:89 instructs "**Launch** in the background so the server keeps running while you play"; SKILL.md:101 tells the user "Stopping is `Ctrl-C` in the launcher terminal." Under Claude Code the background launch is a detached Bash task — no launcher terminal exists, so the documented stop method cannot work and every session orphans a `node serve.js`. The substrate contract ("Ctrl-C stops the server", game-launcher.md:54) assumed foreground. Additionally (F8) serve.js:88 unconditionally prints `Press Ctrl-C to stop the server.` — stdout the model reads and would naturally relay, so a docs-only fix leaves runtime and docs disagreeing.
- **After (intent):**
  - serve.js banner becomes two-path and self-identifying: `Server PID <pid> — Ctrl-C here to stop, or kill the PID.` (via `process.pid`). This makes PID capture concrete: the skill reads the PID from the same launch stdout it already parses for the URL.
  - game-launcher.md#launch-contract step 4 states the two-path stop story: foreground/self-run launch (the No-Bash degradation path) → Ctrl-C; background launch (Claude Code default) → skill captures the PID from the banner and reports "ask me to stop the game and I'll kill the server (PID <n>)"; `lsof -i :<port>` remains as the orphan-recovery hint only.
  - Tetris SKILL.md step 3 adds "capture the PID from the launch banner"; step 4's stop sentence cites the two-path contract (delta-only; §K home stays in game-launcher.md).
- **Rationale:** real friction — no working stop method in the default launch mode; and the runtime's own message is the highest-authority stop story, so it must carry the truth (F8).
- **Blast radius:** game-launcher.md + serve.js (gamekit-local `_shared/`, shared by all 7 games — the serve.js banner fix benefits every sibling with zero per-skill edits; no cross-plugin sync, this substrate exists only in gamekit); all 7 gamekit SKILL.md files carry byte-similar step-3/step-4 text (grep-verified) — sibling follow-ups outside this unit; serve.test.mjs is safe (asserts only the URL regex and SIGTERM shutdown) but its 5 checks are the regression proof; lint-phase-refs unaffected (no anchors change).
- **Severity:** Should-fix.

### C2 — Route launcher quirks to a shared `## game-launcher` learnings key, with a precedence rule (F2 Should-fix; amended by F13 Nit)
- **Files:** `game-launcher.md` (new short "Learnings routing" note) and tetris `SKILL.md` ("Load Learnings" section + Phase 1 "Capture Learnings").
- **Before:** SKILL.md:76 reads/applies only `## /tetris`; SKILL.md:107–109 appends launcher-scoped examples (browser-open quirk, Node path quirk, port-binding hiccup) under `## /tetris`. Those facts are properties of the shared launcher, so each quirk is invisible to the 6 sibling games and gets re-discovered per game heading (§K violation). The existing conflict rule ("The skill body wins on conflict", SKILL.md:77) covers body-vs-learnings only.
- **After (intent):** game-launcher.md declares `## game-launcher` in `~/.pmos/learnings.md` as the canonical home for launcher/host quirks, and the same note states the merge precedence ONCE for all siblings: most-specific wins — skill body > `## /<game>` > `## game-launcher` (F13). Tetris's Load phase reads BOTH keys and cites the precedence rule from the substrate (its old body-wins clause is subsumed, not restated); Capture routes launcher-scoped facts to `## game-launcher`, reserving `## /tetris` for genuinely tetris-specific facts.
- **Rationale:** one fact, one home; and a two-key merge without a stated tie-break would ship seven skills with undefined merge order.
- **Blast radius:** game-launcher.md; tetris SKILL.md (2 sections); identical Load/Capture text in all 7 gamekit skills (sibling follow-ups inherit the precedence rule for free by citing the substrate); no migration needed (learnings.md is user-local and additive); no lints/evals assert the heading key or the rule.
- **Severity:** Should-fix (+ Nit amendment).

### C3 — Add a `prompt-free` exemption category to the W14 lint (F3 Should-fix; amended by F9 + F10 Should-fix; convention-level — REQUIRES repo-owner sign-off, touches the CLAUDE.md W14 posture)
- **Files:** `plugins/pmos-toolkit/tools/lint-non-interactive-inline.sh`, `plugins/pmos-toolkit/skills/_shared/non-interactive.md` (+ its learnkit mirror via sync — see C4/F11 note), CLAUDE.md "Non-interactive contract (W14 posture)" bullet; then tetris `SKILL.md` (block removal AND Platform-Adaptation-bullet rewrite; siblings as per-skill follow-ups).
- **Before:** exemption vocabulary is `refused` / `delegated` only. Tetris issues zero prompts by design yet must inline the full ~28-line frozen block (SKILL.md:44–72, ~3KB, ~1/3 of the body) it explicitly labels dead: "The non-interactive contract block below is inlined only to satisfy the repo-wide W14 lint; no checkpoint ever fires" (SKILL.md:34–35). Multiplied ~7× across gamekit. Repo-wide, "rolled out" is detected by presence of `<!-- non-interactive-block:start -->` (block item 7 / FR-08, mirrored at tetris SKILL.md:69).
- **After (intent):**
  1. New self-documenting marker `<!-- non-interactive: prompt-free; <justification> -->`, honored by the lint and valid ONLY when the lint's cross-check (reusing the Section-D call-site extractor already shared with audit-recommended.sh) finds zero `AskUserQuestion` call sites — a prompt-free claim with a detected call site is a lint FAIL.
  2. The marker definition in non-interactive.md states the residual duties that still apply (mode-resolution echo, parent-marker propagation, end-of-skill summary) once, cited not re-inlined — AND (F10) states explicitly that a valid prompt-free marker COUNTS AS "rolled out": a prompt-free skill invoked with `--non-interactive` accepts the mode silently, no false "not yet supported" FR-08 warning; item 7's detection rule is amended to "block present OR valid prompt-free marker".
  3. Tetris's local edit removes lines 44–72 AND (F9) rewrites the Platform Adaptation bullet at lines 33–35 in the same commit — after removal there is no "block below", so the bullet must instead state the skill is prompt-free, carries the marker, and cite the residual section in non-interactive.md. Leaving the old sentence would be exactly the prose-only drift the [J] coherence gate exists to catch.
- **Rationale:** this unit is the clearest evidence the exemption taxonomy is missing a category; W14's safety property (no unclassified prompt in headless runs) is preserved because the exemption is machine-verified. F9/F10 close the two contract breaks the pass-1 sketch would have allowed.
- **Blast radius:** LARGE and deliberately gated — lint script (+ selftest if any); non-interactive.md in BOTH plugin copies (propagate via `scripts/sync-shared.sh --from=pmos-toolkit`); CLAUDE.md invariant prose; verify no skill-eval check hardcodes "block present" without the marker escape; audit any parent-orchestrator prose that greps children for the block sentinel to decide marker propagation (it must also honor the prompt-free marker); audit-recommended.sh untouched (extractor reused). Sequencing: NO tetris-local edit ships before the lint change lands — until then tetris correctly complies with the rule as written.
- **Severity:** Should-fix (×3 findings).

### C4 — Parameterize the plugin name in the canonical frozen block (F4 Nit; amended by F11 Should-fix)
- **Files:** `plugins/pmos-toolkit/skills/_shared/non-interactive.md` Section 0 item 8; `plugins/pmos-learnkit/skills/_shared/non-interactive.md` (byte-identical mirror — diff-verified); every SKILL.md carrying the block (~61, grep-counted, across all 5 plugins).
- **Before:** item 8 (mirrored at tetris SKILL.md:71): "Print to stderr at exit: `pmos-toolkit: /<skill> finished — outcome=<clean|deferred|error>, open_questions=<N>`" — skill name parameterized, plugin name a hardcoded literal, so a compliant /tetris run announces itself as a pmos-toolkit skill.
- **After (intent):** `<plugin>: /<skill> finished — …`. Execution order (F11): (1) edit the canonical toolkit copy; (2) propagate to the learnkit mirror via `scripts/sync-shared.sh --from=pmos-toolkit` — the ONLY sanctioned cross-plugin `_shared/` mutation path per the repo's Drift-hook contract; (3) mechanical re-paste of the one changed line into all block-carrying SKILL.md files, all in ONE commit. Completeness proof = lint-non-interactive-inline.sh PLUS an explicit `diff` of the two non-interactive.md copies (empty) — the lint alone hardcodes only the toolkit copy as CANONICAL_FILE (lint-non-interactive-inline.sh:36) and is blind to mirror drift by design. Pass-1's "the lint is the proof" claim was wrong on this point.
- **Rationale:** grep-verified NO tool or test parses the stderr literal (zero matches for `outcome=<clean` under any tools/), so this is not a §I machine-coupled rename — safe to fix at the canonical home. Skipping the sync step would either trip the FR-30 pre-commit drift hook or silently fork the substrate while the stated proof stayed green.
- **Blast radius:** both non-interactive.md copies + ~61 SKILL.md carriers across all 5 plugins — a cross-plugin substrate change, rides a release per the substrate-only smart-detect rule; the originating NFR-07 spec doc keeps the old literal as historical record (cite, don't rewrite); lint script needs no code change. Partially moot for gamekit if C3 later removes the block there, but C4 stands independently for the ~54 non-gamekit carriers.
- **Severity:** Nit (+ Should-fix process amendment).

### C5 — Delete the dead `p2` test variable (F5, Nit)
- **File:** `plugins/pmos-gamekit/skills/tetris/tests/run.mjs`, ghost-piece block, line 119.
- **Before:** `const p2 = { type: 'O', x: 4, y: 0, rot: 0 }; // O occupies cols 5,6 -> not over col4... use cols incl 4` — never used; superseded by `p3` on the next line; scratch-work comment shipped.
- **After (intent):** delete line 119; fold the correction into p3's comment (e.g. `// O cells cols 4,5 — overlaps the tall column at x=4`).
- **Rationale:** the count-locked 53-check harness should not contain rigged pieces that participate in nothing.
- **Blast radius:** run.mjs only; check count unchanged (deleted line has no `ok(...)`) — re-run `--selftest`, assert still 53/53.
- **Severity:** Nit.

### C6 — Drop the duplicate `hold` export alias (F6, Nit)
- **File:** `plugins/pmos-gamekit/skills/tetris/game/tetris.html`, engine export object (~line 433).
- **Before:** `lockAndNext: lockAndNext, holdActive: holdActive, hold: holdActive` — two public names for one function; alias untested and undocumented.
- **After (intent):** remove `hold: holdActive`, keep `holdActive`.
- **Rationale:** grep-verified zero callers of the alias — every other `hold` token in the file is the `state.hold`/`game.hold` state property or UI text; run.mjs exercises only `holdActive` — removal is behavior-neutral.
- **Blast radius:** tetris.html only; regression proof = `node tests/run.mjs --selftest` (53/53).
- **Severity:** Nit.

### C7 — Make the sanctioned learnings-write path explicit (F7, Nit)
- **File:** tetris `SKILL.md`, Phase 1 "Capture Learnings" (frontmatter `allowed-tools: Bash, Read` unchanged).
- **Before:** SKILL.md:108–109 instructs "append a one-line entry under `## /tetris` in `~/.pmos/learnings.md`" with no write tool granted — workable only via Bash, but the model may reach for a disallowed Write/Edit.
- **After (intent):** keep the minimal tool list; state the append pattern explicitly — Bash heredoc (`cat >> ~/.pmos/learnings.md <<'EOF' … EOF`), creating the file/heading if absent. Composes with C2: the example shows `## game-launcher` routing.
- **Rationale:** widening the tool surface of a launch-only skill for one optional one-line append is the wrong trade; the explicit-pattern remedy is right.
- **Blast radius:** tetris SKILL.md Phase 1 only; identical phrasing in all 7 gamekit skills (sibling follow-ups); no lints assert the phrasing.
- **Severity:** Nit.

### C8 — Fix the concurrent-rAF-loop leak on mid-game restart (F12, Should-fix; NEW in pass 2)
- **File:** `plugins/pmos-gamekit/skills/tetris/game/tetris.html` — `newGame()` (~594–604), `loop()` (~625–649, comment at 627–628), pause-resume arm (line 675), restart key handler (line 678).
- **Before:** pressing R during active play calls `newGame()` while the running loop's `requestAnimationFrame(loop)` (line 648) is still pending; `newGame()` unconditionally issues its own rAF (line 603), so two live loops persist — and every subsequent mid-game restart adds one more. No `cancelAnimationFrame` exists anywhere in the file (grep-verified). Gameplay math survives only accidentally (shared `lastTime` gives extra loops dt≈0), but render + rAF work grows without bound across restarts, and the comment at 627–628 ("…so there is never a second concurrent loop scheduled.") documents an invariant that holds for the pause path but is false for restart.
- **After (intent):** single-owner scheduling — store the pending handle (`rafId = requestAnimationFrame(loop)` at every arm site, including inside `loop()`) and call `cancelAnimationFrame(rafId)` at the top of `newGame()`. The pause path (line 675) keeps working unchanged since a paused loop returns without re-arming. Rewrite the 627–628 comment to state the actual invariant: every arm site cancels/owns the previous handle. (A monotonic loop-token guard is an acceptable alternative implementation.)
- **Rationale:** a genuine runtime defect — the only code bug found in two passes — plus a false documented invariant. Confirmed by code reading; author verified independently against lines 594–689.
- **Blast radius:** tetris.html UI layer only; the vm-extracted engine and tests/run.mjs untouched (the harness cannot observe rAF — this class of bug is structurally invisible to the 53-check selftest); regression proof is manual (start → press R several times mid-game → confirm one live loop via DevTools performance panel or a temporary counter) + re-run `--selftest` 53/53 to prove the engine block untouched.
- **Severity:** Should-fix.

## Rejections

None across both passes. All 13 findings were grounded (every ≥40-char quote verified verbatim against the named file:line — re-confirmed by grep at the 2026-07-13 re-verification) and accepted.

## Cross-cutting notes

- **Sibling fan-out:** C1, C2, C7 (and C3's bullet rewrite per F9) fix text that is byte-similar in all 7 gamekit skills; this proposal edits only tetris + the gamekit-local substrate, with siblings as explicit follow-ups outside this unit's scope. The serve.js banner fix (C1/F8) reaches all siblings with zero per-skill edits.
- **Sequencing:** C3 (lint change + marker semantics incl. the F10 rolled-out rule) must land before any gamekit skill drops its inlined block, and the block removal + Platform-Adaptation-bullet rewrite (F9) land in the same commit. C4 must land atomically across canonical file → `sync-shared.sh --from=pmos-toolkit` → all carriers, with the mirror-diff check added to the proof (F11).
- **Sign-off gates:** C3 and C4 modify repo-wide convention/substrate (CLAUDE.md W14 posture; canonical frozen block in two plugins) — flagged for repo-owner approval, not unilateral author action.

## Open questions

None — no unresolved disagreements. All pass-2 findings were accepted; the unit is CAPPED at pass 2 with the amendments folded into C1–C4 and the new C8.
