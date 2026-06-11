---
name: mytasks
description: Persistent personal task tracker — distinct from Claude Code's session-scoped TaskCreate/TaskList tools. Use for real-world tasks (LNO importance, due dates, people, check-ins, workstream). Lives at ~/.pmos/tasks/. Use when the user says "add a task", "what's on my plate", "tasks for sarah", "what's due this week", "check in on X", "/mytasks", or names a task to capture.
user-invocable: true
argument-hint: "[ | <text> | add <text> | list [filters] | today | week | overdue | waiting | checkins | for <handle> | in <workstream> | show <id> | set <id> <field>=<value> | refine <id> | done <id> [note] | drop <id> [reason] | checkin <id> [note] | archive [--quarter <YYYY-QN>] | rebuild-index] [--non-interactive | --interactive]"
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

- `schema.md` — item file shape, **single source for enum values**, `INDEX.md` format (binds `_shared/tracker-crudl.md`)
- `_shared/tracker-crudl.md` — shared tracker contract (id/slug §2, `created`/`updated`/`schema_version` §3, INDEX regenerability §5, archive §6)
- `inference-heuristics.md` — quick-capture keyword + date + person + workstream parsing rules
- `output-formats.md` — exact capture report templates and unknown-person prompt copy
- `_shared/interactive-prompts.md` — interactive prompting protocol (used by `add`, `refine`, unknown-person flow)
- Sibling skill `/people` — fuzzy-match person lookup via `/people find`

---

## Phase 0: Subcommand Routing {#routing}

Parse the user's argument to determine the subcommand. Be liberal with the form — both `/mytasks add foo` and `/mytasks "foo"` work for capture.

**Route by intent, not just first token.** Text that reads as a question or a view request ("what's due this week", "what's on my plate", "show waiting tasks") routes to the matching view (`#default-view`, `#list`, `#named-views`) — it is never captured as a task. Only text that reads like a thing-to-do is captured. When genuinely unsure, capture (per the friction principle in `#quick-capture`) but say which view the user may have meant.

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
| (any other to-do-shaped free text) | Phase 2 (quick capture) |

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

## Phase 1: Default Daily View {#default-view}

Triggered by `/mytasks` with no arguments.

1. If `~/.pmos/tasks/INDEX.md` does not exist (or `~/.pmos/tasks/` is missing entirely), output `No tasks yet. Capture one with /mytasks <text> or /mytasks add <text>.` and exit.
2. Freshness check per `_shared/tracker-crudl.md` §5: if any `~/.pmos/tasks/items/*.md` mtime is newer than INDEX's `Last regenerated:` date, regenerate (`#rebuild-index`) before rendering.
3. Output the contents of `~/.pmos/tasks/INDEX.md` verbatim (it is already grouped per `schema.md`). If it contains zero items, output `No active tasks. Capture one with /mytasks <text>.`

---

## Phase 12: Rebuild Index {#rebuild-index}

Triggered by `/mytasks rebuild-index`. Defined early because every mutating subcommand (Phases 2, 3, 7, 8, 9, 10, 11) applies it after writing.

1. Glob `~/.pmos/tasks/items/*.md`; parse frontmatter. Skip files with malformed frontmatter (one-line warning per skip; do not abort).
2. Exclude `completed`/`dropped` items and everything under `archive/` (the status-exclusion binding in `schema.md`).
3. Overwrite `~/.pmos/tasks/INDEX.md` with the exact format, grouping, and sort defined in `schema.md` "INDEX.md format" (importance buckets; `due` asc, no-due last → `updated` desc; missing `importance:` defaults to `neutral`; empty buckets keep their header + column row).
4. Report — if invoked directly: `Regenerated INDEX.md: {N active items} ({completed_excluded} completed/dropped excluded).` If invoked from another phase: silent on success, warn on failure.

---

## Phase 2: Quick Capture (`<bare text>`) {#quick-capture}

Triggered by `/mytasks <text>` where `<text>` does not start with a recognized verb (see the `#routing` table) and reads like a thing-to-do.

**This phase MUST complete in a single tool-call sequence with NO clarifying questions.** Wrong inference is acceptable; capture friction is not.

1. Ensure `~/.pmos/tasks/items/` exists (`mkdir -p`).
2. Allocate id per `_shared/tracker-crudl.md` §2 — scan both `items/` and `archive/**/` for the max `^([0-9]{4})-` filename prefix; empty store → `0001`.
3. Apply `inference-heuristics.md` in order: **type** (keyword; fallback `execution` — the keyword is NOT stripped from the title), **due** (natural-language date; matched substring IS stripped), **people** (`@handle` tokens via `/people find` — resolved tokens stripped and added to `people:`; multi-match and no-match tokens stay in the title, collected for the report), **workstream** (current repo's `.pmos/settings.yaml`).
4. Build the slug from the final title per `_shared/tracker-crudl.md` §2; prefer truncating at a hyphen boundary.
5. Write `~/.pmos/tasks/items/{id}-{slug}.md` — frontmatter only, no body, per `schema.md` "Defaults on quick-capture". Optional fields with no value are written as bare keys (e.g., `start:`), not omitted.
6. Regenerate INDEX inline (`#rebuild-index`). If regeneration fails, the item file is still written — warn suggesting `/mytasks rebuild-index`, but DO NOT roll back.
7. Report per `output-formats.md` "Quick-capture report" — one line with id, type, importance, final title, and any inferred fields; one indented `⚠ unresolved:` line per unresolved `@token` with the exact fix command.

---

## Phase 3: Rich Capture (`add`) {#rich-capture}

Triggered by `/mytasks add <text>`. Interactive — collects rich attributes upfront via `_shared/interactive-prompts.md`, ONE field at a time.

1. Resolve `items/` and allocate id as in `#quick-capture` steps 1–2.
2. Prompt in this order (enum values per `schema.md`):
   1. **`importance`** — enum; default `neutral`.
   2. **`type`** — enum; default = value inferred from `<text>` per `inference-heuristics.md`, else `execution`.
   3. **`workstream`** — free string; default from current repo's `.pmos/settings.yaml` `workstream:` key if present. Skippable.
   4. **`due`** — date input; parse per `inference-heuristics.md` date rules. Skippable.
   5. **`people`** — comma-separated names or handles. For each token (strip any `@`), call `/people find`: single match → add the handle silently; multi-match or no-match → present the disambiguation prompt per `output-formats.md` "Unknown-person prompts" (no-match option (a) invokes `/people`'s reactive create — `/people` Phase 3 reactive entry point — and adds the returned handle; "skip" leaves the token unresolved, collected for the report).
   6. **`checkin`** — enum; default `none`. Non-`none` cadence also sets `next_checkin: today + cadence` per `#checkin` cadence math.
3. Build the slug from `<text>` and write the item file as in `#quick-capture` steps 4–5, with all collected values (skipped fields as bare keys).
4. Regenerate INDEX (`#rebuild-index`); same fail-soft semantics as `#quick-capture`.
5. Report per `output-formats.md` "Rich-capture report".

---

## Phase 4: Filtered List {#list}

Triggered by `/mytasks list ...` or any read-shaped request. Filters are inferred from the request ("show waiting tasks" ⇒ status waiting; "tasks labeled reading" ⇒ label reading); an explicit flag overrides inference. All filters are optional and combinable with AND semantics. The flag spellings stay parsed:

<!-- nl-sugar -->
- `--status <s>` · `--type <t>` · `--importance <i>` — enum filters; values per `schema.md`
<!-- nl-sugar -->
- `--workstream <slug>` · `--person <handle>` · `--label <name>` — membership filters
<!-- nl-sugar -->
- `--due <today|this-week|overdue|next-30>` — date window on `due:` · `--checkin-due` — `next_checkin <= today`
<!-- nl-sugar -->
- `--include-done` — include `completed`/`dropped` (excluded by default)

1. **Source.** INDEX.md answers most filters; person/label filters and `--include-done` need the item files (`--include-done` also globs `archive/**/*.md`).
2. **Validate** filter values against the enums in `schema.md`. Reject unknown values with the allowed list, e.g. `Unknown status 'open'. Allowed: pending, in-progress, waiting, completed, dropped.` No render.
3. **Date windows:** `today` → `due == today` · `this-week` → `today <= due <= today + 7` · `overdue` → `due < today` AND `status` NOT in (completed, dropped) · `next-30` → `today <= due <= today + 30`.
4. **Render** a flat markdown table (no grouping), sorted `due` asc (no-due last) → `updated` desc. Columns: `id | type | status | due | next_checkin | title | workstream`; add a `people` or `labels` column when filtering on it. Zero matches: `No items match.`

---

## Phase 5: Named Views {#named-views}

Each named view dispatches to `#list` with the equivalent filters; output is identical.

| Named view | Equivalent `list` invocation |
|---|---|
| `/mytasks today` | `list --due today` |
| `/mytasks week` | `list --due this-week` |
| `/mytasks overdue` | `list --due overdue` |
| `/mytasks waiting` | `list --status waiting` |
| `/mytasks checkins` | `list --checkin-due` |
| `/mytasks for <handle>` | `list --person <handle>` |
| `/mytasks in <workstream>` | `list --workstream <workstream>` |

---

## Phase 6: Show Item {#show}

Triggered by `/mytasks show <id>`.

1. Normalize the id: accept `42`, `0042`, or extra spaces; zero-pad to 4 digits.
2. Search `~/.pmos/tasks/items/{id}-*.md`, then `~/.pmos/tasks/archive/**/{id}-*.md`.
3. Still not found → list existing items sharing the digit prefix and output: `No item with id {id}. Closest matches by prefix: {comma-separated list or "(none)"}. Run /mytasks list to see all items.`
4. Output the file contents verbatim, fenced as markdown.

---

## Phase 7: Set Field {#set}

Triggered by `/mytasks set <id> <field>=<value>`.

1. Locate the item via `#show` normalize-and-locate; if not found, error and exit (same message).
2. Validate the field name. Editable: `title`, `type`, `importance`, `status`, `workstream`, `people`, `labels`, `links`, `due`, `start`, `checkin`, `next_checkin`, `completed`. Skill-managed (`id`, `created`, `updated`) → `Field '{field}' cannot be set directly. The skill manages it.` Unknown → `Field '{field}' is not recognized. Allowed: {comma-separated list}.`
3. Validate the value:
   - Enum fields (`type`, `importance`, `status`, `checkin`) — against `schema.md` enums. On violation: `Unknown {field} '{value}'. Allowed: {comma-separated list}.` No write.
   - Date fields (`due`, `start`, `next_checkin`, `completed`) — ISO `YYYY-MM-DD`, OR natural-language date per `inference-heuristics.md`, OR empty (to clear).
   - List fields (`people`, `labels`, `links`) — comma-separated; written as YAML list. For `people`, each token is a literal handle (NOT fuzzy-matched) — the user types exact handles when using `set`.
   - Free strings (`title`, `workstream`).
4. Load the item, update only the named field, set `updated:` to today, write back. If `title` changed, ALSO rename the file to the new slug (preserve id prefix; slug rules as in `#quick-capture` step 4). Apply `#rebuild-index`. Output: `Updated #{id}: {field} = {value}.` — appending ` Renamed to {new-filename}.` on title change.

---

## Phase 8: Refine {#refine}

Triggered by `/mytasks refine <id>`. Interactive — pre-filled walk through all editable fields.

1. Locate the item via `#show` normalize-and-locate; if not found, error and exit.
2. Walk the same field order as `#rich-capture` step 2, with **`title`** added as the first prompt and each field pre-filled with its current value. Refine-flow defaults and `<enter>`/`clear` semantics per `_shared/interactive-prompts.md`. For `people`, resolve each token via `/people find` with the same disambiguation flow as `#rich-capture`. For `checkin`, a non-`none` cadence also prompts whether to recompute `next_checkin: today + cadence` (default yes).
3. Write back only changed fields; rename the file if `title` changed (as in `#set` step 4); set `updated:` to today.
4. Apply `#rebuild-index`. Output: `Refined #{id}.` (plus ` Renamed to {new-filename}.` if title changed).

---

## Phase 9: Done / Drop Shortcuts {#done-drop}

Triggered by `/mytasks done <id> [note]` (status → completed) or `/mytasks drop <id> [reason]` (status → dropped).

1. Locate the item via `#show` normalize-and-locate; if not found, error and exit.
2. Set `status:` (`completed` or `dropped`), `completed:` = today, `updated:` = today.
3. If a note/reason was provided, append to `## Notes` (creating the section at the END of the body if absent): `- {today}: {note}` for `done`; `- {today}: dropped — {reason}` for `drop`.
4. Apply `#rebuild-index` (the item leaves INDEX). Output: `Completed #{id}: "{title}".` or `Dropped #{id}: "{title}".`

---

## Phase 10: Check-in {#checkin}

Triggered by `/mytasks checkin <id> [note]`. Appends a check-in entry, advances `next_checkin`, prompts a status transition if `waiting`.

1. Locate the item via `#show` normalize-and-locate; if not found, error and exit.
2. Append `- {today}: {note}` (empty trailing note if no arg) to the `## Check-ins` body section, creating the section at the end of the body if absent.
3. Advance `next_checkin` per cadence (`checkin:` unset/empty → leave `next_checkin:` unchanged):

   | Cadence | New `next_checkin` |
   |---|---|
   | `daily` | today + 1 day |
   | `weekly` | today + 7 days |
   | `biweekly` | today + 14 days |
   | `monthly` | today + 1 calendar month, clamped to the last day of the target month (e.g., Jan 31 → Feb 28; Aug 31 → Sep 30) |
   | `none` | leave `next_checkin:` blank |

4. If `status:` was `waiting` BEFORE this checkin, prompt:

   ```
   Move to in-progress? [Y/n]
   ```

   <!-- defer-only: ambiguous -->
   (Use `_shared/interactive-prompts.md` primary path with a yes/no choice if `AskUserQuestion` is available; otherwise plain text prompt.) `Y`/`<enter>` → `status: in-progress`; `n` → stays `waiting`. Other statuses: never prompt.

5. Set `updated:` to today. Apply `#rebuild-index`. Output: `Checked in on #{id}. Next checkin: {next_checkin or "not scheduled"}.` — inserting ` Status: waiting → in-progress.` after the id clause when the transition happened.

---

## Phase 11: Archive {#archive}

Triggered by `/mytasks archive [--quarter Q]`. Archive semantics (move-not-delete, quarter layout, never in INDEX) per `_shared/tracker-crudl.md` §6.

1. Target quarter: if `--quarter <Q>` is provided (validated `^[0-9]{4}-Q[1-4]$`), use it for ALL eligible items. Otherwise derive per-item from the item's `updated:` date (months 1-3 → Q1, 4-6 → Q2, 7-9 → Q3, 10-12 → Q4).
2. Eligible: `status` in (`completed`, `dropped`) AND (today − `updated:`) > 30 days.
3. Move each eligible item to `~/.pmos/tasks/archive/{quarter}/{file}` (`mkdir -p`; prefer `git mv` if `~/.pmos/` is a git repo).
4. Apply `#rebuild-index` (refreshes `Last regenerated:`). Output: `Archived {N} items: {comma-separated "#{id} → {quarter}"}.` or `Archived 0 items: nothing eligible.`
