# Dogfood run — T4 (TN−1) for the «report-generator» fixture feature (Tier 3)

Archetype: **Use → blind LLM-judge**. Scenario: generate a quarterly metrics report
from a representative dataset; an independent blind judge scores it against the rubric.
The iterate loop hit its cap (2) without fully satisfying the rubric; the remaining
gap was accepted as a known risk (`_shared/dogfooding.md#iterate-loop` step 5).

## Objective criteria
- Report renders, 0 uncaught console errors — **green** (`0 errors`).
- Source citations ≥ 8 — **green** (`9 citations`).
- All 6 required sections present — **green** (`6/6`).
  (No *critical* objective gate failed — so the cap is PASS-WITH-GAPS, not FAIL.)

## Subjective criteria (blind-judge rubric)
- accuracy, completeness, relevance, actionability, citation-quality, clarity.

## Independent judge
Fresh blind subagent; returns `{per_dimension, overall_satisfied, gaps}`. Result:
`actionability` scored below the acceptable bar (recommendations too generic);
two remediation iterations did not lift it → `overall_satisfied: false`.

gaps:
- actionability-below-bar: recommendations are generic; lack owner + due-date per item.

**Verdict:** not-satisfied · accepted_residuals: [actionability-below-bar]
