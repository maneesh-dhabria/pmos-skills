---
id: 0002
title: Add rate limit to API
type: feature
status: planned
priority: must
score: 720
labels: [api, security]
created: 2026-04-18
updated: 2026-04-22
source:
spec_doc: docs/.pmos/2026-04-22-rate-limit-spec.md
plan_doc:
pr:
parent:
dependencies: []
---

## Context
We're getting hit by aggressive scrapers. Need per-token rate limiting.

## Acceptance Criteria
- [ ] 100 req/min per token, configurable
- [ ] 429 response with Retry-After header
