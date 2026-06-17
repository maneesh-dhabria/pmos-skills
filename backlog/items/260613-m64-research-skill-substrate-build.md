---
schema_version: 1
id: 260613-m64
kind: story
parent: 260613-vba
title: Author _shared/research/ substrate + the /research skill end-to-end
type: feature
priority: should
status: done
route: skill
dependencies: []
feature_folder: docs/pmos/features/2026-06-13_research-skill/
plan_doc: docs/pmos/features/2026-06-13_research-skill/stories/260613-m64/03_plan.html
tasks: docs/pmos/features/2026-06-13_research-skill/stories/260613-m64/tasks.yaml
worktree:
claimed_by: build:loop
driver_holder: build:loop
labels: [pmos-toolkit, research, deep-research]
created: 2026-06-13
updated: 2026-06-17
released: 2.84.0
---

<!-- status: planned at define (Loop 1); plan_doc + tasks.yaml authored. Build via /feature-sdlc build --story 260613-m64 -->

## Context

Story 1 of epic `260613-vba`. Builds the `_shared/research/` substrate (sourcing,
source-tiers, fan-out protocol — ported from learnkit's `topic-research/` patterns, NOT
cross-cited) and authors the new pmos-toolkit `/research` skill against the design contract
`docs/pmos/features/2026-06-13_research-skill/02_design.html` and the standing
skill-authoring criteria (`feature-sdlc/reference/skill-patterns.md §A–§L`, repo `CLAUDE.md`).
One `/execute` run = one PR. The substrate born here is what Story 2 (`260613-dnp`) consumes.

## Acceptance Criteria

- [x] **Substrate:** `plugins/pmos-toolkit/skills/_shared/research/` exists with `sourcing.md`
      (rank-then-verify), `source-tiers.md` (binary attributable+reachable gate, T1–T4), and a
      `fan-out.md` protocol (decompose → one worker per sub-question → structured findings →
      interim report). No cross-plugin cite of learnkit.
- [x] **Intake + clarification:** `/research` takes a topic + expectations; `AskUserQuestion`
      asks the decision, depth/coverage, scope, sources, output constraints — each with a
      `(Recommended)` default.
- [x] **Depth dial:** `--depth brief|standard|deep` drives # workers (brief 0 inline /
      standard 3–5 / deep ~5 + 1 gap-fill wave), sources, verification rigor, report length,
      and whether `/polish` runs.
- [x] **Research plan + approval:** proposes a plan outline and gates fan-out behind approval
      (standard+); deep first runs a brief preliminary scoping subagent.
- [x] **Sources:** web + user files/URLs + local repo/docs default; **Notion + Drive
      approval-gated in v1** (Gmail/GitHub/Slack out of scope); degrade gracefully when absent.
- [x] **Fan-out + interim docs:** workers (sonnet) fan out per plan; each saves an interim
      report to `interim-reports/`; orchestrator synthesizes.
- [x] **Verification scales by tier:** brief citation-only / standard triangulation (≥2) /
      deep adversarial refutation pass.
- [x] **Output:** decision-framed report (TL;DR+confidence → decision frame → options table →
      evidence-by-sub-question → what-would-change-my-mind → risks → source-quality appendix)
      at `{docs_path}/research/{YYYY-MM-DD}-<topic-slug>/research-report.html` + `interim-reports/`;
      self-contained HTML via `_shared/html-authoring`; tables/nested bullets over prose.
- [x] **Polish:** references `/polish` guidelines for all output; runs `/polish` at deep.
- [x] **Quality:** passes `skill-eval` ([D]+[J]) per `skill-patterns.md §A–§L`; non-interactive
      block inlined byte-identical; canonical skill path; manifest version-sync handled by release.
- [x] **Dogfood (verify-time acceptance, task T10):** the built skill runs end-to-end at **deep**
      tier with default values on "Semantic Layer for Metrics and its Use Cases", producing
      `docs/pmos/research/<YYYY-MM-DD>-semantic-layer-for-metrics/research-report.html` +
      `interim-reports/`; an **independent judge** subagent validates decision-support quality
      (recommendation actionable, every claim cited to a reachable+attributable source, options
      table grounded, no hallucinated sources); obvious gaps the run surfaces are fixed. Executed
      during `/verify`, not `/execute`.

## Notes

Design contract + grill decisions (D1 in-epic refactor, D4 Notion+Drive v1, deep cap ~5):
`docs/pmos/features/2026-06-13_research-skill/02_design.html`.

## Build 2026-06-13 (Loop 2, holder build:loop)

Built end-to-end on `feat/260613-m64` (worktree `../agent-skills-260613-m64`). Impl
commit `58b51f2`, dogfood-evidence commit `df0c48c` — both ride the feat branch for
Loop-3 release (not merged to main; this write-back only stamps the story).

- **T1 substrate** — `plugins/pmos-toolkit/skills/_shared/research/{source-tiers,sourcing,fan-out}.md`,
  ported from learnkit `topic-research/` (NOT cross-cited, per D2 — sync-shared.sh is
  intersection-only). §K canonical-home structure; §L model-tier table in fan-out.md.
- **T2–T9 skill** — `plugins/pmos-toolkit/skills/research/SKILL.md`: 9 integer phases
  (0 setup → 8 capture-learnings) with `{#kebab}` anchors; depth dial brief/standard/deep;
  §H plan-approval hard gate; §K cites substrate (no restated tier/rank logic); §L dispatch
  table; Notion+Drive approval-gated (v1). Non-interactive block byte-identical.
- **Gates** — [D] skill-eval-check 17/17 PASS (capture-learnings heading needed a COLON,
  known gotcha); [J] skill-eval 17/17 applicable PASS (independent judge); 4 repo lints PASS
  (flags-vs-hints, phase-refs, non-interactive-inline 42/42, audit-recommended 2/2 marked).
- **T10 dogfood (verify-time)** — ran the freshly-built skill at DEEP tier on "Semantic
  Layer for Metrics and its Use Cases": 5 fan-out workers + 1 gap-fill wave (Microsoft Power
  BI), 35+ fetched attributable sources, decision-framed HTML report + 6 interim reports at
  `docs/pmos/research/2026-06-13-semantic-layer-for-metrics/`. INDEPENDENT judge: **PASS,
  7/10**. Two surfaced citation gaps fixed in-loop (Atlan 80%-figure mis-attribution;
  Madison-Mae converted-skeptic framing).

**AC1–AC10 + dogfood AC: all PASS.** Release rides Loop 3 (`/complete-dev --epic 260613-vba`)
once sibling story `260613-dnp` (/artifact refactor) is also built.
