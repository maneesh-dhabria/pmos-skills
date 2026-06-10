# requirements — review

**Grade:** C (the product-thinking core is genuinely good; the file around it has accreted — a meaningful rewrite would pay off)
**Size:** SKILL.md 721 lines (692 excluding non-interactive block; 680 also excluding the lint-enforced pipeline-setup block); references 0 files / 0 lines; target ~320 lines + a ~200-line `reference/requirements-templates.md`.

## TL;DR

- **Biggest win:** extract the three inline tier templates (~193 lines, only one used per run) to `reference/requirements-templates.md`. This is not a judgment call — `/spec` and `/plan` already did exactly this (`spec/reference/spec-templates.md`, `plan/reference/plan-templates.md`). Progressive disclosure is absent **by accretion, not design**: requirements is the only pipeline-template skill that never got the extraction.
- **Biggest risk:** format-retirement residue has left the skill self-contradictory — Phase 4 declares `output_format=both` retired (FR-12.1) while Pre-write safety and the entire Phase 5a folded-MSF section still operate on `01_requirements.md`, a file Phase 4 no longer emits. A literal-minded executor will `git status` a nonexistent file.
- **Worth keeping:** the product-thinking spine is the best part of the pipeline — the dual acid test, the "coverage checklist (NOT a script)" framing, "state assumptions rather than asking obvious questions", the in-domain-competitor rule, and the 6-gate exit (provenance: D6 in `docs/pmos/features/2026-05-08_requirements-refactor/01_requirements.md`, which deliberately replaced a min-2-loops proxy with real gates). These are WHAT+WHY instructions in the Pocock sense.

## Findings

1. **[S][Ph] Tier templates inline while siblings extracted theirs.** Lines 283–477 (~193 lines) hold three full tier templates; Phase 1 picks exactly one per run, so two-thirds of this block is dead weight on every invocation. `/spec` keeps its equivalent in `reference/spec-templates.md` (~300 lines) and `/plan` in `reference/plan-templates.md`; `/requirements` is the outlier. The repo's own rubric (`feature-sdlc/reference/skill-patterns.md`: ≤500 pass, 501–800 pass-with-note, >800 fail) already puts this file in pass-with-note territory at 721. **Fix:** move templates + the "Document Guidelines (all tiers)" block to `reference/requirements-templates.md`; SKILL.md keeps the tier→sections table and one pointer.

2. **[R] Retired-format residue contradicts live instructions.** Line 261: "Mixed-format sidecar (FR-12.1): retired — `output_format=both` is treated as `html`." Yet line 267 ("and `.md` if `output_format: both`"), the snapshot-commit at 269–272 (`git add … 01_requirements.md`), and all of Phase 5a (lines 586, 593, 596, 624: pre-apply guard `git status --porcelain 01_requirements.md`, "inline edits to `01_requirements.md`", "always `msf-req-findings.md`… against the just-written `01_requirements.md`") still assume an MD primary artifact. Phase 4 emits `01_requirements.html`. **Fix:** sweep every `01_requirements.md` reference to `01_requirements.{html}` (or the resolver token), and either delete the dead `both` branches or the retirement note — not both.

3. **[S] Folded-phase mechanics duplicated across 4+ skills.** Phase 5a's machinery — escape flag, confidence threshold, per-finding commits (D16), failure capture to `state.yaml.phases.<x>.folded_phase_failures[]`, advisory-continue (D11), resume-via-git-log (FR-57) — appears near-verbatim in `wireframes/SKILL.md` (~536–543, msf-wf), `spec/SKILL.md` (~487–577, simulate-spec AND architecture), and `verify/SKILL.md` (~498, architecture). The *heuristics* were shared (`_shared/msf-heuristics.md`, `_shared/sim-spec-heuristics.md`) but the *orchestration boilerplate* was copy-pasted. Provenance confirms these were designed as one mechanism (`docs/pmos/features/2026-05-10_pipeline-consolidation/01_requirements.md`, D14/D16/D17 apply "identically to W1"). **Fix:** create `_shared/folded-phase.md` parameterized by `{folded_skill, target_artifact, phase_key, escape_flag}`; each skill keeps ~8 lines (which substrate, which artifact, which flag).

4. **[R][F] Orphaned `--tier` passthrough contract.** `feature-sdlc/SKILL.md:402`: "`{tier}` … is passed down to `/requirements`, `/spec`, `/plan` via the existing `--tier <N>` passthrough." None of the three SKILL.md files mentions, parses, or hints a `--tier` flag (grep: zero matches). Either the orchestrator's claim is fiction and tier re-detection runs redundantly under `/feature-sdlc`, or the flag works only because the model improvises. **Fix:** add `--tier` to the three skills' Phase 1 ("if passed, carry forward without asking") or correct feature-sdlc to say the tier rides in the seeded requirements doc's `Tier:` tag.

5. **[S] Tier-detection tables drift between /requirements and /spec.** Requirements (lines 128–132) detects by signals ("Isolated defect; reversible; touches ≤1 surface…"); spec (lines 110–114) has its own independently-worded fallback table ("Isolated fix or small change…"). The `Tier:` tag carry-forward is the real contract, but two divergent fallback matrices guarantee drift (they already disagree on Tier-2 naming: "Enhancement / UX Fix" vs "Enhancement / UX Overhaul"). **Fix:** one `_shared/tier-matrix.md` (precedent: `feature-sdlc/reference/skill-tier-matrix.md` for skill mode); both skills cite it. This answers the assigned question: tier *logic* is duplicated only at the detection-fallback layer; downstream carry-forward is clean.

6. **[V][S] Phase 4 emit boilerplate restates the substrate.** Lines 245–289 (~25 lines of FR-10/10.1/10.2/10.3, FR-22, heading-IDs) re-specify what `_shared/html-authoring/conventions.md` already mandates — the heading-id algorithm is even stated twice within this one file (line 257 and line 287), and the asset list enumerates eight files by name immediately before admitting "new substrate files… ride along automatically." Only the skill-specific bits are load-bearing: `pmos_skill=requirements`, the artifact filename, snapshot-commit. **Fix:** compress to ~6 lines + pointer to conventions.md (the same fan-out exists in 10+ skills — flag globally, fix once).

7. **[P] Findings-presentation protocol over-specifies HOW.** Lines 530–549 dictate exact AskUserQuestion shape, option labels, "never more than 4 findings in a single batch," "batch up to 4 questions per call," category-per-call sequencing. The load-bearing ideas are: per-finding disposition (Fix/Modify/Skip/Defer), don't silently self-fix, log dispositions. The batching arithmetic is "be sensible" dressed as procedure, and `_shared/structured-ask-edge-cases.md` (already linked) covers the overflow cases. **Fix:** ~8 lines of intent + the existing substrate pointers.

8. **[R][Ph] Edit-history baked into headings and prose.** "Phase 5: Review (replaces former Phase 5 + Phase 6)", "Final-loop polish lens (formerly Phase 6…)", "(D3 / W4)", "(W4 dogfood; same pattern adopted in T7's /wireframes folded path)", "Flag handling (Phase 0 parser additions)" living at the *end of Phase 5a*. A colleague reading this can't tell instruction from changelog, and the decision-ID soup (D2/D3/D11/D13/D14/D16/D35/M1/T7/T12b/W4/FR-50/57/64/68) cites artifacts without links. Phase ladder 0, 0a, 1(+1a), 2a/2b, 5, 5a confirms insertion-without-rethink. **Fix:** on rewrite, renumber phases, strip "formerly/replaces" commentary, keep only FR/D references a reader can follow (link them like the comment-resolver section does).

9. **[V] Anti-Patterns list is 80% restatement.** Of the 15 DO-NOTs (lines 678–694), ~12 repeat rules already stated in their phases (snapshot-commit, drift warning, non-goals "because", learnings line, etc.). Pocock's pattern: one anti-pattern, explained, where deviation is a known failure mode (TDD's horizontal slice). **Fix:** keep 3–4 genuinely cross-cutting ones (terminal state is handoff — don't start the spec; no implementation details; in-domain competitors); delete the echoes.

10. **[P][G] Phase 7's mandatory one-line learnings ritual.** "This skill is not complete until… produced a one-line output"; "Empty reflection (no line emitted) counts as unfinished work." The shared ceremony (`_shared/learnings-capture.md`) already exists; the extra hard gate forces a boilerplate sentence on every routine run. Failure it prevents (model skips reflection) is low-cost; the ritual costs a turn per run, forever. **Fix:** soften to advisory — run the shared ceremony, emit the line when there's something to say.

11. **[F] `--msf-auto-apply-threshold N` is a tuning knob nobody will find.** A numeric confidence override buried in the argument-hint, only meaningful if you've read Phase 5a. **Fix:** drop from the flag surface; honor `.pmos/settings.yaml` override if anyone ever needs it. Similarly `--format`'s advertised `md|both` values are dead per FR-12.1 — stop advertising them.

12. **[X] Cross-platform posture is mostly honest.** The Platform Adaptation block exists and Phase 5 carries a real no-AskUserQuestion fallback ("Do NOT silently self-fix") — better than most skills. Gaps: `${CLAUDE_PLUGIN_ROOT}` (Phase 4) has no degradation note, and the Node shim/comment-resolver assumes the Claude-side dispatcher (acceptable — it's only reachable via `/comments`).

13. **[G] What's correctly delegated — keep.** Backlog Bridge cites `backlog/pipeline-bridge.md`; input resolution cites `_shared/resolve-input.md`; review-edge-cases cite `_shared/structured-ask-edge-cases.md`; the comment-resolver section explicitly refuses to restate the shared contract per NFR-08 (citing `_shared/apply-edit-at-anchor.md`) — this is the substrate-citation pattern the rest of the file should follow. Minor: it then restates the id-first/quote-fallback resolution order anyway (~10 lines that belong to the shim/contract).

## Flags inventory

| Flag | Purpose | Verdict |
|---|---|---|
| `--feature <slug>` | select/disambiguate feature folder | keep — pipeline-wide convention, lint-enforced Phase 0 block |
| `--backlog <id>` | seed from backlog item; writeback at end | keep — cross-skill contract with `/backlog` (pipeline-bridge.md) |
| `--skip-folded-msf` | D13 escape from folded MSF (Tier-3 default-on) | keep, but accept natural language too ("skip the UX pass"); note the `/feature-sdlc` state.yaml-logging coupling |
| `--msf-auto-apply-threshold N` | override auto-apply confidence (default 80) | delete from flag surface; fold into settings.yaml if ever needed |
| `--non-interactive` / `--interactive` | mode resolution | keep — global W14 contract, assessed once repo-wide |
| `--format <html\|md\|both>` | output-format override (FR-12) | trim — `md`/`both` are dead values per the FR-12.1 retirement note; stop advertising or delete the flag until MD export returns |
| `--tier <N>` (claimed by feature-sdlc, undocumented here) | tier passthrough | fix the contract — implement in Phase 1 or correct feature-sdlc (Finding 4) |

## Gates & rubrics inventory

| Check | Hard/soft | Failure it catches | Verdict |
|---|---|---|---|
| Tier detect + confirm **before** task creation | soft (ask) | wrong template → clean-and-recreate churn | keep |
| Scope decomposition (ALL-three rule) | soft | one mega-doc spanning independently-shippable work | keep — crisp, principle-shaped |
| Downstream-drift warning when spec/plan exist | hard ask | silent requirements/spec desync | keep-hard |
| Pre-write snapshot-commit on dirty file | hard | clobbering uncommitted user edits | keep-hard |
| Heading-id rule (FR-03.1; `/verify` + CI) | hard | broken cross-doc anchors | keep-hard, but cite conventions.md instead of restating twice |
| 6-gate review exit | hard | self-declared done / skipped user confirm | keep-hard — provenance D6, `2026-05-08_requirements-refactor` (deliberately replaced min-2-loops) |
| Ambiguity heuristics (no etc., numbers, must-vs-should, pronouns) | advisory | vague docs downstream skills can't consume | keep as principles — good example of testable WHAT |
| Findings-presentation protocol (batch sizes, option shapes) | prescriptive | option-soup; silent self-fix | soften to intent (Finding 7) |
| FR-64 pre-apply guard (dirty-file check before MSF auto-apply) | hard | auto-apply clobbering user edits | keep-hard; move into shared folded-phase doc |
| Per-finding commits (D16) + git-log resume (FR-57) | hard | unrevertable batches; duplicate applies on resume | keep-hard — resume contract; centralize (Finding 3) |
| Phase 7 one-line learnings output | hard | skipped reflection | soften to advisory (Finding 10) |
| Backlog writeback guard (doc written AND committed) | soft | dangling backlog `source:` pointer | keep |
| Phase 2 subagent return schema | soft | unmergeable research dumps | keep — small, earns its keep |

## Fix list

| Fix | Type | Impact | Risk |
|---|---|---|---|
| Extract tier templates + Document Guidelines to `reference/requirements-templates.md` (mirror /spec, /plan) | quick-win | high | low — same pattern already live in two sibling skills |
| Sweep `01_requirements.md` references in Phase 5a / pre-write safety to match HTML-primary reality (Finding 2) | quick-win | high | low — fixes contradictions, no behavior change intended |
| Resolve the `--tier` passthrough contract with feature-sdlc (Finding 4) | quick-win | high | low — but touches orchestrator; coordinate the edit |
| Create `_shared/folded-phase.md`; reduce Phase 5a (and wireframes/spec/verify twins) to parameterized pointers | structural | high | medium — touches the /feature-sdlc state.yaml + resume contracts; needs the drift-hook/sync-shared path |
| Centralize tier-detection matrix in `_shared/tier-matrix.md`; /requirements + /spec cite it | structural | med | low-medium — wording reconciliation needed |
| Compress Phase 4 emit boilerplate to a conventions.md pointer + skill-specific lines | quick-win | med | low — contract lives in substrate + tests already |
| Compress findings-presentation protocol to intent + substrate pointers | quick-win | med | low |
| Strip edit-history from headings; renumber phases (0a/5a → integers); prune Anti-Patterns to 3–4 | quick-win | med | low — prose only |
| Drop `--msf-auto-apply-threshold` from flag surface; stop advertising dead `--format` values | quick-win | low | low — check no caller passes it (grep shows none) |
| Soften Phase 7 one-line learnings gate to advisory | quick-win | low | low — verify /feature-sdlc doesn't parse the line (it reads learnings.md, not the chat line) |
