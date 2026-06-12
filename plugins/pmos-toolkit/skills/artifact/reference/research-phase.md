# research-phase.md — the deep-depth research stage

The research stage that runs in `/artifact`'s create flow at **Step 7.5**, gated on `--depth deep`. It front-loads a doc with verified external context before drafting. Cited by `SKILL.md` `#create` Step 7.5; this file is the single source for the contract.

## Contents

- [When this runs](#when-this-runs)
- [Step A — Warrant check](#step-a--warrant-check)
- [Step B — Research plan + approval](#step-b--research-plan--approval)
- [Step C — Subagent fan-out](#step-c--subagent-fan-out)
- [Step D — Merge + save](#step-d--merge--save)
- [Output contract](#output-contract)
- [Non-interactive degradation](#non-interactive-degradation)

## When this runs

Only when `{depth} == deep` AND the create flow reaches Step 7.5 (after preset selection, before draft generation). At `brief`/`standard` the stage is skipped with a log line `research: skipped (depth=<d>)`. It never runs on `refine`/`update`.

## Step A — Warrant check

External research is not always worth the tokens. Decide first:

- **Skip** when the doc is internal/template-backed AND the `gathered_context` already satisfies the template's `precondition` eval items (the same semantic check Step 6 gap-interview uses). Log `research: skipped (sufficient internal context)`.
- **Warrant** when the doc depends on external facts, market/competitive context, or a domain the gathered context doesn't cover. Log `research: warranted (<one-line reason>)` and continue to Step B.

The warrant check is LLM judgment, not a prompt — do not ask the user "should we research?"; decide, log, and let Step B's plan-approval be the user's gate.

## Step B — Research plan + approval

Propose a **research plan**: 3–6 concrete questions or areas, each one line. Present via `AskUserQuestion`:

```
question: "Research plan for <doc>. Approve, edit, or skip?"
options:
  - Approve and run (Recommended)
  - Edit the questions
  - Skip research
```

`(Recommended)` = Approve. On Edit, take free-form revisions and re-present. On Skip, log `research: skipped (user)` and proceed to draft.

## Step C — Subagent fan-out

On approval, dispatch one `general-purpose` subagent **per research area** (concurrency cap ~4; `sonnet` tier — research synthesis needs judgment, per `_shared/tier-matrix.md` §L). Each subagent's brief carries the canonical fan-out contract (per the 2026-05-31 music-coach learning):

- A stable `idx` for the area + the exact question.
- A strict output shape: write findings as `{idx, claim, source_url, confidence: high|medium|low}` objects.
- **"Omit rather than guess; mark low-confidence rather than fabricate."**
- **Verifiable URLs only** — a claim with no fetchable source is dropped, not kept.

## Step D — Merge + save

Merge the subagent returns with a **validating + tolerant** reducer: drop claims with no `source_url`; normalize URL/accidental format drift; dedupe by `(claim, source_url)`. Then write the synthesized research doc.

## Output contract

- **Path:** `<feature_folder>/research/<slug>-research.md` (create the `research/` dir if absent).
- **Shape:** a **loose markdown sidecar** (per OQ2) — NOT rendered through the HTML substrate, NOT indexed in the feature `index.html`, NOT commentable. A leading `# Research — <doc>` H1, then one `## <area>` section per research area, each with bullet findings and an inline `[source](url)` per claim, then a `## Sources` list.
- **Consumption:** the draft (Step 8) reads this file and folds it into `gathered_context` tagged `source: research/<slug>-research.md`. Every research-derived claim in the draft carries its citation.

## Non-interactive degradation

In `--non-interactive` (main-agent), Step B AUTO-PICKs Approve (per the canonical non-interactive block) and buffers the plan into the OQ log; the fan-out runs unattended. The whole stage is skipped when `/artifact` itself runs as a subagent (subagents can't dispatch further skills/subagents reliably) — see `SKILL.md` `## Platform Adaptation`.
