# Pipeline Bridge

Defines the `--backlog <id>` contract that the `/backlog` skill and the pipeline skills (`/requirements`, `/spec`, `/plan`, `/execute`, `/verify`) jointly implement.

## Principle

Pipeline skills mutate backlog item state ONLY when `--backlog <id>` is explicitly passed. Without it, the backlog is invisible to them. This is the consent gate that prevents surprise edits when a user runs a pipeline skill on something unrelated.

## Lifecycle

| Pipeline event | Item update | Trigger |
|---|---|---|
| `/requirements --backlog <id>` writes its doc | item `source:` set to the requirements doc path | The `/requirements` skill invokes `/backlog set` (`SKILL.md#set`) after writing its output |
| `/spec --backlog <id>` writes its doc | item `spec_doc:` set; status: `inbox`/`ready` -> `spec'd`; `planned`+ unchanged | `/spec` invokes `/backlog set` twice (one for spec_doc, one for status if applicable) |
| `/plan --backlog <id>` writes its doc | item `plan_doc:` + `tasks_file:` set; status -> `planned` | `/plan` invokes `/backlog set` (the tasks.yaml emission is /plan's, per `schema.md`) |
| `/execute --backlog <id>` starts | status -> `in-progress` | `/execute` invokes `/backlog set` at the start of execution |
| `/verify --backlog <id>` reports PASS | status -> `done`; `pr:` filled if available from git context | `/verify` invokes `/backlog set` |
| `/verify --backlog <id>` reports FAIL / PASS-WITH-GAPS | status -> `blocked`; gap lines appended to the item's `## Notes` body | `/verify` invokes `/backlog set` + appends the gap text (D11/the return-to-human channel) |
| `/complete-dev --epic <id>` ships | `released: vX.Y.Z` on every shipped story + the epic | `/complete-dev` is the SOLE writer of `released:` (D6) |

## Three-loop write-back rules (stories — D11/D12)

When a pipeline skill mutates a **story** item (claim, status, blocked-gaps, released):

1. **Main-checkout only.** Backlog item files are mutated exclusively in the main checkout, never via a worktree's copy — a status written on a story branch is invisible to the main-checkout picker until release, so `done` stories would be re-picked. Resolve the main checkout via `git worktree list --porcelain` (the entry whose branch is the default branch). `tasks.yaml`, by contrast, stays branch-local and is read **through** the worktree directory while a story is claimed.
2. **Auto-commit, path-scoped.** Every mutation commits immediately with `git -C <main-checkout> commit -- backlog/` and a conventional message (`chore(backlog): 0012 → in-progress [claim]`). Docs-only, direct-to-main, same low-risk class as the definition merge (D20). This gives claims crash-durability + an audit trail and keeps main clean between unattended iterations.
3. **PASS-WITH-GAPS is the human channel.** A story never silently passes with gaps: `/verify`'s PASS-WITH-GAPS (or FAIL) writes `blocked` and appends the enumerated gaps to `## Notes`, so the story resurfaces in `/backlog groom` for a human to unblock.

## Auto-prompt (offered seeds)

When `/requirements` or `/spec` is invoked with an empty argument string AND `--backlog` is not provided AND a `<repo>/backlog/items/` directory exists:

1. Read items via the workstream aggregator (`SKILL.md#workstream-aggregator`) if a workstream is linked, else local items only.
2. Filter to candidate statuses: `/requirements` -> `inbox` or `ready`; `/spec` -> `ready`.
3. Sort by priority bucket (must>should>could>maybe), then `score` desc, then `updated` desc.
4. Take the top 5.
5. Offer them via `AskUserQuestion`:
   ```
   No seed provided. Pick a backlog item to start from?

     1. #0042 [must, bug] SSL renewal cron is flaky
     2. #0017 [should, feature] Add OAuth support
     ...
     6. (skip — proceed with no seed)
   ```
6. If user picks one, set the seed to that item's content AND set `--backlog <id>` for the rest of the invocation.

This auto-prompt is a one-shot at the start of the skill; it does NOT recur.

## Auto-capture (deferred items flow into backlog)

`/plan` and `/verify` produce sections that surface deferred or out-of-scope work. Before those skills exit, they:

1. Detect candidate items in their output (heuristic: bulleted items under headings like "Deferred", "Out of scope", "Follow-up", "Future work", "Known limitations").
2. Construct a list of proposed backlog entries:
   - `title`: the bullet text (truncated to 100 chars)
   - `type`: inferred via `inference-heuristics.md`
   - `status`: `inbox`
   - `source`: the doc path being written
3. Show the proposed list to the user (`AskUserQuestion`):
   ```
   I detected 3 deferred items in this {plan|verify} output. Capture to backlog?

     1. Capture all
     2. Pick which to capture
     3. Skip
   ```
4. On confirm, invoke `/backlog add ...` (`SKILL.md#add`) for each, with the `source:` field pre-filled.

## Implementation pattern for pipeline skills

Each pipeline skill adds, near the top of its phase body, this Subroutine:

```markdown
### Subroutine: Backlog Bridge

If `--backlog <id>` was passed:
- After writing the primary output doc AND committing it, invoke `/backlog set <id> {field}={value}` for the relevant field per the lifecycle table.
- **Guard:** only invoke the set when (a) the doc was actually written this run AND (b) the commit succeeded. Skip silently if either fails.
- **Re-run idempotency:** if the same `<id>` was used in a prior run and the source path differs, append a one-line history entry to the backlog item: `- {YYYY-MM-DD}: <skill> doc rewritten by user`.
- If the set fails (item not found, etc.), emit a single-line warning and continue.

If `--backlog` was NOT passed AND argument is empty AND backlog/items/ exists:
- Run the auto-prompt flow above.

(For /plan and /verify) After the primary doc is written:
- Run the auto-capture flow above.
```

The skill body cites this reference document instead of restating the contract; only the per-field mapping changes per skill.
