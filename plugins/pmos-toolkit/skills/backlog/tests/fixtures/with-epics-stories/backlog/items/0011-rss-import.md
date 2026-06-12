---
schema_version: 1
id: 0011
kind: story
parent: 0010
title: OPML import command
type: feature
status: done
priority: must
route: feature
dependencies: []
created: 2026-06-10
updated: 2026-06-12
worktree:
plan_doc: docs/pmos/features/2026-06-12_magazine-interop/stories/0011-rss-import/03_plan.html
tasks_file: docs/pmos/features/2026-06-12_magazine-interop/stories/0011-rss-import/tasks.yaml
claimed_by:
released:
pr:
---
## Story
As a user, I can import an OPML file so my feeds appear in /magazine.
## Acceptance Criteria
- [ ] /magazine add --opml <file> imports every outline as a feed
- [ ] Malformed OPML is rejected with a clear error
