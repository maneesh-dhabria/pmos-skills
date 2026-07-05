---
name: mytasks
description: Persistent personal task tracker — distinct from Claude Code's session-scoped TaskCreate/TaskList tools. Use for real-world tasks (LNO importance, due dates, people, check-ins, projects, subtasks, recurrence). Lives at ~/.pmos/tasks/. Use when the user says "add a task", "what's on my plate", "tasks for sarah", "what's due this week", "check in on X", "/mytasks", or names a task to capture.
user-invocable: true
argument-hint: "[ | <text> | add <text> [--parent <id>] | list [filters] | today | week | overdue | waiting | checkins | for <handle> | in <project> | show <id> | set <id> <field>=<value> | refine <id> | done <id> [note] | drop <id> [reason] | checkin <id> [note] | archive [--quarter <YYYY-QN>] | web | import [<text>] | goal add <title> [--type <t>] [--cadence <c>] [--target <date>] | goals | goal show <id> | goal edit <id> [<field>=<value>] | goal drop <id> | goal achieve <id> | milestone add <goal> <desc> [--due <date>] | milestone met <goal> <ref> | milestone edit <goal> <ref> [<field>=<value>] | milestone drop <goal> <ref> | attach <task|project> <goal> [<milestone>] | detach <task|project> [--clear]] [--non-interactive | --interactive]"
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

- `schema.md` — item file shape + **Goal Schema** (goal frontmatter, the 3 goal enums, milestone shape, INV-1/2/3), **single source for enum values**, index-view format (binds `_shared/tracker-crudl.md`)
- `_shared/tracker-crudl.md` — shared tracker contract (id/slug §2, `created`/`updated`/`schema_version` §3, derived-on-read index view §5 INV-1/2/3, archive §6)
- `inference-heuristics.md` — quick-capture keyword + date + person + `#project`/`+label` token rules (`project` is never auto-inferred — only an explicit `#project` token / prompt / `set` sets it)
- `output-formats.md` — exact capture report templates and unknown-person prompt copy
- `_shared/interactive-prompts.md` — interactive prompting protocol (used by `add`, `refine`, unknown-person flow)
- `scripts/serve.js` — zero-dep localhost server + JSON API behind the web UI (adapts the `comments` substrate serve.js); `scripts/lib.js` (frontmatter round-trip, validation, `renderIndex` derived-on-read index view + load-time `workstream→project` normalization, quick-add token parse), `scripts/registry.js` (projects/labels registry → `registry.json`, design D5), `scripts/people.js` (web CRUD over the shared `~/.pmos/people/` store, design D6 — derived on read, never writes a committed `INDEX.md`), `scripts/recur.js` (the `#recur-spawn` routine, shared by CLI + web), `scripts/import-parse.js` (the structure-first outline tokenizer behind `#import` — pure, reuses `lib.parseQuickAdd`), `scripts/webapp/` (the single-file app), `scripts/mytasks-open.{command,sh,bat}` (launcher trio). The JSON API surface is documented at `#web-api` (contract home: design §5).
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
| `import [<text>]` | Phase 14 (bulk import an outline) |
| `goal add <title>` / `goals` / `goal show/edit/drop/achieve <id>` | Phase 15 (goal CRUD — `#goals`) |
| `milestone add/met/edit/drop <goal> [<ref>]` | Phase 16 (milestone verbs — `#milestones`) |
| `attach <task\|project> <goal> [<milestone>]` / `detach <task\|project>` | Phase 17 (attach/detach — `#attach`) |
| (any other to-do-shaped free text) | Phase 2 (quick capture) |

> **Goals are a second collection, not a task type** (`schema.md` "Goal Schema"). The `goal`/`milestone` verbs read and write `~/.pmos/tasks/goals/{id}-{slug}.md` via the same `lib.js` primitives as tasks; a `goal drop` and a `drop <id>` never collide — the `goal` prefix routes to Phase 15, a bare id to Phase 9.

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

## Phase 14: Import an outline (`import`) {#import}

Triggered by `/mytasks import [<text>]`. Turns a pasted text outline into a tree of projects → tasks → subtasks and writes them in one pass. **Agent-driven (design §7, I5)** — there is no server endpoint; the model parses the blob (structure-first, AI-inferring only the ambiguous remainder), confirms the tree, then writes via the same `lib.js` + `mint-id.mjs` path the capture phases use. **No new task fields** (I2).

### Step 1 — Get the text

The text is taken **inline** — everything after `import` on the command line. If absent and `mode == interactive`, prompt for it (`Paste the outline to import (projects, tasks, subtasks — one per line):`) per `_shared/interactive-prompts.md`. If absent and `mode == non-interactive`, there is nothing to import: print `import: no text supplied` and exit cleanly.

### Step 2 — Parse structure-first (D3)

Run the **deterministic structure pass** — `scripts/import-parse.js` `parseOutline(text, today)` — which returns `{ nodes, projects, labels }`. It honors, **in this order** (structure always wins on conflict):

1. **`#project` header line** (a line whose whole content is a bare `#slug`, or `Project: Name`) → opens a **project container**; every more-indented line below it belongs to that project until the indentation dedents back to/above the header.
2. **Indentation / nesting depth** → a line is a **subtask of the nearest shallower task line** (the `parentIndex` the parser returns). Mixed tabs/spaces nest by relative depth.
3. **Bullet & checkbox markers** (`-`, `*`, `- [ ]`, `- [x]`) → **task lines** (the marker is stripped). The `+` bullet is intentionally not a marker — it would collide with `+label`.
4. **`#project` / `+label` / `@handle` tokens and trailing natural-language dates** on a task line → fields, via the **same `#quick-capture` step-3 strip rules** (`lib.parseQuickAdd`; strip order type → date → `@` → `#` → `+`). Cited, not restated (§K) — see `#quick-capture` and `inference-heuristics.md`.

**AI fallback (A3).** Only the remainder the structure pass cannot resolve is inferred by the model — e.g. a flat list whose first line reads like a project header without a `#`, or "subtasks of X" phrasing instead of indentation. **Structure always wins on conflict:** when a task sits inside a `#project` container *and* carries an inline `#other` token, the container wins (the parser already overrides the token); when indentation and a token disagree about nesting, indentation wins. State any inference you applied in the confirm preview so the user can correct it.

> **Worked example.** Input:
> ```
> #q3-launch
>   Email the announcement @sarah +urgent by friday
>     Draft the copy
>   Publish the blog post
> ```
> parses to project `q3-launch` containing two tasks — *Email the announcement* (people `sarah`, label `urgent`, due = next Friday) with a subtask *Draft the copy*, and *Publish the blog post*.

### Step 3 — Confirm before writing (A4)

Print the parsed tree as an **indented preview** — project → task → subtask, showing each inferred `label`/`person`/`due`/`type` — so the user sees exactly what will be created. Then resolve any **genuine ambiguity** the parse or the AI fallback could not settle with `AskUserQuestion`, each carrying a `(Recommended)` default, e.g.:

```
question: "'Q3 launch' is the first line with children under it — is it a project or a task?"
header: "Q3 launch"
options:
  - Project (Recommended)      # treat as a container; its children become its tasks
  - Task                       # treat as a task; its children become subtasks
```

**Nothing is written until the tree is confirmed.** Under `--non-interactive` the canonical non-interactive block applies: the classifier **AUTO-PICKs the `(Recommended)` reading** of each ambiguity and **records the deferred ambiguities as open questions** (no blocking prompt) — the import still proceeds with the recommended interpretation. The confirm step itself, when there are zero ambiguities, is a single "Create N tasks across M projects?" confirmation (`Create (Recommended)` / `Cancel`).

### Step 4 — Write (A5)

On confirm, for each task node in `nodes`:

1. **Mint an id** — `node <pmos-toolkit>/skills/backlog/scripts/mint-id.mjs` per task/subtask (one call each; the same minter `#quick-capture` step 2 uses).
2. **Set fields** — `title`, `type`, `due`, `project`, `labels`, `people` from the parse; **`parent`** = the minted id of `nodes[parentIndex]` for a subtask (write the parent before its children so the id exists). Resolve each `@handle` via **`/people find`** — single match adds the handle; multi-/no-match leaves the token unresolved and flags it in the report (**never invent a person**). All other optional fields are bare keys (`schema.md` empty-optional binding).
3. **Write** the item file via `lib.writeItemAtomic` + `lib.serializeItem` (the atomic capture write path).
4. **Register new containers** — for every new `project` / `label` not already derived from existing task files, call the registry `addRegistryEntry` (`scripts/registry.js`, design D5 — the dependency from story 260626-71x) so an otherwise-empty new project still shows in the web sidebar.
5. **No INDEX write.** The at-a-glance index is a view derived on read (`_shared/tracker-crudl.md` §5 INV-1) — there is nothing to regenerate after a batch import. Fail-soft semantics still apply per `#quick-capture`: a write that fails leaves the already-written item files in place (warn, do not roll back).

### Step 5 — Report (A6)

Per `output-formats.md` style: list **every created task/subtask** with its `id`, `project`, and inferred fields (mirroring the quick-capture report line); then the **new projects/labels** created; then one indented `⚠ unresolved:` line per unresolved `@handle` with the exact `/people add … ` + `set` fix command (same copy as the quick-capture report). State the totals (`Imported N tasks (S subtasks) across M projects.`).

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
- **Counts** — `GET /api/counts` returns `{smart:{today,upcoming,overdue,waiting,checkins}, projects:{<key>:n}, labels:{<key>:n}}` for the sidebar trailing-count badges (FR-4). Read-only; each count reuses the same per-bucket filter `GET /api/tasks` applies, so a badge matches its own bucket's list. (The Today badge counts due-today only; the Today *view* additionally surfaces overdue rows atop, which carry the separate Overdue badge — so the Today number need not equal the visible row count there, by design.) The `2026-06-29_mytasks-web-ux-fixes/02_design.html` UX-fixes design is the behavior home (§K).

Server-side helpers live in `scripts/registry.js` (registry read/add) and `scripts/people.js` (people CRUD + INDEX regen), both reusing `scripts/lib.js` primitives (atomic write, slug, frontmatter round-trip). The people store defaults to `~/.pmos/people/` (a `--people-dir` override keeps test/scratch roots isolated).

### Web UI interactions {#web-ui}

The client (`scripts/webapp/{index.html, app.js, app.css, format.js}`) is **inline-everything** — every mutation happens in place, no modal dialogs, using native browser elements only (zero new deps; design §6 is the behavior home — cite, do not restate §K). The surface: the **sidebar** inline-adds projects, labels, and people (`+ Add …` → inline input → the registry/people endpoints), edits a person inline, and shows a **trailing count badge** per smart view / project / label (`/api/counts`; the Overdue badge turns red); **task rows** carry a click-to-edit title (with `@`/`#`/`+` autocomplete, also in quick-add and the below-list `+ Add task`), inline **chips** for project / label / assignee, a **friendly due pill** (relative for near dates, absolute beyond — never raw ISO), a pencil that opens the detail toolbar, a larger completion checkbox with strikethrough-on-complete, and the **LNO letter badge** (design D2 — green "L" leverage / blue "N" neutral / nothing for overhead; click cycles); a **row click outside the title opens the detail panel** (rename is the title click); **subtasks** render nested under their parent, collapsed behind a count chevron (via `include_children=1`), never as separate top-level rows; the **detail toolbar** shows a subtask's parent (with an open affordance), a check-in note input, a `type` dropdown (the 6-value enum, D1), a recurrence control (preset dropdown + a full-width free `every …` field revealed only for the `custom…` preset, validated server-side), a Project dropdown, native `Due`/`Start` datepickers, a tokenized **Labels chip input**, and a people multi-select sourced from `/api/people`. The **detail panel is collapsed until a task is selected** (the list reclaims the freed width). The **Today view leads with an "Overdue · N" group** above the day's tasks (overdue items surfaced atop, FR-5), and each view shows a **keyed explanatory empty state** with a focus-the-quick-add CTA when no task matches. **Quick-add** shows a live token-chip preview while typing and, on submit, a toast naming the destination bucket (project, or Inbox when none) + parsed fields. The `@` autocomplete carries an explicit **+ Add "@handle"** rung that mints a person via `POST /api/people` (a typo'd handle creates nothing unless clicked). **Completing a task** shows a toast with toast-window **Undo** (reverts while visible) and clears the detail panel. Friendly date + overdue-vs-upcoming colour selection live in `scripts/webapp/format.js` (pure, also unit-tested in `tests/run.mjs`). Existing flows (smart views, drag-reorder, the optimistic 409 reload banner) are unchanged — every mutation still carries `expected_version`. The `2026-06-29_mytasks-web-ux-fixes/02_design.html` design is the home for these UX-fix behaviors (§K).

---

## Phase 15: Goal CRUD {#goals}

Triggered by `goal add`, `goals`, `goal show/edit/drop/achieve <id>`. Goals live at `~/.pmos/tasks/goals/{id}-{slug}.md` — a second tracker collection (`schema.md` "Goal Schema"). All I/O goes through the `lib.js` goal primitives (`loadAllGoals`, `loadGoal`, `saveGoal`, `validateGoal`, `mintId`, `archiveGoal`); the skill never hand-writes a goal file. Enum values are **only** the three closed goal enums in `schema.md` — the skill validates against them and never invents a value.

Every write path ends with `saveGoal`, which **regenerates the `## Milestones` body mirror from the frontmatter list (INV-1)** and preserves `## Notes`; a `validateGoal` that returns errors aborts the write and prints them.

### `goal add <title>` {#goal-add}

Rich-capture, mirroring `#rich-capture`. Every field also has a **typed-value flag** for headless determinism (`--type`, `--cadence`, `--target`); a flag overrides its prompt.

1. Ensure `~/.pmos/tasks/goals/` exists; mint the id with `lib.mintId()` (the `<YYMMDD>-<rand3>` scheme, shared with tasks).
2. Prompt one field at a time via `_shared/interactive-prompts.md` (values per `schema.md` "Goal enum values"):
   1. **`type`** — `{dated, open-ended}`; default `dated`.
   2. **`cadence`** — `{daily, weekly, biweekly, monthly}`; default `weekly`.
   3. **`target`** — an ISO date (or natural-language date per `inference-heuristics.md`). **Prompted only for `dated`** goals; skipped (left a bare key) for `open-ended`.
3. Assemble `{fm:{schema_version:1, id, title, type, status:active, cadence, target, created:today, updated:today}, milestones:[], body:'## Notes\n'}`. Run `validateGoal`; on errors, print them and abort (no write).
4. `saveGoal`. Report: `Created goal #{id}: "{title}" ({type}, {cadence} cadence{, target {target} for dated}).`

**`--non-interactive`:** the title comes from the inline arg; `type`/`cadence` default (`dated`/`weekly`) unless a flag is given; `target` comes from `--target` (absent on a `dated` goal → left empty and recorded as an open question via the canonical classifier, per the non-interactive block). No blocking prompt.

### `goals` (list — pace-enriched) {#goal-list}

Print `lib.renderGoalsView(tasksDir)` verbatim — a markdown table of the **active** goals (achieved/dropped are archived, so absent), each row carrying its `type`, **both signal bands** (schedule + attention), `progress`, and next milestone+due, **behind/starved sorted first** (`lib.activeGoalPaces` computes + orders; derived on read, no persisted view — INV-1). The bands and numbers are **script-computed** — never estimate one (see [#pace](#pace)). Zero goals: renderGoalsView prints its own `No active goals` line.

### `goal show <id>` {#goal-show}

Locate via `loadGoal` (id used verbatim — goals only ever carry the `<YYMMDD>-<rand3>` scheme, no legacy serials to normalize). Not found → `No goal with id {id}. Run /mytasks goals to see all goals.` On hit, print the file contents verbatim (fenced markdown) — the `## Milestones` mirror already renders each milestone's checkbox + due + met-date.

### `goal edit <id> [<field>=<value>]` {#goal-edit}

1. Locate via `loadGoal`; not found → the `#goal-show` error.
2. **Inline form** (`goal edit <id> status=achieved`): validate the field against the goal schema (editable: `title`, `type`, `status`, `cadence`, `target`; skill-managed `id`/`created`/`updated`/`schema_version`/`milestone_seq` are rejected). Enum fields validate against `schema.md`; `target` is ISO-or-empty and rejected on an `open-ended` goal. **Interactive form** (`goal edit <id>` with no assignment): pre-filled walk of `title`/`type`/`cadence`/`target`/`status` via `_shared/interactive-prompts.md`.
3. Set `updated:` = today; run `validateGoal`; on errors abort. `saveGoal` (rename the file when `title` changed — new slug, same id prefix). Report `Updated goal #{id}: {field} = {value}.` (or `Refined goal #{id}.` for the interactive walk). **Setting `status` to `achieved`/`dropped` via edit does the same archive as `#goal-achieve`/`#goal-drop`.**

### `goal drop <id>` / `goal achieve <id>` {#goal-achieve}

<!-- defer-only: destructive -->
Terminal transitions — the goal leaves every active surface (INV-3). Under `--non-interactive` these run without a confirm prompt (the verb is the explicit intent); interactively, confirm first per `_shared/interactive-prompts.md`.

1. Locate via `loadGoal`; not found → the `#goal-show` error.
2. Set `status:` = `achieved` (achieve) or `dropped` (drop), `updated:` = today; `saveGoal`.
3. `archiveGoal` — move (not delete) the file to `~/.pmos/tasks/archive/YYYY-QN/{id}-{slug}.md` per `_shared/tracker-crudl.md` §6 (shared tasks archive root). Report `Achieved goal #{id}: "{title}" → archived {quarter}.` / `Dropped goal #{id}: "{title}" → archived {quarter}.`

---

## Phase 16: Milestone verbs {#milestones}

Triggered by `milestone add/met/edit/drop <goal> [<ref>]`. A milestone is an embedded entry in its goal's `milestones:` frontmatter list — never its own file (`schema.md` "Milestones"). Every verb loads the goal (`loadGoal`), mutates the in-memory `milestones` array, and calls `saveGoal`, which **regenerates the `## Milestones` body mirror (INV-1)**. `<goal>` locates via `loadGoal` (same not-found message as `#goal-show`); `<ref>` is an `m<N>` handle and an unknown ref prints `Goal #{goal} has no milestone {ref}. Refs: {comma-separated list or "(none)"}.`

- **`milestone add <goal> <description> [--due <date>]`** — mint the ref with `lib.nextMilestoneRef(goal.fm, goal.milestones)` (bumps the goal's monotonic `milestone_seq`, so a previously-dropped ref is **never reused** — INV-2). Push `{ref, description, due (ISO or empty; `--due` or a trailing natural-language date per `inference-heuristics.md`), met:false, met_date:''}`; `saveGoal`. Report `Added {ref} to goal #{goal}: "{description}"{ (due {due})}.`
- **`milestone met <goal> <ref>`** — set that milestone's `met: true`, `met_date:` = today; `saveGoal`. Report `Marked {ref} met on goal #{goal} ({met N/total}).` **Achieving a milestone never auto-achieves the goal** — `goal achieve` is the explicit transition.
- **`milestone edit <goal> <ref> [<field>=<value>]`** — inline (`description=…` / `due=…`) or an interactive pre-filled `description`/`due` walk. Validate `due` as ISO-or-empty. `saveGoal`. Report `Updated {ref} on goal #{goal}.`
- **`milestone drop <goal> <ref>`** — remove the entry with that `ref` from the array; `saveGoal`. The `milestone_seq` counter is **not** decremented, so the dropped ref is retired for good (INV-2). Report `Dropped {ref} from goal #{goal}.`

Set `updated:` on the goal = today on every milestone write (the mutation changed the goal file).

## Phase 17: Attach / detach a task or project to a goal {#attach}

Triggered by `attach <task|project> <goal> [<milestone>]` and `detach <task|project>` — plus the natural-language forms ("attach this to the goals feature goal", "attach the platform-q3 project to #{goal}", "detach this from its goal", "this task counts toward no goal"). This is the **connect-work-to-goals** half (design §3, INV-6): attaching a **task** sets its `goal:`(+optional `milestone:`); attaching a **project** appends its slug to the goal's `attached_projects` so every task in that project **inherits** the goal (`schema.md` [Effective-goal resolution](schema.md) — `effectiveGoal` computes direct-wins / inherit / `none`-detaches; the skill never hand-resolves).

**Target kind (task vs project).** Resolve the first argument with `lib.findItemFile(tasksDir, <arg>)`: a hit ⇒ **task**; otherwise treat `<arg>` as a **project slug** (projects are free strings — an as-yet-taskless project is a valid attach target). The NL forms disambiguate explicitly ("the … project" ⇒ project; "this"/a task id ⇒ task).

All four operations go through the `lib.js` helpers, which **validate the target before any write** — attaching to a non-existent goal or milestone throws and mutates nothing on disk (INV-6). Never hand-edit a task or goal file for attachment.

- **`attach <task> <goal> [<milestone>]`** — `lib.attachTaskToGoal(tasksDir, taskId, goalId, milestoneRef)`. Errors (writing nothing) if the goal is unknown or the milestone ref isn't on that goal; else sets the task's `goal:` + `milestone:` (bumps `updated`). Report `Attached task #{task} to goal #{goal}{ · milestone {ref}}.`
- **`attach <project> <goal>`** — `lib.attachProjectToGoal(tasksDir, slug, goalId)`. Appends the slug to the goal's `attached_projects` (bumps `updated`). Errors if the goal is unknown, or if the project is **already attached to a different goal** (a project maps to at most one goal — AC2); the error names the current goal so the user can `detach` first. Report `Attached project "{slug}" to goal #{goal} — its {N} task(s) now inherit it.`
- **`detach <task> [--clear]`** — `lib.detachTask(tasksDir, taskId, {clear})`. Default sets the task's `goal:` → `none` (an **explicit detach** that wins over any project inheritance — the task counts toward no goal); `--clear` (NL: "clear its goal entirely", "let it inherit again") empties `goal:` instead, so the task falls back to inheriting its project's goal. Clears `milestone:`. Report `Detached task #{task}{ (now inheriting its project goal)}.`
- **`detach <project>`** — `lib.detachProject(tasksDir, slug)`. Removes the slug from whichever goal carries it (errors if no goal does). Report `Detached project "{slug}" — its tasks no longer inherit a goal.`

After any attach/detach, if a goal id or milestone was named that turns out unknown, surface the thrown error verbatim (`no goal '…'`, `goal '…' has no milestone '…'`) — do **not** silently create a goal. Attachment is always to an existing goal (`goal add` first).

## Phase 18: Goal pace signals & surfacing {#pace}

The pace-sensing half (design §4/§5, INV-7/8/9, D1/D2/D3/D7). Every band and number is a **pure `lib.js` function** — the skill reads them, it **never estimates a band or a percentage** (§H hard gate). All three trust rules are enforced in `lib.js`, not by prompt:

- **Schedule** — `lib.scheduleSignal(goal, today, milestoneProgress)` → `on-track | at-risk | behind | done`, or **`null` for open-ended goals** (they have no deadline, so they never read "behind" — D2). `at-risk` = next milestone due within `AT_RISK_DAYS` (7) with progress below `AT_RISK_PCT` (50%).
- **Attention** — `lib.attentionSignal(goal, effectiveTasks, today)` → `fed | starved | no-tasks-yet`. Starved = no **real progress** (a completed **or created** attached task) within `cadenceWindow(goal.cadence)`. A bare `updated` bump is **not** progress (D7 — the trust catch). Zero effective tasks → `no-tasks-yet` (grace state, INV-9), never falsely starved.
- **Progress** — `lib.goalProgress` (task-derived; zero tasks → `no tasks yet`, never 0% — INV-9) and `lib.milestoneProgressMap` (a manual `met` flag reads 1 regardless of task state — INV-8). Effective tasks are resolved once via `effectiveGoal` (direct-wins / inherit / `none`-detaches — INV-4/5, no double-count).

**Surfacing (derived on read):**
- **`goals` view** — [#goal-list](#goal-list), via `lib.renderGoalsView`.
- **Bare `/mytasks` index** — `renderIndex` prepends a compact `## Goals` summary (`lib.goalsIndexSummary`) listing **only** behind/starved/at-risk goals; **quiet (empty) when every goal is healthy** — it never cries wolf (D4b).
- **`/morning-brief` hook** — `lib.goalsForBrief(tasksDir, today)` returns behind+starved active goals; `/morning-brief` reads it and renders a "goals needing attention" lane in its `/mytasks` read-only lane (an **integration point** — mytasks owns the computation, the brief only reads + renders; D4c).
- **Web** — `GET /api/goals` returns each active goal's computed pace; the web app shows goals **read-only** ([#web-api](#web-api), AC6). Goals are created/edited via the terminal verbs only.

## Anti-patterns {#anti-patterns}

- **Never estimate a pace band the script computes.** `schedule`/`attention`/`progress` come only from the `lib.js` pure functions ([#pace](#pace)) — the model does not eyeball "this looks behind". Arithmetic a script can do, a script does (§H).
- **A trivial edit is not progress.** A bare `updated` bump must never read as attention-feeding activity — only a completed or created attached task counts (D7). This is what keeps the starved signal trustworthy instead of crying wolf.
- **Never mark an open-ended goal "behind."** Open-ended goals have no deadline; `scheduleSignal` returns `null` for them (D2). Surfacing must render the absence (e.g. `—`), never invent a band.
- **Goals are edited in the terminal, not the browser.** The web `/api/goals` surface is read-only by design (AC6) — do not add create/edit affordances to the web app.
