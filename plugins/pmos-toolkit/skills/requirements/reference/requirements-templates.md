# Requirements Templates (Tier 1 / 2 / 3)

The three requirements body templates referenced by `/requirements` Phase 4 (`#write-document`). Phase 1 detects the tier; Phase 4 reads this file and emits the matching template, rendered to HTML via the html-authoring substrate. Delete sections marked optional ("omit if empty") for that tier. All templates start at `**Status:** Draft`.

**HTML rendering.** The MD-shape templates below are authoritative for content; when emitting HTML, wrap each `## ` section as a `<section id="...">` with an `<h2 id="...">` heading. Heading ids follow the derivation rule in `_shared/html-authoring/conventions.md` §3.

## Contents

- [Tier 1 Template: Bug / Minor Fix](#tier-1-template-bug--minor-fix)
- [Tier 2 Template: Enhancement / UX Fix](#tier-2-template-enhancement--ux-fix)
- [Tier 3 Template: Feature / Product Launch](#tier-3-template-feature--product-launch)
- [Document Guidelines (all tiers)](#document-guidelines-all-tiers)

---

### Tier 1 Template: Bug / Minor Fix

```markdown
# <Bug/Fix Name> — Requirements

**Date:** YYYY-MM-DD
**Last updated:** YYYY-MM-DD
**Status:** Draft
**Tier:** 1 — Bug Fix

## Problem
[2-4 sentences. What's broken, what's the impact.]

### Who experiences this?
[User role + context]

### Reproduction / Root Cause
[How to reproduce. What's causing it if known.]

### Investigated
[Optional. File paths and issue/PR links touched during root-cause analysis. Two-line section. Omit if empty.]

## Fix Direction
[High-level approach. Not the code — the strategy.]

## Acceptance Criteria
- [ ] [Specific, testable criterion 1]
- [ ] [Specific, testable criterion 2]

## Decisions
[Optional. Use the table format from Tier 2 if multiple fix approaches were considered. Omit if empty.]

## Open Questions
[Optional. Use the table format from Tier 2 if any unknowns remain. Omit if empty.]
```

---

### Tier 2 Template: Enhancement / UX Fix

```markdown
# <Feature Name> — Requirements

**Date:** YYYY-MM-DD
**Last updated:** YYYY-MM-DD
**Status:** Draft
**Tier:** 2 — Enhancement

## Problem
[2-4 sentences. Specific user pain or gap.]

### Who experiences this?
[Persona + context]

### Why now?
[What changed that makes this a priority? What's the trigger?]

## Goals & Non-Goals

### Goals
- [Observable user outcome 1] — measured by [signal]
- [Observable user outcome 2] — measured by [signal]

### Non-Goals
- NOT doing [X] — because [reason]

## Solution Direction
[High-level approach. ASCII diagrams of user-observable behavior (screens, journeys, states) where useful — NOT internal architecture.]

## User Journeys

### Primary Journey
[Step-by-step from entry point to completion]

### Error / Edge Cases
[What goes wrong, what the user sees]

## Design Decisions

| # | Decision | Options Considered | Rationale |
|---|----------|-------------------|-----------|
| D1 | [What was decided] | (a) ..., (b) ... | [Why] |

## Open Questions

| # | Question |
|---|----------|
| 1 | [Unresolved decision] |

(Default 2-col. Add `Owner` and `Needed By` columns ONLY if the user mentioned a teammate/stakeholder during brainstorm, OR `~/.pmos/people/` is non-empty, OR the user mentioned a deadline.)

---

**For UX friction analysis, run `/msf-req` after this doc is committed.**
```

---

### Tier 3 Template: Feature / Product Launch

```markdown
# <Feature Name> — Requirements

**Date:** YYYY-MM-DD
**Last updated:** YYYY-MM-DD
**Status:** Draft
**Tier:** 3 — Feature

## Problem
[2-4 sentences. Specific user pain or gap. No solution language.]

### Who experiences this?
[User role/persona + context. Be specific.]

### Why now?
[What changed that makes this a priority?]

## Goals & Non-Goals

> Goals are observable user outcomes; Acceptance Criteria (engineering contracts) belong in `/spec`. Tier 1 carries both because it bypasses `/spec`.

### Goals
- [Observable user outcome 1] — measured by [metric]
- [Observable user outcome 2] — measured by [metric]

### Non-Goals (explicit scope cuts)
- NOT doing [X] in this iteration — because [reason]
- NOT solving [adjacent problem] — because [reason]

## User Experience Analysis

### Motivation
- **Job to be done:** [What the user is trying to accomplish]
- **Importance/Urgency:** [How critical? What happens if they don't do it?]
- **Alternatives:** [What else could they do? How does this compare?]

### Friction Points

| Friction Point | Cause | Mitigation |
|---------------|-------|------------|
| [e.g., "Will I lose my data?"] | [Uncertainty about save] | [Auto-save + confirmation] |

### Satisfaction Signals
- [How we know the user feels good about the experience]

## Solution Direction
[High-level approach. ASCII diagrams of user-observable behavior or wireframe links where useful. NO internal architecture diagrams — those belong in `/spec`.]

## User Journeys

### Primary Journey (Happy Path)
[Numbered steps. Each step = user action + system response.]

### Alternate Journeys
[Valid variations — user takes different route]

### Error Journeys
[What goes wrong. What the user sees. What they can do.]

### Empty States & Edge Cases

| Scenario | Condition | Expected Behavior |
|----------|-----------|-------------------|
| [name] | [trigger] | [what user sees] |

## Design Decisions

| # | Decision | Options Considered | Rationale |
|---|----------|-------------------|-----------|
| D1 | [What was decided] | (a) ..., (b) ..., (c) ... | [Why — include trade-offs] |

## Success Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| [e.g., AHT for issue selection] | [current] | [goal] | [how measured] |

## Research Sources

| Source | Type | Key Takeaway |
|--------|------|-------------|
| [file path or URL] | Existing code / External | [What we learned] |

## Open Questions

| # | Question |
|---|----------|
| 1 | [Unresolved decision] |

(Default 2-col. Add `Owner` and `Needed By` columns ONLY if the user mentioned a teammate/stakeholder during brainstorm, OR `~/.pmos/people/` is non-empty, OR the user mentioned a deadline.)
```

---

### Document Guidelines (all tiers)

- **Goals vs. Acceptance Criteria boundary:** Goals are observable user outcomes ("users find the right issue 80% of the time"). Acceptance Criteria are engineering contracts ("search returns results in <300ms") — those belong in `/spec`. Tier 1 carries both because it bypasses `/spec`.
- **Diagrams:** allowed if they describe what the user sees/does (screens, journeys, state transitions). Banned if they describe internal architecture (services, queues, DBs) — those belong in `/spec`.
- **Wireframes link rule (conditional):** If wireframes exist for this feature folder, link them and avoid prose visual description. If not, describe screens at a behavior level only — do not invent visual detail.
- Scannable — bullet points over paragraphs.
- User-perspective language — "the agent sees X", not "the system stores Y".
- No implementation details — no DB schemas, no API routes, no code snippets.
- Bold the key constraint or decision in each paragraph — readers scan, they don't read linearly.
- One requirement per bullet — if it needs a paragraph, it's multiple requirements.
- Non-goals MUST include a "because" reason — naked exclusions invite re-litigation.
- **Status lifecycle:** Draft on initial write → In Review when entering Phase 5 (`#review`) → Approved when Phase 5 user-confirms.
- **`Last updated` field** refreshes on every commit.
