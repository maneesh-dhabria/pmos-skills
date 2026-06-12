---
schema_version: 1
id: 10
title: "Deepen /artifact into a document pipeline"
type: feature
kind: epic
status: released
priority: should
labels: [artifact, pmos-toolkit, doc-pipeline, idea]
created: 2026-06-12
updated: 2026-06-12
released: pmos-toolkit/v2.65.0
source: docs/pmos/ideate/2026-06-12_deepen-artifact-pipeline.html
spec_doc: docs/pmos/features/2026-06-12_deepen-artifact-pipeline/02_spec.html
plan_doc: docs/pmos/features/2026-06-12_deepen-artifact-pipeline/03_plan.html
pr:
parent:
dependencies: []
---

## Context

Deepen `/artifact` (rather than build a new `/doc-pipeline` skill) so one run can take any document — template-backed or proposed-from-scratch — from context to a researched, multi-stakeholder-critiqued, diagrammed, polished, and grilled final. Honours the repo's anti-reimplementation norm: `/artifact` already owns context-gathering, templating, drafting, and a reviewer loop. Net-new surface = research, multi-persona critique, a from-scratch-template path, and orchestration of `/diagram` + `/polish` + `/grill`.

Full ideation brief + pressure-test: `docs/pmos/ideate/2026-06-12_deepen-artifact-pipeline.html`.

## Acceptance Criteria

- [ ] Template proposal when none match: propose a template from context; research alongside eval generation if warranted; offer to save as a reusable template (default No, best-practice-checklist-gated); ship new-template guidelines.
- [ ] Document-length target: carried by templates; asked when proposing a new template.
- [ ] Research phase: approval-gated, proposes a plan, fans out subagents, saves output to `<feature_folder>/research/` with verifiable-source provenance; auto-skips when research isn't warranted.
- [ ] Multi-persona critique: 3–4 template-defined-or-recommended stakeholder personas critique in parallel; findings reconciled with the user before the draft updates.
- [ ] Diagram pass (recommended): propose → approve → subagent `/diagram` (non-interactive, mandated bg-rect, fixed anchor) → validate each SVG before inline insert; remember the preference per-project.
- [ ] `/polish` always runs at the end — mechanical findings auto-apply, voice-risk findings gated per-finding.
- [ ] `/grill` runs for every artifact, scaled by `--depth`; interactive interrogation when a human is present, written-findings degradation when headless.
- [ ] `--depth brief|standard|deep` is the master dial — the full battery is earned by stakes, not imposed on every run (resolve "default vs deep-only" in spec).

## Notes

Pressure-test verdict: **Lead (build) — conditionally.** Dominant theme: every "always / mandatory" in the spec is a premortem trigger — convert "always *do*" into "always *offer / run-in-safe-mode*," with `--depth` as the master dial.

Two H×H risks to resolve in `/spec` before building:
1. Non-interactive composition of `/grill` + `/polish` + `/diagram` inside `/artifact` (`/polish` warns subagents can't invoke it — verify the main-agent path; `/grill` is turn-by-turn interactive — needs a headless degradation).
2. Whether the heavy pipeline is default or `deep`-only (pressure-test leans opt-in; user leaned "always" for grill/polish — reconcile).

Open questions (see brief): personas on-template vs per-run-recommended; is `research/` a first-class artifact or loose sidecar; does refine/update re-grill or only create.

Next step: `/skill-sdlc --from-feedback docs/pmos/ideate/2026-06-12_deepen-artifact-pipeline.html` (extend of an existing skill → revise-existing path).
