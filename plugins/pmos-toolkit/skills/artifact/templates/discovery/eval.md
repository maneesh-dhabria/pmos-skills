# Discovery Doc — Eval Criteria

Per-section evaluation items for the Discovery Doc template. Single tier — all items apply.
Two consumers:
- **Gap Interview (Phase 2 `#create`, step 6):** filters `kind: precondition`; queues `gap_question` for items whose evidence is absent from auto-read files.
- **Phase 3 Refinement Loop:** reviewer subagent checks ALL items (both kinds) against the generated draft.

---

## §1 Decision

- id: decision-concrete
  kind: precondition
  tier: [single]
  check: decision is concrete — names a specific binary or choice (ship/don't, build/buy, persona-A vs B) rather than an intent like "understand users better"
  gap_question: |
    What concrete decision are you trying to make? e.g., ship/don't, build/buy, persona-A vs B.
  severity: high

- id: owner-and-by-when
  kind: precondition
  tier: [single]
  check: decision owner is named and a by-when date is stated
  gap_question: |
    Who owns this decision and what's the by-when?
  severity: high

- id: evidence-needed-specific
  kind: judgment
  tier: [single]
  check: evidence needed is specific — names numbers, behaviors, or quotes required to decide (not vague "more data")
  severity: high

- id: evidence-held-cites-sources
  kind: judgment
  tier: [single]
  check: evidence held cites actual sources (research sessions, tickets, data pulls, quotes) — not generic "we know from experience"
  severity: medium

- id: gap-explicit
  kind: judgment
  tier: [single]
  check: evidence gap is explicit — states what is needed but not yet held (not implicit or repeated from evidence-needed)
  severity: high

---

## §2 Opportunity / Job Story

- id: evidence-cited
  kind: precondition
  tier: [single]
  check: ≥1 evidence cited (quote, ticket reference, data point, or research session ref) that supports the opportunity
  gap_question: |
    Paste a customer quote, ticket reference, or data point that supports this opportunity.
  severity: high

- id: job-story-format
  kind: judgment
  tier: [single]
  check: canonical job-story format used — "When [situation], I want to [motivation], so I can [outcome]"
  severity: high

- id: situation-specific
  kind: judgment
  tier: [single]
  check: situation is specific — describes a real triggering context, not a generic "when using the product"
  severity: medium

- id: outcome-is-user-end-state
  kind: judgment
  tier: [single]
  check: outcome is the user's end-state (what they can do or be), not a feature or deliverable ("so I can get the report" not "so I can use the export button")
  severity: high

- id: segment-named
  kind: judgment
  tier: [single]
  check: customer segment is named — not generic "users"
  severity: medium

---

## §3 Research Questions

- id: question-count
  kind: judgment
  tier: [single]
  check: 3–7 research questions total (not 0–2, not 8+)
  severity: medium

- id: questions-open-ended
  kind: judgment
  tier: [single]
  check: all questions are open-ended — none is answerable with a simple yes/no
  severity: high

- id: questions-tied-to-gap
  kind: judgment
  tier: [single]
  check: every question traces to the evidence gap stated in §1 — no orphan questions unrelated to the gap
  severity: high

- id: question-type-mix
  kind: judgment
  tier: [single]
  check: question set mixes types — at least one behavior question, one motivation question, one context question
  severity: medium

- id: questions-expose-unknowns
  kind: judgment
  tier: [single]
  check: questions answer "what we don't know" — not leading questions that invite confirmation ("do you agree that X is frustrating?")
  severity: medium

---

## §4 Assumptions Map

- id: all-four-cagan-dims
  kind: judgment
  tier: [single]
  check: all 4 Cagan risk dimensions represented — Value, Usability, Feasibility, Viability (at least one assumption per dim)
  severity: high

- id: assumptions-falsifiable
  kind: judgment
  tier: [single]
  check: each assumption is phrased as a falsifiable belief starting with "We believe X" — not a question or an undisputed fact
  severity: high

- id: importance-and-evidence-rated
  kind: judgment
  tier: [single]
  check: each assumption has an importance rating (High / Medium / Low) and an evidence level (Strong / Weak / None)
  severity: medium

- id: top-three-riskiest-called-out
  kind: judgment
  tier: [single]
  check: top 3 riskiest assumptions are explicitly called out — high importance × low or no evidence
  severity: high

---

## §5 Assumption Tests

- id: success-criterion-pre-registered
  kind: judgment
  tier: [single]
  check: success criterion is pre-registered — a specific threshold stated before the test runs (e.g., "≥30% click-through"), not "we'll know it when we see it"
  severity: high

- id: hypothesis-falsifiable
  kind: judgment
  tier: [single]
  check: hypothesis is the assumption restated as a falsifiable statement ("If we show X to Y, we expect Z"), not a question or a wish
  severity: medium

- id: method-matches-assumption-type
  kind: judgment
  tier: [single]
  check: method matches the assumption type — fake door / landing page for demand (Value), usability test for Usability, spike / prototype for Feasibility, business-model check for Viability
  severity: medium

- id: metric-explicit
  kind: judgment
  tier: [single]
  check: metric is a single measurable signal — not a vague "we'll look at engagement" placeholder
  severity: medium

- id: smallest-viable-test
  kind: judgment
  tier: [single]
  check: test is the smallest viable test that could falsify the assumption — no over-engineered prototype when a landing page would do
  severity: medium

- id: test-owner-and-by-when
  kind: judgment
  tier: [single]
  check: each test has a named owner and a by-when date
  severity: medium

- id: post-test-structure-exists
  kind: judgment
  tier: [single]
  check: post-test fields (Observation, Insight, Next decision) are structurally present in the document — may be blank pre-test, but the scaffolding must exist
  severity: low

---

## §6 Research Cadence & Methods

- id: cadence-recruitment-synthesis
  kind: precondition
  tier: [single]
  check: cadence, recruitment channel, and synthesis ritual are all stated
  gap_question: |
    What's your discovery cadence (weekly interviews? ad-hoc?), how do you recruit participants, and how/where do you synthesize findings?
  severity: medium

- id: cadence-stated
  kind: judgment
  tier: [single]
  check: cadence is stated — frequency and format (e.g., "weekly 30-min interviews," "bi-weekly synthesis," "ad-hoc on support spike")
  severity: medium

- id: recruitment-channel-named
  kind: judgment
  tier: [single]
  check: recruitment channel is named — how participants are sourced (panel, in-app prompt, CSM referral, etc.)
  severity: medium

- id: method-library-present
  kind: judgment
  tier: [single]
  check: method library distinguishes at least "what/how" methods (observation, usability) from "why" methods (depth interviews, JTBD)
  severity: medium

- id: synthesis-ritual-named
  kind: judgment
  tier: [single]
  check: synthesis ritual is named — where insights land and how the team reviews them (tool + cadence)
  severity: medium

---

## §7 Decision Update & Next Steps

- id: status-named
  kind: judgment
  tier: [single]
  check: decision status is explicitly named as one of: Open | Decided | Reframed
  severity: high

- id: decision-restated-verbatim
  kind: judgment
  tier: [single]
  check: §1 decision is restated verbatim (not paraphrased) so the update can be compared directly
  severity: medium

- id: decided-handoff-criteria
  kind: judgment
  tier: [single]
  check: if status is Decided — handoff criteria to PRD are stated (what must be true before PRD begins) and what evidence changed the picture
  severity: high

- id: open-next-test-and-by-when
  kind: judgment
  tier: [single]
  check: if status is Open — next assumption test or research action is named with a by-when date
  severity: high

- id: reframed-original-archived
  kind: judgment
  tier: [single]
  check: if status is Reframed — original decision is quoted/archived, the new decision is named, and the reframe trigger is explained
  severity: high
