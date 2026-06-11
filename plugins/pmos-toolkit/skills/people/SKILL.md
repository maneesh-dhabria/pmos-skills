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

- `schema.md` — record file shape, **single source for enum values**, `INDEX.md` format (binds `_shared/tracker-crudl.md`)
- `_shared/tracker-crudl.md` — shared tracker contract (`created`/`updated`/`schema_version` §3, INDEX regenerability §5; handle-keyed, no archive)
- `lookup.md` — fuzzy-match algorithm, handle derivation rules, caller behavior on multi-match
- `_shared/interactive-prompts.md` — interactive prompting protocol

---

## Phase 0: Subcommand Routing {#routing}

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
| (any other free text) | Phase 2 — treat as `find <text>` |

**Route queries to `find`, never to a write.** Free text matching no verb is a lookup: strip leading query scaffolding ("who is", "who's", "do I know") and run `find` on the rest — `find` is read-only, so the fall-through is safe. A query never creates or edits a record; `add` is the only create path.

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

## Phase 1: Show INDEX {#show-index}

Triggered by `/people` with no arguments.

1. If `~/.pmos/people/INDEX.md` does not exist (or `~/.pmos/people/` is missing entirely), output `No people yet. Add a person with /people add <name>.` and exit.
2. Freshness check per `_shared/tracker-crudl.md` §5: if any `~/.pmos/people/*.md` (excluding `INDEX.md` itself) has a newer mtime than INDEX's `Last regenerated:` date, regenerate (`#rebuild-index`) before rendering.
3. Output the contents of `~/.pmos/people/INDEX.md` to the user.

---

## Phase 8: Rebuild Index {#rebuild-index}

Triggered by `/people rebuild-index`. Defined early because every write phase (3, 6, 7) applies it.

1. Glob `~/.pmos/people/*.md` (excluding `INDEX.md`); parse frontmatter. Skip files with malformed frontmatter (one-line warning per skip; do not abort).
2. Overwrite `~/.pmos/people/INDEX.md` with the exact format, sort (`name` ascending, case-insensitive), and columns defined in `schema.md` "INDEX.md format" (empty cells per `_shared/tracker-crudl.md` §5).
3. Report — if invoked directly: `Regenerated INDEX.md: {count} people.` If invoked from another phase: silent on success, warn on failure.

---

## Phase 2: Fuzzy-Match Find {#find}

Triggered by `/people find <text>` (or query-shaped free text per `#routing`). Read-only lookup. Used by `/mytasks` capture and by users directly.

1. If `~/.pmos/people/` does not exist or contains no records, output: `No people in directory. Add one with /people add <name>.` Exit.
2. Glob `~/.pmos/people/*.md` (excluding `INDEX.md`); parse frontmatter; skip malformed files with a one-line warning.
3. Apply the 5-tier match algorithm in `lookup.md` — stop at the first tier that produces matches; within-tier ordering per `lookup.md` (`updated:` desc, then handle).
4. Render:
   - **0 matches:** `No matches for '{input}'.`
   - **1 match:** `1 match: {handle} ({name}){match-note}`
   - **N matches:**
     ```
     {N} matches:
       {handle} ({name}){match-note}
       ...
     ```

**The caller contract is exactly this shape:** the match count first, then each match as `{handle} ({name})`, one per line. `/mytasks` parses handles out of that shape — do not change it without updating callers. `{match-note}` is an advisory why-it-matched annotation (e.g., ` — matched alias '{alias}'`, ` — substring match`, ` — initials match`; omit for exact handle/name matches); callers never parse it.

---

## Phase 3: Proactive Create (`add`) {#add}

Triggered by `/people add <name>`. Interactive — collects rich attributes upfront.

### Step 1: Derive handle

Apply the handle derivation rules in `lookup.md` (collision ladder included) against the provided `<name>`.

### Step 2: Collect attributes via `_shared/interactive-prompts.md`

Ask in this order, ONE field at a time per the shared protocol:

1. **`designation`** — free string. Prompt: `Designation? (formal title, e.g., 'VP Engineering')`. Skippable.
2. **`role`** — free string. Prompt: `Role? (informal day-to-day, e.g., 'Eng Manager')`. Skippable.
3. **`working_relationship`** — enum per `schema.md`. Prompt: `Working relationship?`. Skippable (no default).
4. **`team`** — free string. Prompt: `Team?`. Skippable.
5. **`email`** — free string. Prompt: `Email?`. Skippable.
6. **`workstreams`** — comma-separated list. Prompt: `Workstreams? (comma-separated slugs from ~/.pmos/workstreams/)`. Skippable.
7. **`aliases`** — comma-separated list. Prompt: `Aliases? (comma-separated short forms for fuzzy match)`. Skippable.

### Step 3: Write the record file

Write `~/.pmos/people/{handle}.md` with the frontmatter shape in `schema.md`. Skipped fields are written as bare keys with no value (e.g., `email:`, not absent); list fields as YAML lists (empty list as `[]`). No body section is auto-written — `schema.md`: the skill never writes the body; users add `## Notes` via direct edit or `/people refine`.

### Step 4: Regenerate INDEX, report

Apply `#rebuild-index` inline. If regeneration fails, the record file is still written — warn suggesting `/people rebuild-index`, but DO NOT roll back the record write. Output: `Added {handle} ({name}).`

### Reactive create entry point (called by `/mytasks`, not user-invoked)

When `/mytasks` rich-capture hits an unknown person and the user picks "(a) create new person 'X'", `/mytasks` invokes a minimal create variant of this phase that skips Step 2 (no prompts), writes the record per `schema.md` "Defaults on reactive create" (`name:` from the disambiguated name; `aliases:` seeded with the original token, e.g. `[sarah]` for `@sarah`; all other fields absent), and returns the derived handle to the caller.

This entry point has no user-facing slash command — `/mytasks` invokes it directly via shared instruction reference.

---

## Phase 4: Show Record {#show}

Triggered by `/people show <handle-or-name>`.

### Step 1: Resolve

If `<handle-or-name>` looks like a kebab-case handle (lowercase + hyphens only) AND `~/.pmos/people/{input}.md` exists, use it directly.

Otherwise, apply `#find` to the input. Then:
- **0 matches:** `No matches for '{input}'. Run /people for the full list.`
- **1 match:** proceed with that handle.
- **N matches:** `Multiple matches: {comma-separated handles}. Run /people show <handle> with the exact handle.`

### Step 2: Render

Output the file contents verbatim, fenced as markdown.

---

## Phase 5: Filtered List {#list}

Triggered by `/people list ...` or any list-shaped request. Filters are inferred from the request ("people on platform-q3" ⇒ workstream filter; "list my direct reports" ⇒ relationship filter); an explicit flag overrides inference. Filters are optional and combinable with AND semantics. The flag spellings stay parsed:

<!-- nl-sugar -->
- `--workstream <slug>` — records whose `workstreams:` contains `<slug>` (free-text; any string accepted)
<!-- nl-sugar -->
- `--relationship <enum>` — records whose `working_relationship:` equals the value; enum per `schema.md`

1. Glob `~/.pmos/people/*.md` (excluding `INDEX.md`); parse frontmatter; skip malformed files with a one-line warning.
2. Validate relationship values against the `schema.md` enum. Reject with `Unknown relationship '{value}'. Allowed: boss, direct-report, peer, team-member, stakeholder, external, other.`
3. Filter (AND semantics); sort survivors by `name` ascending.
4. Render the same table as INDEX.md (columns per `schema.md`). If 0 matches: `No people match.`

---

## Phase 6: Set Field {#set}

Triggered by `/people set <handle-or-text> <field>=<value>`.

### Step 1: Resolve the record

Resolve as in `#show` Step 1 (exact handle file → use directly; otherwise `#find`), but **refuse instead of proceeding on multi-match** — disambiguating writes per `lookup.md` "Caller behavior" (otherwise edits go to the wrong record):
- **0 matches:** `No matches for '{input}'. Run /people for the full list.`
- **1 match:** proceed with that handle.
- **N matches:** refuse with the ranked list: `Multiple matches: {comma-separated handles}. Run /people set <handle> ... with the exact handle.` No write.

### Step 2: Parse and validate field name

Allowed editable fields: `name`, `designation`, `role`, `working_relationship`, `team`, `email`, `workstreams`, `aliases`.

Disallowed (skill-managed): `handle`, `created`, `updated`. Reject: `Field '{field}' cannot be set directly. The skill manages it.`

Unknown fields: `Field '{field}' is not recognized. Allowed: {comma-separated list}.`

### Step 3: Validate value

- `working_relationship` — enum per `schema.md`. On violation: `Unknown {field} '{value}'. Allowed: {comma-separated list}.` No write.
- `workstreams`, `aliases` — comma-separated; written as YAML list. Empty value clears the list.
- `name`, `designation`, `role`, `team`, `email` — free string. Empty value clears the field.

### Step 4: Edit and report

Load record, update only the named field, set `updated:` to today, write back. Apply `#rebuild-index`. Output: `Updated {handle}: {field} = {value}.`

---

## Phase 7: Refine {#refine}

Triggered by `/people refine <handle-or-text>`. Interactive — pre-filled walk through all editable fields.

1. Resolve the record exactly as in `#set` Step 1 (fuzzy resolve; refuse with the ranked list on multi-match).
2. Walk the same field order as `#add` Step 2 (designation → role → working_relationship → team → email → workstreams → aliases), each prompt pre-filled with the current value. Refine-flow defaults and `<enter>`/`clear` semantics per `_shared/interactive-prompts.md`.
3. Replace each field with the new value (only if changed). Set `updated:` to today. Body is untouched.
4. Apply `#rebuild-index`. Output: `Refined {handle}.`
