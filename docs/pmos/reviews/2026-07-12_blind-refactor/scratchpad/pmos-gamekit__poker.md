## Pass 1 — reviewer findings

### poker-F1 [Should-fix] Every hand silently tops all stacks back to 1000; SKILL.md misdescribes it and the game has no stakes
- Where: plugins/pmos-gamekit/skills/poker/game/poker.html:1209
- Quote: "// Cash game: top every seat back up to the starting stack each hand (D4)."
- Problem: `startHand` resets every seat to START (1000) on every hand, so winnings evaporate the moment you press Next hand — you can never build a stack or go broke. SKILL.md:109-110 says "**N** deals the next hand; **New game** re-randomizes the opponents and resets stacks", which implies Next hand *preserves* stacks (why else would "resets stacks" distinguish New game?). A user watching their 1,340 chips snap back to 1,000 will file it as a bug. Product-sense: a "cash game" with per-hand top-up has zero session stakes and no score of any kind (the header's "Your stack" is always ~1000 at deal; "Hand N" is the only accumulator). Either the SKILL.md and start overlay framing must own the per-hand-topup trainer model explicitly in the launch report, or — better product — track a session P/L line, which the engine's `result().net` already computes for free.

### poker-F2 [Should-fix] Per-street chip strip drops the street-closing action — state is recorded as a side effect of rendering, after the engine already zeroed it
- Where: plugins/pmos-gamekit/skills/poker/game/poker.html:1005
- Quote: "// Per-street chip strip: record what each seat committed on each street (P/F/T/R)."
- Problem: `streetCommits` is populated inside `renderSeat` from `hand.committedStreetOf(seat)`. But when a call *closes* a street, `Hand.apply` → `advanceStreet` resets every `committedStreet` to 0 *before* `applyAndAdvance` calls `renderAll`. Concrete failure: flop, bot bets 50, other players fold, you call 50 → your call closes the street, `committedStreet` is zeroed, and your chip strip never shows an F entry even though you put 50 in on the flop (and if you had a partially-rendered earlier amount, the strip shows the stale smaller number, not your final street total). The feature is wrong on exactly the most common line (last caller). Root cause is a craft defect — mutating game-history state inside a render function instead of recording commits at apply time in the engine or in `applyAndAdvance`. The vm test suite can't see this: it tests the engine, and this bug lives in the untested UI layer.

### poker-F3 [Should-fix] Incomplete all-in raise incorrectly reopens full raising rights to players who already acted
- Where: plugins/pmos-gamekit/skills/poker/game/poker.html:562
- Quote: "return !s.folded && !s.allIn && (!s.hasActed || s.committedStreet < this.currentBet);"
- Problem: The engine half-implements the NLHE reopening rule. `apply` correctly resets `hasActed` only when `raiseSize >= lastRaiseSize` (a full raise), but `needsAction` still returns true for any player whose `committedStreet < currentBet`, and `legalActions` then offers `raise` whenever `stack > toCall`. So: A bets 50, B short-all-ins to 70 (an under-raise), A gets to act again — correct — but is offered a full re-raise, which standard No-Limit rules forbid (A may only call or fold facing an incomplete raise, having already acted). With shove-happy heuristic bots and short stacks (the exact scenario test §13 constructs), this edge fires in real play. The partial implementation shows the rule was known; the legal-action side just never consumes the reopened/not-reopened distinction. No test covers it — tests 8–9 check min-raise sizing, not reopening rights.

### poker-F4 [Should-fix] 28 lines of dead non-interactive contract shipped in a prompt-free launch skill — the exemption vocabulary has no "prompt-free" case
- Where: plugins/pmos-gamekit/skills/poker/SKILL.md:40
- Quote: "The non-interactive contract block below is inlined only to satisfy the"
- Problem: The skill itself apologizes for the block ("…repo-wide W14 lint; no checkpoint ever fires"). A launch-only game skill issues zero prompts, produces no artifact, and defers nothing — yet every `/poker` invocation loads ~1.7KB of mode-resolution/OQ-buffer/flush protocol that can never execute, and the same tax is paid by every sibling game skill. The W14 contract already has self-documenting exemption markers (`<!-- non-interactive: refused … -->`, `<!-- non-interactive: delegated … -->`); what's missing is a third marker for provably prompt-free skills (game-launcher.md even notes the launch contract makes them prompt-free by construction: "no `AskUserQuestion`, no generation"). This is a lint/rubric gap the per-skill rubric cannot see — it manifests here as pure token-economy waste plus two paragraphs of meta-explanation about a contract that doesn't apply.

### poker-F5 [Nit] Quick-bet ½/¾/Pot buttons don't compute pot-fraction sizes — and the dropped `call` variable shows it
- Where: plugins/pmos-gamekit/skills/poker/game/poker.html:1523
- Quote: "else { var frac = Number(q); sliderTo(curLegal.minRaiseTo + Math.round(pot * frac)); }"
- Problem: Standard pot-fraction sizing is `toCall + frac × (pot + toCall)`; this computes `minRaiseTo + frac × pot`. Unopened, "½ Pot" into a 100 pot gives 60 (min-bet 10 + 50) instead of 50; facing a 50 bet, "½ Pot" gives 175 instead of 150. The preceding line even assigns `call = curLegal.toCall` and never uses it — the intended input was dropped mid-implementation. Mislabeled bet buttons in a game whose References tab teaches exact pot-odds math (½ pot → ~25% break-even table) is a self-inconsistency: the teaching panel and the buttons disagree about what "½ Pot" means.

### poker-F6 [Nit] Heads-up hero position mislabeled: non-button hero is labeled SB but is the BB, so the chart default opens the wrong view
- Where: plugins/pmos-gamekit/skills/poker/game/poker.html:1323
- Quote: "var byDist = ['BTN', 'SB', 'BB', 'UTG', 'MP', 'CO'];"
- Problem: The distance-from-button mapping assumes the blinds sit left of the button, but heads-up the button IS the small blind (the engine models this correctly at postBlinds: `sbPos = n === 2 ? this.buttonIndex : …`). With 1 opponent and hero off the button, hero is the BB yet `heroPositionLabel()` returns 'SB', so `applyChartDefault` shows the SB raise-first-in grid instead of the BB "vs a raise" defense view — the one BB-specific pane the chart ships.

### poker-F7 [Nit] The Show BB unit toggle doesn't reach the log, last-action chips, or the winner banner
- Where: plugins/pmos-gamekit/skills/poker/game/poker.html:1137
- Quote: "return nm + win + w.amount.toLocaleString() + ' with ' + label;"
- Problem: `fmt()` honors the chips/BB toggle for stacks, pot, bet chips, and buttons, but `describeAction` (`' bets ' + action.amount`), `setLastAct` labels, and the showdown banner all emit raw chip integers. In BB mode the table says "Pot 15 BB" while the log says "Ava raises to 40" — mixed units in the same viewport for the feature SKILL.md explicitly advertises ("a **Show BB / Show chips** button toggles the display units").

### poker-F8 [Nit] Dead deterministic test hook shipped in the production artifact with no consumer anywhere
- Where: plugins/pmos-gamekit/skills/poker/game/poker.html:1540
- Quote: "// ---------- deterministic test hook (AC9 side-pot e2e) ----------"
- Problem: `window.__POKER_TEST__` (28 lines, including `dealRigged` for rigging holes/board/stacks) has zero consumers — `tests/run.mjs` drives the engine via vm and never touches it, and a repo-wide grep finds no other reference. It's spec residue ("AC9") leaked into the shipped single-file artifact, contradicting the single-reviewable-artifact spirit of the D7 bundling convention. Either ship the e2e that uses it or delete the hook.

**Pass 1 verdict:** 0 blockers / 4 should-fix / 4 nits — material findings

## Pass 1 — author response

### poker-F1 — Accepted
- Fix: `game/poker.html` (startHand / header HUD) + `SKILL.md` Phase 0 report text. Two-part fix. (a) Keep the D4 per-hand top-up (it is a deliberate trainer model: every hand starts at 100 BB so the preflop chart and pot-odds panel stay calibrated) but add a **session P/L line** to the HUD: a `sessionNet` accumulator, updated at hand end from `result().winners`/`committedTotal` deltas (the engine already yields per-seat net for free), rendered next to "Hand N" as "Session +340 / −120" and honoring the BB toggle. Reset only by New game. (b) Rewrite the SKILL.md launch-report sentence from "**New game** re-randomizes the opponents and resets stacks" to own the model explicitly: every hand deals fresh 1,000-chip (100 BB) stacks; the **Session** line tracks cumulative winnings; **New game** re-randomizes opponents and zeroes the session line. Also state the top-up on the in-page start overlay in one line.
- Rationale: the current copy implies stack persistence, so the top-up reads as a bug; a session accumulator restores stakes without abandoning the fixed-depth trainer design the charts assume.
- Blast radius: poker.html (HUD + hand-end path + start overlay), SKILL.md report text. No engine change; vm tests unaffected. Sibling game skills untouched.

### poker-F2 — Accepted
- Fix: `game/poker.html` engine (`Hand`) + renderSeat. Move street-commit history into the engine where the state transition happens: `Hand` gains a `commitHistory` map (`seat → {preflop,flop,turn,river}`) updated inside `post()` and the `call`/`bet`/`raise` branches of `apply()` (the three places chips enter `committedStreet`), snapshot-finalized before `advanceStreet` zeroes `committedStreet`. Expose `Hand.prototype.streetCommitsOf(seat)`. renderSeat then becomes a pure reader — delete the `streetCommits` module variable and the record-inside-render block at lines 1005–1011; the strip renders from `hand.streetCommitsOf(s.seat)`.
- Rationale: the street-closing action (the most common line — last caller) is currently lost because history is recorded as a render side effect after the engine has already zeroed the source. Recording at apply time makes the strip correct by construction and testable in vm.
- Blast radius: poker.html engine + UI; `tests/run.mjs` gains one vm test ("last call closing a street is present in that street's commit history"); no SKILL.md change.

### poker-F3 — Accepted
- Fix: `game/poker.html` engine (`apply`, `legalActions`). Complete the reopening rule: give each seat state a `raiseRightsOpen` flag (true at street start and whenever a full raise lands — set exactly where `hasActed` is currently reset in the `raiseSize >= lastRaiseSize` branch; on an incomplete all-in raise, seats that already acted keep `raiseRightsOpen = false`). In `legalActions`, `canRaise` becomes `s.stack > toCall && (this.currentBet === 0 || s.raiseRightsOpen || !s.hasActed)` — i.e., facing an incomplete raise after having acted, only fold/call are offered. `needsAction` is unchanged (the player still owes a decision on the extra chips — that part is correct).
- Rationale: the reset-`hasActed`-only-on-full-raise logic proves the rule was known; the legal-action side just never consumed it. With shove-happy bots and short stacks this fires in real play, and the References panel teaches rules the engine then breaks.
- Blast radius: poker.html engine; bots (they read `legalActions().actions`, so they self-correct — no bot change); `tests/run.mjs` gains a reopening test (A bets, B short-all-ins under the min, A's legal actions exclude raise; and the full-raise counter-case). Tests 8–9 (min-raise sizing) unaffected.

### poker-F4 — Accepted (cross-unit escalation — not fixable inside this unit alone)
- Fix: repo-substrate change, then a mechanical poker edit. (a) In pmos-toolkit's `skills/_shared/non-interactive.md` + `tools/lint-non-interactive-inline.sh` (+ the §-mirrors in `skill-patterns.md` / `skill-eval.md`), add a third self-documenting exemption marker — `<!-- non-interactive: prompt-free <one-line proof> -->` — accepted by the lint in place of the inline block, valid only for skills that issue zero prompts, produce no artifact, and defer nothing (the game-launcher launch contract is exactly this by construction). (b) In `poker/SKILL.md`, replace the ~28-line frozen block and the two paragraphs of apology-prose with the one-line marker. (c) Same swap in the six sibling gamekit skills (each carries the identical dead block — confirmed via grep, 7/7).
- Rationale: ~1.7KB of mode-resolution/OQ-buffer protocol loads on every `/poker` invocation and can never execute; the exemption vocabulary already exists (`refused`, `delegated`) — this is a missing third case, and the skill itself apologizes for the gap in its own body.
- Blast radius: LARGE and outside this unit — pmos-toolkit `_shared/non-interactive.md`, `tools/lint-non-interactive-inline.sh`, `skill-patterns.md` §W14 prose, `skill-eval.md` mirror, plus all 7 pmos-gamekit SKILL.md files (and any other provably prompt-free skill that opts in). Needs its own story/epic with the lint change landing first; the poker edit is a one-line follow-up. Flagged for the run coordinator rather than folded into a poker-only diff.

### poker-F5 — Accepted
- Fix: `game/poker.html` quickbets handler (~line 1523). Replace `sliderTo(curLegal.minRaiseTo + Math.round(pot * frac))` with the standard pot-fraction raise-to: `sliderTo(call + Math.round((pot + call) * frac) + hand.committedStreetOf(heroSeat))` — i.e., raise-to = own street commit + toCall + frac × (pot after calling) — clamped into `[curLegal.minRaiseTo, curLegal.maxRaiseTo]` (sliderTo already clamps; verify). This consumes the currently-dead `call` variable the dropped implementation left behind.
- Rationale: the buttons disagree with the References tab's own pot-odds table ("½ pot → ~25% break-even") — a self-inconsistency in a teaching artifact; unopened "½ Pot" into 100 currently produces 60, facing a 50-bet it produces 175 instead of 150.
- Blast radius: poker.html UI only; no engine/test change (UI layer is untested — noted, but a vm test can't reach a DOM handler; correctness is arithmetic-by-inspection plus dogfood).

### poker-F6 — Accepted
- Fix: `game/poker.html` `heroPositionLabel()` (~line 1323). Special-case heads-up to match the engine's own blind model (`sbPos = n === 2 ? buttonIndex : …`): when `n === 2`, `byDist` is `['BTN','BB']` (button = SB = BTN view; non-button = BB). n ≥ 3 keeps the existing table.
- Rationale: heads-up off the button, hero is the BB but the chart defaults to the SB raise-first-in grid — hiding the one BB-specific "vs a raise" defense pane the chart ships; the engine and the label currently disagree about the same seat.
- Blast radius: poker.html UI only (chart default + position dropdown preselect). No engine/test change.

### poker-F7 — Accepted
- Fix: `game/poker.html` — route every user-facing chip amount through `fmt()`: `describeAction` (bet/call/raise amounts, ~line 1073–1081), the `setLastAct` chip labels, and the showdown banner / pots breakdown (`w.amount.toLocaleString()` → `fmt(w.amount)`, and the multi-pot "(2 pots: …)" line). Amounts are formatted at write time with the unit active at that moment; previously-written log lines are not retro-converted (documented one-liner comment at the toggle).
- Rationale: SKILL.md advertises the toggle ("a **Show BB / Show chips** button toggles the display units") but in BB mode the same viewport mixes "Pot 15 BB" with "Ava raises to 40" — the feature is half-wired.
- Blast radius: poker.html UI only. SKILL.md unchanged (its claim becomes true).

### poker-F8 — Accepted (modified: delete, with the history acknowledged)
- Fix: `game/poker.html` — delete the `window.__POKER_TEST__` block (lines ~1540–1567, 28 lines) including `dealRigged`. The reviewer's "ship the e2e or delete" fork resolves to delete: the AC9 side-pot scenario is now covered deterministically at engine level by `tests/run.mjs` §13 ("Engine-driven side pot via unequal stacks — the AC9 deterministic scenario"), and the only historical consumer was the one-time story dogfood (`docs/pmos/features/2026-06-13_pmos-gamekit-poker/stories/260613-kw5/dogfood/EVIDENCE.md` drove it manually from the console) — not a living test.
- Rationale: zero automated consumers; spec residue in a shipped single-file artifact contradicts the D7 single-reviewable-artifact convention and is dead weight on every load.
- Blast radius: poker.html only; `tests/run.mjs` untouched (never referenced the hook); the dogfood EVIDENCE.md is a historical record and stays as-is. Future manual side-pot verification path = `node tests/run.mjs` §13.

## Pass 2 — reviewer findings
### poker-F9 [Should-fix] F2/F3's new vm tests break the pinned selftest count (proposal never bumps EXPECTED_CHECKS)
- Where: tests/run.mjs:273 (pin declared at tests/run.mjs:24)
- Quote: "if (selftest && passed !== EXPECTED_CHECKS) {"
- Problem: The proposal has F2 adding 1 vm check and F3 adding 2 ("tests/run.mjs gains a reopening test … + the full-raise counter-case"), but nowhere does it say to update `const EXPECTED_CHECKS = 47;` (currently green: 47/47). Implemented exactly as described, `node tests/run.mjs --selftest` exits 1 with "expected 47 checks, got 50" — the deterministic gate this repo's release train leans on (§H: selftest count pins are the hard gate) goes red on a correct change. The fix must state the new pin (47→50) explicitly, or the implementer will either ship a broken selftest or silently drop the new tests to stay at 47.

### poker-F10 [Nit] SKILL.md cites D7 for the no-save-state rule; the substrate's decision id is D6
- Where: SKILL.md:110 (also SKILL.md:118 "there is none to keep (D7)")
- Quote: "Per D7 the game keeps **no save state** — closing the tab discards"
- Problem: In the cited canonical home (`_shared/game-launcher/game-launcher.md`) the persistence rule is "## No persistence (D6) {#no-persistence}" while D7 is the single-file bundling convention ("Single-file bundling convention (D7) {#bundling}"). Both no-persistence cites in SKILL.md use the wrong decision id — a §K citation error the proposal doesn't touch (its own F8 rationale uses D7 correctly for bundling, which makes the SKILL.md misuse easier to miss). Anyone tracing D7 from Phase 0/Phase 1 lands on the bundling section, not the rule being invoked.

### poker-F11 [Nit] Quick-bet button enumeration drifts from the shipped UI (¾ Pot omitted twice)
- Where: SKILL.md:105 (also SKILL.md:16 "a raise-size slider plus ½-pot / pot / all-in quick buttons")
- Quote: "use the **½ Pot / Pot / Min / All-in** quick buttons or drag the"
- Problem: The game ships five quick-bets — poker.html:295 `<button class="btn" data-q="0.75">¾ Pot</button>` sits between ½ Pot and Pot — but the Phase 0 report text lists four and the intro paragraph lists three (omitting both ¾-pot and Min). Classic enumerated-set count drift; F1's copy rewrite touches the adjacent "New game" sentence but not this list, and F5 makes the ¾ button *more* prominent (it starts computing correct sizes), so the doc/UI mismatch survives the whole proposal.

### poker-F12 [Nit] F8's deletion strands dead rigging plumbing in startHand
- Where: game/poker.html:1212 (opts threaded at 1210–1221)
- Quote: "return { seat: s.seat, stack: opts.seatStacks ? opts.seatStacks[s.seat] : s.stack };"
- Problem: `dealRigged` is the only caller that ever passes `opts.seatStacks` / `opts.holeOverride` / `opts.boardOverride` into `startHand` (all other call sites are `startHand({})`). F8 deletes the `__POKER_TEST__` block but says nothing about `startHand`'s rigging parameters, so the "delete the dead hook" fix leaves behind a new layer of dead code — the exact spec-residue smell F8's own rationale cites against the D7 single-artifact convention. The fix should either name the startHand simplification or state why the engine-level `holeOverride`/`boardOverride` plumbing (used by tests via `createHand`, not `startHand`) stays.

### poker-F13 [Nit] F1's "add a one-line statement … on the start overlay" duplicates copy the overlay already has
- Where: game/poker.html:1480
- Quote: "No-Limit Texas Hold\\'em cash game vs. random heuristic bots. Blinds ' + SB + '/' + BB + ', everyone tops up to ' + START + ' each hand."
- Problem: The proposal's F1 before-state analysis ("winnings evaporate … and read as a bug") misses that the start overlay already owns the top-up disclosure, and its fix list includes "Add a one-line statement of the model on the in-page start overlay." Implemented literally, the panel gets two sentences saying the same thing. The item should be rephrased as "extend the existing overlay sentence to mention the Session P/L line," i.e. amend line 1480, not add.

### poker-F14 [Nit] role="grid" on a flat run of 169 buttons is an ARIA-structure violation
- Where: game/poker.html:1385
- Quote: "'<div class=\"pf-grid\" id=\"pf-grid\" role=\"grid\" aria-label=\"169 starting hands\"></div>' +"
- Problem: `role="grid"` requires `row`/`gridcell` descendants and expects arrow-key navigation; `renderGrid()` appends 169 bare `<button>` children with no row structure and no roving tabindex, so screen readers announce a broken grid (0 rows) and keyboard users must Tab through 169 stops. Either drop to a plain `aria-label`ed container of buttons (honest and fine) or implement the grid pattern properly. Untouched by the proposal.

**Pass 2 verdict:** 0 blockers / 1 should-fix / 5 nits — material findings

## Pass 2 — author response

### poker-F9 — Accepted
- Fix: `tests/run.mjs` · selftest pin (line 24) · amend the F2/F3 fixes to land the pin bump in the same commit as the new tests: `const EXPECTED_CHECKS = 47;` → the new total after adding the F2 street-commit-history check and the F3 reopening pair. The nominal target is 50 (47 + 1 + 2), but the binding rule is: after writing the new `check()` assertions, run `node tests/run.mjs --selftest`, read the actual `passed` count, and set the pin to exactly that number — never leave 47, never guess. The proposal's F2/F3 entries are amended to state this explicitly.
- Rationale: verified — `tests/run.mjs:24` pins 47 and `finish()` exits 1 on mismatch (`if (selftest && passed !== EXPECTED_CHECKS)`, line 273). Implemented as previously written, a correct change reds the deterministic gate the release train leans on (§H hard gate). The pin-must-jump discipline is also a recorded repo lesson (selftest count must JUMP, not just stay green).
- Blast radius: tests/run.mjs only (one constant + the new checks from F2/F3). No skill/substrate change.

### poker-F10 — Accepted
- Fix: `SKILL.md` · lines 110 and 118 · change both no-save-state citations from D7 to D6: "Per D7 the game keeps **no save state**" → "Per D6 …", and "there is none to keep (D7)" → "(D6)". No other text changes.
- Rationale: verified in the canonical home — `_shared/game-launcher/game-launcher.md:106` is "## No persistence (D6) {#no-persistence}" and line 19 is "## Single-file bundling convention (D7) {#bundling}". Both SKILL.md cites invoke the persistence rule under the bundling id — a §K citation error; anyone tracing D7 lands on the wrong section.
- Blast radius: poker/SKILL.md only. Worth a one-off grep across the six sibling gamekit SKILL.md files for the same D6/D7 swap while editing (read-only check; any hits belong to those units' proposals).

### poker-F11 — Accepted
- Fix: `SKILL.md` · lines 16 and 105 · make both enumerations match the shipped five-button strip (poker.html:294–298): line 105 "**½ Pot / Pot / Min / All-in**" → "**½ Pot / ¾ Pot / Pot / Min / All-in**"; line 16 "½-pot / pot / all-in quick buttons" → "½-pot / ¾-pot / pot / min / all-in quick buttons".
- Rationale: verified — the HTML ships five `data-q` buttons including `data-q="0.75">¾ Pot`; the doc lists four in one place and three in another. Enumerated-set count drift is exactly the prose-only defect class the [J] coherence gate keeps catching in this repo; F5 makes ¾ Pot compute correct sizes, so the omission would otherwise outlive the whole refactor.
- Blast radius: poker/SKILL.md only.

### poker-F12 — Accepted
- Fix: `game/poker.html` · `startHand` (lines ~1209–1221) · amend F8's deletion to also strip startHand's now-dead rigging plumbing, with an explicit keep/delete split: DELETE the `opts.seatStacks` branch (seat init becomes an unconditional top-up: `s.stack = START; return { seat: s.seat, stack: s.stack };`) and the `holeOverride: opts.holeOverride` / `boardOverride: opts.boardOverride` lines threaded into `createHand` — `dealRigged` was their only caller and all surviving call sites pass `{}`. KEEP the engine-level `holeOverride`/`boardOverride` handling inside `createHand`/`Hand` (poker.html:528, 532): `tests/run.mjs` exercises it directly via vm `createHand` (lines 167–168, 189–190), so it is live tested code, not residue. Optionally collapse `startHand(opts)` to `startHand()` and update its call sites.
- Rationale: verified — `opts.seatStacks` at line 1211–1212 has no caller once `__POKER_TEST__.dealRigged` (line 1548, the only `seatStacks` producer) is deleted. Leaving it would recreate the exact dead-plumbing smell F8's own rationale cites.
- Blast radius: poker.html UI wiring only; engine untouched; tests/run.mjs untouched (it uses createHand, never startHand).

### poker-F13 — Accepted
- Fix: `game/poker.html` · start-overlay copy (line 1480) + the F1 fix list · replace F1's "add a one-line statement of the model on the in-page start overlay" with "amend the existing overlay sentence": line 1480 already discloses the top-up ("everyone tops up to ' + START + ' each hand."); extend that same sentence to mention the new Session P/L line (e.g. "… each hand; the Session line tracks your cumulative winnings.") rather than adding a second sentence saying the same thing.
- Rationale: verified — the overlay owns the disclosure today; F1's before-state ("winnings evaporate and read as a bug") overstated the gap on this one surface, and implementing F1 literally would duplicate copy. The SKILL.md half of F1 stands unchanged (its "resets stacks" sentence still misleads).
- Blast radius: poker.html overlay string only; narrows F1, changes nothing else in it.

### poker-F14 — Accepted
- Fix: `game/poker.html` · preflop-chart markup (line 1385) · drop the dishonest ARIA role: `role="grid"` → `role="group"` (keeping `aria-label="169 starting hands"`). `renderGrid()` (line 1333) appends 169 bare `<button>` children with no `row`/`gridcell` structure, so the grid role is a structure violation; `role="group"` over labeled buttons is honest and correct. The full ARIA grid pattern (row wrappers + roving tabindex + arrow-key nav) is explicitly out of scope for this refactor — the visual CSS grid and Tab traversal are unchanged.
- Rationale: verified — a `grid` with zero `row` descendants announces broken to screen readers and promises arrow-key navigation the widget doesn't implement. Removing the false promise is the minimal honest fix; a proper grid implementation would be a feature, not a refactor.
- Blast radius: poker.html one attribute; no behavior/test change.

## Pass 1 — author response (re-run verification, 2026-07-13)

Note: a prior author run already dispositioned F1–F8 (and F9–F14). This re-run independently re-verified every pass-1 finding's grounding against the live files and ratifies each disposition. All 8 pass-1 quotes confirmed verbatim: poker.html:1209 (F1), :1005 (F2), :562 (F3), SKILL.md:40 (F4), poker.html:1523 (F5), :1323 (F6), :1137 (F7), :1540 (F8). No finding is invalid/ungrounded.

### poker-F1 — Accepted (ratified; narrowed by F13)
- Fix: game/poker.html (HUD hand-end path + start overlay) + SKILL.md launch-report copy · keep the D4 per-hand top-up but add a `sessionNet` P/L line next to "Hand N" (from `result()` per-seat nets, BB-toggle-aware, reset only by New game); rewrite SKILL.md:109–110 to own the fresh-1,000-per-hand model; per F13 AMEND the existing overlay sentence at poker.html:1480 ("everyone tops up to ' + START + ' each hand") to mention the Session line rather than adding a duplicate sentence.
- Rationale: the current "New game … resets stacks" copy implies Next hand preserves stacks, so the top-up reads as a bug; a session accumulator restores stakes without breaking the 100 BB trainer calibration the charts assume.
- Blast radius: poker.html + SKILL.md; no engine change; vm tests unaffected; siblings untouched.

### poker-F2 — Accepted (ratified; amended by F9)
- Fix: game/poker.html engine · add `Hand.commitHistory` updated in `post()` and the call/bet/raise branches of `apply()`, snapshot-finalized before `advanceStreet` zeroes `committedStreet`; expose `streetCommitsOf(seat)`; delete the record-inside-render block at ~1005–1011 so renderSeat is a pure reader; add one vm check in tests/run.mjs.
- Rationale: the street-closing action (last caller — the most common line) is lost because history is recorded as a render side effect after the engine zeroed the source; apply-time recording is correct by construction and vm-testable.
- Blast radius: poker.html engine + UI; tests/run.mjs (+1 check, pin bump per F9/C9); no SKILL.md change.

### poker-F3 — Accepted (ratified; amended by F9)
- Fix: game/poker.html engine · per-seat `raiseRightsOpen` flag (true at street start and on any full raise, exactly where `hasActed` is reset in the `raiseSize >= lastRaiseSize` branch); `legalActions` offers raise only when `currentBet === 0 || raiseRightsOpen || !hasActed`; `needsAction` (line 562) unchanged — the call/fold obligation is correct. Two new vm checks (reopening denied after under-raise; granted after full raise).
- Rationale: the full-raise-only `hasActed` reset proves the rule was known; the legal-action side never consumed it, so an incomplete all-in wrongly reopens full raising rights — an edge shove-happy bots actually hit.
- Blast radius: poker.html engine; bots self-correct via `legalActions().actions`; tests/run.mjs (+2 checks, pin bump per F9/C9); tests 8–9 unaffected.

### poker-F4 — Accepted (ratified; cross-unit escalation)
- Fix: pmos-toolkit substrate first (`_shared/non-interactive.md`, `tools/lint-non-interactive-inline.sh`, `skill-patterns.md` W14 prose, `skill-eval.md` mirror) — add a third exemption marker `<!-- non-interactive: prompt-free <proof> -->`; then swap poker's ~28-line block + apology prose (SKILL.md:40) for the marker, same edit in the six sibling gamekit skills.
- Rationale: ~1.7KB of dead protocol loads on every launch of a provably prompt-free skill; the exemption vocabulary (`refused`, `delegated`) is missing exactly this case, and the skill apologizes for it in its own body.
- Blast radius: LARGE and outside this unit — needs its own story with the lint change landing first; NOT foldable into a poker-only diff. Until then poker's block must stay (unilateral removal reds the W14 lint).

### poker-F5 — Accepted (ratified)
- Fix: game/poker.html quickbets handler (~1523) · replace `sliderTo(curLegal.minRaiseTo + Math.round(pot * frac))` with raise-to = own street commit + toCall + frac × (pot after calling), clamped to `[minRaiseTo, maxRaiseTo]`; consumes the currently-dead `call` variable.
- Rationale: unopened "½ Pot" into 100 gives 60, facing a 50-bet gives 175 instead of 150 — the buttons contradict the References tab's own pot-odds teaching.
- Blast radius: poker.html UI only; arithmetic-by-inspection + dogfood (vm can't reach DOM handlers).

### poker-F6 — Accepted (ratified)
- Fix: game/poker.html `heroPositionLabel()` (~1323) · special-case `n === 2`: `byDist = ['BTN','BB']`, matching the engine's own `sbPos = n === 2 ? buttonIndex : …` blind model; n ≥ 3 keeps the existing table.
- Rationale: heads-up off the button the hero IS the BB, but the label says SB, so the chart defaults away from the one BB-specific defense pane it ships.
- Blast radius: poker.html UI only (chart default + dropdown preselect).

### poker-F7 — Accepted (ratified)
- Fix: game/poker.html · route `describeAction` amounts, `setLastAct` labels, and the showdown banner/pots breakdown (line 1137/1139 `w.amount.toLocaleString()`) through `fmt()`; format at write time with the active unit, no retro-conversion of prior log lines (documented one-liner at the toggle).
- Rationale: SKILL.md advertises the BB toggle but the same viewport mixes "Pot 15 BB" with "Ava raises to 40" — the feature is half-wired.
- Blast radius: poker.html UI only; SKILL.md's claim becomes true unchanged.

### poker-F8 — Accepted (ratified; modified: delete; extended by F12)
- Fix: game/poker.html · delete the `window.__POKER_TEST__` block (~1540–1567 incl. `dealRigged`) AND per F12 strip startHand's now-dead rigging plumbing (`opts.seatStacks` branch at 1211–1212; `holeOverride`/`boardOverride` threading into the createHand call), while KEEPING the engine-level override handling in `createHand`/`Hand` — live code exercised by tests/run.mjs via vm.
- Rationale: zero automated consumers (tests drive `createHand` directly; the only historical consumer was one-time console dogfood); spec residue contradicts the D7 single-artifact convention.
- Blast radius: poker.html only; tests/run.mjs untouched; dogfood EVIDENCE.md stays as historical record.

Re-run tally: 8/8 pass-1 findings accepted (0 rejected, 0 invalid); pass-2 findings F9–F14 remain accepted as previously recorded. Proposal rewritten as the cumulative record.
