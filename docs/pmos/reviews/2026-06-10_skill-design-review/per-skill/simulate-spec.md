# simulate-spec — review

**Grade:** C (the domain content is genuinely good, but it now lives in two diverging copies — SKILL.md and `_shared/sim-spec-heuristics.md` — with a canonicity pointer that is false; a consolidation rewrite would pay off heavily)
**Size:** SKILL.md 519 lines (490 excluding non-interactive block); references 1 file / 67 lines, plus shared substrate `_shared/sim-spec-heuristics.md` 176 lines; target ~200 lines (~170 excluding the block), with the heuristics living once in the substrate.

## TL;DR

- **Biggest win available:** Phases 2–6 (~190 lines) are an expanded restatement of `_shared/sim-spec-heuristics.md` §1–§4 — which the SKILL.md itself declares canonical ("When in doubt, the substrate doc is canonical", Phase 2 banner). Except the two have drifted apart on at least four material points (gap-resolution model, output format, pseudocode discipline, bucket count). Consolidating into one true substrate + a thin standalone shell removes both the duplication and the drift.
- **Biggest risk:** the false canonicity pointer. A model that takes the Phase 2 banner at face value and follows substrate §5 will run threshold-keyed auto-apply with per-finding commits — silently mutating the spec — when the standalone skill's actual contract (Phase 7, Anti-Patterns) is "every patch requires user approval." That is the exact "comment vanished"-class failure the repo designs against elsewhere.
- **Worth keeping:** the heuristics themselves. The 4-pass scenario enumeration (spec / variants / 10-category adversarial / model-driven), the "is this RIGHT, not just present?" fitness framing, the forward-vs-reverse cross-reference scan, and the "pseudocode's four follow-up sections catch what pseudocode misses" rationale are distilled judgment, Pocock-grade in spirit. They just need to exist once.

## The three pressure-test skills — overlap map (special attention)

`/grill`, `/msf-req`, and `/simulate-spec` all "pressure-test an artifact," but along genuinely different axes:

| | /grill | /msf-req | /simulate-spec |
|---|---|---|---|
| What is attacked | the **human's decisions** (unjustified, implied, missing) | the **end-user experience** implied by the requirements (M/F/S per persona × journey) | the **design's technical completeness** (scenarios vs. artifacts, schema/API fitness, wire-up) |
| Who supplies answers | the user, one question per turn | the model (simulated personas); user only confirms personas/journeys | the model traces; user only dispositions gaps |
| Cadence | interactive decision-tree walk | batch analysis | batch trace + batched gap resolution |
| Pipeline stage | any artifact, any time | requirements → spec | spec → plan |
| Mutates the source? | never (chat report, opt-in save) | never (recommendations-only, by charter) | yes — user-approved surgical Edits + patch log |

**Verdict: no merge.** The jobs are distinct and each skill's "when NOT to use" routing is coherent (grill's report even suggests "/simulate-spec to pressure-test the revised design"). The real overlap is **scaffolding, not substance**:

1. The reviewer-subagent **Input Contract block is duplicated verbatim in 5 skills** (grill, msf-req, msf-wf, simulate-spec, verify — `grep -l "Input Contract (when invoked as reviewer subagent)"`). It belongs in `_shared/` with a one-line pointer per skill. For simulate-spec specifically it appears to be **vestigial** — see finding 3.
2. The **FR-10 HTML-emit block** (Phase 8) is the same ~20-line inline block carried by ~12 skills (see grill review, finding 1). Same fix: substrate pointer + per-skill deltas (here: `../assets/` prefix, `simulate-spec/` phase rank).
3. **Three severity vocabularies** for the same concept: blocker/significant/minor/forward-compat (simulate-spec) vs. Must/Should/Nice (msf-req) vs. Resolved/Open/Gaps (grill). A single findings taxonomy in `_shared/` would let downstream consumers (feature-sdlc, /verify) read all three without translation. Lower priority; flag, don't force.

## Findings

1. **[S][R] SKILL.md and its own canonical substrate have drifted apart.** The Phase 2 banner says the substrate is canonical and "both paths converge on the same heuristics" — but: (a) **gap resolution**: SKILL.md Phase 7 is four-disposition AskUserQuestion with mandatory user approval; substrate §5 is tier-keyed threshold **auto-apply** with per-finding commits (D16). (b) **output**: substrate §8 says the standalone output is `<date>-trace.md`; Phase 8 emits `.html` per FR-10. (c) **pseudocode**: Phase 6 is "2–3 algorithmically complex flows + four mandatory sections"; substrate §6 is "a 5–15 line sketch per blocker/significant gap." (d) **buckets**: SKILL.md has 6 buckets including Operational (NFRs/observability/rollout); substrate has 4, Operational absent. Whichever copy a model reads first wins, and they prescribe different behavior. **Fix (structural):** make the substrate genuinely canonical — move the full bucket checklists, the adversarial categories, and the pseudocode discipline there once; add an explicit "standalone deltas vs. folded deltas" section (interactive dispositions vs. auto-apply; trace doc vs. in-place patches); shrink SKILL.md Phases 2–6 to gates + pointers.
2. **[V] Phases 2–5 restate substrate §1–§4 at ~3× length.** E.g., Bucket 1's nine-bullet checklist (SKILL.md lines 227–236) vs. the substrate's one-line compression (§3 Bucket 1). The expanded form is the *better* version — it's the one with "Composite index column order match query predicates?" — so the fix is to move it, not delete it. ~150 lines leave SKILL.md.
3. **[R] The reviewer-subagent Input Contract (Phase 1, lines 133–139) appears to have no live caller.** It says "currently `/feature-sdlc` invokes this skill as a reviewer subagent," but feature-sdlc removed the standalone simulate-spec phase in v2.34.0 ("folded into `/spec` as Phase 6a, delegating to `_shared/sim-spec-heuristics.md`" — feature-sdlc line 350; the folded path never dispatches this SKILL.md). **Fix:** verify no other orchestrator dispatches it, then delete the block (−7 lines) or correct the parenthetical. If any caller remains, relocate the 5-way-duplicated block to `_shared/`.
4. **[G] Phase 9's exit criterion "User has confirmed they have no further concerns — do not self-declare exit" blocks an optional validator on an extra confirmation turn.** Under `--non-interactive` this manufactures a deferred open question on every clean run. The other two exit criteria (5 checks pass; last loop cosmetic-only) already guard the real failure. **Fix:** soften to "offer the user a final-concerns checkpoint; absence of objection is acceptance."
5. **[V] "Load Learnings" is stated twice** — as a top-level section (lines 33–35) and again inside Phase 0 (line 41, "Also note any entries under `## /simulate-spec`…"). Keep the Phase 0 sentence; delete the section. −4 lines.
6. **[P] Phase 7's interaction micro-format is over-specified.** "The `question` field should restate the gap + the proposed patch in one sentence so the user can decide without scrolling back" and the ≤4-per-batch / category-coherence rules dictate prompt layout a capable model gets from the WHY alone (the stated rationale — don't exhaust the user one-by-one across dozens of findings — is the load-bearing part). **Fix:** keep the four dispositions, the tier-2-inline vs. tier-3-batched distinction, and the rationale; cut the field-level formatting. −10 lines.
7. **[Ph] Phase 0a is an insertion smell** (the criteria's fractional-phase flag) — output_format resolution bolted on after pipeline-setup rather than folded into Phase 0's list. Cosmetic; merge as Phase 0 step n.
8. **[V] Two Anti-Patterns are the same rule from opposite directions:** "Do NOT batch gap resolution until after Phase 8 — gaps get resolved in Phase 7, before the doc is written" and "Do NOT produce the simulation doc before all gaps have a disposition" (which also restates Phase 7's exit gate). Keep one. The other ~9 anti-patterns each name a real failure mode and earn their lines — this list is one of the file's strengths.
9. **[X] Platform Adaptation is honest and matches the body** (AskUserQuestion fallbacks are specified at each call site, e.g., Phase 7's "present a numbered gap table… Do NOT silently apply patches"). No cross-platform defects beyond the repo-global tool-name baseline.

## Flags inventory

| Flag | Purpose | Verdict |
|---|---|---|
| `<path-to-spec-doc>` (positional) | Target spec | Keep. |
| `--feature <slug>` | Feature-folder disambiguation for pipeline-setup | **Keep (repo contract)** — exists because resolve-input needs it when invoked outside the folder. |
| `--force` | Override the Tier-1 refusal | **Keep** — the refusal is a real guard ("simulation is overkill" for bug fixes) and the override is discoverable: the refusal message itself names the flag. Model example of a good flag. |
| `--format <html\|md\|both>` | FR-12 output-format override | **Keep (repo contract)** — but `both` is retired-aliased-to-html (Phase 8, FR-12.1); same global hint-cleanup as flagged in the grill review. |
| `--non-interactive` / `--interactive` | W14 mode contract | Keep (repo contract). |

## Gates & rubrics inventory

| Check | Hard or soft | Failure it catches | Verdict |
|---|---|---|---|
| Tier-1 refusal (+ `--force` escape) | Hard | Running a 10-phase simulation on a one-line bug fix | **Keep-hard** — cheap, self-explanatory, names its own override. |
| Phase 1 gate: tier confirmed + scope declared | Hard | False-positive gaps from assuming full-stack scope (named in Anti-Patterns: "backend-only or CLI-first specs") | **Keep-hard** — scope drives which buckets run; skipping it poisons everything downstream. |
| Phase 2 gate: user confirms scenario list | Hard | Tracing the wrong scenario list (stated: "tracing the wrong list wastes work") | **Keep-hard** — it's the cheapest checkpoint in the skill and the most expensive thing to get wrong. |
| Pseudocode cap (2–3 flows, 5 trigger criteria) | Hard cap | Pseudocoding every flow — duplicates /plan, locks implementation prematurely (anti-pattern stated with reason; origin: 2026-04-18_simulate-spec spec chose "hybrid" over "full pseudocode" as a design decision) | **Keep** — but as the stated principle + triggers; the "pick the 3 with highest complexity × blast radius" tiebreak is advisory. |
| Phase 7 exit gate: every gap dispositioned | Hard | Half-resolved Gap Register baked into the doc | **Keep-hard** — the doc's §7–§10 are derived from dispositions; writing early produces an internally inconsistent artifact. |
| Phase 9 single review pass (5 checks) | Soft (1 loop, user can request more) | Phase 2/4/5 omissions; Register/doc integrity | **Keep** — the "already adversarial by design; a second pass is critique-the-critique" rationale is exactly the right justification for capping at 1. |
| Phase 9 "user confirms no further concerns" exit | Hard | — (manufactures a turn; see finding 4) | **Soften.** |
| FR-10/FR-22 emit contract, heading IDs, atomic write | Hard (repo machinery) | Broken artifacts/index | Keep; assess globally. |
| Phase 10 workstream enrichment "mandatory whenever loaded" | Hard-ish | Lost cross-feature signal | Keep as-is (3 lines, points at substrate). |
| Phase 11 learnings reflection | Soft | Lost session learnings | Keep (repo contract). |

## Fix list

| Fix | Type | Impact | Risk |
|---|---|---|---|
| Consolidate Phases 2–6 into `_shared/sim-spec-heuristics.md` (full checklists move there; SKILL.md keeps gates + pointers + standalone deltas) | structural | high | med — /spec's folded Phase 6a reads the substrate; expand it carefully and re-verify the folded path. Document standalone-vs-folded deltas explicitly so the canonicity claim becomes true. |
| Reconcile the four SKILL.md ↔ substrate divergences (gap-resolution model, output format, pseudocode, Operational bucket) | structural | high | med — same change as above; decide per-divergence which copy is right (Phase 7 interactive model and the `.html` output are right for standalone; substrate §5/§8 describe the folded path and should say so). |
| Delete or correct the vestigial reviewer Input Contract (verify no caller first) | quick-win | med | low — grep orchestrators before deleting; if kept, move to `_shared/` with the other 4 copies. |
| Soften Phase 9's user-confirm exit criterion | quick-win | med | none |
| Replace Phase 8 FR-10 inline block with substrate pointer + 2 deltas | structural (12-skill pattern) | med | low — coordinate with the same fix in grill/msf-req et al. |
| Merge duplicate Load-Learnings section into Phase 0; merge Phase 0a into Phase 0; deduplicate the two batching anti-patterns | quick-win | low | none |
| Trim Phase 7 prompt micro-formatting to intent + rationale | quick-win | low | none |
