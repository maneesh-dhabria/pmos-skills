## Pass 1 — reviewer findings

### tetris-F1 [Should-fix] Background launch contradicts the "Ctrl-C in the launcher terminal" stop story
- Where: plugins/pmos-gamekit/skills/tetris/SKILL.md:101 (with :89)
- Quote: "speed rise every 10 lines. Stopping is `Ctrl-C` in the launcher terminal. Per the launch"
- Problem: Phase 0 step 3 instructs "**Launch** in the background so the server keeps running while you play" (SKILL.md:89) — under Claude Code that means a detached Bash background task, so there is no "launcher terminal" for the user to Ctrl-C. Step 4 then tells the user exactly that as the stop method. The shared contract (game-launcher.md#launch-contract step 4, "Ctrl-C stops the server") assumed a foreground process; tetris adds the background delta without adapting the stop story or giving any kill/PID guidance. Real friction: every play session leaves an orphaned `node serve.js` the user has no documented way to stop.

### tetris-F2 [Should-fix] Launcher-scoped learnings stored under a per-game heading — §K "one fact, one home" fragmentation
- Where: plugins/pmos-gamekit/skills/tetris/SKILL.md:76
- Quote: "Read `~/.pmos/learnings.md` if present and apply any entries under `## /tetris` to this"
- Problem: the only example learnings given ("a host-specific browser-open quirk", "a Node path quirk, a port-binding hiccup" — SKILL.md:77,109) are properties of the shared launcher (`_shared/game-launcher/serve.js`), not of Tetris. Keying them under `## /tetris` means a quirk discovered launching one game is invisible to every sibling game that uses the identical launch path, and the same host fact gets re-discovered and duplicated per game heading. The canonical home for launcher quirks should be a shared key (e.g. `## game-launcher`), with the per-game heading reserved for genuinely game-specific facts (of which this launch-only skill has essentially none).

### tetris-F3 [Should-fix] Rubric-level: the W14 lint forces ~28 lines of admittedly-dead contract into a prompt-free launch skill
- Where: plugins/pmos-gamekit/skills/tetris/SKILL.md:34
- Quote: "to degrade. The non-interactive contract block below is inlined only to satisfy the"
- Problem: the skill itself concedes the inlined non-interactive block is dead weight ("no checkpoint ever fires", :35), and the cited substrate agrees the question is open ("Whether a prompt-free skill still needs the canonical non-interactive inline block is decided by `lint-non-interactive-inline.sh`, not here." — _shared/game-launcher/game-launcher.md:57-58). Roughly a third of this SKILL.md's body (lines 44-72, ~3KB) is frozen protocol text loaded into context on every /tetris invocation, multiplied across all gamekit skills. The exemption vocabulary has `refused` and `delegated` markers but no `prompt-free` marker for skills that issue zero prompts by design — this unit is the clearest evidence that the lint's exemption taxonomy is missing a category. (Finding is against the convention/lint, surfaced via this unit; the skill correctly complies with the rule as written.)

### tetris-F4 [Nit] Frozen block hardcodes the wrong plugin name for gamekit skills
- Where: plugins/pmos-gamekit/skills/tetris/SKILL.md:71
- Quote: "Print to stderr at exit: `pmos-toolkit: /<skill> finished — outcome=<clean|deferred|error>, open_questions=<N>`"
- Problem: the canonical block parameterizes the skill name (`/<skill>`) but hardcodes `pmos-toolkit:` as a literal — so a compliant /tetris run would announce itself as a pmos-toolkit skill. Byte-identity means this can only be fixed in the canonical `_shared/non-interactive.md` (e.g. `<plugin>: /<skill> finished`), then re-pasted; noting here because a gamekit unit is where the defect becomes visible.

### tetris-F5 [Nit] Dead variable with a self-confessed wrong-setup comment left in the selftest
- Where: plugins/pmos-gamekit/skills/tetris/tests/run.mjs:119
- Quote: "const p2 = { type: 'O', x: 4, y: 0, rot: 0 }; // O occupies cols 5,6 -> not over col4... use cols incl 4"
- Problem: `p2` is never used — it was a first attempt at the bumpy-ghost check that the author corrected with `p3` on the next line but forgot to delete. Harmless, but a reader auditing the 53-check contract trips over a rigged piece that participates in nothing; the "..." comment reads as scratch work shipped.

### tetris-F6 [Nit] Duplicate engine export alias `hold` for `holdActive`
- Where: plugins/pmos-gamekit/skills/tetris/game/tetris.html:433
- Quote: "lockAndNext: lockAndNext, holdActive: holdActive, hold: holdActive"
- Problem: two public names for one function, with the alias untested (run.mjs exercises only `holdActive`) and undocumented. A one-function API surface should have one name; the alias invites drift (a future edit to one binding but not the other) for zero benefit.

### tetris-F7 [Nit] Capture Learnings requires a file append but allowed-tools grants no write tool
- Where: plugins/pmos-gamekit/skills/tetris/SKILL.md:109 (frontmatter :6)
- Quote: "wouldn't auto-open, a Node path quirk, a port-binding hiccup), append a one-line entry"
- Problem: frontmatter declares `allowed-tools: Bash, Read`, so the Phase 1 append to `~/.pmos/learnings.md` can only happen via a Bash heredoc/`>>` — workable but a smell: either the tool list should include Write/Edit for the one sanctioned write, or the phase should state the Bash-append pattern explicitly so the model doesn't reach for a disallowed tool.

**Pass 1 verdict:** 0 blockers / 3 should-fix / 4 nits — material findings

Reviewer notes: read all 3 unit files in full plus both cited substrates (game-launcher.md, serve.js) and serve.test.mjs. No dangling _shared cites — `../_shared/game-launcher/{game-launcher.md,serve.js}` both exist in this plugin, and `game-launcher.md#node-prereq` resolves. Verified live: tests/run.mjs --selftest PASS 53/53; serve.test.mjs 5/5; lint-non-interactive-inline PASS (block byte-identical to canonical); lint-flags-vs-hints PASS; lint-phase-refs PASS. Engine spot-audit: SRS JLSTZ/I kick tables match the standard guideline tables; scoring (100/300/500/800 × level+1, T-spin 400/800/1200/1600, B2B ×1.5 on difficult clears only, combo 50×n×level) is guideline-correct; 7-bag, lock-delay-with-15-reset-cap, and no-localStorage (D6) all confirmed. Craft is strong overall — the pure-engine-on-window + vm selftest pattern, the count-locked 53-check harness, and the delta-only substrate citation are exemplary; findings are at the edges (stop story, learnings routing, dead convention weight), not the core.

## Pass 1 — author response

### tetris-F1 — Accepted
- Fix: `plugins/pmos-gamekit/skills/tetris/SKILL.md` · Phase 0 steps 3–4 (+ canonical amendment in `plugins/pmos-gamekit/skills/_shared/game-launcher/game-launcher.md#launch-contract` step 4). Before: step 3 says launch in the background, step 4 says "Stopping is `Ctrl-C` in the launcher terminal." After: (a) game-launcher.md step 4 gains a two-path stop story — foreground launch (user-run, the No-Bash degradation path) stops with Ctrl-C; background launch (the Claude Code default) requires the skill to capture the server PID at spawn and report "ask me to stop the game and I'll kill the server (PID <n>)", with `lsof -i :<port>` as the orphan-recovery hint; (b) tetris SKILL.md step 3 adds "capture the background task/PID"; step 4's stop sentence is rewritten to cite the two-path story (delta-only, per the skill's existing cite-the-substrate posture) — Ctrl-C remains correct only for the self-launched path.
- Rationale: the reviewer is right that the documented stop method cannot work in the documented launch mode; every session orphans a `node serve.js` with no user-facing remedy. Fixing it in the substrate keeps §K (the launch contract lives in game-launcher.md); tetris then states only its delta.
- Blast radius: game-launcher.md (shared substrate — gamekit-local `_shared/`, no cross-plugin sync needed); all 7 gamekit SKILL.md files carry the identical step-3/step-4 text (grep-verified) — siblings need the same one-line edits as follow-ups; lint-phase-refs unaffected (no headings/anchors change); no tests assert the stop sentence.

### tetris-F2 — Accepted
- Fix: `plugins/pmos-gamekit/skills/tetris/SKILL.md` · "Load Learnings" + Phase 1 "Capture Learnings" (+ a short "Learnings routing" note added to `game-launcher.md`). Before: read/append only under `## /tetris`, with launcher-scoped examples (browser-open quirk, Node path quirk, port-binding hiccup). After: game-launcher.md declares `## game-launcher` as the §K canonical home for launcher/host quirks; tetris's Load phase reads BOTH `## game-launcher` and `## /tetris`; Capture routes launcher-scoped facts (all three current examples) to `## game-launcher` and reserves `## /tetris` for genuinely tetris-specific facts.
- Rationale: the only plausible learnings for a launch-only skill are properties of the shared launch path; per-game keying makes each quirk invisible to 6 sibling games and duplicates the same host fact up to 7 times — a textbook §K violation.
- Blast radius: game-launcher.md; tetris SKILL.md (2 sections); the same Load/Capture text exists in all 7 gamekit skills (grep-verified) — sibling follow-ups; no migration needed (`~/.pmos/learnings.md` is user-local and additive — old `## /tetris` entries still read); no lints/evals assert the heading key.

### tetris-F3 — Accepted (convention-level; needs repo-owner sign-off — touches the W14 posture in CLAUDE.md)
- Fix: `plugins/pmos-toolkit/tools/lint-non-interactive-inline.sh` + `plugins/pmos-toolkit/skills/_shared/non-interactive.md` + CLAUDE.md "Non-interactive contract (W14 posture)" bullet · exemption vocabulary. Before: two self-documenting markers (`refused`, `delegated`); a zero-prompt skill must inline the full ~28-line block it explicitly labels dead (`SKILL.md:34-35`). After: add a third marker, `<!-- non-interactive: prompt-free; <justification> -->`, honored by the lint, valid ONLY when the skill contains no `AskUserQuestion` call sites (the lint cross-checks via the Section-D extractor already shared with audit-recommended.sh — a prompt-free claim with a detected call site is a lint FAIL, closing the drift hole); then tetris (and each gamekit sibling, per-skill follow-up) replaces lines 44–72 with the marker. The mode-resolution/parent-marker/end-of-skill-summary duties that still apply to prompt-free skills get a 3-line residual stated in non-interactive.md and cited by the marker's definition, not re-inlined.
- Rationale: the unit is the clearest evidence the taxonomy is missing a category — ~3KB of frozen protocol per gamekit skill, ~7× in the plugin, self-described as "no checkpoint ever fires". The safety property W14 protects (no unclassified prompt in headless runs) is preserved by making the marker conditional on a machine-verified absence of call sites.
- Blast radius: LARGE and deliberately gated — lint-non-interactive-inline.sh (logic + its selftest if any), non-interactive.md (new Section text), CLAUDE.md invariant prose, audit-recommended.sh untouched (extractor reused, not modified), skill-eval rubric's W14-adjacent checks (verify none hardcode "block present" without the marker escape), then 7 gamekit SKILL.md edits. Until the convention change lands, tetris correctly complies as written — no tetris-local edit ships ahead of the lint change.

### tetris-F4 — Accepted
- Fix: `plugins/pmos-toolkit/skills/_shared/non-interactive.md` Section 0 item 8 · before: literal `pmos-toolkit: /<skill> finished — …` → after: `<plugin>: /<skill> finished — …` (plugin name parameterized like the skill name); then a mechanical re-paste of the one changed line into every SKILL.md carrying the block, in ONE commit, verified by re-running lint-non-interactive-inline.sh (byte-identity makes the lint the completeness proof).
- Rationale: a compliant /tetris run would announce itself as a pmos-toolkit skill. Grep-verified that NO tool/test parses the stderr literal (no matches for `outcome=<clean` under any tools/), so this is not a machine-coupled rename under §I — safe to fix at the canonical home.
- Blast radius: non-interactive.md + all 61 SKILL.md files carrying the block (grep-counted) across all 5 plugins — a cross-plugin substrate change, so it must ride a release per the "substrate-only smart-detect" rule; the originating NFR-07 spec doc states the old literal (historical record — cite, don't rewrite); lint-non-interactive-inline.sh needs no code change.

### tetris-F5 — Accepted
- Fix: `plugins/pmos-gamekit/skills/tetris/tests/run.mjs` · ghost-piece block, line 119 · delete the unused `const p2 = …` line and fold its correction into p3's comment (e.g. `// O cells cols 4,5 — overlaps the tall column at x=4`).
- Rationale: shipped scratch work; a reader auditing the count-locked harness trips over a rigged piece that participates in nothing.
- Blast radius: tests/run.mjs only; the 53-check count is unchanged (the deleted line contains no `ok(...)`) — re-run `node tests/run.mjs --selftest` and assert still 53/53.

### tetris-F6 — Accepted
- Fix: `plugins/pmos-gamekit/skills/tetris/game/tetris.html` · engine export object (~line 433) · before: `holdActive: holdActive, hold: holdActive` → after: `holdActive: holdActive` (drop the alias).
- Rationale: one function, one public name. Grep-verified the alias has zero callers — every other `hold` token in the file is the `state.hold`/`game.hold` state property or UI text, and run.mjs exercises only `holdActive` — so removal is behavior-neutral.
- Blast radius: tetris.html only; re-run tests/run.mjs --selftest (53/53) as the regression proof; no other skill or test references the export.

### tetris-F7 — Accepted
- Fix: `plugins/pmos-gamekit/skills/tetris/SKILL.md` · Phase 1 "Capture Learnings" · before: "append a one-line entry under `## /tetris` in `~/.pmos/learnings.md`" with allowed-tools `Bash, Read` → after: keep the tool list minimal and state the sanctioned write path explicitly: append via a Bash heredoc (`cat >> ~/.pmos/learnings.md <<'EOF' … EOF`, creating the file/heading if absent), so the model never reaches for a disallowed Write/Edit. (Composes with F2: the example shows the `## game-launcher` routing.)
- Rationale: of the two remedies the reviewer offers, the explicit-Bash-pattern one is right — widening allowed-tools to Write/Edit for a single optional one-line append expands the tool surface of a launch-only skill for no gain.
- Blast radius: tetris SKILL.md Phase 1 only; identical phrasing exists in all 7 gamekit skills (sibling follow-ups); no lints assert the phrasing.

## Pass 2 — reviewer findings

### tetris-F8 [Should-fix] C1 leaves the launcher itself asserting the single-path stop story
- Where: plugins/pmos-gamekit/skills/_shared/game-launcher/serve.js:88
- Quote: "process.stdout.write('Press Ctrl-C to stop the server.\n');"
- Problem: C1 rewrites the stop story in game-launcher.md and tetris SKILL.md to the two-path contract (Ctrl-C for foreground, PID-kill for background), but its file list omits serve.js — the launcher's own stdout still prints "Press Ctrl-C to stop the server." unconditionally. In the Claude Code background-launch path the model reads that stdout and will naturally relay it, re-introducing the exact contradiction F1 fixed, now with the docs and the runtime disagreeing. serve.test.mjs asserts only the URL regex (`/http:\/\/127\.0\.0\.1:(\d+)\//`) and SIGTERM shutdown, so amending or softening this line is test-safe; C1 should include serve.js (e.g. "Press Ctrl-C here to stop, or kill PID <pid>" — serve.js can print `process.pid`, which would also make C1's "capture the PID" step concrete instead of hand-wavy).

### tetris-F9 [Should-fix] C3's tetris edit leaves a dangling in-file reference to the removed block
- Where: plugins/pmos-gamekit/skills/tetris/SKILL.md:34
- Quote: "The non-interactive contract block below is inlined only to satisfy the
  repo-wide W14 lint; no checkpoint ever fires."
- Problem: C3 specifies the tetris-local change as "replaces lines 44–72 with the marker", but the Platform Adaptation bullet at lines 33–35 explicitly describes "the non-interactive contract block below". After C3 there is no block below — the sentence becomes false prose pointing at nothing, exactly the class of prose-only drift the repo's [J] coherence gate exists to catch (and has caught before). The proposal must extend C3's tetris edit to rewrite this bullet (e.g. to cite the `prompt-free` marker and the residual section in non-interactive.md).

### tetris-F10 [Should-fix] C3's prompt-free marker breaks FR-08 pre-rollout detection unless FR-08 is amended
- Where: plugins/pmos-gamekit/skills/tetris/SKILL.md:69
- Quote: "emit `WARNING: --non-interactive not yet supported by /<skill>; falling back to interactive.` to stderr; continue in interactive mode (FR-08)."
- Problem: repo-wide, "rolled out" is detected by the presence of `<!-- non-interactive-block:start -->` (FR-08). A prompt-free skill that drops the block per C3 and carries only the new marker would — per the contract as written in every other skill — be misclassified as not-yet-rolled-out whenever invoked with `--non-interactive`, emitting a false "not yet supported" warning and discarding the mode. C3's residual list ("mode resolution echo, parent-marker propagation, end-of-skill summary") covers items 1/4/8 but is silent on item 7; the marker definition in non-interactive.md must state that `<!-- non-interactive: prompt-free -->` counts as rolled out. As written, C3 is vague enough to be implemented with this contract break intact.

### tetris-F11 [Should-fix] C4's atomic-commit plan omits the pmos-learnkit `_shared/non-interactive.md` mirror — its lint proof cannot see the drift
- Where: plugins/pmos-toolkit/tools/lint-non-interactive-inline.sh:36
- Quote: "CANONICAL_FILE="${PLUGIN_ROOT}/skills/_shared/non-interactive.md""
- Problem: C4 edits "plugins/pmos-toolkit/skills/_shared/non-interactive.md Section 0 item 8, then a one-line re-paste into every SKILL.md carrying the block" and claims "re-running lint-non-interactive-inline.sh is the completeness proof". But a byte-identical copy of non-interactive.md also lives at plugins/pmos-learnkit/skills/_shared/non-interactive.md (diff-verified identical today), and the lint hardcodes ONLY the toolkit copy as canonical — it never reads the learnkit mirror, so the "completeness proof" is blind to exactly the drift C4 would create. Editing only the toolkit copy either trips the FR-30 pre-commit drift hook or silently forks the substrate; the sanctioned propagation path is `scripts/sync-shared.sh --from=pmos-toolkit`, which appears nowhere in C4's file list or sequencing notes.

### tetris-F12 [Should-fix] Mid-game restart schedules a second concurrent rAF loop, contradicting the code's own invariant comment
- Where: plugins/pmos-gamekit/skills/tetris/game/tetris.html:629
- Quote: "// (lastTime is reset there), so there is never a second concurrent loop scheduled."
- Problem: the claimed invariant holds for the pause path but not for restart. Pressing R during active play (keydown handler, line 678) calls `newGame()` while the running loop's `requestAnimationFrame(loop)` (line 648) is still pending; `newGame()` unconditionally issues its own `requestAnimationFrame(loop)` (line 603), so two live loops persist — and every subsequent mid-game restart adds one more (there is no `cancelAnimationFrame` anywhere in the file, grep-verified). Gameplay math survives because the extra loops see dt≈0 via the shared `lastTime`, but render + rAF work grows without bound across restarts in a session, and the comment documents a false invariant. Fix is small: a monotonic loop-token guard (`var loopId; function loop(t){ if (this !== token) return; … }` pattern) or cancel the pending frame in `newGame()`. Not covered by any proposal item; tests/run.mjs cannot see it (UI layer, outside the vm-extracted engine).

### tetris-F13 [Nit] C2 defines no precedence between the two learnings keys it makes tetris read
- Where: plugins/pmos-gamekit/skills/tetris/SKILL.md:76
- Quote: "apply any entries under `## /tetris` to this launch (e.g. a host-specific browser-open quirk). The skill body wins on conflict"
- Problem: the existing conflict rule covers body-vs-learnings only. Post-C2 the Load phase reads BOTH `## game-launcher` and `## /tetris`; when a launcher-wide entry and a tetris-specific entry disagree (e.g. "xdg-open works" vs "on this host use firefox for tetris"), C2 gives no tie-break. The natural rule — more-specific (`## /tetris`) wins over `## game-launcher`, body wins over both — should be stated once in game-launcher.md's new "Learnings routing" note so all 7 siblings inherit it, else the fan-out ships seven skills with an undefined merge order.

**Pass 2 verdict:** 0 blockers / 5 should-fix / 1 nit — material findings

## Pass 2 — author response

### tetris-F8 — Accepted
- Fix: `plugins/pmos-gamekit/skills/_shared/game-launcher/serve.js` · startup banner (line 88), folded into C1. Before: unconditional `Press Ctrl-C to stop the server.` → After: print `Server PID <pid> — Ctrl-C here to stop, or kill the PID.` using `process.pid`. This makes C1's "capture the PID" step concrete: the skill reads the PID straight from the launch stdout it already parses for the URL, no `lsof` gymnastics needed for the happy path (`lsof -i :<port>` stays as the orphan-recovery hint only).
- Rationale: reviewer is right — fixing docs while the runtime keeps asserting the single-path story re-creates F1 at the stdout the model actually reads and relays. The launcher's own banner is the highest-authority stop message; it must carry the two-path truth.
- Blast radius: serve.js (gamekit-local `_shared/`, shared by all 7 games — banner change is additive and benefits every sibling with zero per-skill edits); serve.test.mjs is safe (asserts only the URL regex + SIGTERM shutdown — verified in pass 1) but re-run its 5 checks as the regression proof; game-launcher.md's launch-contract wording (C1) should cite the banner as the PID source.

### tetris-F9 — Accepted
- Fix: `plugins/pmos-gamekit/skills/tetris/SKILL.md` · Platform Adaptation bullet (lines 33–35), folded into C3's tetris-local edit. Before: "The non-interactive contract block below is inlined only to satisfy the repo-wide W14 lint; no checkpoint ever fires." → After (when C3's block removal lands, same edit): rewrite the bullet to state that the skill is prompt-free, carries the `<!-- non-interactive: prompt-free; … -->` marker, and that the small residual duties (mode echo, parent marker, end-of-skill summary) are defined in `_shared/non-interactive.md`'s prompt-free section.
- Rationale: exactly the prose-only drift class the repo's [J] coherence gate has caught before ("the block below" with no block below). C3 as written was implementable with this break intact; the bullet rewrite must be part of the same commit as the block removal.
- Blast radius: tetris SKILL.md only (per unit); the same bullet text exists in gamekit siblings — add to the sibling follow-up checklist under C3.

### tetris-F10 — Accepted
- Fix: `plugins/pmos-toolkit/skills/_shared/non-interactive.md` · the C3 marker definition + FR-08/item-7 pre-rollout wording. Before: "rolled out" is detected solely by the presence of `<!-- non-interactive-block:start -->` (item 7, non-interactive.md:44) → After: the marker definition states explicitly that a valid `<!-- non-interactive: prompt-free -->` marker COUNTS AS rolled out — a prompt-free skill invoked with `--non-interactive` accepts the mode silently (nothing to degrade; no false "not yet supported" warning), and item 7's detection rule is amended to "block present OR a valid prompt-free marker".
- Rationale: without this, C3 ships a contract break — every marker-carrying skill would misclassify itself as pre-rollout and discard the mode. C3's residual list covered items 1/4/8 but was silent on item 7; this closes it.
- Blast radius: non-interactive.md (both plugin copies via sync-shared.sh — see F11); any parent orchestrator that greps children for the block sentinel to decide marker propagation must also honor the prompt-free marker (audit `/feature-sdlc`/`/comments` dispatch prose during C3 implementation); lint-non-interactive-inline.sh already changing under C3 — no extra script.

### tetris-F11 — Accepted
- Fix: C4 (and C3's non-interactive.md edits) sequencing · Before: C4 claimed "edit toolkit non-interactive.md + re-paste into all carriers in one commit; lint re-run is the completeness proof" → After: the canonical edit lands in `plugins/pmos-toolkit/skills/_shared/non-interactive.md`, is propagated to the learnkit mirror via `scripts/sync-shared.sh --from=pmos-toolkit` (the only sanctioned cross-plugin `_shared/` mutation path per the repo's Drift-hook contract), and THEN the re-paste sweep runs; completeness proof = lint-non-interactive-inline.sh PLUS `diff plugins/pmos-toolkit/skills/_shared/non-interactive.md plugins/pmos-learnkit/skills/_shared/non-interactive.md` (empty) — the lint alone is blind to the mirror by design (CANONICAL_FILE hardcodes the toolkit copy).
- Rationale: verified live — the learnkit mirror exists and is byte-identical today; C4 as written would either trip the FR-30 pre-commit drift hook or (with --no-verify) silently fork the substrate while its stated proof stays green.
- Blast radius: adds scripts/sync-shared.sh to C4's (and C3's) execution path + the explicit mirror-diff check; no new files touched beyond the learnkit mirror already implied by "every carrier"; release routing unchanged (still the substrate-only smart-detect rule).

### tetris-F12 — Accepted
- Fix: `plugins/pmos-gamekit/skills/tetris/game/tetris.html` · rAF scheduling (newGame at ~594–604, loop at ~625–649, comment at 627–628). Before: mid-game R (keydown, line 678) calls `newGame()` while the running loop's `requestAnimationFrame(loop)` (line 648) is pending; `newGame()` unconditionally issues its own rAF (line 603) → one extra live loop per mid-game restart, unbounded across a session; the comment at 628 claims "never a second concurrent loop scheduled", which is false for this path. After: single-owner scheduling — store the pending handle (`rafId = requestAnimationFrame(loop)` at both arm sites and inside loop) and `cancelAnimationFrame(rafId)` at the top of `newGame()` (the pause-resume arm at line 675 keeps working unchanged since the paused loop returned without re-arming); update the 627–628 comment to state the actual invariant (every arm site cancels/owns the previous handle).
- Rationale: confirmed by reading the code — no `cancelAnimationFrame` exists in the file; gameplay math survives only accidentally (shared `lastTime` gives the extra loops dt≈0) while render + rAF work grows per restart, and the code documents a false invariant. A genuine engine-adjacent defect, the only one found in two passes.
- Blast radius: tetris.html UI layer only; the vm-extracted engine and tests/run.mjs are untouched (the harness cannot see rAF — noted by the reviewer); regression proof is manual (start game → press R several times mid-game → confirm one loop via a temporary counter or DevTools performance panel) + re-run --selftest 53/53 to prove the engine block untouched.

### tetris-F13 — Accepted
- Fix: `plugins/pmos-gamekit/skills/_shared/game-launcher/game-launcher.md` · the C2 "Learnings routing" note gains a precedence rule, stated once for all siblings: most-specific wins — skill body > `## /<game>` > `## game-launcher`. Tetris's Load-phase sentence cites the rule instead of restating it (its existing "The skill body wins on conflict" clause is subsumed and updated to cite the substrate).
- Rationale: post-C2 the Load phase merges two keys with no tie-break; the natural specific-over-general order must live in the §K home so the 7-way fan-out doesn't ship an undefined merge order.
- Blast radius: game-launcher.md (one sentence in the already-planned C2 note); tetris SKILL.md Load-phase clause; sibling follow-ups inherit for free by citing the substrate; no lints/evals assert the rule.

**Pass 2 author verdict:** 6/6 accepted (all quotes grounded and independently verified). Unit CAPPED at pass 2; cumulative proposal updated.

## Pass 1 — author response (re-verification, 2026-07-13)

All seven pass-1 findings were re-spot-checked: every >=40-char quote exists verbatim at the cited file:line (SKILL.md:101/:76/:34/:71/:108, tests/run.mjs:119, game/tetris.html:433 — grep-verified this run). No finding is invalid/ungrounded. Dispositions below confirm and stand by the earlier author responses; the pass-2 amendments (F8–F13) remain folded into the cumulative proposal.

### tetris-F1 — Accepted
- Fix: game-launcher.md#launch-contract step 4 two-path stop story (foreground → Ctrl-C; background → PID capture from launch stdout + "ask me to stop" + `lsof -i :<port>` orphan hint); tetris SKILL.md step 3 captures the PID, step 4 cites the two-path contract delta-only. Per F8 amendment, serve.js:88 banner becomes `Server PID <pid> — Ctrl-C here to stop, or kill the PID.`
- Rationale: documented stop method cannot work in the documented (background) launch mode — every session orphans a `node serve.js`. §K home stays in the substrate.
- Blast radius: game-launcher.md + serve.js (gamekit-local `_shared/`, all 7 games); tetris SKILL.md; sibling SKILL.md follow-ups; serve.test.mjs safe (asserts URL regex + SIGTERM only) but re-run as regression proof.

### tetris-F2 — Accepted
- Fix: game-launcher.md gains a "Learnings routing" note declaring `## game-launcher` the §K home for launcher/host quirks with precedence (per F13: body > `## /<game>` > `## game-launcher`); tetris Load reads both keys, Capture routes launcher-scoped facts to the shared key.
- Rationale: all current example learnings are launcher properties; per-game keying hides each quirk from 6 siblings and duplicates it up to 7×.
- Blast radius: game-launcher.md; tetris SKILL.md (2 sections); sibling follow-ups; no migration (learnings.md additive); no lints assert the key.

### tetris-F3 — Accepted (convention-level; repo-owner sign-off gate)
- Fix: new `<!-- non-interactive: prompt-free; <justification> -->` marker in lint-non-interactive-inline.sh + non-interactive.md + CLAUDE.md W14 bullet, valid only when the Section-D extractor finds zero AskUserQuestion call sites; then tetris drops lines 44–72 for the marker. Per F9/F10 amendments: the Platform-Adaptation bullet (SKILL.md:33–35) is rewritten in the same commit, and the marker explicitly COUNTS AS rolled out for FR-08/item-7 detection.
- Rationale: ~3KB of self-described dead protocol per gamekit skill, ~7×; W14's safety property preserved via machine-verified absence of prompts.
- Blast radius: LARGE and gated — lint script, non-interactive.md (both plugin copies via sync-shared.sh), CLAUDE.md, skill-eval W14-adjacent checks audit, 7 gamekit SKILL.md edits. No tetris-local edit ships before the lint change.

### tetris-F4 — Accepted
- Fix: canonical non-interactive.md Section 0 item 8 `pmos-toolkit:` → `<plugin>:`; per F11 amendment: toolkit copy → `scripts/sync-shared.sh --from=pmos-toolkit` to the learnkit mirror → one-commit re-paste into all ~61 carriers; proof = lint PLUS explicit mirror diff (lint's CANONICAL_FILE hardcodes the toolkit copy).
- Rationale: compliant /tetris would announce itself as a pmos-toolkit skill; grep-verified no tool parses the stderr literal → not a §I machine-coupled rename.
- Blast radius: both non-interactive.md copies + ~61 SKILL.md carriers across 5 plugins; cross-plugin substrate release routing; NFR-07 spec doc kept as historical record.

### tetris-F5 — Accepted
- Fix: tests/run.mjs:119 — delete the unused `const p2 = …` scratch line; fold the correction into p3's comment.
- Rationale: shipped scratch work in a count-locked harness.
- Blast radius: run.mjs only; 53-check count unchanged (no `ok(...)` on the line); re-run --selftest.

### tetris-F6 — Accepted
- Fix: tetris.html:433 — drop the `hold: holdActive` alias, keep `holdActive`.
- Rationale: one function, one name; grep-verified zero callers of the alias; behavior-neutral.
- Blast radius: tetris.html only; --selftest 53/53 as regression proof.

### tetris-F7 — Accepted
- Fix: tetris SKILL.md Phase 1 — keep `allowed-tools: Bash, Read`; state the sanctioned append explicitly (Bash heredoc `cat >> ~/.pmos/learnings.md`, create file/heading if absent); composes with F2's `## game-launcher` routing.
- Rationale: explicit-pattern remedy beats widening the tool surface of a launch-only skill for one optional append.
- Blast radius: tetris SKILL.md Phase 1; identical phrasing in 7 gamekit skills (follow-ups); no lints assert phrasing.

**Re-verification verdict:** 7/7 pass-1 findings accepted (0 rejected, 0 invalid); no open findings remain from either pass. Cumulative proposal re-confirmed as-is.
