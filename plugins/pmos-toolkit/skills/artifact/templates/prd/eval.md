# PRD — Eval Criteria

Per-section evaluation items for the PRD template. Two consumers:
- **Gap Interview (Phase 2 `#create`, step 6):** filters `kind: precondition`; queues `gap_question` for items whose evidence is absent from auto-read files.
- **Phase 3 Refinement Loop:** reviewer subagent checks ALL items (both kinds) against the generated draft.

---

## §1 TL;DR

- id: customer-named
  kind: judgment
  tier: [lite, full]
  check: customer or segment is named (not generic "users")
  severity: high

- id: change-concrete
  kind: judgment
  tier: [lite, full]
  check: the change or capability being shipped is stated concretely
  severity: high

- id: outcome-stated
  kind: judgment
  tier: [lite, full]
  check: states the expected outcome as movement (not "we will ship X")
  severity: high

- id: tldr-length-cap
  kind: judgment
  tier: [lite, full]
  check: ≤4 sentences total
  severity: low

---

## §2 Problem, Customer & Framing

- id: evidence-cited
  kind: precondition
  tier: [lite, full]
  check: ≥1 evidence cited (quote, ticket reference, data point, or research session ref)
  gap_question: |
    No customer evidence found in attached files. Paste a quote / ticket reference / data point, or describe the source.
  severity: high

- id: segment-and-jtbd
  kind: judgment
  tier: [lite, full]
  check: specific customer segment named with their job-to-be-done
  severity: high

- id: frequency-or-impact-quantified
  kind: judgment
  tier: [lite, full]
  check: frequency or impact quantified (how often this happens, or how many customers affected)
  severity: medium

- id: workaround-described
  kind: judgment
  tier: [lite, full]
  check: current customer workaround or coping behavior described
  severity: medium

- id: no-solution-language
  kind: judgment
  tier: [lite, full]
  check: no "we will build X" solution language smuggled into the problem statement
  severity: medium

- id: hmw-present
  kind: judgment
  tier: [lite, full]
  check: §2 carries a "How Might We" sub-head with ≥1 well-formed "How might we…" reframe that names an outcome/change for the segment, not a feature or mechanism (a solution-shaped HMW fails)
  severity: medium

- id: wayrttd-gutcheck
  kind: judgment
  tier: [lite, full]
  check: §2 carries a "What are you really trying to do?" gut-check that names the assumed solution, climbs to the real goal it serves, and records a proceed/reconsider/pivot verdict (a note that merely restates the assumed solution as the goal fails)
  severity: medium

---

## §3 Why Now

- id: strategy-or-okr-cited
  kind: precondition
  tier: [full]
  check: cites a strategy doc, OKR, or strategic bet that this work addresses
  gap_question: |
    Which OKR, strategic bet, or company initiative does this work serve? Paste the relevant text or a link.
  severity: high

- id: concrete-trigger
  kind: judgment
  tier: [full]
  check: names a concrete trigger or closing window (competitive move, contract expiry, platform change, seasonal event)
  severity: high

- id: opportunity-cost-articulated
  kind: judgment
  tier: [full]
  check: opportunity cost of waiting is articulated (what we lose or miss by deferring)
  severity: medium

---

## §4 Goals & Non-Goals

- id: goals-outcome-shaped
  kind: judgment
  tier: [full]
  check: each goal is outcome-shaped (measurable movement), not a deliverable ("ship X")
  severity: high

- id: goals-count
  kind: judgment
  tier: [full]
  check: 1–3 goals total (not 0, not 4+)
  severity: medium

- id: goals-each-measurable
  kind: judgment
  tier: [full]
  check: each goal is individually measurable (has a number or observable signal)
  severity: high

- id: non-goals-present
  kind: judgment
  tier: [full]
  check: ≥2 non-goals listed
  severity: medium

- id: non-goals-not-strawmen
  kind: judgment
  tier: [full]
  check: non-goals are reasonable (not obvious out-of-scope items no one would expect), each with rationale
  severity: medium

---

## §5 Success Metrics

- id: metrics-doshi-categorized
  kind: judgment
  tier: [lite, full]
  check: |
    metrics are organized under Shreyas Doshi's six categories (Health, Usage, Adoption, Satisfaction, Ecosystem,
    Outcome) — no invented categories; each skipped category carries an explicit "N/A — <why>" rationale.
  severity: high

- id: metrics-question-first
  kind: judgment
  tier: [lite, full]
  check: |
    each populated category leads with 2–3 behaviour/outcome success questions (what would show the feature is
    succeeding) before naming its proxy metrics — not "did we ship it" output questions.
  severity: high

- id: km-lm-designated
  kind: judgment
  tier: [lite, full]
  check: 3–5 Key Metrics (KMs) and 3–5 Leading Metrics (LMs) are explicitly designated
  severity: medium

- id: primary-metric-baseline
  kind: precondition
  tier: [lite, full]
  check: primary metric has a baseline value and a target
  gap_question: |
    What's the current value of your primary metric, and what target are you aiming for? Include a timebox (e.g., "baseline 12%, target 18% within 90 days").
  severity: high

- id: primary-metric-mechanism
  kind: judgment
  tier: [lite, full]
  check: primary metric mechanism is stated (falsifiable direction — explains how the change moves the metric)
  severity: high

- id: ratio-has-numerator-denominator
  kind: judgment
  tier: [lite, full]
  check: any ratio metric explicitly states numerator and denominator
  severity: medium

- id: guardrail-metric-present
  kind: judgment
  tier: [lite, full]
  check: ≥1 guardrail metric with a regression threshold listed
  severity: high

- id: metric-owner-and-instrumentation
  kind: judgment
  tier: [lite, full]
  check: each metric has an owner and an instrumentation status (built / planned / TBD)
  severity: medium

---

## §6 Solution Overview

- id: falsifiable-hypothesis-present
  kind: judgment
  tier: [lite, full]
  check: |
    an explicit if/then/because hypothesis is present ("if we build X, metric Y moves, because mechanism Z"), tied
    to the §5 primary metric — a description of what will be built is not a hypothesis.
  severity: high

- id: alternatives-considered
  kind: judgment
  tier: [lite, full]
  check: |
    ≥2 alternatives considered, including a do-nothing / buy / manual option, each with the reason it was rejected.
  severity: high

- id: customer-narrative-present
  kind: judgment
  tier: [lite, full]
  check: customer narrative present — describes how the experience changes for the named segment
  severity: high

- id: happy-and-alt-flow
  kind: judgment
  tier: [lite, full]
  check: happy path described + ≥1 alternative flow
  severity: medium

- id: wireframe-linked-or-tbd
  kind: judgment
  tier: [lite, full]
  check: wireframe or prototype is linked, or explicitly noted as TBD
  severity: low

- id: no-schema-api-creep
  kind: judgment
  tier: [lite, full]
  check: no schema or API implementation detail present (that belongs in a spec or eng-design doc)
  severity: medium

- id: new-vs-reused-called-out
  kind: judgment
  tier: [lite, full]
  check: new capabilities vs reused components are called out
  severity: low

---

## §7 User Journey / Narrative

- id: specific-persona
  kind: judgment
  tier: [lite, full]
  check: journey uses a specific named persona (from the segment in §2), not generic "the user"
  severity: medium

- id: numbered-steps-entry-to-outcome
  kind: judgment
  tier: [lite, full]
  check: journey has numbered steps from entry through action to outcome
  severity: medium

- id: mental-state-at-key-steps
  kind: judgment
  tier: [lite, full]
  check: mental state or emotional context noted at key decision points
  severity: medium

- id: alt-path-present
  kind: judgment
  tier: [lite, full]
  check: ≥1 alternative path described (error, edge case, or different entry point)
  severity: medium

- id: journey-ends-at-jtbd-outcome
  kind: judgment
  tier: [lite, full]
  check: journey ends at the JTBD outcome (not just at "task complete" or "user clicks save")
  severity: high

---

## §8 Motivation, Friction & Satisfaction

- id: motivation-addressed
  kind: judgment
  tier: [lite, full]
  check: |
    the job the user is doing, its importance/urgency, and the quality of the alternatives are each addressed in
    prose (Motivation sub-head).
  severity: high

- id: friction-addressed
  kind: judgment
  tier: [lite, full]
  check: |
    comprehension, effort to initiate/complete, and at least one of loss-aversion / habit-mismatch are addressed
    (Friction sub-head).
  severity: high

- id: satisfaction-addressed
  kind: judgment
  tier: [lite, full]
  check: the emotional/functional payoff of a successful use is named — not just "task complete" (Satisfaction sub-head)
  severity: medium

- id: msf-narrative-not-table
  kind: judgment
  tier: [lite, full]
  check: §8 is rendered as prose under the three sub-heads (Motivation / Friction / Satisfaction), not a 24-row Q&A dump
  severity: low

- id: msf-grounded-in-segment
  kind: judgment
  tier: [lite, full]
  check: the MSF read is about the specific §2 named segment, not a generic user
  severity: medium

---

## §9 User Stories & Acceptance Criteria

- id: every-story-has-testable-ac
  kind: judgment
  tier: [full]
  check: |
    every story carries ≥1 concrete, executable validation criterion (Given/When/Then or a checklist item with an
    observable pass/fail) — a story with only a capability restatement fails.
  severity: high

- id: stories-grouped-by-journey-activity
  kind: judgment
  tier: [full]
  check: stories grouped by user-journey activity (not by priority tiers like must/should/could)
  severity: high

- id: stories-total-cap
  kind: judgment
  tier: [full]
  check: ≤12 stories total
  severity: medium

- id: role-is-named-segment
  kind: judgment
  tier: [full]
  check: story role is a named segment from §2 — no "As a system" or bare "As a user"
  severity: high

- id: so-that-traces-to-goal
  kind: judgment
  tier: [full]
  check: each story's `so that` benefit traces to a specific goal in §4
  severity: high

- id: ac-one-form-per-story
  kind: judgment
  tier: [full]
  check: each story uses either G/W/T or checklist AC — not both forms in the same story
  severity: medium

- id: ac-observable-outcome
  kind: judgment
  tier: [full]
  check: AC describes an observable outcome, not implementation steps
  severity: high

- id: walking-skeleton-marked
  kind: judgment
  tier: [full]
  check: walking-skeleton subset is explicitly marked (minimum stories for end-to-end value)
  severity: medium

- id: no-solution-prescriptive-stories
  kind: judgment
  tier: [full]
  check: no solution-prescriptive stories (e.g., "I want a dropdown for X" — that's a design decision, not a need)
  severity: medium

- id: job-story-preferred
  kind: judgment
  tier: [full]
  check: |
    For situational or transactional features (where context shifts the user's goal), prefer job-story format over Connextra.
  severity: low

- id: stories-dont-duplicate-solution-overview
  kind: judgment
  tier: [full]
  check: |
    Stories describe user-observable behavior at story granularity; they do NOT restate the prose narrative from §6 Solution Overview.
  severity: medium

---

## §10 Scope: MVP vs Later

- id: mvp-minimal
  kind: judgment
  tier: [lite, full]
  check: MVP is the minimal set needed to test the hypothesis (not a full feature launch)
  severity: high

- id: later-items-have-rationale
  kind: judgment
  tier: [lite, full]
  check: each Later item includes a brief deferral rationale (why it's not in MVP)
  severity: medium

- id: cut-line-tied-to-metrics
  kind: judgment
  tier: [lite, full]
  check: MVP cut line is explicitly tied to the primary metric (what's needed to move the needle once?)
  severity: medium

- id: explicit-outs-called-out
  kind: judgment
  tier: [lite, full]
  check: explicit OUTs are listed (items never in scope for this work)
  severity: medium

---

## §11 Risks & Open Questions

- id: cagan-4-dimensions-addressed
  kind: judgment
  tier: [lite, full]
  check: all 4 Cagan risk dimensions addressed or explicitly deferred: Value, Usability, Feasibility, Viability
  severity: high

- id: premortem-present
  kind: judgment
  tier: [lite, full]
  check: |
    a pre-mortem names ≥3 failure modes (across adoption / technical / market / org), each with a leading indicator
    of that failure.
  severity: high

- id: ai-risk-surface-when-applicable
  kind: judgment
  tier: [lite, full]
  check: |
    CONDITIONAL — if the PRD proposes an AI/LLM feature, a behaviour contract (GOOD/BAD/REJECT exemplars) + a
    fallback/kill-switch + an eval bar with a ship threshold are present. For a non-AI PRD this item is N/A — mark
    it N/A, never ABSENT, and do not raise a gap.
  severity: high

- id: risk-has-likelihood-impact-mitigation
  kind: judgment
  tier: [lite, full]
  check: each risk includes likelihood, impact, and a mitigation or test
  severity: medium

- id: open-questions-distinct-from-risks
  kind: judgment
  tier: [lite, full]
  check: open questions are listed separately from risks (they are distinct types of unknowns)
  severity: low

- id: open-question-owners
  kind: judgment
  tier: [lite, full]
  check: each open question has an owner and a by-when date
  severity: medium

---

## §12 Rollout & Experiment Plan

- id: phased-ramp
  kind: judgment
  tier: [full]
  check: phased ramp described (% traffic or cohort stages with triggers to advance)
  severity: high

- id: kill-criteria-explicit
  kind: judgment
  tier: [full]
  check: kill criteria are explicit, tied to guardrail regression thresholds from §5
  severity: high

- id: rollback-plan-named
  kind: judgment
  tier: [full]
  check: rollback plan named (what gets reverted, by whom, triggered how)
  severity: high

- id: experiment-doc-linked-if-ab
  kind: judgment
  tier: [full]
  check: if A/B testing, experiment design doc is linked (or noted as TBD with owner)
  severity: medium

- id: rollout-owner-and-deps
  kind: precondition
  tier: [full]
  check: rollout owner and any comms/launch dependencies identified
  gap_question: |
    Who owns the rollout? Are there comms, launch, or infra dependencies that need to be coordinated?
  severity: medium

---

## §13 Dependencies & Stakeholders

- id: dep-owners-and-dates
  kind: precondition
  tier: [full]
  check: each dependency has an owning team and a by-when date
  gap_question: |
    List the key dependencies. For each, who owns it and what's the latest date it must be ready?
  severity: high

- id: stakeholders-by-role
  kind: precondition
  tier: [full]
  check: stakeholders listed by role (decision-maker, reviewer, informed)
  gap_question: |
    Who are the key stakeholders? List them by role: decision-maker, reviewer, or informed party.
  severity: medium

---

## §14 FAQ

- id: min-three-questions
  kind: judgment
  tier: [full]
  check: ≥3 anticipated questions answered
  severity: medium

- id: hostile-skeptic-question-present
  kind: judgment
  tier: [full]
  check: ≥1 hostile-skeptic question included (the sharpest pushback a skeptical exec or peer would raise)
  severity: high

---

## §15 Appendix

- id: no-new-prose
  kind: judgment
  tier: [full]
  check: appendix contains only links, data, and references — no new arguments or prose
  severity: medium

- id: evidence-sources-linked
  kind: judgment
  tier: [full]
  check: sources for all evidence cited in §2 and §5 are linked or referenced
  severity: medium
