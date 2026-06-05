---
name: mytasks
description: Persistent personal task tracker — distinct from Claude Code's session-scoped TaskCreate/TaskList tools. Use for real-world tasks (LNO importance, due dates, people, check-ins, workstream). Lives at ~/.pmos/tasks/. Use when the user says "add a task", "what's on my plate", "tasks for sarah", "what's due this week", "check in on X", "/mytasks", or names a task to capture.
user-invocable: true
argument-hint: "[ | <text> | add <text> | list [filters] | today | week | overdue | waiting | checkins | for <handle> | in <workstream> | show <id> | set <id> <field>=<value> | refine <id> | done <id> [note] | drop <id> [reason] | checkin <id> [note] | archive | rebuild-index] [--non-interactive | --interactive]"
---

# My Tasks

A lightweight, file-based personal task tracker. Asana/Todoist-class personal life-OS layer, but local-first, AI-native, and embedded in the `pmos-toolkit` ecosystem.

```
                                       ┌─ default daily view ──┐
/mytasks (capture)                     ↓                       │
       │                                                       │
       ▼                                                       │
   pending → in-progress → completed                           │
       │       │              │                                │
       │       ▼              ▼                                │
       │    waiting        dropped → /mytasks archive (>30d)   │
       └──────────────────────────────────────────────────────┘
```

**Hard isolation from `/backlog`.** No code path in `/mytasks` reads or writes `<repo>/backlog/`. The two skills are independent.

**Tip:** `~/.pmos/` is local by default. If you want version history and cross-machine sync, run `git init ~/.pmos/` and push it to a private remote. The skill never enforces this.

**Announce at start:** "Using the mytasks skill to {capture|list|refine|...}."

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:
- **No interactive prompt tool:** follow `_shared/interactive-prompts.md` fallback path — one question at a time as plain text with numbered responses.
- **No subagents:** sequential single-agent operation.

## References

- `schema.md` — item file shape, enum values, `INDEX.md` format
- `inference-heuristics.md` — quick-capture keyword + date + person + workstream parsing rules
- `_shared/interactive-prompts.md` — interactive prompting protocol (used by `add`, `refine`, unknown-person flow)
- Sibling skill `/people` — fuzzy-match person lookup via `/people find`

---

## Phase 0: Subcommand Routing

Parse the user's argument to determine the subcommand. Be liberal with the form — both `/mytasks add foo` and `/mytasks "foo"` work for capture.

| Argument shape | Subcommand |
|---|---|
| empty | Phase 1 (default daily view) |
| `add <text>` | Phase 3 (rich capture — interactive) |
| `list [flags]` | Phase 4 (filtered list) |
| `today` / `week` / `overdue` / `waiting` / `checkins` | Phase 5 (named view) |
| `for <handle>` / `in <workstream>` | Phase 5 (named view) |
| `show <id>` | Phase 6 (render item) |
| `set <id> <field>=<value>` | Phase 7 (single-field edit) |
| `refine <id>` | Phase 8 (interactive multi-field refine) |
| `done <id> [note]` | Phase 9 (status → completed shortcut) |
| `drop <id> [reason]` | Phase 9 (status → dropped shortcut) |
| `checkin <id> [note]` | Phase 10 (check-in mechanics) |
| `archive [--quarter Q]` | Phase 11 (archive completed/dropped) |
| `rebuild-index` | Phase 12 (regenerate INDEX.md) |
| (any other free text not matching a verb) | Phase 2 (quick capture) |

Quick capture (Phase 2) is the fall-through. If the first token is not a recognized verb AND the argument is non-empty, treat the whole argument as `<bare text>` for quick-capture.

---

<!-- non-interactive-block:start -->
1. **Mode resolution.** Compute `(mode, source)` with precedence: `cli_flag > parent_marker > settings.default_mode > builtin-default ("interactive")` (FR-01).
   - `cli_flag` is `--non-interactive` or `--interactive` parsed from this skill's argument string. Last flag wins on conflict (FR-01.1).
   - `parent_marker` is set if the original prompt's first line matches `^\[mode: (interactive|non-interactive)\]$` (FR-06.1).
   - `settings.default_mode` is `.pmos/settings.yaml :: default_mode` if present and one of `interactive`/`non-interactive`. Unknown values → warn on stderr `settings: invalid default_mode value '<v>'; ignoring` and fall through (FR-01.3).
   - If `.pmos/settings.yaml` is malformed (not parseable as YAML, or missing `version`): print to stderr `settings.yaml malformed; fix and re-run` and exit 64 (FR-01.5).
   - On Phase 0 entry, always print to stderr exactly: `mode: <mode> (source: <source>)` (FR-01.2).

2. **Per-checkpoint classifier.** Before issuing any `AskUserQuestion` call, classify it (FR-02):
   - The defer-only tag, if present, is the literal previous non-empty line: `<!-- defer-only: <reason> -->` where `<reason>` ∈ {`destructive`, `free-form`, `ambiguous`} (FR-02.5).
   - Decision (in order): tag adjacent → DEFER; multiSelect with 0 Recommended → DEFER; 0 options OR no option label ends in `(Recommended)` → DEFER; else AUTO-PICK the (Recommended) option (FR-02.2).

3. **Buffer + flush.** Maintain an append-only OQ buffer in conversation memory. On each AUTO-PICK or DEFER classification, append one entry per the schema in spec §11.2. At end-of-skill (or in a caught error before exit), flush (FR-03):
   - Primary artifact is single Markdown → append `## Open Questions (Non-Interactive Run)` section with one fenced YAML block per entry; update prose frontmatter (`**Mode:**`, `**Run Outcome:**`, `**Open Questions:** N` where N counts deferred only — see FR-03.4) (FR-03.1).
   - Skill produces multiple artifacts → write a single `_open_questions.md` aggregator at the artifact directory root; primary artifact's frontmatter `**Open Questions:** N — see _open_questions.md` (FR-03.5).
   - Primary artifact is non-MD (SVG, etc.) → write sidecar `<artifact>.open-questions.md` (FR-03.2).
   - No persistent artifact (chat-only) → emit buffer to stderr at end-of-run as a single block prefixed `--- OPEN QUESTIONS ---` (FR-03.3).
   - Mid-skill error → flush partial buffer under heading `## Open Questions (Non-Interactive Run — partial; skill errored)`; set `**Run Outcome:** error`; exit 1 (E13).

4. **Subagent dispatch.** When dispatching a child skill via Task tool or inline invocation, prepend the literal first line: `[mode: <current-mode>]\n` to the child's prompt (FR-06).

5. **Call-site auditing (CI only).** This runtime classifier reads the call it is about to make — it does not run awk. Static/offline auditing of `AskUserQuestion` call sites across SKILL.md files is performed by `tools/audit-recommended.sh`, which sources the shared call-site extractor from Section D of this file (`_shared/non-interactive.md`). Runtime and audit therefore share one decision contract without inlining the extractor into every skill (FR-02.6).

6. **Refusal check.** If this SKILL.md contains a `<!-- non-interactive: refused; ... -->` marker (regex: `<!--[[:space:]]*non-interactive:[[:space:]]*refused`), and `mode` resolved to `non-interactive`: emit refusal per Section A and exit 64 (FR-07).

7. **Pre-rollout BC.** If the `--non-interactive` argument is present BUT this SKILL.md does NOT contain the `<!-- non-interactive-block:start -->` marker (i.e., this skill hasn't been rolled out yet): emit `WARNING: --non-interactive not yet supported by /<skill>; falling back to interactive.` to stderr; continue in interactive mode (FR-08).

8. **End-of-skill summary.** Print to stderr at exit: `pmos-toolkit: /<skill> finished — outcome=<clean|deferred|error>, open_questions=<N>` (NFR-07).
<!-- non-interactive-block:end -->

## Phase 1: Default Daily View

Triggered by `/mytasks` with no arguments.

### Step 1: Resolve `~/.pmos/tasks/`

If `~/.pmos/tasks/INDEX.md` does not exist (or `~/.pmos/tasks/` is missing entirely), output:

`No tasks yet. Capture one with /mytasks <text> or /mytasks add <text>.`

Then exit.

### Step 2: Validate freshness

Compare `INDEX.md`'s `Last regenerated:` date against the most recent mtime of any `~/.pmos/tasks/items/*.md`. If items have been modified more recently, regenerate (apply Phase 12) before rendering.

### Step 3: Render

Output the contents of `~/.pmos/tasks/INDEX.md` to the user. The INDEX is already grouped by importance per `schema.md`, so the rendering is verbatim.

If `INDEX.md` exists but contains zero items (empty groups), output: `No active tasks. Capture one with /mytasks <text>.`

---

## Phase 12: Rebuild Index

Triggered by `/mytasks rebuild-index`. Also invoked internally by Phases 2, 3, 7, 8, 9, 10, 11 after any item write.

### Step 1: Read items

Glob `~/.pmos/tasks/items/*.md`. For each, parse frontmatter. Skip files with malformed frontmatter (emit one-line warning per skip; do not abort).

### Step 2: Filter

Exclude items with `status: completed` or `status: dropped`. They live only in item files; archived items live in `archive/` and are also excluded.

### Step 3: Group and sort

Group by `importance` (buckets: `leverage`, `neutral`, `overhead`). Items with no `importance:` field default to the `neutral` bucket. Within each group, sort by `due` ascending (no-due last) → `updated` descending.

### Step 4: Write INDEX.md

Overwrite `~/.pmos/tasks/INDEX.md` with the format defined in `schema.md`:

```markdown
# My Tasks

Last regenerated: {today}

## leverage
| id | type | status | due | next_checkin | title | workstream |
|----|------|--------|-----|--------------|-------|------------|
{rows or empty if bucket has zero items}

## neutral
| id | type | status | due | next_checkin | title | workstream |
|----|------|--------|-----|--------------|-------|------------|
{rows or empty}

## overhead
| id | type | status | due | next_checkin | title | workstream |
|----|------|--------|-----|--------------|-------|------------|
{rows or empty}
```

If a bucket has zero items, write the `## {bucket}` header and the column row, then an empty data section (no rows). Do NOT omit the bucket entirely.

### Step 5: Report

If invoked directly: `Regenerated INDEX.md: {N active items} ({completed_excluded} completed/dropped excluded).`
If invoked from another phase: silent on success, warn on failure.

---

## Phase 2: Quick Capture (`<bare text>`)

Triggered by `/mytasks <text>` where `<text>` does not start with a recognized verb (`add`, `list`, `today`, `week`, `overdue`, `waiting`, `checkins`, `for`, `in`, `show`, `set`, `refine`, `done`, `drop`, `checkin`, `archive`, `rebuild-index`).

**This phase MUST complete in a single tool-call sequence with NO clarifying questions.** Wrong inference is acceptable; capture friction is not.

### Step 1: Resolve `~/.pmos/tasks/items/`

If `~/.pmos/tasks/items/` exists, use it. Otherwise, create it with `mkdir -p ~/.pmos/tasks/items`.

### Step 2: Allocate id

Scan `~/.pmos/tasks/items/` and `~/.pmos/tasks/archive/**/` for filenames matching `^([0-9]{4})-`. Take the max numeric prefix; allocate `id = max + 1`. If neither directory exists or both are empty, `id = 1`. Format as 4-digit zero-padded.

### Step 3: Apply inference rules

Per `inference-heuristics.md`:
1. **Type:** scan for keyword match; fallback `execution`.
2. **Date (`due:`):** scan for natural-language date pattern; strip the matched substring from the title.
3. **People:** scan for `@handle` tokens. For each, call `/people find <handle>`:
   - **Single match:** add resolved handle to `people:` list; strip `@handle` token from title.
   - **Multiple matches:** flag as unresolved (multi-match); leave token in title; collect for warning.
   - **No match:** flag as unresolved (no-match); leave token in title; collect for warning.
4. **Workstream:** check current working directory for `.pmos/settings.yaml`; if present and contains `workstream:` key, use it.

The **type keyword is NOT stripped from the title** (it's natural language; the title remains intelligible to the user).

### Step 4: Build slug from final title

After date stripping (and resolved-`@handle` stripping):
- Lowercase the title.
- Replace any run of non-alphanumeric chars with a single hyphen.
- Trim leading/trailing hyphens.
- Truncate to 60 characters at a hyphen boundary if possible, otherwise hard-truncate.

### Step 5: Write the item file

Path: `~/.pmos/tasks/items/{id}-{slug}.md`

Content (frontmatter only, no body):

```yaml
---
id: {id}
title: {final title text}
type: {inferred type}
importance: neutral
status: pending
workstream: {value or empty if not inferred}
people: [{resolved handles, comma-separated; empty list `[]` if none}]
labels: []
links: []
due: {value or empty if not inferred}
start:
checkin:
next_checkin:
created: {today YYYY-MM-DD}
updated: {today YYYY-MM-DD}
completed:
---
```

Optional fields with no value are written as bare keys (e.g., `start:`), not omitted, so the file shape is consistent.

### Step 6: Regenerate INDEX.md

Apply Phase 12 inline. If regeneration fails, the item file is still written — emit a warning suggesting `/mytasks rebuild-index`, but DO NOT roll back.

### Step 7: Report

Build the report line:

```
Captured #{id} ({type}, {importance}): "{final title}"
```

Append clauses for non-default values, separated by ` — `:
- `due {due}` if due was inferred.
- `workstream {workstream}` if inferred (annotate `(from current repo)` if from `.pmos/settings.yaml`).
- `people: {comma-separated handles}` if any resolved.

Then, on subsequent indented lines, list any unresolved `@handle` tokens:
- For no-match: `⚠ unresolved: @{token} — run /people add {token}, then /mytasks set {id} people=<handle>`
- For multi-match: `⚠ unresolved: @{token} — multiple matches ({comma-separated handles}); run /mytasks set {id} people=<handle>`

Example:
```
Captured #0042 (call, neutral): "Call sarah about Q3 OKRs" — due 2026-05-01
```

Or with unresolved person:
```
Captured #0043 (execution, neutral): "Sync with @sarah on roadmap"
  ⚠ unresolved: @sarah — multiple matches (sarah-chen, sarah-patel); run /mytasks set 0043 people=<handle>
```

---

## Phase 3: Rich Capture (`add`)

Triggered by `/mytasks add <text>`. Interactive — collects rich attributes upfront via `_shared/interactive-prompts.md`.

### Step 1: Allocate id and resolve `~/.pmos/tasks/items/`

Same as Phase 2 Steps 1-2.

### Step 2: Walk through prompts per `_shared/interactive-prompts.md`

Ask in this order, ONE field at a time:

1. **`importance`** — enum. Options: `leverage`, `neutral` (default), `overhead`.
2. **`type`** — enum. Options: `execution` (default if no keyword inferred from `<text>`; otherwise the inferred value is the default), `follow-up`, `reminder`, `idea`, `read`, `call`.
3. **`workstream`** — free string. Default: value from current repo's `.pmos/settings.yaml` `workstream:` key if present, else empty. Skippable.
4. **`due`** — date input. Format hint: `YYYY-MM-DD or "Friday", "tomorrow", "in 3 days"`. Parse per `inference-heuristics.md` date rules. Skippable.
5. **`people`** — comma-separated names or handles. For each token (after stripping any `@` prefix), call `/people find`:
   - **Single match:** add the resolved handle silently.
   - **Multiple matches:** present a multi-option prompt per `_shared/interactive-prompts.md`:
     ```
     '{token}' matches multiple people — which one?
       (a) {handle-1} ({name})
       (b) {handle-2} ({name})
       ...
       (c) skip — leave '{token}' unresolved
     ```
     User picks one; add that handle. If "skip", leave unresolved (collect for warning).
   - **No match:** present a multi-option prompt:
     ```
     No match for '{token}' — what would you like to do?
       (a) create new person '{token}'
       (b) pick existing: {ranked-list-of-near-matches-or-"(none with similar name)"}
       (c) skip — leave '{token}' unresolved
     ```
     User picks. If `(a)`, invoke `/people` reactive create (per `/people` Phase 3 reactive entry point) with the name token; receive the new handle and add it. If `(b)` and there are near-matches, prompt to select; add the chosen handle. If `(c)` or no near-matches in `(b)`, leave unresolved.
6. **`checkin`** — enum. Options: `none` (default), `daily`, `weekly`, `biweekly`, `monthly`. If user picks any non-`none` cadence, also set `next_checkin: today + cadence` per Phase 10 cadence math.

### Step 3: Build slug from `<text>`

Same slug rules as Phase 2 Step 4.

### Step 4: Write the item file

Path: `~/.pmos/tasks/items/{id}-{slug}.md`. Frontmatter as in Phase 2 Step 5, but with all collected values from Step 2. Skipped fields are written as bare keys with no value.

### Step 5: Regenerate INDEX

Apply Phase 12. Same fail-soft semantics as Phase 2 Step 6.

### Step 6: Report

Build a report line:

```
Added #{id} ({type}, {importance}): "{title}"
```

Append clauses (` — ` separated) for any non-default values:
- `due {due}`
- `workstream {workstream}`
- `people: {comma-separated handles}`
- `checkin {cadence} (next {next_checkin})`

Then list any unresolved person tokens on indented lines (same format as Phase 2 Step 7).

---

## Phase 4: Filtered List

Triggered by `/mytasks list [flags]`.

### Recognized flags (all optional, all combinable; AND semantics)

| Flag | Effect | INDEX-served? |
|---|---|---|
| `--status <pending\|in-progress\|waiting\|completed\|dropped>` | Filter by status | yes |
| `--type <execution\|follow-up\|reminder\|idea\|read\|call>` | Filter by type | yes |
| `--importance <leverage\|neutral\|overhead>` | Filter by LNO bucket | yes (bucket header) |
| `--workstream <slug>` | Filter by workstream | yes |
| `--person <handle>` | Filter by handle in `people:` | NO — read item files |
| `--label <name>` | Filter by label in `labels:` | NO — read item files |
| `--due <today\|this-week\|overdue\|next-7\|next-30>` | Date-window filter on `due:` | yes |
| `--checkin-due` | `next_checkin <= today` | yes |
| `--include-done` | Include `completed`, `dropped` (excluded by default) | requires reading archive too if set |

### Step 1: Choose source

If all provided flags are INDEX-served (per the table above) AND `--include-done` is NOT set, use `~/.pmos/tasks/INDEX.md` as the source. Otherwise, glob `~/.pmos/tasks/items/*.md` and parse frontmatter for each. If `--include-done` is set, also glob `~/.pmos/tasks/archive/**/*.md`.

### Step 2: Validate flag values against enums

Reject unknown enum values with: `Unknown {flag-name} '{value}'. Allowed: {comma-separated list}.` No render.

### Step 3: Apply filters and sort

AND semantics across flags. Default sort: `due` ascending (no-due last) → `updated` descending. Importance is the **grouping** key for the default `/mytasks` no-arg view; `list` renders flat (no grouping) unless explicitly grouped (not a v1 feature).

For `--due` window flags:
- `today` → `due == today`
- `this-week` → `today <= due <= today + 7`
- `overdue` → `due < today` AND `status` NOT in (completed, dropped)
- `next-7` → `today <= due <= today + 7`
- `next-30` → `today <= due <= today + 30`

### Step 4: Render

Render a markdown table with columns `id | type | status | due | next_checkin | title | workstream`.

For person- or label-filtered views, additionally include the relevant column (`people` or `labels`) since those flags read item files anyway.

If 0 matches: `No items match.`

---

## Phase 5: Named Views

Triggered by `/mytasks today`, `/mytasks week`, `/mytasks overdue`, `/mytasks waiting`, `/mytasks checkins`, `/mytasks for <handle>`, `/mytasks in <workstream>`.

Each named view dispatches to Phase 4 with the equivalent flags:

| Named view | Equivalent `list` invocation |
|---|---|
| `/mytasks today` | `list --due today` |
| `/mytasks week` | `list --due this-week` |
| `/mytasks overdue` | `list --due overdue` |
| `/mytasks waiting` | `list --status waiting` |
| `/mytasks checkins` | `list --checkin-due` |
| `/mytasks for <handle>` | `list --person <handle>` |
| `/mytasks in <workstream>` | `list --workstream <workstream>` |

The output is identical to the equivalent `list` invocation. No special formatting.

---

## Phase 6: Show Item

Triggered by `/mytasks show <id>`.

### Step 1: Normalize id

Accept `42`, `0042`, or `42` with extra spaces. Zero-pad to 4 digits.

### Step 2: Locate the file

Search `~/.pmos/tasks/items/{id}-*.md`. If not found, search `~/.pmos/tasks/archive/**/{id}-*.md`.

### Step 3: Handle missing

If still not found:
1. Find existing items whose id starts with the same digit prefix.
2. Output: `No item with id {id}. Closest matches by prefix: {comma-separated list or "(none)"}. Run /mytasks list to see all items.`

### Step 4: Render

Output the file contents verbatim, fenced as markdown.

---

## Phase 7: Set Field

Triggered by `/mytasks set <id> <field>=<value>`.

### Step 1: Locate the item

Use Phase 6 normalize-and-locate. If not found, error and exit (same message).

### Step 2: Parse and validate field name

Allowed editable fields: `title`, `type`, `importance`, `status`, `workstream`, `people`, `labels`, `links`, `due`, `start`, `checkin`, `next_checkin`, `completed`.

Disallowed (skill-managed): `id`, `created`, `updated`. Reject: `Field '{field}' cannot be set directly. The skill manages it.`

Unknown fields: `Field '{field}' is not recognized. Allowed: {comma-separated list}.`

### Step 3: Validate value

| Field | Validation |
|---|---|
| `type` | Must be in `execution, follow-up, reminder, idea, read, call` |
| `importance` | Must be in `leverage, neutral, overhead` |
| `status` | Must be in `pending, in-progress, waiting, completed, dropped` |
| `checkin` | Must be in `daily, weekly, biweekly, monthly, none` |
| `due`, `start`, `next_checkin`, `completed` | ISO date `YYYY-MM-DD`, OR natural-language date parsed per `inference-heuristics.md`, OR empty (to clear) |
| `people`, `labels`, `links` | Comma-separated; written as YAML list |
| `title`, `workstream` | Free string |

For `people`: each token is treated as a literal handle (NOT fuzzy-matched). The user is responsible for typing exact handles when using `set`.

On enum violation: `Unknown {field} '{value}'. Allowed: {comma-separated list}.` No write.

### Step 4: Edit and report

Load item, update only the named field, set `updated:` to today, write back. If `title` changed, ALSO rename the file to match the new slug (preserve id prefix; recompute slug per Phase 2 Step 4 rules). Apply Phase 12. Output:

- For non-title changes: `Updated #{id}: {field} = {value}.`
- For title changes: `Updated #{id}: title = {value}. Renamed to {new-filename}.`

---

## Phase 8: Refine

Triggered by `/mytasks refine <id>`. Interactive — pre-filled walk through all editable fields.

### Step 1: Locate the item

Use Phase 6 normalize-and-locate. If not found, error and exit.

### Step 2: Walk through fields per `_shared/interactive-prompts.md`

Same field order as Phase 3, but with title added as the first prompt and each field pre-filled with its current value:

1. **`title`** — free string. Default = current title.
2. **`importance`** — enum. Default = current.
3. **`type`** — enum. Default = current.
4. **`workstream`** — free string. Default = current.
5. **`due`** — date input. Default = current.
6. **`people`** — comma-separated. Default = current. For each token, run `/people find`; on multi-match or no-match, present the same three-option flow as Phase 3 Step 2.
7. **`checkin`** — enum. Default = current. If user picks a non-`none` cadence, also prompt for whether to recompute `next_checkin: today + cadence` (default yes; only useful if the cadence is changing).

`<enter>` keeps current; explicit value replaces; `clear` (for list fields) empties.

### Step 3: Write back

Replace each field with the new value (only if changed). If `title` changed, rename the file (same logic as Phase 7 Step 4). Set `updated:` to today.

### Step 4: Regenerate INDEX, report

Apply Phase 12. Output: `Refined #{id}.` (Or `Refined #{id}. Renamed to {new-filename}.` if title changed.)

---

## Phase 9: Done / Drop Shortcuts

Triggered by `/mytasks done <id> [note]` (status → completed) or `/mytasks drop <id> [reason]` (status → dropped).

### Step 1: Locate the item

Use Phase 6 normalize-and-locate. If not found, error and exit.

### Step 2: Update frontmatter

- `status`: `completed` (for `done`) or `dropped` (for `drop`).
- `completed`: today's ISO date.
- `updated`: today's ISO date.

### Step 3: Append note to body (if `[note]` / `[reason]` provided)

Append to `## Notes` (creating the section at the END of the body if absent):

- For `done`: `- {today}: {note}`
- For `drop`: `- {today}: dropped — {reason}`

If no note/reason was provided, skip this step (no body change).

### Step 4: Regenerate INDEX, report

Apply Phase 12 (the item is now excluded from INDEX since status is completed/dropped).

Output:
- For `done`: `Completed #{id}: "{title}".`
- For `drop`: `Dropped #{id}: "{title}".`

---

## Phase 10: Check-in

Triggered by `/mytasks checkin <id> [note]`. Append a check-in entry, advance `next_checkin`, prompt status transition if `waiting`.

### Step 1: Locate the item

Use Phase 6 normalize-and-locate. If not found, error and exit.

### Step 2: Append to `## Check-ins` body section

If `## Check-ins` section exists, append a new line at the end of the section:
`- {today}: {note}` (or `- {today}:` with empty trailing note if no note arg).

If `## Check-ins` does not exist, create it at the end of the body:
```markdown

## Check-ins
- {today}: {note}
```

### Step 3: Advance `next_checkin`

If `checkin:` cadence is set:
| Cadence | New `next_checkin` |
|---|---|
| `daily` | today + 1 day |
| `weekly` | today + 7 days |
| `biweekly` | today + 14 days |
| `monthly` | today + 1 calendar month, clamped to the last day of the target month if necessary (e.g., Jan 31 → Feb 28; Aug 31 → Sep 30) |
| `none` | leave `next_checkin:` blank |

If `checkin:` is not set or empty, leave `next_checkin:` unchanged (the user hasn't enabled a cadence).

### Step 4: Status transition prompt

If `status:` was `waiting` BEFORE this checkin, prompt the user:

```
Move to in-progress? [Y/n]
```

<!-- defer-only: ambiguous -->
(Use `_shared/interactive-prompts.md` primary path with a yes/no choice if `AskUserQuestion` is available; otherwise plain text prompt.)

- `Y` (or `<enter>` for default) → set `status: in-progress`.
- `n` → leave status as `waiting`.

For other statuses (`pending`, `in-progress`, `completed`, `dropped`), do NOT prompt; status stays.

### Step 5: Update `updated`, regenerate INDEX, report

Set `updated:` to today. Apply Phase 12.

Output (without status transition):
```
Checked in on #{id}. Next checkin: {next_checkin or "not scheduled"}.
```

Output (with status transition from waiting → in-progress):
```
Checked in on #{id}. Status: waiting → in-progress. Next checkin: {next_checkin or "not scheduled"}.
```

---

## Phase 11: Archive

Triggered by `/mytasks archive [--quarter Q]`.

### Step 1: Determine target quarter

If `--quarter <Q>` is provided (format `YYYY-QN`, validated via regex `^[0-9]{4}-Q[1-4]$`), use it for the destination directory for ALL eligible items.

Otherwise, derive per-item: target = `{year-of-updated}-Q{quarter-of-updated}` based on the item's `updated:` date. Quarter math: month 1-3 → Q1, 4-6 → Q2, 7-9 → Q3, 10-12 → Q4.

### Step 2: Collect eligible items

For each file in `~/.pmos/tasks/items/*.md`:
- Parse frontmatter.
- Eligible if `status` in (`completed`, `dropped`) AND age (today - `updated:`) > 30 days.

### Step 3: Move

For each eligible item:
- Create `~/.pmos/tasks/archive/{quarter}/` if absent (`mkdir -p`).
- Move `~/.pmos/tasks/items/{file}` → `~/.pmos/tasks/archive/{quarter}/{file}` (use `mv`; if `~/.pmos/` is a git repo, prefer `git mv` to preserve history).

### Step 4: Regenerate INDEX, report

Apply Phase 12 (archive items are already excluded from INDEX, so this is mostly a no-op refresh — but ensures `Last regenerated:` is updated).

Output:
- If N > 0: `Archived {N} items: {comma-separated list of "#{id} → {quarter}"}.`
- If N = 0: `Archived 0 items: nothing eligible.`
