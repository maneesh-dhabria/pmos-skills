# Dogfooding — the TN−1 Dogfood / Utility Verification contract

Canonical home (§K) for the **dogfood task**: a load-bearing verification that exercises the *actual deliverable* on a realistic, representative end-to-end task and judges the **utility and quality** of what it produces — not merely that it ran. `/plan` emits it as **TN−1** (immediately before the TN smoke check); `/execute` runs it; `/verify` gates on its verdict. Every consumer cites this file and states only its own deltas — do not restate the contract.

Origin: `docs/pmos/features/2026-06-13_dogfooding-verification/02_design.html` (decisions D0–D9).

## Contents

- [Definition & distinction from the TN smoke test](#definition)
- [Task anatomy](#anatomy)
- [Eval criteria — objective AND subjective (D3)](#eval-criteria)
- [Independent-judge contract (D4)](#judge)
- [Archetype catalog (D8)](#archetypes)
- [Iterate-until-satisfied protocol (D2)](#iterate-loop)
- [Tier policy (D1)](#tier-policy)
- [Plan-time approval gate (D7)](#approval-gate)

## Definition & distinction from the TN smoke test {#definition}

**Dogfooding** = exercise the deliverable on a real, representative task and assess fitness-for-purpose. It is **additive, never a rename** of the existing TN render/lint/smoke checklist (D5) — both run.

| TN Final Verification (existing) | TN−1 Dogfood (new) |
|---|---|
| Does it render / compile / pass tests? | Is the produced artifact actually *good* for a real task? |
| Mechanical correctness, no console errors | Utility, completeness, accuracy, fitness-for-purpose |
| Synthetic smoke inputs (happy + one error path) | A real, representative end-to-end task the deliverable exists to serve |
| Self-checked by the implementer | Scored by an **independent, blind judge** against a declared rubric |

TN−1 sits immediately before TN in the breakdown and serializes into `tasks.yaml` as a real task (D6); TN stays last.

## Task anatomy {#anatomy}

Every dogfood task declares, in its body, in order:

1. **Archetype + scenario** — the chosen [archetype](#archetypes) and a concrete scenario: the real task plus a representative input.
2. **Objective criteria** — see [Eval criteria](#eval-criteria); measurable, with exact commands + expected output.
3. **Subjective criteria** — the blind-judge rubric (named dimensions); see [Eval criteria](#eval-criteria).
4. **Independent-judge dispatch** — per the [judge contract](#judge).
5. **Iterate protocol + cap** — per [Iterate-until-satisfied](#iterate-loop).
6. **Verdict line** — `**Verdict:** satisfied | not-satisfied` plus `accepted_residuals: [...]`, written for `/verify` to read and gate on.

## Eval criteria — objective AND subjective (D3) {#eval-criteria}

**Every dogfood task MUST declare BOTH kinds.** A task with only one kind fails `/plan`'s review structural check.

### Objective criteria (measurable, deterministic where possible)

- **Pass/fail gates** with exact commands and expected output.
- **Counts & rates:** task-success rate, error rate, uncaught console errors = 0, broken-link count = 0, required elements present, citation/source count ≥ N.
- **Thresholds:** latency / runtime bounds, output-size bounds.
- **Golden-sample / contract diffs** where a reference output exists.

### Subjective criteria (blind LLM-judge rubric)

- A rubric of **named dimensions** appropriate to the deliverable (e.g. for a report: accuracy, completeness, relevance, actionability, citation quality, clarity).
- Each dimension scored with a **verdict + one-line rationale grounded in the output** (quote-grounded where applicable, per `_shared/reviewer-protocol.md`).
- An **overall satisfied / not-satisfied** against an explicitly stated bar (e.g. "every dimension ≥ acceptable AND no dimension is a blocker").

## Independent-judge contract (D4) {#judge}

The subjective half is scored by a **fresh subagent, blind to the author's intent** — never the same context that produced the output (which would rubber-stamp it). Inputs given to the judge: the **produced output** (path or pasted), the **rubric**, and the **original task** the deliverable was asked to do. It returns a **structured verdict**:

```
{ per_dimension: [{dimension, verdict, rationale}], overall_satisfied: bool, gaps: [<enumerated, when not satisfied>] }
```

The judge **makes no edits** — it scores and reports; the fix loop is driven separately ([iterate protocol](#iterate-loop)). The dispatch **inherits the parent model** (per `skill-patterns.md §L`) — blind quality judgement is genuine judgment, not mechanical extraction, so it is never downgraded to a cheaper tier. **Non-subagent fallback:** self-review framed *"judge this as if seeing it for the first time,"* logged as a downgrade.

## Archetype catalog (D8) {#archetypes}

Not one rigid recipe — pick the archetype matching the deliverable; the scenario + criteria specialize from it.

| Deliverable | Archetype | How it dogfoods |
|---|---|---|
| Skill / content generator (e.g. `/research`, `/primer`) | **Use → blind LLM-judge** | Invoke the skill on a real topic; an independent judge scores the output against objective + rubric criteria; gaps → fix → re-run until satisfied. |
| Frontend / UI feature | **Dev-server + browser-automation friction run** | Start the app; complete the real task in-browser (Playwright MCP); record success/error rate, console errors, friction; gaps → fix → re-run. |
| CLI / tool | **Real-invocation against representative inputs** | Run on real inputs; compare to expected outcomes / golden samples; objective gates + judged usefulness. |
| Data pipeline / transform | **Golden-sample diff + spot-check** | Run on a representative dataset; assert quality metrics; judge spot-checked records. |
| API / service | **Scenario exercise** | Real request sequences over primary + error journeys; contract + judged response fitness. |

When the deliverable fits none, the author writes a **bespoke scenario** satisfying the same dual-criteria + independent-judge + iterate contract.

## Iterate-until-satisfied protocol (D2) {#iterate-loop}

Mirrors the `/skill-eval` remediation loop (`feature-sdlc/SKILL.md#skill-eval`) so the posture is familiar.

1. **Run** the dogfood scenario; collect objective results + the judge's structured verdict.
2. **Satisfied** (all objective gates green AND judge `overall_satisfied`) → record `**Verdict:** satisfied`; done.
3. **Not satisfied and iteration count < 2** → enumerate concrete **gaps**, spawn fix tasks via **`/execute`'s existing discovered-work routing** (`execute/SKILL.md#discovered-work` — **no `/execute` skill change**, D6), apply, then **re-run the dogfood**.
4. **Net-worse guard:** an iteration that fails more, or newly fails a previously-passing criterion, surfaces a **Restore previous** option.
5. **Cap = 2 remediation iterations.** Past it, `AskUserQuestion` — **Accept residuals as known risk** (recorded in the verdict, re-checked by `/verify`, surfaced loudly) / **Iterate manually** / **Restore previous** (only if net-worse) / **Abort**. **No silent pass.**

**Non-interactive (W14):** the plan-time [approval gate](#approval-gate) is deferred (use the recommended scenario); the loop auto-iterates to the cap; past the cap it **accepts residuals and surfaces them loudly** in the report and the `/verify` + `/complete-dev` summary.

## Tier policy (D1) {#tier-policy}

- **Tier 3 (feature):** mandatory — at least one load-bearing dogfood task.
- **Tier 2 (enhancement):** mandatory.
- **Tier 1 (bugfix):** optional (recommended-skip) — the reduced TN smoke check stays the default; a dogfood task is *offered* when the fix warrants real-use validation.

## Plan-time approval gate (D7) {#approval-gate}

`/plan` presents the proposed dogfood task — **archetype, scenario, objective criteria, subjective rubric** — via `AskUserQuestion` for the user to **approve or edit before the plan finalizes**. The `(Recommended)` option is the **auto-proposed scenario** (so the ask is not `defer-only`). Under `--non-interactive` the ask is deferred and the recommended scenario is used (W14), logged.
