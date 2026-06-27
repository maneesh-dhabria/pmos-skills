---
name: mytasks
description: Persistent personal task tracker — distinct from Claude Code's session-scoped TaskCreate/TaskList tools. Use for real-world tasks (LNO importance, due dates, people, check-ins, projects, subtasks, recurrence). Lives at ~/.pmos/tasks/. Use when the user says "add a task", "what's on my plate", "tasks for sarah", "what's due this week", "check in on X", "/mytasks", or names a task to capture.
user-invocable: true
argument-hint: "[ | <text> | add <text> [--parent <id>] | list [filters] | today | week | overdue | waiting | checkins | for <handle> | in <project> | show <id> | set <id> <field>=<value> | refine <id> | done <id> [note] | drop <id> [reason] | checkin <id> [note] | archive [--quarter <YYYY-QN>] | web] [--non-interactive | --interactive]"
---

# My Tasks

A lightweight, file-based personal task tracker. Asana/Todoist-class personal life-OS layer, but local-first, AI-native, and embedded in the `pmos-toolkit` ecosystem.

**The web UI is the primary way to work day-to-day** — run `/mytasks web` to open a local Todoist-class app (sidebar smart-views + projects + labels, drag-to-reorder, inline subtasks, quick-add) backed by a zero-dep localhost server (`#web`). The terminal verbs below are at **full parity** with the web UI — every capability (capture, edit, subtasks, recurrence, check-ins, views) is reachable from either surface, and both read and write the **same** markdown files in `~/.pmos/tasks/`, so terminal and web edits never diverge.

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

- `schema.md` — item file shape, **single source for enum values**, index-view format (binds `_shared/tracker-crudl.md`)
- `_shared/tracker-crudl.md` — shared tracker contract (id/slug §2, `created`/`updated`/`schema_version` §3, derived-on-read index view §5 INV-1/2/3, archive §6)
- `inference-heuristics.md` — quick-capture keyword + date + person + `#project`/`+label` token rules (`project` is never auto-inferred — only an explicit `#project` token / prompt / `set` sets it)
- `output-formats.md` — exact capture report templates and unknown-person prompt copy
- `_shared/interactive-prompts.md` — interactive prompting protocol (used by `add`, `refine`, unknown-person flow)
- `scripts/serve.js` — zero-dep localhost server + JSON API behind the web UI (adapts the `comments` substrate serve.js); `scripts/lib.js` (frontmatter round-trip, validation, `renderIndex` derived-on-read index view + load-time `workstream→project` normalization, quick-add token parse), `scripts/registry.js` (projects/labels registry → `registry.json`, design D5), `scripts/people.js` (web CRUD over the shared `~/.pmos/people/` store, design D6 — derived on read, never writes a committed `INDEX.md`), `scripts/recur.js` (the `#recur-spawn` routine, shared by CLI + web), `scripts/webapp/` (the single-file app), `scripts/mytasks-open.{command,sh,bat}` (launcher trio). The JSON API surface is documented at `#web-api` (contract home: design §5).
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
| `for <handle>` / `in <project>` | Phase 5 (named view) |
| `show <id>` | Phase 6 (render item) |
| `set <id> <field>=<value>` | Phase 7 (single-field edit) |
| `refine <id>` | Phase 8 (interactive multi-field refine) |
| `done <id> [note]` | Phase 9 (status → completed shortcut) |
| `drop <id> [reason]` | Phase 9 (status → dropped shortcut) |
| `checkin <id> [note]` | Phase 10 (check-in mechanics) |
| `archive [--quarter Q]` | Phase 11 (archive completed/dropped) |
| `web` | Phase 13 (launch the web UI) |
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

Triggered by `/mytasks` with no arguments. The at-a-glance index is a **view derived on read** from `~/.pmos/tasks/items/*.md` — there is no committed `INDEX.md` and no freshness check (per `_shared/tracker-crudl.md` §5, INV-1/2/3).

1. **Default → launch the web viewer** (INV-2): start `scripts/serve.js` and open the browser, exactly as `#web` (Phase 13). The web UI derives its buckets from the item files on every request.
2. **Headless fallback → inline derived render.** Under `--non-interactive`, a headless environment, or when no browser/server can run, degrade to the inline view: `node -e "process.stdout.write(require('<skill>/scripts/lib.js').renderIndex('~/.pmos/tasks'))"` (or glob `items/*.md` and group per `schema.md` "Index view format"). `renderIndex` derives the buckets fresh and writes nothing.
3. **Empty-state** is gated on **zero item files** (never a missing index): if `~/.pmos/tasks/items/` has no `*.md`, output `No tasks yet. Capture one with /mytasks <text> or /mytasks add <text>.`. If item files exist but all are `completed`/`dropped` (zero active), output `No active tasks. Capture one with /mytasks <text>.`

> **Migration is automatic (no verb).** The legacy `workstream:` → `project:` key rename runs as a one-shot load-time normalization inside `lib.js loadAllItems` — it fires on every read (web request or `renderIndex`) and is a no-op once no `workstream:` key remains. There is no `rebuild-index` command: nothing is cached, so there is nothing to rebuild.

---

## Phase 2: Quick Capture (`<bare text>`) {#quick-capture}

Triggered by `/mytasks <text>` where `<text>` does not start with a recognized verb (see the `#routing` table) and reads like a thing-to-do.

**This phase MUST complete in a single tool-call sequence with NO clarifying questions.** Wrong inference is acceptable; capture friction is not.

1. Ensure `~/.pmos/tasks/items/` exists (`mkdir -p`).
2. Allocate id per `_shared/tracker-crudl.md` §2 — every id-keyed store now mints the year-prefixed `<YYMMDD>-<rand3>` scheme (§2.3, D2/D3), so `/mytasks` mints one too: run `node <pmos-toolkit>/skills/backlog/scripts/mint-id.mjs` (resolve the sibling skill's minter within pmos-toolkit; inline the tiny `crypto`-sourced mint if the path can't be resolved). This is a single tool call — do NOT scan for a max serial. Any pre-existing 4-digit serials stay valid under the §2.1 triple validator and are never rewritten.
3. Apply `inference-heuristics.md` in this strip order, then the remainder is the `title:`:
   1. **type** (keyword; fallback `execution` — the keyword is NOT stripped from the title).
   2. **due** (natural-language date; matched substring IS stripped).
   3. **people** (`@handle` tokens via `/people find` — resolved tokens stripped and added to `people:`; multi-match and no-match tokens stay in the title, collected for the report). `@`=**person** is the mytasks convention (NOT Todoist's `@`=label).
   4. **`#project`** — a single `#`-prefixed token (e.g. `#home-reno`) sets `project:` to that slug and IS stripped from the title. If more than one `#token` appears, the **first** wins and the rest stay in the title (surfaced in the report). A bare `#` with no following word stays in the title.
   5. **`+label`** — each `+`-prefixed token (e.g. `+urgent`) is appended to `labels:` and IS stripped; multiple `+tokens` are all collected. A bare `+` with no following word stays in the title.

   `project` is still **never auto-inferred from repo context** (design D3) — only an explicit `#project` token sets it; absent ⇒ Inbox. `parent`/`order`/`recur` are never set at quick-capture (bare keys).
4. Build the slug from the final title per `_shared/tracker-crudl.md` §2.2; prefer truncating at a hyphen boundary.
5. Write `~/.pmos/tasks/items/{id}-{slug}.md` — frontmatter only, no body, per `schema.md` "Defaults on quick-capture". Optional fields with no value are written as bare keys (e.g., `start:`), not omitted.
6. Nothing else to write — the at-a-glance index is derived on read (Phase 1), so there is no index to regenerate after capture.
7. Report per `output-formats.md` "Quick-capture report" — one line with id, type, importance, final title, and any inferred fields; one indented `⚠ unresolved:` line per unresolved `@token` with the exact fix command.

---

## Phase 3: Rich Capture (`add`) {#rich-capture}

Triggered by `/mytasks add <text>`. Interactive — collects rich attributes upfront via `_shared/interactive-prompts.md`, ONE field at a time.

1. Resolve `items/` and allocate id as in `#quick-capture` steps 1–2. **Subtask capture:** if `--parent <id>` is present (or the natural-language form `subtask of <id>` / `under <id>` appears in the request), resolve `<id>` via the `#show` triple-accept locate; on hit, this task is captured as a **subtask** — `parent:` is set to the resolved id (no prompt for it). Reject a missing target (`No item with id {id} to set as parent.`) and self-parent before writing. A subtask file is an ordinary full task file (all fields available) that merely carries `parent:`. Bare-text tokens in `<text>` are still parsed per `#quick-capture` step 3 (the `--parent` flag and the `subtask of <id>` phrase are stripped from the title).
2. Prompt in this order (enum values per `schema.md`):
   1. **`importance`** — enum; default `neutral`.
   2. **`type`** — enum; default = value inferred from `<text>` per `inference-heuristics.md`, else `execution`.
   3. **`project`** — free string (a project slug); default = any `#project` token parsed from `<text>` (per `#quick-capture` step 3), else empty (the task lands in Inbox). **Manual — no auto-inference from repo context** (design D3; the old `.pmos/settings.yaml` workstream default was removed). Skippable.
   4. **`due`** — date input; parse per `inference-heuristics.md` date rules. Skippable.
   5. **`people`** — comma-separated names or handles. For each token (strip any `@`), call `/people find`: single match → add the handle silently; multi-match or no-match → present the disambiguation prompt per `output-formats.md` "Unknown-person prompts" (no-match option (a) invokes `/people`'s reactive create — `/people` Phase 3 reactive entry point — and adds the returned handle; "skip" leaves the token unresolved, collected for the report).
   6. **`recur`** — recurrence rule; default none. Validated against the closed grammar in `schema.md` ("Recurrence"). Skippable (most tasks are one-shot).
   7. **`checkin`** — enum; default `none`. Non-`none` cadence also sets `next_checkin: today + cadence` per `#checkin` cadence math.
3. Build the slug from `<text>` and write the item file as in `#quick-capture` steps 4–5, with all collected values (skipped fields as bare keys — including `parent:`, `order:`, `recur:`).
4. Write the item file — that is the source of truth; the index view is derived on read (Phase 1), nothing to regenerate.
5. Report per `output-formats.md` "Rich-capture report" (the report names `parent` when the task is a subtask and `recur` when set).

---

## Phase 4: Filtered List {#list}

Triggered by `/mytasks list ...` or any read-shaped request. Filters are inferred from the request ("show waiting tasks" ⇒ status waiting; "tasks labeled reading" ⇒ label reading); an explicit flag overrides inference. All filters are optional and combinable with AND semantics. The flag spellings stay parsed:

<!-- nl-sugar -->
- `--status <s>` · `--type <t>` · `--importance <i>` — enum filters; values per `schema.md`
<!-- nl-sugar -->
- `--project <slug>` · `--person <handle>` · `--label <name>` — membership filters
<!-- nl-sugar -->
- `--parent <id>` — only subtasks of `<id>` · `--recurring` — only tasks with a non-empty `recur:`
<!-- nl-sugar -->
- `--due <today|this-week|overdue|next-30>` — date window on `due:` · `--checkin-due` — `next_checkin <= today`
<!-- nl-sugar -->
- `--include-done` — include `completed`/`dropped` (excluded by default)

> **Field rename — `workstream` → `project`.** The membership filter is `--project <slug>` and the named view is `in <project>` (Phase 5), both filtering the `project:` field (schema v2). The pre-rename `--workstream` / `in <workstream>` spellings are **retired** — `--workstream` is no longer parsed (a user typing it gets the unknown-filter error pointing at `--project`).

1. **Source.** Glob `~/.pmos/tasks/items/*.md` and parse — every filter derives from the item files (`--include-done` also globs `archive/**/*.md`). `--project <slug>` matches the `project:` field. There is no `INDEX.md` to read; the list is computed fresh per invocation (the load-time `workstream→project` normalization in `lib.js loadAllItems` applies here too).
2. **Validate** filter values against the enums in `schema.md`. Reject unknown values with the allowed list, e.g. `Unknown status 'open'. Allowed: pending, in-progress, waiting, completed, dropped.` No render.
3. **Date windows:** `today` → `due == today` · `this-week` → `today <= due <= today + 7` · `overdue` → `due < today` AND `status` NOT in (completed, dropped) · `next-30` → `today <= due <= today + 30`.
4. **Render** a markdown table sorted `due` asc (no-due last) → `updated` desc. Columns: `id | type | status | due | next_checkin | title | project | parent`; add a `people` or `labels` column when filtering on it; add a `recur` column under `--recurring`. **Subtask nesting (view-layer only):** when a listed task's `parent:` is also present in the result set, render the child immediately under its parent with its `title` indented (two spaces + `↳ `); a child whose parent is NOT in the result set renders as an ordinary top-level row (its `parent` cell still shows the id). Nesting never changes the stored files (they stay flat — `schema.md` index-view format). Zero matches: `No items match.`

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
| `/mytasks in <project>` | `list --project <project>` |

---

## Phase 6: Show Item {#show}

Triggered by `/mytasks show <id>`. The locate/normalize logic here is shared by `set`/`done`/`drop`/`checkin`/`refine` (Phases 7–10) — all cite "locate the item via `#show` normalize-and-locate".

1. **Normalize the id (triple-accept, per `_shared/tracker-crudl.md §2.1`)** — three id shapes are valid and are accepted verbatim; only the legacy-serial form is normalized:
   - `<YYMMDD>-<rand3>` (e.g. `260613-a3f`) — the current scheme. Used **as-is**; never padded or rewritten.
   - `<MMDD>-<rand3>` (e.g. `0613-a3f`) — the pre-year transitional scheme. Used **as-is**.
   - A **bare integer or zero-padded legacy serial** (e.g. `42`, `0042`) — **and only this form** — is normalized by zero-padding to 4 digits (`42` → `0042`). Strip surrounding whitespace first.

   Detection: if the trimmed id matches `^\d{1,4}$` (no hyphen), treat it as a legacy serial and zero-pad to 4 digits; otherwise (it contains a hyphen / non-digits) use it verbatim — do NOT pad or mangle it.
2. Search `~/.pmos/tasks/items/{id}-*.md` (glob on the resolved id), then `~/.pmos/tasks/archive/**/{id}-*.md`. The `{id}-*` glob locates date-rnd and legacy ids identically.
3. Still not found → list existing items whose id **shares the same prefix** as the (resolved) lookup id — the leading run of characters up to the first hyphen for a date-rnd id, or the digit prefix for a legacy serial — and output: `No item with id {id}. Closest matches by prefix: {comma-separated list or "(none)"}. Run /mytasks list to see all items.`
4. Output the file contents verbatim, fenced as markdown. The frontmatter already carries `project:` and `recur:`, so they render inline; when `recur:` is non-empty, add one line after the fence: `Recurs: {recur}.`
5. **Subtasks.** Glob `~/.pmos/tasks/items/*.md` for any item whose `parent:` == this id. If ≥1, append a `### Subtasks` block listing each as `- #{child_id} [{status}] {title}{ — due {due} if set}`, sorted by `order` asc (no-order last) → `due` asc. None → omit the block (do not print an empty "Subtasks" heading). Showing a child never auto-shows its parent — the relationship is rendered from the parent's side only.

---

## Phase 7: Set Field {#set}

Triggered by `/mytasks set <id> <field>=<value>`.

1. Locate the item via `#show` normalize-and-locate; if not found, error and exit (same message).
2. Validate the field name. Editable: `title`, `type`, `importance`, `status`, `project`, `parent`, `order`, `recur`, `people`, `labels`, `links`, `due`, `start`, `checkin`, `next_checkin`, `completed`. Skill-managed (`id`, `created`, `updated`) → `Field '{field}' cannot be set directly. The skill manages it.` Unknown → `Field '{field}' is not recognized. Allowed: {comma-separated list}.` (`workstream` is no longer an editable field — it was renamed to `project` in schema v2; setting `workstream=` errors as unrecognized, and the user is pointed at `project`.)
3. Validate the value:
   - Enum fields (`type`, `importance`, `status`, `checkin`) — against `schema.md` enums. On violation: `Unknown {field} '{value}'. Allowed: {comma-separated list}.` No write.
   - Date fields (`due`, `start`, `next_checkin`, `completed`) — ISO `YYYY-MM-DD`, OR natural-language date per `inference-heuristics.md`, OR empty (to clear).
   - List fields (`people`, `labels`, `links`) — comma-separated; written as YAML list. For `people`, each token is a literal handle (NOT fuzzy-matched) — the user types exact handles when using `set`.
   - **`parent`** — an id that MUST resolve via the `#show` triple-accept locate (the target item must exist). Reject **self-parent** (`parent` == this item's id → `A task cannot be its own parent.`) and a **2-level cycle** (the proposed parent's own `parent:` points back at this item → `That would create a parent/subtask cycle.`). Empty clears (the task becomes top-level). On a nonexistent target: `No item with id {value} to set as parent.` No write on any rejection.
   - **`order`** — a non-negative integer (`^\d+$`). Violation: `order must be a non-negative integer (got '{value}').` Empty clears.
   - **`recur`** — validated against the closed recurrence grammar in `schema.md` ("Recurrence") — `daily`/`weekly`/`biweekly`/`monthly`, `every <N> days|weeks|months`, `every <weekday>` (case-insensitive). Violation: `Unknown recurrence rule '{value}'. Allowed: daily, weekly, biweekly, monthly, every <N> days|weeks|months, every <weekday>.` Empty clears (the task becomes one-shot). No write on violation.
   - Free strings (`title`, `project`). Empty `project` clears it (the task returns to Inbox).
4. Load the item, update only the named field, set `updated:` to today, write back. If `title` changed, ALSO rename the file to the new slug (preserve id prefix; slug rules as in `#quick-capture` step 4). The index view is derived on read (Phase 1) — no regeneration step. Output: `Updated #{id}: {field} = {value}.` — appending ` Renamed to {new-filename}.` on title change. For a cleared field (empty value), the output reads `Updated #{id}: {field} cleared.`

---

## Phase 8: Refine {#refine}

Triggered by `/mytasks refine <id>`. Interactive — pre-filled walk through all editable fields.

1. Locate the item via `#show` normalize-and-locate; if not found, error and exit.
2. Walk the same field order as `#rich-capture` step 2, with **`title`** added as the first prompt and each field pre-filled with its current value. Refine-flow defaults and `<enter>`/`clear` semantics per `_shared/interactive-prompts.md`. For `people`, resolve each token via `/people find` with the same disambiguation flow as `#rich-capture`. For `checkin`, a non-`none` cadence also prompts whether to recompute `next_checkin: today + cadence` (default yes).
3. Write back only changed fields; rename the file if `title` changed (as in `#set` step 4); set `updated:` to today.
4. Write back. The index view is derived on read (Phase 1) — no regeneration step. Output: `Refined #{id}.` (plus ` Renamed to {new-filename}.` if title changed).

---

## Phase 9: Done / Drop Shortcuts {#done-drop}

Triggered by `/mytasks done <id> [note]` (status → completed) or `/mytasks drop <id> [reason]` (status → dropped).

1. Locate the item via `#show` normalize-and-locate; if not found, error and exit.
2. Set `status:` (`completed` or `dropped`), `completed:` = today, `updated:` = today.
3. If a note/reason was provided, append to `## Notes` (creating the section at the END of the body if absent): `- {today}: {note}` for `done`; `- {today}: dropped — {reason}` for `drop`.
4. **Recurrence-on-complete spawn (`done` only, when the just-completed item has a non-empty `recur:`).** Run the `#recur-spawn` routine below to mint the next instance. (`drop` never spawns — dropping ends the series.)
5. Write back. The index view is derived on read (Phase 1) — the completed/dropped item drops out of the derived buckets and any spawned next instance appears automatically; nothing to regenerate. Output: `Completed #{id}: "{title}".` or `Dropped #{id}: "{title}".` — when a recurrence spawned, append ` Next instance #{new_id} due {new_due}.`

### Recurrence spawn routine {#recur-spawn}

**The single canonical home (§K) for recurrence-on-complete.** Story C's web `POST /api/tasks/:id/complete` (design §3.3) calls this exact routine — it is never reimplemented. Inputs: the just-completed item (already `completed`, with a non-empty `recur:`). Steps:

1. **Mint a fresh id** — a new `<YYMMDD>-<rand3>` via `mint-id.mjs` (the `#quick-capture` step 2 mechanism). Never reuse the completed item's id.
2. **Copy forward** these fields verbatim: `title`, `type`, `importance`, `project`, `parent`, `recur`, `people`, `labels`, `links`, `checkin`. (`order` is NOT copied — a fresh instance has no manual position until placed.)
3. **Advance the dates.** For each of `due` and `start` that is non-empty on the completed item, advance it by the `recur:` rule using the date math in `schema.md` "Recurrence" (which reuses the `#checkin` `monthly` last-day clamp). A field that was empty stays empty. **Anchor on the completed item's own `due`/`start`** (not today), so a late completion does not drift the cadence. Set `next_checkin` per the copied `checkin` cadence (today + cadence) if `checkin` is non-`none`, else blank.
4. **Reset lifecycle fields:** `status: pending`, `completed:` blank, `created`/`updated` = today.
5. **Write** the new file `~/.pmos/tasks/items/{new_id}-{slug}.md` (slug from the carried title, `#quick-capture` step 4 rules).
6. **Log** the completion + spawn on the *old* (completed) item's `## Notes` (create at end of body if absent): `- {today}: completed; recurring — spawned next instance #{new_id} (due {new_due or "—"}).`
7. Return `{new_id, new_due}` to the caller (the `done` output line; the web endpoint's JSON).

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

5. Set `updated:` to today and write back. The index view is derived on read (Phase 1) — no regeneration step. Output: `Checked in on #{id}. Next checkin: {next_checkin or "not scheduled"}.` — inserting ` Status: waiting → in-progress.` after the id clause when the transition happened.

---

## Phase 11: Archive {#archive}

Triggered by `/mytasks archive [--quarter Q]`. Archive semantics (move-not-delete, quarter layout, never in the derived index view) per `_shared/tracker-crudl.md` §6.

1. Target quarter: if `--quarter <Q>` is provided (validated `^[0-9]{4}-Q[1-4]$`), use it for ALL eligible items. Otherwise derive per-item from the item's `updated:` date (months 1-3 → Q1, 4-6 → Q2, 7-9 → Q3, 10-12 → Q4).
2. Eligible: `status` in (`completed`, `dropped`) AND (today − `updated:`) > 30 days.
3. Move each eligible item to `~/.pmos/tasks/archive/{quarter}/{file}` (`mkdir -p`; prefer `git mv` if `~/.pmos/` is a git repo).
4. The archived items move out of `items/`, so they drop out of the derived index view on the next read (Phase 1) — no regeneration step. Output: `Archived {N} items: {comma-separated "#{id} → {quarter}"}.` or `Archived 0 items: nothing eligible.`

---

## Phase 13: Launch Web UI {#web}

Triggered by `/mytasks web`. Starts the local server (`scripts/serve.js`) and opens the Todoist-class web app in the default browser. The app and the terminal are the same data — both read/write `~/.pmos/tasks/items/*.md` (design §3); the server is stateless (re-reads files per request), so edits made in either surface appear in the other (web refreshes on focus + a light poll).

1. **Precheck `node`.** `command -v node` — if absent, output `Node >=18 is required for the web UI (https://nodejs.org). The terminal verbs work without it.` and exit. (Everything else in `/mytasks` is node-free; only the web layer needs it.)
2. **Reuse or spawn the server.** Resolve the script dir (`<pmos-toolkit>/skills/mytasks/scripts/`). If `scripts/.pmos-serve.pid` exists and names a live pid (`kill -0`), reuse its `port`. Otherwise spawn fresh: `node scripts/serve.js --port=0 --pid-file=scripts/.pmos-serve.pid --idle=300` (background), then read the port from the pid file (poll briefly for it to appear). The server hard-binds `127.0.0.1`, auto-shuts after 300s idle, and never deletes a task file.
3. **Open the browser** at `http://127.0.0.1:<port>/` — prefer the launcher trio (`scripts/mytasks-open.command` on macOS, `.sh` on Linux, `.bat` on Windows), which encapsulates the precheck/reuse/spawn/open flow; or open the URL directly with the platform opener (`open` / `xdg-open` / `start`).
4. **Report** the URL and how to stop: `Web UI at http://127.0.0.1:<port>/ — the server auto-stops after 5 min idle (or close it with: kill $(node -e '…').` Tasks live in `~/.pmos/tasks/`.

**`--non-interactive`:** `web` is interactive-by-nature (it opens a browser for a human). Under `--non-interactive`, do NOT block or spawn a browser — start/reuse the server and **print the launch URL** (`Web UI at http://127.0.0.1:<port>/ (non-interactive: not opening a browser)`), then exit cleanly. This phase issues no interactive prompt, so the canonical classifier has nothing to defer.

> **Server-required by design (D11):** the web app has **no `file://` mode**. Opening `index.html` from disk shows a blocking "run `/mytasks web`" modal — there is no degraded read-only path, because writes need the server. This mirrors the `comments` launcher posture.

### Web API endpoints {#web-api}

The browser app talks to `scripts/serve.js` over a small JSON API (localhost-only; mutations require a loopback `Origin`). The full request/response contract is the **single home** in the epic design §5 (`docs/pmos/features/2026-06-26_mytasks-web-enhancements/02_design.html`, "Endpoint surface") — cite it, do not restate the table here (§K). The surface:

- **Tasks** — `GET/POST /api/tasks`, `PATCH /api/tasks/:id`, `POST /api/tasks/:id/{complete,drop,checkin}`, `POST /api/tasks/reorder` (unchanged). `GET /api/tasks?include_children=1` additionally returns a matched parent's subtasks even when a child would not match the active filter on its own (no flag → unchanged behavior).
- **People** (shared `~/.pmos/people/` store, design D6) — `GET /api/people` (list `{handle,name}` sorted by name), `POST /api/people` (create; handle auto-derived per `/people` `lookup.md` when omitted; `409` dup handle, `400` missing name), `PATCH /api/people/:handle` (edit; `404` unknown). Records are byte-shape-compatible with `/people` — a record written here is editable from the `/people` CLI and vice-versa.
- **Registry** (`~/.pmos/tasks/registry.json`, design D5) — `POST /api/projects {name}` / `POST /api/labels {name}` add a slug-normalized, deduped empty container (an existing name is a no-op success). `GET /api/meta` returns `{projects, labels}` as the **union** of registry entries and the values derived from task files — so a freshly created empty project still shows in the sidebar.

Server-side helpers live in `scripts/registry.js` (registry read/add) and `scripts/people.js` (people CRUD + INDEX regen), both reusing `scripts/lib.js` primitives (atomic write, slug, frontmatter round-trip). The people store defaults to `~/.pmos/people/` (a `--people-dir` override keeps test/scratch roots isolated).
