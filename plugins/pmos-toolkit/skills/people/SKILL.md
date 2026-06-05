---
name: people
description: Shared person/contact directory for the pmos-toolkit. Stores handle, name, designation, role, working relationship, team, email, workstreams, aliases at ~/.pmos/people/. Consumed by /mytasks (and future people-aware skills). Use when the user says "add a person", "find someone", "who is X", "list people", or "/people".
user-invocable: true
argument-hint: "[ | add <name> | list [filters] | show <handle-or-name> | find <text> | set <handle> <field>=<value> | refine <handle> | rebuild-index] [--non-interactive | --interactive]"
---

# People

A shared person/contact directory. Toolkit-wide entity store at `~/.pmos/people/`. Consumed by `/mytasks` (and future people-aware skills — 1:1 notes, meeting prep, stakeholder tracking).

**Announce at start:** "Using the people skill to {list|add|find|show|...}."

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:
- **No interactive prompt tool:** follow `_shared/interactive-prompts.md` fallback path — one question at a time as plain text with numbered responses.
- **No subagents:** sequential single-agent operation.

## References

- `schema.md` — record file shape, enum values, `INDEX.md` format (binds `_shared/tracker-crudl.md`)
- `_shared/tracker-crudl.md` — shared tracker contract (`created`/`updated`/`schema_version`, INDEX regenerability; handle-keyed, no archive)
- `lookup.md` — fuzzy-match algorithm, handle derivation rules
- `_shared/interactive-prompts.md` — interactive prompting protocol

---

## Phase 0: Subcommand Routing

Parse the user's argument to determine the subcommand.

| Argument shape | Subcommand |
|---|---|
| empty | Phase 1 (show INDEX.md) |
| `add <name>` | Phase 3 (proactive create — interactive) |
| `list [flags]` | Phase 5 (filtered list) |
| `show <handle-or-name>` | Phase 4 (render record) |
| `find <text>` | Phase 2 (fuzzy-match lookup) |
| `set <handle> <field>=<value>` | Phase 6 (single-field edit) |
| `refine <handle>` | Phase 7 (interactive multi-field refine) |
| `rebuild-index` | Phase 8 (regenerate INDEX.md) |

Unknown verbs error: `Unknown subcommand '{verb}'. Run /people for the default list, or see argument hint for valid forms.`

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

## Phase 1: Show INDEX

Triggered by `/people` with no arguments.

### Step 1: Resolve `~/.pmos/people/`

If `~/.pmos/people/INDEX.md` does not exist (or `~/.pmos/people/` is missing entirely), output:

`No people yet. Add a person with /people add <name>.`

Then exit.

### Step 2: Validate freshness

Compare `INDEX.md`'s `Last regenerated:` date against the most recent mtime of any `~/.pmos/people/*.md` (excluding `INDEX.md` itself). If any record is more recent, regenerate INDEX.md (apply Phase 8) before rendering.

### Step 3: Render

Output the contents of `~/.pmos/people/INDEX.md` to the user.

---

## Phase 8: Rebuild Index

Triggered by `/people rebuild-index`. Also invoked internally by Phases 3, 6, 7 after any write.

### Step 1: Read records

Glob `~/.pmos/people/*.md` (excluding `INDEX.md`). For each, parse frontmatter. Skip files with malformed frontmatter (emit a one-line warning per skip; do not abort).

### Step 2: Sort

Sort by `name` ascending (case-insensitive).

### Step 3: Write INDEX.md

Overwrite `~/.pmos/people/INDEX.md` with the format defined in `schema.md` (### INDEX.md format section):

```markdown
# People

Last regenerated: {today ISO date}

| handle | name | designation | role | working_relationship | team | email |
|--------|------|-------------|------|----------------------|------|-------|
| {handle} | {name} | {designation or empty} | {role or empty} | {working_relationship or empty} | {team or empty} | {email or empty} |
```

Empty optional fields render as empty cells (no `null`, no dashes).

### Step 4: Report

If invoked directly (Phase 8 entered as `rebuild-index`): `Regenerated INDEX.md: {count} people.`
If invoked from another phase: silent on success, warn on failure.

---

## Phase 2: Fuzzy-Match Find

Triggered by `/people find <text>`. Read-only lookup. Used by `/mytasks` capture and by users directly.

Algorithm and tier definitions: see `lookup.md`.

### Step 1: Resolve and read

If `~/.pmos/people/` does not exist or contains no records, output: `No people in directory. Add one with /people add <name>.` Exit.

Otherwise, glob `~/.pmos/people/*.md` (excluding `INDEX.md`). Parse frontmatter for each. Skip malformed files with a one-line warning.

### Step 2: Match in priority order

Apply the 5-tier match algorithm from `lookup.md`. Stop at the first tier that produces matches; do not collect from lower tiers if a higher tier hit.

For each record, evaluate match tiers in order:
1. Exact handle (case-insensitive on `handle:`).
2. Exact alias (case-insensitive on any entry in `aliases:`).
3. Exact name (case-insensitive on `name:`).
4. Substring on handle / name / aliases.
5. Initials of `name:` (only if input length ≤ 3 AND input is all letters).

Within the matching tier, sort by `updated:` desc; break ties alphabetically by handle.

### Step 3: Render

- **0 matches:** `No matches for '{input}'.`
- **1 match:** `1 match: {handle} ({name}){match-note}.`
  - `{match-note}` is empty for tier 1, ` — matched alias '{alias}'` for tier 2, omitted for tier 3, ` — substring match` for tier 4, ` — initials match` for tier 5.
- **N matches:**
  ```
  {N} matches:
    {handle} ({name}){match-note}
    ...
  ```

### Step 4: Caller integration

When `find` is invoked programmatically by `/mytasks` (not a user-typed command), the caller reads the rendered output and parses out handles. The output format above is contract — do not change without updating callers.

---

## Phase 3: Proactive Create (`add`)

Triggered by `/people add <name>`. Interactive — collects rich attributes upfront.

### Step 1: Derive handle

Apply the handle derivation rules from `lookup.md` against the provided `<name>`:
1. Tokenize on whitespace, lowercase, drop pure-punctuation tokens.
2. Single-token name: try `<firstname>`, then `<firstname>-2`, etc.
3. Multi-token name: try `<firstname>-<lastinitial>`, then `<firstname>-<lastname>`, then `<firstname>-<lastname>-N`.

A "collision" means a file with that handle already exists at `~/.pmos/people/{handle}.md`.

### Step 2: Collect attributes via `_shared/interactive-prompts.md`

Ask in this order, ONE field at a time per the shared protocol:

1. **`designation`** — free string. Prompt: `Designation? (formal title, e.g., 'VP Engineering')`. Skippable.
2. **`role`** — free string. Prompt: `Role? (informal day-to-day, e.g., 'Eng Manager')`. Skippable.
3. **`working_relationship`** — enum. Prompt: `Working relationship?` Options: `boss`, `direct-report`, `peer`, `team-member`, `stakeholder`, `external`, `other`. Skippable (no default).
4. **`team`** — free string. Prompt: `Team?`. Skippable.
5. **`email`** — free string. Prompt: `Email?`. Skippable.
6. **`workstreams`** — comma-separated list. Prompt: `Workstreams? (comma-separated slugs from ~/.pmos/workstreams/)`. Skippable.
7. **`aliases`** — comma-separated list. Prompt: `Aliases? (comma-separated short forms for fuzzy match)`. Skippable.

### Step 3: Write the record file

Path: `~/.pmos/people/{handle}.md`.

Frontmatter (skipped fields are written as bare keys with no value, e.g., `email:` not absent):

```yaml
---
handle: {derived-handle}
name: {original name argument}
designation: {value or empty}
role: {value or empty}
working_relationship: {value or empty}
team: {value or empty}
email: {value or empty}
workstreams: [{values}]   # written as YAML list, even if single item; empty list as []
aliases: [{values}]
created: {today}
updated: {today}
---
```

No body section is auto-written. The user can add `## Notes` later via direct file edit or via `/people refine`.

### Step 4: Regenerate INDEX

Apply Phase 8 (rebuild-index) inline. If regeneration fails, the record file is still written — emit a warning suggesting `/people rebuild-index`, but DO NOT roll back the record write.

### Step 5: Report

Output: `Added {handle} ({name}).`

### Reactive create entry point (called by `/mytasks`, not user-invoked)

When `/mytasks` rich-capture hits an unknown person and the user picks "(a) create new person 'X'", `/mytasks` invokes a minimal create variant of this phase that:
- Skips Step 2 (no prompts).
- Sets `name:` to the disambiguated name.
- Sets `aliases:` to `[<original-token>]` (e.g., `[sarah]` if the user wrote `@sarah`).
- All other fields absent.
- Returns the derived handle to the caller.

This entry point has no user-facing slash command — `/mytasks` invokes it directly via shared instruction reference.

---

## Phase 4: Show Record

Triggered by `/people show <handle-or-name>`.

### Step 1: Resolve

If `<handle-or-name>` looks like a kebab-case handle (lowercase + hyphens only) AND `~/.pmos/people/{input}.md` exists, use it directly.

Otherwise, apply Phase 2 (find) to the input. Then:
- **0 matches:** `No matches for '{input}'. Run /people for the full list.`
- **1 match:** proceed with that handle.
- **N matches:** `Multiple matches: {comma-separated handles}. Run /people show <handle> with the exact handle.`

### Step 2: Render

Output the file contents verbatim, fenced as markdown.

---

## Phase 5: Filtered List

Triggered by `/people list [flags]`.

### Recognized flags (all optional, all combinable; AND semantics)

| Flag | Effect |
|---|---|
| `--workstream <slug>` | Records whose `workstreams:` contains `<slug>` |
| `--relationship <enum>` | Records whose `working_relationship:` equals the enum value |

### Step 1: Read records

Glob `~/.pmos/people/*.md` (excluding `INDEX.md`). Parse frontmatter for each. Skip malformed files with a one-line warning.

### Step 2: Validate flag values

For `--relationship`: must be in the enum. Reject with `Unknown relationship '{value}'. Allowed: boss, direct-report, peer, team-member, stakeholder, external, other.`

For `--workstream`: any string accepted (workstreams are free-text).

### Step 3: Filter and sort

Apply filters with AND semantics. Sort survivors by `name` ascending.

### Step 4: Render

Render the same table as INDEX.md (columns: handle, name, designation, role, working_relationship, team, email).

If 0 matches: `No people match.`

---

## Phase 6: Set Field

Triggered by `/people set <handle> <field>=<value>`.

### Step 1: Locate the record

`~/.pmos/people/{handle}.md` must exist. If not: `No record with handle '{handle}'. Run /people find {handle} for suggestions.`

### Step 2: Parse and validate field name

Allowed editable fields: `name`, `designation`, `role`, `working_relationship`, `team`, `email`, `workstreams`, `aliases`.

Disallowed (skill-managed): `handle`, `created`, `updated`. Reject: `Field '{field}' cannot be set directly. The skill manages it.`

Unknown fields: `Field '{field}' is not recognized. Allowed: {comma-separated list}.`

### Step 3: Validate value

| Field | Validation |
|---|---|
| `working_relationship` | Must be in enum |
| `workstreams`, `aliases` | Comma-separated; written as YAML list. Empty value clears the list. |
| `name`, `designation`, `role`, `team`, `email` | Free string. Empty value clears the field. |

On enum violation: `Unknown {field} '{value}'. Allowed: {comma-separated list}.` No write.

### Step 4: Edit and report

Load record, update only the named field, set `updated:` to today, write back. Apply Phase 8 (regenerate INDEX). Output: `Updated {handle}: {field} = {value}.`

---

## Phase 7: Refine

Triggered by `/people refine <handle>`. Interactive — pre-filled walk through all editable fields.

### Step 1: Locate the record

`~/.pmos/people/{handle}.md` must exist. If not: `No record with handle '{handle}'. Run /people find {handle} for suggestions.`

### Step 2: Walk through fields per `_shared/interactive-prompts.md`

Same field order as Phase 3 (designation → role → working_relationship → team → email → workstreams → aliases). Each prompt shows the current value as default; `<enter>` keeps it; explicit new value replaces; `clear` (for list fields) empties.

### Step 3: Write back

Replace each field with the new value (only if changed). Set `updated:` to today. Body is untouched.

### Step 4: Regenerate INDEX, report

Apply Phase 8. Output: `Refined {handle}.`
