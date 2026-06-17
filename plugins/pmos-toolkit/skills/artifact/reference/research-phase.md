# research-phase.md — the deep-depth research stage

The research stage that runs in `/artifact`'s create flow at **Step 7.5**, gated on `--depth deep`. It front-loads a doc with verified external context before drafting. Cited by `SKILL.md` `#create` Step 7.5; this file is the single source for the contract.

**Substrate delegation (§K).** The *method* of decision-support research — how to decompose, how a worker gathers and grounds evidence, which sources may be cited — lives once in the shared `_shared/research/` substrate (built for `/research`, story `260613-m64`). `/artifact` **cites** it and states only its own deltas; it does not restate the source-tier gate or the rank-then-verify loop (§K one-fact-one-home). The three cited files, relative to this file (`artifact/reference/`):

- [`../../_shared/research/fan-out.md`](../../_shared/research/fan-out.md) — decompose → one worker per sub-question → structured findings (`#decompose`, `#roles`, `#worker-contract`, `#interim-reports`, `#degrade`).
- [`../../_shared/research/sourcing.md`](../../_shared/research/sourcing.md) — rank-then-verify evidence gathering (`#est-cost`, `#rank-then-verify`).
- [`../../_shared/research/source-tiers.md`](../../_shared/research/source-tiers.md) — the anti-slop citation hard gate (`#hard-gate`).

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

The warrant check is LLM judgment, not a prompt — do not ask the user "should we research?"; decide, log, and let Step B's plan-approval be the user's gate. **(/artifact delta — `/research` is research-first and always proceeds; `/artifact` gates the whole stage behind this warrant check.)**

## Step B — Research plan + approval

Decompose the doc's external-fact needs into a **research plan**: 3–6 concrete sub-questions/areas, each one line, each answerable on its own evidence — per [`../../_shared/research/fan-out.md#decompose`](../../_shared/research/fan-out.md#decompose) (independent sub-questions; no two that would need to share a worker's mid-flight findings). Emit the cost-estimate log line from [`../../_shared/research/sourcing.md#est-cost`](../../_shared/research/sourcing.md#est-cost) so a large run is never a silent surprise, then present the plan via `AskUserQuestion`:

```
question: "Research plan for <doc>. Approve, edit, or skip?"
options:
  - Approve and run (Recommended)
  - Edit the questions
  - Skip research
```

`(Recommended)` = Approve. On Edit, take free-form revisions and re-present. On Skip, log `research: skipped (user)` and proceed to draft. **(/artifact delta — the user-approval gate on the plan is `/artifact`-specific; `/research` runs its plan without this gate.)**

## Step C — Subagent fan-out

On approval, dispatch **one research worker per sub-question** following the canonical worker contract at [`../../_shared/research/fan-out.md#worker-contract`](../../_shared/research/fan-out.md#worker-contract) and the role/model table at [`../../_shared/research/fan-out.md#roles`](../../_shared/research/fan-out.md#roles): each worker gets its single sub-question + the decision it supports + `sourcing.md` and `source-tiers.md` as its evidence rules, gathers per the rank-then-verify loop at [`../../_shared/research/sourcing.md#rank-then-verify`](../../_shared/research/sourcing.md#rank-then-verify), obeys the anti-slop hard gate at [`../../_shared/research/source-tiers.md#hard-gate`](../../_shared/research/source-tiers.md#hard-gate) (fetch every source it cites; omit rather than guess; report honest gaps over padding), and returns **structured findings, not prose**.

**/artifact deltas (stated, not restated method):**
- **Subagent type + tier:** dispatch the `general-purpose` subagent at `sonnet` tier (the `#roles` worker row is `sonnet` — search + structured extraction is well-scoped).
- **Concurrency cap ~4** and **deep-only** — `/artifact` runs this stage only at `--depth deep`, where the `#decompose` "deep = ~5 + one gap-fill wave" sizing applies.
- **No per-worker interim files:** workers return their findings to this orchestrator, which writes the single sidecar in Step D — `/artifact` deviates from [`../../_shared/research/fan-out.md#interim-reports`](../../_shared/research/fan-out.md#interim-reports) by design (see Output contract).

## Step D — Merge + save

Collect the workers' structured findings and reduce them with a **validating + tolerant** reducer: drop any claim whose only support fails the hard gate at [`../../_shared/research/source-tiers.md#hard-gate`](../../_shared/research/source-tiers.md#hard-gate) (no fetched + attributable source → not cited, or flagged unverified); normalize URL/accidental format drift; **dedupe by `(claim, source_url)`** (an `/artifact` merge delta — the substrate leaves cross-worker consumption to the calling skill per `sourcing.md#unit`). Then write the synthesized research doc per the Output contract.

## Output contract

- **Path:** `<feature_folder>/research/<slug>-research.md` (create the `research/` dir if absent).
- **Shape:** a **single loose markdown sidecar** (per OQ2) — NOT rendered through the HTML substrate, NOT indexed in the feature `index.html`, NOT commentable. A leading `# Research — <doc>` H1, then one `## <area>` section per research area, each with bullet findings and an inline `[source](url)` per claim, then a `## Sources` list.
- **By-design deviation from the substrate:** `/artifact` writes this **one** sidecar instead of the per-sub-question `interim-reports/<NN>-<slug>.{html,md}` files of [`../../_shared/research/fan-out.md#interim-reports`](../../_shared/research/fan-out.md#interim-reports). The substrate's interim-report layout serves `/research`'s standalone audit trail; `/artifact`'s research is a pre-draft context fold, so a single sidecar is the right grain. The cite is to the *method* (decompose / gather / gate), never to the file layout.
- **Consumption:** the draft (Step 8) reads this file and folds it into `gathered_context` tagged `source: research/<slug>-research.md`. Every research-derived claim in the draft carries its citation.

## Non-interactive degradation

In `--non-interactive` (main-agent), Step B AUTO-PICKs Approve (per the canonical non-interactive block) and buffers the plan into the OQ log; the fan-out runs unattended. On a platform without subagents, collapse the fan-out to **sequential inline research** per [`../../_shared/research/fan-out.md#degrade`](../../_shared/research/fan-out.md#degrade) — the orchestrator works each sub-question itself, in order, still obeying `sourcing.md` + `source-tiers.md`; log the degradation. The whole stage is additionally skipped when `/artifact` itself runs as a subagent (subagents can't dispatch further skills/subagents reliably) — see `SKILL.md` `## Platform Adaptation`.
