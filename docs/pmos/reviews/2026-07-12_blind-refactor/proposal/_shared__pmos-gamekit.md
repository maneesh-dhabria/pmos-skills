# Proposal — pmos-gamekit__shared (blind refactor review 2026-07-12)

**Unit:** `plugins/pmos-gamekit/skills/_shared/game-launcher/` (3 files: `game-launcher.md`, `serve.js`, `serve.test.mjs`; ~355 lines). Consumers: all 7 game skills (2048, flappy-bird, poker, snake, solitaire, sudoku, tetris) cite `../_shared/game-launcher/game-launcher.md` and invoke `serve.js`.

**Status: CAPPED (pass 2 — hard cap reached).** Pass 1: findings F1–F4, all accepted. Pass 2: findings F5–F8, all accepted. Cumulative: 8/8 accepted, 0 rejected, 0 invalid. All pass-1 groundings independently re-verified against the live files at closeout (F1's fallback intact at serve.test.mjs:82; F2's punt verbatim at game-launcher.md:57–58; F3 — 1 `non-interactive.md` cite in each of 7 SKILL.md files, `_shared/` holds only `game-launcher/`; F4's tree comment verbatim at game-launcher.md:41; F5 — "background" 0 hits in game-launcher.md, byte-identical line in all 7 consumers; F8 — HEAD-only branch at serve.js:74, SIGINT/SIGTERM both wired to `shutdown` at serve.js:129–130).

**This document is descriptive only — no change described here has been implemented.**

## Reviewer context established across passes (verified by author)

- Zero dead files; every substrate file has consumers.
- No cross-plugin drift risk: `game-launcher/` exists only in gamekit; the same-basename `serve.js` in pmos-toolkit/pmos-learnkit lives at `_shared/html-authoring/assets/serve.js` and is a different tool (feature-folder static server with `--pid-file`/`--idle`), so intersection-only `sync-shared.sh` cannot collide them.
- The doc↔code contract is otherwise tight: single-file 200/404 behavior, platform-open matrix, ephemeral port, SIGINT/SIGTERM exit-0 all match `serve.js` exactly. §K respected at the file level — consumers state only game-file/title deltas (F2/F5 are the two facts that leaked back into consumers).
- Pass-2 simulation confirmed: F3's bootstrap copy cannot perturb `lint-non-interactive-inline.sh` (its `CANONICAL_FILE` is pinned under pmos-toolkit and it scans only SKILL.md files) and DOES enter `sync-shared.sh`'s intersection; F2 Part A is audit-safe (the `AskUserQuestion` token in consumers sits only on the degradation bullet, which `audit-recommended.sh`'s `SKIP_DEGRADATION_RE` skips).

## Findings ledger (all passes)

| ID | Severity | Disposition |
|---|---|---|
| pmos-gamekit-shared-F1 | Should-fix | Accepted (pass 1; count note amended by F8) |
| pmos-gamekit-shared-F2 | Should-fix | Accepted (pass 1; two-part: Part A in-unit, Part B cross-plugin follow-up story; Part A blast radius corrected by F6, Part B predicate amended by F7) |
| pmos-gamekit-shared-F3 | Nit | Accepted (pass 1) |
| pmos-gamekit-shared-F4 | Nit | Accepted (pass 1; count wording amended by F8) |
| pmos-gamekit-shared-F5 | Should-fix | Accepted (pass 2) |
| pmos-gamekit-shared-F6 | Should-fix | Accepted (pass 2; corrects F2 Part A's blast-radius claim + cross-plugin lint follow-up) |
| pmos-gamekit-shared-F7 | Should-fix | Accepted (pass 2; amends F2 Part B's marker-validity predicate) |
| pmos-gamekit-shared-F8 | Nit | Accepted (pass 2; amends F1's count note and F4's doc wording) |

**Tally:** 8 accepted (5 should-fix, 3 nits), 0 rejected, 0 invalid. Every quote re-verified verbatim at its cited file:line by the author, both passes and again at closeout.

---

## F1 [Should-fix] — Accepted: self-test's "serves the passed file" check is vacuous

- **Finding (reviewer, pass 1):** `serve.test.mjs:82` — `check('GET / serves the passed file', root.body.includes('serve.test.mjs') || root.body.length > 0);` — the `|| root.body.length > 0` fallback makes the identity assertion never load-bearing: ANY non-empty 200 body passes, so a wrong-file regression (serving serve.js itself, a directory listing, an error page) still goes green. The named contract ("serves EXACTLY the one passed file", serve.js) is not actually tested.
- **Fix:** `serve.test.mjs:82` — delete the `|| root.body.length > 0` fallback so the check asserts identity only via `root.body.includes('serve.test.mjs')`. F1 itself adds no checks; **note (per F8): the final `EXPECTED_CHECKS` after the full proposal is 7, not 5** — F1 in isolation leaves it at 5, F8 adds two checks.
- **Rationale:** `SERVED_FILE` is the test file itself (`serve.test.mjs:19`, `fileURLToPath(import.meta.url)`), which contains the literal string `serve.test.mjs` several times (header comment, the check line itself), so `includes()` alone is deterministic and load-bearing. A test whose name promises more than it asserts green-lights the exact regression it exists to catch.
- **Blast radius:** `serve.test.mjs` only. No consumer skill, lint, or CI touch.

## F2 [Should-fix] — Accepted (two-part): canonical home punts the non-interactive-block policy its consumers visibly struggle with

- **Finding (reviewer, pass 1):** `game-launcher.md:57` — "(Whether a prompt-free skill still needs the canonical non-interactive inline block is decided by `lint-non-interactive-inline.sh`, not here.)" — the doc declares itself the §K canonical home for the launch contract, then refuses to be canonical about the most expensive per-consumer fact. All 7 consumers re-litigate it in identical grumbling prose (2048:33, flappy-bird:37, poker:40, snake:34, solitaire:34, sudoku:37, tetris:34), and the fleet carries 7× a ~2KB block of mode-resolution/OQ-buffer machinery that protects nothing in launch-only skills.
- **Fix Part A (in-unit; stands alone):** `game-launcher.md`, launch-contract section lines 56–58 — replace the parenthetical punt with a short affirmative subsection carrying a stable `{#non-interactive-posture}` anchor (§J) that OWNS the posture: prompt-free launch skills carry the frozen block today because the W14 lint's only self-documenting exemption markers are `refused`/`delegated`, neither of which fits a skill that succeeds identically in both modes; the block is inert here (no checkpoint ever fires) and is retained solely for repo-contract uniformity. Then replace each of the 7 game skills' platform-adaptations grumble sentence with a one-line cite of that anchor, per §K. **Only the per-skill PROSE about the block is deduplicated — the frozen block itself stays byte-identical in every skill** (the inline-not-propagated contract is untouched).
- **Fix Part B (cross-plugin follow-up story; Part A does not depend on it):** extend `plugins/pmos-toolkit/tools/lint-non-interactive-inline.sh` with a third self-documenting marker, `<!-- non-interactive: prompt-free <reason> -->`. **Marker-validity predicate as amended by F7:** the marker is valid only when zero `AskUserQuestion` call sites SURVIVE the same post-filter pipeline `audit-recommended.sh` applies — the raw awk extractor's hits minus lines matching `SKIP_DEGRADATION_RE` and `SKIP_NEGATIVE_RE` (`audit-recommended.sh:71–72`, applied at `:101–102`). The two skip regexes must be SHARED, not duplicated — either the lint sources them from audit-recommended.sh or both tools source a hoisted include (§K), so the two tools can never disagree about what counts as a prompt. A naive "zero raw extractor hits" implementation would reject the marker in all 7 gamekit skills, because every game skill's Platform Adaptation degradation bullet retains the literal token ("**No `AskUserQuestion` tool:** Not used — this skill is prompt-free…", e.g. 2048:32) even after the block is removed. Then the 7 gamekit skills swap the frozen block for the marker; `game-launcher.md`'s posture section is updated to name the marker as the canonical answer; the repo CLAUDE.md "Non-interactive contract (W14 posture)" bullet lists the third marker. Part B rewrites a repo-wide contract and exceeds this unit's authority — it must ship as its own pmos-toolkit story.
- **Rationale:** Part A fixes the canonicality defect immediately with doc-only edits; Part B fixes the token-weight defect (7× dead machinery on every game launch). Punting to a lint's implementation detail is a §K violation the skill-eval rubric cannot see.
- **Blast radius:** Part A — `game-launcher.md` + 7 game SKILL.md prose lines; frozen block untouched so `lint-non-interactive-inline.sh` stays green; skill-eval re-run on the 7 game skills. **Anchor-integrity caveat (per F6): the new `{#non-interactive-posture}` anchor and its 7 cites are NOT lint-guarded — `tools/lint-phase-refs.sh` collects no `_shared` anchors and its matcher only recognizes `<skill>/SKILL.md#<slug>`; these cites are manually-verified-only until F6 Part B lands.** Part B — `lint-non-interactive-inline.sh`, `audit-recommended.sh` (regex hoist), repo CLAUDE.md W14 bullet, all 7 gamekit SKILL.md files (block removal), skill-eval rubric if it asserts the block's presence, fresh audit-recommended.sh run.

## F3 [Nit] — Accepted: consumers' frozen block dangles a cite to `_shared/non-interactive.md`, absent from gamekit

- **Finding (reviewer, pass 1):** `2048/SKILL.md:64` (same line in all 7 game skills) — "sources the shared call-site extractor from Section D of this file (`_shared/non-interactive.md`)" — gamekit's `_shared/` contains only `game-launcher/`, so the cite resolves nowhere from a gamekit consumer. This is the documented intersection-only-sync bootstrap gap.
- **Fix:** place a byte-identical copy of pmos-toolkit's `skills/_shared/non-interactive.md` at `plugins/pmos-gamekit/skills/_shared/non-interactive.md` — a manual one-time copy from the canonical owner, per the documented bootstrap procedure. No wording change to the frozen block (byte-frozen repo-wide; re-pointing the cite would force a 30+-skill re-paste). Mirrors the fix accepted for the identical defect in pmos-managerkit's shared unit (its F4).
- **Ordering note:** if F2 Part B ships and the frozen block leaves gamekit entirely, this copy becomes removable — sequence F3 before Part B and fold its removal into Part B's story.
- **Rationale:** within this plugin the cite is dangling; after the manual bootstrap the file enters `sync-shared.sh`'s intersection and stays aligned automatically.
- **Blast radius:** one new file in gamekit `_shared/`; enters the sync intersection (desired). Pass-2 simulation confirmed the copy cannot perturb pmos-toolkit's lint (its `CANONICAL_FILE` is pinned under pmos-toolkit and it scans only SKILL.md files). No skill-body edits, no test changes.

## F4 [Nit] — Accepted: launcher self-test has no stated invocation contract

- **Finding (reviewer, pass 1):** `game-launcher.md:41` — the substrate's only mention of its own test is the directory-tree comment `serve.test.mjs           # launcher self-test`. Nothing says when it runs, who runs it, or what green looks like, and no CI workflow references it.
- **Fix (as amended by F8):** `game-launcher.md`, directory-convention section — add one "Self-test" line adjacent to the tree: run `node serve.test.mjs --selftest` after ANY `serve.js` change; **green = `7/7 checks passed`** (the post-F8 count), exit 0; `--selftest` additionally hard-asserts the check count.
- **Rationale:** a substrate consumed by 7 skills whose only test documentation is a tree comment gets tested only when someone remembers it exists; the invocation + green-definition is a deterministic §H fact belonging in the canonical home. CI wiring is deliberately NOT proposed — one doc line is the right altitude for a 3-file substrate.
- **Blast radius:** `game-launcher.md` only. Must land with or after F8 (count wording), or be written "5/5" and updated by F8 — the cumulative spec pins it at 7/7 to avoid a two-step edit.

## F5 [Should-fix] — Accepted: canonical launch contract omits the background-invocation fact all 7 consumers restate identically

- **Finding (reviewer, pass 2):** `game-launcher.md:53` — "3. Invokes the shared launcher: `node <…>/_shared/game-launcher/serve.js <game-path>`." — the launcher runs until SIGINT/SIGTERM (`:69`), so a foreground invocation never returns and step 4 ("Reports the printed `http://127.0.0.1:<port>/` URL…") is unreachable: an agent following only the canonical contract hangs its Bash call until timeout. The operationally essential fix lives duplicated in every consumer instead — all 7 game skills carry the byte-identical line "3. **Launch** in the background so the server keeps running while you play:" (2048:88, flappy-bird:92, poker:95, snake:89, solitaire:89, sudoku:92, tetris:89), while "background" appears 0 times in game-launcher.md. Same §K defect shape as F2, one step down, and the step that decides whether the skill works at all under the harness.
- **Fix:** `game-launcher.md` `{#launch-contract}` steps 3–4 — step 3 owns the background fact: invoke the launcher **in the background** (the harness's background-run mechanism, or `&` where only a shell exists), because the server never returns in the foreground (runs until SIGINT/SIGTERM per `{#serve}`); step 4 reads the printed URL **from the background invocation's output** and reports it. Each of the 7 consumers' step-3 line keeps its concrete command (the game-file path IS the per-skill delta) but drops the duplicated "in the background so the server keeps running while you play" rationale, replacing it with a one-line cite of `game-launcher.md#launch-contract`.
- **Rationale:** the fact that decides whether the skill works at all under the harness must live in the canonical home; today the canonical contract, followed alone, hangs the agent.
- **Blast radius:** `game-launcher.md` `{#launch-contract}` + 7 game SKILL.md step-3 lines (prose only; commands and frozen blocks untouched, so `lint-non-interactive-inline.sh` stays green). Per F6, the new `game-launcher.md#launch-contract` cites are lint-blind — verify manually at edit time. Skill-eval re-run on the 7 game skills.

## F6 [Should-fix] — Accepted: F2 Part A's claimed lint backstop does not exist — `_shared` anchors and `game-launcher.md#…` cites are lint-blind

- **Finding (reviewer, pass 2):** `tools/lint-phase-refs.sh:38` — "default scope = every plugins/*/skills/<skill>/ (excl. _shared, learnings)" — the lint's definitions loop skips `_shared` dirs entirely (the ALL_DIRS `continue`), and its path#anchor matcher requires the literal shape `/SKILL\.md#` (`match(rest, /[a-z][a-z0-9-]*\/SKILL\.md#[A-Za-z0-9_-]+/)`), so no `game-launcher.md` anchor is ever in the defs table and no `game-launcher.md#…` cite is ever scanned. This already covers the 7 existing `#node-prereq` cites. A later rename of any game-launcher.md anchor ghosts 7–14+ cites with zero backstop, while the pass-1 blast radius recorded a green `lint-phase-refs.sh` run as proof of integrity.
- **Fix Part A (in-unit):** correct F2 Part A's blast-radius claim (done in this document — see F2 above and F5): all `game-launcher.md#…` cites (the 7 existing `#node-prereq`, the 7 new posture cites, F5's new `#launch-contract` cites) are manually-verified-only. Additionally add one sentence to game-launcher.md's contents header: "anchors in this file are not lint-guarded — verify cites manually when renaming a heading."
- **Fix Part B (cross-plugin follow-up, same gating as F2 Part B — a pmos-toolkit story):** extend `tools/lint-phase-refs.sh` to (1) collect anchor definitions from `plugins/*/skills/_shared/**/*.md`, and (2) generalize the path#anchor matcher to also match `[a-z0-9._-]+\.md#<slug>` for substrate-doc cites, resolving against the substrate defs table. **Flagged upward:** §J's "renumbering can't ghost them" guarantee currently does not extend to substrate docs anywhere in the repo — a repo-wide lint gap, not gamekit-local.
- **Rationale:** a false safety claim is worse than no claim; the in-unit fix makes the proposal honest immediately, the lint extension closes the class.
- **Blast radius:** Part A — this proposal's text + one game-launcher.md header sentence. Part B — `tools/lint-phase-refs.sh` (repo-root, CI: skill-hygiene.yml); every plugin with `_shared/*.md` anchors gains coverage (toolkit, learnkit, managerkit, gamekit) — any new FAILs it surfaces elsewhere are pre-existing ghosts, to be triaged in that story.

## F7 [Should-fix] — Accepted: F2 Part B's marker-validity predicate was unimplementable as written for exactly these 7 skills

- **Finding (reviewer, pass 2):** `2048/SKILL.md:32` — "- **No `AskUserQuestion` tool:** Not used — this skill is prompt-free, so there is nothing" — the canonical awk extractor over-approximates "call site" to any line mentioning the token, and even after Part B removes the frozen block, every game skill's degradation bullet retains the literal token. A naive "zero raw hits" implementation rejects the marker in all 7 skills it was designed for, on day one.
- **Fix:** amend F2 Part B's predicate (folded into F2 above): marker valid only when zero call sites survive `audit-recommended.sh`'s post-filters (`SKIP_DEGRADATION_RE` + `SKIP_NEGATIVE_RE`, `audit-recommended.sh:71–72` / `:101–102`), with the regexes shared between the two tools (sourced or hoisted to a common include), never duplicated (§K).
- **Rationale:** the vague "same extractor discipline" wording was exactly the "vague enough to be implemented wrong" case; the predicate must name the post-filtered count and the sharing mechanism.
- **Blast radius:** proposal text only in this unit (Part B is not yet a change); when Part B ships it touches `lint-non-interactive-inline.sh` + `audit-recommended.sh` (regex hoist) + repo CLAUDE.md W14 bullet, as recorded under F2.

## F8 [Nit] — Accepted: self-test never exercises three named contract surfaces (`HEAD /`, `/index.html`, SIGINT)

- **Finding (reviewer, pass 2):** `game-launcher.md:65` — "Serves **exactly** the passed file at `GET /` and `HEAD /` (also `/index.html`); returns" — the doc bolds `HEAD /` and `/index.html` as contract surface and `:69` promises clean exit on SIGINT/SIGTERM, but serve.test.mjs checks only GET /, one 404 path, and SIGTERM (5 checks). The HEAD-only branch (`res.end(req.method === 'HEAD' ? undefined : body)`, serve.js:74) could break while all checks stay green.
- **Fix:** `serve.test.mjs` — add two checks: (1) `HEAD /` → 200 + empty body + `Content-Length` header set (exercises serve.js:74); (2) `GET /index.html` → 200 + body identity via the same `includes('serve.test.mjs')` predicate F1 tightened. Bump `EXPECTED_CHECKS` 5 → 7 (`serve.test.mjs:21`). SIGINT deliberately gets NO third check: serve.js:129–130 wire SIGINT and SIGTERM to the identical `shutdown` handler, so the existing SIGTERM check covers the shared path — this symmetry is recorded in the test's header comment so the omission is a decision, not a gap. Amends F4 (doc line reads "7/7") and F1's count note (final count is 7).
- **Rationale:** documented contract rows with zero coverage are F1's disease one level up; two checks close it at near-zero cost.
- **Blast radius:** `serve.test.mjs` (+2 checks, count bump) + game-launcher.md's F4 self-test line (count wording). Count-claim greps per the coherence-gate lesson when implementing. No consumer, lint, or CI touch.

---

## Rejections

None. All 8 findings across both passes were grounded (quotes verified verbatim at their cited file:line) and accepted.

## Cross-fix ordering summary

1. F1 (predicate tightening) → F8 (+2 checks, `EXPECTED_CHECKS` 5→7) → F4 (doc line written "7/7"). Implementing F4 before F8 requires a two-step edit — land them together or in this order.
2. F3 (bootstrap copy) before F2 Part B; if Part B ships, Part B's story removes the F3 copy along with the frozen blocks.
3. F2 Part A and F5 both edit `game-launcher.md`'s `{#launch-contract}` region and the 7 consumers' prose — land them as one edit pass; per F6, verify all `game-launcher.md#…` cites manually (no lint backstop exists).
4. F6 Part A's header sentence rides the same game-launcher.md edit pass.
5. Cross-plugin follow-ups (own pmos-toolkit stories, outside this unit's authority): F2 Part B + F7's predicate spec (one story: prompt-free marker); F6 Part B (one story: lint-phase-refs `_shared`-anchor coverage — flags a repo-wide §J gap).

## Open questions

None. Every finding in both passes was accepted; no unresolved disagreements between reviewer and author remain. The unit is CAPPED at pass 2 with all fixes specified but none implemented.
