---
name: simulate-spec
description: Pressure-test a spec against realistic and adversarial scenarios before implementation — scenario trace, artifact fitness critique, interface cross-reference, targeted pseudocode. Optional validator between /spec and /plan in the requirements -> spec -> plan pipeline. Use when the user says "simulate the design", "validate this spec", "will this design actually work", "check for gaps in the design", or has a spec ready for end-to-end scrutiny before implementation.
user-invocable: true
argument-hint: "<path-to-spec-doc> [--feature <slug>] [--force] [--format <html|md>] [--non-interactive | --interactive]"
---

# Spec Simulation Generator

Pressure-test a technical spec by walking realistic and adversarial scenarios through it, critiquing each artifact for fitness, cross-referencing interface and core, and producing a standalone simulation doc whose Gap Register drives coordinated spec patches. The output is both a quality gate and a durable "why we believe this design works" artifact.

This is an OPTIONAL VALIDATOR in the pipeline — runs between `/spec` and `/plan`. (`/spec` also runs a folded version of this logic by default at Tier 3 — its `#folded-sim-spec` phase; the standalone skill is for running the full interactive treatment on demand.)

**The heuristics are canonical in `_shared/sim-spec-heuristics.md`** (§1 scenario enumeration, §2 trace + Gap Register, §3 fitness buckets, §4 cross-reference, §5 gap resolution, §6 pseudocode, plus the standalone-vs-folded deltas table). This SKILL.md owns the standalone wrapper: intake, tier/scope gating, the interactive disposition loop, the trace emit, and the review pass.

**Announce at start:** "Using the simulate-spec skill to pressure-test the design."

**Flags are NL-first.** Infer options from the request — "run it anyway" on a Tier-1 spec ≡ `--force`, "markdown output" ≡ `--format md`; an explicit flag overrides the inferred intent.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:
- **No interactive prompt tool:** State your assumption, document it in the output, and proceed. The user reviews after completion.
- **No subagents:** Perform research and analysis sequentially as a single agent.

## Track Progress

This skill has multiple phases. Create one task per phase using your agent's task-tracking tool (e.g., `TodoWrite` in Claude Code). Mark each task in-progress when you start it and completed as soon as it finishes — do not batch completions.

---

## Phase 0: Load Workstream Context {#setup}

1. Follow `_shared/pipeline-setup.md` Section 0 (canonical inline block) to read `.pmos/settings.yaml`, resolve `{docs_path}`, load workstream context, and resolve `{feature_folder}` (with `skill_name=simulate-spec`, `feature_arg=<--feature value or empty>`, `feature_hint=<spec slug or topic>`). Use workstream context to inform critique — product constraints and tech-stack decisions shape what counts as a gap. This skill consumes `02_spec.{html,md}` (via resolve-input.md) and writes traces under `{feature_folder}/simulate-spec/`.
2. Read `~/.pmos/learnings.md` if it exists; note any entries under `## /simulate-spec` and factor them into your approach for this session.
3. **Resolve `output_format`.** Read `output_format` from `.pmos/settings.yaml` (default: `html`; valid values: `html`, `md` — legacy `both` is treated as `html` per `_shared/html-authoring/README.md`). A `--format <html|md>` argument-string flag overrides settings (last flag wins on conflict). Print to stderr exactly: `output_format: <value> (source: <cli|settings|default>)` once at Phase 0 entry. This controls the **trace artifact** only — spec patches applied via `Edit` in Phase 7 are unchanged (the spec is already in its primary format by the time this skill runs).

---

<!-- non-interactive-block:start -->
1. **Mode resolution.** Compute `(mode, source)` with precedence: `cli_flag > parent_marker > settings.default_mode > builtin-default ("interactive")` (FR-01).
   - `cli_flag` is `--non-interactive` or `--interactive` parsed from this skill's argument string. Last flag wins on conflict (FR-01.1).
   - `parent_marker` is set if the original prompt's first line matches `^\[mode: (interactive|non-interactive)\]$` (FR-06.1).
   - `settings.default_mode` is `.pmos/settings.yaml :: default_mode` if present and one of `interactive`/`non-interactive`. Unknown values → warn on stderr `settings: invalid default_mode value '<v>'; ignoring` and fall through (FR-01.3).
   - If `.pmos/settings.yaml` is malformed (not parseable as YAML, or missing `version`): print to stderr `settings.yaml malformed; fix and re-run` and exit 64 (FR-01.5).
   - On Phase 0 entry, always print to stderr exactly: `mode: <mode> (source: <source>)` (FR-01.2).

2. **Per-checkpoint classifier.** Before issuing any `AskUserQuestion` call, classify it (FR-02):
   - The defer-only tag, if present, is the literal previous non-empty line: `<!-- defer-only: <reason> -->` where `<reason>` ∈ {`destructive`, `free-form`, `ambiguous`} (FR-02.5).
   - Decision (in order): tag adjacent → DEFER; multiSelect with 0 Recommended → DEFER; 0 options OR no option label ends in `(Recommended)` → DEFER; else AUTO-PICK the (Recommended) option (FR-02.2).

3. **Buffer + flush.** Maintain an append-only OQ buffer in conversation memory. On each AUTO-PICK or DEFER classification, append one entry per the schema in spec §11.2. At end-of-skill (or in a caught error before exit), flush (FR-03):
   - Primary artifact is single Markdown → append `## Open Questions (Non-Interactive Run)` section with one fenced YAML block per entry; update prose frontmatter (`**Mode:**`, `**Run Outcome:**`, `**Open Questions:** N` where N counts deferred only — see FR-03.4) (FR-03.1).
   - Skill produces multiple artifacts → write a single `_open_questions.md` aggregator at the artifact directory root; primary artifact's frontmatter `**Open Questions:** N — see _open_questions.md` (FR-03.5).
   - Primary artifact is non-MD (SVG, etc.) → write sidecar `<artifact>.open-questions.md` (FR-03.2).
   - No persistent artifact (chat-only) → emit buffer to stderr at end-of-run as a single block prefixed `--- OPEN QUESTIONS ---` (FR-03.3).
   - Mid-skill error → flush partial buffer under heading `## Open Questions (Non-Interactive Run — partial; skill errored)`; set `**Run Outcome:** error`; exit 1 (E13).

4. **Subagent dispatch.** When dispatching a child skill via Task tool or inline invocation, prepend the literal first line: `[mode: <current-mode>]\n` to the child's prompt (FR-06).

5. **Call-site auditing (CI only).** This runtime classifier reads the call it is about to make — it does not run awk. Static/offline auditing of `AskUserQuestion` call sites across SKILL.md files is performed by `tools/audit-recommended.sh`, which sources the shared call-site extractor from Section D of this file (`_shared/non-interactive.md`). Runtime and audit therefore share one decision contract without inlining the extractor into every skill (FR-02.6).

6. **Refusal check.** If this SKILL.md contains a `<!-- non-interactive: refused; ... -->` marker (regex: `<!--[[:space:]]*non-interactive:[[:space:]]*refused`), and `mode` resolved to `non-interactive`: emit refusal per Section A and exit 64 (FR-07).

7. **Pre-rollout BC.** If the `--non-interactive` argument is present BUT this SKILL.md does NOT contain the `<!-- non-interactive-block:start -->` marker (i.e., this skill hasn't been rolled out yet): emit `WARNING: --non-interactive not yet supported by /<skill>; falling back to interactive.` to stderr; continue in interactive mode (FR-08).

8. **End-of-skill summary.** Print to stderr at exit: `pmos-toolkit: /<skill> finished — outcome=<clean|deferred|error>, open_questions=<N>` (NFR-07).
<!-- non-interactive-block:end -->

## Phase 1: Intake, Tier Detection & Scope Declaration {#intake}

1. **Locate the spec.** Follow `_shared/resolve-input.md` with `phase=spec`, `label="spec"`. Echo the resolved path before proceeding.

<!-- defer-only: ambiguous -->
2. **Read the spec end-to-end.** Summarize back to the user in 3-5 bullets covering: problem, primary goals, tier, decisions already made. Confirm understanding via `AskUserQuestion` (or state assumption per Platform Adaptation).

3. **Check for an existing simulation** in `{feature_folder}/simulate-spec/`. If found, ask: update (re-trace only against changed spec sections) or fresh start (all phases)?

4. **Detect tier** from the spec header (e.g., `**Tier:** 2`); if absent, infer per `_shared/tier-matrix.md` and announce the inferred tier for confirmation.

   | Tier | Behavior |
   |------|----------|
   | **Tier 1** (bug fix) | Refuse by default. Announce: "This is a Tier 1 spec — simulation is overkill. Skipping. Re-invoke with `--force` to run anyway." Then exit. With `--force`, proceed using Tier 2 behavior. |
   | **Tier 2** (enhancement) | All phases run. Inline gap resolution (one gap at a time in Phase 7). 1 review loop. |
   | **Tier 3** (feature / new system) | All phases run. Batched gap resolution (by category in Phase 7). 1 review loop. Deeper adversarial coverage in Phase 2. |

5. **Scope Declaration.** First **propose**: auto-detect layers from the spec's section headers (DB Schema, API Contracts, Frontend Design, CLI, Events, Infrastructure, ...) combined with the Non-Goals section; state the proposal in writing.

   <!-- defer-only: ambiguous -->
   Then **confirm** via `AskUserQuestion`: in-scope layers / out-of-scope layers / companion specs (paths if any) / anticipated downstream consumers. Record the answers — scope drives everything downstream: out-of-scope layers' fitness buckets are SKIPPED (not flagged as gaps); companion specs get cross-referenced in Phase 5; anticipated consumers produce **forward-compat notes**, not gaps. Scope state is held in memory and written into the simulation doc §1.

**Gate:** do not proceed to Phase 2 until tier is confirmed and scope is declared — assuming "full stack" causes false-positive gaps in backend-only or CLI-first specs.

## Input Contract (when invoked as reviewer subagent)

If a parent orchestrator ever dispatches this skill as a reviewer over a chrome-stripped artifact slice, follow the reviewer side of `_shared/reviewer-protocol.md`: skip this skill's own resolver, enumerate `sections_found` first, emit quote-grounded findings, never self-validate. (No orchestrator currently dispatches it this way — `/spec`'s folded phase consumes the substrate directly.)

## Phase 2: Scenario Enumeration {#scenarios}

Enumerate scenarios per `_shared/sim-spec-heuristics.md` §1 — the four passes (extract from spec, missing happy-path variants, 10-category adversarial checklist, model-driven), the consolidated table, and the source/category vocabularies all live there. Tier 3 goes deeper on the adversarial pass.

<!-- defer-only: ambiguous -->
**Gate:** present the consolidated scenario list and ask "Here are N scenarios. Any missing? Any to remove?" via `AskUserQuestion` (or stated assumption per Platform Adaptation). Wait for confirmation before Phase 3 — tracing the wrong list wastes work.

## Phase 3: Scenario Trace {#trace}

Trace each confirmed scenario per `_shared/sim-spec-heuristics.md` §2: decompose into end-to-end steps, cite the concrete spec artifact per step, flag uncited steps as **GAP**. The Gap Register (schema, severity vocabulary, S/B/W prefixes — all in §2) persists across Phases 3-6; every phase appends to it. Dispositions are filled in Phase 7.

## Phase 4: Artifact Fitness Critique {#fitness}

Critique per `_shared/sim-spec-heuristics.md` §3 — the six buckets (Data & Storage, Service Interfaces, Behavior, Interface-adaptive, Wire-up→§4, Operational) and the extensibility clause. Run only the buckets the Phase 1 Scope Declaration puts in scope; ask "is this RIGHT for the scenarios?", not "is this present?". Append findings to the Gap Register with `B` prefixes.

## Phase 5: Interface ↔ Core Cross-Reference {#cross-reference}

Cross-reference per `_shared/sim-spec-heuristics.md` §4 — interface-type table formats, the standard column set, the mandatory reverse scan, orphan rules, and companion-spec handling. Skip if the Scope Declaration set "no interface". Append wire-up findings with the `W` prefix.

## Phase 6: Targeted Pseudocode {#pseudocode}

Write pseudocode per `_shared/sim-spec-heuristics.md` §6 — the five selection triggers, the standalone hard cap (2-3 flows max; if more qualify, pick the 3 with the highest complexity × blast radius), the flow format, and the four mandatory follow-up sections (DB calls / state transitions / error branches / concurrency notes). Do NOT pseudocode every flow.

---

## Phase 7: Gap Resolution {#gap-resolution}

For every gap in the Gap Register, generate the context-and-patch proposal per `_shared/sim-spec-heuristics.md` §5 (one-sentence context + exact section reference + exact new content), then collect the user's disposition:

- **Apply patch** — apply via the `Edit` tool; log in simulation doc §10 (Spec Patches Applied).
- **Modify patch** — user refines the proposal; apply the modified version.
- **Accept as risk** — logged in §8 (Accepted Risks) with the user's stated rationale.
- **Defer as open question** — logged in §9 (Open Questions) with owner and needed-by date if known.

<!-- defer-only: ambiguous -->
**Always present gaps via `AskUserQuestion`, never as a prose dump** — one question per gap, options = the four dispositions above, each question restating gap + proposed patch so the user can decide without scrolling back.

<!-- defer-only: ambiguous -->
- **Tier 2:** one `AskUserQuestion` call per gap (or small batches of ≤4 related gaps) — inline review fits the rhythm.
<!-- defer-only: ambiguous -->
- **Tier 3:** batch by category (Data, Interfaces, Behavior, Wire-up, Operational), up to 4 gaps per call, sequential calls within a category — avoids exhausting the user one-by-one across dozens of findings. Category coherence beats batch fullness: leftover findings that don't share a category go as separate 1-2 question calls, per `../_shared/structured-ask-edge-cases.md` §3.

**Platform fallback (no interactive prompt tool):** present a numbered gap table with a disposition column; ask the user to reply with selections. Do NOT silently apply patches.

**Edge cases of structured asks** (free-form replies, invariant-breaking picks, uncategorizable leftovers): follow `../_shared/structured-ask-edge-cases.md`.

**Spec edits:** ALWAYS the `Edit` tool, one surgical change per edit, logged. Never `Write` the whole spec.

**Rationale:** every "Accept as risk" / "Defer as open question" MUST capture the business or technical reason — "I don't want to fix this right now" is not rationale. The simulation doc's value for future readers depends on traceable decisions.

**Exit gate:** every gap in the Gap Register has a disposition before Phase 8 writes the doc. If any remain undecided, return to the user.

## Phase 8: Write Simulation Doc {#write-doc}

**Emit per the `_shared/html-authoring/README.md` checklist** (template slot-fill, atomic temp-then-rename write with the `.sections.json` companion, idempotent asset copy, cache-busted asset URLs, heading ids per `conventions.md` §3). Deltas: artifact = `{feature_folder}/simulate-spec/{YYYY-MM-DD}-trace.html` (create the `simulate-spec/` directory if needed; same-day re-runs append `-2`, `-3`, ...); `{{pmos_skill}}` = `simulate-spec`; asset prefix = `../assets/` (`simulate-spec/` is one level below the feature folder; assets copy to `{feature_folder}/assets/`); regenerate `{feature_folder}/index.html` per `index-generator.md` (the trace lands under the `simulate-spec/` phase rank). `output_format=both` is retired — treated as `html` until a future feature re-introduces MD export.

Populate from accumulated state: §1 Scope ← Phase 1 · §2 Scenario Inventory ← Phase 2 · §3 Coverage Matrix ← Phase 3 · §4 Fitness Findings ← Phase 4 · §5 Cross-Reference ← Phase 5 · §6 Pseudocode ← Phase 6 · §7 Gap Register (with dispositions) · §8 Accepted Risks · §9 Open Questions · §10 Spec Patches Applied ← Phase 7 · §11 Review Log ← Phase 9. The full 11-section template lives at `reference/simulation-doc-template.md`.

After writing, commit:
```
git add {feature_folder}/simulate-spec/<file>.html {feature_folder}/simulate-spec/<file>.sections.json {feature_folder}/simulate-spec/<file>.md {feature_folder}/index.html {feature_folder}/assets
git commit -m "docs: simulation for <feature>"
```
(Sidecar paths are no-ops when absent; legacy MD-only folders still snapshot cleanly.)

## Phase 9: Review Loop (single pass) {#review-loop}

Run a SINGLE review pass over the simulation doc — the skill is already adversarial by design; a second pass is "critique the critique", and Phase 7 was already a collaborative review. Checks:

1. **Scenario completeness** — re-read the spec; did Phase 2 miss any journey, edge case, or failure mode?
2. **Bucket completeness** — did Phase 4 cover every in-scope bucket? Any spec artifact type left uncritiqued?
3. **Cross-reference completeness** — did Phase 5 do BOTH the forward table AND the reverse scan?
4. **Gap Register integrity** — every gap dispositioned? Every "Apply patch" in §10? Every "Accept as risk" with rationale in §8?
5. **High-severity coverage** — every blocker gap has an applied patch or an explicit accepted-risk decision (no blockers deferred without strong reason)?

<!-- defer-only: ambiguous -->
**If issues found:** append to the Gap Register and return to Phase 7 — present each new gap via `AskUserQuestion` with the four dispositions, batched up to 4 per call by category; do NOT narrate findings as prose and wait for a free-form reply. Then update the simulation doc (surgical Edits) and log the loop in §11.

**Exit criteria:** all 5 checks pass; the last loop found only cosmetic issues (or none). Offer the user a final-concerns checkpoint — absence of objection is acceptance; if the user requests another loop, run it (the single-loop default is the floor, not the ceiling).

## Phase 10: Workstream Enrichment {#workstream}

**Skip if no workstream was loaded in Phase 0.** Otherwise follow `_shared/pipeline-setup.md` Section C. Signals for this skill: recurring gap categories → workstream `## Constraints & Scars`; tech-stack-specific failure modes → `## Tech Stack`; architectural patterns that resist gaps well → `## Key Decisions`. Mandatory whenever Phase 0 loaded a workstream — do not skip just because the core deliverable is complete.

## Phase 11: Capture Learnings {#capture-learnings}

**This skill is not complete until the learnings-capture process has run.** Read and follow `_shared/learnings-capture.md` (relative to the skills directory) now. Reflect on whether this session surfaced anything worth capturing — surprising behaviors, repeated corrections, non-obvious decisions. Proposing zero learnings is a valid outcome for a smooth session; the gate is that the reflection happens, not that an entry is written.

After learnings capture, offer the next pipeline step:

> "Simulation complete. Run `/pmos-toolkit:plan` to generate the implementation plan, or review the simulation first?"

---

## Anti-Patterns (DO NOT)

- Do NOT run on Tier 1 bug-fix specs — overkill for isolated fixes; refuse and exit (the refusal message names the `--force` override).
- Do NOT trace scenarios before the user confirms the scenario list — tracing the wrong list wastes work.
- Do NOT write pseudocode for every flow — max 2-3, only when the substrate §6 triggers apply.
- Do NOT flag out-of-scope layers as gaps — respect the Phase 1 Scope Declaration.
- Do NOT silently update the spec — every patch requires user approval (Apply / Modify / Accept / Defer). The threshold-keyed auto-apply in the substrate's §5 is the FOLDED path's model, never this skill's.
- Do NOT conflate "not specified" with "wrong" — coverage gaps (S) and quality gaps (B/W) stay separate in the Gap Register.
- Do NOT run simulation without reading the spec end-to-end first.
- Do NOT skip Scope Declaration — assuming "full stack" causes false-positive gaps in backend-only or CLI-first specs.
- Do NOT rubber-stamp gaps as "accepted risk" without recording rationale.
- Do NOT write the simulation doc before every gap has a disposition — gaps get resolved in Phase 7, before Phase 8 writes.

---

*Spec lineage: `2026-04-18_simulate-spec` (4-pass enumeration, fitness buckets, hybrid pseudocode decision, tier behavior); `2026-05-09_html-artifacts` (FR-10/FR-22 emit contract — now substrate-owned by `_shared/html-authoring/`; FR-50/51/52 reviewer contract → `_shared/reviewer-protocol.md`); `2026-05-10_pipeline-consolidation` (heuristics factored to `_shared/sim-spec-heuristics.md`; folded path owned by `/spec` + `_shared/folded-phase.md`); `2026-05-08_non-interactive-mode` (mode contract, FR-12 output_format); heuristics consolidation + divergence reconciliation per the 2026-06-10 skill-design review.*
