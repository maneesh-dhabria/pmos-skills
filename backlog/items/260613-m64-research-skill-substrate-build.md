---
schema_version: 1
id: 260613-m64
kind: story
parent: 260613-vba
title: Author _shared/research/ substrate + the /research skill end-to-end
type: feature
priority: should
status: in-progress
route: skill
dependencies: []
feature_folder: docs/pmos/features/2026-06-13_research-skill/
plan_doc: docs/pmos/features/2026-06-13_research-skill/stories/260613-m64/03_plan.html
tasks: docs/pmos/features/2026-06-13_research-skill/stories/260613-m64/tasks.yaml
worktree: ../agent-skills-260613-m64
claimed_by: build:loop
driver_holder: build:loop
labels: [pmos-toolkit, research, deep-research]
created: 2026-06-13
updated: 2026-06-13
released:
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

- [ ] **Substrate:** `plugins/pmos-toolkit/skills/_shared/research/` exists with `sourcing.md`
      (rank-then-verify), `source-tiers.md` (binary attributable+reachable gate, T1–T4), and a
      `fan-out.md` protocol (decompose → one worker per sub-question → structured findings →
      interim report). No cross-plugin cite of learnkit.
- [ ] **Intake + clarification:** `/research` takes a topic + expectations; `AskUserQuestion`
      asks the decision, depth/coverage, scope, sources, output constraints — each with a
      `(Recommended)` default.
- [ ] **Depth dial:** `--depth brief|standard|deep` drives # workers (brief 0 inline /
      standard 3–5 / deep ~5 + 1 gap-fill wave), sources, verification rigor, report length,
      and whether `/polish` runs.
- [ ] **Research plan + approval:** proposes a plan outline and gates fan-out behind approval
      (standard+); deep first runs a brief preliminary scoping subagent.
- [ ] **Sources:** web + user files/URLs + local repo/docs default; **Notion + Drive
      approval-gated in v1** (Gmail/GitHub/Slack out of scope); degrade gracefully when absent.
- [ ] **Fan-out + interim docs:** workers (sonnet) fan out per plan; each saves an interim
      report to `interim-reports/`; orchestrator synthesizes.
- [ ] **Verification scales by tier:** brief citation-only / standard triangulation (≥2) /
      deep adversarial refutation pass.
- [ ] **Output:** decision-framed report (TL;DR+confidence → decision frame → options table →
      evidence-by-sub-question → what-would-change-my-mind → risks → source-quality appendix)
      at `{docs_path}/research/{YYYY-MM-DD}-<topic-slug>/research-report.html` + `interim-reports/`;
      self-contained HTML via `_shared/html-authoring`; tables/nested bullets over prose.
- [ ] **Polish:** references `/polish` guidelines for all output; runs `/polish` at deep.
- [ ] **Quality:** passes `skill-eval` ([D]+[J]) per `skill-patterns.md §A–§L`; non-interactive
      block inlined byte-identical; canonical skill path; manifest version-sync handled by release.
- [ ] **Dogfood (verify-time acceptance, task T10):** the built skill runs end-to-end at **deep**
      tier with default values on "Semantic Layer for Metrics and its Use Cases", producing
      `docs/pmos/research/<YYYY-MM-DD>-semantic-layer-for-metrics/research-report.html` +
      `interim-reports/`; an **independent judge** subagent validates decision-support quality
      (recommendation actionable, every claim cited to a reachable+attributable source, options
      table grounded, no hallucinated sources); obvious gaps the run surfaces are fixed. Executed
      during `/verify`, not `/execute`.

## Notes

Design contract + grill decisions (D1 in-epic refactor, D4 Notion+Drive v1, deep cap ~5):
`docs/pmos/features/2026-06-13_research-skill/02_design.html`.
