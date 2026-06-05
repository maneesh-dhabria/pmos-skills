# Engineering Design Doc — Eval Criteria

Per-section evaluation items for the Engineering Design Doc template. Two consumers:
- **Phase 2a Gap Interview:** filters `kind: precondition`; queues `gap_question` for items whose evidence is absent from auto-read files.
- **Phase 3 Refinement Loop:** reviewer subagent checks ALL items (both kinds) against the generated draft.

---

## §1 Header

- id: title-descriptive
  kind: judgment
  tier: [lite, full]
  check: title is descriptive — names the system, change, or decision (not generic "Design Doc for X")
  severity: high

- id: authors-named
  kind: judgment
  tier: [lite, full]
  check: ≥1 author is listed by name
  severity: medium

- id: reviewers-named
  kind: judgment
  tier: [lite, full]
  check: ≥1 named reviewer is listed
  severity: medium

- id: status-is-enum
  kind: judgment
  tier: [lite, full]
  check: status is one of Draft | In Review | Approved | Superseded
  severity: medium

- id: last-updated-date
  kind: judgment
  tier: [lite, full]
  check: last-updated date is present
  severity: low

---

## §2 TL;DR

- id: problem-named
  kind: judgment
  tier: [lite, full]
  check: problem being solved is named (not just "we are building X")
  severity: high

- id: approach-named
  kind: judgment
  tier: [lite, full]
  check: chosen approach is named
  severity: high

- id: key-tradeoff-surfaced
  kind: judgment
  tier: [lite, full]
  check: key tradeoff or most important design decision is surfaced
  severity: high

- id: tldr-length-cap
  kind: judgment
  tier: [lite, full]
  check: ≤5 sentences total
  severity: low

---

## §3 Context & Background

- id: existing-system-named
  kind: precondition
  tier: [lite, full]
  check: existing system, file path, or service that this design builds on or replaces is named
  gap_question: |
    Which existing system, file path, or service does this design build on or replace?
  severity: high

- id: prior-docs-linked
  kind: judgment
  tier: [lite, full]
  check: prior docs or related RFCs are linked, or explicitly stated as "none"
  severity: medium

- id: objective-context-only
  kind: judgment
  tier: [lite, full]
  check: section contains objective context only — no proposal language ("we will…") smuggled in
  severity: medium

- id: verbose-schema-deferred
  kind: judgment
  tier: [lite, full]
  check: verbose schemas or data models are deferred to §6 or §14 (not placed inline in context)
  severity: low

---

## §4 Goals & Non-Goals

- id: goals-outcome-shaped
  kind: judgment
  tier: [lite, full]
  check: each goal is outcome-shaped (latency, correctness, cost, reliability) — not a deliverable ("use Foo" or "ship X")
  severity: high

- id: goals-count
  kind: judgment
  tier: [lite, full]
  check: 1–5 goals total
  severity: medium

- id: non-goals-present
  kind: judgment
  tier: [lite, full]
  check: ≥2 non-goals listed
  severity: medium

- id: non-goals-not-strawmen
  kind: judgment
  tier: [lite, full]
  check: non-goals are reasonable (not obvious out-of-scope items no one would expect)
  severity: medium

- id: non-goal-rationale
  kind: judgment
  tier: [lite, full]
  check: each non-goal has a brief rationale explaining why it's explicitly out of scope
  severity: medium

---

## §5 Proposal / High-Level Design

- id: system-diagram-present
  kind: judgment
  tier: [lite, full]
  check: system diagram is present (ASCII, linked image, or noted as TBD with an owner)
  severity: high

- id: end-to-end-data-flow
  kind: judgment
  tier: [lite, full]
  check: end-to-end data flow is described (where data enters, transforms, and exits)
  severity: high

- id: key-interfaces-named
  kind: judgment
  tier: [lite, full]
  check: key interfaces are named (APIs, queues, stores, services)
  severity: high

- id: tradeoffs-surfaced
  kind: judgment
  tier: [lite, full]
  check: tradeoffs are surfaced in §5 (not buried only in §7) — e.g., consistency vs latency, simplicity vs extensibility
  severity: medium

- id: reader-can-predict-code-shape
  kind: judgment
  tier: [lite, full]
  check: the section gives enough signal that a reader can predict the code shape
  severity: high

---

## §6 Detailed Design

- id: api-contracts-complete
  kind: judgment
  tier: [full]
  check: API contracts include signatures and error shapes for every new or changed interface
  severity: high

- id: data-model-present
  kind: judgment
  tier: [full]
  check: data model includes schema, field types, constraints, and migration notes
  severity: high

- id: algorithms-or-state-transitions
  kind: judgment
  tier: [full]
  check: non-trivial algorithms or state transitions are described
  severity: medium

- id: per-component-failure-modes
  kind: judgment
  tier: [full]
  check: per-component failure modes are described — what fails, how detected, how it degrades
  severity: high

- id: concurrency-races-addressed
  kind: judgment
  tier: [full]
  check: concurrency and race conditions are addressed or explicitly marked N/A
  severity: medium

---

## §7 Alternatives Considered

- id: min-two-alternatives
  kind: judgment
  tier: [lite, full]
  check: ≥2 alternatives are documented
  severity: high

- id: boring-option-included
  kind: judgment
  tier: [lite, full]
  check: at least one alternative is the boring option — do nothing, use an existing solution, or off-the-shelf
  severity: high

- id: tradeoffs-explicit-per-alt
  kind: judgment
  tier: [lite, full]
  check: tradeoffs are explicit for each alternative (not just "we chose X instead")
  severity: high

- id: why-rejected-per-alt
  kind: judgment
  tier: [lite, full]
  check: WHY REJECTED is stated for each alternative
  severity: high

- id: comparison-table-present
  kind: judgment
  tier: [lite, full]
  check: a comparison table or matrix is present
  severity: medium

---

## §8 Cross-Cutting Concerns

- id: slo-targets
  kind: precondition
  tier: [full]
  check: SLO targets are known — availability % and latency p50/p99
  gap_question: |
    What are your SLO targets — availability and latency p50/p99?
  severity: high

- id: security-addressed
  kind: judgment
  tier: [full]
  check: security threat model is present or explicitly marked N/A with a one-line reason
  severity: high

- id: privacy-pii-addressed
  kind: judgment
  tier: [full]
  check: privacy / PII handling is described or explicitly marked N/A with a one-line reason
  severity: high

- id: compliance-named
  kind: judgment
  tier: [full]
  check: relevant compliance regulations are named or explicitly marked N/A with a one-line reason
  severity: medium

- id: observability-described
  kind: judgment
  tier: [full]
  check: observability coverage described — metrics, logs, traces, and alerts each addressed
  severity: high

- id: perf-budget-and-qps
  kind: judgment
  tier: [full]
  check: performance budget and QPS targets are stated
  severity: medium

- id: cost-estimate-present
  kind: judgment
  tier: [full]
  check: cost estimate is provided
  severity: medium

- id: na-entries-have-reason
  kind: judgment
  tier: [full]
  check: N/A entries in the cross-cutting concerns table each include a one-line reason — bare "N/A" is not acceptable
  severity: medium

---

## §9 Migration / Rollout

- id: phasing-described
  kind: judgment
  tier: [lite, full]
  check: rollout is described in phases (what ships in each phase)
  severity: high

- id: backfill-dual-write-if-data-migration
  kind: judgment
  tier: [lite, full]
  check: backfill or dual-write strategy is present if data is being migrated; or explicitly noted as "no data migration"
  severity: medium

- id: rollback-with-trigger
  kind: judgment
  tier: [lite, full]
  check: rollback step is described with an explicit trigger (what condition prompts it)
  severity: high

- id: deprecation-path-described
  kind: judgment
  tier: [lite, full]
  check: deprecation path is described for anything being replaced
  severity: medium

- id: shim-removal-date
  kind: judgment
  tier: [lite, full]
  check: compatibility shims removal date is named, or explicitly stated as "no shims needed"
  severity: low

---

## §10 Testing & Verification

- id: test-split-described
  kind: judgment
  tier: [full]
  check: unit / integration / load test split is described
  severity: medium

- id: production-verification-strategy
  kind: judgment
  tier: [full]
  check: how we know it works in production is described — synthetic monitoring, shadow traffic, or canary strategy named
  severity: high

- id: failure-injection-plan
  kind: judgment
  tier: [full]
  check: failure-injection plan is present and aligned to failure modes described in §6
  severity: medium

---

## §11 Operational Readiness

- id: on-call-ownership
  kind: precondition
  tier: [full]
  check: on-call ownership is known — team or individual identified
  gap_question: |
    Which team owns on-call for this service?
  severity: high

- id: dashboards-alerts-known
  kind: precondition
  tier: [full]
  check: dashboards and alerts are known or have a committed TBD owner and date
  gap_question: |
    Where are the dashboards / alerts for this service? Paste links or 'TBD by [date]'.
  severity: medium

- id: dashboards-listed
  kind: judgment
  tier: [full]
  check: dashboards are listed with links or noted as "TBD — owner: <name>"
  severity: medium

- id: alert-pages-on-fire
  kind: judgment
  tier: [full]
  check: at least one pages-on-fire alert is named
  severity: high

- id: runbook-stub
  kind: judgment
  tier: [full]
  check: runbook stub is linked or noted as "TBD — owner: <name> by <date>"
  severity: medium

- id: slos-quantified
  kind: judgment
  tier: [full]
  check: SLOs are quantified — availability % and latency p50/p99 stated (not "we'll define later")
  severity: high

---

## §12 Risks & Open Questions

- id: risk-has-likelihood-impact-mitigation
  kind: judgment
  tier: [lite, full]
  check: each risk includes likelihood, impact, and a mitigation
  severity: high

- id: questions-distinct-from-risks
  kind: judgment
  tier: [lite, full]
  check: open questions are listed separately from risks (they are distinct types of unknowns)
  severity: medium

- id: question-owners-and-by-when
  kind: judgment
  tier: [lite, full]
  check: each open question has an owner and a by-when date
  severity: medium

- id: rewrite-forcing-risks-called-out
  kind: judgment
  tier: [lite, full]
  check: any rewrite-forcing risks are explicitly called out (risks that would require scrapping the design)
  severity: high

---

## §13 Timeline & Milestones

- id: phases-sized-not-just-dated
  kind: judgment
  tier: [full]
  check: phases are sized (t-shirt size or estimate range) — not just target dates
  severity: high

- id: per-phase-exit-criteria
  kind: judgment
  tier: [full]
  check: per-phase exit criteria are stated (what must be true to move to the next phase)
  severity: high

- id: cross-team-deps-surfaced
  kind: judgment
  tier: [full]
  check: cross-team dependencies are surfaced per phase
  severity: high

- id: confidence-interval-stated
  kind: judgment
  tier: [full]
  check: confidence interval is stated per phase (e.g., high / medium / low, or a range)
  severity: medium

---

## §14 Appendix

- id: no-new-content
  kind: judgment
  tier: [full]
  check: appendix contains only links, schemas, and data — no new arguments or prose (those belong in the sections above)
  severity: low

- id: sources-linked
  kind: judgment
  tier: [full]
  check: sources for claims made in §3, §5, and §6 are linked or referenced
  severity: medium
