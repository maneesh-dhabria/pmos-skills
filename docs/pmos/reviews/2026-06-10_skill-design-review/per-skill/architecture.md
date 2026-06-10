# architecture — review

**Grade:** C (working machinery, but the SKILL.md reads like a spec changelog and the rule corpus is stated three times with police scripts guarding the duplication; a meaningful rewrite would pay off without touching the engine)
**Size:** SKILL.md 327 lines (~298 excluding non-interactive block); references 4 files / 473 lines; plus rule corpus `principles.yaml` 256 + `principles.md` 637 lines; ~16 production scripts ≈ 4,400 lines (run-audit.sh alone is 2,598), 19 test runners, 47 fixture `.assert` scripts. Target ~150–170 lines for SKILL.md.

## TL;DR

- **Biggest win:** collapse the two near-identical judge-mode sections (`--from-spec`, `--since`) into one, and strip the spec-citation soup (FR-06, D8, §9.1, §13, T10, OQ6, E6, R8…) that makes the file unreadable without three feature folders open — ~120 lines back, zero behavior change.
- **Biggest risk:** the rule corpus exists in three parallel prose forms (`principles.yaml`, `principles.md`, `reference/l1-rationales.md`) kept aligned by drift-check scripts and a pre-commit hook — self-inflicted complexity where the scripts police a duplication the design created. Plus a stale `.comments.json` sidecar reference (contract retired v2.58.0) shows incremental edits are already drifting.
- **Worth keeping:** the deterministic engine's genuinely non-substitutable parts — cycle detection, the L3 exemption ledger with expiry, baseline/`--since` diffing, the `validate-findings.js` verbatim-quote hallucination guard, and the JSON triplet that `/spec` Phase 6b and `/verify` Phase 4b consume. These pay rent; Pocock's approach has no answer for them.

## The Pocock comparison (special-attention item)

`engineering/improve-codebase-architecture` (81-line SKILL.md, 257 lines of references, **zero scripts**) and `/architecture --deep` do the same job — and the repo knows it: `reference/deepening-vocabulary.md` is openly adapted from Pocock's LANGUAGE.md with attribution. The honest comparison:

**Where Pocock wins.** His skill spends 100% of its budget on the judgment problem (depth, seams, locality, deletion test) and trusts the model to explore organically, present an editorial HTML report, and grill the user. It externalizes config (CONTEXT.md, ADRs) instead of flags. It will get *better* as models improve. The pmos `--deep` pass is the same idea wrapped in payload caps, secret denylists, JSON return shapes, and grep-validation — safer and verifiable, but it converts an open-ended exploration into a batch classification job and loses the grilling loop (Pocock's step 3) entirely, which is where reshape decisions actually get made.

**Where the pmos design wins.** Pocock's skill cannot: (a) detect import cycles (graph property — a model reading files organically will miss indirect A→B→C→A); (b) maintain a team contract — L3 overrides, exemptions with expiry dates, "mute via wont_fix, not removal" — which a model cannot improvise consistently across runs; (c) diff against a baseline or a git ref, which requires deterministic, reproducible findings; (d) feed machine-readable findings to `/spec` and `/verify` as a pipeline stage. Determinism is the point for those four; they pay rent.

**Which of the ~87 script files pay rent?** Categorized:

| Category | Files / lines | Verdict |
|---|---|---|
| Mechanical audit engine (`run-audit.sh` 2,598, `cycle-py.py`, `.depcruise.cjs`) | ~2,800 lines | **Split verdict.** Cycle detection, exemption reconciliation, baseline diff, triplet emit: pay rent. But U001–U008 (file/function size, arg count, no-print, path depth, stale TODOs, commented code) re-implement what ruff/ESLint configs already do — the gap-map itself concedes "ESLint has max-lines… flake8 has T201" and chooses bespoke grep+AST heredocs for universality. That universality bought a 2,598-line bash monolith maintaining hand-rolled cross-language function-span counting. The skill already requires ruff/dep-cruiser as optional deps; leaning on them harder (per-stack configs) would shrink the engine by half. |
| Judge-mode pipeline (`parse-spec.js`, `load-principles.sh`, `validate-findings.js`, `apply-knobs.js`, `emit-findings.js`, `dispatch-deep-pass.sh`, `auto-upgrade-detector.sh`) | ~1,000 lines | **Mostly pays rent.** `validate-findings.js` (unknown rule_id, confidence range, ≥40-char verbatim quote) is the anti-hallucination guard that makes an LLM judge usable in a pipeline — keep-hard. `from-spec-tracer.sh` (228 lines) is shipped T1 tracer-bullet scaffolding — delete. |
| Self-consistency police (`check-principles-drift.sh`, `check-citations.sh`, `check-gap-map.sh`, `install-arch-hooks.sh`, `test-principles-md-coverage.sh`) | ~190 lines | **Doesn't pay rent.** These exist only because every rule is stated 3× (yaml / principles.md / l1-rationales.md). Consolidate the sources; the police become unnecessary. `check-gap-map.sh` is explicitly report-only, exits 0 always — a stretch-goal vanity metric (G2, spec §7.4); fold into tests or delete. |
| Comments-resolver shim (`apply-edit-at-anchor.js` + tests) | ~250 lines | Pays rent — repo-wide contract, correctly cites `_shared/apply-edit-at-anchor.md` instead of restating it. |
| Test harness (19 runners + 47 `.assert` fixtures) | — | Pays rent *conditional on the engine staying*. The fixture suite is the only thing standing between a 2,598-line untyped bash file and silent regression. If U001–U008 delegate out, roughly half the fixtures retire with them. |

**Verdict on the philosophies:** they are not rivals; they are two layers welded together. The deterministic layer is a *linter with a team contract* — keep it, but lean on existing linters instead of bespoke grep. The `--deep` layer is *Pocock's skill in a sandbox* — the sandbox guards (denylist, verbatim evidence) are reasonable, but the design should re-import Pocock's missing third act: after classification, offer the grilling loop instead of just dumping findings into a triplet.

## Findings

1. **[V][P] Two near-identical judge-mode sections.** `## Mode: --from-spec` (lines 221–251) and `## Mode: --since` (lines 255–296) duplicate a 7-step dispatch flow, exit-code table, and CLI-knob block that differ in ~4 details (artifact source, anchor field, one short-circuit, slug suffix). Why it matters: ~75 lines of duplication that must be edited twice forever (the FR-09 empty-diff short-circuit already only exists in one). Fix: one `## Judge modes` section with the shared flow + a 4-row difference table. Saves ~60 lines.
2. **[R] Spec-citation soup throughout.** "applies the FR-06 orchestrator-side validator + the 3 D8 knobs" (line 223), "per §13 / §9.2 case 2" (line 285), "(FR-22, FR-30, FR-60)" (line 300), "(R8)" (line 200). A colleague reading this file cold cannot resolve a single one of these tokens; they cite three different feature-folder specs without links. Why it matters: this is the clearest accretion signature in the file — instructions written for the *author during implementation*, not the *model at runtime*. Fix: delete the tokens or replace with plain English ("the validator drops findings whose quote isn't verbatim in the source"); keep at most one link per section to the owning spec.
3. **[R] Stale retired-contract reference.** Line 302: "`/comments resolve` (T10) dispatches into when walking open threads in an architecture artifact's **`.comments.json` sidecar**." The sidecar contract was retired in v2.58.0 (inline `pmos-comments` block; see repo CLAUDE.md "Inline doc comments"). Why it matters: a model following this looks for a file that no longer exists. Fix: "…walking open threads in the artifact's inline `pmos-comments` block."
4. **[S][G] Rule corpus triplicated, with scripts policing the duplication.** Each rule's "why" lives in `principles.yaml` (machine), `principles.md` (637 lines, judge prose), and `reference/l1-rationales.md` (176 lines, human prose) — the U001 rationale appears in near-identical paragraphs in the latter two. Kept aligned by `check-principles-drift.sh`, `test-principles-md-coverage.sh`, and a pre-commit hook (`install-arch-hooks.sh`). Why it matters: three sources of truth + three guard scripts is the canonical "machinery to manage machinery" smell; every rule edit costs 3 writes + hook friction. Fix (structural): make `principles.md` the single prose source (it's what the judge reads), generate or delete `l1-rationales.md`, retire the drift scripts and hook.
5. **[P][X] `temperature: 0` on Task-tool dispatch is a non-executable wish.** Lines 223/240/257/286 instruct a blocking Task call "at `temperature: 0`" — the Task tool exposes no temperature parameter on any current harness. Why it matters: violates the durability criterion (model/harness-specific hack that silently no-ops); a reader believes determinism is enforced when it isn't — the *actual* determinism comes from `validate-findings.js`. Fix: delete the temperature claims; state "determinism is enforced downstream by the validator, not by sampling settings."
6. **[V] Phases 2–4 restate what `run-audit.sh` does.** Phase 2 says "Rule loading is delegated to the harness…; cite this phase, do not re-implement it" — correct instinct — then Phases 2–4 spend ~45 lines re-describing the loader, scanner deny-list, and per-evaluator dispatch anyway. The model's runtime job is: run the script, read the JSON, relay the stderr summary. Why it matters: pure ballast; if the script changes, this prose lies. Fix: collapse Phases 1–6 to ~25 lines ("run `scripts/run-audit.sh audit <args>` — it owns flags, rules, scanning, exemptions, and the triplet; here is how to read the result") and let `--help`/the script header own the detail.
7. **[Ph] The file is three skills concatenated.** Audit (Phases 0–7) + judge modes (`---` separator, line 219) + comment-resolver shim (`---`, line 298). Plus "Phase 4a" as a fractional phase. Why it matters: each `---` block has its own register, exit-code tables, and flag sets — the accretion is structural, not just verbal. Fix: move the judge modes to `reference/judge-modes.md` (loaded when `--from-spec`/`--since` is present — true progressive disclosure); the resolver shim section is already mostly a citation and can shrink to 6 lines.
8. **[F] `--sort risk` accepts exactly one value.** The parser rejects anything except `risk` (run-audit.sh: "unknown sort mode… only 'risk' supported"). Why it matters: a flag with one legal value is a boolean wearing a costume. Fix: rename `--sort-by-risk` or fold into natural language.
9. **[G] Caps are well-originated — keep them, but say why inline.** Time-boxed origin check: L1 ≤15 cap = FR-21 in `docs/pmos/features/2026-05-13_architecture-principles-skill/02_spec.html`; 5,000-module deep-pass cap = OQ6 in `2026-05-13_architecture-deep-pass/02_spec.html` (cost control, with documented `ARCH_DEEP_NO_CAP=1` bypass); `--top-n 8` / `--min-confidence 70` = "judgment-call defaults; revisit post-launch if FP rate exceeds 20%" in `2026-05-28_architecture-in-feature-sdlc/02_spec.html`. These are steelmanned — the fix is only to carry the one-line *why* (and the FP-rate revisit trigger) into SKILL.md instead of the bare FR token.
10. **[V] "Track Progress" section is ballast.** Lines 19–21 tell the model to use its task tracker per phase — generic harness behavior every capable model does; the Platform Adaptation section already covers the no-tracker case. Fix: delete (5 lines).
11. **[S] Substrate use is otherwise good — say so.** Cites `_shared/apply-edit-at-anchor.md` as normative instead of restating (the NFR-08 pattern other skills should copy), copies html-authoring assets with `cp -n`, uses `build_sections_json.js`. The Phase 7 learnings capture is a compact 3-line variant of `_shared/learnings-capture.md` — acceptable. No tier-logic duplication (this skill has no tiers of its own; `/spec` owns the T1/T2/T3 gate).

## Flags inventory

| Flag | Purpose | Verdict |
|---|---|---|
| `[path]` positional | scan root | keep |
| `--label <slug>` | output filename slug | fold into natural language ("call it X") — keep CLI parse for parents |
| `--non-interactive` | canonical contract | keep (repo contract) |
| `--deep` | opt-in deepening pass | keep — cost gate is real |
| `--include-info-comments` | show `wont_fix` in HTML/MD | rename (`--show-wont-fix`) or fold into natural language |
| `--monorepo` | fan out per stack | keep, but auto-offer: the engine already detects multiple stacks and warns — promote the warning to a prompt with `(Recommended)` |
| `--since <ref>` | judge mode on git delta | keep — `/verify` Phase 4b depends on it (coupling) |
| `--baseline <path>` | diff vs saved JSON | keep |
| `--scaffold-l3` | write starter L3 config | keep (one-time setup mode; closest thing to Pocock's "config externalized") |
| `--sort risk` | one legal value | delete or make boolean (finding 8) |
| `--from-spec <path>` | judge mode on spec artifact | keep — `/spec` Phase 6b depends on it (coupling) |
| `--top-n` / `--min-confidence` / `--no-evidence-required` | judge knobs | keep but demote to reference/judge-modes.md — they exist for parent skills, not humans |
| `ARCH_DEEP_NO_CAP=1` (env) | bypass 5,000-module cap | keep — documented destructive-cost bypass |

## Gates & rubrics inventory

| Check | Hard or soft | Failure it catches | Verdict |
|---|---|---|---|
| Phase 0 required-tools gate (`jq`/`python3`/`node`, exit 64) | hard | engine crash mid-run with partial triplet | keep-hard |
| Optional-tool graceful degrade (`tools_errored[]`) | soft | audit dying on a missing linter | keep |
| L1 ≤15 rule cap (FR-21) | hard (loader) | rule-set sprawl → unreviewable reports | keep-hard; carry the why inline |
| L3 "mute via wont_fix, not removal" | hard | silent erosion of universal rules per-repo | keep-hard — this is the team contract |
| Exemption expiry re-emit | hard | exemptions becoming permanent by default | keep-hard |
| 5,000-module deep-pass cap + env bypass | hard | runaway subagent cost on huge repos | keep-hard (OQ6 origin) |
| Secret-file denylist on deep-pass payload | hard | secrets shipped to a subagent prompt | keep-hard |
| Deep-pass evidence grep-validation (`validation_failed`) | hard | hallucinated module classifications promoted to findings | keep-hard |
| `validate-findings.js` (rule-id whitelist, confidence range, ≥40-char verbatim quote) | hard | judge hallucination entering the pipeline | keep-hard — the single most rent-paying gate in the skill |
| `--top-n`/`--min-confidence` knobs | soft | finding-flood on parents | keep (documented revisit trigger) |
| Size-class demotion reconciliation | hard | double-penalizing one module from two evaluators | keep, but it's stated 3× in SKILL.md (Phase 4a, Phase 5, Anti-pattern (a)) — state once |
| `temperature: 0` instruction | aspirational | nothing — parameter doesn't exist | delete (finding 5) |
| `check-gap-map.sh` delegation ratio | report-only, exits 0 always | nothing — vanity metric | delete or move to tests |
| `check-principles-drift.sh` + md-coverage test + pre-commit hook | hard | yaml/md rule drift | soften → delete by consolidating sources (finding 4) |
| `check-citations.sh` (every rule has `source:`) | hard | uncited rules accreting | soften to test-suite-only |
| 47 `.assert` fixture regression suite | hard (CI) | engine regressions in 2,598-line bash | keep while the engine stays bespoke |

## Fix list

| Fix | Type | Impact | Risk |
|---|---|---|---|
| Merge `--from-spec`/`--since` into one judge-modes section (difference table) | quick-win | high | low — prose only; parent invocations unchanged |
| Strip spec-citation tokens; replace with plain-English why or one link per section | quick-win | high | low |
| Fix stale `.comments.json` sidecar reference → inline pmos-comments block | quick-win | med | none |
| Delete `temperature: 0` claims; name `validate-findings.js` as the determinism mechanism | quick-win | med | none |
| Collapse Phases 1–6 to "run the script, read the triplet" (~25 lines) | structural | high | low — the script is already the source of truth |
| Consolidate rule prose to `principles.md` only; retire `l1-rationales.md`, drift scripts, pre-commit hook | structural | high | med — judge prompt + tests reference the files; needs a coordinated pass |
| Move judge modes + knobs to `reference/judge-modes.md` (progressive disclosure) | structural | med | low — keep CLI surface identical for `/spec`/`/verify` |
| Delegate U001–U008 to ruff/ESLint configs where the stack allows; shrink run-audit.sh | structural | med | med — changes finding fidelity on repos without those linters; behind the existing graceful-degrade pattern |
| Add a post-`--deep` grilling offer (Pocock step 3): "which candidate do you want to explore?" | structural | med | low — additive, interactive-mode only |
| Delete `from-spec-tracer.sh` (shipped tracer-bullet), `check-gap-map.sh`; delete "Track Progress" section; fix `--sort risk` | quick-win | low | low |
