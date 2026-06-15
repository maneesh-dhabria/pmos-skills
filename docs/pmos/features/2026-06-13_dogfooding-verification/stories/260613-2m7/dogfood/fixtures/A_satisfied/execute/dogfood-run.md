# Dogfood run — T4 (TN−1) for the «report-generator» fixture feature (Tier 3)

Archetype: **Use → blind LLM-judge**. Scenario: generate a quarterly metrics report
from a representative dataset; an independent blind judge scores it against the rubric.

## Objective criteria
- Report renders, 0 uncaught console errors — **green** (`0 errors`).
- Source citations ≥ 8 — **green** (`11 citations`).
- All 6 required sections present — **green** (`6/6`).

## Subjective criteria (blind-judge rubric)
- accuracy, completeness, relevance, actionability, citation-quality, clarity.

## Independent judge
Fresh blind subagent given the report + rubric + the original task; returns
`{per_dimension, overall_satisfied, gaps}`. Result: every dimension ≥ acceptable,
no blocker → `overall_satisfied: true`, `gaps: []`.

**Verdict:** satisfied · accepted_residuals: []
