# Cross-cutting analysis — cross-platform portability (dim 7) & gates/rubrics (dim 8)

Reviewer scope: dimensions 7 and 8 of `../criteria.md`, applied repo-wide across pmos-toolkit (31 skills), pmos-learnkit (6), pmos-utilities (2). All counts measured on 2026-06-10 at HEAD (`2775975`). Tool outputs quoted below were produced by actually running the repo's lint/audit/selftest scripts, not by reading them.

---

# Part A — Cross-platform portability

## A1. Inventory: Claude-Code-specific tool references

Method: grep across each skill directory's `*.md` files. `AskUserQuestion` counted as the literal token in SKILL.md; "Task tool" counted as the phrase (bare `Task` over-matches "task"); `Skill tool` / `SlashCommand` literal phrases.

| Skill | AskUserQuestion (SKILL.md) | Task-tool refs (all md) | TodoWrite | EnterWorktree | WebFetch (all md) |
|---|---|---|---|---|---|
| architecture | 3 | 5 | 1 | 0 | 0 |
| artifact | 20 | 1 | 0 | 0 | 1 |
| backlog | 3 | 1 | 0 | 0 | 0 |
| changelog | 4 | 1 | 1 | 0 | 0 |
| comments | 5 | 1 | 0 | 0 | 0 |
| complete-dev | 9 | 1 | 1 | 0 | 0 |
| creativity | 4 | 1 | 0 | 0 | 0 |
| design-crit | 13 | 1 | 1 | 0 | 0 |
| diagram | 12 | 1 | 1 | 0 | 0 |
| execute | 6 | 5 | 0 | 0 | 0 |
| feature-sdlc | 17 | 1 | 3 | **3** | 0 |
| grill | 5 | 1 | 0 | 0 | 0 |
| ideate | 10 | 1 | 1 | 0 | 0 |
| msf-req | 3 | 0 | 0 | 0 | 0 |
| msf-wf | 5 | 1 | 0 | 0 | 0 |
| mytasks | 3 | 1 | 0 | 0 | 0 |
| people | 2 | 1 | 0 | 0 | 0 |
| plan | 13 | 2 | 1 | 0 | 0 |
| polish | 5 | 1 | 3 | 0 | 2 |
| product-context | 2 | 1 | 0 | 0 | 1 |
| prototype | 12 | 1 | 1 | 0 | 0 |
| prototype-sdlc | 0 | 0 | 0 | 0 | 0 |
| readme | 22 | 3 | 0 | 0 | 0 |
| requirements | 10 | 1 | 0 | 0 | 0 |
| session-log | 3 | 1 | 1 | 0 | 0 |
| simulate-spec | 9 | 1 | 1 | 0 | 0 |
| skill-sdlc | 0 | 0 | 0 | 0 | 0 |
| spec | 13 | 4 | 0 | 0 | 0 |
| survey-analyse | 5 | 1 | 1 | 0 | 0 |
| survey-design | 11 | 2 | 2 | 0 | 0 |
| verify | 3 | 2 | 7 | 0 | 0 |
| wireframes | 17 | 1 | 1 | 0 | 0 |
| critical-thinking | 4 | 0 | 0 | 0 | 0 |
| frameworks | 7 | 1 | 0 | 0 | 0 |
| learn-list | 1 | 0 | 0 | 0 | 3 |
| magazine | 6 | 1 | 0 | 0 | 1 |
| playbook | 2 | 0 | 0 | 0 | 0 |
| primer | 17 | 1 | 0 | 0 | **19** |
| mac-health | 0 | 0 | 0 | 0 | 0 |
| reflect | 4 | 1 | 1 | 0 | 0 |

Summary:

- **`AskUserQuestion` is the dominant coupling**: 36/39 skills reference it in SKILL.md (only `prototype-sdlc`, `skill-sdlc` — thin aliases — and `mac-health` don't). ~290 references total across SKILL.md files. This is by design (the W14 posture revolves around it), but it makes the no-AskUserQuestion degradation path the single most load-bearing portability contract in the repo.
- **Task subagents**: ~33 skills dispatch or mention the Task tool; all heavy users (spec, execute, architecture, readme) carry a "No subagents → run inline/sequentially" degradation line.
- **`EnterWorktree`** appears only in feature-sdlc, and it is the best-handled Claude-ism in the repo: on any error it emits a byte-specified plain-text handoff block + `Status: handoff-required` and exits 0 (SKILL.md §Step 3, FR-W04) — a genuinely platform-neutral fallback.
- **`SlashCommand` / `Skill tool`**: zero references — good; invocation is via skill names and `_shared/platform-strings.md` per-platform phrasing (`/pmos-toolkit:execute` on Claude Code vs "run the execute skill" on Codex). This substrate is a quiet design win.
- **`TodoWrite`** is nearly absent as a hard reference; progress tracking is phrased as "your available task tracking tool (e.g., TaskCreate in Claude Code, `update_plan` in Codex)" — already portable.
- **`WebFetch`** is concentrated in pmos-learnkit (primer 19, learn-list 3) where it is the core capability, and both skills explicitly refuse rather than degrade ("verification is impossible... never fall back to emitting unverified links") — refusal is the correct degradation for a verification-first product.

## A2. The degradation story — consistent? followable?

**Coverage:** 39/40 skills carry a `## Platform Adaptation` section (all but mac-health, which uses no Claude-specific tools anyway). Coverage is excellent and clearly rubric-enforced (skill-eval `d-platform-adaptation` [D]).

**But there are two different degradation philosophies for the same missing tool**, chosen per-skill with no stated principle:

1. **Assume-and-proceed** — requirements: "State your assumption, document it in the output, and proceed. The user reviews after completion." Diagram: same, with per-prompt defaults enumerated (collision→suffix, same-concept→redraw, terminal failure→ship-with-warning).
2. **Degrade-to-numbered-prompts** — feature-sdlc, primer, learn-list, survey-design: "degrade to numbered free-form prompts per `_shared/interactive-prompts.md`" (one question per turn, numbered choices, wait for reply).

Both are individually followable — diagram's is the best in the repo (it names the default for every specific prompt, which is exactly what a Codex/Gemini agent needs). The inconsistency matters because the same user on Copilot gets an autonomous /requirements but an interactive /survey-design, and nothing tells them (or the agent) why. The right rule already exists implicitly in the non-interactive classifier: **destructive/free-form/ambiguous prompts must still ask; everything with a (Recommended) option can auto-pick.** The Platform Adaptation sections should reference that one rule instead of each inventing a posture.

**Followability on Codex/Copilot/Gemini, honestly assessed:**

- Prompting: followable. `_shared/interactive-prompts.md` names the fallback platforms explicitly and gives a worked example.
- Subagents: followable ("run the reviewer pass sequentially inline — same prompts, same return contracts" — survey-design's phrasing is the model).
- **Exit codes are a fiction outside scripts.** The non-interactive block and many skills instruct "exit 64" / "exit 2" / "exit with code 0". A SKILL.md is a prompt, not a process — no agent (including Claude Code) gives the model a process exit code to set unless a script call carries it. Other agents will approximate this as prose. The repo already has the better pattern (`Status: handoff-required` grep-able chat line, FR-W02); exit-code language in prose should be treated as "emit this status line" everywhere.
- Playwright-dependent paths: design-crit (capture), diagram (render — has rsvg/cairosvg fallback, refuses without any renderer), prototype/wireframes vision passes. Degradation notes exist; diagram's refusal-with-install-instructions is fine, design-crit's screenshot dependency is the least portable surface in the repo.

**Codex parity is structural, not behavioral.** `.codex-plugin/plugin.json` exists per plugin and `.codex-plugin/marketplace.json` mirrors the catalog — but **zero of the 39 first-party skills ship an `agents/openai.yaml` sidecar** (only the vendored `.system/` skills do: imagegen, skill-creator, plugin-creator, skill-installer, openai-docs). The repo's own rubric (skill-eval `f-codex-sidecar` [D]) declares that "a Codex skill without `agents/openai.yaml` is incomplete on that platform" — by the repo's own standard, none of its skills are complete on Codex. There is also no recorded Codex/Gemini/Copilot smoke run anywhere (contrast: comments ships `tests/MANUAL-cross-context.md`, a per-platform attestation matrix). Verdict: the degradation prose is real and mostly followable, but cross-platform support is **specified, never exercised**.

## A3. W14 posture — verified, with one significant hole

Ran `plugins/pmos-toolkit/tools/lint-non-interactive-inline.sh`: **PASS — "all 29 supported skills match canonical"** (exit 0). The canonical block (`_shared/non-interactive.md` Section 0) is 29 lines including markers. The 3 toolkit skills without the block are correctly exempt via self-documenting markers: msf-req (`refused`), skill-sdlc + prototype-sdlc (`delegated to /feature-sdlc`). The CLAUDE.md claim holds **for pmos-toolkit**.

**The hole: the lint's scope is toolkit-only, and exactly where it doesn't run, the block has drifted into three generations.** Measured by extracting each marked region and diffing against the toolkit canonical:

| Carrier | vs toolkit canonical | Notes |
|---|---|---|
| pmos-learnkit `_shared/non-interactive.md` | **61 diff lines** | pre-W14 version — still inlines the full awk extractor into the canonical block (the thing W14 explicitly moved out to Section D "so it does not bloat every skill's prompt") |
| learnkit frameworks / primer / magazine SKILL.md | 61 each | internally consistent with learnkit's stale canonical — the skills faithfully copied an outdated contract |
| pmos-utilities mac-health SKILL.md | 36 | a third variant; pmos-utilities has **no `skills/_shared/` at all**, so this copy is an orphan with no canonical to lint against |
| pmos-utilities reflect SKILL.md | 0 | matches current toolkit canonical |

This is the byte-identical contract failing in exactly the way the lint exists to prevent — outside the lint's jurisdiction. Worse, the sanctioned repair path is booby-trapped: `scripts/sync-shared.sh --from=pmos-toolkit` runs `rsync -a --delete` of the whole `_shared/` dir into every peer, which would **delete pmos-learnkit's `topic-research/` substrate** (exists only in learnkit; toolkit's `_shared/` instead has 4 files learnkit lacks: learnings-capture, persona-journey-alignment, tracker-crudl, writing-principles). The `_shared/` dirs have diverged in both directions, so the only sanctioned sync mutation destroys unique content whichever direction it runs. The drift-hook contract in CLAUDE.md assumes a mirror topology that no longer exists.

### Is inlining 27 lines × N skills the right design? (steelman both)

**For inlining (the repo's rationale, and it's mostly right):**
- A skill must be self-contained when loaded. The non-interactive contract governs the *first* prompt the skill might issue; a "go read `_shared/non-interactive.md`" reference is a probabilistic instruction, and the failure mode of not following it is *silent interactivity* — a CI/batch run hangs on a question nobody will answer. That failure is invisible until it bites, which is the worst kind.
- Cross-agent loaders only guarantee SKILL.md is in context. `_shared/` is a repo convention, not a skills-standard concept; on a platform that copies skill dirs individually, the reference may not even resolve.
- The block is sentinel-guarded and lint-enforced, so the N-copies cost is a re-paste tax, not a correctness risk — *within the lint's scope* (see above for outside it).

**For externalizing (Pocock):**
- 29 lines × 29 toolkit skills ≈ 840 lines of identical contract text in the corpus, re-read by the model on every invocation of every skill. It is the single largest block of pure repetition in the repo.
- The empirical record shows the copies DO drift (three generations across plugins) — the exact failure Pocock's "externalize, reference" avoids by construction.
- Most of the block is not load-bearing for the model: FR-citations (`FR-01.1`, `FR-02.5`…), stderr string formats, and the settings-malformed edge case could live in the shared file behind "Read `_shared/non-interactive.md` when an edge case fires" — which the block *already says* in its own header.

**Verdict: inlining is the right mechanism; the current block is the wrong size, and the enforcement is the wrong scope.** Keep the inline-by-construction property (the self-containment argument wins — silent interactivity is a real, severe failure mode and reference-following is genuinely unreliable across agents). But (a) shrink the block to its behavioral core — mode resolution precedence, the 3-rule classifier, "buffer + flush, read the shared file for formats", subagent `[mode:]` prefix, refusal check — roughly 10–12 lines; FR numbers and exact stderr strings move to the shared file (they exist for the test suite, not the model); and (b) make the lint walk `plugins/*/skills/` so the contract is canonical repo-wide, with one plugin's `_shared/` declared the source of truth.

## A4. Minimum changes for true cross-agent portability

1. **Extend `lint-non-interactive-inline.sh` to all plugins** and re-sync learnkit's stale `_shared/non-interactive.md` + the 4 drifted skill blocks (frameworks, primer, magazine, mac-health). Give pmos-utilities a `_shared/` or an explicit "inlines from toolkit" note. ~1 hour, closes the only *measured* portability-contract violation.
2. **Fix or fence `scripts/sync-shared.sh`**: either maintain a sync manifest (which files are cross-plugin canonical) instead of `rsync --delete` of the whole dir, or document that `_shared/` is per-plugin-divergent and retire the mirror claim from CLAUDE.md.
3. **One degradation policy, stated once**: "No structured-prompt tool → apply the non-interactive classifier (Recommended → auto-pick; destructive/free-form/ambiguous → ask as a numbered plain-text question per `_shared/interactive-prompts.md`)." Platform Adaptation sections then shrink to skill-specific notes (diagram's per-prompt defaults are the keeper pattern).
4. **Replace prose exit codes with status lines.** Keep exit codes inside scripts; in SKILL.md prose, "exit 64" becomes "emit `Status: refused (non-interactive)` and stop" — the FR-W02 pattern, which works identically on every agent.
5. **Make the Codex claim honest**: either ship `agents/openai.yaml` sidecars (the repo's own `f-codex-sidecar` check defines the bar) and run one recorded smoke of /grill or /polish on Codex into a `MANUAL-cross-platform.md` matrix (the comments skill already shows the format), or scope the README/manifests to "Claude Code primary; degradation notes for other agents, untested".

---

# Part B — Gates & rubrics: the global enforcement inventory

## B1. Inventory

Every rubric, gate, eval loop, and audit script found, with measured counts. "Hard" = blocks completion/CI; "soft" = surfaced, user disposes.

| # | Mechanism | Where | Hard/soft | Type | Failure it catches (origin where findable) | Cost | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | skill-eval rubric — **true count 41 checks (21 [D] + 20 [J])**, not the 39 the file header claims; ToC and Totals say 41; `skill-eval-check.sh --selftest` → "SELFTEST PASS: 21 [D] checks" | feature-sdlc/reference/skill-eval.md | hard (Phase 6a + /verify) | hybrid | [D]: loader breakage (a-name-matches-dir = the CLAUDE.md silent-no-register failure), hardcoded paths, stale hints, version-bump-in-plan merge damage (g-plan-grep-clean; origin: skill-patterns §G, 2026-05-11_feature-sdlc-skill-mode) | 209-line rubric + reviewer subagent per eval; [J] churn on subjective calls | keep [D] hard; **soften ~6 taste [J] to advisory** (b-desc-pushy, c-context-economy, d-imperative-form, d-explain-why, d-flowcharts-justified, d-examples-quality) — concurs with the feature-sdlc per-skill review; **fix the 39→41 header drift** |
| 2 | polish rubric — branded "14-check", actually **15 check IDs** (6 split into 6a/6b): 8 regex + 7 LLM-judge | polish/reference/rubric.md | split: regex auto-apply, judge surfaced per-finding | hybrid | AI-slop vocabulary, hedging, passive ratio, buried lede (origin: 2026-05-04_polish-skill) | 2-iteration cap bounds it | **keep as-is — the repo's best-designed rubric**: risk-stratified, deterministic-first, judgment surfaced not gated |
| 3 | readme rubric — branded "15-check" (×5 in SKILL.md), actually **18 IDs in rubric.yaml** (16 [D], 2 [J]) + 3-persona simulated reader | readme/reference/rubric.yaml | hard (audit verdict) | mostly deterministic | missing install/license, dead links, stale badges (origin: 2026-05-13_readme-skill, 2026-05-15_readme-audit-fixes) | low | keep-hard; fix count drift |
| 4 | diagram hybrid eval — deterministic code metrics (hard-fails: contrast, out-of-palette) + 7-item binary vision rubric on raster, ≤2 loops; 4-item wrapper rubric **ships-with-warning, never gates** | diagram SKILL.md + eval/ | graduated | hybrid | unreadable/overflowing SVGs (origin: 2026-05-03_diagram-skill) | needs a raster renderer; refuses without one | keep — the hard/advisory gradient here is the pattern to copy; consider ship-with-warning instead of refusal when no renderer |
| 5 | wireframes reviewer loop ≤2/file; prototype ≤2/device; artifact ≤2 iters ("No third loop, ever") | each SKILL.md | hard caps | LLM reviewer | unbounded fix-regress churn + token cost | 1 subagent × loops × files | keep — these caps are **cost governors, not quality gates**; cap-hit = ship with residuals noted |
| 6 | plan review loop — hard cap 4 (FR-40) + cap-hit AskUserQuestion | plan SKILL.md §341 | hard cap | LLM reviewer | indefinite churn (FR-40 replaced "minimum 2 loops" — a gate that *forced* churn) | latency | keep |
| 7 | survey-design Phase 4 generate↔review ≤2 iters, categorical exit, reviewer-never-writes; Phase 6 sim-respondent friction walk | survey-design SKILL.md | hard cap; residuals carried to user | LLM | leading/double-barreled questions (A1–E6 catalog); respondent friction | 2 subagent passes | keep; the "reviewer evaluates, only generator mutates" invariant is worth standardizing |
| 8 | /verify Phase 7 Hard Gates — `scripts/check-comments-coverage.sh` (ran: PASS — 14 contract tests + 15 emit refs + 1 resolver + 2 calibration) | verify SKILL.md §635 | hard, blocks /verify | script | a 14-surface fanout contract silently losing a surface (origin: 2026-05-28_inline-html-artifacts FR-62) | counts hardcoded to the current skill census — every new emitting skill must edit the script | keep-hard; derive expected counts from a manifest, not literals |
| 9 | /verify Phase 7a design-drift check | verify SKILL.md | **advisory by design** ("never blocks") | hybrid | DESIGN.md going stale vs codebase | skip-fast guards | keep-soft — correctly classified |
| 10 | msf-req / msf-wf MSF + PSYCH scoring | msf-* SKILL.md | soft (recommendations-only; --apply-edits is user-approved) | LLM | UX friction invisible to the author | 1 pass | keep-soft — correctly classified |
| 11 | architecture L1 (≤15 rules) / L2 / L3 engine, disposition axis, `wont_fix`-not-removal | architecture SKILL.md + principles.yaml | soft (report) | deterministic tools (dep-cruiser, ruff) + judge for --deep | cycles, god modules; graceful degrade on missing tools (`tools_errored[]`) | tool deps | keep; the ≤15 L1 cap is a good anti-accretion gate on the rubric itself |
| 12 | primer/learn-list verification-first gates: anti-slop hard gate ("never emits a link it has not fetched this run"); source floor **explicitly demoted** to informational disclosure (FR-13: "NOT a sourcing gate"); outline confirm gate | learnkit skills + _shared/topic-research | hard (link verification), soft (floor) | deterministic (fetch succeeded or not) | hallucinated/dead links — the product's core promise | fetch latency | keep-hard for verification; the source-floor demotion is the repo's best precedent of *softening a gate on evidence* |
| 13 | `tools/lint-non-interactive-inline.sh` | toolkit tools/ | hard (CI on PR) | script | byte-drift of the inlined contract | none | keep-hard; **extend scope to all plugins** (Part A3: drift found exactly outside its jurisdiction) |
| 14 | `tools/audit-recommended.sh` | toolkit tools/ + .github/workflows/audit-recommended.yml | hard in CI — **and currently FAILING: exit 1, 31 unmarked calls across 13 skills** (readme 14, complete-dev 3, changelog 2, design-crit 2, survey-analyse 2, +1 each in architecture, comments, execute, feature-sdlc, ideate, polish, session-log, spec) | script | prompts that would hang a non-interactive run unclassified | none | **fix now**: CLAUDE.md calls the residual "the accepted audit baseline" but the script has no baseline mechanism — any PR touching a toolkit SKILL.md goes red today. A known-red hard gate is worse than no gate: it trains everyone to ignore CI. Either mark the 31 call sites or add an explicit baseline file the script diffs against |
| 15 | comments-bundle-size.yml (≤20KB soft / ≤40KB hard authoring; ≤100KB vendored) | .github/workflows | hard CI | script | overlay bloating every emitted artifact (NFR-02, amended 2026-05-25) | none | keep-hard |
| 16 | Reviewer quote-grounding (≥40-char verbatim substring or the fail is downgraded to pass) | skill-eval [J] contract, artifact FR-50/51/52, grill | hard (validation of the validator) | deterministic check on LLM output | hallucinated reviewer findings — the failure that makes LLM gates dangerous | trivial | keep-hard; **extract to `_shared/` and apply to every reviewer loop** (wireframes/prototype reviewers lack it) |
| 17 | feature-sdlc structural gates: worktree pre-flight, base-drift (FR-PA05), resume drift (realpath check), atomic 3-write, accepted_residuals reconciliation (FR-50) | feature-sdlc | hard | deterministic | wrong-branch commits, stale-main merges, corrupt resume, "accepted risk" becoming silent pass | prose weight | keep-hard (per-skill review concurs); accepted_residuals is the design's best idea |
| 18 | non-interactive refusal/delegation markers (msf-req, skill-sdlc, prototype-sdlc, diagram's `handled-via`) | SKILL.md comments | hard, self-documenting | marker + script | hidden-allowlist drift | none | keep |
| 19 | design-crit Nielsen+WCAG+Gestalt rubric; critical-thinking per-muscle scorecard | respective skills | soft (the report IS the product) | LLM | n/a — scoring as deliverable, not gate | n/a | keep; not enforcement machinery |

**Count drift is a pattern, not a coincidence:** skill-eval says 39, is 41. polish says 14, has 15 IDs. readme says 15, has 18. Self-reported rubric sizes are stale in all three places where a rubric grew after its prose was written. None is harmful alone; together they say rubric headers are write-once. Fix: assert the count in each rubric's selftest (skill-eval's `--selftest` already validates the [D] set — add the total).

## B2. The pattern — what actually catches bugs vs what encodes taste

**Deterministic/structural checks have receipts.** The canonical-path rule exists because skills at wrong paths "silently don't exist" (CLAUDE.md, observed). g-plan-grep-clean encodes a documented merge-damage class (version bumps committed by /execute against stale main). The magazine live smoke caught the drain re-pick bug pre-ship (0.15.0 retro). check-comments-coverage enumerates a 32-point fanout no human re-verifies. And this review itself is evidence: running the drift diff where the lint doesn't run found three generations of the non-interactive block — the check class works precisely because absence of it demonstrably fails. audit-recommended found 31 genuinely unclassified prompts.

**Binary LLM-judged style checks encode taste and churn.** The feature-sdlc per-skill review found skill-eval's [D] checks valuable and ~6 taste-[J] checks harmful, and the generalization holds repo-wide: a temp-0 judge on "is this description pushy enough?" or "does each example earn its place?" is (a) model-coupled — a better model's verdict shifts, so passing today's gate means conforming to today's model's taste; (b) binary-forced — pass/fail on a judgment call produces remediation churn where "noted, ship" was correct; (c) only partially rescued by quote-grounding, which verifies the *evidence exists* but not that the *judgment is right*.

**The repo has already independently discovered the right boundary three times:**
- polish: regex checks auto-apply; LLM-judged checks surface as per-finding decisions — never silently gate.
- diagram: deterministic code metrics hard-fail; the vision rubric gates once; the wrapper rubric ships-with-warning.
- primer: the source floor was explicitly demoted from gate to disclosure ("informational, never blocking") after it proved to be a cost dial, not a quality bar.

These three local discoveries are the policy; it just was never written down, so skill-eval and the reviewer loops kept shipping binary taste gates.

## B3. Proposed repo-wide policy line

> **A check may be a HARD gate only if (1) it is deterministic (script, regex, structural assertion), or (2) it is LLM-judged but quote-grounded AND the failure it names is a contract violation (loader breakage, pipeline coupling, data loss, a promise to the user like "every link verified") rather than a quality judgment. Everything else is an advisory signal: surfaced with severity and a quote, disposed by the user or recorded as an accepted residual (the FR-50 accepted_residuals pattern). Three corollaries: every hard gate runs green at HEAD — a gate red at HEAD is fixed, baselined, or deleted within one release (audit-recommended currently violates this); every hard gate states in one line the historical failure it prevents, with a feature-folder cite where one exists; loop caps are cost governors, not quality gates — cap-hit means surface-and-continue, never block.**

Applying it: ~14 of the 19 mechanisms above stay hard (all scripts/CI, the [D] rubric halves, verification-first fetch gates, feature-sdlc structural gates, loop caps qua caps, quote-grounding). ~6 skill-eval taste-[J] checks soften to advisory. Zero mechanisms warrant deletion — every gate here traces to a real failure; the repo's problem is not gate accretion but gate *classification* (binary where advisory belongs) and gate *atrophy* (a red CI gate everyone ignores).

---

## Top recommendations (ranked)

1. **Restore gate integrity (hard, now):** fix the 31 unmarked AskUserQuestion call sites or add an explicit baseline to `audit-recommended.sh`; extend `lint-non-interactive-inline.sh` to all plugins and re-sync the 4 drifted non-interactive blocks + learnkit's stale `_shared/non-interactive.md`; defuse `sync-shared.sh --delete`.
2. **Write the hard-vs-advisory policy line into skill-patterns.md** and reclassify skill-eval's ~6 taste-[J] checks as advisory; add count assertions to the three rubrics whose headers drifted (39→41, 14→15, 15→18).
3. **Shrink the inline non-interactive block to its ~10–12-line behavioral core** (keep inline-by-construction; move FR citations and stderr formats to the shared file), and converge Platform Adaptation sections on one degradation rule (risk-classed prompts) + status-lines-not-exit-codes; then run and record one real Codex/Gemini smoke per the comments MANUAL-matrix format.
