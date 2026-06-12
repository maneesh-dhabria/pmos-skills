# new-template-guidelines.md — best practices for a proposed template

Generic guidance the create-flow's template-proposal branch (`SKILL.md` `#create` Step 1.5) and the save-checklist (FR-4) read when no existing template matches the requested doc type. The proposal reuses the `template add` research flow (T.1–T.6); this file is the quality bar a proposed template must clear before it is offered for saving. Single source for the checklist.

## Contents

- [When this applies](#when-this-applies)
- [Section design](#section-design)
- [Eval-criteria design](#eval-criteria-design)
- [Personas](#personas)
- [Length target](#length-target)
- [Default preset](#default-preset)
- [Save checklist](#save-checklist)

## When this applies

When `/artifact <type>` resolves to no built-in or user template, Step 1.5 offers to propose one. The proposal is generated (research subagent + section alignment + eval-gen, reusing `#template-management` T.1–T.6), then — only if it clears the [save checklist](#save-checklist) — offered for saving to `~/.pmos/artifacts/templates/<slug>/`, **default No**.

## Section design

- **8–15 sections**, each with a single clear purpose (one job per section). Fewer than 8 → the doc-type is probably a variant of an existing template; more than 15 → split or collapse.
- Order sections by the reader's question flow (problem → approach → detail → risks → next steps), not by author convenience.
- For a `[lite, full]` tier template, mark which sections belong to the `lite` set (the `brief`-depth subset) — the spine, minus deep-dive sections.

## Eval-criteria design

- Each section gets ≥1 `eval.md` item. Split items into `precondition` (must be satisfiable from gathered context or a gap-question) vs `judgment` (quality bar the reviewer scores).
- Preconditions carry a `gap_question` for the gap interview; judgments carry a `severity` (high/medium/low).
- Avoid eval items a reviewer can't ground in a quote — keep them concrete and checkable.

## Personas

- Define a `personas:` list (3–4 role tags) of the stakeholders who sign off on or are affected by this doc class — these drive the Phase 3.5 panel. E.g. a PRD's `[eng-lead, design, gtm, exec]`.
- Pick personas with *distinct* concerns; two personas that would raise the same findings are one persona.

## Length target

- Set an optional `length_target` (e.g. `~1500 words`, `2-3 pages`, `tight`). It steers generation **informationally** — the draft aims for it but is never padded or truncated to hit it (per the /primer word-target learnings: targets are routinely missed and padding hurts). If the natural length differs materially, the doc wins.

## Default preset

- Pick a `default_preset` from the 4 built-ins (`concise`, `tabular`, `narrative`, `executive`) that matches the doc class's house style (e.g. an exec memo → `executive`; a metrics-heavy experiment doc → `tabular`).

## Save checklist

The proposed template is offered for saving **only if all hold** (else: generate the doc this run but don't offer to save):

1. 8–15 single-purpose sections, `lite` subset marked for tiered templates.
2. Every section has ≥1 eval item; preconditions have gap-questions.
3. A `personas:` list of 3–4 distinct stakeholders.
4. A `length_target` and a `default_preset` are set.
5. Slug does not collide with a built-in (`prd`, `experiment-design`, `eng-design`, `discovery`) or an existing user template.

The save prompt's Recommended option is **No** (avoid a junk template library, per the premortem) — saving is a deliberate yes, never a reflexive default.
