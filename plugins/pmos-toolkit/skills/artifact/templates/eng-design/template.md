---
name: Engineering Design Doc
slug: eng-design
description: RFC/design doc — proposal, alternatives, cross-cutting concerns, operational readiness
tiers: [lite, full]
default_preset: tabular
personas: [staff-eng, eng-lead, sre]
length_target: "~2000 words"
files_to_read:
  - label: requirements doc
    pattern: "{feature_folder}/01_requirements*.md"
  - label: spec doc
    pattern: "{feature_folder}/02_spec*.md"
  - label: prior RFCs
    pattern: "{feature_folder}/eng-design*.md"
  - label: workstream
    source: product-context
  - label: attached files
    source: user-args
---

# {Feature Name} — Engineering Design Doc

## §1 Header
<!-- tier: both -->
<!-- purpose: establish document identity — who owns it, what state it's in, and when it was last touched -->
<!-- guidance:
  - Title is descriptive (names the system, change, or decision — not generic "Design Doc for X")
  - Authors listed (≥1)
  - Reviewers listed (≥1 named reviewer)
  - Status is one of: Draft | In Review | Approved | Superseded
  - Last-updated date present
-->
Write a header block with a descriptive title, authors, reviewers, status (Draft | In Review | Approved | Superseded), and last-updated date.

## §2 TL;DR
<!-- tier: both -->
<!-- purpose: ≤5-sentence forcing-function that names the problem, chosen approach, and key tradeoff -->
<!-- guidance:
  - States the problem being solved (not just "we are building X")
  - Names the chosen approach
  - Surfaces the key tradeoff or the most important design decision
  - ≤5 sentences total
-->
Write a TL;DR of ≤5 sentences that names the problem, chosen approach, and key tradeoff.

## §3 Context & Background
<!-- tier: both -->
<!-- purpose: orient the reader in the existing system before the proposal is introduced -->
<!-- guidance:
  - Existing system, file path, or service that this design builds on or replaces is named
  - Prior docs or related RFCs linked (or explicitly "none")
  - Objective context only — no proposal language ("we will…") smuggled in
  - Verbose schemas or data models deferred to §6 or §14
-->
Describe the current state of the system this design addresses: name the existing service or component, link prior docs, and provide objective context only.

## §4 Goals & Non-Goals
<!-- tier: both -->
<!-- purpose: bound the work with outcome-shaped goals and explicit non-goals with rationale -->
<!-- guidance:
  - Goals are outcome-shaped (latency, correctness, cost, reliability — not "use Foo" or "ship X")
  - 1–5 goals total
  - ≥2 non-goals listed, reasonable (not strawmen), each with a brief rationale
  - Rationale per non-goal explains why it's explicitly out of scope
-->
<!-- tabular_schema:
  columns: [Item, Type (goal|non-goal), Outcome, Rationale]
  row_per: item
-->
Write 1–5 outcome-shaped goals and ≥2 non-goals, each with a one-line rationale for why it's explicitly out of scope.

## §5 Proposal / High-Level Design
<!-- tier: both -->
<!-- purpose: give the reader enough signal to predict the code shape and evaluate the tradeoffs -->
<!-- guidance:
  - System diagram present (ASCII, linked image, or explicit "TBD — owner: <name>")
  - End-to-end data flow described (where data enters, transforms, and exits)
  - Key interfaces named (APIs, queues, stores, services)
  - Tradeoffs surfaced here (not buried in §7) — e.g., consistency vs latency, simplicity vs extensibility
  - Reader can predict the code shape from this section alone
-->
Describe the proposed design: include a system diagram, end-to-end data flow, key interfaces, and the core tradeoffs. The reader should be able to predict the code shape.

## §6 Detailed Design
<!-- tier: full -->
<!-- purpose: provide the implementation contract — API shapes, data model, algorithms, failure modes -->
<!-- guidance:
  - API contracts: signatures + error shapes for every new or changed interface
  - Data model: schema, field types, constraints, migrations
  - Algorithms or state transitions described where non-trivial
  - Per-component failure modes: what fails, how it's detected, how it degrades
  - Concurrency and race conditions addressed or explicitly marked N/A
-->
Provide the full implementation contract: API signatures + error shapes, data model, non-trivial algorithms or state transitions, per-component failure modes, and concurrency/race handling.

## §7 Alternatives Considered
<!-- tier: both -->
<!-- purpose: demonstrate due diligence and make the tradeoff record permanent -->
<!-- guidance:
  - ≥2 alternatives documented
  - At least one is the "boring option" (do nothing / use an existing solution / off-the-shelf)
  - Tradeoffs are explicit for each option
  - WHY REJECTED is stated for each — not just "we chose X instead"
  - A comparison table or matrix is present
-->
<!-- tabular_schema:
  columns: [Option, Tradeoffs, Why rejected, Boring-option?]
  row_per: alternative
-->
Document ≥2 alternatives. Include at least one boring option (do nothing / use existing / off-the-shelf). State explicit tradeoffs and why each was rejected.

## §8 Cross-Cutting Concerns
<!-- tier: full -->
<!-- purpose: ensure security, privacy, compliance, observability, performance, and cost are not deferred -->
<!-- guidance:
  - Security: threat model or N/A with reason
  - Privacy: PII handling described or N/A with reason
  - Compliance: relevant regulations named or N/A with reason
  - Observability: metrics, logs, traces, and alerts described
  - Performance: perf budget + QPS targets stated
  - Cost: estimate provided
  - N/A entries must include a one-line reason — bare "N/A" is not acceptable
-->
<!-- tabular_schema:
  columns: [Concern (security|privacy|compliance|observability|perf|cost), Status, Detail / Reason for N/A]
  row_per: concern
-->
Address each cross-cutting concern: security threat model, privacy/PII, compliance, observability (metrics+logs+traces+alerts), perf budget + QPS, and cost estimate. N/A entries must include a reason.

## §9 Migration / Rollout
<!-- tier: both -->
<!-- purpose: describe the path from current state to target state without breaking callers -->
<!-- guidance:
  - Phasing described (what ships in each phase)
  - Backfill or dual-write strategy present if data is being migrated
  - Rollback described with explicit trigger (what condition prompts a rollback)
  - Deprecation path described for anything being replaced
  - Compatibility shims removal date named (or "no shims needed")
-->
<!-- tabular_schema:
  columns: [Phase, Action, Trigger, Rollback step, Owner]
  row_per: phase
-->
Describe the rollout in phases: what ships, backfill/dual-write strategy if data migrates, rollback with a named trigger, deprecation path, and shim removal date.

## §10 Testing & Verification
<!-- tier: full -->
<!-- purpose: establish how we'll know the system works correctly and safely before and after launch -->
<!-- guidance:
  - Unit / integration / load test split described
  - How we know it works in production: synthetic monitoring, shadow traffic, or canary strategy
  - Failure-injection plan: how failure modes from §6 will be tested
-->
Describe the unit/integration/load split, the production verification strategy (synthetic/shadow/canary), and the failure-injection plan aligned to §6 failure modes.

## §11 Operational Readiness
<!-- tier: full -->
<!-- purpose: confirm the service can be operated safely before it goes to production -->
<!-- guidance:
  - On-call ownership: team or individual named
  - Dashboards listed (links or "TBD — owner: <name>")
  - Alerts: at least one pages-on-fire alert named
  - Runbook stub: link or "TBD — owner: <name> by <date>"
  - SLOs quantified: availability %, latency p50/p99 — not "we'll define later"
-->
<!-- tabular_schema:
  columns: [Capability (on-call|dashboard|alert|runbook|SLO), Status, Owner, Detail]
  row_per: capability
-->
Confirm operational readiness: on-call owner, dashboards, alerting, runbook stub, and quantified SLOs (availability and latency p50/p99).

## §12 Risks & Open Questions
<!-- tier: both -->
<!-- purpose: surface known unknowns and rewrite-forcing risks before they surprise the team -->
<!-- guidance:
  - Each risk: likelihood + impact + mitigation
  - Open questions are distinct from risks (listed separately)
  - Each open question has an owner and a by-when date
  - Rewrite-forcing risks called out explicitly (risks that would require scrapping the design)
-->
<!-- tabular_schema:
  columns: [Item, Type (risk|question), Likelihood/Severity, Impact, Mitigation / Owner+by-when]
  row_per: item
-->
List risks (each with likelihood, impact, mitigation) and open questions (each distinct from risks, with an owner and by-when). Call out any rewrite-forcing risks.

## §13 Timeline & Milestones
<!-- tier: full -->
<!-- purpose: communicate the delivery plan in a way that surfaces cross-team dependencies and confidence -->
<!-- guidance:
  - Phases are sized (t-shirt size or estimate range), not just dated
  - Per-phase exit criteria stated (what must be true to move to the next phase)
  - Cross-team dependencies surfaced per phase
  - Confidence interval stated (e.g., "high / medium / low" or a range)
-->
<!-- tabular_schema:
  columns: [Phase, Size, Exit criteria, Cross-team deps, Confidence]
  row_per: phase
-->
Describe the delivery plan with sized phases, per-phase exit criteria, cross-team dependencies, and confidence intervals.

## §14 Appendix
<!-- tier: full -->
<!-- purpose: supporting links, schemas, and raw data — no new content -->
<!-- guidance:
  - Pure links, schemas, and data only
  - No new arguments or prose — those belong in the sections above
  - Sources for claims made in §3, §5, and §6
  - Diagrams or schemas too verbose for inline placement
-->
List supporting links, schemas, and data only. No new arguments or prose — those belong in the sections above.
