# /mytasks Output Formats

Exact report templates and prompt copy for the capture flows. `SKILL.md` phases cite these sections; `tests/scenarios.md` asserts the literal strings. The governing principle: **confirm every mutation in one line carrying the id and any inferred or changed fields; list each unresolved `@token` on its own indented line with the exact fix command.**

## Quick-capture report

Used by Phase 2 step 7.

```
Captured #{id} ({type}, {importance}): "{final title}"
```

Append clauses for non-default values, separated by ` — `:

- `due {due}` if due was inferred.
- `people: {comma-separated handles}` if any resolved.

(No `project` clause on quick-capture — `project` is manual and never inferred, so it is always Inbox/absent here.)

Then, on subsequent indented lines, list any unresolved `@handle` tokens:

- No-match: `⚠ unresolved: @{token} — run /people add {token}, then /mytasks set {id} people=<handle>`
- Multi-match: `⚠ unresolved: @{token} — multiple matches ({comma-separated handles}); run /mytasks set {id} people=<handle>`

Examples (ids use the current `<YYMMDD>-<rand3>` scheme):

```
Captured #260613-c31 (call, neutral): "Call sarah about Q3 OKRs" — due 2026-05-01
```

```
Captured #260613-a3f (execution, neutral): "Sync with @sarah on roadmap"
  ⚠ unresolved: @sarah — multiple matches (sarah-chen, sarah-patel); run /mytasks set 260613-a3f people=<handle>
```

## Rich-capture report

Used by Phase 3 step 5.

```
Added #{id} ({type}, {importance}): "{title}"
```

Append clauses (` — ` separated) for any non-default values:

- `due {due}`
- `project {project}`
- `people: {comma-separated handles}`
- `checkin {cadence} (next {next_checkin})`

Then list any unresolved person tokens on indented lines (same format as the quick-capture report).

## Unknown-person prompts

Used by Phase 3 step 2 (and the `refine` people prompt). Presented as multi-option prompts per `_shared/interactive-prompts.md`.

Multi-match:

```
'{token}' matches multiple people — which one?
  (a) {handle-1} ({name})
  (b) {handle-2} ({name})
  ...
  (c) skip — leave '{token}' unresolved
```

User picks one; add that handle. If "skip", leave unresolved (collect for the report).

No-match:

```
No match for '{token}' — what would you like to do?
  (a) create new person '{token}'
  (b) pick existing: {ranked-list-of-near-matches-or-"(none with similar name)"}
  (c) skip — leave '{token}' unresolved
```

If `(a)`, invoke `/people` reactive create (`/people` Phase 3 reactive entry point) with the name token; receive the new handle and add it. If `(b)` and there are near-matches, prompt to select; add the chosen handle. If `(c)` or no near-matches in `(b)`, leave unresolved.
