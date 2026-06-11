# Skill-design review — pmos-toolkit + pmos-learnkit

**Date:** 2026-06-10 · **Scope:** all 38 skills in both plugins + shared substrates · **Method:** 27 independent per-skill reviews + 3 cross-cutting passes (substrate, flags/phases, platform/gates), all against [criteria.md](criteria.md) with Matt Pocock's skills repo as the style north star. Detailed findings: [per-skill/](per-skill/) and [cross-cutting/](cross-cutting/).

## Verdict in one paragraph

Your fear was specific — "I have incrementally updated the skills piece by piece over time and it might have led to incoherence / verbosity / prescriptive flows" — and it is **confirmed, with evidence, but not where you might expect**. The *architecture* is mostly right: the pipeline shape, the orchestrator-plus-thin-aliases pattern, the script/model division of labor (magazine, survey-analyse), the reference-file factoring (polish, wireframes, artifact), and the substrate idea all hold up well against Pocock. What has rotted is the **maintenance layer between the parts**: facts stated in two places with no lint binding them have drifted into ~35 verified contradictions, including several that silently disable behavior (a resume-aborting schema-version contradiction, an unreachable `--update` mode, an unsatisfiable hard gate, a checked-in test that fails at HEAD, a repair script that is destructive in every invocation). The verbosity is real too — most SKILL.md bodies are 40–60% trimmable with zero behavior change — but it is mostly *one* disease: skills restating their own reference files and substrate contracts inline, plus spec residue (FR-/D-/T-tags) that leaked from feature folders into runtime instructions.

## Grades

| Grade | Skills |
|---|---|
| A / A- | skill-sdlc (A), critical-thinking (A-) |
| B+/B/B- | prototype-sdlc, grill, msf-wf, msf-req, comments, people, survey-analyse, changelog, session-log, learn-list, magazine, frameworks, playbook, backlog (B-), ideate (B-) |
| C+/C | requirements, spec, plan, execute (C+), verify, complete-dev (C+), feature-sdlc, creativity, wireframes, prototype, diagram (C+), artifact (C+), polish (C+), design-crit, simulate-spec, mytasks, architecture, survey-design, product-context, primer |
| D | readme |

Pattern: the **newest and smallest** skills grade best (critical-thinking, frameworks, magazine — the lessons are being learned); the **pipeline core** — your most-used skills — carries the most accretion debt because it was edited the most.

## Systemic findings (ranked)

### 1. Correctness debt: facts stated twice, drifted once — silently
The single disease behind ~35 verified defects. Worst instances:

- **feature-sdlc declares state schema v4 current; state-schema.md (and its own prototype section) require v5** — read literally, resuming a prototype run aborts. (per-skill/feature-sdlc.md)
- **readme's `--update` mode is unreachable**: gated on a complete-dev "Phase 7.6 readme_update_hook" that never shipped. A second phantom: feature-sdlc claims complete-dev reads `state.base_drift` — it doesn't. (per-skill/readme.md, complete-dev.md)
- **wireframes' Phase 6 hard gate validates against a `sections.json` no phase of the skill generates** — unsatisfiable by construction. (per-skill/wireframes.md)
- **verify's checked-in smoke test fails at HEAD** (greps for a renamed heading) and its one universal hard gate (`check-comments-coverage.sh`) only exists in this repo — unsatisfiable in every host repo. (per-skill/verify.md)
- **`tools/audit-recommended.sh` is red at HEAD** (exit 1, 31 unmarked prompts) — gate atrophy: a CI gate everyone has learned to ignore. (cross-cutting/platform-gates.md)
- **`scripts/sync-shared.sh` is destructive in every possible invocation** (whole-tree `rsync --delete` over diverged `_shared/` trees: `--from=pmos-toolkit` deletes learnkit's topic-research substrate). The FR-30 drift hook it pairs with is installed nowhere. (cross-cutting/substrate.md)
- **spec's Phase 6a still operates on retired `02_spec.md`** (4 refs) — its clobber guard is a silent no-op. Same retirement missed: artifact (×2), creativity (whole write side), `output_format=both` advertised in ~15 argument-hints after being retired.
- **12 dead flags** (documented, no mechanism) + 2 phantom cross-skill flag contracts (`/grill --deep`, `--tier` passthrough). (cross-cutting/flags-phases.md)
- **22 in-file ghost phase references + 7 cross-skill phantoms**, mostly from one renumbering commit (`a76a5da`) that fixed headings but missed non-heading surfaces. (cross-cutting/flags-phases.md)
- **Rubric headers lie about their own counts**: skill-eval says 39 checks (real: 41), readme says 15 (real: 18), polish says 14 (real: 15).
- **learnkit's `_shared/` is a stale fork**: 3 generations of the non-interactive block coexist; ~1,360 lines of dead toolkit cargo with zero learnkit consumers.

**Root cause and durable fix:** every one of these is a fact maintained by hand in ≥2 places. The fix is not "be more careful" — it's (a) state each fact once and cite it, (b) add two ~30-line lints that the flags/phases reviewer already prototyped: a flag-vs-argument-hint cross-check and a phase-reference resolver. Those two checks would have caught ~34 of the defects deterministically.

### 2. The duplication tax: 5 patterns, ~765+ lines, all drifting
(cross-cutting/substrate.md has the full map.)

| Pattern | Where | ~Lines | Drift? |
|---|---|---|---|
| Folded-phase mechanics | requirements, spec ×2, wireframes, verify | 230 | drifted + rotted (guards target retired `.md` artifacts) |
| HTML-emit/asset-copy block | 17 skills | 220 | drifted (3 different copy commands) |
| Findings protocol (Fix/Modify/Skip/Defer) | ~12 surfaces | 210 | drifted; survey-design cites a `_shared` home that doesn't exist |
| Tier definitions | 5 skills | 55 | semantics drifted |
| Reviewer Input Contract | 5 skills | 50 | near-identical (cleanest extraction) |

**Fix order matters:** repair `sync-shared.sh` (manifest-based, never-delete-unlisted) *before* extracting, or the extractions create more hand-sync surface. Then extract pointer-first: each skill keeps a 1–3 line citation + genuine deltas.

### 3. Verbosity: one cause, mechanical cure
Median trim across reviewed skills: **~45% with zero behavior change**. Three mechanical sources:

1. **Spec residue** — FR/D/T/W tags pasted into runtime prose (plan ~99, spec 57, primer ~60, playbook ~20, architecture, magazine…). Build-time traceability has no business in instructions the model executes; for marketplace installs the references are *unresolvable*. Strip globally; keep one spec-lineage footnote per skill.
2. **Restating own references** — bodies re-narrate what their reference files/scripts already own (magazine Phases 2–3, frameworks Phases 2/5, mytasks enums ×3, backlog, architecture's three rule statements + drift-police guarding the self-inflicted copies, ideate's ladder, playbook, polish's 22-item anti-pattern restatement). Pocock's big-skill pattern — intent + pointer + the one inviolable rule — applies directly.
3. **Triple-stated rules inside one file** — prototype's x-interaction mapping (×3), survey-design's asset-tiering (×4), session-log's /reflect boundary (×3), magazine's redirect-don't-pipe (×4 across 3 files).

What is **not** ballast: release mechanics (complete-dev), evidence gates (verify Phase 4 core — traced to the 2026-05-03 "teeth" incident), survey.json IR, quote-grounding anti-hallucination rules, the 2-loop caps (documented cost governors). The reviewers consistently steelmanned these and they survive.

### 4. Prescriptiveness: prose pretending to be a program
The repo's signature failure mode (Pocock's opposite): encoding state machines in prose the model cannot reliably execute —

- plan's pid lockfiles, sha256 finding-hashes, 5-minute wall-clock caps, dead `PMOS_NESTED` env gate
- polish rubric checks 2/3/11 asking an LLM to compute passive-%, sentence-stddev, heading metrics at a fictional `temperature: 0` (while a deterministic stddev script *already exists* in the same skill)
- PSYCH/MSF arithmetic (entry constants 60/40/25, summed deltas, behavior-driving thresholds) — false precision; the per-element walkthrough is the valuable part
- feature-sdlc's token-1 dispatch grammar — the over-precision itself caused three real mis-dispatch bugs at the alias seam
- architecture's `temperature: 0` Task-tool claims

**Policy that falls out:** if it's arithmetic or state, it's a script; if it's judgment, it's a principle; prose state machines are neither. The repo already discovered this locally three times (polish's regex/judge split, diagram's hard/warn gradient, magazine's Stage-A/Stage-B) — it's just not written down in skill-patterns.md.

### 5. Flags: 137 where ~35 would do
(cross-cutting/flags-phases.md.) Max 20 per skill (magazine), median 7.5. Six vocabularies for the same effort dial (`--depth` ×3 value-sets, `--rigor`, `--deep`, `--tier lite|full`); `--no-*` vs `--skip-*` with no rule; `--media` vs `--medium` coexisting in one skill with different meanings.

**Proposed 4-test policy** (a flag is justified iff): machine coupling (another skill passes it literally) · destructive/expensive opt-in · typed value that NL mangles · headless determinism. Everything else → natural language. Applying it cuts ~100 flags; converge the effort dial on `--depth brief|standard|deep`, negation on `--no-*`.

### 6. Phases: numbering is the symptom, anchors are the cure
19 of 36 phase-bearing skills have accreted numbering (0c, 2.5f, 4b-inside-Phase-5, three colliding schemes in wireframes alone). Renumbering alone re-creates the bug (commit `a76a5da` proved it: fixed headings, orphaned ≥6 cross-references). **Policy:** integer top-level phases; stable slug anchors (`{#version-bump}`) for every cross-reference (cross-skill, log-line contracts, schemas); the ~30-line phase-ref resolver as a lint.

### 7. Gates & rubrics: keep the deterministic half hard, demote taste
(cross-cutting/platform-gates.md.) Of ~19 enforcement mechanisms: **keep ~14 hard** (all deterministic scripts/CI, [D] rubric halves, quote-grounding, verification-first fetch gates, loop caps) — these trace to real incidents and catch real failures. **Soften ~6 skill-eval taste-[J] checks** (pushy-description, context-economy, imperative-form, explain-why…) — binary fails on vibes trigger full remediation loops over wording nits, and they're model-version-coupled. **Delete zero.** Move polish's 3 arithmetic checks to a script. Your instinct ("should they be soft flags or hard checks?") has a crisp answer: *deterministic = hard, judgment = advisory, arithmetic = script*.

### 8. Cross-platform: specified, never exercised
36/39 skills depend on AskUserQuestion (~290 refs) with followable degradation notes — the design is sound, and inline-by-construction beats externalization for self-containment (the W14 rationale wins on the merits). But: the byte-identical guarantee holds only where the lint looks (pmos-toolkit); learnkit carries a stale fork; zero skills ship the Codex sidecar their own rubric requires; no non-Claude run has ever been recorded. Minimum honest posture: extend the lint repo-wide, re-sync the drifted blocks, shrink the block to its ~10-line behavioral core, run one real Codex smoke test.

### 9. Readability: the Pocock delta in one sentence
His skills read like a senior engineer explaining a discipline; yours read like the *output of a process* — phase headers, contract blocks, FR-tags, Track Progress ceremony — even when (artifact's 47-line reviewer prompt, ideate's "When NOT to use", changelog's Rules, magazine's trust rule) the underlying writing is excellent. The trims in findings 2–4 are also the readability fix; no separate workstream needed. One stylistic upgrade worth stealing outright: Pocock states *the* load-bearing insight prominently ("**This is the skill.** Everything else is mechanical") — most pmos skills have such a sentence buried (magazine's "never fabricate; degrade honestly" is scattered across 6 locations).

## What's genuinely good (keep, and keep doing)
- Orchestrator + thin aliases (skill-sdlc is an A: 18 lines, zero duplication, self-documenting exemption)
- Deterministic-scripts/model-judgment splits: magazine Stage-A/B, survey-analyse's selftested helpers, frameworks' corpus pipeline, diagram's deterministic hard-fails
- Reference factoring done right: polish, wireframes' 52-file tree (it IS progressive disclosure, not sprawl), artifact's template/eval/preset engine
- Anti-hallucination invariants: "fail with no cited spans = pass", quote-grounding (≥40-char substring)
- Provenance discipline: most caps traced cleanly to feature folders — the decision history is *recoverable*, which is rare
- learnkit's topic-research substrate boundary (D12: typed outputs, names no skill — test-enforced)

## Prioritized fix program

**P0 — correctness (quick, mechanical, restores intended behavior):**
schema v4/v5; spec's `02_spec.md`→`.html` ×4; verify smoke-test regex + repo-scoped hard gate; readme `--update` un-gating + phantom Phase 7.6 excision; wireframes' unsatisfiable gate; complete-dev Track Progress/lastrun staleness + rollback-recipes rewrite (destructive path!); grill `--deep` call-site fix; learn-list template tokens; backlog enum drift; rubric count headers ×3; audit-recommended baseline; 12 dead flags; sync-shared.sh defusal.

**P1 — systemic hygiene (mechanical at scale):**
strip FR-tag soup repo-wide; extract the 5 duplication patterns pointer-first (after sync-shared fix); de-triplicate in-file rule statements; add the two ~30-line lints (flags-vs-hint, phase-ref resolver) to skill-eval; re-sync learnkit `_shared/` + delete dead cargo.

**P2 — design changes (each a /skill-sdlc run):**
flag policy adoption + effort-dial convergence; phase renumber with slug anchors; soften 6 taste-[J] checks + codify hard/advisory/script policy in skill-patterns.md; polish checks 2/3/11 → script; PSYCH arithmetic → judgment-assigned bands; plan's prose state machines → model-executable equivalents; diagram non-interactive self-fixing; prototype "what question does this answer" gate; design-crit consumes `_shared/psych-scoring.md`; readme SKILL.md rewrite (D-grade); architecture judge-mode merge.

**P3 — strategic (decide, then schedule):**
shrink non-interactive block to behavioral core; Codex smoke run; mytasks/backlog NL-routing hybridization; architecture L1-rules → ruff/ESLint delegation; creativity write-side modernization.

## Decisions (2026-06-10, with maintainer)

1. **Fix scope:** full P0 batch applied this session (no skill renames). P1–P3 remain proposals routed through `/skill-sdlc`.
2. **Phantom contracts:** deleted, not implemented (readme's complete-dev "Phase 7.6 readme_update_hook" gate; feature-sdlc's `state.base_drift` claim). `--update` runs gated by its own per-section prompts.
3. **Gates policy adopted:** *deterministic = hard gate, judgment = advisory, arithmetic = script.* To codify in skill-patterns.md; soften ~6 skill-eval taste-[J] checks; script polish's 3 metric checks; PSYCH arithmetic → judgment-assigned bands.
4. **Flag policy adopted — hybrid, NL-first with flags as sugar:** every skill must honor natural-language equivalents; flags passing a 4-test (machine coupling / destructive opt-in / typed value / headless determinism) remain documented contracts; the rest stay usable but leave argument-hints. Naming converges on `--depth brief|standard|deep` and `--no-*`.
5. **`output_format=both`:** confirmed retired (html-authoring README FR-12.1, "treated as html"); residual sidecar-emitting clauses are staleness to scrub.

## Status: P1/P2 executed (2026-06-11)

The full P1 + P2 campaign shipped on branch `refactor/skill-design-p1p2` (40+ commits; plan at `p1-p2-plan.md`, controller log at `p1-p2-stragglers.md`). One coordinated multi-wave run instead of per-skill `/skill-sdlc` passes:

- **Wave 0** — policies §H–§L codified in `skill-patterns.md`; `skill-eval.md` softened to 53 checks (47 gated = 24 [D] + 23 [J], 6 advisory, floor 43) with selftest count assertions; `tools/lint-flags-vs-hints.sh` + `tools/lint-phase-refs.sh` created and wired into `.github/workflows/skill-hygiene.yml`; learnkit/utilities `_shared` resynced, non-interactive lint now all-plugins (36 skills byte-identical).
- **Wave 1** — five canonical substrate surfaces extracted to `_shared/`: findings-dispositions, folded-phase, tier-matrix, reviewer-protocol, html-authoring emit-citation pattern (+ psych-scoring and canonical sim-spec-heuristics landed via their Wave-2 packages).
- **Wave 2** — all 28 packages rewritten across 4 batches (A pipeline-core, B authoring/visual, C utilities, D learnkit) with disjoint ownership; FR-tag soup stripped to per-skill "Spec lineage" footnotes; median SKILL.md roughly halved (spec 705→366, requirements 721→406, wireframes 758→378, readme 487→216); flag policy + phase slugs applied throughout; machine-coupled flags preserved verbatim.
- **Wave 3** — cross-skill reference repair (both lints PASS repo-wide); full gate sweep green (audit-recommended, non-interactive inline, fanout ×2 plugins, comments coverage, verify smoke, comments 10 suites, readme 17, architecture 46/47 — `ts-circular` pre-existing red on main); stale tests converged on current contracts (`--format` valid set {html, md}, 5 pipeline fixtures → slug-form greps, sync-shared fixture tests → intersection-only contract); 4 adversarial behavior-preservation reviewers over `git diff main...HEAD` per batch; skill-eval [D] green on the 5 biggest rewrites (feature-sdlc carries one accepted residual: `e-scripts-dir` for the deliberate `tools/` layout).

**Remaining P3 (unchanged, decide-then-schedule):** non-interactive block shrink (incl. parameterizing the hardcoded `pmos-toolkit:` prefix in the end-of-skill summary), Codex smoke run, mytasks/backlog NL-routing hybridization, architecture L1→ruff/ESLint delegation, creativity write-side modernization, readme `--update` hook. **Post-campaign follow-ups logged in `p1-p2-stragglers.md`:** audit-recommended scope extension to learnkit/utilities, §L model pins for prototype/polish dispatch sites, stale release-snapshot asserts (marketplace-version 3-way, survey-design v2.36 snapshot), jsdom-dependent tests need `/tmp/pmos-jsdom`.

Releases (`/complete-dev` per plugin) and the merge to main are the maintainer's call.
