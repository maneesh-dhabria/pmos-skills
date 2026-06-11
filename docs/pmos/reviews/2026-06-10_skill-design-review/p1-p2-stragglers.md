# P1/P2 campaign — stragglers log (controller-maintained)

## CAMPAIGN STATE (final, 2026-06-11)

**CAMPAIGN COMPLETE.** Branch `refactor/skill-design-p1p2` — all waves done: P/0/1/2 (28/28 packages) + Wave 3 (3.1 reference repair, 3.2 gate sweep, 3.3 four adversarial reviews, 3.4 skill-eval, 3.5 docs/memory, 3.6 handoff). Final gate run: audit-recommended PASS (32 skills), non-interactive inline PASS (36 skills, all plugins), lint-flags-vs-hints PASS (40 skills), lint-phase-refs PASS (40 skills), skill-eval selftest PASS (53 = 47 gated [24 D + 23 J] + 6 advisory, floor 43), comments-coverage PASS, fanout PASS (both plugins), verify smoke 5/5, 12/12 pipeline fixtures, comments 10/10, readme 17/17, architecture 46/47 (`ts-circular` pre-existing on main), all learnkit suites green.

**Adversarial review (3.3):** 4 reviewers over `git diff main...HEAD` per batch. A (pipeline core): zero findings — only deletions were review-mandated `/plan --force-lock` + `--decide`, zero callers. B (authoring/visual): one confirmed finding — readme `link_up_section` config key name lost; fixed at its surviving citation (cross-file-rules.md R2). C (utilities): zero findings. D (learnkit): zero findings — no dangling refs to the Wave-0.3 deleted `_shared` cargo, resynced html-authoring md5-identical to toolkit, all anchors resolve.

**NOT done — releases and merge are the maintainer's:** `/complete-dev --plugin pmos-toolkit` and `/complete-dev --plugin pmos-learnkit` (and the merge decision). Do not push from this branch without review.

All historical per-item sections below are resolved (struck) except the post-campaign follow-ups, which remain open by design.

## Post-campaign follow-ups (open, deliberate — not campaign defects)

- [ ] **audit-recommended.sh scope** — default scope is pmos-toolkit only; learnkit/utilities prompts unaudited (0.3 agent flagged 5 near-miss skip-pattern lines in learnkit). Extend scope + fix the three "No `AskUserQuestion`:" bullets to the skip-pattern phrasing.
- [ ] **`_shared/non-interactive.md` prefix** — end-of-skill summary hardcodes `pmos-toolkit:`; wrong for learnkit/utilities; byte-identical contract forbids local fixes. Needs a canonical-block revision (parameterize the prefix) — P3-adjacent, separate change.
- [ ] **§L model pins** — prototype's 4 dispatch sites (mock-data/runtime/components/reviewer) and polish's editor/rewriter dispatches have no model pins; `sonnet` would fit.
- [ ] **Stale release-snapshot asserts (pre-existing reds on main):** `assert_marketplace_json_schema.sh` + `assert_pre_push_3_way_version_match.sh` assert the retired marketplace-version policy (CLAUDE.md now mandates NO version field in marketplace.json); `assert_survey_design_skill.sh` pins v2.36.0 + a since-removed 'Release prerequisites' section. Update or retire these three.
- [ ] **Environment-dependent tests (pre-existing):** `comments-detect.test.js` / `assert_viewer_js_unit.sh` / `assert_diff_match_patch.sh` need jsdom at `/tmp/pmos-jsdom`; `assert_launcher.sh` / `launcher.test.sh` case (b) needs a spawnable serve.js (sandbox-blocked); `assert_t39/t40/t41` need a live plan-producing run; `assert_fsa_write_e2e.sh` expects a test file that doesn't exist on main either. All fail identically on main.
- [ ] **Pre-existing test red:** architecture `ts-circular` fixture fails on main and HEAD identically (not campaign-caused; not investigated further).
- [ ] **feature-sdlc accepted residual:** skill-eval `e-scripts-dir` — `tools/skill-eval-check.sh` deliberately lives outside `scripts/` (path cited repo-wide incl. CLAUDE.md).
- [ ] **diff_router.sh** branch-scope diff source has no dedicated test under `tests/scripts/` (A6 noted; optional).
- [ ] **`--format <html|md|both>` in ideate + learn-list + playbook argument-hints** — these three still advertise `both`; their per-skill contracts were not in the 10-skill convergence set. Verify whether `both` is real for them or stale, then align.
- [ ] **Wireframes follow-ups (B1, not this campaign):** DESIGN.md cluster → `_shared/design-md/`; canvas extraction-priority doc/script drift.

## Resolved during Wave 3 (history)

- [x] plan:553 execution_mode reader claim — fixed 3.1 (execute resolves from flags; /feature-sdlc + closing offer read the frontmatter).
- [x] check-comments-coverage.sh header Phase 5 → Phase 7 ({#final-compliance}) — 3.1.
- [x] design-drift-check.md:74 wireframes slugs — 3.1.
- [x] architecture/prototype/feature-sdlc/verify/msf-req stale phase refs — fixed by their Wave-2 packages, verified 3.1.
- [x] feature-sdlc `--tier` passthrough claim — made true: spec + plan now document the machine passthrough (argument-hint + tier step), 3.1.
- [x] mac-health Phase 0 ghost — lint-phase-refs now exempts the frozen non-interactive block (its "Phase 0" is the block's own vocabulary), 3.1.
- [x] assert_unsupported_format ×7 — all 10 skills converged on the post-FR-12.1 enumeration (valid {html, md}, legacy `both`→html); 4 rewrites had over-retired `md` (lost `--format md`) — restored; test updated; 10/10, 3.1.
- [x] 5 pipeline fixtures (resume-idempotency, t12b, t19, w5, w7) → slug/semantic-form greps at content's new homes; 12/12, 3.1.
- [x] state-schema.md:14 ghost pointer to removed SKILL.md section — repointed, 3.1.
- [x] conventions.md §10 `_index.json` contradiction — aligned to README step 5 (inline manifest), fanned to learnkit, 3.1.
- [x] learnkit html-authoring drift (pmos-wordmark, style.css, resolve-input msf slug) — `sync-shared.sh --from=pmos-toolkit`, 3.1; D-batch reviewer verified md5-identical + render tests green.
- [x] msf-req findings `.md` (folded) vs `.html` (standalone) — verified intentional (working log vs emit contract), documented at the requirements call site, 3.1.
- [x] structured-ask-edge-cases.md:69 prototype findings slug — already fixed by B2 (`#findings` phase), verified.
- [x] complete-dev phantom contracts (readme_update_hook, state.base_drift) — zero residue, verified 3.1.
- [x] sync-shared fixture tests ×3 — updated to the intersection-only + self-rooted contract, 3.2.
- [x] assert_skill_substrate_refs_unchanged — floor 28→20 (legit de-dup), excluded test scripts + gitignored fixture outputs, 3.2.
- [x] assert_claude_md_generalized — CLAUDE.md de-hardcoded (3 refs reworded), PASS (was red on main), 3.5.
- [x] readme `link_up_section` key name — restored at cross-file-rules.md R2 (Batch-B reviewer finding), 3.3.
- [x] skill-eval [D] on 5 biggest rewrites — readme casing, feature-sdlc desc ≤1024, skill-eval.md ToC into 15-line window; spec/plan/wireframes/readme 21/21, 3.4.
- [x] `_shared/html-authoring/conventions.md` §10 — same as above (A2 straggler).
- [x] test-w3-fold-sim-spec.sh — converted with w1/w2 during Wave 2 (verified green).
