# `00_pipeline.md` template + in-chat status table

Markdown skeleton for the human-readable pipeline-status doc written at `<worktree>/.pmos/feature-sdlc/00_pipeline.md`. Kept in sync with `state.yaml` after every status change. The skill also prints a terser version of this table to chat after each phase.

`schema_version: 1` is mandatory in every rendered file (matches `state-schema.md`).

---

## Full template — `00_pipeline.md`

```markdown
# /feature-sdlc — pipeline status

- **schema_version:** 1
- **Slug:** <slug>
- **Tier:** <1 | 2 | 3 | unset>
- **Mode:** <interactive | non-interactive>
- **Worktree:** <abs path | --no-worktree>
- **Branch:** <feat/<slug> | n/a>
- **Feature folder:** <abs path>
- **Started:** <ISO-8601>
- **Last updated:** <ISO-8601>
- **Current phase:** <phase id>

## Phases

| # | Phase | Hardness | Status | Artifact | Timestamp | Notes |
|---|-------|----------|--------|----------|-----------|-------|
| 0 | setup | infra | pending | — | — | — |
| 0a | worktree | infra | pending | — | — | — |
| 1 | init-state | infra | pending | `00_pipeline.md` | — | — |
| 3 | requirements | hard | pending | — | — | — |
| 3b | grill | soft | pending | — | — | — |
| 4a | msf-req | soft | pending | — | — | — |
| 4b | creativity | soft | pending | — | — | — |
| 4c | wireframes | soft | pending | — | — | — |
| 4d | prototype | soft | pending | — | — | — |
| 5 | spec | hard | pending | — | — | — |
| 6 | simulate-spec | soft | pending | — | — | — |
| 7 | plan | hard | pending | — | — | — |
| 8 | execute | hard | pending | — | — | — |
| 9 | verify | hard | pending | — | — | — |
| 10 | complete-dev | hard | pending | — | — | — |
| 11 | final-summary | infra | pending | — | — | — |
| 12 | capture-learnings | infra | pending | — | — | — |

## Folded-phase failures (N)

Emitted ABOVE the Deferred questions section when ≥1 phase has a non-empty `state.yaml.phases.<x>.folded_phase_failures[]`. When N=0 across all phases, **omit this subsection entirely** — no decoration, no "_(none)_", no header.

Format (one line per failure record across all phases):

```text
[<phase>] <folded-skill> crashed: <error_excerpt> (ts: <ts>)
```

Example with 2 records:

```markdown
## Folded-phase failures (2)

[requirements] msf-req crashed: ApplyError: persona inference returned empty (ts: 2026-05-10T01:14:22Z)
[spec] simulate-spec crashed: subprocess timeout after 60s (ts: 2026-05-10T01:31:08Z)
```

## Deferred questions

If `--non-interactive` mode produced any deferred entries, see [`00_open_questions_index.md`](./00_open_questions_index.md) for the aggregated index. Otherwise this section is "_(none)_".
```

The phase numbers above match the spec's `## 5. Phases` declared order, with the recurring `compact-checkpoint` not present as a row (it writes its pause record into the *next* phase's row, not its own).

---

## In-chat short-form table

Printed to chat after each phase status change. Three columns only — keeps the chat scrollback readable across long pipelines:

```markdown
| Phase | Status | Artifact |
|-------|--------|----------|
| requirements | completed | 01_requirements.md |
| grill | completed | grills/2026-05-09_01_requirements.md |
| wireframes | paused (compact) | — |
| prototype | pending | — |
```

Only emit phases whose status is not `pending` plus the immediately-next pending phase (so the user sees what's done and what's coming next).

---

## Update protocol

After every phase end (pass / fail / skip / pause), run atomically — never partial:

1. Update `state.yaml`.
2. Regenerate `00_pipeline.md` from this template using current state.
3. Print the in-chat short-form table.

A failed update of any one of these three breaks the resume contract — `state.yaml` and `00_pipeline.md` must agree on every read.
