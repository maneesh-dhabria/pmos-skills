# Design Brief — `/mytasks` Web UI

**Date:** 2026-06-13
**Skill:** `pmos-toolkit/mytasks`
**Status:** Approved design brief — feed into `/skill-sdlc --from-feedback <this file>`
**Type:** Enhancement (web interface + schema extensions + one correctness fix)

---

## 1. Problem & intent

`/mytasks` today is a terminal-only, file-based personal task tracker (one markdown file per task at `~/.pmos/tasks/items/{id}-{slug}.md`, regenerable `INDEX.md`). Tasks are **flat** (no subtasks), organized by **LNO importance** and an auto-inferred **workstream**.

We want a **Todoist-class web interface** as the **primary** mode of interaction — view and manage tasks in the browser, backed by a **lightweight local server** that updates and persists the same markdown task files. The terminal must keep full parity: every web capability stays reachable from the Claude Code CLI.

**Non-negotiable invariants carried forward:**
- The markdown task files remain the single source of truth. The web layer is a view/editor over them, never a separate store.
- Hard isolation from `/backlog` (no code path reads/writes `<repo>/backlog/`).
- `~/.pmos/` stays local-first; sync stays opt-in (`git init ~/.pmos/`), never enforced.

---

## 2. Decisions (locked with the user)

| # | Decision | Choice | Rationale / implication |
|---|---|---|---|
| D1 | Subtask model | **Full child task files** with `parent: <id>` | Each subtask is a real task with all fields (due, people, importance, recur, check-in). Uniform file model; nest in views. |
| D2 | Projects vs workstream | **Replace `workstream` with a user-curated `project`** | Todoist-style container. Needs a one-time field-rename migration. `labels` = tags (unchanged). |
| D3 | Project seeding | **Fully manual** (defaults to Inbox/none) | `project` is never auto-set from repo context; user assigns explicitly. (Drops the old auto-inference-from-`.pmos/settings.yaml` behavior.) |
| D4 | Server foundation | **Adapt the `comments` `serve.js`** | Zero-dep Node, localhost-only, atomic temp-then-rename writes, optimistic-concurrency 409s, PID-file reuse, idle auto-shutdown, launcher trio. No new deps; consistent with repo. |
| D5 | Priority model | **Keep LNO importance** (leverage/neutral/overhead) | The skill's signature axis. Rendered as 3 colored flags. No enum change. |
| D6 | Primary navigation | **Smart views + Projects + Labels sidebar** | Today / Upcoming / Overdue / Waiting / Check-ins due → Projects (+ Inbox) → Labels. Detail panel on the right. |
| D7 | Ordering | **Manual order within a project** (new `order:` field) | Drag-to-reorder inside a project/list. Smart date-views stay deterministically date-sorted (manual order is meaningless across projects). |
| D8 | Recurring tasks | **In v1; spawn-new-instance** | On completing a recurring task: mark it `completed`, then mint a brand-new task (fresh `<YYMMDD>-<rand3>` id) for the next occurrence with `due` advanced. |
| D9 | Quick-add grammar | **`@person`, `#project`, `+label`, NL dates** | Preserves the established `@handle` = person convention (resolved via `/people`). `#` = project, `+` = label, dates via existing `inference-heuristics.md`. |
| D10 | Deliverable | **This design brief** → `/skill-sdlc` | Skill change ships through the canonical requirements → spec → plan → execute → eval → verify pipeline. |
| D11 | Server-required UI | **No `file://` degrade mode** | Unlike `comments` (read-only from disk), the task app needs the server to function. Opening it without a server shows a "run `/mytasks web`" modal. |
| D12 | ID correctness | **Fold the id-scheme fix into this work** | Pre-existing gap (see §6); fixed as part of the same change so it goes through the eval gate. |

---

## 3. Architecture

### 3.1 Components

```
┌────────────────────────────────────────────────────────┐
│  Browser (single-file HTML+JS app, served at /)         │
│   sidebar · task list · detail panel · quick-add        │
└───────────────┬────────────────────────────────────────┘
                │  JSON API (localhost only)
┌───────────────▼────────────────────────────────────────┐
│  serve.js  (zero-dep Node, adapted from comments)       │
│   - reads/writes ~/.pmos/tasks/items/*.md fresh         │
│   - atomic temp-then-rename writes                      │
│   - regenerates INDEX.md after every mutation           │
│   - optimistic concurrency (expected_version → 409)     │
│   - PID-file reuse · idle auto-shutdown · localhost bind│
└───────────────┬────────────────────────────────────────┘
                │  the files ARE the source of truth
┌───────────────▼────────────────────────────────────────┐
│  ~/.pmos/tasks/items/{id}-{slug}.md   +   INDEX.md      │
└────────────────────────────────────────────────────────┘
```

The server is **stateless** with respect to task data — it never caches tasks in memory; every request re-reads the relevant files. This guarantees terminal edits and web edits never diverge.

### 3.2 Launch flow
- New subcommand **`/mytasks web`**: precheck `node`, reuse a live `serve.js` via the PID file or spawn a fresh one (`--port=0 --idle=300`), open the default browser at `http://127.0.0.1:<port>/`.
- Launcher trio mirrors `comments`: `mytasks-open.command` (macOS), `.sh` (Linux), `.bat` (Windows). Bash-3.2-safe; `BASH_SOURCE[0]` fallback per the repo Bash-portability invariant.

### 3.3 JSON API (indicative)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/tasks` | All active task files parsed → JSON (supports query filters mirroring `list`). |
| `GET` | `/api/tasks/:id` | Single task (incl. body sections: Notes, Check-ins, subtasks via `parent`). |
| `POST` | `/api/tasks` | Create (mints id via shared `<YYMMDD>-<rand3>` scheme; parses quick-add tokens). |
| `PATCH` | `/api/tasks/:id` | Update fields; body carries `expected_version` → `409` on stale. |
| `POST` | `/api/tasks/:id/checkin` | Append a check-in, advance `next_checkin`. |
| `POST` | `/api/tasks/:id/complete` | Status → completed; if `recur:` set, mint the next instance (D8). |
| `POST` | `/api/tasks/:id/drop` | Status → dropped. |
| `POST` | `/api/tasks/reorder` | Persist `order:` for a project's tasks (D7). |
| `GET` | `/api/meta` | Distinct projects + labels for the sidebar. |

Every mutating endpoint: validate against `schema.md` enums → atomic write → `rebuild-index` → return the new version. The server never deletes task files (completion/drop are status changes; archival stays the existing move-not-delete flow).

### 3.4 Concurrency & freshness
- Optimistic concurrency: task version = content hash (or mtime). `PATCH`/`complete`/etc. include `expected_version`; mismatch → `409` + a reload banner in the UI.
- Web refreshes on `window` focus + a light periodic poll while visible, so edits made in the terminal appear without a manual reload.

---

## 4. Data model changes (`schema.md`)

New/changed frontmatter fields:

```yaml
project: home-reno        # NEW — replaces `workstream`; user-curated; default none (Inbox)
parent: 260613-c31        # NEW — optional; present on subtasks (a full child task)
order: 3                  # NEW — optional integer; manual sort within a project
recur:                    # NEW — optional recurrence rule (weekly | every 2 weeks |
                          #       every monday | monthly | …); empty = non-recurring
labels: [urgent, errand]  # unchanged — tags
importance: leverage      # unchanged — LNO (leverage | neutral | overhead)
# … all existing fields (type, status, people, links, due, start, checkin,
#   next_checkin, created, updated, completed, schema_version) unchanged
```

- **Removed:** `workstream:` (renamed to `project:`).
- **`schema_version` bump** to reflect the new fields + rename.
- **Migration:** a one-time, idempotent pass (folded into `rebuild-index`) that renames `workstream:` → `project:` in every `items/**.md` and `archive/**.md` file. Tasks with no value land in Inbox (no `project:`).
- **Empty-optional binding preserved:** new optional fields with no value are written as bare keys (`parent:`, `order:`, `recur:`), never omitted.
- **Subtask semantics:** completing a parent does **not** auto-complete children; each child's status is independent. Views may indent/group children under their parent.
- **Recurrence semantics (D8):** on `complete` of a task with non-empty `recur:`, set `completed`/`updated`, then mint a new task (fresh id, same fields incl. `recur:` and `parent:`) with `due`/`start` advanced by the rule; log the completion to the old task's `## Check-ins`/`## Notes`.

---

## 5. Web UX

### 5.1 Layout
```
┌─────────────┬───────────────────────────┬──────────────────┐
│ SMART VIEWS │  Task list (selected view) │  Detail panel    │
│  Today (3)  │   🔴 Draft Q3 OKRs   due   │  title           │
│  Upcoming   │   ⚪ Call @sarah     today  │  notes           │
│  Overdue(1) │   ➖ Fix coffee mach        │  project · labels│
│  Waiting    │   …  (drag to reorder in   │  LNO · due/start │
│  Check-ins  │       a project view)      │  people · recur  │
│ PROJECTS    │                            │  ── Subtasks ──  │
│  Inbox      │                            │   ☐ draft copy   │
│  home-reno  │                            │   ☑ approvals    │
│  platform-q3│                            │  ── Check-ins ── │
│ LABELS      │                            │   2026-06-13 …   │
│  #urgent …  │  [ + Quick-add bar ]       │                  │
└─────────────┴───────────────────────────┴──────────────────┘
```

### 5.2 Interactions
- **Quick-add** (D9): one input parses `@person` (→ `/people find`, with the existing single/multi/no-match disambiguation), `#project`, `+label`, and natural-language dates (`inference-heuristics.md`). Unresolved `@` tokens stay in the title and are surfaced, mirroring terminal capture.
- **LNO flags** (D5): 3 colored indicators; click to change importance.
- **Drag-to-reorder** (D7): within a project view only; persists `order:`. Smart date-views remain date-sorted.
- **Subtasks** (D1): add/complete inline in the detail panel; each is a real task file with `parent:` set.
- **Check-ins / Waiting**: the Waiting smart view and Check-ins-due view surface the existing mytasks concepts; a check-in action lives on the detail panel and advances `next_checkin`.
- **Complete / Drop**: status actions; recurring completes spawn the next instance (D8).

---

## 6. Correctness fix folded in (id scheme)

Minting already uses the shared `<YYMMDD>-<rand3>` scheme (shipped v2.71.0). But stale 4-digit-serial assumptions remain and must be fixed as part of this work:

- **`SKILL.md` Phase 6 locate/normalize** (`#show`, used by `show`/`set`/`done`/`drop`/`checkin`/`refine`): currently says *"accept `42`, `0042`… zero-pad to 4 digits."* Replace with the **triple-accepting** locate per `_shared/tracker-crudl.md §2.1` — accept `<YYMMDD>-<rand3>`, `<MMDD>-<rand3>`, and legacy `0001`; locate via `items/{id}-*.md` glob without mangling non-serial ids.
- **Refresh stale examples** showing `0042`/`0001` in `schema.md`, `output-formats.md`, and `tests/scenarios.md` + `tests/fixtures/**` to use representative date-rnd ids (keep at least one legacy-id fixture to prove the triple validator still accepts old files).

---

## 7. Terminal parity

Every web capability stays CLI-reachable:
- **New:** `/mytasks web` (launch the UI).
- **Extended `set`:** `set <id> project=<p>`, `parent=<pid>`, `recur=<rule>`, `order=<n>`.
- **Extended `add`:** `--parent <id>` (capture a subtask); quick-add token grammar (`@`/`#`/`+`) honored in bare-text capture.
- **Views:** `show`/`list`/named views render project, subtasks (indented under parent), and recurrence.
- **Migration:** `rebuild-index` performs the idempotent `workstream→project` rename.

---

## 8. Scope guard

**In (v1):** web UI + server, subtasks (child files), `project` field + migration, labels, manual order, recurring (spawn-new), check-ins/waiting surfacing, LNO, quick-add token grammar, the id-scheme correctness fix, terminal parity.

**Out (v2+):** multi-user / cross-machine real-time sync, native mobile, calendar/notification integrations, server-push (SSE) live updates beyond focus-poll, bulk-edit/multi-select power features.

---

## 9. Open items for the spec stage

- Exact recurrence rule grammar + parser (which phrases, how `due`/`start` advance, month-clamping like the existing check-in `monthly` rule).
- Version token choice (content hash vs mtime) and the `409` reload UX copy.
- Whether `INDEX.md` should gain `project` + subtask-nesting columns, or stay as-is (web reads items directly, so this is a terminal-readability call).
- Bundle-size budget for the app (align with the comments-authoring NFR posture if reused).
- Where the served app's HTML/JS assets live under `plugins/pmos-toolkit/skills/mytasks/` and how `serve.js` resolves them.

---

*Next step: run `/skill-sdlc --from-feedback docs/design-briefs/2026-06-13-mytasks-web-design.md` to take this through the requirements → spec → plan → execute → eval → verify pipeline.*
