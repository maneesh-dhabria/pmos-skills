# /mytasks Item Schema

> Binds the shared tracker contract in [`../_shared/tracker-crudl.md`](../_shared/tracker-crudl.md). This file declares mytasks's **bindings** (fields, enums, INDEX shape, archive root); the shared contract governs the **invariants** (id/slug rules, `created`/`updated`/`schema_version`, INDEX regenerability, archive convention).

Every task is a markdown file at `~/.pmos/tasks/items/{id}-{slug}.md`.

## Filename

Numeric-id store — `id`/`slug` rules per `../_shared/tracker-crudl.md` §2. Binding: a single per-skill `id` counter (the store is global to the user, not per-repo).

## Frontmatter

```yaml
---
schema_version: 1                # shared §3; absent == 1
id: 0042
title: Draft Q3 OKRs for Platform team
type: execution                  # enum
importance: leverage             # enum (LNO)
status: pending                  # enum
workstream: platform-q3          # optional, ideally a workstream slug
people: [sarah-chen, mark-davis] # optional list of /people handles
labels: [okrs, planning]         # optional free-string list
links: []                        # optional list of URLs or file paths
due: 2026-05-12                  # optional ISO date
start: 2026-05-05                # optional ISO date
checkin: weekly                  # optional enum
next_checkin: 2026-05-02         # optional ISO date, auto-bumped on /mytasks checkin
created: 2026-04-25
updated: 2026-04-25
completed:                       # ISO date, set when status -> completed/dropped
---
```

### Enum values (the skill MUST validate against these and never invent new ones)

| Field | Allowed values |
|---|---|
| `type` | `execution`, `follow-up`, `reminder`, `idea`, `read`, `call` |
| `importance` | `leverage`, `neutral`, `overhead` |
| `status` | `pending`, `in-progress`, `waiting`, `completed`, `dropped` |
| `checkin` | `daily`, `weekly`, `biweekly`, `monthly`, `none` |

### Defaults on quick-capture (`/mytasks <bare text>`)

- `schema_version: 1` (shared §3)
- `status: pending`
- `importance: neutral`
- `type:` per inference (see `inference-heuristics.md`); fallback `execution`
- `created`, `updated`: today
- `workstream:` from current repo's `.pmos/settings.yaml` if present and contains `workstream:`, else absent
- `people:` from `@handle` tokens (resolved via `/people find`); unresolved tokens flagged in capture report
- `due:` from natural-language date parse if present, else absent
- All other optional fields: absent

### Defaults on rich-capture (`/mytasks add`)

All fields prompted via `_shared/interactive-prompts.md`. Each prompt has a sensible default; `<enter>` accepts.

## Body

Entirely freeform. The skill recognizes (but does not require) two conventional H2 sections:

```markdown
## Notes
Free-form. User-written.

## Check-ins
- 2026-04-25: synced with Sarah, on track   # auto-managed by /mytasks checkin
```

Tasks captured quickly typically have no body. The `## Check-ins` section is created by `/mytasks checkin <id>` if absent.

## INDEX.md format

`~/.pmos/tasks/INDEX.md` follows the regenerable-cache contract in `../_shared/tracker-crudl.md` §5 (never the source of truth; `Last regenerated:` line; empty cells, never `null`). Binding (grouping/sort/columns):

```markdown
# My Tasks

Last regenerated: 2026-04-25

## leverage
| id | type | status | due | next_checkin | title | workstream |
|----|------|--------|-----|--------------|-------|------------|
| 0001 | execution | in-progress | 2026-05-12 |  | Draft Q3 OKRs for Platform team | platform-q3 |

## neutral
| id | type | status | due | next_checkin | title | workstream |
|----|------|--------|-----|--------------|-------|------------|
| 0002 | call | pending | 2026-05-01 | 2026-05-08 | Call sarah on roadmap | platform-q3 |
| 0004 | read | pending |  |  | Read OKR best practices |  |

## overhead
| id | type | status | due | next_checkin | title | workstream |
|----|------|--------|-----|--------------|-------|------------|
| 0003 | execution | waiting |  |  | Fix coffee machine |  |
```

Items grouped by `importance` (`leverage`, `neutral`, `overhead`). Within each group, sorted by `due` asc (no-due last) → `updated` desc. Status-based exclusion (mytasks binding): `completed` and `dropped` items are NOT in INDEX.md (cell-rendering and archived-exclusion per shared §5).

## Archive

mytasks archives, per `../_shared/tracker-crudl.md` §6. Binding: archive root `~/.pmos/tasks/archive/`, so tasks land at `~/.pmos/tasks/archive/YYYY-QN/{id}-{slug}.md` (full content preserved, mirrors `items/`, never in `INDEX.md`).
