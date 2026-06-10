# survey-design — review

**Grade:** C (would a thoughtful reviewer call this well-designed for its job? The architecture yes — the survey.json IR, derive-don't-edit, and the anti-pattern catalog are A-grade decisions. The SKILL.md prose is not: it is 2× its load-bearing size, restates its own rules up to four times, and carries an inert flag and a ceremonial scoring rubric.)
**Size:** SKILL.md 436 lines (407 excluding the 29-line non-interactive block); references 3 files / 775 lines (best-practices 230, antipatterns 283, platform-export 262) + assets/survey-preview.js 653; target ~200 lines (incl. non-interactive block), with the §3.1–3.3 schema moved to a reference file.

## TL;DR

- **Biggest win available:** roughly half the body is repetition of itself. The two-tier substrate-asset rule is stated in full four times (Platform Adaptation, §3.6, Phase 7, E20/E21); the cosmetic-only carve-out three times (Phase 5, Phase 6, Anti-Patterns, E22); D5 derive-don't-edit three times. State each rule once, where it bites, and the file halves with zero behavior change.
- **Biggest risk in current design:** the §4.2 reviewer return contract (~45 lines of exact lead-line formats, table column names, action enums, changelog table shapes) couples the skill to a specific output theater. Only the machine-block YAML is actually consumed by the parent; the rest is prescription where intent would survive model upgrades better.
- **Done well, worth keeping:** the `survey.json` intermediate representation. It is the single mutation point (D5), the pure-function input to all three exporters (NFR-05 byte-identical), and the handoff interface to `/survey-analyse --survey-json`. This is exactly the "config externalized, artifacts derived" shape the north star asks for. Also keep: the question-antipatterns catalog with per-entry detection signals — genuine domain teaching, properly progressive-disclosed.

## On the special-attention question

**Is the simulated-respondent pass over-machinery?** No — but its packaging is. The origin (docs/pmos/features/2026-05-11_survey-design-skill/01_requirements.html) grounds it in the cognitive-interviews → soft-launch pretesting literature and frames it explicitly as a lightweight stand-in ("adds the 'did anyone actually try it' check that catches length and comprehension problems a static rubric won't"), with the FR-44 disclaimer mandated in output. That's a defensible, cheap (~1 subagent) check the static reviewer cannot do — it catches cumulative-time and comprehension friction. The theater-check (re-dispatch once when a persona returns zero findings while the reviewer found ≥3) addresses a real LLM failure mode (cooperative-persona theater) and is capped at one retry; keep it, but it can be two sentences of principle plus the (good) impatient-respondent suffix, not a mini-protocol with a log-line format.

**Is `survey.json` the right design?** Yes — see TL;DR. The IR earns its keep four ways: derive-don't-edit invariant, deterministic exporters, sister-skill handoff, and per-phase re-derivation after edits. Removing it would force the reviewer/simulator/exporters to parse HTML.

## Findings

1. **[V] Quadruple-stated rules.** The hard-required/convenience asset tiering appears in full in Platform Adaptation (line 21), §3.6 (lines 224–226), Phase 7 (line 313), and E20/E21 (lines 434–435) — ~30 lines saying one thing. Same pattern for the cosmetic-only carve-out (Phase 5 line 293, Phase 6 line 309, Anti-Patterns line 387, E22) and D5 (lines 232, 382, 365). Why it matters: every restatement is a future drift site, and the file reads as accreted, not designed. Fix: one canonical statement each, cross-referenced by one clause elsewhere.
2. **[V] The E1–E22 edge-case table (26 lines) indexes prose that already exists** — its own header admits "behaviours are in the phase prose above". Half its rows restate the obvious (E1 "no argument → ask", E6 "reviewer finds nothing → proceed"). Fix: delete the table, or keep only the 5–6 rows encoding non-obvious decisions (E10 field-over-budget-anyway, E14 backward skip-logic rewrite, E17 author-supplied never auto-cut, E18 revert-on-invalid).
3. **[P] §4.2 reviewer return contract over-prescribes.** ~45 lines mandate exact lead-line syntax (`predictability: PASS|FAIL — …`), findings-table column names, a changelog table with a `score Δ` column, and an action enum. The parent consumes only the machine block. Fix: keep the machine-block YAML schema verbatim (it is parsed); compress the two markdown bodies to intent — "per-question product-fit verdicts on the three checks with evidence, then methodology findings each with severity/defect/proposed fix; clean questions still get a section so coverage is checkable."
4. **[G] The 0–100 score + 8 weighted sub-scores are ceremony by their own admission.** §4.2 computes `Score: N/100` with 8 sub-scores per iteration; §4.3 says "the `score` is **not** consulted"; the Anti-Patterns section repeats "progress signal, not a threshold" (D20). Origin check: 01_requirements.html in `2026-05-11_update-skills-survey-design-fixes` justifies the *categorical* exit ("a single LLM-judge score near a hard cutoff would…" — keep that) but only claims the score is "shown as a progress signal ('72 → 91')". A finding-count-by-severity line gives the same signal for free. Fix: soften — drop the sub-score arithmetic; keep categorical exit + a `N findings (X blocker / Y should-fix)` trendline.
5. **[S] Orphaned substrate citation: the "findings/dispositions protocol" does not exist in `_shared/interactive-prompts.md`.** Phase 5 says "per the `_shared/interactive-prompts.md` findings/dispositions protocol" — that file (75 lines, read in full) covers per-field capture prompts for /mytasks//people//backlog and contains no findings/dispositions content. The actual protocol (severity-ordered batches ≤4, `Fix as proposed (Recommended)` / Modify / Skip / Defer) is duplicated inline across ≥8 skills (wireframes, msf-wf, plan, spec, requirements, polish, readme, artifact, feature-sdlc — grep-verified). Fix: create `_shared/findings-dispositions.md`, cite it from all consumers, fix this skill's dangling pointer.
6. **[F] `--format html|md|both` is inert.** Phase 0 step 3's own text: "It governs only feature-folder docs (none here)". A flag that the skill documents as doing nothing is pure confusion surface. Fix: delete from `argument-hint` and Phase 0 (note the substrate-conformity rationale in a comment if the lint requires the resolution stanza).
7. **[R] Stale `.comments.json` sidecar prose.** The "Apply comment-resolver edit" section describes `/comments resolve` "walking open threads in a survey artifact's `.comments.json` sidecar" — the sidecar contract was retired in v2.58.0 (2026-05-28, inline `pmos-comments` block; see repo CLAUDE.md "Inline doc comments"). Behavior is safe (the normative contract is `_shared/apply-edit-at-anchor.md`), but the prose contradicts the current system. Also: the same section restates the 3-step id-first/quote-fallback resolution order despite saying it "MUST cite that file rather than restate the contract"; and the NFR-08 link `../../../docs/pmos/...` resolves to `plugins/docs/...` (one `../` short). Fix: update prose, drop the restated resolution order, fix the link depth.
8. **[V] §3.1–3.3 (schema + type enum + invariants + time constants, ~78 lines) belongs in a reference file.** It is load-bearing — it's the IR contract — but it is needed only in Phase 3, exactly the progressive-disclosure case the skill already applies to its other three references. The 30-line single-paragraph type enum (line 192) is the least readable passage in the file. Fix: move to `reference/survey-json-schema.md`; keep a ~10-line digest (type list + the 4 invariants most likely to be violated: anonymous-forbids-PII, no backward skips, balanced scales, reference_period on retrospectives).
9. **[V] "Release prerequisites" (lines 394–405) is authoring-time process, not runtime instruction.** Canonical path, version-bump rules, README rows, CHANGELOG — all already enforced by repo CLAUDE.md + the skill-eval rubric. At runtime it is 12 dead lines a model must read past. Fix: delete (the skill-eval rubric and CLAUDE.md are the backstop).
10. **[Ph] Phase structure is mostly earned, with two smells.** Phases 0–9 map to real stages (intake → variables → generate → review-loop → dispositions → simulate → viewer → export → summary) — this is domain-complex-long, not distrust-long. Smells: §3.5/3.6/3.7 are sub-phases doing one sentence of work each, and the header register shifts ("Phase 0 — Setup" vs "Phase 9: Summary"). Phase 7 (Viewer) is one `cp -n` + one index regen — fold into Phase 3.6/Phase 9.
11. **[X] Cross-platform posture is good.** The Platform Adaptation section names a degradation path per missing tool (inline sequential subagents, numbered prompts, verbal phase announcements) and they match what the body actually does. The two-tier asset rule's placement here is the only mismatch (it's not platform adaptation; it's error handling).

## Flags inventory

| flag | purpose | verdict |
|---|---|---|
| `--export <platform[,platform]>` | pre-select export targets | fold into natural language — Phase 8 already honors "a platform named in the initial context"; the flag is redundant with its own NL path. Keep only if non-interactive determinism demands it; then say so. |
| `--skip-export` | skip Phase 8 | fold into natural language ("don't export") — same auto-pick contract covers non-interactive. Low harm if kept. |
| `--format html\|md\|both` | output_format override | **delete** — inert by the skill's own text (governs feature-folder docs; "it normally writes none"). |
| `--non-interactive` / `--interactive` | repo-wide mode contract | keep (global contract; assess once, globally). |

## Gates & rubrics inventory

| check | hard or soft | failure it catches | verdict |
|---|---|---|---|
| Phase 4 loop: 2-iteration cap, categorical exit (zero product-fit FAILs + zero blockers) | hard | unbounded review loops; score-threshold flapping near a cutoff (origin: 2026-05-11_update-skills-survey-design-fixes/01_requirements.html) | keep-hard |
| 0–100 score + 8 sub-scores | soft (informational only) | nothing — explicitly never consulted | delete the arithmetic; keep a finding-count trendline |
| Reviewer output validation (per-question section count == question count; machine block parses; one re-dispatch) | hard | malformed/partial subagent output silently applied | keep-hard, compress wording |
| §3.2 schema invariants (anonymous⇒no PII, forward-only skips, balanced scales, reference_period, required-sensitive⇒opt-out) | hard | real methodological defects that survive prose review | keep-hard (move with schema to reference) |
| Anti-pattern self-check vs catalog (FR-22) | hard | leading/double-barreled/etc. stems | keep-hard — this is the skill's core value |
| Trim-to-budget (§3.5) + E10 over-budget flag | hard | over-long surveys → drop-off | keep-hard |
| D10 author-supplied questions rewrite-only, never auto-cut | hard | skill silently deleting the user's own questions | keep-hard |
| D12/E18 invalid-regeneration revert | hard | loop corrupting a valid survey.json | keep-hard |
| Theater-check re-dispatch (1 retry) | soft | cooperative-persona "nothing's wrong" theater | keep, compress to 2 sentences + the suffix |
| Two-tier substrate-asset abort/warn | hard | improvised degraded renderers; broken survey.html | keep-hard, state ONCE |
| Cosmetic-only carve-out | soft | decision-turn fatigue from nit prompts | keep, state once |
| FR-44 "not a substitute for cognitive interviews" disclaimer | hard | overclaiming the simulation's validity | keep-hard |

## Fix list

| fix | type | impact | risk |
|---|---|---|---|
| Deduplicate the 4×-stated asset tiering, 3×-stated cosmetic carve-out, 3×-stated D5 — one canonical statement each | quick-win | high | none — no behavior change |
| Move §3.1–3.3 schema/enum/invariants/time-constants to `reference/survey-json-schema.md` + 10-line digest | structural | high | low — matches the skill's existing reference pattern; Phase 3/4 prompts must point at the new file |
| Compress §4.2 return contract to machine-block schema + intent for the markdown bodies | structural | high | low-med — the parent parses only the machine block; eval-doc formats become advisory |
| Create `_shared/findings-dispositions.md`; fix the orphaned interactive-prompts citation (touches ≥8 skills) | structural | high | med — cross-skill change, ride one release; lint/eval references must follow |
| Delete `--format`; demote `--export`/`--skip-export` to natural language | quick-win | med | low — update argument-hint + Phase 0/8; flags have no other callers (standalone utility) |
| Drop the 0–100 sub-score arithmetic; keep categorical exit + severity counts | quick-win | med | low — score is explicitly non-gating; survey-eval.md keeps its section structure |
| Delete "Release prerequisites"; cut E-table to the 5–6 non-obvious rows | quick-win | med | none |
| Fix stale sidecar prose, restated resolution order, and the `../../../` link depth in the comment-resolver section | quick-win | low | none |
| Fold Phase 7 into Phases 3.6/9; unify phase-header punctuation | quick-win | low | none |
