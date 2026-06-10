# Caller Contracts — /verify invoked by another skill

Loaded only when another skill invokes /verify. Standalone runs never need this file.
Two contracts live here: the phase-scoped mode `/execute` uses at plan-phase
boundaries (§1), and the reviewer-subagent mode `/feature-sdlc` uses over a single
artifact (§2).

## §1 — Phase-scoped mode (called from /execute)

`/execute` Phase 2a invokes `/verify --scope phase --feature <slug> --phase <N>` at
every plan-phase boundary. The input/output shape (`scope`, `feature`,
`phase_number`, `evidence_dir` in; `ok`, `evidence_dir`, `failures` out) and the
scope semantics are owned by `_shared/phase-boundary-handler.md` § "Verify
Invocation Contract" — honour that contract exactly. /verify-side execution
deltas — the full checklist (Phases 2–7) runs with three changes:

1. **Changed-files set is restricted to files touched by tasks in the named phase
   only.** Read `{feature_folder}/execute/task-NN.md` for each `T<N>` listed in the
   plan's `## Phase <N>` group; union their `files_touched` frontmatter lists.
2. **Evidence path is `{feature_folder}/verify/<YYYY-MM-DD>-phase-<N>/`** (not the
   default `{feature_folder}/verify/<YYYY-MM-DD>/`). Multiple phase-verify runs on
   the same day are namespaced by phase number, so they do not collide.
3. **The Phase 4 entry gate uses the markdown table in `review.{html,md}` as the
   structural enforcement** instead of tracked tasks. Per-task logs under
   `{feature_folder}/execute/task-NN.md` already carry evidence-typed FR coverage
   tables for this phase, so re-creating one tracked task per FR-ID would duplicate
   that contract. The `review.{html,md}` table — one row per FR-ID, the same
   outcome+evidence triple, a `Status` column drawn from the three-state outcome
   model — IS the gate. Task-tool-as-gate is reserved for standalone feature-scope
   invocations (where there is no upstream per-task log to consume).

On completion, return the structured result to the calling skill (/execute Phase 2a):

- `ok: true|false`
- `evidence_dir: <path>`
- `failures: [...]` (when `ok == false`)

All other Phase 1+ behavior is unchanged. Standalone /verify invocations (without
`--scope phase`) work exactly as before. Phase-scoped runs also do NOT regenerate
`{feature_folder}/index.html` (the per-phase review is a sub-artifact of the parent
verify dir) — see Phase 8 step 2.

## §2 — Reviewer-subagent mode (called from /feature-sdlc)

The shared contract — what the reviewer receives (chrome-stripped `<h1>` + `<main>`
slice inline as the prompt body, own resolver skipped), what it returns
(`sections_found: [...]` first, then `{section_id, severity, message, quote}`
findings with ≥40-char verbatim quotes), and the parent-side validation (the
reviewer MUST NOT self-validate) — is `_shared/reviewer-protocol.md`. Call-site
deltas for /verify:

- **Scope: the artifact-review path ONLY** — the smoke review + cross-doc anchor
  scan run when /verify is dispatched as a reviewer over a single artifact's HTML.
- **Code-diff carve-out:** the Phase 3 "Multi-Agent Code Quality Review" reviewers
  are explicitly OUTSIDE this contract — they consume git diffs, not artifact HTML.
  Do not apply chrome-strip, `sections_found` enumeration, or quote validation to
  the Phase 3 code-diff path.

---

*Spec lineage: `2026-05-13_plan-vertical-slices` (phase-scoped invocation, evidence
namespacing, review-table gate substitution), `2026-05-09_html-artifacts`
(reviewer input contract FR-50/51/52; the code-diff carve-out is FR-50.1).*
