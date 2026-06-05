---
name: comments
description: Resolve open inline-doc-comment threads on a pmos HTML artifact — dispatch each thread into its originating skill's apply-edit entrypoint and stage the edits for review (never commits). Use when the user says "resolve the comments", "process the inline comments", "apply the reviewer comments on <artifact>", "work through the doc comments", "action the review threads", or "/comments resolve <path>".
user-invocable: true
argument-hint: "resolve <path> [--confirm-each|--batch|--auto|--non-interactive]"
---

# /comments

**Announce at start:** "Using /comments to resolve open inline-doc-comment threads."

`/comments resolve <artifact-path>` reads an HTML artifact's open comment threads, looks up the artifact's originating skill via its `<meta name="pmos:skill">` tag, dispatches a per-thread subagent that calls **that** skill's apply-edit-at-anchor entrypoint, and presents each proposed edit for confirmation. On Accept it writes the edit, marks the thread `resolved`, and runs `git add` — **never `git commit`**. The operator reviews the staged diff and commits separately.

The persistence format, payload shapes, and serializer are owned by the controller (`scripts/resolver.js`) and the contract docs below — this body does not restate them. Multiple artifacts can be resolved in sequence by re-invoking the skill.

## When to use this

- A reviewer left inline comments on a pmos HTML doc (spec, requirements, plan, wireframes, …) and the author wants them actioned.
- The user wants proposed edits staged for review without auto-committing.
- A prior `/comments` run left threads open (clarification, reject) and the user wants to re-engage them.

**When NOT to use:**
- The artifact has no `<meta name="pmos:skill">` routing tag → there is no apply-edit entrypoint; fix at emission, not here.
- The user wants to *write* a comment (that happens in the browser overlay), not resolve one.

## Track Progress

This skill has multiple phases. Create one task per phase using your agent's task-tracking tool (e.g., `TaskCreate` in Claude Code). Mark each task `in_progress` when you start it and `completed` when it finishes — never batch completions.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No `AskUserQuestion` tool:** Degrade the Accept/Reject/Modify/Skip and clarification prompts to numbered free-form prompts per `_shared/interactive-prompts.md`.
- **No subagents:** The per-thread apply-edit dispatch (Phase 2) is the core of this skill; without a way to run a child agent against the originating skill, the resolver cannot route edits — refuse with a clear message rather than guessing edits in the controller.
- **Node.js required:** `scripts/resolver.js` + `scripts/cli.js` run under `node`; this is the only external dependency.
- **No `.pmos/settings.yaml`:** Not needed — this is a standalone utility with no pipeline state to load.

**Authoritative refs** (do not restate; link):

- Architecture: [`docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html` §6.1](../../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#solution-architecture).
- Contract: [`plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md`](../_shared/apply-edit-at-anchor.md) — input/output JSON shapes, closed `error_enum`, idempotency.
- Spec API: [§9.1](../../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#api-apply-edit), [§9.2](../../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#api-error-enum), [§9.3](../../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#api-idempotency).
- FRs: FR-20, FR-22, FR-24, FR-27, FR-28, FR-31 in [02_spec.html §7](../../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#functional-requirements).

## Phase 0: Setup

This is a standalone utility — there is no pipeline state to load and no workstream context to attach. If the artifact path resolves under `docs/pmos/features/<workstream>/`, the resolver MAY emit a one-line "Operating on workstream `<name>`" note — informational only.

Read `~/.pmos/learnings.md` if present; note any entries under `## /comments` and factor them into your approach (e.g., a routing pattern that recurs, an anchor failure mode worth watching). Skill body wins on conflict; surface conflicts to the user.

## Phase 1: Intake

1. Resolve the artifact path argument to an absolute filesystem path.
2. Load the artifact's comment threads via the controller (`scripts/resolver.js`); refuse on a schema-version mismatch.
3. Read the artifact's `<meta name="pmos:skill" content="…">` tag (FR-01). The content value is the slug used to route subagent dispatch (FR-22). Refuse if absent — without the routing tag there is no apply-edit entrypoint to call.
4. Count threads where `status === "open"`. If zero, print a no-op summary and exit successfully (idempotent re-run friendliness; [§9.3](../../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#api-idempotency)).

## Phase 2: Per-thread dispatch

For each open thread the resolver builds the [§9.1](../../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#api-apply-edit) input payload from the thread's dual anchor + the **newest user message** body, then dispatches a subagent prefixed `[mode: <current-mode>]\n[output_format: html]\n` (FR-22(c)). The subagent calls its skill's "Apply comment-resolver edit" phase per the [shared contract](../_shared/apply-edit-at-anchor.md).

**Anchor strategy is owned by the originating skill, not by the resolver.** The resolver passes the raw `anchor` object through verbatim; id-first resolution + quote fallback live in each skill's apply-edit implementation. This keeps anchor math out of the controller — see "Anti-patterns".

The subagent returns one of three shapes ([§9.1](../../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#api-apply-edit)):

- **Success** — `{ success: true, diff_ref, system_reply, applied_artifact? }`. When `applied_artifact` is present the resolver uses it as the new on-disk artifact text.
- **Failure** — `{ success: false, error_enum, system_reply }`. `error_enum` is the closed set [§9.2](../../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#api-error-enum): `anchor_orphaned | edit_conflicted | agent_judged_infeasible | agent_errored`. **No other values are valid** (NFR-08).
- **Clarification** — `{ clarification: { question, options } }`. The resolver surfaces the question via `AskUserQuestion`; the operator's choice is appended to the thread as a new user message and the subagent re-dispatched. Capped at `MAX_CLARIFY=1` per thread; operator re-dispatch via 'Reject with refinement' capped at `MAX_REDISPATCH=2` (the 3rd presentation collapses to `{Modify, Skip}`).

## Phase 3: Diff presentation + Accept/Reject/Modify/Skip

On a successful dispatch the resolver presents a 4-option `AskUserQuestion`:

- **Accept** — apply the edit to disk (Phase 4), append the subagent's `system_reply` as a `system` message, set `status: "resolved"`.
- **Reject** — leave the artifact untouched, leave the thread `open`, record `skipped` with reason `operator_reject`.
- **Modify** — inline edit-then-resubmit (T13). Until wired, the thread stays `open` with reason `operator_modify_deferred`.
- **Skip** — same as Reject but explicit (operator wants to defer judgment).

The diff body shown is the subagent's `diff_ref` + `system_reply`. The resolver does not compute its own diff — staging via `git add` (Phase 4) is what makes the change reviewable via `git diff --cached`.

## Phase 4: Apply + stage

The resolver writes the updated artifact bytes (when the dispatched skill returned `applied_artifact`), persists the updated threads via its own serializer (`scripts/resolver.js`), then runs `git add <artifact> <threads>` against the repo root.

**The resolver MUST NOT run `git commit`.** This is a hard rule — see "Anti-patterns". Operators commit the staged changes themselves after reviewing `git diff --cached`. The summary line MUST read verbatim:

```
Resolved N/M. Review with git diff --cached then commit.
```

## Phase 5: Capture Learnings

Reflect on whether this run surfaced anything worth capturing under `## /comments` in `~/.pmos/learnings.md` — e.g., a recurring anchor-orphan cause, a routing-tag gap in a particular skill's emit, or a clarification pattern that resolved cleanly. Append a one-line entry only when the lesson is non-obvious and reusable.

Report at close:
- `Learning: <new entry written to ~/.pmos/learnings.md under ## /comments>` — when the run surfaced a non-obvious lesson worth keeping.

## Modes

| Mode | Flag | Status | Description |
|---|---|---|---|
| confirm-each | `--confirm-each` (default) | **Implemented** | Prompt operator per thread with Accept/Reject/Modify/Skip. |
| batch | `--batch` | TODO(T13) — stub; CLI exits 64. | Prompt once per dispatched-skill group; apply all in the group on a single Accept. |
| auto | `--auto` | TODO(T14) — stub; CLI exits 64. | Apply every successful dispatch without prompting. Failures still surface. |
| non-interactive | `--non-interactive` | TODO(T14) — stub; CLI exits 64. | Headless mode for CI. Honors the canonical non-interactive defer contract (no prompts; defers any operator choice). |

## Configuration

Future: per-workstream defaults under `.pmos/settings.yaml :: comments` (default mode, max-clarify). Not yet wired — every invocation defaults to `confirm-each`, `MAX_CLARIFY=1`, `MAX_REDISPATCH=2`.

## Edge cases

- **Orphan thread** — dispatch returns `error_enum: "anchor_orphaned"`. The resolver records a skip with the rationale; the thread stays `open` for triage. The artifact is not mutated.
- **Idempotent re-run** — `/comments resolve` is safe to re-run. Each per-skill apply-edit shim implements the §9.3 no-op contract; re-runs surface as `diff_ref: "no-op: edit already applied"` and the resolver still marks the thread resolved.
- **Clarification cap** — `MAX_CLARIFY = 1`. Beyond that the thread is skipped with `clarify_cap_exceeded`.
- **Re-dispatch cap** — `MAX_REDISPATCH = 2`. After 2 'Reject with refinement' loops the 3rd presentation collapses to `{Modify, Skip}` only.
- **Missing meta tag** — refuse with a clear error. The artifact violates FR-01; fix at emission.
- **Malformed thread store** — refuse at parse time (the controller throws on corruption).

## Anti-patterns

- **`git commit` from the resolver.** Never. The resolver stages; the operator commits. Any path that calls `git commit` is a bug — see Phase 4.
- **Inventing `error_enum` values.** The set is closed at four. Adding a fifth requires amending the contract doc first ([`_shared/apply-edit-at-anchor.md`](../_shared/apply-edit-at-anchor.md)), then fanning out to the 14 skills.
- **Anchor math in the resolver.** Resolving `id_anchor` / `quote_anchor` is the originating skill's job. The resolver's surface is dispatch + UX + staging.
- **Mutating the artifact on Reject / Skip / Modify.** Only Accept writes bytes.

## Implementation pointers

- Controller: `scripts/resolver.js` — exports `async resolve({path, mode, askUser, dispatchSubagent, runGit})`. The last three are injectable test seams; defaults are real implementations.
- CLI: `scripts/cli.js` — argv parser; exits 64 for non-`--confirm-each` modes pending T13/T14.
- Tests: `tests/resolver-confirm-each.test.js` (happy path), `tests/resolver.integration.test.js`, plus anchor/schema/scorer suites.
- Wrapper: `tests/scripts/assert_resolver_confirm_each.sh` — BSD-portable, BASH_SOURCE fallback per [CLAUDE.md](../../../../CLAUDE.md#bash-portability).
