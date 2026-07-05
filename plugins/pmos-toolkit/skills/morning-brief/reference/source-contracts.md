# Source read contracts + the run-model

Companion to the epic design (`docs/pmos/features/2026-07-02_morning-brief/02_design.html`,
§4 source abstraction, §6 pipeline, §7 manifest). The SKILL.md sweep phase cites this file;
the deterministic parts (window math, counts, brief render) live in `scripts/lib.mjs` +
`scripts/render-brief.mjs`, never in prose (§H).

## Per-kind read contract (per run window)

A source is anything with a connector the session can call. Resolve the concrete MCP
tools at run time via **ToolSearch by the declared `connector` hint** (D5) — never a
hardcoded tool inventory. Then read per the source's `kind`:

| kind | read (within the window) | native dismiss |
|---|---|---|
| `email` | threads new-in-window **+** threads still unarchived/unreplied (carryover) | archive / label |
| `calendar` | today + tomorrow's events; new invites needing a response | respond to invite |
| `doc-comments` | comment threads mentioning/assigned to you, new + still-unresolved | resolve / reply |
| `chat` | mentions + DMs new-in-window (declare only when a connector exists) | varies / none |
| `custom` | the user's free-text read instruction, interpreted at run time | none unless declared |

**Unreachable ≠ silent.** A declared source whose connector is missing, unauthed, or
erroring is recorded as `status: failed, reason: <why>` and the run continues with the
remaining sources (D6). A failed source shows in the brief header line, not only the
manifest body (§7).

**Window.** First run (no cursor): reach back `first_window_days` (default 7, D9).
Otherwise: `cursor.last_run → now`. Carryover (still-unresolved) reaches back
`carryover_horizon_days` (default 14, D10); items older than that are **counted** in the
manifest (`beyond_horizon`) but **not rendered**. All of this is computed by
`lib.computeWindow(cursor, settings, nowIso)` — do not do date arithmetic by hand.

**Parallelism (§L).** Per-source sweeps MAY dispatch parallel subagents (sonnet — a
bounded read+extract per source; the parent validates). Categorization and ranking stay
in the **parent** (inherit) — they need the whole picture plus the user's rules.

## Normalized item (what each sweep returns)

Each swept item is normalized to this shape before categorize/rank:

```json
{
  "id":     "stable-per-source id (thread id, event id, comment id)",
  "source": "the declared source id it came from",
  "ts":     "ISO timestamp of the item",
  "who":    "sender / organizer / commenter (may be empty)",
  "summary":"one-line human summary (LLM)",
  "link":   "deep link into the source, or \"\" when the connector gives none",
  "raw_signals": "optional category hints observed while reading"
}
```

`id`, `source`, `ts`, `link` are read straight from the connector. `summary` and
`raw_signals` are LLM judgment. Nothing here is persisted (INV-1) — the item exists only
for this run.

## Run-model (the JSON `render-brief.mjs` consumes)

After categorize + rank, assemble ONE run-model and hand it to
`node scripts/render-brief.mjs <model.json> [--out <storeDir>]`. The script computes all
manifest counts and writes `briefs/YYYY-MM-DD[-N].html` (D7 suffixing):

```json
{
  "date": "2026-07-05",
  "window": { "from": "…Z", "to": "…Z", "first_run": true, "first_window_days": 7, "carryover_horizon_days": 14 },
  "sources": [
    { "id": "gmail", "kind": "email", "priority": 1, "status": "swept",
      "counts": { "new": 4, "carryover": 2, "beyond_horizon": 3 } },
    { "id": "notion", "kind": "doc-comments", "priority": 3, "status": "failed", "reason": "connector unauthed" }
  ],
  "items": [
    { "id":"i1", "source":"gmail", "ts":"…Z", "who":"Alice", "summary":"…",
      "link":"https://…", "category":"do", "tier":"today", "why":"rule: sign-off = do", "no_rule_matched": false }
  ],
  "lane": { "overdue": [], "due": [], "checkins": [], "waiting": [] },
  "proposals": [ { "action":"create-task", "summary":"…" } ]
}
```

- `tier` ∈ `today` (Needs you today) · `knowing` (Worth knowing) · `fyi` (FYI, collapsed
  per-source). Every item lands in exactly one tier; tiering sets **prominence, never
  inclusion** (INV-2 — every item is rendered at least as an FYI row).
- `no_rule_matched: true` flags an item no `rules.md` bullet matched — it still renders
  and is listed in the manifest.
- `lane` is produced by `lib.mytasksLane(tasksDir, nowIso)` (read-only, INV-6); pass
  `{ "absent": true }` (or omit) when there is no `/mytasks` store.
- `proposals` is **informational only** in this story (the confirm/act lane is ww7).
