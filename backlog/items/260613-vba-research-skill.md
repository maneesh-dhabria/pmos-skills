---
schema_version: 1
id: 260613-vba
title: "Build /research — PM decision-support deep-research skill"
type: feature
kind: epic
status: defining
priority: should
labels: [research, pmos-toolkit, skill, deep-research, idea]
created: 2026-06-13
updated: 2026-06-13
released:
route: skill
source: "skill-sdlc define (2026-06-13 session)"
design_doc: docs/pmos/features/2026-06-13_research-skill/02_design.html
pr:
parent:
dependencies: []
---

## Context

Author a new pmos-toolkit skill `/research` that helps a PM conduct deep, multi-source
research on any topic and produces a cited, decision-framed HTML research report.

**Distinct job (the differentiator):** unlike the general `deep-research` skill (neutral
fan-out → verify → cited report) and learnkit's `/primer` + `/learn-list` (learning
artifacts), `/research` is **decision-support research** — every run is anchored to a PM
decision it must inform, and the report carries a recommendation: options, evidence,
risks, and an explicit "so what for the decision."

**Coherence flag (resolve in design + grill):** epic `0010` (Deepen /artifact into a
document pipeline) already specifies an approval-gated, subagent-fan-out research phase
that saves to a `research/` folder with verifiable provenance. `/research` and that phase
must not diverge — decide whether they share a `_shared/` research substrate or whether
`/artifact` delegates to `/research`.

Design + best-practices research (deep-research agent patterns: plan-then-execute,
orchestrator-worker fan-out, claim verification, saturation/stop criteria) live in the
design doc: `docs/pmos/features/2026-06-13_research-skill/02_design.html`.

## Acceptance Criteria

- [ ] **Intake + clarification:** user supplies a topic + expectations; the skill asks
      (via AskUserQuestion) the decision the research supports, the depth/coverage needed,
      and the scope — recommending defaults.
- [ ] **Depth tier:** uses the standard `--depth brief|standard|deep` dial
      (`_shared/tier-matrix.md`); tier drives # sources, # fan-out subagents, verification
      rigor, report length, and whether `/polish` runs.
- [ ] **Research plan + approval:** proposes a research-plan outline and gets user
      approval before fan-out; for deep tier, runs preliminary exploratory scoping research
      (subagent) to inform a better plan.
- [ ] **Output constraints:** recommends report output constraints (length/page target,
      writing style) for the user to confirm; prefers tables + nested bullets over long
      narrative prose.
- [ ] **Source scope:** web (search + fetch), user-provided files/URLs, and local
      repo/docs are default sources; connected sources are used ONLY after explicit per-run
      user approval, degrading gracefully when unavailable (headless). **v1 = Notion + Drive**;
      Gmail/GitHub/Slack deferred to v2 (grill D4).
- [ ] **/artifact coherence (Story 2):** epic 0010's `/artifact` research phase is refactored
      to consume the new `_shared/research/` substrate — one research engine, no drift (grill D1).
- [ ] **Fan-out execution:** fans out research subagents per the plan; each saves an
      interim report as an individual document under an `interim-reports/` sub-folder; the
      orchestrator synthesizes interim reports into the final report.
- [ ] **Verification scales by tier:** brief = citation-only (every claim sourced);
      standard = source triangulation (≥2 sources for key claims); deep = full adversarial
      verification (refutation pass per major claim).
- [ ] **Output location + format:** final report at
      `{docs_path}/research/{YYYY-MM-DD}-<topic-slug>/research-report.html` with an
      `interim-reports/` sub-folder; HTML default (or inferred from pmos `output_format`);
      self-contained via `_shared/html-authoring`.
- [ ] **Polish:** references `/polish` writing guidelines for all output; runs `/polish`
      at the end for deep tier.
- [ ] **Quality gate:** passes `skill-eval` ([D] + [J]) per `skill-patterns.md §A–§L`.

## Stories

- `260613-m64` — Author `_shared/research/` substrate + the `/research` skill (route: skill,
  no deps). **Planned** (plan_doc + tasks.yaml authored). Build first.
- `260613-dnp` — Refactor `/artifact` research phase to delegate to `_shared/research/`
  (route: skill, depends on `260613-m64`). **Ready**; plan deferred until m64 lands.

## Notes

Positioning, plugin (pmos-toolkit), source scope, and verification confirmed with user via
AskUserQuestion on 2026-06-13. Grill resolved: D1 = build substrate + refactor /artifact in
this epic (2 stories); D4 = v1 Notion+Drive, Gmail/GitHub/Slack → v2; deep fan-out capped ~5.
Best-practices research: `docs/pmos/features/2026-06-13_research-skill/research-best-practices.md`.
