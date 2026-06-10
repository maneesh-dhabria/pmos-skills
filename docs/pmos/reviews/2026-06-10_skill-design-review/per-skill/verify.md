# verify — review

**Grade:** C (the evidence-gate core is genuinely well-designed and battle-derived; the file around it has accreted orchestrator plumbing, a renumbering mess, a stale failing test, and a repo-specific hard gate presented as universal — a meaningful rewrite would pay off)
**Size:** SKILL.md 738 lines (709 excluding non-interactive block); references 1 file / 183 lines (`reference/design-drift-check.md`); target ~300 lines + 2 new reference files (`folded-phases.md`, `invocation-contracts.md`).

## TL;DR

- **Biggest win available:** ~200 lines of the file are caller-specific plumbing (Phase 4a/4b folded-phase machinery, the phase-scoped /execute mode, the reviewer-subagent input contract) inlined into the universal path. Extract to references loaded only when that branch is taken — exactly Pocock's `improve-codebase-architecture` move — and the skill a human reads drops to ~300 lines without losing a single gate.
- **Biggest risk in current design:** the Phase 7 Hard Gate (`bash scripts/check-comments-coverage.sh`) is hard-coded to *this repo's* tree but stated as an unconditional blocker; in any host repo the script doesn't exist and "a non-zero exit blocks /verify completion" is literally unsatisfiable. Meanwhile the skill's own checked-in smoke test is failing today (stale phase-heading regex) and nothing runs it — the verification skill doesn't verify itself.
- **Worth keeping, verbatim:** the Phase 4 entry gate → three-state outcome model → Evidence Standards chain. This is the skill's "**This is the skill**" core (per Pocock's diagnose), it was forged from a real incident (`docs/pmos/features/2026-05-03_verify-skill-teeth` — prose warnings were being rationalized away, so they became structural gates), and the Red Flags rationalization-naming table is the same proven pattern as superpowers' `verification-before-completion`.

## Findings

1. **[G] Phase 7 Hard Gate is repo-specific but written as universal.** "Phase 7 Hard Gates: `bash scripts/check-comments-coverage.sh` … A non-zero exit blocks `/verify` completion for this feature." The script (`scripts/check-comments-coverage.sh`, ROOT defaults to `plugins/pmos-toolkit/skills` relative to cwd) only exists in the agent-skills repo — /verify is a marketplace skill run in arbitrary host repos, where this command exits 127 and, as written, blocks every feature forever. The model will improvise around it, which is worse: the one *hard* gate in the skill trains the model to ignore hard gates. Fix: scope it — "Only when verifying the agent-skills repo itself (detect: `scripts/check-comments-coverage.sh` exists at repo root)" — one sentence.
2. **[Ph/R] Phase numbering is incoherent from at least two un-rethought renumberings.** Phase 2's sub-steps are `1a–1d`, Phase 4's are `3a–3f`, Phase 5's are `4a–4e` (so "Phase 4 sub-step 3f" and "Phase 5 sub-step 4d" are load-bearing cross-references throughout); the task list at top says "7.5. Design-System Drift Check" but the heading is "Phase 7a"; Phase 3 says "re-run the relevant static verification step from Phase 1" (static verification is Phase 2); the task list omits Phases 0, 4a, 4b, 9, 10 entirely; the test files are named `test-phase-4-7-*` after a "Phase 4.7" that no longer exists. This is precisely the criteria's "insertion without re-thinking" smell, and it has consequences (finding 3). Fix: renumber once — phases 1–9, sub-steps inherit their parent's number — and update the two tests and `/execute`'s pointer.
3. **[G] A checked-in test is failing right now and nothing notices.** `tests/test-phase-4-7-smoke.sh` asserts `grep -qE '^## Phase 4\.7: Folded /architecture --since'` but the heading was renamed to `## Phase 4b:`; the test exits 1 today (reproduced during this review) and is wired into no CI or gate. A verification skill shipping a silently-red test of itself is the exact failure mode the skill exists to prevent. Fix: update the regex when renumbering (finding 2) and either wire both tests into a repo check or delete them — a test nothing runs is documentation that lies.
4. **[V/S] ~110 lines of /feature-sdlc-only machinery inlined in the universal path.** Phase 4a (folded-phase awareness: slug-distinct MSF paths, legacy-fallback warning text, E14 affirmative signal, advisory-warning templates) and Phase 4b (folded /architecture dispatch: tier table, 600s timeout, FR-27/28/29 aggregation formats) are only meaningful inside a feature-sdlc-produced folder with a `state.yaml` — most standalone /verify runs read all of it for nothing. Pocock's pattern: one routing paragraph ("If this folder was produced by /feature-sdlc, follow `reference/folded-phases.md`"), heavy lifting in the reference. Saves ~100 lines with zero behavior change.
5. **[V] Two more caller-specific contracts interleaved with Phase 1.** The phase-scoped /execute mode (~30 lines, lines 120–133) and the reviewer-subagent Input Contract (~25 lines, FR-50/51/52) both sit before the skill even locates its documents, and both apply only when another skill is the caller. Move to `reference/invocation-contracts.md`; keep a 2-line pointer each. (Coupling note: `/execute` Phase 2a invokes `--scope phase --feature --phase` and consumes the `ok/evidence_dir/failures` return shape — the contract must survive the move intact.)
6. **[F] `--skip-folded-arch` is undiscoverable.** It's parsed in Phase 4b ("Phase 0 parser additions") but absent from the frontmatter `argument-hint`, the one place users see flags. Also stale in the same hint: "will search `{docs_path}/specs/` if omitted" — `_shared/resolve-input.md` contains no `specs/` path; resolution is feature-folder based now. Fix both in one frontmatter edit.
7. **[V/R] The wireframes-are-not-a-visual-spec principle is stated five times.** Phase 1 sub-step 2a (~20 lines), 3f Part 1, two Red Flags rows, the 4d reminder paragraph, and two Anti-Patterns bullets all restate "authoritative for IA/copy/states/journeys, not visual style; host app wins." The principle is excellent; the fifth restatement is defensive over-specification. Keep the 2a statement as canonical, replace the rest with "(per 2a)" — saves ~30 lines and removes the drift surface.
8. **[P] Phase 3's five-agent table over-specifies HOW.** 45 lines of per-agent focus + "what to return" columns plus a 4-band confidence rubric. The five review angles (conventions, bugs, history, comments, cross-file consistency) and the "act only on 75+" filter are the load-bearing ideas; the per-agent return-format prescriptions are micromanagement a capable model doesn't need and a better model will be constrained by. Compress to ~12 lines: five named angles as intent, the confidence filter, the fix-and-re-verify rule.
9. **[R] Stale internal pointers.** Anti-Patterns says "those six thoughts are the most common skips" — the Red Flags table now has eleven rows (five wireframe/polish rows were appended later). `scripts/check-comments-coverage.sh`'s header says "invoked by /verify Phase 5 gate set" while the skill runs it in Phase 7. Phase 4a's heading still carries "(new in v2.34.0 per T19/W4/E14)" — version-stamped headings violate the durability principle.
10. **[X] TodoWrite-as-gate contradicts the platform-adaptation note.** Platform Adaptation says "use your available task tracking tool… if none, announce phase transitions verbally," but the Phase 4 entry gate hard-mandates the tool by name: "A plain bullet list in prose does not substitute for `TodoWrite` todos; the todos are the structural enforcement." On Codex/Gemini that's an unsatisfiable mandate. Fix: "one tracked task per item via your task tool; where no tool exists, the Phase 5 compliance table is the gate" — which is exactly the degradation the phase-scoped mode already invented.
11. **[S] (global, assess once) The FR-10.x HTML-emit block in Phase 8 step 2 is the same ~15 lines fanned out across 12+ skills** (artifact, plan, spec, requirements, grill, msf-req, msf-wf, simulate-spec, design-crit, feature-sdlc, …), varying only in filename and asset prefix. It's the tested emit contract, so not per-skill ballast — but it is the strongest single consolidation candidate in the repo: one `_shared/html-authoring/emit-contract.md` with a per-skill two-value parameterization (name, prefix).
12. **[R, positive] The Evidence Standards table and the three-state model with its copy-pasteable template are the best prose in the file.** "Never use: 'should pass', 'looks correct', 'probably fine'" and "There is no fourth state" are exactly the principle-plus-named-failure-mode style the north star asks for. Don't trim these.

## Flags inventory

| Flag | Purpose | Verdict |
|---|---|---|
| `<path-to-spec>` (positional) | explicit spec input | keep |
| `--feature <slug>` | feature-folder disambiguation (pipeline standard) | keep |
| `--backlog <id>` | backlog item linkage at start/end | keep (pipeline coupling) |
| `--skip-design-drift` | skip advisory Phase 7a | keep — discoverable, documented |
| `--scope phase` + `--phase <N>` | /execute Phase 2a invocation contract | keep but mark "internal — passed by /execute" in argument-hint; not for humans |
| `--format <html|md|both>` | FR-12 output-format override | keep — substrate-wide convention, consistent across pipeline |
| `--non-interactive` / `--interactive` | W14 mode contract | keep — substrate-wide, lint-enforced |
| `--skip-folded-arch` | skip Phase 4b architecture fold | keep but **add to argument-hint** (currently undiscoverable); natural language ("skip the architecture check") would also resolve it |

Stale: argument-hint's "(will search `{docs_path}/specs/` if omitted)" — path no longer exists in the resolver; reword to "resolved from the feature folder."

## Gates & rubrics inventory

| Check | Hard or soft | Failure it catches | Verdict |
|---|---|---|---|
| Phase 2 static verification (lint/types/tests, fix-before-proceed, no skip-marking) | hard | claiming done on a red suite; `@pytest.mark.skip` laundering | keep-hard |
| Phase 3 multi-agent review + 75+ confidence filter | soft (advisory findings, hard fix rule at 75+) | convention violations and bugs tests miss; the filter exists to cut subagent false-positive noise | keep, compress per finding 8 |
| Phase 4 entry gate (TodoWrite enumeration + evidence-type allowlist) | hard | silent skipping of runtime verification — documented incident origin in `2026-05-03_verify-skill-teeth` ("replace prose warnings with structural gates") | keep-hard; fix TodoWrite portability (finding 10) |
| Phase 4 Red Flags rationalization table | soft | the named self-talk that precedes a skip (same pattern as superpowers' verification-before-completion) | keep; dedupe wireframe rows (finding 7) |
| Phase 4 sub-step 3f polish checklist P1–P12 | hard for UI-touching changes | `<title>Vite App</title>`, leaked enum keys, broken hard-reload — real classes tests pass through; the sub-step's own preamble names the incident | keep-hard; P1–P12 could live in a reference table without losing teeth |
| Phase 4a folded-phase advisory warnings | soft | silently bypassed Tier-3 MSF/sim-spec phases | keep-soft, move to reference (finding 4) |
| Phase 4b folded /architecture --since | soft (advisory per D11) | architectural drift vs spec assertions | keep-soft, move to reference |
| Phase 5 three-state outcome model + verbatim table template | hard | "Partial ✓" weasel outcomes; bare "NA"; evidence-free Pass rows | keep-hard — this is the skill |
| Phase 6 red-green regression hardening | hard | fix-without-test recurrence | keep-hard |
| Phase 7 Hard Gate `check-comments-coverage.sh` | hard | regression of the 14-surface inline-comments contract (FR-62, `2026-05-28_inline-html-artifacts`) | **soften to scoped-hard**: hard only when verifying this repo; guard on script existence (finding 1) |
| Phase 7a design-drift check | soft (advisory, never blocks) | DESIGN.md/COMPONENTS.md rotting vs codebase | keep — already correctly factored into a reference file with skip-fast guards; the best-structured phase in the skill |
| Evidence Standards table | hard (norm) | "should pass / looks correct / probably fine" claims | keep-hard |
| `tests/test-phase-4-7-*.sh` (grep-based structure tests) | none (not wired anywhere) | heading/flag presence — and one is failing now | fix regex + wire into a repo check, or delete |

## Fix list

| Fix | Type | Impact | Risk |
|---|---|---|---|
| Scope the Phase 7 comments-coverage gate to this repo (existence-guard + one sentence) | quick-win | high | none — currently unsatisfiable elsewhere |
| Fix `test-phase-4-7-smoke.sh` stale regex; wire both tests into a repo check or delete | quick-win | high | none |
| Renumber phases/sub-steps coherently (1–9; sub-steps inherit parent number); update task list, cross-refs, test filenames, /execute pointer | structural | high | medium — many internal cross-refs plus `/execute` and grep-based tests reference headings; do in one pass with grep sweep |
| Extract Phase 4a/4b → `reference/folded-phases.md`; phase-scoped mode + reviewer input contract → `reference/invocation-contracts.md` | structural | high | low-medium — /feature-sdlc and /execute couplings must keep their contracts byte-compatible |
| Add `--skip-folded-arch` to argument-hint; fix stale `specs/` wording | quick-win | med | none |
| Deduplicate the wireframe-authority principle to one canonical statement (2a) + cross-refs | quick-win | med | low |
| Compress Phase 3 agent table to five intent lines + confidence filter | quick-win | med | low — keeps angles and filter, drops return-format prescriptions |
| Replace TodoWrite-by-name mandate with tool-agnostic "tracked task per item; compliance table is the fallback gate" | quick-win | med | low |
| Fix stale pointers ("six thoughts"→eleven; script header Phase 5→7; drop "(new in v2.34.0…)" from heading) | quick-win | low | none |
| (Repo-wide, not this skill alone) consolidate the FR-10.x emit block into `_shared/html-authoring/` | structural | med | medium — touches 12+ skills and the fanout test |
