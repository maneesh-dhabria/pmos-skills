# Apply-edit-at-anchor — shared contract

Normative contract for the `apply-edit-at-anchor` entrypoint that every originating pipeline skill implements and that `/comments resolve` dispatches into via a per-thread subagent. **This document is the source of truth.** All 14 originating-skill implementations MUST cite it from their `SKILL.md` body per [NFR-08](../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#nfr-h); contract changes are surfaced here, not in 14 parallel revisions.

Spec anchors: [§9.1](../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#api-apply-edit), [§9.2](../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#api-error-enum), [§9.3](../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#api-idempotency), [S13](../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#decisions-h).

## Purpose

`/comments resolve` walks each open thread in an artifact's inline `pmos-comments` JSON block (`<script id="pmos-comments" type="application/json">` in the HTML itself) and dispatches a generic subagent to apply the requested edit. The subagent's identity and tools are routed by a meta-tag on the artifact (one of the 14 originating skills). The function it calls — uniformly named **"Apply comment-resolver edit"** in every skill — has the contract defined below. The contract is prose + JSON shape (not an executable interface) because each skill's apply logic is genuinely different (e.g., `/requirements` re-renders frontmatter, `/diagram` regenerates an SVG), so a shared script does not fit. See [S13](../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#decisions-h).

## Input schema

The subagent receives the following JSON in its prompt body (verbatim from [§9.1](../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#api-apply-edit)):

```json
{
  "thread": {
    "id": "aB3xK9Lm",
    "anchor": {
      "id_anchor": "solution-resolve",
      "quote_anchor": {
        "quote": "the resolver dispatches a generic subagent",
        "prefix": "...30 chars before...",
        "suffix": "...30 chars after..."
      },
      "diagram_anchor": null
    },
    "status": "open",
    "messages": [
      {"role": "user", "author": "maneesh", "body": "this should specify originating-skill dispatch", "ts": "2026-05-23T16:00:00Z"}
    ]
  },
  "artifact_path": "/abs/path/to/02_spec.html",
  "anchor_resolved": {
    "strategy": "id-first" | "quote-fallback",
    "dom_range": {"start_offset": 1234, "end_offset": 1289},
    "score": 0.92
  },
  "body": "this should specify originating-skill dispatch"
}
```

- `thread` — the full thread object from the artifact's inline `pmos-comments` block (id + dual-anchor + status + messages).
- `artifact_path` — absolute filesystem path to the target HTML artifact.
- `anchor_resolved` — result of the resolver's anchor-resolution pass: which strategy hit (`id-first` or `quote-fallback`), the resolved DOM range, and the match score (1.0 for id-first; Bitap score for quote-fallback).
- `body` — the current request text, extracted from the **last user message** in `thread.messages`. Convenience field; identical to `thread.messages[last_user].body`.

## Output schema

The subagent's final structured response MUST be one of three JSON shapes (verbatim from [§9.1](../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#api-apply-edit) and [§9.2](../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#api-error-enum)):

**Success:**

```json
{
  "success": true,
  "diff_ref": "staged: lines 124–128 in 02_spec.html",
  "system_reply": "Changed §4.2 first sentence to specify originating-skill dispatch with citation to grill Q1. Resolved.",
  "applied_artifact": "<full edited HTML text of the artifact, optional>"
}
```

`applied_artifact` is optional. When present, it carries the full post-edit HTML and the resolver writes those bytes to disk. When absent, the success response is treated as a proposal-only — the resolver records the resolution but does not mutate artifact bytes (used by skill implementations whose edits depend on richer DOM machinery — e.g., T12's proper anchor resolver).

**Failure:**

```json
{
  "success": false,
  "error_enum": "agent_judged_infeasible",
  "system_reply": "Cannot apply: the edit would require restructuring §6 which would violate FR-14 (T4 must not import from T7). Next: split into two threads — one for §4.2 wording, one for §6 restructure as a separate decision."
}
```

**Clarification needed:**

```json
{
  "success": false,
  "clarification": {
    "question": "Validation issue at <quoted span>: (a) reject when X is null, (b) reject when X is empty, (c) coerce X to null on empty. Which?",
    "options": ["reject on null", "reject on empty", "coerce empty to null"]
  }
}
```

- `diff_ref` — staged-region reference (line ranges) or commit SHA when committed. May be `"no-op: edit already applied"` for idempotent re-runs (see [§9.3](../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#api-idempotency)).
- `system_reply` — ≤3-sentence prose summary appended to the thread by the resolver.
- `error_enum` — closed set defined in the next section.
- `clarification` — surfaced to the operator as an `AskUserQuestion` prompt; on operator choice, the resolver re-dispatches the subagent with the chosen option appended to `body`.

## Error enum

Closed set per [FR-NEW-B](../../../docs/pmos/features/2026-05-23_inline-doc-comments/01_requirements.html#fr-new-b) / [§9.2](../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#api-error-enum). Any new failure mode surfaced during build MUST trigger a back-to-requirements discussion before the enum is extended.

| `error_enum` value | When raised | What the caller should do |
|---|---|---|
| `anchor_orphaned` | The thread's anchor failed to resolve at runtime (id-anchor missing AND quote-fallback Bitap score < threshold). Subagent emits without attempting edit. | Resolver logs orphan with the last-known quote; thread status stays `open` with an `orphaned: true` flag for operator triage. Do NOT mutate the artifact. |
| `edit_conflicted` | The proposed edit would touch a region of the artifact that another concurrently-applying thread in the same wave has already modified. The wave planner SHOULD prevent this; if fired, the planner has a bug. | Log + skip the thread; surface as a wave-planner bug to fix. The skipped thread is retried in the next wave. |
| `agent_judged_infeasible` | The subagent assessed the request and concluded it cannot be applied without violating a constraint (broken FR, incoherent with the rest of the doc, requires re-architecting). | Show the rationale + suggested next action (from `system_reply`) to the operator. Thread stays `open`. |
| `agent_errored` | The subagent crashed, timed out, or returned malformed JSON. Generic catchall. | `system_reply` carries the captured error excerpt; resolver logs + moves on. Operator retries the thread interactively. |

## Idempotency contract

Per [§9.3](../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#api-idempotency): calling the entrypoint twice with the same `{thread, anchor}` MUST be a no-op if the requested edit is already present in the artifact. This protects against re-running `/comments resolve` after a partial-stage commit.

**No-op return shape:**

```json
{
  "success": true,
  "diff_ref": "no-op: edit already applied",
  "system_reply": "Edit already present in artifact; marking resolved without changes."
}
```

**Semantic-match definition (F3 resolution):** "already applied" means **≥80%** of the keywords in the thread's last user message body (after stopword removal using the standard English stoplist of ~150 words: `the, a, an, is, are, of, to, in, …`) appear as substrings in the artifact's currently-anchored region (or its post-edit DOM neighborhood, ±200 chars).

**Threshold band:**

- **score ≥ 80%** → return the no-op shape above; do not mutate the artifact.
- **60% ≤ score < 80%** → soft band. The subagent MUST proceed with the edit attempt (avoiding false positives that would skip genuine work) and let the second-pass diff naturally show "no change" if truly idempotent.
- **score < 60%** → edit is not yet applied; proceed normally.

## Subagent invocation convention

`/comments resolve` dispatches the subagent via a prompt, not a direct function call. The prompt MUST follow this shape:

```
[mode: <current-mode>]
[output_format: html]

You are an apply-edit subagent for thread <thread.id> on artifact <artifact_path>.
Originating skill: <skill-name> (routed via meta-tag).

Input JSON:
<verbatim input JSON per "Input schema" above>

Implement the "Apply comment-resolver edit" phase per
plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md.

Return ONLY the output JSON as your final structured response — one of the
three shapes (success / failure / clarification) defined in the contract.
```

- **First line** is the harness mode tag (`[mode: interactive]` or `[mode: non-interactive]`) — preserved verbatim from the resolver's invoking context.
- **Second line** is `[output_format: html]` — every originating-skill artifact in this pipeline is HTML.
- The body carries the input JSON verbatim and points back to this file.
- The subagent's final assistant message MUST be valid JSON matching one of the output shapes. The resolver parses this strictly; malformed JSON → `agent_errored`.

## Per-skill implementation expectations

Each of the 14 surfaces (13 originating skills — `/requirements`, `/spec`, `/plan`, `/wireframes`, `/prototype`, `/diagram`, `/artifact`, `/ideate`, `/polish`, `/architecture`, `/readme`, `/survey-design`, `/survey-analyse` — plus the `/feature-sdlc` orchestrator) MUST:

1. **Implement a phase named exactly** `Apply comment-resolver edit` in its `SKILL.md`. The phase name is the contract entry point — the resolver locates it by name.
2. **Cite this file** by relative path from the skill's `SKILL.md` body (`plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md`), satisfying [NFR-08](../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#nfr-h).
3. **Consume the input JSON** per "Input schema" above. No skill may add required fields; optional skill-specific hints MAY be passed in a `hints` sub-object (and MUST degrade gracefully if absent).
4. **Produce the output JSON** per "Output schema" above. No skill may invent new top-level keys or new `error_enum` values without amending this file first.
5. **Honor idempotency** per the contract — perform the semantic-match check before mutating the artifact.
6. **Respect anchor resolution** — never mutate outside the `anchor_resolved.dom_range` (±200-char neighborhood) without surfacing a `clarification` first.

Skill-specific apply logic (re-rendering frontmatter, regenerating SVGs, etc.) is implementation detail and lives in each skill's own files; the contract above is the only cross-skill commitment.

## Tests-are-illustrative footer

Per **FR-103** (the "tests are illustrative" stance — see [FR-NEW-C](../../../docs/pmos/features/2026-05-23_inline-doc-comments/01_requirements.html#fr-new-c) for the testing-acceptance posture):

- **This document is normative.** When the contract and a per-skill test disagree, this document wins; the test is the bug.
- **Per-skill contract tests are minimum-viable illustrations** of the contract for one skill. They demonstrate input shape, output shape, error-mode coverage, and idempotency for that skill's apply logic — they do not redefine the contract.
- **The shared resolver integration test** covers `/comments resolve`'s dispatch logic + the complete error taxonomy with mocked subagent dispatch (one test, not 14).
- `/verify` enforces 12 contract tests + 1 shared integration test = 13 passing tests before ship; fewer than 12 contract tests blocks ship the same way `assert_heading_ids.sh` blocks artifacts missing kebab-case ids.
- Extending the contract (new field, new `error_enum` value, new output shape) MUST update this file **first**, then fan out to the 14 skills + the contract tests, not the other way around.
