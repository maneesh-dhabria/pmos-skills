# Proposal — pmos-gamekit__flappy-bird

**Unit:** `plugins/pmos-gamekit/skills/flappy-bird/` (SKILL.md, game/flappy-bird.html, tests/run.mjs)
**Status:** CAPPED (pass 2 of 2 complete — reviewer passes 1–2 + author responses 1–2; pass-1 dispositions independently re-verified 2026-07-13 against the files — all 4 quotes grounded verbatim, all 4 verdicts confirmed, none reversed)
**Score:** 7 findings → 7 accepted, 0 rejected, 0 invalid. Nothing implemented; this document describes intended changes only.

## Findings table

| ID | Severity | Title | Disposition |
|---|---|---|---|
| flappy-bird-F1 | Should-fix | Session best silently lost on mid-run restart (R/N) | Accepted → C1 |
| flappy-bird-F2 | Should-fix | Dead ~29-line non-interactive block in a prompt-free skill; lint lacks a `prompt-free` exemption class | Accepted → C2 (cross-unit; ordered rollout) |
| flappy-bird-F3 | Nit | Shipped artifact cites `02_design.html`, unresolvable from the artifact | Accepted → C3 |
| flappy-bird-F4 | Nit | Test-hook comment advertises a Playwright e2e that does not exist | Accepted → C4 |
| flappy-bird-F5 | Should-fix | Pass-1 C2 marker text embedded a literal `AskUserQuestion` token that `audit-recommended.sh` would flag as an unmarked prompt | Accepted → C2 amended (pass 2) |
| flappy-bird-F6 | Nit | Pass-1 C1's "optional selftest addition" cannot cover the UI-layer fix and breaks `--selftest` if added naively | Accepted → C1 amended (pass 2) |
| flappy-bird-F7 | Nit | User-facing report step says closing the tab "discards the board" — Flappy Bird has no board | Accepted → C5 (new, pass 2) |

## Accepted changes (full detail)

### C1 — Fold live best into `sessionBest` on every restart path (F1 Should-fix; verification amended per F6 Nit)
- **File:** `plugins/pmos-gamekit/skills/flappy-bird/game/flappy-bird.html`
- **Sections:** UI layer `newGame()` (line 476ff) and `window.__FLAPPY_TEST__.newGame` (~line 828).
- **Before:** both restart paths immediately call `E.createState({ … best: sessionBest })` (lines 481 and 828); `sessionBest` is synced from the run only in `onOver()` (line 528 `if (sb > sessionBest) sessionBest = sb;`). The engine tracks live best during play (line 319 `if (state.score > state.best) state.best = state.score;`), and R/N keys (keydown handler, line 809 `e.preventDefault(); newGame();`) call `newGame()` mid-run — so a new record achieved and then restarted before death is discarded, and the HUD's BEST (`Math.max(sessionBest, state ? state.best : 0)`, line 502) visibly regresses.
- **After (intent):** first statement of both `newGame()` bodies becomes a fold: if a state exists and `state.best > sessionBest`, set `sessionBest = state.best` — then proceed unchanged. The fresh state then seeds from the true maximum and the HUD never regresses.
- **Rationale:** the engine already does the right thing (selftest gates "scoring: best updates with the score", tests/run.mjs:164); only the UI restart path drops it. One-line fix per path; applying the same fold in the test hook keeps the real and test-hook restart paths behaviorally identical. Pass-2 review confirmed the two-path fold is behaviorally complete — no third restart path exists (Space/click restart only fires while an overlay is shown, never mid-run).
- **Verification (amended per F6):** manual browser spot-check ONLY — score a record, press R mid-run, confirm BEST holds; repeat via `__FLAPPY_TEST__.newGame`. Do NOT add a selftest check for this: tests/run.mjs vm-extracts only the engine `<script>` block (line 23 `const engineSrc = blocks.find(b => /root\.FlappyEngine\s*=/.test(b));`), so the UI-layer `newGame()` bodies are structurally unreachable — an engine-surface "test" would pass pre-fix (false coverage) — and any added `check()` without bumping `const EXPECTED_CHECKS = 65;` (line 15) turns `node tests/run.mjs --selftest` red (count gate at lines 305–306). If automation is ever wanted, it must be a browser-context drive against `window.__FLAPPY_TEST__`, with run.mjs not involved.
- **Blast radius:** one HTML file, two functions. `tests/run.mjs` explicitly NOT touched. No other skill/substrate/lint/eval reads this file.

### C2 — Introduce a `prompt-free` W14 exemption class; drop the dead block from this skill (F2 Should-fix; amended per F5 Should-fix)
- **Cross-unit, strictly ordered — steps 1–2 live in pmos-toolkit and must land (their own story/release, routed via `/skill-sdlc --from-feedback`) before step 3. Landing step 3 first turns the lint red — do not reorder.**
- **Step 1 — pmos-toolkit tooling (lint + audit together, same story):**
  - `plugins/pmos-toolkit/tools/lint-non-interactive-inline.sh` (~line 53 and header comments lines 7–23): extend the self-documenting exemption regex from `<!-- non-interactive: (refused|delegated)` to also accept `prompt-free`, documented as "skill issues zero prompts; no checkpoint can ever fire" — consistent with the script's stated principle that exemptions are markers in the skill file, never a hidden allowlist.
  - **(F5 amendment)** `plugins/pmos-toolkit/tools/audit-recommended.sh` line 88: extend the exemption grep from `<!-- non-interactive: refused` to `<!-- non-interactive: (refused|prompt-free)`, with a header note that `delegated` skills own no prompts of their own and are audited as today. This makes the marker class safe even for a skill whose marker prose mentions the tool name.
- **Step 2 — `plugins/pmos-toolkit/skills/_shared/non-interactive.md` + repo CLAUDE.md "Non-interactive contract (W14 posture)" bullet:** add `prompt-free` to the documented exemption classes. Pass-2 review confirmed the skill-eval rubric needs NO change: `skill-eval-check.sh` has zero matches for `non-interactive|refused|delegated`, and `skill-eval.md` mentions the block only once as an example (line 261).
- **Step 3 — this unit's `plugins/pmos-gamekit/skills/flappy-bird/SKILL.md`:** delete the frozen block (lines 47–75, `<!-- non-interactive-block:start -->` … `:end`) and the Platform Adaptation sentence at lines 36–38 ("The non-interactive contract block below is inlined only to satisfy the repo-wide W14 lint; no checkpoint ever fires."). Replace both with one marker line, **(F5 amendment) worded WITHOUT the literal tool-name token** so no skip-regex or exemption gap can bite: `<!-- non-interactive: prompt-free — launch-only game; zero prompts, all interaction (difficulty/pause/restart) is in-game controls -->`.
- **Rationale (F2):** the skill self-declares the block dead (SKILL.md:37); it is ~29 of ~74 body lines — pure context tax on every `/flappy-bird` invocation, replicated across every gamekit launch skill. FR-08 (pre-rollout BC) already defines correct behavior for a block-less skill receiving `--non-interactive`: warn + fall back to interactive — a no-op for a skill with zero prompts. `game-launcher.md#launch-contract` explicitly delegates this decision to the lint ("decided by `lint-non-interactive-inline.sh`, not here"), so it needs no edit (optional one-line pointer to the new class is a nice-to-have).
- **Rationale (F5):** the pass-1 marker text ("zero AskUserQuestion call sites") matched neither `SKIP_DEGRADATION_RE` (audit-recommended.sh:71, requires the `- **No \`AskUserQuestion\` tool:**` bullet shape) nor `SKIP_NEGATIVE_RE` (line 72, requires the word "no", not "zero"), and the line-88 exemption grep recognized only `refused` — so implementing pass-1 C2 verbatim would have made `audit-recommended.sh <SKILL.md>` exit 1 exactly when a skill-eval / route:skill / release gate passes the file explicitly. Fixed belt-and-suspenders: reworded marker (sufficient alone for this unit) + audit exemption extension (safe for future prompt-free skills).
- **Blast radius:** pmos-toolkit lint + audit script + `_shared/non-interactive.md` + CLAUDE.md W14 bullet (substrate/policy change → own story + release); then all 7 gamekit launch skills (2048, flappy-bird, snake, solitaire, sudoku, tetris, poker) can adopt the marker — this proposal only commits flappy-bird; siblings ride the same story or a follow-up sweep. No existing skill's audit result changes (`refused` behavior untouched; new class is additive).

### C3 — Make the design-doc cite resolvable (F3, Nit)
- **File:** `plugins/pmos-gamekit/skills/flappy-bird/game/flappy-bird.html`, engine banner comment line 332.
- **Before:** "seedable, and selftested. See 02_design.html #data-model / #picker." — `02_design.html` ships nowhere in the skill directory; the artifact is a self-contained single file (D7) and the reference dangles for any reader of the shipped file.
- **After (intent):** cite the real repo location with an explicit not-bundled note: "Design rationale (repo, not bundled): docs/pmos/features/2026-06-24_flappy-bird-variety/02_design.html (#data-model / #picker)." Pass-2 review confirmed the doc exists at that path AND carries both `id="data-model"` and `id="picker"` anchors.
- **Blast radius:** one comment line; no runtime/test/lint effect.

### C4 — Correct the test-hook consumer claim (F4, Nit)
- **File:** `plugins/pmos-gamekit/skills/flappy-bird/game/flappy-bird.html`, banner comment line 818.
- **Before:** "/* -- test hook: deterministic drive for the Playwright e2e --------------- */" — no Playwright e2e exists in the unit; only `tests/run.mjs` (headless vm selftest) ships, matching `game-launcher.md#layout`.
- **After (intent):** reword to state the truth: the hook is a deterministic drive surface for browser-automation e2e in general; no e2e is bundled — only the headless selftest — and `window.__FLAPPY_TEST__` is the stable surface for any external browser drive. The hook's API is unchanged.
- **Blast radius:** one comment; out-of-repo automation using the hook keeps working. Pass-2 review confirmed no consumers exist.

### C5 — Fix "discards the board" copy-drift in the player-facing report text (F7, Nit)
- **File:** `plugins/pmos-gamekit/skills/flappy-bird/SKILL.md`, Phase 0 step 4 report text, lines 106–107.
- **Before:** "closing the tab discards the board (the session best resets too)" — copy-drift from a board-game sibling (solitaire/2048 phrasing); Flappy Bird has a run and a session best, not a board; and this sentence is relayed to the player verbatim.
- **After (intent):** one-word reword: "closing the tab discards the run (the session best resets too)".
- **Blast radius:** one word in one SKILL.md line, outside the frozen non-interactive block; no lint/eval reads this prose. Compatible with C2 step 3 (same file, disjoint lines).

## Rejections

None. All seven findings across both passes were grounded (quotes verified at the cited lines — F7's quote spans a line wrap at SKILL.md:106–107 but is verbatim) and accepted. The 2026-07-13 re-verification re-checked all four pass-1 quotes against the current files and confirmed every disposition; no finding was invalid/ungrounded.

## Open questions

None — no unresolved disagreements. All pass-2 findings were accepted and folded into the cumulative changes above. The only sequencing constraint an implementer must honor: C2 steps 1–2 (pmos-toolkit) MUST ship before C2 step 3 (this unit's SKILL.md), or `lint-non-interactive-inline.sh` goes red.
