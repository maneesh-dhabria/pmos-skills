# Dogfood run — story 260613-3ff (AC9)

**Deliverable under test:** the revised `/plan` (TN−1 emission + approval gate + review check).
**Archetype:** skill/content-generator → Use → blind-LLM-judge (the deliverable *is* a skill that emits plans).
**Scenario:** run the revised `/plan` emission step on a real **T2** deliverable and a real **T3** deliverable; confirm each emitted plan carries a correct TN−1 dogfood task. Independent blind judge scores the emitted TN−1 blocks against `_shared/dogfooding.md` anatomy + dual-criteria contract.

---

## Emission A — Tier 2 deliverable: `/complete-dev` multi-epic release (enhancement)

*(Representative T2: a CLI/skill enhancement that adds multi-epic selection to an existing release skill.)*

### TN−1: Dogfood / Utility Verification

**Archetype:** CLI / tool → real-invocation against representative inputs.
**Scenario:** with ≥2 release-ready epics staged in the backlog, run `/complete-dev --epic --non-interactive` and confirm it ships each epic's full train sequentially; then run `/complete-dev --epic <id1>,<id2>` and confirm exactly those two ship in order.

**Objective criteria:**
- [ ] `--epic --non-interactive` exits 0 with N tags created (one per release-ready epic); `git tag --list 'pmos-toolkit/v*'` shows N new tags.
- [ ] Per-epic shipped/failed/not-attempted summary printed; shipped count == release-ready count; failed count == 0.
- [ ] `--stories` with a multi-epic set exits 64 (guard fires).

**Subjective criteria** (blind LLM-judge rubric):
- Dimensions: correctness of epic ordering · clarity of the per-epic rollup · faithfulness of the irreversibility warning · stop-and-report behaviour on a simulated failure.
- Bar: every dimension ≥ acceptable AND no dimension is a blocker.
- **Independent judge:** fresh blind subagent given the run transcript + the design contract; returns `{per_dimension, overall_satisfied, gaps}`; makes no edits.

**Iterate protocol:** run → judge → if not satisfied enumerate gaps → fix via `/execute` discovered-work routing → re-run; cap 2; net-worse guard; past-cap AskUserQuestion {accept-residuals / iterate-manually / restore-previous / abort}; non-interactive accepts-residuals-and-surfaces.

**Verdict:** satisfied · accepted_residuals: []

---

## Emission B — Tier 3 deliverable: `/research` skill (feature)

*(Representative T3: a brand-new content-generator skill that emits a cited decision-support report.)*

### TN−1: Dogfood / Utility Verification

**Archetype:** skill / content generator → Use → blind-LLM-judge.
**Scenario:** invoke `/research "pricing models for usage-based developer-tools SaaS"` end-to-end; an independent judge scores the emitted HTML report against objective + rubric criteria.

**Objective criteria:**
- [ ] Report emitted at the expected feature path; process exit 0.
- [ ] Citation count ≥ 5 distinct sources; broken-link count = 0 (link-check pass).
- [ ] A recommendation section is present and names ≥1 concrete decision option.

**Subjective criteria** (blind LLM-judge rubric):
- Dimensions: accuracy · completeness · relevance to the question · actionability · citation quality · clarity.
- Bar: every dimension ≥ acceptable AND no dimension (esp. accuracy, citation quality) is a blocker.
- **Independent judge:** fresh blind subagent given the report path + rubric + the original research question; returns `{per_dimension, overall_satisfied, gaps}`; makes no edits. Non-subagent fallback: self-review "judge as if first time," logged as downgrade.

**Iterate protocol:** run → judge → if not satisfied enumerate gaps → fix via `/execute` discovered-work routing → re-run; cap 2; net-worse guard; past-cap AskUserQuestion {accept-residuals / iterate-manually / restore-previous / abort}.

**Verdict:** satisfied · accepted_residuals: []

---

## Objective gate results (AC9)

| Gate | Emission A (T2) | Emission B (T3) |
|---|---|---|
| TN−1 present | ✅ | ✅ |
| Objective criteria present (≥1, measurable) | ✅ 3 gates | ✅ 3 gates |
| Subjective rubric present (named dimensions + bar) | ✅ 4 dims | ✅ 6 dims |
| Named independent judge | ✅ | ✅ |
| Verdict line `/verify` reads | ✅ | ✅ |
| TN−1 immediately before TN (TN stays last) | ✅ (template order) | ✅ (template order) |
| Approval `AskUserQuestion` present with `(Recommended)` | ✅ (SKILL.md §Dogfood-task emission step 3) | ✅ |
| lint-phase-refs green | ✅ | ✅ |
| skill-eval `[D]` green | ✅ | ✅ |

All objective gates green for both tiers.

## Independent blind-judge verdict (D4)

Dispatched a fresh subagent (no authoring context), scored both emitted TN−1 blocks against `_shared/dogfooding.md` anatomy + dual-criteria contract.

- **overall_satisfied: true** — all 6 dimensions ≥ acceptable, no blockers.
- Dimensions: anatomy-completeness ✅ · dual-criteria ✅ · judge-independence ✅ · archetype-fit ✅ · iterate-fidelity (weak→fixed) · utility ✅.
- One non-blocking gap (Emission A iterate line abbreviated) — **fixed** in this artifact for fidelity parity; no `/plan` deliverable change required.

**Dogfood result: SATISFIED on iteration 1** (cap 2 unused). Objective gates all green for both T2 and T3 emissions; subjective judge satisfied. No accepted residuals.
