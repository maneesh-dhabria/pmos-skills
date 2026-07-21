# Proposal — pmos-gamekit__cross

- **Unit:** pmos-gamekit__cross (whole plugin: `plugins/pmos-gamekit/skills/` — 7 game skills + `_shared/game-launcher/`)
- **Status:** CAPPED (pass 2 — hard cap reached). Passes: reviewer 1 → author 1 → reviewer 2 → author 2 → author re-run confirmation (2026-07-13, all groundings re-verified against live files). All 9 findings dispositioned.
- **Nothing implemented.** Every change below is described, not applied. The repo is untouched.

## Findings ledger

| ID | Severity | Disposition |
|---|---|---|
| pmos-gamekit-cross-F1 | Should-fix | Accepted (C1; boundary refined by F9) |
| pmos-gamekit-cross-F2 | Should-fix | Accepted (C2; verification claim corrected by F7) |
| pmos-gamekit-cross-F3 | Should-fix | Accepted (C3 — cross-plugin; sequenced: toolkit lint first, gamekit deletion second) |
| pmos-gamekit-cross-F4 | Nit | Accepted (C4; generalized plugin-wide by F8) |
| pmos-gamekit-cross-F5 | Nit | Accepted (C5) |
| pmos-gamekit-cross-F6 | Nit | Accepted (C6) |
| pmos-gamekit-cross-F7 | Should-fix | Accepted (C7 — corrects C2's vacuous lint claim; adds real backstop) |
| pmos-gamekit-cross-F8 | Nit | Accepted (C8 — extends C4 plugin-wide) |
| pmos-gamekit-cross-F9 | Nit | Accepted (C9 — resolves C1's ambiguous inline boundary) |

9/9 accepted · 0 rejected · 0 invalid. Every quote re-verified against live files before acceptance, and re-verified again on the 2026-07-13 author re-run (poker:110 D7, snake:100 D9, solitaire:34-35 W14 admission, flappy-bird:107 "board", sudoku:3 "number puzzle", lint-phase-refs.sh:253 regex, and all four game-launcher.md anchors at :73/:84/:91/:106 — all confirmed present as cited; see scratchpad).

---

## Accepted changes (full detail)

### C1 — Narrow the canonical home's "never restates" claim; shrink restated facts to slug cites (F1, Should-fix; boundary refined by C9/F9)

**Finding:** `_shared/game-launcher/game-launcher.md:5` claims consumers "never restate… the bundling rule, the launch contract, the platform-open matrix, or the no-persistence rule", yet all 7 game SKILL.md Phase-0 blocks restate the launch steps and the no-persistence rule (e.g. `solitaire/SKILL.md:86-101`), and Platform-Adaptation blocks restate the file://-vs-server nuance. A §K one-fact-one-home violation whose copies have already diverged (F2, F6).

**Change (before → after intent):**
- (a) `plugins/pmos-gamekit/skills/_shared/game-launcher/game-launcher.md` · intro paragraph (lines 3–6): replace the false absolute "it never restates the bundling rule, the launch contract, the platform-open matrix, or the no-persistence rule below" with a narrowed claim — consumers state their own deltas **plus the concrete 4-step launch invocation** (the skill's executable runbook, sanctioned inline); the rationale prose, the platform-open matrix, the ephemeral-port mechanics, the Node-error text, and the no-persistence rationale live ONLY in game-launcher.md and are cited by slug, never re-explained.
- (b) All 7 `plugins/pmos-gamekit/skills/<game>/SKILL.md` · Phase 0 + Platform Adaptation: keep the executable steps (path resolve, `node --version` assert, launch command, report line); convert every restated *fact/rationale* into a slug cite — the Node-error emission already cites `game-launcher.md#node-prereq` (keep); the no-persistence sentence becomes C2's uniform one-liner; the Platform-Adaptation file:// nuance trims to "the launch contract uses the server — see `game-launcher.md#node-prereq` (D2)" with no re-explanation.
- **Boundary rule (from C9, resolving the F9 ambiguity):** text the operator must SEE or DO stays inline (expected-output strings, fallback instructions); text that EXPLAINS launcher behavior is cite-only. See C9 for the concrete application to the step-3 port/auto-open sentence.

**Rationale:** A launch-only skill's body IS its runbook, so a bare cite for the steps would force a substrate read just to launch — narrow the canonical claim to match the sanctioned inline surface and de-duplicate the *facts*, so a future launcher change touches one file. Observed drift (F2, F6) proves the current shape doesn't hold.

**Blast radius:** game-launcher.md + all 7 game SKILL.md files. Cited anchors `#node-prereq`, `#no-persistence`, `#port`, `#open-matrix` all already exist in game-launcher.md; no heading changes. **Note (per F7): `tools/lint-phase-refs.sh` does NOT currently validate `game-launcher.md#slug` cites — verification is the C7 grep assertion until the C7 lint extension ships.** skill-eval §K/§J checks unaffected or improved. No scripts/tests touched.

### C2 — One id, one slug for the no-persistence rule across all 7 skills (F2, Should-fix; verification corrected by C7/F7)

**Finding:** The no-persistence rule is cited under four id namespaces: solitaire/sudoku say D6 (matches `game-launcher.md:106` "## No persistence (D6) {#no-persistence}"), `poker/SKILL.md:110` says **D7** — which in the canonical home is the *bundling* convention (`game-launcher.md:19`), an actively misleading cross-reference — `snake/SKILL.md:100` says **D9**, which resolves nowhere in game-launcher.md, and 2048/flappy-bird/tetris say "per the launch contract" (also not where the rule lives).

**Change:** Uniform sentence in all 7 SKILL.md files: "Per `game-launcher.md#no-persistence` (D6) the game keeps **no save state** — …" (game-appropriate tail: hand/board/run/grid). Concretely: poker "Per D7" → slug+D6; snake "Per D9" → slug+D6; solitaire/sudoku add the slug to their existing D6; 2048/flappy-bird/tetris replace "per the launch contract" with slug+D6. Also sweep each skill's Capture-Learnings phase for second occurrences of the same id and normalize.

**Rationale:** The SKILL.md files name game-launcher.md as the §K canonical home, so bare ids must resolve *there*. Slug-first citation per repo §J anchor discipline is renumber-proof; keeping "(D6)" preserves the decision-log breadcrumb.

**Blast radius:** 7 SKILL.md one-to-two-line edits. **Correction (F7): the earlier claim that `lint-phase-refs.sh` validates these cites is WITHDRAWN — its cross-file regex matches only `<skill>/SKILL.md#slug`, so `game-launcher.md#slug` passes vacuously. Verification is the C7 grep assertion (mandatory post-sweep), plus the C7 lint extension as the durable backstop.** No evals/tests.

### C3 — Add a `prompt-free` W14 exemption marker to the lint; delete the ~28-line dead block from all 7 skills (F3, Should-fix — CROSS-PLUGIN, SEQUENCED)

**Finding:** All 7 skills are launch-only and prompt-free by contract (`game-launcher.md:48` "A game skill's body is **launch-only** — no `AskUserQuestion`, no generation."), yet each inlines the full frozen non-interactive block — ~26% of each body — and self-documents it as lint appeasement (`solitaire/SKILL.md:34-35` "inlined only to satisfy the repo-wide W14 lint; no checkpoint ever fires."). The existing exemption markers (`refused`, `delegated`) don't fit a prompt-free skill; the lint contract is missing a third marker. Verified: each SKILL.md's 3 `AskUserQuestion` mentions are the frozen block itself plus negative Platform-Adaptation prose — no real prompt exists in any of the 7.

**Change (order matters — (a)–(c) ship in pmos-toolkit FIRST, (d) in gamekit SECOND, else the lint goes red across the plugin):**
- (a) `plugins/pmos-toolkit/tools/lint-non-interactive-inline.sh` · exemption grep (~line 55): extend `(refused|delegated)` → `(refused|delegated|prompt-free)`, and add a verify-guard — a `prompt-free`-marked SKILL.md that contains a real `AskUserQuestion` call site FAILS the lint (reuse audit-recommended's two provably-never-a-prompt line-shape exclusions so the canonical Platform-Adaptation degradation bullet and negative prose don't false-positive). The marker is a claim the lint verifies, not a bypass. Update the script's header-comment exemption inventory.
- (b) Root `CLAUDE.md` · "Skill-authoring conventions" non-interactive bullet: document the third self-documenting marker `<!-- non-interactive: prompt-free — issues no prompts; no checkpoint can fire -->` alongside refused/delegated.
- (c) pmos-toolkit `skill-patterns.md` + `skill-eval.md` (and `skills/_shared/non-interactive.md` prose if it enumerates exemptions): add the third marker wherever the exemption pair is enumerated; grep and update any count-claims (per the repo's [J]-gate count-drift lesson), keeping `skill-eval-check.sh --selftest` count assertions consistent.
- (d) All 7 `plugins/pmos-gamekit/skills/<game>/SKILL.md`: delete the frozen block + the "inlined only to satisfy the repo-wide W14 lint" admission; replace with the `prompt-free` marker. `game-launcher.md:57-58`'s punt sentence ("decided by `lint-non-interactive-inline.sh`, not here") updates to name the marker.

**Rationale:** Repo policy already scopes the frozen block to skills "that issue prompts"; the lint's missing exemption is the defect, not the skills. Removes ~200 dead context lines plugin-wide; the verify-guard keeps the marker honest if a skill later grows a prompt.

**Blast radius:** pmos-toolkit: `tools/lint-non-interactive-inline.sh` (+ any selftest), root CLAUDE.md, `skills/_shared/non-interactive.md` prose, `skill-patterns.md`, `skill-eval.md` (+ `skill-eval-check.sh --selftest` counts); CI `.github/workflows/skill-hygiene.yml` unchanged. pmos-gamekit: 7 SKILL.md files + game-launcher.md. Requires pmos-toolkit-owner sign-off; two-release sequencing as above.

### C4 — De-collide solitaire's generic "I want to play cards" trigger (F4, Nit; generalized by C8/F8)

**Finding:** `solitaire/SKILL.md:3` claims the unqualified "I want to play cards" while `poker/SKILL.md:3` also claims card-play ("play cards against bots") — routing for a generic card request now biases to solitaire even when poker is meant.

**Change:** `plugins/pmos-gamekit/skills/solitaire/SKILL.md` · frontmatter description: replace `"I want to play cards"` → `"play a solo card game"`. Poker's description is already bot-qualified and stays as-is. See C8 for the plugin-wide generalization of this partition sweep.

**Rationale:** Solo-vs-bots qualification restores a clean trigger partition post-poker.

**Blast radius:** solitaire frontmatter only; no lints/evals (description-only edit).

### C5 — Charter Holds column + plugin.json keywords enumerate all 7 games (F5, Nit)

**Finding:** Root `CLAUDE.md:14` charter row ends "…zero-dependency local server (solitaire)." and `plugins/pmos-gamekit/.claude-plugin/plugin.json` keywords list only `game, solitaire, klondike, casual, browser, single-player, offline` — 1 of 7 games advertised on both the membership-test surface and the marketplace-discovery surface.

**Change:**
- (a) Root `CLAUDE.md` charter table, pmos-gamekit row: replace "(solitaire)" with the full count+list "(7 games: solitaire, poker, snake, tetris, 2048, sudoku, flappy-bird)" — the count+list pairing lets the next [J] gate check count-vs-set (a bare "e.g." form stays drift-prone).
- (b) `plugins/pmos-gamekit/.claude-plugin/plugin.json` keywords: add "poker", "snake", "tetris", "2048", "sudoku", "flappy-bird" alongside the existing entries. Verified: `.codex-plugin/plugin.json` carries NO keywords field, so no codex-side edit; keywords only — NOT version, and no marketplace.json edits per the manifest-sync policy.

**Rationale:** Both surfaces are what routers/humans consult; advertising 1 of 7 under-serves discovery and is the enumerated-set drift the repo's own [J] lesson flags. Maintenance cost of future-game additions is accepted, mitigated by count+list.

**Blast radius:** root CLAUDE.md (no lint reads the charter), gamekit `.claude-plugin/plugin.json`. Nothing else.

### C6 — Fix flappy-bird copy-paste residue "discards the board" (F6, Nit)

**Finding:** `flappy-bird/SKILL.md:107` "closing the tab discards the board (the session best resets too)" — "board" is residue templated from 2048 (`2048/SKILL.md:100`, where it's correct); Flappy Bird has a run/score, no board.

**Change:** `plugins/pmos-gamekit/skills/flappy-bird/SKILL.md:107`: "discards the board" → "discards the run". Folds into the C2 uniform-sentence sweep.

**Rationale:** Correctness of the visible copy; symptom of the F1 duplication that C1/C2 address structurally.

**Blast radius:** one line in flappy-bird SKILL.md.

### C7 — Replace C2's vacuous lint claim with a real verification: grep assertion now, lint extension as durable backstop (F7, Should-fix)

**Finding (verified twice):** `tools/lint-phase-refs.sh:253` — `while (match(rest, /[a-z][a-z0-9-]*\/SKILL\.md#[A-Za-z0-9_-]+/) > 0) {` — the cross-file ref regex matches ONLY the `<skill>/SKILL.md#slug` shape. A cite of the form `game-launcher.md#no-persistence` (and the 7 existing `game-launcher.md#node-prereq` cites) never enters the check and passes vacuously. So the C1/C2 slug-first anti-drift mechanism had NO lint backstop: a typo'd slug or a future `{#no-persistence}` rename would silently orphan every cite — exactly the drift class C2 exists to kill.

**Change:**
- (i) **Proposal correction + immediate gate:** the C2 blast-radius claim "`lint-phase-refs.sh` validates the … cites" is withdrawn (already struck in C1/C2 above). The gamekit sweep's mandatory post-edit verification becomes an explicit grep assertion: extract every `game-launcher\.md#[A-Za-z0-9_-]+` ref from the 7 SKILL.md files and assert each cited slug appears as `{#<slug>}` in `_shared/game-launcher/game-launcher.md`; fail the sweep on any miss. Slug set after the full sweep: `#node-prereq`, `#no-persistence`, `#port`, `#open-matrix` (all verified present at game-launcher.md:91, :106, :84, :73).
- (ii) **Durable backstop (toolkit/repo-side, sequenced like C3):** extend `tools/lint-phase-refs.sh`'s cross-file block with a second regex for bare shared-substrate refs `([a-z][a-z0-9-]*\.md)#[A-Za-z0-9_-]+` where the named .md file resolves inside the scanned skill's own plugin (e.g. under `skills/_shared/**`), validating the anchor against that file's `{#…}` headings; refs whose file doesn't resolve locally are skipped (avoids false positives on prose mentions of external docs). Run repo-wide before merge to prove no pre-existing bare `.md#slug` refs elsewhere go red — any that do are either real dangling cites (fix) or exempted by the resolve-locally guard.

**Rationale:** The anti-drift mechanism must either be lint-backed (extend the lint) or honestly manual (name the check); this does both, sequenced so the grep assertion gates the sweep until the lint extension ships.

**Blast radius:** (i) proposal text + one post-sweep verification command — nothing in-repo. (ii) repo-root `tools/lint-phase-refs.sh` — shared by ALL plugins; the frozen inline non-interactive block exemption in the lint is untouched; CI `.github/workflows/skill-hygiene.yml` unchanged. Needs repo-owner sign-off like C3.

### C8 — Apply the trigger-partition principle plugin-wide: sudoku vs 2048 "number puzzle" collision (F8, Nit)

**Finding (verified twice):** `sudoku/SKILL.md:3` claims the unqualified "do a number puzzle" while `2048/SKILL.md:3` claims "take a break with a number-puzzle game … 'I want a tile-sliding puzzle'". A generic "give me a number puzzle" routes ambiguously between the two — the same defect class C4 fixed for the cards pair.

**Change:** `plugins/pmos-gamekit/skills/sudoku/SKILL.md:3` · frontmatter description: drop the unqualified "do a number puzzle"; keep/strengthen the grid-logic framing (e.g. "solve a logic grid puzzle, take a break with a logic puzzle"). `2048/SKILL.md:3` keeps "number-puzzle game" and "tile-sliding puzzle" unchanged — 2048 is the number-manipulation game, sudoku the logic/grid game. **Generalization of C4:** as part of the same edit, sweep all 7 frontmatter descriptions pairwise for unqualified generic genre claims (cards, number puzzle, arcade, etc.) so the partition principle is applied plugin-wide once.

**Rationale:** Fixing only the cards pair leaves the identical router ambiguity alive elsewhere; the pairwise sweep prevents a third round of this finding when the next game ships.

**Blast radius:** sudoku frontmatter (plus any further collisions the sweep surfaces); description-only edits, no lints/evals/tests.

### C9 — Classify the step-3 port/auto-open sentence explicitly; reconcile C1's two halves (F9, Nit)

**Finding (verified twice):** `solitaire/SKILL.md:93` (same shape in all 7 skills' Phase-0 step 3): "The launcher binds a free ephemeral port on `127.0.0.1`, prints `Game ready at http://127.0.0.1:<port>/`, and auto-opens your default browser. If the browser does not open (headless), open the printed URL manually." C1(a) reserved ephemeral-port mechanics for the canonical home while C1(b) said to keep the executable steps — contradictory instructions for this exact sentence, implementable both ways.

**Change:** In all 7 skills' Phase-0 step 3 — keep the two OPERATOR-facing parts: the expected report line (`Game ready at http://127.0.0.1:<port>/`, needed to know what to relay in step 4) and the headless fallback instruction (an executable step, sanctioned inline). Delete the mechanics prose ("binds a free ephemeral port on `127.0.0.1`", "auto-opens your default browser" as explanation), replacing it with the cite "port selection and browser-open behavior per `game-launcher.md#port` / `game-launcher.md#open-matrix`" (anchors verified at game-launcher.md:84 and :73). **Boundary rule now stated in C1:** text the operator must SEE or DO stays inline; text that EXPLAINS launcher behavior is cite-only.

**Rationale:** Removes the ambiguity that would let an implementer preserve the 7-way duplication C1 targets; the SEE/DO-vs-EXPLAIN rule is a reusable classifier for any future sentence.

**Blast radius:** folds into the C1/C2 8-file gamekit sweep; adds `#port` and `#open-matrix` to the C7 grep assertion's slug set; no heading changes in game-launcher.md; no scripts/tests.

---

## Rejections

None — all 9 findings across both passes were grounded and accepted.

## Open questions

No unresolved disagreements between reviewer and author — 9/9 accepted. The following items are open only in that they require sign-off outside this unit's ownership:

1. **C3 (a)–(c)** — the `prompt-free` W14 exemption marker changes pmos-toolkit's `lint-non-interactive-inline.sh`, root CLAUDE.md, `skill-patterns.md`, and `skill-eval.md`. Needs pmos-toolkit-owner sign-off and must ship BEFORE the gamekit block deletion (C3(d)), else the lint goes red across the plugin.
2. **C7 (ii)** — the bare-`.md#slug` regex extension to repo-root `tools/lint-phase-refs.sh` affects all plugins and needs a repo-wide green run before merge. Until it ships, the C7 (i) grep assertion is the mandatory sweep gate.

## Implementation sequencing (for whoever applies this)

1. C3(a)–(c) in pmos-toolkit (lint + docs + rubric) and C7(ii) in repo-root tools; verify green repo-wide.
2. C1 + C2 + C3(d) + C6 + C9 as one gamekit 8-file sweep (game-launcher.md + 7 SKILL.md); run the C7(i) grep assertion (mandatory — `lint-phase-refs.sh` does not cover `game-launcher.md#slug` cites until C7(ii) lands), then `lint-phase-refs.sh`, `lint-flags-vs-hints.sh`, `lint-non-interactive-inline.sh`, `audit-recommended.sh`.
3. C4 + C8 (frontmatter description partition sweep across all 7 skills) and C5 (charter + keywords) any time; C5's plugin.json edit must NOT touch `version`.
