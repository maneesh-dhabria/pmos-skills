---
name: PRD
slug: prd
description: Product Requirements Document — problem, customers, metrics, scope, risks
tiers: [lite, full]
default_preset: narrative
user_facing: true
personas: [eng-lead, design, gtm, exec]
length_target: "~1900 words"
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

## §2 Problem, Customer & Framing
<!-- tier: both -->
<!-- purpose: make the problem concrete with evidence and a specific customer segment, then FRAME it before any solution work — reframe the problem as opportunity (How Might We) and pressure-test that it is the right problem (What are you really trying to do?) -->
<!-- guidance:
  - Specific segment named with JTBD (job-to-be-done)
  - ≥1 evidence cited (quote, ticket reference, data point, or research session ref)
  - Frequency or impact quantified (how often, how many)
  - Current customer workaround or coping behavior described
  - No solution language ("we will build X") smuggled into the problem
-->
Describe the specific customer segment, their job-to-be-done, the evidence for the problem, and what they do today as a workaround.

**How Might We**
<!-- tier: both -->
<!-- guidance:
  - Reframe the problem above as 1–3 "How might we…" questions that open a solution space WITHOUT naming a
    solution — an HMW turns a stated problem into an opportunity for options. (This is /shape's FRAME discipline
    carried into the PRD; if you already ran /shape, paste its HMW here rather than re-deriving it.)
  - Rule: a well-formed HMW names the outcome/change for the §2 segment, never a feature or mechanism.
    Good: "How might we get a tier-1 agent to an accurate first response faster?" Bad (smuggles a solution):
    "How might we add an AI draft button?" — that is an answer, not a reframe.
  - Lite/brief mode: a single "How might we…" line is acceptable; the sub-head must still be present.
-->
Write 1–3 "How might we…" reframes of the problem above that open the solution space without naming a solution.

**What are you really trying to do?**
<!-- tier: both -->
<!-- guidance:
  - A one-paragraph assumed-solution gut-check (the WAYRTTD inversion carried into the PRD; /wayrttd runs this
    ladder live upstream — reference it, do not restate the full ladder here). Three compact steps, then a verdict:
    (1) name the solution you are implicitly assuming; (2) climb one level — what real goal is that solution in
    service of; (3) re-test — does the assumed solution still look like the best route to that goal, or does the
    climb surface a cheaper/broader option?
  - Rule: the note must actually climb. A gut-check that just restates the assumed solution as the goal
    ("we are trying to ship the draft feature") misses the point and fails.
  - End with a one-word verdict: proceed / reconsider / pivot.
  - Lite/brief mode: two sentences — the assumed solution + the climbed goal + the verdict — is acceptable.
-->
Name the solution you are assuming, climb to the real goal it serves, re-test whether it is still the best route, and record a proceed / reconsider / pivot verdict.

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
<!-- purpose: define how we'll know it worked — question-first, organized under Shreyas Doshi's six product-metric categories, preserving per-metric rigor and Doshi's Key/Leading refinement -->
<!-- guidance:
  - Organize metrics under exactly Doshi's SIX categories — do NOT invent categories:
      1. Health       — is the product available and performing as users reasonably expect? (latency, uptime, error/data-loss rate)
      2. Usage        — how are users using the product? (top actions, funnels, time-of-day)
      3. Adoption     — is it being used as much as we'd hope, in the ways we'd like? (active users, N-of-M-day, feature adoption, conversion)
      4. Satisfaction — what is customers' overall sentiment? (CSAT, feature CSAT, support CSAT)
      5. Ecosystem    — macro state of the product in its domain? (share of wallet, integrations, market/segment rank)
      6. Outcome      — what business results is the product driving? (revenue, margin, segment coverage)
  - Question-first: for each APPLICABLE category, write 2–3 key questions about the user behaviours/outcomes
    that would show the feature is succeeding (behaviour/outcome — NOT "did we ship it"), THEN name a proxy
    metric that answers each question.
  - Each proxy metric carries the full spec: baseline + target + timebox + mechanism (falsifiable direction),
    numerator + denominator for any ratio, owner + instrumentation status.
  - Skipped category → one line: "N/A — <why>" (e.g. "Ecosystem: N/A — internal-only feature, no market surface").
    An N/A is a decision, not an omission.
  - Designate 3–5 Key Metrics (KMs — primary, often lagging) and 3–5 Leading Metrics (LMs — move first).
  - ≥1 guardrail/counter metric with a regression threshold.
  - In Lite/brief mode this section collapses to: KMs + LMs + ≥1 guardrail; categories optional. In Lite mode
    it also absorbs the Goals bound — render as a single combined "Goals + Metrics" section.
-->
<!-- tabular_schema:
  columns: [Category (Health|Usage|Adoption|Satisfaction|Ecosystem|Outcome), Answers question, Metric, Layer (KM|LM|guardrail|counter), Baseline, Target, Timebox, Mechanism, Owner, Instrumentation]
  row_per: metric
  group_by: Doshi category
-->
Under each applicable Doshi category (Health, Usage, Adoption, Satisfaction, Ecosystem, Outcome) write 2–3 behaviour/outcome success questions, then the proxy metric that answers each (baseline, target, timebox, mechanism, owner, instrumentation). Mark skipped categories N/A with a reason. Designate 3–5 KMs and 3–5 LMs, and ≥1 guardrail with a regression threshold.

## §6 Solution Overview
<!-- tier: both -->
<!-- purpose: describe the customer-facing solution at the right level of abstraction — no schema or API detail — anchored by a falsifiable hypothesis and the alternatives considered -->
<!-- guidance:
  - Falsifiable hypothesis in the section lead: "If we build X, metric Y moves, because mechanism Z" — tied to
    the §5 primary metric. A description of what will be built is NOT a hypothesis; a hypothesis can be proven wrong.
  - Alternatives considered: 2–3 alternatives INCLUDING the cheapest do-nothing / buy / manual option, each with
    the disqualifying reason it was rejected. (Tabular preset: an "Alternatives considered" mini-table; narrative
    preset: prose.)
  - Customer narrative present (how the experience changes for the segment named in §2)
  - Happy path + ≥1 alternative flow described
  - Wireframe or prototype linked, or explicitly noted as TBD
  - No schema/API creep (implementation detail belongs in a spec or eng-design doc)
  - New capabilities vs reused components called out
-->
<!-- tabular_schema:
  columns: [Alternative, Why rejected]
  row_per: alternative
  optional: true
-->
Open with a falsifiable if/then/because hypothesis tied to the §5 primary metric. List 2–3 alternatives considered (incl. do-nothing/buy) each with a rejection reason. Then describe the solution from the customer's perspective: what changes, the happy path, at least one alternative flow, and a wireframe link or TBD placeholder.

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

## §8 Motivation, Friction & Satisfaction
<!-- tier: both -->
<!-- purpose: ground the PRD in end-user psychology — why the §2 segment would act, what stops them, and whether a successful use pays off emotionally as well as functionally -->
<!-- guidance:
  - Render as PROSE under three bold sub-heads — **Motivation**, **Friction**, **Satisfaction** — NOT a 24-row
    Q&A table. Write an argument about the named §2 segment, not answers-to-questions.
  - The 24 considerations below (from _shared/msf-heuristics.md — the canonical home; inlined here for the author's
    convenience, do not fork them) are a COVERAGE CHECKLIST: each should be substantively addressed within the
    prose, never listed as a visible row.
  - Motivation (7): the job the user is doing; how important the job is; how urgent it is; what else competes for
    their attention; the benefits of acting; the consequences of not acting; what the alternatives are and how good.
  - Friction (11): will they understand it; when must they decide to act; how complex the decision is; the cost of a
    wrong decision; whether they know their next action; how hard it is to initiate; how hard they'll think it is to
    complete; what else is going on for them; what they stand to lose (loss aversion); how inconsistent it is with
    their habits/expectations; how much thought is needed before acting.
  - Satisfaction (6): did it fulfil the promised job; did it meet expectations; did it generate "happy hormones";
    did it feel reassuring; did it raise prestige/self-esteem/security; did it make them feel smart.
  - Lite/brief mode: a compact MSF read (a few sentences per sub-head) is acceptable — the eval relaxes count
    expectations at lite, but the three sub-heads must still be present.
-->
Write prose under three bold sub-heads — Motivation, Friction, Satisfaction — for the §2 segment. Cover the job's importance/urgency and the quality of alternatives (Motivation); comprehension, effort to initiate/complete, and loss aversion or habit-mismatch (Friction); and the emotional/functional payoff of a successful use (Satisfaction). Not a 24-row table.

## §9 User Stories & Acceptance Criteria
<!-- tier: full -->
<!-- purpose: capture the story spine for the backlog — grouped by journey activity, walking-skeleton marked, every story carrying a concrete testable validation -->
<!-- guidance:
  - Grouped by user-journey activity (NOT by priority — priority-grouped lists are "context-free mulch")
  - ≤12 stories total; 3–7 stories per group
  - Role is a named segment from §2 — no "As a system" or bare "As a user"
  - `so that` traces to a goal in §4 (Adzic impact-laddering)
  - Per-story: Connextra (As a [role], I want [capability], so that [benefit]) OR job story (When [situation], I want to [motivation], so I can [outcome]) — prefer job story for situational features
  - MANDATED per-story validation: every story MUST carry ≥1 acceptance criterion written as a validation test —
    something a person or a test could actually execute and get a pass/fail from (Given/When/Then, or a checklist
    item with an observable pass condition). A restatement of the capability is NOT a validation criterion.
  - AC per story: Given/When/Then OR checklist — pick one form per story, not both
  - AC describes observable outcome, not implementation steps
  - Walking-skeleton subset marked (minimum top-row stories for end-to-end value)
  - Each story ≤3 lines + AC
  - No solution-prescriptive stories ("I want a dropdown for X")
  - Stories don't duplicate the Solution Overview prose
-->
<!-- tabular_schema:
  columns: [Story, AC form (G/W/T or checklist), Validation / how we'll test it, Walking-skeleton?, Mapped goal §4]
  row_per: story
  group_by: journey activity
-->
Group stories by user-journey activity. Mark the walking-skeleton subset. Each story gets AC in G/W/T or checklist form (one form per story) AND a concrete, executable validation criterion (not a capability restatement). Total ≤12 stories.

## §10 Scope: MVP vs Later
<!-- tier: both -->
<!-- purpose: define the cut line — what's in MVP, what's deferred, and what's explicitly out forever -->
<!-- guidance:
  - MVP = minimal set to test the hypothesis stated in §5/§6
  - Each Later item includes a brief deferral rationale
  - Cut line explicitly tied to primary metric (what do we need to move the needle once?)
  - Explicit OUTs called out (never building in this scope)
-->
<!-- tabular_schema:
  columns: [Item, Cut (MVP|Later|Out forever), Rationale]
  row_per: scope item
-->
List scope items in a table. Explain the MVP cut line in terms of §5 metrics. Every Later item needs a deferral rationale. Call out explicit OUTs.

## §11 Risks & Open Questions
<!-- tier: both -->
<!-- purpose: surface the four Cagan risk dimensions, run a pre-mortem, and (for AI features) a behaviour/fallback/eval surface; separate open questions with owners -->
<!-- guidance:
  - All 4 Cagan risk dimensions addressed or explicitly deferred: Value (will customers use it?), Usability (can they figure it out?), Feasibility (can we build it?), Viability (should we build it?)
  - Each risk includes: likelihood + impact + mitigation or test
  - PRE-MORTEM (required): frame "it's six weeks after launch and this failed — what happened?" and name ≥3
    failure modes across adoption / technical / market / org, each with a leading indicator (what we'd see early)
    and a mitigation. Do not bury the most likely failure.
  - CONDITIONAL AI-RISK SURFACE: fires ONLY when the feature has an AI/LLM component. When it does, include:
    (a) a behaviour contract — GOOD / BAD / REJECT exemplars; (b) a fallback / kill-switch for low-confidence or
    model-unavailable states; (c) an offline + online eval bar with a ship threshold. For a non-AI feature, mark
    this block "N/A — no AI/LLM component" (N/A, never simply absent).
  - Open questions are distinct from risks and have owners + by-when dates
-->
<!-- tabular_schema:
  columns: [Risk, Cagan dim (V|U|F|V), Likelihood, Impact, Mitigation/Test]
  row_per: risk
-->
Address all 4 Cagan risk dimensions (Value, Usability, Feasibility, Viability) with likelihood, impact, and mitigation. Run a pre-mortem: name ≥3 failure modes each with a leading indicator. If the feature uses AI/LLM, add a behaviour contract + fallback + eval bar; otherwise mark that block N/A. List open questions separately with owners and by-when.

## §12 Rollout & Experiment Plan
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

## §13 Dependencies & Stakeholders
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

## §14 FAQ
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

## §15 Appendix
<!-- tier: full -->
<!-- purpose: supporting links, raw data, and evidence sources — no new prose -->
<!-- guidance:
  - Pure links/data, no new prose
  - Sources for all evidence cited in §2 and §5
  - Wireframe/prototype links if not already in §6
-->
List source links and supporting data only. No new arguments or prose — those belong in the sections above.
