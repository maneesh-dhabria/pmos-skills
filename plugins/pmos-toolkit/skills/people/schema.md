# /people Record Schema

> Binds the shared tracker contract in [`../_shared/tracker-crudl.md`](../_shared/tracker-crudl.md). This file declares people's **bindings** (fields, enums, index-view shape); the shared contract governs the **invariants** (`created`/`updated`/`schema_version`, derived-on-read index view §5 INV-1/2/3). Two deviations from the common case: people is **handle-keyed, not numeric-id** (so §2 does not apply — see below), and people **does not archive** (no §6 store).

Every person record is a markdown file at `~/.pmos/people/{handle}.md`.

## Filename

Handle-keyed store (the §2 numeric-id scheme does NOT apply here):

- `handle`: kebab-case, unique key, used in cross-skill references. Derived from the person's name on create (see `lookup.md` for derivation rules).
- No `.md`-less variants. The file extension is required.

## Frontmatter

```yaml
---
schema_version: 1                   # shared §3; absent == 1
handle: sarah-chen
name: Sarah Chen
designation: VP Engineering         # optional — formal title
role: Eng Manager                   # optional — informal day-to-day role
working_relationship: peer          # optional enum
team: platform                      # optional
email: sarah@acme.com               # optional
workstreams: [platform-q3]          # optional list of workstream slugs
aliases: [sarah, schen, sc]         # optional fuzzy-match seeds
created: 2026-04-25
updated: 2026-04-25
---
```

### Enum values (the skill MUST validate against these and never invent new ones)

| Field | Allowed values |
|---|---|
| `working_relationship` | `boss`, `direct-report`, `peer`, `team-member`, `stakeholder`, `external`, `other` |

### Defaults on reactive create (called from `/mytasks` capture)

- `name`: from the prompt that disambiguated the unknown person.
- `handle`: auto-derived per `lookup.md`.
- `aliases`: seeded with the original token from the task (e.g., `[sarah]`).
- `schema_version: 1`; `created`, `updated`: today (shared §3).
- All other fields: absent from frontmatter (bare keys not written).

### Defaults on proactive create (`/people add`)

- `name`: from the command argument or first prompt.
- `handle`: auto-derived per `lookup.md`.
- All other fields: prompted via `_shared/interactive-prompts.md`. Each skippable.
- `schema_version: 1`; `created`, `updated`: today (shared §3).

## Body

```markdown
## Notes
Free-form. Context, prefs, history.
```

The `## Notes` section is optional. The skill never auto-writes to the body; users edit it freely.

## Index view format

The bare-`/people` at-a-glance directory is an **index view derived on read** from `~/.pmos/people/*.md` — there is **no committed `INDEX.md`** and no writer (per `../_shared/tracker-crudl.md` §5, INV-1/2/3: never persisted; empty cells, never `null`). Binding (sort/columns):

```markdown
# People

| handle | name | designation | role | working_relationship | team | email |
|--------|------|-------------|------|----------------------|------|-------|
| mark-davis | Mark Davis | Director of Product | PM Lead | peer | product | mark@acme.com |
| sarah-chen | Sarah Chen | VP Engineering | Eng Manager | peer | platform | sarah@acme.com |
| sarah-patel | Sarah Patel | | Designer | team-member | design | |
```

Sorted by `name` ascending (cell-rendering per shared §5). Computed fresh from the record files on every read — no `Last regenerated:` line, because there is nothing to regenerate.
