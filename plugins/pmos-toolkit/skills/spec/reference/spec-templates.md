# Spec Templates (Tier 1 / 2 / 3)

The three spec body templates referenced by `/spec` Phase 5. Phase 1 detects the tier; Phase 5 reads this file and emits the matching template (rendered to HTML via the html-authoring substrate when `output_format=html`). All templates start at `**Status:** Draft`; the frontmatter `requirements_ref` points at the committed `01_requirements.{html,md}`.

## Contents

- [Tier 1 Template: Bug Fix / Minor Enhancement](#tier-1-template-bug-fix--minor-enhancement)
- [Tier 2 Template: Enhancement / UX Overhaul](#tier-2-template-enhancement--ux-overhaul)
- [Tier 3 Template: Feature / New System](#tier-3-template-feature--new-system)

---

### Tier 1 Template: Bug Fix / Minor Enhancement

```markdown
---
tier: 1
type: bugfix
feature: <slug>
date: YYYY-MM-DD
status: Draft
requirements_ref: <path-to-01_requirements.{html,md}>
---

# <Bug/Fix Name> — Spec

## 1. Problem Statement
[What's broken, the impact, how to reproduce]

## 2. Root Cause Analysis
[Why it's happening — trace through the code]

## 3. Fix Approach
[What changes, why this approach over alternatives]

## 4. Decision Log
[Lightweight — 1–3 rows expected. Capture the fix-approach choice and any rejected alternatives. Skip the table entirely only if there was exactly one obvious fix with no alternatives considered.]

| # | Decision | Options Considered | Rationale |
|---|----------|-------------------|-----------|
| D1 | [What was decided] | (a) ..., (b) ... | [Why] |

## 5. Edge Cases

| # | Scenario | Condition | Expected Behavior |
|---|----------|-----------|-------------------|
| E1 | [Name] | [Trigger] | [What happens] |

## 6. Testing Strategy
[Exact tests to write, exact verification commands]
```

### Tier 2 Template: Enhancement / UX Overhaul

```markdown
---
tier: 2
type: enhancement
feature: <slug>
date: YYYY-MM-DD
status: Draft
requirements_ref: <path-to-01_requirements.{html,md}>
---

# <Feature Name> — Spec

## 1. Problem Statement
[Restate from requirements + primary success metric]

## 2. Goals

| # | Goal | Success Metric |
|---|------|---------------|
| G1 | [Outcome] | [Measurement] |

## 3. Non-Goals
- [Exclusion] — because [reason]

## 4. Decision Log

| # | Decision | Options Considered | Rationale |
|---|----------|-------------------|-----------|
| D1 | [What] | (a) ..., (b) ... | [Why] |

## 5. User Journeys
[Key flows with diagrams if 3+ branches]

## 6. Functional Requirements

### 6.1 [Area]

| ID | Requirement |
|----|-------------|
| FR-01 | [Specific, testable] |

## 7. API Changes (if any)
[Endpoint, request, response, errors]

## 8. Frontend Design (if any)
[Component hierarchy, state, interactions]

## 9. Edge Cases

| # | Scenario | Condition | Expected Behavior |
|---|----------|-----------|-------------------|

## 10. Testing & Verification Strategy
[What to test, how, exact commands]

<!-- Required only when /spec Phase 6b auto-upgrade fires (a previously-unseen module was declared) -->
## 11. Modules (optional at Tier-2)

<section id="modules">

| Module | Owner | Purpose |
|--------|-------|---------|
| <module-name> | <team or path> | <one-line purpose> |

</section>

<!-- Required only when /spec Phase 6b auto-upgrade fires -->
## 12. Architectural Assertions (optional at Tier-2)

<section id="architectural-assertions">

- <module-name> MUST <invariant phrased as a checkable rule>.
- <module-name> MUST NOT <forbidden coupling or escape hatch>.

</section>
```

### Tier 3 Template: Feature / New System

```markdown
---
tier: 3
type: feature
feature: <slug>
date: YYYY-MM-DD
status: Draft
requirements_ref: <path-to-01_requirements.{html,md}>
---

# <Feature Name> — Spec

---

## 1. Problem Statement
[Restate from requirements. 2-4 sentences. Include the primary success metric.]

---

## 2. Goals

| # | Goal | Success Metric |
|---|------|---------------|
| G1 | [Observable outcome] | [How measured] |

---

## 3. Non-Goals
- [Explicit exclusion] — because [reason]

---

## 4. Decision Log

| # | Decision | Options Considered | Rationale |
|---|----------|-------------------|-----------|
| D1 | [What was decided] | (a) ..., (b) ..., (c) ... | [Why — include trade-offs] |

---

## 5. User Personas & Journeys

### 5.1 [Persona Name] (primary)
[Context, goals, constraints]

### 5.2 User Journey: [Journey Name]
[Step-by-step flow. Use Mermaid for complex flows with 3+ branches.]

---

## 6. System Design

### 6.1 Architecture Overview
[ASCII or Mermaid diagram showing components and data flow. Use C4 Level 1-2.]

### 6.2 Sequence Diagrams
[Mermaid sequence diagrams for key interactions. One diagram per flow — do NOT combine multiple scenarios. Include error paths alongside happy paths.]

---

## 7. Functional Requirements

### 7.1 [Feature Area]

| ID | Requirement |
|----|-------------|
| FR-01 | [Specific, testable requirement] |
| FR-02 | ... |

### 7.2 [Feature Area 2]
...

---

## 8. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Performance | [Specific threshold] |
| NFR-02 | Accessibility | ... |

---

## 9. API Contracts

### 9.1 [Endpoint Name]

```
METHOD /path
```

**Request:**
```json
{ "field": "type — description" }
```

**Response (200):**
```json
{ "field": "type — description" }
```

**Error responses:** [status codes and shapes]

---

## 10. Database Design

### 10.1 Schema Changes

```sql
CREATE TABLE ... (
    ...
);
```

### 10.2 Migration Notes
[Forward/backward compatibility, data backfill, rollback strategy]

### 10.3 Indexes & Query Patterns
[Key queries and supporting indexes]

---

## 11. Frontend Design

### 11.1 Component Hierarchy
[Tree showing nesting]

### 11.2 State Management
[What state lives where — component / store / URL / server]

### 11.3 UI Specifications
[Per-component: layout, states, interactions, responsive behavior]

---

## 12. Edge Cases

| # | Scenario | Condition | Expected Behavior |
|---|----------|-----------|-------------------|
| E1 | [Name] | [Trigger] | [What happens] |

---

## 13. Configuration & Feature Flags

| Variable | Default | Purpose |
|----------|---------|---------|
| `ENV_VAR` | value | [What it controls] |

---

## 14. Testing & Verification Strategy

### 14.1 Unit Tests
[What to test, specific assertions]

### 14.2 Integration Tests
[API contract tests, DB integration]

### 14.3 End-to-End Tests
[Playwright flows, CLI verification, manual spot checks]

### 14.4 Verification Commands
[Exact commands with expected output]

---

## 15. Rollout Strategy
[Feature flags, migration order, rollback plan, graceful degradation]

---

## 16. Modules

<section id="modules">

| Module | Owner | Purpose |
|--------|-------|---------|
| <module-name> | <team or path> | <one-line purpose> |

</section>

[Required at Tier-3. Every module the spec introduces or touches gets a row. Names must resolve in the host repo (basename match OR full-path resolves in git HEAD) so /architecture's auto-upgrade detector does not flag false positives. See `plugins/pmos-toolkit/skills/architecture/scripts/auto-upgrade-detector.sh` for the matching contract.]

---

## 17. Architectural Assertions

<section id="architectural-assertions">

- <module-name> MUST <invariant phrased as a checkable rule>.
- <module-name> MUST NOT <forbidden coupling or escape hatch>.

</section>

[Required at Tier-3. Each assertion is one sentence, testable by an LLM judge against the codebase. Cite the §6 architecture diagram or §5 user journey that motivates each assertion. /architecture --from-spec emits findings per assertion via the §13-schema triplet.]

---

## 18. Research Sources

| Source | Type | Key Takeaway |
|--------|------|-------------|
| [path or URL] | Existing code / External | [What we learned] |
```
