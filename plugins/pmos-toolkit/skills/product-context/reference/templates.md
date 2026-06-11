# Workstream templates

Read this file when `/product-context init` reaches its scope-routing step (SKILL.md `#init` step 3). Whole product → Product template; specific area within a product → Charter template. Template Rules live in SKILL.md (`## Template Rules`).

A third "Feature" template (`type: feature`) was retired in the 2026-06-10 skill-design review — no flow ever instantiated it. The pipeline loader (`_shared/pipeline-setup.md` Section 0 step 3) still tolerates hand-authored `type: feature` files.

## Product Template

```markdown
---
name: {product name}
type: product
created: {date}
updated: {date}
---

## Description
{One-line description}

## Value Proposition
{Why does this product exist? What problem does it solve?}

## User Segments
{Who uses this? What are their characteristics?}

## Tech Stack
{Languages, frameworks, infrastructure, deployment}

## Competitors / Alternatives
{What else exists in this space? How is this different?}

## Key Metrics
{How do you measure success?}

## Charters

### {Charter Name}
- **Problem**:
- **North star metric**:
- **Active initiatives**:

## Rollout & Release (optional)
{Feature flags, staged rollout groups, release process, deployment mechanisms}

## Constraints & Scars (optional)
{Past incidents, hard-learned lessons, or organizational constraints that shape decisions}

## Team & Stakeholders (optional)
{Who's involved? What do they care about?}

## Key Decisions
{Significant decisions with rationale, added over time}
```

## Charter Template

```markdown
---
name: {charter name}
type: charter
product: {parent product slug, if applicable}
created: {date}
updated: {date}
---

## Description
{What problem area does this own?}

## North Star Metric
{Primary measure of success}

## User Segments
{Which users does this serve?}

## Current Initiatives
{What's actively being worked on?}

## Constraints & Decisions
{Technical or business constraints, key decisions made}

## Team & Stakeholders (optional)
{Who's involved? What do they care about?}
```
