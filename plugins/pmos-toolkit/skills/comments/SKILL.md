---
name: comments
description: "Walk open inline-doc-comment threads in a sidecar; dispatch into the originating skill's apply-edit entrypoint; stage edits. Use when the user runs /comments resolve <artifact-path>, or asks to process inline comments left by reviewers."
argument-hint: "resolve <path> [--confirm-each|--batch|--auto|--non-interactive]"
---

# /comments

Resolve open inline-doc-comment threads attached to an HTML artifact.

`/comments resolve <artifact-path>` reads the artifact's `.comments.json` sidecar (T3 schema), looks up the artifact's originating skill via the `<meta name="pmos:skill">` tag, dispatches a per-thread subagent that calls **that** skill's apply-edit-at-anchor entrypoint, and presents each proposed edit for confirmation. On Accept the resolver writes the edit to disk, marks the thread `resolved`, and runs `git add`. **It never runs `git commit`** — the operator reviews the staged diff and commits separately.

This is a utility skill, not a pipeline stage. It does not consume or produce workstream state. Multiple sidecars can be resolved in sequence by re-invoking the skill.

**Authoritative refs** (do not restate; link):

- Architecture: [`docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html` §6.1](../../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#solution-architecture).
- Contract: [`plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md`](../_shared/apply-edit-at-anchor.md) — input/output JSON shapes, closed `error_enum`, idempotency.
- Spec API: [§9.1](../../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#api-apply-edit), [§9.2](../../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#api-error-enum), [§9.3](../../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#api-idempotency).
- FRs: FR-20, FR-22, FR-24, FR-27, FR-28, FR-31 in [02_spec.html §7](../../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#functional-requirements).

## Phase 0: Pipeline setup

This is a standalone utility skill. There is no pipeline state to load and no workstream context to attach. If the artifact path resolves under `docs/pmos/features/<workstream>/`, the resolver MAY emit a one-line "Operating on workstream `<name>`" note — informational only; no settings.yaml read or write.

## Phase 1: Intake

1. Resolve the artifact path argument to an absolute filesystem path.
2. Locate the sidecar by convention: `<artifact-basename>.comments.json` in the same directory (T3, FR-10/FR-11).
3. Parse the sidecar. Refuse on schema-version mismatch (handled by `comments.js :: validate_sidecar`).
4. Read the artifact's `<meta name="pmos:skill" content="…">` tag (FR-01). The content value is the slug used to route subagent dispatch (FR-22). Refuse if absent — without the routing tag there is no apply-edit entrypoint to call.
5. Count threads where `status === "open"`. If zero, print a no-op summary and exit successfully (idempotent re-run friendliness; see [§9.3](../../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#api-idempotency)).

## Phase 2: Per-thread dispatch

For each open thread the resolver builds the §9.1 input payload from the thread's dual anchor + the **newest user message** body, then dispatches a subagent prefixed `[mode: <current-mode>]\n[output_format: html]\n` (FR-22(c)). The subagent calls its skill's "Apply comment-resolver edit" phase per the [shared contract](../_shared/apply-edit-at-anchor.md).

**Anchor strategy is owned by the originating skill, not by the resolver.** The resolver passes the raw `anchor` object through verbatim; id-first resolution + Bitap quote fallback live in each skill's apply-edit implementation (see the [contract doc](../_shared/apply-edit-at-anchor.md#input-schema) "anchor_resolved" field). This keeps anchor math out of the controller — see "Anti-patterns" below.

The subagent returns one of three shapes (verbatim from [§9.1](../../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#api-apply-edit)):

- **Success** — `{ success: true, diff_ref, system_reply, applied_artifact? }`. The optional `applied_artifact` carries the full edited HTML; when present the resolver uses it as the new on-disk artifact text.
- **Failure** — `{ success: false, error_enum, system_reply }`. `error_enum` is the closed set [§9.2](../../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#api-error-enum): `anchor_orphaned | edit_conflicted | agent_judged_infeasible | agent_errored`. **No other values are valid** — extending the set requires amending the contract doc first (NFR-08).
- **Clarification** — `{ clarification: { question, options } }`. The resolver surfaces the question via `AskUserQuestion`; the operator's choice is appended to the thread as a new user message and the subagent is re-dispatched. Re-dispatch is capped at `MAX_CLARIFY = 2`; further loops mark the thread as skipped with reason `clarify_cap_exceeded`. T15 hardens this; T10 ships the cap as a constant.

## Phase 3: Diff presentation + Accept/Reject/Modify/Skip

On a successful dispatch the resolver presents the operator with a 4-option `AskUserQuestion`:

- **Accept** — apply the edit to disk (Phase 4), append the subagent's `system_reply` as a `system` message on the thread, set `status: "resolved"`.
- **Reject** — leave the artifact untouched, leave the thread `open`, record `skipped` with reason `operator_reject`.
- **Modify** — T13 will wire an inline edit-then-resubmit UX. In T10 this is deferred: the thread stays `open` with reason `operator_modify_deferred`.
- **Skip** — same as Reject but explicit (operator wants to defer judgment).

The diff body shown to the operator is the subagent's `diff_ref` + `system_reply`. The resolver does not compute its own diff — staging via `git add` (Phase 4) is what makes the change reviewable via `git diff --cached`.

## Phase 4: Apply + stage

The resolver writes the updated artifact bytes (when the dispatched skill returned `applied_artifact`) and re-serializes the sidecar using the **same byte-for-byte serializer as T3** (`JSON.stringify(obj, null, 2) + '\n'`, LF, trailing newline — see `_shared/html-authoring/assets/comments.js :: serialize_sidecar`). It then runs `git add <artifact> <sidecar>` against the repo root.

**The resolver MUST NOT run `git commit`.** This is a hard rule — see "Anti-patterns". Operators commit the staged changes themselves after reviewing `git diff --cached`. The summary line MUST read verbatim:

```
Resolved N/M. Review with git diff --cached then commit.
```

## Modes

| Mode | Flag | Status in T10 | Description |
|---|---|---|---|
| confirm-each | `--confirm-each` (default) | **Implemented** | Prompt operator per thread with Accept/Reject/Modify/Skip. |
| batch | `--batch` | TODO(T13) — stub; CLI exits 64. | Prompt once per dispatched-skill group; apply all in the group on a single Accept. |
| auto | `--auto` | TODO(T14) — stub; CLI exits 64. | Apply every successful dispatch without prompting. Failures still surface. |
| non-interactive | `--non-interactive` | TODO(T14) — stub; CLI exits 64. | Headless mode for CI. Honors the canonical non-interactive defer block (no prompts; defers any operator choice). |

## Configuration

Future: per-workstream defaults under `.pmos/settings.yaml :: comments` (default mode, max-clarify, etc.). Not wired in T10 — every invocation defaults to `confirm-each` and `MAX_CLARIFY=2` regardless of settings.

## Edge cases

- **Orphan thread** — dispatch returns `error_enum: "anchor_orphaned"`. The resolver records a skip with the failure rationale; the thread stays `open` so the operator can triage it (re-anchor or close manually). The artifact is not mutated.
- **Idempotent re-run** — `/comments resolve` is safe to re-run on the same sidecar. Each per-skill apply-edit shim implements the §9.3 no-op contract (semantic-keyword overlap ≥ 80%). Re-runs surface as `diff_ref: "no-op: edit already applied"`; the resolver still marks the thread resolved + stages an empty diff (sidecar status flip is the only on-disk change).
- **Clarification cap** — `MAX_CLARIFY = 2`. Beyond that the thread is skipped with `clarify_cap_exceeded`; the operator can re-engage interactively.
- **Missing meta tag** — refuse with a clear error. The artifact violates FR-01; fix at emission, not in the resolver.
- **Single open thread with malformed JSON in the sidecar** — refuse at parse time (the T3 `parse_sidecar` throws `SidecarCorruptedError`).

## Anti-patterns

- **`git commit` from the resolver.** Never. The resolver stages; the operator commits. Any path that calls `git commit` is a bug — see Phase 4.
- **Inventing `error_enum` values.** The set is closed at four values. Adding a fifth requires amending the contract doc first ([`_shared/apply-edit-at-anchor.md`](../_shared/apply-edit-at-anchor.md)), then fanning out to the 14 skills.
- **Anchor math in the resolver.** Resolving `id_anchor` / `quote_anchor` to DOM offsets is the originating skill's job (see the [contract](../_shared/apply-edit-at-anchor.md#per-skill-implementation-expectations)). The resolver's surface is dispatch + UX + staging.
- **Mutating the artifact on Reject / Skip / Modify.** Only Accept writes bytes. The other three paths leave the on-disk artifact unchanged.

## Implementation pointers

- Controller: `scripts/resolver.js` — exports `async resolve({path, mode, askUser, dispatchSubagent, runGit})`. The last three are injectable test seams; defaults are real implementations.
- CLI: `scripts/cli.js` — argv parser, wires a readline-based `askUser`, exits 64 for non-`--confirm-each` modes in T10.
- Test: `tests/resolver-confirm-each.test.js` — 1-thread happy path with mocked dispatch + askUser + git.
- Wrapper: `tests/scripts/assert_resolver_confirm_each.sh` at the repo root — BSD-portable, BASH_SOURCE fallback per [CLAUDE.md](../../../../CLAUDE.md#bash-portability).
