---
name: Experiment Design Doc
slug: experiment-design
description: Pre-registered experiment design — hypothesis, variants, metrics, decision criteria
tiers: [lite, full]
default_preset: tabular
personas: [data-scientist, eng-lead, pm]
length_target: "~1000 words"
files_to_read:
  - label: requirements doc
    pattern: "{feature_folder}/01_requirements*.md"
  - label: PRD if exists
    pattern: "{feature_folder}/prd*.md"
  - label: prior experiments
    pattern: "{feature_folder}/experiment-*.md"
  - label: workstream
    source: product-context
  - label: attached files
    source: user-args
---

# {Feature Name} — Experiment Design Doc

## §1 Summary
<!-- tier: both -->
<!-- purpose: one-paragraph snapshot of what is being tested and what winning looks like -->
<!-- guidance:
  - Names all variants (control and treatment(s))
  - Names the target population
  - States the expected lift and primary metric
  - ≤4 sentences total
-->
Write a summary that names the variants, population, expected lift, and primary metric in ≤4 sentences.

## §2 Background & Motivation
<!-- tier: full -->
<!-- purpose: anchor the experiment in prior signal — why we believe this is worth testing -->
<!-- guidance:
  - Prior data or signal cited (qualitative or quantitative)
  - Prior related experiments named or explicitly "none"
  - Opportunity cost of not running the experiment articulated
-->
Explain the prior signal or data that motivates this experiment, name any prior related experiments, and articulate the cost of not running it.

## §3 Hypothesis
<!-- tier: both -->
<!-- purpose: falsifiable prediction with mechanism, direction, and magnitude bound -->
<!-- guidance:
  - Mechanism is non-trivial (explains why the change would move the metric)
  - Direction of effect stated explicitly
  - Magnitude or MDE-bound stated (e.g., "we expect ≥2% lift" or "MDE = 1%")
  - Falsifiable: names what result would disprove it
-->
State the hypothesis as: "We believe [change] will [direction] [metric] by [magnitude/MDE] because [mechanism]. We'll know we're wrong if [falsifying outcome]."

## §4 Variants
<!-- tier: both -->
<!-- purpose: define control and all treatment arms unambiguously -->
<!-- guidance:
  - Control is concrete (the actual status quo, not "no change")
  - Each treatment described with screenshot, copy, or code path reference
  - Differences between arms are explicit for multi-arm experiments
  - Variant count is justified relative to the sample size (more arms = longer experiment)
-->
<!-- tabular_schema:
  columns: [Variant, Description, Code path / screenshot, Allocation %]
  row_per: variant
-->
Define control and each treatment arm with description and code/screenshot reference. Justify the number of arms given the sample size.

## §5 Unit of Randomization & Population
<!-- tier: both -->
<!-- purpose: define who is in the experiment and how they are assigned -->
<!-- guidance:
  - Unit of randomization named (user, session, account, device)
  - Unit matches the primary metric (e.g., user for retention, session for engagement)
  - Eligibility filters explicit (new users only? logged-in only? specific cohort?)
  - Exclusions explicit (employees, bots, users in other active experiments)
  - Estimated eligible population size stated
-->
Name the randomization unit, confirm it matches the primary metric, state eligibility filters and exclusions, and estimate the eligible population size.

## §6 Metrics
<!-- tier: both -->
<!-- purpose: define the full metric stack — OEC, guardrails, secondary, and counter-metrics -->
<!-- guidance:
  - Primary (OEC) metric: numerator + denominator + baseline value + weekly variance
  - ≥1 guardrail metric with an explicit regression threshold
  - (Full) ≥1 secondary metric
  - (Full) ≥1 counter-metric to catch unintended substitution effects
  - Each metric: instrumentation status (built / in-progress / TBD)
  - Ratio metrics name numerator and denominator explicitly
-->
<!-- tabular_schema:
  columns: [Metric, Layer (OEC|secondary|guardrail|counter), Numerator, Denominator, Baseline, Variance, Threshold, Instrumentation]
  row_per: metric
-->
List all metrics. The OEC row must include numerator, denominator, baseline, and weekly variance. Each row needs an instrumentation status.

## §7 Sample Size, MDE, Duration
<!-- tier: both -->
<!-- purpose: demonstrate the experiment is adequately powered before launch -->
<!-- guidance:
  - MDE (minimum detectable effect) stated — the smallest effect that would change the decision
  - Power-calc inputs shown: baseline rate, variance, significance level (α), power (1-β)
  - Duration ≥1 full weekly cycle (typically ≥7 days to capture weekly seasonality)
  - Calculation method named (formula, tool, or library)
  - Per-arm sample size stated for multi-arm experiments
-->
State the MDE, show the power-calc inputs, name the calculation method, and specify the minimum duration and per-arm sample size.

## §8 Allocation & Ramp Plan
<!-- tier: full -->
<!-- purpose: describe the safe launch path — ramp schedule, SRM checks, and A/A validation -->
<!-- guidance:
  - Initial ramp percentage stated (e.g., start at 5% of eligible traffic)
  - Ramp triggers explicit (criteria to advance from 5% → 20% → 100%)
  - SRM (sample ratio mismatch) check planned — tool or method named
  - A/A pre-check history cited, or justification for skipping
-->
Describe the initial ramp %, triggers to advance each stage, how SRM will be checked, and any A/A history or justification for skipping it.

## §9 Decision Criteria — pre-registered
<!-- tier: both -->
<!-- purpose: pre-register the ship/hold/kill/draw thresholds before the experiment runs -->
<!-- guidance:
  - Ship/hold/kill thresholds are quantitative (not "if it looks good")
  - Guardrail regression thresholds explicit per guardrail metric
  - "Draw" scenario defined (what happens if no effect is detected)
  - Multi-metric correction plan stated (e.g., Bonferroni, sequential testing)
  - Thresholds tied to the business cost of error (what false-positive or false-negative costs)
  - Pre-registration date stamped in this section
-->
<!-- tabular_schema:
  columns: [Outcome (ship|hold|kill|draw), Primary-metric threshold, Guardrail thresholds, Multi-metric correction]
  row_per: outcome
-->
Pre-register each decision outcome with quantitative thresholds. State the multi-metric correction approach. Stamp the pre-registration date. Tie thresholds to business cost of error.

## §10 Risks & Trustworthiness
<!-- tier: full -->
<!-- purpose: surface threats to experiment validity before launch -->
<!-- guidance:
  - Carryover effects addressed (prior experiment contamination) or N/A
  - Novelty effects addressed (early-adopter inflation) or N/A
  - Network/spillover effects addressed or N/A with rationale
  - Instrumentation validity addressed (is the metric fired correctly in all variants?)
  - A/A history cited or planned pre-experiment A/A named
-->
<!-- tabular_schema:
  columns: [Risk type (carryover|novelty|network|instr|A/A), Status, Mitigation]
  row_per: risk
-->
Address each validity risk — carryover, novelty, network/spillover, instrumentation, and A/A history. Mark N/A with a one-line rationale where it genuinely doesn't apply.

## §11 Analysis Plan
<!-- tier: full -->
<!-- purpose: declare sub-group analyses and readout format up-front to prevent p-hacking -->
<!-- guidance:
  - Segments to analyze declared up-front (new vs returning, platform, cohort)
  - Heterogeneity hypotheses pre-stated (which segments are expected to differ and why)
  - Readout format named (dashboard, notebook, slide deck — with owner)
-->
Declare the segments to analyze, state any heterogeneity hypotheses, and name the readout format and owner.

## §12 Stakeholders & Timeline
<!-- tier: both -->
<!-- purpose: name who owns this experiment, who reviews results, and when the readout happens -->
<!-- guidance:
  - Owner named (DRI for the experiment)
  - Reviewer(s) named (who approves the readout decision)
  - Engineering instrumentation owner named if metrics need new tracking
  - Readout date estimated
-->
<!-- tabular_schema:
  columns: [Role (owner|reviewer|eng|analyst), Person, Readout date]
  row_per: role
-->
List owner, reviewer(s), engineering instrumentation owner, and any analyst. Include the expected readout date for each role row.

## §13 Appendix
<!-- tier: full -->
<!-- purpose: supporting links and references — no new arguments -->
<!-- guidance:
  - Tracking spec or instrumentation spec linked
  - Analysis dashboard linked (or "TBD — owner: <name>")
  - Prior related experiments linked or referenced
-->
List tracking spec, analysis dashboard, and prior experiment links only. No new arguments or prose — those belong in the sections above.
