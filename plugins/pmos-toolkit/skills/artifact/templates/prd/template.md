---
name: PRD
slug: prd
description: Product Requirements Document — problem, customers, metrics, scope, risks
tiers: [lite, full]
default_preset: narrative
personas: [eng-lead, design, gtm, exec]
length_target: "~1500 words"
files_to_read:
  - label: requirements doc
    pattern: "{feature_folder}/01_requirements*.md"
  - label: spec doc
    pattern: "{feature_folder}/02_spec*.md"
  - label: wireframes
    pattern: "{feature_folder}/wireframes/*"
  - label: workstream
    source: product-context
  - label: attached files
    source: user-args
---

# {Product Name} — PRD

## §1 TL;DR
<!-- tier: both -->
<!-- purpose: one-paragraph forcing-function that names the customer, the change, and the expected outcome -->
<!-- guidance:
  - Names the customer or segment (not generic "users")
  - Names the concrete change or capability being shipped
  - States the expected outcome (movement, not feature-ship)
  - ≤4 sentences total
-->
Write a TL;DR that names the customer/segment, the change, and the expected outcome in ≤4 sentences.

## §2 Problem & Customer
<!-- tier: both -->
<!-- purpose: make the problem concrete with evidence and a specific customer segment -->
<!-- guidance:
  - Specific segment named with JTBD (job-to-be-done)
  - ≥1 evidence cited (quote, ticket reference, data point, or research session ref)
  - Frequency or impact quantified (how often, how many)
  - Current customer workaround or coping behavior described
  - No solution language ("we will build X") smuggled into the problem
-->
Describe the specific customer segment, their job-to-be-done, the evidence for the problem, and what they do today as a workaround.

## §3 Why Now
<!-- tier: full -->
<!-- purpose: articulate the strategic moment — why this problem, why this quarter -->
<!-- guidance:
  - Cites strategy, OKR, or strategic bet that this addresses
  - Names a concrete trigger or closing window (competitive move, contract, platform change, expiring data)
  - Articulates the opportunity cost of waiting
-->
Explain the strategic trigger: which OKR or bet this serves, the concrete window that's closing, and what it costs the business to wait.

## §4 Goals & Non-Goals
<!-- tier: full -->
<!-- purpose: bound the work with outcome-shaped goals and explicit non-goals with rationale -->
<!-- guidance:
  - Goals are outcome-shaped (measurable movement, not deliverable) — 1–3 goals max, each measurable
  - ≥2 non-goals listed, reasonable (not strawmen), each with a brief rationale
-->
Write 1–3 outcome-shaped goals (each measurable) and ≥2 non-goals with one-line rationale for why each is explicitly out.

## §5 Success Metrics
<!-- tier: both -->
<!-- purpose: define how we'll know it worked — primary, input, and guardrail metrics with baselines -->
<!-- guidance:
  - Primary metric: baseline + target + timebox + mechanism (falsifiable direction)
  - Numerator + denominator for any ratio metric
  - ≥1 input metric that leads the primary
  - ≥1 guardrail metric with a regression threshold
  - Owner + instrumentation status per metric
  - In Lite mode, this section absorbs the Goals bound — render as a single combined "Goals + Metrics" section.
-->
<!-- tabular_schema:
  columns: [Metric, Layer (primary|input|guardrail|counter), Baseline, Target, Timebox, Mechanism, Owner, Instrumentation]
  row_per: metric
-->
List all metrics. For the primary metric include the baseline, target, timebox, and mechanism. Each metric needs an owner and instrumentation status.

## §6 Solution Overview
<!-- tier: both -->
<!-- purpose: describe the customer-facing solution at the right level of abstraction — no schema or API detail -->
<!-- guidance:
  - Customer narrative present (how the experience changes for the segment named in §2)
  - Happy path + ≥1 alternative flow described
  - Wireframe or prototype linked, or explicitly noted as TBD
  - No schema/API creep (implementation detail belongs in a spec or eng-design doc)
  - New capabilities vs reused components called out
-->
Describe the solution from the customer's perspective: what changes, the happy path, at least one alternative flow, and a wireframe link or TBD placeholder.

## §7 User Journey / Narrative
<!-- tier: both -->
<!-- purpose: walk through the experience step-by-step with a specific persona, mental state, and outcome -->
<!-- guidance:
  - Specific persona (from the segment named in §2)
  - Numbered steps: entry → action → outcome
  - Mental state noted at key decision points
  - Happy path + ≥1 alternative path
  - Journey ends at the JTBD outcome (not at "task complete")
-->
Write a numbered journey for a named persona: from entry, through each action, to the JTBD outcome. Note mental state at key steps. Include ≥1 alt path.

## §8 User Stories & Acceptance Criteria
<!-- tier: full -->
<!-- purpose: capture the story spine for the backlog — grouped by journey activity, walking-skeleton marked -->
<!-- guidance:
  - Grouped by user-journey activity (NOT by priority — priority-grouped lists are "context-free mulch")
  - ≤12 stories total; 3–7 stories per group
  - Role is a named segment from §2 — no "As a system" or bare "As a user"
  - `so that` traces to a goal in §4 (Adzic impact-laddering)
  - Per-story: Connextra (As a [role], I want [capability], so that [benefit]) OR job story (When [situation], I want to [motivation], so I can [outcome]) — prefer job story for situational features
  - AC per story: Given/When/Then OR checklist — pick one form per story, not both
  - AC describes observable outcome, not implementation steps
  - Walking-skeleton subset marked (minimum top-row stories for end-to-end value)
  - Each story ≤3 lines + AC
  - No solution-prescriptive stories ("I want a dropdown for X")
  - Stories don't duplicate the Solution Overview prose
-->
<!-- tabular_schema:
  columns: [Story, AC form (G/W/T or checklist), Walking-skeleton?, Mapped goal §4]
  row_per: story
  group_by: journey activity
-->
Group stories by user-journey activity. Mark the walking-skeleton subset. Each story gets AC in G/W/T or checklist form (one form per story). Total ≤12 stories.

## §9 Scope: MVP vs Later
<!-- tier: both -->
<!-- purpose: define the cut line — what's in MVP, what's deferred, and what's explicitly out forever -->
<!-- guidance:
  - MVP = minimal set to test the hypothesis stated in §5
  - Each Later item includes a brief deferral rationale
  - Cut line explicitly tied to primary metric (what do we need to move the needle once?)
  - Explicit OUTs called out (never building in this scope)
-->
<!-- tabular_schema:
  columns: [Item, Cut (MVP|Later|Out forever), Rationale]
  row_per: scope item
-->
List scope items in a table. Explain the MVP cut line in terms of §5 metrics. Every Later item needs a deferral rationale. Call out explicit OUTs.

## §10 Risks & Open Questions
<!-- tier: both -->
<!-- purpose: surface the four Cagan risk dimensions and separate open questions with owners -->
<!-- guidance:
  - All 4 Cagan risk dimensions addressed or explicitly deferred: Value (will customers use it?), Usability (can they figure it out?), Feasibility (can we build it?), Viability (should we build it?)
  - Each risk includes: likelihood + impact + mitigation or test
  - Open questions are distinct from risks and have owners + by-when dates
-->
<!-- tabular_schema:
  columns: [Risk, Cagan dim (V|U|F|V), Likelihood, Impact, Mitigation/Test]
  row_per: risk
-->
Address all 4 Cagan risk dimensions (Value, Usability, Feasibility, Viability) with likelihood, impact, and mitigation. List open questions separately with owners and by-when.

## §11 Rollout & Experiment Plan
<!-- tier: full -->
<!-- purpose: describe the phased rollout — ramp, kill criteria, rollback, and experiment link -->
<!-- guidance:
  - Phased ramp (% traffic or cohort stages)
  - Kill criteria are explicit (regression threshold per guardrail metric from §5)
  - Rollback plan named (one-liner: what gets reverted, by whom)
  - Tied to experiment design doc if A/B testing
  - Comms and launch dependencies called out
-->
<!-- tabular_schema:
  columns: [Phase, % traffic, Triggers, Kill criteria, Rollback step]
  row_per: phase
-->
Describe each rollout phase with traffic %, triggers to advance, kill criteria tied to §5 guardrails, and a named rollback step.

## §12 Dependencies & Stakeholders
<!-- tier: full -->
<!-- purpose: surface who and what this depends on, with owners and dates -->
<!-- guidance:
  - Dependency team owners named + by-when date
  - Stakeholders listed by role (decision-maker, reviewer, informed)
-->
<!-- tabular_schema:
  columns: [Item, Type (dep|stakeholder), Owner team, By-when]
  row_per: dep/stakeholder
-->
List all dependencies (teams, APIs, data, external) and stakeholders with their role and any by-when commitments.

## §13 FAQ
<!-- tier: full -->
<!-- purpose: preempt anticipated objections and hard questions from reviewers and execs -->
<!-- guidance:
  - ≥3 anticipated questions
  - ≥1 hostile-skeptic question (the hardest pushback a skeptical executive would raise)
-->
<!-- tabular_schema:
  columns: [Question, Answer, Hostile?]
  row_per: Q&A
-->
Write ≥3 Q&As. Include at least one hostile-skeptic question (the sharpest pushback this PRD is likely to face) marked in the Hostile? column.

## §14 Appendix
<!-- tier: full -->
<!-- purpose: supporting links, raw data, and evidence sources — no new prose -->
<!-- guidance:
  - Pure links/data, no new prose
  - Sources for all evidence cited in §2 and §5
  - Wireframe/prototype links if not already in §6
-->
List source links and supporting data only. No new arguments or prose — those belong in the sections above.
