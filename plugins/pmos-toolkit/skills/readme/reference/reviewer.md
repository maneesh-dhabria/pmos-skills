# reviewer.md — IA-fit reviewer subagent prompt + return-shape contract

Canonical reference for the `/readme` reviewer-subagent pass (FR-03, FR-11, FR-14,
spec §9.2.2). One reviewer Task call is dispatched in parallel with the persona
Task calls (FR-SR-2 — widened to 5 concurrent calls in SKILL.md §2 step 1).
`SKILL.md` inlines this file's `§1` prompt and `§2` return-shape contract into
the Task body, along with the absolute path of the un-stripped README (the
subagent reads the file itself).

## Table of contents

- [§1 — Reviewer prompt](#1-reviewer-prompt)
- [§2 — Return shape contract](#2-return-shape-contract)
- [§3 — Parent-side validation reference](#3-parent-side-validation-reference)
- [§4 — Operational notes](#4-operational-notes)

---

## §1 Reviewer prompt

Inject the block below verbatim into the reviewer Task body, followed by the
absolute path of the README (with an instruction to read it before scoring):

> You are evaluating a README against 2 information-architecture (IA) fit
> checks declared in `reference/rubric.yaml` as `type: "[J]"`. For each declared
> [J] `check_id`, return one finding object per the JSON schema in `§2`.
>
> The two [J] checks (rule + pass-condition, verbatim from `rubric.yaml`):
>
> 1. `hero-scope-matches-surface`
>    - **Rule:** Hero line's claimed scope is ⊇ the surface area implied by the
>      Skills/Commands table.
>    - **Pass when:** the hero's scope covers (or is broader than) every Skill
>      and Command surfaced in the README.
>    - **Fail when:** the hero claims a narrower surface than the listed
>      Skills/Commands imply, OR the hero is so vague that the surface area
>      cannot be inferred.
>    - **`fix_note` template (on fail):** "Tighten hero-line scope to match the
>      actual Skills surface, OR widen the hero to cover all listed surfaces."
>
> 2. `primary-index-by-jtbd`
>    - **Rule:** Top-level `##` headings index by job-to-be-done, not by
>      maintainer category.
>    - **Pass when:** the majority of top-level `##` headings phrase a user job
>      (imperative verb like "How to X", "Use Y", "Configure Z") rather than
>      a taxonomy bucket like "Skills", "Commands", "Architecture",
>      "Internals".
>    - **Fail when:** the top-level `##` headings are predominantly maintainer
>      taxonomy buckets (≥50% taxonomy-shaped).
>    - **`fix_note` template (on fail):** "Reorganize top-level sections by
>      user job-to-be-done (e.g., 'How to install', 'How to deploy') rather
>      than internal taxonomy ('Skills', 'Commands', 'Architecture')."
>
> Rules:
> - You make no edits. Score only.
> - On every finding (pass OR fail), include a `quote` field: a verbatim
>   substring of the README that is ≥40 characters long and supports your
>   verdict.
> - On fail, `fix_note` must be a concrete, non-empty instruction (the
>   template above is the starting point; tailor it to this README if
>   useful).
> - On pass, `fix_note` may be the empty string.

## §2 Return shape contract

JSON array, one object per declared [J] `check_id` (exactly 2 objects).
Object schema:

```json
{
  "check_id": "<must equal one of: hero-scope-matches-surface, primary-index-by-jtbd>",
  "verdict":  "pass" | "fail",
  "fix_note": "<concrete remediation; required and non-empty on fail; may be empty on pass>",
  "quote":    "<verbatim substring of the README; length ≥ 40 characters>"
}
```

Return the JSON array to stdout. Do not emit prose around the JSON.

## §3 Parent-side validation reference

Informative — the reviewer does NOT self-validate. The parent skill (`SKILL.md`
§2 step 2) runs the following hard-fail checks against the reviewer's return,
delegating to `scripts/_reviewer_validate.sh::readme::reviewer_validate`:

1. **`check_id` set-equality** vs the declared [J] set (read from `rubric.yaml`
   rows where `type: "[J]"`). On miss or extra:
   `reviewer returned check_ids that do not match rubric.yaml: missing=[…], extra=[…]`
2. **`quote` ≥40 chars**. Shorter quote → hard-fail:
   `reviewer returned quote shorter than 40 chars: <quote>`
3. **`quote` substring-grep** against the README source. Not-found → hard-fail:
   `reviewer returned quote not found in README: <prefix-30>…`

On any hard-fail the skill pauses via the standard failure dialog (matching
the persona-subagent validation path — symmetric per FR-12).

## §4 Operational notes

- **Temperature: 0** expected; LLM-judge non-determinism is mitigated by the
  tight rule + pass-condition + evidence-grounded quote requirement.
- **Stub escape:** when `READMER_REVIEWER_STUB` is set, SKILL.md §2 step 1
  replaces the reviewer Task call with `bash "$READMER_REVIEWER_STUB"
  <readme-path>` and consumes stdout as the JSON array. Mirrors the existing
  `READMER_PERSONA_STUB` pattern (SKILL.md §3).
- **No edits, ever** — the reviewer scores; `/execute` (or the user, post-
  audit) writes. If the reviewer returns suggested rewrites, they live in
  `fix_note` strings, not as side-channel file edits.
