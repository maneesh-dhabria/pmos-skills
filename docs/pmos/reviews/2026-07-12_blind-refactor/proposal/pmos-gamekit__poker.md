# Refactor proposal — pmos-gamekit__poker

**Unit:** `plugins/pmos-gamekit/skills/poker/` (SKILL.md, game/poker.html, tests/run.mjs)
**Status:** CAPPED (pass 2 of 2 — hard cap reached; pass-1 author re-run on 2026-07-13 re-verified all groundings and ratified every disposition)
**Passes:** Pass 1 (8 findings, all accepted) · Pass 2 (6 findings, all accepted). 14/14 accepted, 0 rejected, 0 invalid. All 14 quotes independently re-confirmed verbatim against the live files.

This document is self-contained: it is the complete cumulative record of all findings and their dispositions. Changes are DESCRIBED, never implemented.

## Findings ledger

| ID | Severity | Title | Disposition |
|---|---|---|---|
| poker-F1 | Should-fix | Per-hand stack top-up contradicts SKILL.md and leaves the game with no stakes | **Accepted** (narrowed by F13) — session P/L line + copy fix owning the top-up model |
| poker-F2 | Should-fix | Chip strip loses the street-closing action (history recorded as a render side effect) | **Accepted** (amended by F9) — record commits in the engine at apply time |
| poker-F3 | Should-fix | Incomplete all-in raise wrongly reopens full raising rights | **Accepted** (amended by F9) — per-seat `raiseRightsOpen` flag consumed by `legalActions` |
| poker-F4 | Should-fix | Dead 28-line non-interactive block in a prompt-free launch skill | **Accepted — cross-unit escalation** (see Open questions) |
| poker-F5 | Nit | Quick-bet ½/¾/Pot buttons compute wrong pot-fraction sizes | **Accepted** — standard raise-to formula, consuming the dead `call` var |
| poker-F6 | Nit | Heads-up non-button hero mislabeled SB (is BB) | **Accepted** — heads-up special case matching the engine's blind model |
| poker-F7 | Nit | BB unit toggle doesn't reach log / last-action chips / winner banner | **Accepted** — route all amounts through `fmt()` |
| poker-F8 | Nit | Dead `__POKER_TEST__` hook shipped with no consumer | **Accepted (modified: delete)** (extended by F12) |
| poker-F9 | Should-fix | F2/F3's new vm tests break the pinned selftest count | **Accepted** — bump `EXPECTED_CHECKS` in the same commit |
| poker-F10 | Nit | SKILL.md cites D7 for no-save-state; substrate id is D6 | **Accepted** — D7→D6 at SKILL.md:110, 118 |
| poker-F11 | Nit | Quick-bet enumeration drifts from shipped UI (¾ Pot omitted twice) | **Accepted** — list all five buttons at SKILL.md:16, 105 |
| poker-F12 | Nit | F8's deletion strands dead rigging plumbing in startHand | **Accepted** — explicit delete/keep split for the plumbing |
| poker-F13 | Nit | F1's overlay one-liner duplicates existing copy | **Accepted** — amend line 1480, don't add |
| poker-F14 | Nit | role="grid" on 169 flat buttons is an ARIA-structure violation | **Accepted** — role="group", keep aria-label |

---

## Accepted changes (full detail)

### C1 — Session P/L line + honest top-up copy (F1 [Should-fix], narrowed by F13 [Nit])
- **Files:** `game/poker.html` (HUD, hand-end path, start overlay), `SKILL.md` (Phase 0 launch-report text).
- **Before:** `startHand` tops every seat back to 1,000 each hand (deliberate D4 trainer model — poker.html:1209 "// Cash game: top every seat back up to the starting stack each hand (D4)."), but SKILL.md:109–110 says "**N** deals the next hand; **New game** re-randomizes the opponents and resets stacks", implying Next hand preserves stacks. Winnings visibly evaporate each hand and there is no session score of any kind.
- **After:** (a) Keep the D4 top-up (the preflop chart and pot-odds panel assume 100 BB depth) but add a **session P/L accumulator** (`sessionNet`), updated at hand end from the engine's per-seat net (already computed by `result()`), rendered next to "Hand N" as e.g. "Session +340", honoring the BB toggle, reset only by New game. (b) Rewrite the SKILL.md sentence to own the model: every hand deals fresh 1,000-chip (100 BB) stacks; the Session line tracks cumulative winnings; New game re-randomizes opponents and zeroes the session line. (c) **Per F13:** the start overlay ALREADY discloses the top-up (poker.html:1480 "…everyone tops up to ' + START + ' each hand."); **amend that existing sentence** to mention the Session line (e.g. "… each hand; the Session line tracks your cumulative winnings.") — do NOT add a second sentence duplicating the disclosure.
- **Rationale:** current copy makes the top-up read as a bug; a session accumulator restores stakes without abandoning the fixed-depth trainer design.
- **Blast radius:** poker.html + SKILL.md. No engine change; vm tests unaffected; siblings untouched.

### C2 — Street-commit history recorded in the engine, not as a render side effect (F2 [Should-fix], amended by F9)
- **Files:** `game/poker.html` (engine `Hand`, renderSeat), `tests/run.mjs`.
- **Before:** `streetCommits` is populated inside `renderSeat` from `hand.committedStreetOf(seat)` (poker.html:1005). When a call closes a street, `advanceStreet` zeroes `committedStreet` BEFORE `renderAll` runs, so the street-closing action (the most common line — last caller) never appears in the chip strip.
- **After:** `Hand` gains a `commitHistory` map (`seat → {preflop,flop,turn,river}`) updated inside `post()` and the `call`/`bet`/`raise` branches of `apply()` (the three places chips enter `committedStreet`), snapshot-finalized before `advanceStreet` zeroes `committedStreet`. Expose `Hand.prototype.streetCommitsOf(seat)`. Delete the `streetCommits` module variable and the record-inside-render block (~lines 1005–1011); renderSeat becomes a pure reader.
- **Tests:** `tests/run.mjs` gains one vm check ("last call closing a street is present in that street's commit history"). **Per F9: bump `EXPECTED_CHECKS` in the same commit** (see C9).
- **Blast radius:** poker.html engine + UI, tests/run.mjs. No SKILL.md change.

### C3 — Complete the NLHE incomplete-raise reopening rule (F3 [Should-fix], amended by F9)
- **Files:** `game/poker.html` (engine `apply`, `legalActions`), `tests/run.mjs`.
- **Before:** `apply` resets `hasActed` only on a full raise (`raiseSize >= lastRaiseSize`), but `needsAction` (poker.html:562 "return !s.folded && !s.allIn && (!s.hasActed || s.committedStreet < this.currentBet);") plus `legalActions` still offer a full re-raise to a player facing an incomplete all-in raise who already acted — forbidden under standard NL rules.
- **After:** each seat gains a `raiseRightsOpen` flag: true at street start and whenever a full raise lands (set exactly where `hasActed` is reset today); on an incomplete all-in raise, seats that already acted keep it false. `legalActions`: `canRaise = s.stack > toCall && (this.currentBet === 0 || s.raiseRightsOpen || !s.hasActed)` — facing an incomplete raise after having acted, only fold/call are offered. `needsAction` unchanged (the player still owes a call/fold decision — that part is correct).
- **Tests:** `tests/run.mjs` gains two checks (reopening denied after an under-raise; reopening granted after a full raise). **Per F9: bump `EXPECTED_CHECKS` in the same commit** (see C9).
- **Blast radius:** poker.html engine; bots self-correct (they read `legalActions().actions` — no bot change); tests 8–9 (min-raise sizing) unaffected.

### C4 — "prompt-free" W14 exemption marker (F4 [Should-fix] — CROSS-UNIT ESCALATION)
- **Files (outside this unit):** pmos-toolkit `skills/_shared/non-interactive.md`, `tools/lint-non-interactive-inline.sh`, `skill-patterns.md` W14 prose, `skill-eval.md` mirror. **Files (this unit + siblings):** all 7 pmos-gamekit SKILL.md files.
- **Before:** poker/SKILL.md:40 inlines the ~28-line frozen non-interactive block plus two paragraphs apologizing for it ("The non-interactive contract block below is inlined only to satisfy the … repo-wide W14 lint; no checkpoint ever fires"). ~1.7KB of dead mode-resolution/OQ-buffer protocol loads on every `/poker` invocation; the same tax on every sibling game skill.
- **After:** add a third self-documenting exemption marker — `<!-- non-interactive: prompt-free <one-line proof> -->` — accepted by the lint in place of the inline block, valid only for skills that issue zero prompts, produce no artifact, and defer nothing (the game-launcher launch contract guarantees this by construction). Then replace poker's block + apology prose with the one-line marker; same swap in the six sibling gamekit skills (all carry the identical dead block — grep-confirmed, 7/7).
- **Sequencing:** needs its own story/epic; the lint/substrate change lands FIRST, the per-skill edits are mechanical follow-ups. Flagged for the run coordinator — NOT foldable into a poker-only diff.
- **Blast radius:** LARGE — pmos-toolkit substrate + lint + rubric mirrors + 7 gamekit skills.

### C5 — Correct pot-fraction quick-bet math (F5 [Nit])
- **File:** `game/poker.html` quickbets handler (~line 1523).
- **Before:** `else { var frac = Number(q); sliderTo(curLegal.minRaiseTo + Math.round(pot * frac)); }` — with a dead `call = curLegal.toCall` assignment on the preceding line. Unopened "½ Pot" into 100 gives 60; facing a 50-bet it gives 175 instead of 150 — contradicting the References tab's own pot-odds table (½ pot → ~25% break-even).
- **After:** standard pot-fraction raise-to: `sliderTo(call + Math.round((pot + call) * frac) + hand.committedStreetOf(heroSeat))` — raise-to = own street commit + toCall + frac × (pot after calling) — clamped into `[minRaiseTo, maxRaiseTo]` (verify sliderTo already clamps). Consumes the previously-dead `call` variable.
- **Blast radius:** poker.html UI only; correctness by arithmetic inspection + dogfood (vm can't reach DOM handlers).

### C6 — Heads-up hero position label (F6 [Nit])
- **File:** `game/poker.html` `heroPositionLabel()` (~line 1323, `var byDist = ['BTN', 'SB', 'BB', 'UTG', 'MP', 'CO'];`).
- **After:** special-case `n === 2`: `byDist = ['BTN','BB']` (button = SB = BTN view; non-button hero = BB), matching the engine's own blind model (`sbPos = n === 2 ? buttonIndex : …`). n ≥ 3 keeps the existing table. Fixes the chart defaulting to the SB raise-first-in grid when heads-up hero is actually the BB — hiding the one BB-specific "vs a raise" defense pane.
- **Blast radius:** poker.html UI only (chart default + position dropdown preselect).

### C7 — BB toggle reaches log, last-action chips, winner banner (F7 [Nit])
- **File:** `game/poker.html`.
- **After:** route every user-facing chip amount through `fmt()`: `describeAction` amounts (~1073–1081), `setLastAct` labels, showdown banner (lines 1137/1139 `w.amount.toLocaleString()` → `fmt(w.amount)`) and the multi-pot "(2 pots: …)" breakdown. Amounts formatted at write time with the active unit; prior log lines not retro-converted (one-line comment at the toggle). Makes SKILL.md's advertised "Show BB / Show chips" claim true.
- **Blast radius:** poker.html UI only. SKILL.md unchanged.

### C8 — Delete the dead `__POKER_TEST__` hook AND its startHand plumbing (F8 [Nit], extended by F12 [Nit])
- **File:** `game/poker.html`.
- **After (F8):** delete the `window.__POKER_TEST__` block (~1540–1567, incl. `dealRigged`) — zero automated consumers: `tests/run.mjs` drives the engine via vm `createHand` and never touches it; the only historical consumer was one-time story dogfood driven manually from the console (docs/pmos/features/2026-06-13_pmos-gamekit-poker/stories/260613-kw5/dogfood/EVIDENCE.md — stays as historical record). AC9 side-pot coverage lives deterministically in `tests/run.mjs` §13.
- **After (F12 extension):** also strip startHand's now-dead rigging plumbing with an explicit split — **DELETE** the `opts.seatStacks` branch (lines ~1211–1212; seat init becomes unconditional top-up to START) and the `holeOverride`/`boardOverride` threading into the `createHand` call (lines ~1220–1221); `dealRigged` was their only producer and all surviving call sites pass `{}`. **KEEP** the engine-level `holeOverride`/`boardOverride` handling inside `createHand`/`Hand` (poker.html:528, 532) — live tested code, exercised by tests/run.mjs:167–168 and 189–190 via vm. Optionally collapse `startHand(opts)` to `startHand()` and update call sites.
- **Blast radius:** poker.html only; tests/run.mjs untouched.

### C9 — Selftest pin bump (F9 [Should-fix])
- **File:** `tests/run.mjs` line 24 (`const EXPECTED_CHECKS = 47;`; enforced at line 273 `if (selftest && passed !== EXPECTED_CHECKS) {` → exit 1).
- **After:** land the pin bump IN THE SAME COMMIT as the C2/C3 tests. Nominal target 50 (47 + 1 + 2), but the binding rule: after writing the new `check()` assertions, run `node tests/run.mjs --selftest`, read the actual passed count, and set the pin to exactly that number. Never leave 47; never guess. (Matches the repo's recorded "selftest count must JUMP, not just stay green" lesson.)
- **Blast radius:** tests/run.mjs only.

### C10 — Fix D7→D6 no-persistence citations (F10 [Nit])
- **File:** `SKILL.md` lines 110 ("Per D7 the game keeps **no save state** — closing…") and 118 ("there is none to keep (D7)").
- **After:** both cites become D6. Verified against the canonical home: `_shared/game-launcher/game-launcher.md:106` is "## No persistence (D6) {#no-persistence}"; D7 is the single-file bundling convention (line 19). While editing, grep sibling gamekit SKILL.md files for the same swap (read-only check; any hits belong to those units' proposals).
- **Blast radius:** poker/SKILL.md only.

### C11 — Quick-bet enumeration matches the shipped five buttons (F11 [Nit])
- **File:** `SKILL.md` lines 16 and 105.
- **After:** line 105 "**½ Pot / Pot / Min / All-in**" → "**½ Pot / ¾ Pot / Pot / Min / All-in**"; line 16 "½-pot / pot / all-in quick buttons" → "½-pot / ¾-pot / pot / min / all-in quick buttons". Verified: poker.html:294–298 ships five `data-q` buttons including `data-q="0.75">¾ Pot`. Enumerated-set count drift — the prose-only defect class the [J] coherence gate keeps catching; C5 makes ¾ Pot compute correct sizes, so the omission would otherwise outlive the refactor.
- **Blast radius:** poker/SKILL.md only.

### C12 — Drop the false ARIA grid role (F14 [Nit])
- **File:** `game/poker.html` line 1385 (`role="grid" aria-label="169 starting hands"`).
- **After:** `role="grid"` → `role="group"`, keeping the aria-label. `renderGrid()` (line 1333) appends 169 bare `<button>` children with no `row`/`gridcell` structure and no roving tabindex, so `grid` announces broken (0 rows) and promises arrow-key navigation that doesn't exist. The full ARIA grid pattern (row wrappers + roving tabindex + arrow keys) is out of scope for a refactor — the visual CSS grid and Tab traversal are unchanged.
- **Blast radius:** poker.html one attribute; no behavior/test change.

---

## Rejections

None. All 14 findings across both passes were grounded (quotes verified verbatim against the files — re-confirmed independently in the 2026-07-13 pass-1 author re-run) and accepted — two with modification: F8 resolved the reviewer's "ship the e2e or delete" fork to **delete** (extended by F12), and F1 was narrowed by F13 (amend the existing overlay sentence instead of adding a duplicate one).

## Open questions

- **F4/C4 (prompt-free W14 exemption)** is accepted in principle but NOT implementable inside this unit: it requires changes to pmos-toolkit's `_shared/non-interactive.md`, `tools/lint-non-interactive-inline.sh`, and the `skill-patterns.md`/`skill-eval.md` mirrors, sequenced BEFORE the 7 gamekit SKILL.md edits. Needs a coordinator decision / its own story. Until the substrate change lands, poker's inline block must stay as-is (removing it unilaterally reds the W14 lint).
- **C9 exact pin value** (nominal 50) is determined at implementation time by running `node tests/run.mjs --selftest` — checks-per-test is an implementation detail; the invariant is pin == actual passed count, bumped in the same commit as the new tests.

No unresolved reviewer/author disagreements — both passes converged on acceptance.
