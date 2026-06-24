---
schema_version: 1
id: 260624-fbd
kind: story
parent: 260624-kkw
title: "Substrate _shared/critique-rubric/ — axes.md (10 axes + per-axis checks) + heuristics.md (reasoning spine) + doc-types.md (applicability map + verdict scale + findings schema) + vendored anonymized corpus samples"
type: feature
priority: should
route: skill
dependencies: []
plugin: pmos-toolkit
status: planned
feature_folder: docs/pmos/features/2026-06-24_artifact-critique/
plan_doc: docs/pmos/features/2026-06-24_artifact-critique/stories/260624-fbd/03_plan.md
tasks: docs/pmos/features/2026-06-24_artifact-critique/stories/260624-fbd/tasks.yaml
worktree:
claimed_by:
driver_holder:
labels: [pmos-toolkit, artifact-critique, critique-rubric, substrate, new-substrate]
created: 2026-06-24
updated: 2026-06-24
---

<!-- status: planned at define (Loop 1); route:skill. Build via /skill-sdlc build --story 260624-fbd -->

## Context

Foundational substrate story of epic `260624-kkw`. Authors `_shared/critique-rubric/` — the single
home (Inv-1) for the 10-axis rubric, the cross-cutting heuristic spine, the verdict scale, the
doc-type applicability map, and the structured-findings schema — which story `aa8` (the
`/artifact-critique` SKILL.md) cites and never forks. Pure reference/data + vendored anonymized
fixtures; no SKILL.md here. Design contract: `02_design.html` — see `#framework`, `#resolved`,
`#doc-types`, `#findings-schema`, `#invariants`, `#substrate-map`.

## Acceptance criteria

1. `_shared/critique-rubric/axes.md` declares the **fixed 10 axes in order** (`Customer · Solution ·
   Scope · Metrics · Pricing · Strategy · GTM · Stage · AI · Risks`); for each axis: a one-line scope,
   the concrete checks (which `heuristics.md` heuristics apply — per `02_design.html#axes-checks`), and
   a "what I'd want to see" template. The axis set + order are the single source `aa8` reads.
2. `_shared/critique-rubric/heuristics.md` captures the doc-type-agnostic reasoning spine
   (`02_design.html#heuristics`): assertion-vs-evidence, hypothesis falsifiability + named mechanism,
   outcome-vs-output (baseline/target/timeframe/counter-metric/threshold), durable-vs-current,
   stage-fit, AI-as-risk-surface (Behavior Contract), pre-mortem, alternatives-considered,
   scope IN/OUT/CUT, multi-sided completeness, no-burial. Each as a named, citable heuristic.
3. `_shared/critique-rubric/doc-types.md` declares: (a) the **verdict scale** (`STRONG/MIXED/WEAK/
   ABSENT/N/A`, ordinal + free-text reason — `02_design.html#verdict-scale`); (b) the **applicability
   map** per doc-type (PRD/strategy/POV/roadmap) marking each axis E / N/A / C, with the conditional
   rules (Pricing N/A for internal tools; AI E iff an AI/LLM feature) and the **hybrid-union rule**
   (`02_design.html#doc-types`); (c) the `pmos-critique-findings/v1` **structured-findings schema**
   (`02_design.html#findings-schema`). The map drives ABSENT vs N/A deterministically.
4. **Vendored anonymized corpus samples** under
   `docs/pmos/features/2026-06-24_artifact-critique/corpus-samples/` — anonymized/redacted
   doc-excerpt + paired critique-output JSON, ≥2 doc-types + an AI-feature case; **no real/confidential
   corpus doc committed** (per the define decision). Used as `aa8`'s few-shot exemplars + eval fixtures.
5. **Internal-consistency self-check** (a small script or test asserts): every axis named in `axes.md`
   appears in the `doc-types.md` applicability map and the findings schema's axis enum; every heuristic
   referenced by an `axes.md` check exists in `heuristics.md`; every sample in `corpus-samples/` parses
   against `pmos-critique-findings/v1`. No dangling internal references.
6. **Inv-6 dangling-cite guard:** nothing outside this epic references `_shared/critique-rubric/`; a
   grep proves only `aa8`'s SKILL.md (built next) will cite it. No `/artifact` cite ships.
7. Conforms to `feature-sdlc/reference/skill-patterns.md §A–§L` (as substrate, not a SKILL.md) + host
   `CLAUDE.md` (canonical `_shared/` path; no version/changelog/README tasks — those are
   `/complete-dev`'s at epic release).
