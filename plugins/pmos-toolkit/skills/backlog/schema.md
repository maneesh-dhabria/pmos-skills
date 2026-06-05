# Backlog Item Schema

> Binds the shared tracker contract in [`../_shared/tracker-crudl.md`](../_shared/tracker-crudl.md). This file declares backlog's **bindings** (fields, enums, INDEX shape, archive root); the shared contract governs the **invariants** (id/slug rules, `created`/`updated`/`schema_version`, INDEX regenerability, archive convention).

Every backlog item is a markdown file at `backlog/items/{id}-{slug}.md`.

## Filename

Numeric-id store — `id`/`slug` rules per `../_shared/tracker-crudl.md` §2. Binding: `id` counters are **per-repo** (local to each repo's `backlog/`, no global coordination).

## Frontmatter

YAML frontmatter at the top of every item file. All fields below are recognized by the skill; unrecognized fields are preserved on edit but ignored.

```yaml
---
schema_version: 1              # shared §3; absent == 1
id: 0042
title: SSL renewal cron is flaky
type: bug                      # enum
status: inbox                  # enum
priority: should               # enum
score: 280                     # optional, integer 1-1000 (ICE: Impact x Confidence x Ease)
labels: [auth, ops]            # optional, free-string list
created: 2026-04-25            # ISO date, set on create, never modified
updated: 2026-04-25            # ISO date, updated on every write
source:                        # optional, path to originating doc (set by /plan, /verify auto-capture)
spec_doc:                      # optional, set by /spec --backlog
plan_doc:                      # optional, set by /plan --backlog
pr:                            # optional, set by /verify --backlog or `link`
parent:                        # optional, parent item id for sub-items
dependencies: []               # optional, list of item ids this item depends on
---
```

### Enum values (the skill MUST validate against these and never invent new ones)

| Field | Allowed values |
|---|---|
| `type` | one of: `feature` \| `enhancement` \| `bug` \| `tech-debt` \| `chore` \| `docs` \| `idea` \| `spike` |
| `status` | `inbox`, `ready`, `spec'd`, `planned`, `in-progress`, `done`, `wontfix` |
| `priority` | `must`, `should`, `could`, `maybe` |

### Defaults on create

- `schema_version: 1` (shared §3)
- `status: inbox`
- `priority: should`
- `score:` omitted (the field is absent, not present-and-empty)
- `created`, `updated`: today's ISO date (shared §3)
- All other optional fields: present with empty value (e.g., `spec_doc:`)

## Body

Three fixed H2 sections, all optional. When present, they MUST appear in this order so a parser can read them deterministically:

```markdown
## Context
Why this exists, what problem it solves, links to discussions.

## Acceptance Criteria
- [ ] Behavior 1
- [ ] Behavior 2

## Notes
Free-form. Investigation, decisions, screenshots, links.
```

Items captured via `/backlog add` may have NO body at all — title-only is valid. The body is created on first refine/promote.

## INDEX.md format

`backlog/INDEX.md` follows the regenerable-cache contract in `../_shared/tracker-crudl.md` §5 (never the source of truth; regenerated from `items/` on every write op and on `/backlog rebuild-index`; `Last regenerated:` line; empty cells, never `null`). Backlog's binding (grouping/sort/columns):

Shape:

```markdown
# Backlog

Last regenerated: 2026-04-25

## must
| id | type | status | title | spec | plan | pr |
|----|------|--------|-------|------|------|----|
| 0042 | bug | ready | SSL renewal cron is flaky | | | |

## should
| id | type | status | title | spec | plan | pr |
|----|------|--------|-------|------|------|----|
| 0017 | feature | spec'd | Add rate limit to API | docs/.pmos/2026-04-22-rate-limit-spec.md | | |

## could
...

## maybe
...
```

Items are grouped by `priority`, then sorted within each group by `score` desc (nulls last), then `updated` desc. Archived items are NOT listed. The `spec` / `plan` / `pr` columns show the filename only (not the full path) when set, otherwise blank.

## Archive

Backlog archives, per `../_shared/tracker-crudl.md` §6. Binding: archive root `backlog/archive/`, so items land at `backlog/archive/YYYY-QN/{id}-{slug}.md` (full content preserved, mirrors `items/`, never in `INDEX.md`).
