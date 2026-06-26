# /mytasks Item Schema

> Binds the shared tracker contract in [`../_shared/tracker-crudl.md`](../_shared/tracker-crudl.md). This file declares mytasks's **bindings** (fields, enums, index-view shape, archive root); the shared contract governs the **invariants** (id/slug rules, `created`/`updated`/`schema_version`, derived-on-read index view §5 INV-1/2/3, archive convention).

Every task is a markdown file at `~/.pmos/tasks/items/{id}-{slug}.md`.

## Filename

Numeric-id store — `id`/`slug` rules per `../_shared/tracker-crudl.md` §2. Binding: a single per-skill `id` counter (the store is global to the user, not per-repo).

## Frontmatter

```yaml
---
schema_version: 2                # shared §3; absent == 1, no value == 2 (current)
id: 260613-a3f
title: Draft Q3 OKRs for Platform team
type: execution                  # enum
importance: leverage             # enum (LNO)
status: pending                  # enum
project: platform-q3             # optional, user-curated container; default none == Inbox
parent:                          # optional id; present on a subtask (a full child task)
order:                           # optional integer; manual sort within a project
recur:                           # optional recurrence rule (see "Recurrence" below); empty == non-recurring
people: [sarah-chen, mark-davis] # optional list of /people handles
labels: [okrs, planning]         # optional free-string list (tags)
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

> **`schema_version`** is `2` as of the project/subtask/recurrence extension. Files written before this (with `schema_version: 1` or the key absent — absent reads as `1`) stay valid: a `1`-era file simply has no `project`/`parent`/`order`/`recur` keys and a `workstream:` key instead. A one-shot load-time normalization in `lib.js loadAllItems` (`migrateWorkstreamKey`) renames `workstream:` → `project:` in place on every read — key only, value preserved; it never rewrites ids or other fields, and is a no-op once no `workstream:` key remains.

### Enum values (the skill MUST validate against these and never invent new ones)

| Field | Allowed values |
|---|---|
| `type` | `execution`, `follow-up`, `reminder`, `idea`, `read`, `call` |
| `importance` | `leverage`, `neutral`, `overhead` |
| `status` | `pending`, `in-progress`, `waiting`, `completed`, `dropped` |
| `checkin` | `daily`, `weekly`, `biweekly`, `monthly`, `none` |

`type`, `importance`, `status`, and `checkin` are closed enums. `project`, `parent`, `order`, `recur`, `people`, `labels`, and `links` are NOT enums — they are free / id / integer / list values constrained only by the rules below.

### Project, subtask, order, recurrence (the project/subtask extension)

| Field | Shape | Meaning |
|---|---|---|
| `project` | optional free string (a project slug) | Todoist-style container. **Replaces** the old `workstream` field. **User-curated and fully manual** — never auto-inferred from repo context (see `inference-heuristics.md` "What is NEVER inferred"). A task with no `project` value belongs to **Inbox**. |
| `parent` | optional task id | When set, this task is a **subtask** — a full child task file (all fields available) whose `parent:` points at another task's id. |
| `order` | optional integer | Manual sort position within a project. Smart date-views ignore `order:` (they sort by date); it only governs ordering inside a single project/list. |
| `recur` | optional recurrence rule | Non-empty ⇒ the task recurs (see "Recurrence" below). Empty/absent ⇒ one-shot. |

**Subtask semantics.** A subtask is an ordinary task file with `parent:` set; it carries its own `status`, `due`, `people`, `importance`, `recur`, etc. **Completing a parent does NOT auto-complete its children** — each child's status is independent. Nesting (indenting children under a parent) is a **view-layer** concern; the stored files stay flat.

**Recurrence (`recur:`).** Closed phrase set (case-insensitive):

| Rule | Advance `due`/`start` by |
|---|---|
| `daily` | +1 day |
| `weekly` | +7 days |
| `biweekly` | +14 days |
| `monthly` | +1 calendar month, clamped to the last day of the target month (e.g. Jan 31 → Feb 28; Aug 31 → Sep 30) — **reuses the existing check-in `monthly` clamp**, SKILL.md `#checkin` |
| `every <N> days` | +N days |
| `every <N> weeks` | +(7×N) days |
| `every <N> months` | +N calendar months, same last-day clamp as `monthly` |
| `every <weekday>` (e.g. `every monday`) | next occurrence of that weekday, exclusive of the anchor date (same rule as the `inference-heuristics.md` bare-weekday parse) |

Recurrence uses the **spawn-new-instance** model (design D8): on `complete` of a task whose `recur:` is non-empty, the task is marked `completed` and a **brand-new task** is minted — a fresh `<YYMMDD>-<rand3>` id, the same fields (including `recur:` and `parent:`), with `due`/`start` advanced by the rule above; the completion is logged to the old task's `## Check-ins`/`## Notes`. (The `complete`-time spawn mechanics land with the CLI/web layer in the sibling stories; this file is the contract they implement.)

### Defaults on quick-capture (`/mytasks <bare text>`)

- `schema_version: 2` (shared §3; absent == 1, still valid)
- `status: pending`
- `importance: neutral`
- `type:` per inference (see `inference-heuristics.md`); fallback `execution`
- `created`, `updated`: today
- `project:` **absent** by default (lands in Inbox) — `project` is manual, never inferred
- `parent:`, `order:`, `recur:` — absent by default (bare keys; never auto-set at capture)
- `people:` from `@handle` tokens (resolved via `/people find`); unresolved tokens flagged in capture report
- `due:` from natural-language date parse if present, else empty
- All other optional fields: written as bare keys with no value (e.g., `start:`, `project:`, `parent:`, `order:`, `recur:`), never omitted — the file shape stays consistent (this is mytasks's §4 empty-optional binding)

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

## Index view format

The bare-`/mytasks` at-a-glance index is a **view derived on read** from `~/.pmos/tasks/items/*.md` (`lib.js renderIndex`) — there is **no committed `INDEX.md`** and no writer, per `../_shared/tracker-crudl.md` §5 (INV-1/2/3: never persisted; empty cells, never `null`; computed fresh per read, so no `Last regenerated:` line). Binding (grouping/sort/columns):

```markdown
# My Tasks

## leverage
| id | type | status | due | next_checkin | title | project | parent |
|----|------|--------|-----|--------------|-------|---------|--------|
| 260613-a3f | execution | in-progress | 2026-05-12 |  | Draft Q3 OKRs for Platform team | platform-q3 |  |

## neutral
| id | type | status | due | next_checkin | title | project | parent |
|----|------|--------|-----|--------------|-------|---------|--------|
| 260613-c31 | call | pending | 2026-05-01 | 2026-05-08 | Call sarah on roadmap | platform-q3 |  |
| 260613-9x2 | read | pending |  |  | Read OKR best practices |  |  |

## overhead
| id | type | status | due | next_checkin | title | project | parent |
|----|------|--------|-----|--------------|-------|---------|--------|
| 260613-7k0 | execution | waiting |  |  | Fix coffee machine |  |  |
```

Items grouped by `importance` (`leverage`, `neutral`, `overhead`). Within each group, sorted by `due` asc (no-due last) → `updated` desc. A bucket with zero items still gets its `## {bucket}` header and column row (never omit the bucket). Status-based exclusion (mytasks binding): `completed` and `dropped` items are NOT in the index view (cell-rendering and archived-exclusion per shared §5).

**`project` column** replaces the former `workstream` column. **Subtasks stay flat in the index view** (design §9 resolution): a subtask is rendered as an ordinary row in its importance bucket, with its `parent:` id shown in the `parent` column — the index view is not nested. Visual nesting (children indented under a parent) is a view-layer concern handled by the readers (terminal `show`/`list` and the web UI), never baked into the derived index view. An empty `parent` cell means a top-level task.

## Archive

mytasks archives, per `../_shared/tracker-crudl.md` §6. Binding: archive root `~/.pmos/tasks/archive/`, so tasks land at `~/.pmos/tasks/archive/YYYY-QN/{id}-{slug}.md` (full content preserved, mirrors `items/`, never in `INDEX.md`).
