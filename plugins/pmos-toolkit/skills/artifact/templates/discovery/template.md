---
name: Discovery Doc
slug: discovery
description: Decision-first discovery — what we're deciding, evidence gap, assumption tests
tiers: [single]
default_preset: narrative
personas: [pm, design, user-researcher]
length_target: "~1200 words"
files_to_read:
  - label: workstream
    source: product-context
  - label: prior research
    pattern: "{feature_folder}/research/*"
  - label: support tickets / data
    pattern: "{feature_folder}/data/*"
  - label: attached files
    source: user-args
---

# {Feature Name} — Discovery Doc

## §1 Decision
<!-- tier: single -->
<!-- purpose: name the concrete decision being made, the evidence needed to make it, what we already hold, and the explicit gap -->
<!-- guidance:
  - Decision is concrete: ship/don't ship, build/buy, persona-A vs persona-B — NOT "understand users better"
  - Evidence needed is specific: names numbers, behaviors, or quotes required to decide
  - Evidence held cites actual sources (research sessions, tickets, data pulls, quotes)
  - Gap is explicit: what evidence-needed minus evidence-held equals
  - Owner named + by-when date stated
-->
<!-- tabular_schema:
  columns: [Field (Decision|Evidence needed|Evidence held|Gap|Owner|By-when), Value]
  row_per: field
-->
State the decision as a concrete binary or choice (e.g., "ship / don't ship Feature X to segment Y by Q3"). List evidence needed to decide, evidence already in hand with sources, the explicit gap, the decision owner, and by-when.

## §2 Opportunity / Job Story
<!-- tier: single -->
<!-- purpose: frame the customer opportunity as a job story — anchored in a real situation, motivation, and outcome -->
<!-- guidance:
  - Canonical job-story format: "When [situation], I want to [motivation], so I can [outcome]"
  - Situation is specific (not generic "when using the product")
  - Outcome is the user's end-state (not a feature or deliverable)
  - Customer segment named (not generic "users")
  - ≥1 evidence cited (quote, ticket, data point, or research session ref) that supports this opportunity
-->
Write the job story in canonical format: "When [specific situation], I want to [motivation], so I can [user end-state outcome]." Name the customer segment. Cite ≥1 evidence source that anchors this opportunity.

## §3 Research Questions
<!-- tier: single -->
<!-- purpose: enumerate 3–7 open-ended questions that, if answered, close the evidence gap in §1 -->
<!-- guidance:
  - 3–7 questions total
  - Each question is open-ended (not answerable yes/no)
  - Each question traces to the evidence gap stated in §1 — no orphan questions
  - Mix of question types: behavior (what do they do?), motivation (why?), context (in what situation?)
  - Questions answer "what we don't know" — not "what we want them to confirm"
-->
<!-- tabular_schema:
  columns: [Question, Tied to gap (yes/which gap), Type (behavior|motivation|context)]
  row_per: question
-->
List 3–7 open-ended research questions. For each, note which evidence gap it addresses and classify it as behavior, motivation, or context. Questions must be open-ended and expose genuine unknowns.

## §4 Assumptions Map
<!-- tier: single -->
<!-- purpose: surface every assumption behind the opportunity and rank by risk so the team tests the riskiest first -->
<!-- guidance:
  - All 4 Cagan risk dimensions represented: Value (V), Usability (U), Feasibility (F), Viability (V)
  - Each assumption phrased as a falsifiable belief: "We believe X" — not a question
  - Importance rated (High / Medium / Low)
  - Evidence rated (Strong / Weak / None)
  - Top 3 riskiest assumptions explicitly called out (high importance × low/no evidence)
-->
<!-- tabular_schema:
  columns: [Assumption, Cagan dim (V|U|F|V), Importance, Evidence, Top-3?]
  row_per: assumption
-->
List all assumptions behind this opportunity. Tag each with its Cagan dimension (Value / Usability / Feasibility / Viability), importance, and current evidence level. Call out the top 3 riskiest (high importance, low evidence). Phrase each as "We believe X."

## §5 Assumption Tests
<!-- tier: single -->
<!-- purpose: define the smallest viable test for each top-3 riskiest assumption; record results post-test -->
<!-- guidance:
  Pre-test fields (fill before running):
  - Hypothesis: assumption restated as a falsifiable statement ("If we show X to Y, we expect Z")
  - Method: matches assumption type — fake door or landing page for demand (Value), usability test for Usability, spike/prototype for Feasibility, business-model check for Viability
  - Metric: single measurable signal (click rate, task-completion %, cost estimate)
  - Success criterion: pre-registered threshold (e.g., "≥30% click-through on fake door")
  - Smallest viable test: confirm this is the cheapest test that can falsify the assumption
  - Owner: who runs the test
  - By-when: date
  Post-test fields (fill after running):
  - Observation: raw data — what happened (not interpretation)
  - Insight: what changed in our mental model
  - Next decision: concrete action this observation unlocks or changes
-->
<!-- tabular_schema:
  columns: [Assumption, Method, Metric, Success criterion, Owner, By-when, Observation, Insight, Next decision]
  row_per: test
-->
For each of the top-3 riskiest assumptions from §4, write a pre-registered test: hypothesis (falsifiable), method (matched to assumption type), metric, success criterion, and owner + by-when. Leave post-test fields (Observation, Insight, Next decision) blank — they are filled after the test runs.

## §6 Research Cadence & Methods
<!-- tier: single -->
<!-- purpose: define how discovery will run continuously — cadence, recruitment, method library, and synthesis ritual -->
<!-- guidance:
  - Cadence stated (e.g., "weekly 30-min interviews," "bi-weekly synthesis sessions," "ad-hoc when triggered by support spike")
  - Recruitment channel named (how participants are sourced — panel, in-app prompt, CSM referral, etc.)
  - Method library: when to use which method — at minimum distinguish "what/how" methods (observation, diary, usability) from "why" methods (depth interview, JTBD interview per Indi Young when motivation matters)
  - Synthesis ritual named: where insights land and how the team reviews them (Dovetail, shared doc, weekly readout, etc.)
-->
Describe the discovery cadence (frequency, session format), recruitment channel, a brief method library (which method for which question type), and the synthesis ritual (where findings go, how they're reviewed).

## §7 Decision Update & Next Steps
<!-- tier: single -->
<!-- purpose: close the loop — restate §1's decision with current status, and define what happens next -->
<!-- guidance:
  - Restates the §1 decision verbatim (no paraphrase) + current status: Open | Decided | Reframed
  - If Decided: state the decision made + handoff criteria to PRD (what must be true before PRD begins) + what evidence changed the picture
  - If Open: name the next assumption test or research action + by-when
  - If Reframed: archive the original decision (quote it), name the new decision, explain what triggered the reframe
-->
Restate the §1 decision and its current status (Open / Decided / Reframed). If Decided: record the decision, handoff criteria to PRD, and what changed. If Open: name the next test + by-when. If Reframed: archive the original, name the new decision, explain the trigger.
