## Pass 1 — reviewer findings

### pmos-gamekit-cross-F1 [Should-fix] Canonical home declares "never restates" but all 7 consumers restate the launch contract and no-persistence rule
- Where: plugins/pmos-gamekit/skills/_shared/game-launcher/game-launcher.md:4 (vs. e.g. plugins/pmos-gamekit/skills/solitaire/SKILL.md:86-101)
- Quote: "it never restates the bundling rule, the launch contract, the platform-open matrix, or the no-persistence rule below."
- Problem: Every game SKILL.md's Phase 0 restates the launch contract's steps verbatim-in-substance — e.g. solitaire/SKILL.md:86-88 "Assert Node is present — run `node --version`. On failure, emit the Node-prerequisite error verbatim from `game-launcher.md#node-prereq` and stop. There is **no silent `file://` fallback** (D2)." — and restates the no-persistence rule ("Per D6 the game keeps **no save state** — closing the tab discards the hand.", solitaire:100-101). The Platform Adaptation blocks also restate the file://-works-but-server-is-the-contract nuance (solitaire:40-42). Either the skills need those executable steps (then the canonical home's "never restates" claim is false and should be narrowed to "states the deltas plus the concrete launch steps"), or the steps should be a bare cite. As written it is a §K one-fact-one-home violation whose two copies have already begun to diverge (see F2) — exactly the failure mode §K exists to prevent, and a future launcher change (e.g. a new flag) must now be hand-propagated into 7 near-identical Phase-0 blocks.

### pmos-gamekit-cross-F2 [Should-fix] The no-persistence rule is cited under four different decision ids across the 7 skills; poker's id collides with a different rule in the canonical home
- Where: plugins/pmos-gamekit/skills/poker/SKILL.md:110 (also snake/SKILL.md:100,108; solitaire/SKILL.md:108; sudoku/SKILL.md:105,113; 2048/flappy-bird/tetris use "the launch contract")
- Quote: "in the launcher terminal. Per D7 the game keeps **no save state** — closing the tab discards"
- Problem: The canonical home labels no-persistence as D6 ("## No persistence (D6) {#no-persistence}", game-launcher.md:106) and single-file bundling as D7 ("## Single-file bundling convention (D7) {#bundling}", game-launcher.md:19). Solitaire and sudoku cite D6 (correct), poker cites D7 — which in the only cited reference resolves to the bundling convention, an actively misleading cross-reference — and snake cites D9 ("Per D9 the game keeps **no save state** — the high score is per session", snake:100), an id that exists nowhere in game-launcher.md. These ids presumably point at each game's own (undistributed) feature-decision log, but the SKILL.md names game-launcher.md as "the §K canonical home", so a reader resolves them there and gets the wrong or no answer. This is the drift F1 predicts: the same fact restated 7 times has already forked into 4 id namespaces. Fix: one id (D6) or drop the id and cite `game-launcher.md#no-persistence` by slug, per the repo's own §J anchor discipline.

### pmos-gamekit-cross-F3 [Should-fix] ~29 dead lines of non-interactive contract inlined into every prompt-free game skill — the W14 lint has no prompt-free exemption
- Where: plugins/pmos-gamekit/skills/solitaire/SKILL.md:33-35 (identical admission in all 7 skills)
- Quote: "The non-interactive contract block below is inlined only to satisfy the repo-wide W14 lint; no checkpoint ever fires."
- Problem: All 7 skills are launch-only and prompt-free by contract (game-launcher.md:48 "A game skill's body is **launch-only** — no `AskUserQuestion`, no generation."), yet each carries the full 28-line frozen block — mode resolution, `.pmos/settings.yaml` parsing, OQ buffering, subagent marker prepending — none of which can ever execute. That is ~26% of each SKILL.md's line count (29 of ~110) loaded into context on every "play snake", and the skills themselves document it as lint appeasement. The repo policy scopes the block to skills "that issues prompts" (root CLAUDE.md, Skill-authoring conventions), and the exemption markers that exist (`refused`, `delegated`) don't fit a prompt-free skill — so the lint contract is missing a third self-documenting marker (e.g. `<!-- non-interactive: prompt-free -->`) and gamekit pays the tax ×7. game-launcher.md:57-58 even punts on it: "(Whether a prompt-free skill still needs the canonical non-interactive inline block is decided by `lint-non-interactive-inline.sh`, not here.)" This is a lint/rubric gap, not a per-skill authoring error — fix it once in the lint, delete ~200 dead lines across the plugin.

### pmos-gamekit-cross-F4 [Nit] Trigger collision: solitaire still claims the generic "I want to play cards" now that poker exists
- Where: plugins/pmos-gamekit/skills/solitaire/SKILL.md:3
- Quote: "says \"/solitaire\", \"play solitaire\", \"deal me a game of solitaire\", \"I want to play cards\""
- Problem: poker's description also claims card-play ("play cards against bots", poker/SKILL.md:3). A user saying "I want to play cards" or "let's play a card game" is now ambiguous between two skills, but solitaire's description asserts the generic phrase unconditionally — the router will bias to solitaire even when the user means poker. Solitaire's description predates poker; the generic claim should either be dropped or qualified ("play a solo card game").

### pmos-gamekit-cross-F5 [Nit] Charter "Holds" column and plugin.json keywords list only solitaire while the plugin ships 7 games
- Where: CLAUDE.md:14 (repo root); plugins/pmos-gamekit/.claude-plugin/plugin.json keywords
- Quote: "each a self-contained HTML file launched from a skill via a zero-dependency local server (solitaire)."
- Problem: The charter table's Holds column — the stated membership test — enumerates one game, but the plugin now holds 2048, flappy-bird, poker, snake, solitaire, sudoku, tetris. Likewise plugin.json's keywords are `"solitaire", "klondike", "casual", …` with none of the other six titles. Nobody consulting the charter or marketplace metadata learns the actual inventory; the enumerated-set-vs-count drift class is the exact thing the repo's own [J]-gate lesson warns about. Either list all seven or drop the parenthetical example entirely.

### pmos-gamekit-cross-F6 [Nit] flappy-bird copy-paste residue: "closing the tab discards the board" — Flappy Bird has no board
- Where: plugins/pmos-gamekit/skills/flappy-bird/SKILL.md:107
- Quote: "closing the tab discards the board (the session best resets too)."
- Problem: "the board" is residue from the 2048 skill this sentence was templated from (2048/SKILL.md:100 uses the same phrase, where it's correct). Flappy Bird discards the run/score, not a board. Trivial, but it's a visible tell of the untracked 7-way duplication flagged in F1 — the copies drift because nothing syncs them.

**Pass 1 verdict:** 0 blockers / 3 should-fix / 3 nits — material findings

## Pass 1 — author response

### pmos-gamekit-cross-F1 — Accepted
- Fix: (a) `plugins/pmos-gamekit/skills/_shared/game-launcher/game-launcher.md` · intro paragraph (lines 3–6) · narrow the false absolute claim "it never restates the bundling rule, the launch contract, the platform-open matrix, or the no-persistence rule below" → "it states its own deltas plus the concrete 4-step launch invocation (which is the skill's executable runbook and is allowed inline); the rationale prose, the platform-open matrix, the ephemeral-port mechanics, the Node-error text, and the no-persistence rationale live ONLY here and are cited by slug, never re-explained." (b) All 7 `plugins/pmos-gamekit/skills/<game>/SKILL.md` · Phase 0 + Platform Adaptation · keep the executable steps (path resolve, `node --version` assert, launch command, report line) but convert every restated *fact* into a slug cite: the Node-error emission already cites `game-launcher.md#node-prereq` (keep); the no-persistence sentence becomes a uniform one-liner "Per `game-launcher.md#no-persistence` (D6) the game keeps no save state" (see F2); the Platform-Adaptation file://-nuance sentence is trimmed to "the launch contract uses the server — see `game-launcher.md#node-prereq` (D2)" without re-explaining why.
- Rationale: The §K violation is the canonical home's over-broad claim colliding with 7 copies that legitimately need the executable steps inline (a launch-only skill's body IS its runbook; a bare cite would force a substrate read to launch). Narrow the claim to match the sanctioned inline surface, and shrink the restated *rationale/facts* to cites so a future launcher change touches one file. The already-observed drift (F2, F6) proves the current shape doesn't hold.
- Blast radius: game-launcher.md + all 7 game SKILL.md files; `tools/lint-phase-refs.sh` must stay green (all cited anchors — #node-prereq, #no-persistence — already exist in game-launcher.md, no heading changes); skill-eval §K/§J checks unaffected or improved; no scripts/tests touched.

### pmos-gamekit-cross-F2 — Accepted
- Fix: Uniform no-persistence cite across all 7 skills: "Per `game-launcher.md#no-persistence` (D6) the game keeps **no save state** — …". Concretely: `poker/SKILL.md:110` "Per D7" → the slug+D6 form (D7 is bundling in the canonical home — actively misleading); `snake/SKILL.md:100` "Per D9" → same form (D9 resolves nowhere in game-launcher.md); `sudoku/SKILL.md:105` and `solitaire/SKILL.md:100` "Per D6" → add the slug; `2048`/`flappy-bird`/`tetris` "per the launch contract" → same slug+D6 form (the launch contract section isn't where no-persistence lives). Also sweep the Capture-Learnings phase of each skill for the same id (e.g. solitaire:108 "(D6)" is correct, snake/sudoku second occurrences normalize too).
- Rationale: The SKILL.md names game-launcher.md as the §K canonical home, so bare ids must resolve *there*; four id namespaces for one fact is exactly the fork §K/§J exist to prevent. Slug-first citation (per repo §J anchor discipline) makes the reference renumber-proof; keeping "(D6)" parenthetically preserves the decision-log breadcrumb.
- Blast radius: 7 SKILL.md one-to-two-line edits; `lint-phase-refs.sh` validates the `game-launcher.md#no-persistence` cites (anchor exists); no evals/tests.

### pmos-gamekit-cross-F3 — Accepted (cross-plugin; gamekit-side deletion gated on the lint change shipping first)
- Fix: (a) `plugins/pmos-toolkit/tools/lint-non-interactive-inline.sh` · exemption grep (line ~55) · extend `(refused|delegated)` → `(refused|delegated|prompt-free)` and add a guard: a `prompt-free`-marked SKILL.md that contains an `AskUserQuestion` call site (reuse the audit-recommended extractor's line-shape exclusions so the Platform-Adaptation "Not used" bullet doesn't false-positive) fails the lint — the marker is a *claim* the lint verifies, not a bypass. Update the header comment's exemption inventory. (b) Root `CLAUDE.md` · "Skill-authoring conventions" non-interactive bullet · document the third self-documenting marker `<!-- non-interactive: prompt-free — issues no prompts; no checkpoint can fire -->` alongside refused/delegated. (c) `skill-patterns.md` + `skill-eval.md` (pmos-toolkit) · wherever the W14 exemption pair is enumerated, add the third marker (keep the rubric's gated-check counts consistent — if a count-claim exists, update it; per the [J]-gate lesson, grep count-claims). (d) All 7 gamekit SKILL.md files · delete the 28-line frozen block + the "inlined only to satisfy the repo-wide W14 lint" admission in Platform Adaptation, replace with the `prompt-free` marker; `game-launcher.md:57-58`'s punt sentence updates to name the marker.
- Rationale: The block is self-documented dead weight (~26% of each body, ×7, loaded on every "play X"); the repo policy already scopes the contract to skills "that issue prompts", so the lint's missing exemption is the defect, not the skills. The verify-guard keeps the marker honest against a skill later growing a prompt.
- Blast radius: pmos-toolkit `tools/lint-non-interactive-inline.sh` (+ its selftest if any), root CLAUDE.md, `skills/_shared/non-interactive.md` prose if it enumerates exemptions, skill-patterns.md, skill-eval.md (check-count assertions in `skill-eval-check.sh --selftest`), CI `.github/workflows/skill-hygiene.yml` unchanged; then 7 gamekit SKILL.md files + game-launcher.md. Requires pmos-toolkit-owner sign-off; ship lint change first, gamekit deletion second, else the lint goes red across the plugin.

### pmos-gamekit-cross-F4 — Accepted
- Fix: `plugins/pmos-gamekit/skills/solitaire/SKILL.md` · frontmatter description · replace the generic trigger `"I want to play cards"` → `"play a solo card game"`; poker's description keeps "play cards against bots" (bot-qualified, non-colliding).
- Rationale: Post-poker, the unqualified phrase is ambiguous and biases routing to solitaire; qualifying by solo-vs-bots restores a clean partition.
- Blast radius: solitaire frontmatter only; no lints/evals (description-only edit).

### pmos-gamekit-cross-F5 — Accepted
- Fix: (a) Root `CLAUDE.md` charter table, pmos-gamekit row · "(solitaire)" → drop the parenthetical enumeration entirely and say "(7 games: solitaire, poker, snake, tetris, 2048, sudoku, flappy-bird)" — or, per the zero-match/count-drift lessons, prefer the non-enumerating form "(e.g. solitaire, poker, tetris)" is still drift-prone, so recommend the full 7-item list WITH the count so the next [J] gate can check count-vs-set. (b) `plugins/pmos-gamekit/.claude-plugin/plugin.json` keywords · add "poker", "snake", "tetris", "2048", "sudoku", "flappy-bird" alongside the existing solitaire/klondike; mirror in `.codex-plugin/plugin.json` if it carries a keywords field (verified: it currently exposes only description — no keywords edit needed there unless the field exists).
- Rationale: The charter Holds column is the stated membership test and marketplace keywords are the discovery surface; both advertising 1 of 7 games under-serves routing and install-time search, and is the exact enumerated-set drift the repo's own [J] lesson flags.
- Blast radius: root CLAUDE.md (repo-level; no lint reads the charter), gamekit `.claude-plugin/plugin.json` (keywords only — NOT version; no marketplace.json edits per manifest-sync policy). Future-game additions must extend both — accepted maintenance cost, mitigated by the count+list pairing.

### pmos-gamekit-cross-F6 — Accepted
- Fix: `plugins/pmos-gamekit/skills/flappy-bird/SKILL.md:107` · Phase 0 report step · "closing the tab discards the board (the session best resets too)" → "closing the tab discards the run (the session best resets too)". Folds into the F2 uniform-sentence sweep.
- Rationale: Copy-paste residue from 2048 (where "board" is correct); Flappy Bird has a run/score, not a board. Visible symptom of the F1 duplication.
- Blast radius: one line in flappy-bird SKILL.md; none elsewhere.

**Author verdict pass 1:** 6/6 accepted (0 rejected, 0 invalid). F3 is cross-plugin and sequenced (toolkit lint first, gamekit deletion second); F1+F2+F6 land together as one 7-file citation-normalization sweep.

## Pass 1 — author response (verification addendum)

The "## Pass 1 — author response" section above was written by an interrupted prior run of this same author pass; the companion proposal file was never emitted. This run re-verified every finding's grounding before adopting that response verbatim:

- F1: game-launcher.md:5 "it never restates the bundling rule, the launch contract, the platform-open matrix, or" — present; solitaire/SKILL.md:88 "**no silent `file://` fallback** (D2)" and :101 restate — confirmed. Accepted as written above.
- F2: poker/SKILL.md:110 "Per D7 the game keeps **no save state**" (D7 = bundling in game-launcher.md:19); snake/SKILL.md:100 "Per D9 the game keeps" (D9 resolves nowhere in game-launcher.md); sudoku:105/solitaire:101 use D6; 2048:100/flappy-bird:106/tetris:102 use "the launch contract" — all confirmed. Four id namespaces for one fact, as found. Accepted.
- F3: solitaire/SKILL.md:34 "non-interactive contract block below is inlined only to satisfy the" — confirmed; each SKILL.md's 3 `AskUserQuestion` hits are the frozen block + negative Platform-Adaptation prose, no real prompt in any of the 7 skills; game-launcher.md:48 "launch-only — no `AskUserQuestion`" — confirmed. Accepted, with the toolkit-first sequencing above.
- F4: solitaire/SKILL.md:3 claims "I want to play cards"; poker/SKILL.md:3 claims "play cards against bots" — collision confirmed. Accepted.
- F5: CLAUDE.md:14 "…zero-dependency local server (solitaire)." — confirmed; plugin.json keywords list solitaire/klondike only, none of the other six titles; `.codex-plugin/plugin.json` verified to carry NO keywords field, so the (b) mirror caveat resolves to "no codex edit". Accepted.
- F6: flappy-bird/SKILL.md:107 "discards the board (the session best resets too)" vs 2048/SKILL.md:100 where "board" is correct — confirmed. Accepted.

**Addendum verdict:** prior response adopted unchanged — 6/6 accepted, 0 rejected, 0 invalid. Cumulative proposal now written to proposal/_cross__pmos-gamekit.md.

## Pass 2 — reviewer findings

### pmos-gamekit-cross-F7 [Should-fix] C2's verification step is vacuous — lint-phase-refs.sh cannot validate `game-launcher.md#<slug>` cites
- Where: tools/lint-phase-refs.sh:253
- Quote: "while (match(rest, /[a-z][a-z0-9-]*\/SKILL\.md#[A-Za-z0-9_-]+/) > 0) {"
- Problem: The proposal's C2 blast-radius claims "`lint-phase-refs.sh` validates the new `game-launcher.md#no-persistence` cites (anchor exists)", and its implementation-sequencing step 2 relies on running that lint as the post-sweep proof. But the lint's cross-file ref regex only matches the `<skill>/SKILL.md#<slug>` shape — a cite of the form `game-launcher.md#no-persistence` (or the 7 existing `game-launcher.md#node-prereq` cites) never enters the check and passes vacuously. So the sweep's core change — slug-first citation as the renumber-proof anti-drift mechanism — ships with NO lint backstop: a typo'd slug in one of the 7 uniform sentences, or a future rename of `{#no-persistence}` in game-launcher.md, silently orphans every cite, which is exactly the drift class C2 exists to kill. The implementer needs either a real check (e.g. extend the lint's ref regex to bare `.md#slug` refs resolved within the plugin, or a one-off grep asserting each cited slug appears as `{#slug}` in game-launcher.md) or the proposal must stop claiming the lint covers it and name the manual verification instead.

### pmos-gamekit-cross-F8 [Nit] Remaining trigger collision the C4 fix doesn't reach: sudoku vs 2048 both claim "number puzzle"
- Where: plugins/pmos-gamekit/skills/sudoku/SKILL.md:3
- Quote: "Use when the user wants to play sudoku, do a number puzzle, take a break with a logic puzzle"
- Problem: C4 de-collides only the cards pair (solitaire vs poker). The identical collision class survives elsewhere: sudoku claims the unqualified "do a number puzzle" while 2048/SKILL.md:3 claims "take a break with a number-puzzle game, ... 'I want a tile-sliding puzzle'". A generic "give me a number puzzle" request now routes ambiguously between the two, the same defect F4 fixed for cards. Same remedy shape: qualify one side (e.g. sudoku keeps "logic puzzle"/grid framing, 2048 keeps "tile-sliding"; drop or qualify the bare "number puzzle" from one of them) so the C4 partition principle is applied plugin-wide, not to a single pair.

### pmos-gamekit-cross-F9 [Nit] C1's sanctioned-inline boundary is ambiguous about the step-3 port/auto-open sentence — implementable both ways
- Where: plugins/pmos-gamekit/skills/solitaire/SKILL.md:93
- Quote: "The launcher binds a free ephemeral port on `127.0.0.1`, prints"
- Problem: C1(a) says "the ephemeral-port mechanics … live ONLY in game-launcher.md and are cited by slug, never re-explained", while C1(b) says to "keep the executable steps (path resolve, `node --version` assert, launch command, report line)". The sentence quoted above (present in all 7 skills' Phase-0 step 3) sits INSIDE the sanctioned launch step yet restates the ephemeral-port + auto-open mechanics C1(a) reserves for the canonical home — the two halves of C1 give contradictory instructions for this exact line. An implementer can legitimately keep it (it's part of step 3) and thereby preserve the very 7-way duplication C1 targets, or delete it and change what the skill reports. The proposal should classify this sentence explicitly (e.g. trim to "reports `Game ready at http://127.0.0.1:<port>/` — port selection and browser-open behavior per `game-launcher.md#port` / `#open-matrix`").

**Pass 2 verdict:** 0 blockers / 1 should-fix / 2 nits — material findings

## Pass 2 — author response

### pmos-gamekit-cross-F7 — Accepted
- Fix: Two parts. (i) Proposal correction — C2's blast-radius sentence "`lint-phase-refs.sh` validates the new `game-launcher.md#no-persistence` cites (anchor exists)" and C1's "must stay green" implication are withdrawn as verification claims: the lint's cross-file regex (`tools/lint-phase-refs.sh:253` `/[a-z][a-z0-9-]*\/SKILL\.md#[A-Za-z0-9_-]+/`) matches ONLY `<skill>/SKILL.md#slug` refs, so `game-launcher.md#<slug>` cites never enter the check. The sweep's stated verification becomes an explicit grep assertion run post-edit: extract every `game-launcher\.md#[A-Za-z0-9_-]+` ref from the 7 SKILL.md files and assert each slug appears as `{#<slug>}` in `_shared/game-launcher/game-launcher.md` (fail on any miss; also fail if a `{#slug}` rename in game-launcher.md orphans an existing cite — run the same assertion from the other direction is unnecessary; the cite→anchor direction is the drift risk). (ii) Durable backstop — extend `tools/lint-phase-refs.sh` cross-file block with a second regex for bare shared-substrate refs `([a-z][a-z0-9-]*\.md)#[A-Za-z0-9_-]+` where the named .md file resolves inside the scanned skill's own plugin (e.g. `skills/_shared/**/<file>.md`), validating the anchor against that file's `{#…}` headings; skip refs whose file doesn't resolve locally (avoids false positives on prose mentions of external docs). Sequenced like C3: repo-root lint change ships and goes green repo-wide BEFORE the gamekit sweep relies on it; until then the grep assertion in (i) is the gate.
- Rationale: The finding is exactly right — the proposal's anti-drift mechanism (slug-first cites) shipped with a vacuous backstop, recreating the unchecked-reference class it was meant to kill. A typo'd slug or a future `{#no-persistence}` rename would silently orphan 7 cites. The claim must either be true (extend the lint) or not made (name the manual check); we do both, sequenced.
- Blast radius: (i) none — proposal text + a post-sweep verification command. (ii) repo-root `tools/lint-phase-refs.sh` — shared by ALL plugins, so the new regex must be run repo-wide before merge to prove no pre-existing bare `.md#slug` refs in other plugins go red (if any do, they are either real dangling cites — fix — or out-of-scope prose — the resolve-locally guard exempts them); the frozen inline non-interactive block exemption already in the lint is untouched; CI `.github/workflows/skill-hygiene.yml` unchanged. Needs toolkit/repo-owner sign-off like C3.

### pmos-gamekit-cross-F8 — Accepted
- Fix: `plugins/pmos-gamekit/skills/sudoku/SKILL.md:3` · frontmatter description · drop the unqualified "do a number puzzle" trigger; keep/strengthen the grid-logic framing (e.g. "solve a logic grid puzzle, take a break with a logic puzzle"). `2048/SKILL.md:3` keeps "take a break with a number-puzzle game" and "tile-sliding puzzle" unchanged — 2048 is the number-manipulation game; sudoku is the logic/grid game. Additionally, C4 is generalized: as part of the same edit, sweep all 7 frontmatter descriptions pairwise for unqualified generic genre claims (cards, number puzzle, arcade, etc.) so the partition principle is applied plugin-wide once, not per-finding.
- Rationale: Same defect class as F4 with the same remedy shape; fixing only the cards pair leaves the router ambiguity alive for "give me a number puzzle". The pairwise sweep prevents a third round of this finding when the next game ships.
- Blast radius: sudoku frontmatter (possibly one or two other descriptions if the sweep finds further collisions); description-only edits, no lints/evals/tests.

### pmos-gamekit-cross-F9 — Accepted
- Fix: C1's sanctioned-inline boundary is amended to classify the step-3 sentence explicitly, in all 7 skills' Phase-0 step 3. Before: "The launcher binds a free ephemeral port on `127.0.0.1`, prints `Game ready at http://127.0.0.1:<port>/`, and auto-opens your default browser. If the browser does not open (headless), open the printed URL manually." After intent: keep the two OPERATOR-facing parts — the expected report line (`Game ready at http://127.0.0.1:<port>/`, needed to know what to relay in step 4) and the headless fallback instruction (an executable step, sanctioned inline) — and delete the mechanics prose ("binds a free ephemeral port on `127.0.0.1`", "auto-opens your default browser" as explanation), replacing it with the cite "port selection and browser-open behavior per `game-launcher.md#port` / `game-launcher.md#open-matrix`" (both anchors verified present at game-launcher.md:84 and :73). C1(a)'s "ephemeral-port mechanics … live ONLY here" and C1(b)'s "keep the report line" are thereby reconciled: report line = the literal expected-output string + relay instruction; mechanics = why/how the port and open happen, which is cite-only.
- Rationale: The reviewer is right that C1's two halves gave contradictory instructions for this exact sentence — an implementer keeping it whole would preserve the 7-way duplication C1 targets. The boundary rule that resolves it: text the operator must SEE or DO stays inline; text that EXPLAINS launcher behavior is cite-only.
- Blast radius: folds into the existing C1/C2 8-file gamekit sweep; adds 2 cited anchors (#port, #open-matrix) to the F7 grep assertion's slug set; no heading changes in game-launcher.md; no scripts/tests.

**Author verdict pass 2:** 3/3 accepted (0 rejected, 0 invalid). Cumulative: 9/9 accepted across both passes. Unit is CAPPED at pass 2; no unresolved disagreements — the only open items are cross-plugin sign-offs (C3 lint marker, C7 lint regex extension), recorded as Open questions in the proposal.

## Pass 1 — author response (re-run confirmation, 2026-07-13)

This author run was dispatched as pass 1, but the scratchpad already carries completed author responses for passes 1 and 2 and the cumulative proposal exists. Per protocol, every finding was re-spot-checked against the live files before adopting the standing dispositions; nothing is silently dropped. All groundings re-confirmed this run:

### pmos-gamekit-cross-F1 — Accepted (unchanged, C1)
- Fix: as recorded in C1 — narrow game-launcher.md:5's "never restates" claim to sanction the inline 4-step launch runbook; convert restated facts/rationale in all 7 SKILL.md files to slug cites. Grounding re-verified: "never restates" present at game-launcher.md:5.
- Rationale/blast radius: unchanged from prior pass-1 response.

### pmos-gamekit-cross-F2 — Accepted (unchanged, C2)
- Fix: uniform "Per `game-launcher.md#no-persistence` (D6)" sentence across 7 skills. Re-verified: poker/SKILL.md:110 "Per D7 the game keeps **no save state**" (D7 = bundling at game-launcher.md:19); snake/SKILL.md:100 "Per D9 the game keeps" (no D9 in game-launcher.md); `{#no-persistence}` anchor confirmed at game-launcher.md:106.
- Rationale/blast radius: unchanged; verification claim corrected per F7/C7.

### pmos-gamekit-cross-F3 — Accepted (unchanged, C3 — cross-plugin, sequenced)
- Fix: `prompt-free` W14 exemption marker in pmos-toolkit's lint + docs/rubric first, then delete the ~28-line dead block from all 7 gamekit skills. Re-verified: solitaire/SKILL.md:34-35 "inlined only to satisfy the repo-wide W14 lint; no checkpoint ever fires." (wraps across two lines).
- Rationale/blast radius: unchanged; toolkit-owner sign-off remains the open dependency.

### pmos-gamekit-cross-F4 — Accepted (unchanged, C4)
- Fix: solitaire description "I want to play cards" → "play a solo card game". Re-verified at solitaire/SKILL.md:3.
- Blast radius: frontmatter only.

### pmos-gamekit-cross-F5 — Accepted (unchanged, C5)
- Fix: charter row count+list of all 7 games; plugin.json keywords add the other six titles (no version touch, no codex keywords field, no marketplace.json edits).
- Blast radius: root CLAUDE.md + gamekit .claude-plugin/plugin.json.

### pmos-gamekit-cross-F6 — Accepted (unchanged, C6)
- Fix: flappy-bird/SKILL.md:107 "discards the board" → "discards the run". Re-verified present at :107.
- Blast radius: one line.

### pmos-gamekit-cross-F7 — Accepted (unchanged, C7)
- Fix: withdraw C2's vacuous lint-coverage claim; mandatory post-sweep grep assertion (cite→anchor direction) now, bare-`.md#slug` regex extension to tools/lint-phase-refs.sh as durable backstop. Re-verified: lint-phase-refs.sh:253 regex matches only `<skill>/SKILL.md#slug`; all four target anchors (`#open-matrix`:73, `#port`:84, `#node-prereq`:91, `#no-persistence`:106) exist.
- Blast radius: repo-root lint — needs repo-wide green run + owner sign-off.

### pmos-gamekit-cross-F8 — Accepted (unchanged, C8)
- Fix: sudoku drops unqualified "do a number puzzle" (re-verified at sudoku/SKILL.md:3); pairwise partition sweep of all 7 descriptions.
- Blast radius: description-only edits.

### pmos-gamekit-cross-F9 — Accepted (unchanged, C9)
- Fix: SEE/DO-vs-EXPLAIN boundary rule; step-3 keeps report line + headless fallback, mechanics prose becomes `#port`/`#open-matrix` cites.
- Blast radius: folds into the C1/C2 sweep.

**Re-run verdict:** 9/9 accepted, 0 rejected, 0 invalid — standing dispositions adopted unchanged after full grounding re-verification. Unit remains CAPPED (pass 2); cumulative proposal rewritten in place.
