# Experiment Design Doc — Eval Criteria

Per-section evaluation items for the Experiment Design Doc template. Two consumers:
- **Gap Interview (Phase 2 `#create`, step 6):** filters `kind: precondition`; queues `gap_question` for items whose evidence is absent from auto-read files.
- **Phase 3 Refinement Loop:** reviewer subagent checks ALL items (both kinds) against the generated draft.

---

## §1 Summary

- id: variants-named
  kind: judgment
  tier: [lite, full]
  check: all variants (control and each treatment) are named
  severity: high

- id: population-named
  kind: judgment
  tier: [lite, full]
  check: target population is named in the summary
  severity: high

- id: expected-lift-stated
  kind: judgment
  tier: [lite, full]
  check: expected lift or effect direction stated in the summary
  severity: high

- id: primary-metric-named
  kind: judgment
  tier: [lite, full]
  check: primary metric is named in the summary
  severity: high

- id: summary-length-cap
  kind: judgment
  tier: [lite, full]
  check: ≤4 sentences total
  severity: low

---

## §2 Background & Motivation

- id: prior-data-cited
  kind: judgment
  tier: [full]
  check: prior data or signal cited (qualitative or quantitative) to motivate the experiment
  severity: high

- id: prior-experiments-named
  kind: judgment
  tier: [full]
  check: prior related experiments named, or explicitly stated as "none"
  severity: medium

- id: opportunity-cost-articulated
  kind: judgment
  tier: [full]
  check: opportunity cost of not running the experiment is articulated
  severity: medium

---

## §3 Hypothesis

- id: mechanism-non-trivial
  kind: judgment
  tier: [lite, full]
  check: mechanism explains why the change would move the metric (non-trivial causal claim)
  severity: high

- id: direction-stated
  kind: judgment
  tier: [lite, full]
  check: direction of effect stated explicitly (increase / decrease / no change)
  severity: high

- id: magnitude-or-mde-bound
  kind: precondition
  tier: [lite, full]
  check: magnitude or MDE-bound stated (the smallest effect that would change the decision)
  gap_question: |
    What's the smallest effect (MDE) that would change your decision? For example: "We need at least a 2% lift in activation rate to justify shipping."
  severity: high

- id: hypothesis-falsifiable
  kind: judgment
  tier: [lite, full]
  check: hypothesis is falsifiable — names what result would disprove it
  severity: high

---

## §4 Variants

- id: control-concrete
  kind: judgment
  tier: [lite, full]
  check: control is concrete (the actual status quo, not vague "no change")
  severity: high

- id: treatments-described
  kind: judgment
  tier: [lite, full]
  check: each treatment arm described with screenshot, copy, or code path reference
  severity: high

- id: differences-explicit
  kind: judgment
  tier: [lite, full]
  check: differences between arms are explicit for multi-arm experiments
  severity: medium

- id: variant-count-justified
  kind: judgment
  tier: [lite, full]
  check: number of variants is justified relative to available sample size (more arms = longer experiment)
  severity: medium

---

## §5 Unit of Randomization & Population

- id: unit-named
  kind: judgment
  tier: [lite, full]
  check: unit of randomization named (user, session, account, device)
  severity: high

- id: unit-matches-metric
  kind: judgment
  tier: [lite, full]
  check: unit of randomization matches the primary metric grain (e.g., user for retention, session for engagement)
  severity: high

- id: eligibility-filters-explicit
  kind: judgment
  tier: [lite, full]
  check: eligibility filters are explicit (new users only? logged-in only? specific cohort?)
  severity: medium

- id: exclusions-explicit
  kind: judgment
  tier: [lite, full]
  check: exclusions are explicit (employees, bots, concurrent-experiment conflicts)
  severity: medium

- id: population-size-estimated
  kind: judgment
  tier: [lite, full]
  check: estimated eligible population size stated
  severity: medium

---

## §6 Metrics

- id: primary-metric-numerator-denominator-baseline-variance
  kind: precondition
  tier: [lite, full]
  check: primary metric has numerator, denominator, baseline value, and weekly variance
  gap_question: |
    What's the primary metric's numerator, denominator, baseline value, and weekly variance? For example: "sessions with purchase / total sessions; baseline 4.2%; weekly variance ±0.3%."
  severity: high

- id: instrumentation-status-per-metric
  kind: precondition
  tier: [lite, full]
  check: instrumentation status is known for each metric (built / in-progress / TBD)
  gap_question: |
    Is the metric already instrumented in production, or does it need to be built? Per metric please.
  severity: high

- id: guardrail-with-regression-threshold
  kind: judgment
  tier: [lite, full]
  check: ≥1 guardrail metric with an explicit regression threshold (e.g., "p99 latency must not increase >10%")
  severity: high

- id: counter-metric-present
  kind: judgment
  tier: [full]
  check: ≥1 counter-metric listed to catch unintended substitution effects
  severity: medium

- id: ratio-metric-num-denom
  kind: judgment
  tier: [lite, full]
  check: any ratio metric explicitly names numerator and denominator
  severity: medium

---

## §7 Sample Size, MDE, Duration

- id: power-calc-inputs-shown
  kind: judgment
  tier: [lite, full]
  check: power-calc inputs shown — at minimum: baseline rate, variance, significance level (α), power (1-β)
  severity: high

- id: duration-weekly-cycle
  kind: judgment
  tier: [lite, full]
  check: minimum experiment duration is ≥1 full weekly cycle (≥7 days)
  severity: high

- id: calc-method-named
  kind: judgment
  tier: [lite, full]
  check: calculation method named (formula, tool, or library)
  severity: medium

- id: per-arm-size-multi-arm
  kind: judgment
  tier: [lite, full]
  check: per-arm sample size stated for multi-arm experiments
  severity: medium

---

## §8 Allocation & Ramp Plan

- id: initial-ramp-percent
  kind: judgment
  tier: [full]
  check: initial ramp percentage stated (not "gradual rollout" — a specific number)
  severity: high

- id: ramp-triggers-explicit
  kind: judgment
  tier: [full]
  check: ramp triggers are explicit — criteria to advance each stage stated
  severity: high

- id: srm-check-planned
  kind: judgment
  tier: [full]
  check: SRM (sample ratio mismatch) check is planned and the tool or method named
  severity: medium

- id: aa-plan
  kind: judgment
  tier: [full]
  check: A/A pre-check history cited, or justification for skipping it stated
  severity: medium

---

## §9 Decision Criteria — pre-registered

- id: ship-thresholds-quantitative
  kind: judgment
  tier: [lite, full]
  check: ship threshold is quantitative (not "if it looks good" or "positive trend")
  severity: high

- id: hold-kill-thresholds-quantitative
  kind: judgment
  tier: [lite, full]
  check: hold and kill thresholds are quantitative
  severity: high

- id: guardrail-regression-thresholds
  kind: judgment
  tier: [lite, full]
  check: guardrail regression thresholds are explicit per guardrail metric
  severity: high

- id: draw-defined
  kind: judgment
  tier: [lite, full]
  check: "draw" scenario is defined — what happens if no statistically significant effect is detected
  severity: high

- id: multi-metric-correction-plan
  kind: judgment
  tier: [lite, full]
  check: multi-metric correction plan stated (e.g., Bonferroni, sequential testing, or explicit "no correction, here's why")
  severity: high

- id: tied-to-business-cost-of-error
  kind: judgment
  tier: [lite, full]
  check: thresholds are tied to the business cost of error (false-positive cost or false-negative cost articulated)
  severity: high

- id: pre-registration-date-stamped
  kind: judgment
  tier: [lite, full]
  check: pre-registration date is stamped in this section (before the experiment launched)
  severity: high

---

## §10 Risks & Trustworthiness

- id: carryover-novelty-addressed
  kind: judgment
  tier: [full]
  check: carryover effects and novelty effects addressed or explicitly marked N/A with rationale
  severity: medium

- id: network-spillover-addressed
  kind: judgment
  tier: [full]
  check: network / spillover effects addressed or marked N/A with rationale
  severity: medium

- id: instrumentation-validity
  kind: judgment
  tier: [full]
  check: instrumentation validity addressed — metric is fired correctly in all variants
  severity: high

- id: aa-history
  kind: judgment
  tier: [full]
  check: A/A history cited or a planned pre-experiment A/A named
  severity: medium

---

## §11 Analysis Plan

- id: segments-declared-upfront
  kind: judgment
  tier: [full]
  check: segments to analyze are declared up-front (not chosen after seeing results)
  severity: high

- id: heterogeneity-hypotheses-prestated
  kind: judgment
  tier: [full]
  check: heterogeneity hypotheses pre-stated (which segments are expected to differ and why)
  severity: medium

- id: readout-format-named
  kind: judgment
  tier: [full]
  check: readout format named (dashboard, notebook, slide deck) with an owner
  severity: medium

---

## §12 Stakeholders & Timeline

- id: owner-reviewer-readout-date
  kind: precondition
  tier: [lite, full]
  check: experiment owner, reviewer(s), and expected readout date are identified
  gap_question: |
    Who owns this experiment, who reviews/approves results, and what's the expected readout date?
  severity: medium

- id: eng-instrumentation-owner
  kind: judgment
  tier: [lite, full]
  check: engineering instrumentation owner named if any metric requires new tracking work
  severity: medium

---

## §13 Appendix

- id: tracking-spec-linked
  kind: judgment
  tier: [full]
  check: tracking spec or instrumentation spec linked (or "TBD — owner: <name>")
  severity: medium

- id: dashboard-linked
  kind: judgment
  tier: [full]
  check: analysis dashboard linked or noted as TBD with owner
  severity: low

- id: prior-experiments-referenced
  kind: judgment
  tier: [full]
  check: prior related experiments referenced in appendix
  severity: low

- id: no-new-prose
  kind: judgment
  tier: [full]
  check: appendix contains only links, data, and references — no new arguments or prose
  severity: medium
