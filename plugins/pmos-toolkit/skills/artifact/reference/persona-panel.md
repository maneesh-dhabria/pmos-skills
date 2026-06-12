# persona-panel.md — the multi-stakeholder critique stage

The persona-panel stage that runs in `/artifact`'s create flow at **Phase 3.5**, gated on `{depth} ∈ {standard, deep}`. It critiques the draft through 3–4 stakeholder lenses in parallel — distinct from the Phase 3 eval-reviewer loop (which checks the template's `eval.md` criteria, not stakeholder reaction). Cited by `SKILL.md` `#refinement-loop` (Phase 3.5); single source for the contract.

## Contents

- [When this runs](#when-this-runs)
- [Step A — Resolve personas](#step-a--resolve-personas)
- [Step B — Parallel critique](#step-b--parallel-critique)
- [Step C — Validate](#step-c--validate)
- [Step D — Reconcile with user](#step-d--reconcile-with-user)
- [Value signal (NFR-1)](#value-signal-nfr-1)
- [Non-interactive degradation](#non-interactive-degradation)

## When this runs

After the Phase 3 eval-reviewer loop completes (draft is structurally sound), when `{depth}` is `standard` or `deep`. Skipped at `brief` (`personas: skipped (depth=brief)`) and on `refine`/`update`.

## Step A — Resolve personas

- **Template-defined:** if the resolved `template.md` frontmatter carries a `personas:` list, use it (e.g. PRD → `eng-lead, design, gtm, exec`). Each entry is a short role tag.
- **Recommended:** if the template defines none, recommend **3–4** personas from the doc type + `gathered_context` (who signs off on / is affected by this doc). Confirm via one `AskUserQuestion`:

  ```
  question: "Critique this <doc> as these stakeholders? <p1, p2, p3>"
  options:
    - Use these personas (Recommended)
    - Edit the set
  ```

  `(Recommended)` = use them.

## Step B — Parallel critique

Dispatch one **`sonnet`** `general-purpose` subagent per persona, in parallel (cap 4). Each brief contains:

- The **chrome-stripped** draft (via `_shared/html-authoring/assets/chrome-strip.js`) + the companion `{slug}.sections.json`.
- A **persona brief**: role, what this stakeholder cares about, and *what would make them reject or distrust the doc*.
- The `_shared/reviewer-protocol.md` finding contract: return JSON findings `{section, severity, finding, suggested_fix, quote}` where `quote` is a **≥40-char verbatim substring** of the draft and `section` is a real id from `sections.json`. No edits — critique only.

## Step C — Validate

Parent-side, per `_shared/reviewer-protocol.md`: every `finding.section ∈ sections.json` ids; every `finding.quote` substring-greps against the un-stripped `{slug}.html`. A finding that fails either is **dropped** (not applied). This is the same quote-grounding stance the eval reviewer uses.

## Step D — Reconcile with user

Present surviving findings per `_shared/findings-dispositions.md` (severity-ordered, ≤4 per `AskUserQuestion` batch, the four dispositions Fix-as-proposed / Modify / Skip / Defer; **Defer** appends to the artifact's `## Deferred Improvements`). Apply approved fixes via `Edit` against the draft; re-emit `{slug}.sections.json` afterward (`build_sections_json.js`). Reconciliation happens **before** the draft is considered final — the user owns which stakeholder concerns land.

## Value signal (NFR-1)

After reconciliation, log one line: `persona panel: <N> findings beyond the eval reviewer (<M> total, <K> duplicated eval findings)`. This makes the panel's marginal value visible over time — if it routinely surfaces 0 net-new findings, that's the signal to reconsider folding it into the eval loop.

## Non-interactive degradation

In `--non-interactive` (main-agent): Step A AUTO-PICKs the recommended persona set; Step D AUTO-PICKs Fix-as-proposed for `[Blocker]`/`[Should-fix]` findings and buffers `[Nit]`s into the OQ log. The whole stage is skipped when `/artifact` runs as a subagent (can't dispatch persona subagents) — see `SKILL.md` `## Platform Adaptation`.
