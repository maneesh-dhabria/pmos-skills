# Reviewer Protocol — Shared Input Contract

> Canonical contract between a dispatching skill (the parent) and a reviewer subagent evaluating an HTML artifact. Skills that can be dispatched as reviewers carry an "Input Contract" section citing this file; skills that spawn reviewers implement the dispatcher side. Per-skill deltas live at the call site (e.g. /verify's multi-agent *code-diff* review path is explicitly outside this contract — those reviewers consume git diffs, not artifact HTML).

## Why quote-grounding

A reviewer that returns free-prose findings can hallucinate: name sections that don't exist, quote text that isn't there. This contract makes every finding mechanically checkable — a real section id plus a verbatim quote long enough to be anchor-resolvable. Validation lives in the parent because a subagent attesting to its own honesty proves nothing.

## What the reviewer receives

The parent chrome-strips the artifact via `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/chrome-strip.js` and passes the stripped slice (`<h1>` + `<main>`) inline as the prompt body, together with the reviewer's rubric. A skill invoked in this mode skips its own input resolver (`_shared/resolve-input.md`) and operates directly on the stripped HTML.

## What the reviewer returns

1. First, `sections_found: [...]` — every `<section>` id and every `<h2>`/`<h3>` id it can locate in the stripped slice. Enumerating before evaluating proves the reviewer parsed the artifact it was handed.
2. Then findings, each shaped `{section_id, severity, message, quote}`:
   - `section_id` names one of the ids it enumerated.
   - `quote` is a **≥40-character verbatim substring** of the source. 40 characters is the same threshold `_shared/apply-edit-at-anchor.md` uses, so an accepted finding is directly anchor-resolvable when its fix is applied downstream.

The reviewer MUST NOT self-validate — the validation contract lives in the parent.

## What the dispatcher validates before accepting findings

1. Set-equality-check `sections_found` against `<artifact>.sections.json`.
2. Substring-grep every `quote` against the original (un-stripped) source HTML.
3. Hard-fail on any miss — a finding with an unverifiable quote or an unknown section id is discarded (or the reviewer run rejected), never patched up by the parent.

## Loop cap

Dispatch → validate → apply accepted findings → re-dispatch, capped at **2 loops per artifact**. (A consumer that documents a different cap states it as a call-site delta — /plan's review loop runs to 4.) The cap is a **cost governor, not a quality gate** (skill-patterns §H): hitting it means surface the residual findings and continue — never block or fail the run on cap-hit.

## Consumers

Reviewer side (carry the Input Contract): grill, msf-req, msf-wf, simulate-spec, verify
Dispatcher side (strip, validate, cap): spec, plan, artifact, wireframes, prototype, readme, feature-sdlc

---

*Spec lineage: `2026-05-09_html-artifacts` (chrome-strip input, `sections_found` output shape, parent-side validation), `2026-05-13_artifact-html-output` (dispatcher-side parity), `2026-05-23_inline-doc-comments` (≥40-char anchor threshold).*
