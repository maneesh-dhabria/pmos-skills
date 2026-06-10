# polish — review

**Grade:** C+ (the rubric architecture is genuinely good design for binarizing prose taste; SKILL.md has accreted ~45% ballast and three of the 14 checks ask an LLM to do arithmetic it can't do)
**Size:** SKILL.md 358 lines (~329 excluding non-interactive block); references 7 md files / 747 lines, plus 2 schemas (185), 1 script (177), 1 example yaml (36) — ~1,145 support lines (~1,319 counting tests); target ~170-line SKILL.md, references roughly as-is.

## TL;DR

- **Biggest win available:** cut SKILL.md from 358 to ~170 lines — delete the 22-item Anti-Patterns restatement, collapse the inlined Phase 2a summary (editorial-pass.md already holds that contract verbatim), and replace the budget-block "emit verbatim" mandate + `× 1.3 retries avg` pseudo-formula with intent. No behavior changes.
- **Biggest risk in current design:** checks 2, 3, and 11 are "llm-judge" calls asked to compute statistics (passive %, sentence-length stddev over a 200-word window, heading depth + avg-words-per-section) at a fake `temperature: 0`. LLMs can't count reliably; the binary verdict will flap across model versions — and the skill *already computes sentence stddev deterministically* in `reference/voice-sampling.md`. This is the one place the binary rubric punishes writing for failing arithmetic cosplay rather than a real check.
- **Worth keeping:** the rubric's safety architecture is exemplary — "a `fail` with no `cited_spans` is treated as `pass`" (anti-hallucination), the low-risk/high-risk split with a Phase 5 write-gate, the `PRESERVE_VOICE_CONFLICT` escape with a 30% abort cap, and the two-way `_shared/writing-principles.md` ↔ `reference/rubric.md` contract. Every cap has a named failure mode in `docs/pmos/features/2026-05-04_polish-skill/02_spec.md` (risk table, §4.5–§4.7).

### Does binarizing taste work? (special-attention verdict)

Mostly yes — because the binary verdict is not the product. The verdict is a *trigger*; the product is cited spans, per-span patches, and a human disposition step (Fix/Modify/Skip/Defer) on everything judgment-shaped. Taste re-enters at three points: the LLM judge's evidence requirement, the voice-marker constraint on every patch, and per-finding approval for high-risk checks. The design fails only where a check's pass/fail is a *measurement* rather than a *judgment*: measurements belong in code (checks 2, 3, 11), judgments belong in the LLM (4, 6b, 7, 12, 13, 14 — all well-shaped). The regex checks (1, 5, 6a, 8, 9, 10) are honest pattern-detectors; their risk is in silent auto-apply, not detection — and check 8's canonical patch ("It's not just a tool, it's a workflow." → "It's a workflow.") deletes a claim, which is exactly what the high-risk lane exists for.

## Findings

1. **[G] Checks 2, 3, 11 implement deterministic metrics as LLM judgments.** `reference/rubric.md` — check 2 asks the judge to "Count passive-voice constructions vs total sentences… PASS if passive_pct ≤ {passive_max_pct}"; check 3 asks it to "Compute the standard deviation of sentence length… PASS if stddev ≥ {sentence_stddev_min}"; check 11 asks for max heading depth + avg words/section. Counting and stddev are known LLM weaknesses; `temperature: 0` doesn't fix that, and the verdicts are model-version-coupled. Incoherently, `reference/voice-sampling.md` computes `avg_sentence_length` and `sentence_length_stddev` *deterministically* ("simple `[.!?]` boundary heuristic") in the same run. **Fix:** add a small `scripts/metrics.js` (the skill already ships a Node script) that computes passive-candidate ratio, sentence stddev, heading depth, and words-per-section; keep the LLM only for citing the worst spans when the metric fails. Checks 2/3/11 become `script` mode; thresholds stay.

2. **[V] The Anti-Patterns section (SKILL.md lines 288–309) is 22 DO-NOTs, every one a restatement of a rule already stated in its phase.** "Do NOT iterate beyond 2 polish iterations" restates Phase 6 step 5; "Do NOT skip Phase 3's `rubric_results` YAML block" restates Phase 3; "Do NOT exceed the 25,000 polishable-word ceiling" restates Phase 1; etc. This is defensive over-specification — the model that ignores the rule in Phase 6 will also ignore it at line 297. **Fix:** delete the section; keep the 3–4 genuinely non-obvious rules in their phases (defer comments carry no line numbers; editor critiques / rewriter applies; never round-trip HTML through markdown). ~22 lines saved, plus the maintenance tax of keeping two copies in sync.

3. **[V/S] Phase 2a (SKILL.md lines 122–151) inlines a ~30-line summary of `reference/editorial-pass.md`, including the gate YAML verbatim in both files.** The reference exists precisely to hold this contract (it does, completely, in 157 well-organized lines). Progressive disclosure is inverted: the branch is loaded whether or not it's taken, and the two copies of the `--reduce` parsing rule, the gate options, the dry-run interplay, and the HTML-fidelity rule must now stay in sync by hand. **Fix:** Phase 2a becomes ~8 lines — when it runs, what the working-document handoff is, "not a polish iteration", pointer to `reference/editorial-pass.md` for everything else. ~25 lines saved.

4. **[R/Ph] Insertion incoherences.** (a) SKILL.md line 14 enumerates the phases as "(0, 1, 2, **2.5**, 3, …)" but the phase is named **2a** everywhere else — orphaned label from the v2.40 insertion. (b) Phase 8 executes *inside* Phase 7: "The order is: Phase 6 apply → Phase 7 file write → Phase 8 reflection → Phase 7 summary block + replace prompt" (line 273) — a phase-numbering pretzel that is the textbook smell criteria.md §6 names. (c) `reference/chunking.md` line 17 cites "SKILL.md §5.2", which doesn't exist (it's the retired spec's section); `reference/voice-sampling.md` cites "§4.5 of spec" twice — unresolvable for anyone holding only the skill. **Fix:** renumber phases linearly (make learnings-reflection a step of the final phase), fix or delete the stale § references.

5. **[P] Verbatim-output and formula mandates dictate HOW where WHAT+WHY suffices.** Phase 4: "Emit this block **verbatim** (substitute values only — do not reword the labels…)" plus `calls = (llm_judge_failures × 1.3 retries avg) + global_check_count + (×2 if iter-2 likely)` plus the `+ ~2 / + ~1 / + ~4` editorial-call accounting. The 1.3 multiplier is pseudo-precision; the real contract is "before generating patches, show how many checks failed and roughly how much work fixing them costs, and get consent — mandatory when the estimate is large." That intent survives model upgrades; the formula doesn't. (The ">30 calls → no default-Y" rule and "a bulk-scope question is not a substitute" clarification are load-bearing; keep those.)

6. **[G] Check 8 is auto-applied but meaning-altering.** `reference/rubric.md` check 8's patch hint rewrites "It's not just a tool, it's a workflow." to "It's a workflow." — that deletes the concession claim, not just rhetoric. It sits in the low-risk silent-apply lane (`reference/findings-protocol.md`), while the lane's own definition reserves surfacing for anything that changes meaning. Checks 1 and 9 (clutter, hedges) are also meaning-adjacent but their deletions are bounded by voice markers + per-patch QA; 8 routinely restructures a claim. **Fix:** move check 8 to high-risk/surfaced (3 one-line list edits: rubric.md risk table, findings-protocol.md, SKILL.md Phases 5).

7. **[P] The TodoWrite-first ritual (SKILL.md lines 12–16) is 5 lines of micromanagement plus a self-flagellation clause** ("If you have already taken any other action… Stop, create the tasks now, and resume") plus a 22nd anti-pattern restating it. The failure it prevents is cosmetic (user doesn't see progress). One line — "Track the phases as todos; one sub-task per surfaced finding in Phase 4" — does the same work.

8. **[S] Learnings capture is duplicated with divergence.** Phase 8 says "Read and follow `_shared/learnings-capture.md` … **or these inline steps**" — and the inline steps differ from the shared contract (the shared doc has the 300-line consolidation pass and the global/repo-specific split; the inline list is polish-specific candidates). "Or" makes it ambiguous which governs. **Fix:** follow the shared doc, keep the 5 polish-specific candidate bullets as *examples* feeding it. (The polish-specific bullets — false-positive checks, repeated Skip on a check, threshold drift — are the valuable part; keep them.)

9. **[X] `temperature: 0` is mandated ~8 times** (SKILL.md Phase 3, rubric.md, voice-sampling.md, patch-contract.md ×2, editorial-pass.md ×3) — but no skills-standard platform exposes a temperature knob for in-session judging or Task-tool subagents. It's an intent statement ("be deterministic, cite evidence") dressed as an API parameter; on every real platform it's a no-op the model must politely ignore. The actual determinism comes from the output schema + the no-evidence-no-action rule. **Fix:** state the determinism intent once in the LLM-judge contract; delete the parameter cosplay.

10. **[G/V] Checks 4 and 14 overlap.** Both examine the first paragraph for the same principle (`_shared/writing-principles.md` #1 "Lead with the claim" maps to both): 4 fails on throat-clearing phrases or >3 sentences before the claim; 14 fails if the first paragraph doesn't state the claim. Nearly every doc that fails one fails both — two judge calls, two findings, one fix. **Fix:** merge into one "lede" check with two cited failure modes. (Touches the check numbering that risk/scope tables and tests key on — structural, do alongside fix 1.)

11. **[S] Phase 1 input resolution (file / URL / `notion://` / inline) is polish-local, but /primer, /ideate, and /artifact each handle similar free-form input shapes.** The existing `_shared/resolve-input.md` is pipeline-artifact-specific (numbered feature-folder files), so this isn't a misuse — it's a missing substrate. Low priority; only worth doing when a third skill needs `notion://`.

12. **[R — positive, keep]** Things a colleague would thank you for: the reference factoring is real progressive disclosure (rubric/presets/chunking/voice/patch/findings/editorial each one level deep, loaded per branch — closest thing in this plugin to Pocock's improve-codebase-architecture shape); the `writing-principles.md` ↔ `rubric.md` two-way sync note; the apply-edit-at-anchor section *citing* the shared contract instead of restating it ("MUST cite that file rather than restate", per NFR-08); the Phase 7 summary block as a concrete output contract; the replace-prompt git-aware `.bak` safety; HTML fidelity as best-effort-warn rather than hard-fail.

## Flags inventory

| Flag | Purpose | Verdict |
|---|---|---|
| `--preset <name>` | Skip the Phase 2 preset prompt; also the abort message's recovery path ("re-run with `--preset concise`") | **Keep.** Discoverable (argument-hint + abort message). Natural language ("polish this as a technical doc") should resolve it too — say so in Phase 2. |
| `--reduce <pct\|range>` | Set the editorial-reduction target, suppress the gate | **Keep, document NL equivalence.** The description already lists "shorten this doc by ~30%" as a trigger — the skill should parse that phrasing into the same target without requiring the flag. Flag stays for `--non-interactive` determinism. |
| `--dry-run` | Rubric report (+ editor notes) only, no patches | **Keep.** Map "just critique it / findings only" to it in prose. |
| `--checks <path>` | Replace the default custom-checks file | **Keep.** Power-user, well-specified (exclusive of the default — documented). |
| `--non-interactive` / `--interactive` | Repo-wide W14 mode contract | **Keep** (enforced contract; not this skill's to change). |

## Gates & rubrics inventory

The 14 checks (each individually assessed — special attention):

| Check | Mode / risk | Hard or soft | Failure it catches | Verdict |
|---|---|---|---|---|
| 1 clutter words | regex, auto-apply | hard | filler ("very/just/in order to") | **Keep-hard.** Honest detector; "just"/"actually" false positives are real but bounded by voice markers, per-patch QA, and learnings capture. |
| 2 passive ratio | llm-judge, surfaced | hard | passive-voice overuse | **Soften → script the count** (finding 1). Keep the judge only for citing the worst sentences. The % threshold as LLM output is noise. |
| 3 sentence stddev | llm-judge, surfaced | hard | monotone machine rhythm | **Move to script.** The same stddev is already computed deterministically in voice-sampling.md. Worst offender in the rubric. |
| 4 throat-clearing | llm-judge, surfaced | hard | warm-up before the lede | **Keep; merge with 14** (finding 10). Genuinely judgment-shaped. |
| 5 em-dash density | regex+count, auto-apply | hard | em-dash tic | **Keep-hard.** Deterministic, threshold per-preset, patch preserves rhythm. |
| 6a AI-vocab hard bans | regex, auto-apply | hard | "delve/tapestry" slop | **Keep-hard.** Note the ban list is time-bound (2023–24 slop vocab); custom-checks.yaml is the right extension point — say so in the rubric. |
| 6b AI-vocab soft flags | llm-judge, auto-apply | hard | decorative "robust/leverage" | **Keep.** Best-in-class LLM-judge use: concrete-vs-metaphorical is a judgment, with cited evidence required. |
| 7 tricolon | llm-judge, surfaced | hard | rhetorical triplets | **Keep; threshold advisory.** The genuine-list vs rhetoric judgment is right; "≤2 per 500 words" implies calibration that presets.md admits doesn't exist yet ("Calibrate after first real-world use"). |
| 8 not-just-X | regex, **auto-apply** | hard | "not just X, it's Y" | **Keep detection; reclassify high-risk** (finding 6). The patch deletes a claim — that's the surfaced lane's job. |
| 9 hedging stack | regex, auto-apply | hard | ≥2 hedges per sentence | **Keep-hard.** Crisp deterministic rule; single-hedge prose passes. |
| 10 empty transitions | regex, auto-apply | hard | Furthermore/Moreover openers | **Keep-hard.** Restrained (count >1, "However" not banned). |
| 11 header inflation | llm-judge, surfaced | hard | deep headings / stub sections | **Move to script.** Both criteria (depth >3, avg words/section) are trivially computable. |
| 12 bullet abuse | llm-judge, surfaced | hard | prose masquerading as bullets | **Keep.** Judgment-shaped ("flow naturally into each other"). |
| 13 vague abstractions | llm-judge, surfaced | hard | ungrounded claims | **Keep.** The highest-value check in the rubric; pure judgment, correctly high-risk. |
| 14 weak/buried lede | llm-judge, surfaced | hard | no BLUF | **Keep; merge with 4.** |

Operational gates:

| Check | Hard or soft | Failure it catches | Verdict |
|---|---|---|---|
| LLM-judge contract: fail-without-cited-spans = pass | hard | judge hallucinating violations with no evidence | **Keep-hard.** The single best rule in the skill. |
| `temperature: 0` mandates (×8) | hard (nominal) | nondeterministic verdicts | **Delete the parameter; keep one intent line** (finding 9). Not settable on any target platform. |
| Phase 3 `rubric_results` YAML precondition | hard | patching without a structured findings record | **Keep** — cheap structured handoff; the budget `<N>` keys off it. |
| Phase 4 budget estimate + >30-calls mandatory prompt | hard | runaway cost without consent (spec risk table: "Convergence loop / runaway cost") | **Keep gate; soften formula to intent** (finding 5). |
| Phase 5 write-gate (no Write/Edit before findings round) | hard | silently overwriting the user's prose with high-risk rewrites | **Keep-hard.** Core trust contract. |
| 2-iteration cap | hard | runaway convergence loop (origin: 02_spec.md §4.7 + risk table) | **Keep-hard.** |
| Per-patch QA, 2-retry cap, "partial fix" surfacing | hard | patches introducing new violations (origin: spec risk table) | **Keep-hard.** |
| 30% voice-conflict abort (low-confidence exempt) | hard | `PRESERVE_VOICE_CONFLICT` lazy abuse / preset-doc mismatch (origin: spec §4.5) | **Keep-hard.** Well-designed: exemption documented, recovery message names the fix. |
| 25,000-word ceiling | hard | unbounded runtime/cost (origin: spec line 124) | **Keep-hard.** |
| 4,000-word chunking threshold + stitch byte-check | hard | context-window overflow; chunk-boundary corruption | **Keep.** Boundary byte-check failing the run (markdown) vs warn (HTML) is the right asymmetry. |
| Editorial re-critique cap = 1 | hard | reduction-target chase loop (GR-3, 2026-05-13_polish-editorial-pass) | **Keep-hard.** |
| HTML fidelity byte-diff → best-effort + warn, no default-yes | soft | markup corruption silently replacing the original | **Keep.** Exemplary: never hard-fails, removes the dangerous default instead. |
| Custom-checks schema validation, print-and-continue | soft | malformed user YAML silently skipped | **Keep.** |
| TodoWrite-first gate | hard (nominal) | user can't see progress | **Soften to one line** (finding 7). |
| Phase 8 mandatory learnings reflection | hard | repeated false positives never feeding back | **Keep** (repo convention; "zero learnings is valid" is the right escape) — but resolve the shared-vs-inline duplication (finding 8). |
| Replace prompt: git check → `mv`, else `.bak` | hard | data loss on replace | **Keep-hard.** |

## Fix list

| Fix | Type | Impact | Risk |
|---|---|---|---|
| Delete Anti-Patterns section; fold 3–4 non-obvious rules into their phases (finding 2) | quick-win | high | low |
| Collapse Phase 2a to ~8 lines pointing at editorial-pass.md (finding 3) | quick-win | high | low — reference already holds the full contract |
| Script-ify checks 2, 3, 11 (`scripts/metrics.js`); judge cites spans only (finding 1) | structural | high | med — touches rubric mode table, expected.yaml tests |
| Fix "2.5" → "2a" (line 14); renumber phases linearly; fold Phase 8 into the final phase (finding 4) | structural | med | low-med — phase labels referenced in 4 reference files |
| Reclassify check 8 as high-risk/surfaced (finding 6) | quick-win | med | low — adds one prompt per occurrence |
| Replace budget verbatim-block + `×1.3` formula with intent; keep >30-calls rule (finding 5) | quick-win | med | low |
| Reduce TodoWrite ritual to one line (finding 7) | quick-win | med | low |
| Point Phase 8 solely at `_shared/learnings-capture.md`, keep polish bullets as examples (finding 8) | quick-win | low-med | low |
| State determinism intent once; delete `temperature: 0` ×8 (finding 9) | quick-win | low | low |
| Fix orphaned "SKILL.md §5.2" / "§4.5 of spec" references (finding 4c) | quick-win | low | low |
| Merge checks 4 + 14 into one lede check (finding 10) | structural | med | med — renumbering ripples through risk/scope tables + fixtures |
| Note 6a's ban list as time-bound, extension via custom-checks (check table) | quick-win | low | low |
