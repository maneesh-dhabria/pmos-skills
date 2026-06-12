---
schema_version: 1
id: 0012
kind: story
parent: 0010
title: OPML export command
type: feature
status: planned
priority: must
route: feature
dependencies: [0011]
created: 2026-06-10
updated: 2026-06-12
worktree:
plan_doc: docs/pmos/features/2026-06-12_magazine-interop/stories/0012-opml-export/03_plan.html
tasks_file: docs/pmos/features/2026-06-12_magazine-interop/stories/0012-opml-export/tasks.yaml
claimed_by:
released:
pr:
---
## Story
As a user, I can export my active feeds as OPML to move them to another reader.
## Acceptance Criteria
- [ ] /magazine export --opml writes OPML that xmllint validates
- [ ] Muted feeds are excluded
- [ ] Round-trips through /magazine add --opml
