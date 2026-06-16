---
schema_version: 1
id: 260616-vwn
title: "pmos-managerkit + /interview-feedback core"
type: feature
kind: story
status: planned
route: skill
priority: should
labels: [interview-feedback, pmos-managerkit, new-plugin, skill]
created: 2026-06-16
updated: 2026-06-16
parent: 260616-9bt
dependencies: []
design_doc: docs/pmos/features/2026-06-16_interview-feedback/02_design.html
plan_doc: docs/pmos/features/2026-06-16_interview-feedback/stories/260616-vwn/03_plan.html
tasks_file: docs/pmos/features/2026-06-16_interview-feedback/stories/260616-vwn/tasks.yaml
---

## Context

Story A of epic 260616-9bt. Scaffolds the new `pmos-managerkit` plugin and builds the
`/interview-feedback` skill core — everything except the 7 bundled PM round guideline templates
(Story B, 260616-06q). Independently dogfoothable: the Porter PM case (`.interview-dogfood/`)
supplies its own interviewer-reference + scorecard, so `score` works without the bundled set.

Cites the epic design_doc `02_design.html` by anchor.

## Acceptance Criteria

- [ ] **Plugin scaffold** (design §2, §16.8): `pmos-managerkit` with both manifests at v0.1.0, both `marketplace.json` entries (no `version`), CLAUDE.md `## Plugin charters` + `## Release policy → Plugins list` updated. Any cited pmos-toolkit `_shared/` protocol copied into managerkit byte-identical.
- [ ] **Verb skill** (§3): `/interview-feedback setup`, bare/`score`, `list`. SKILL.md conforms to `skill-patterns.md §A–§L` and the repo canonical-path rule; carries the inline non-interactive block.
- [ ] **Storage model** (§4): configurable root, default `./interviews/` under CWD with a **gitignore guard** (refuse/auto-ignore inside a git repo); raw inputs copied into each candidate folder for citation.
- [ ] **role.json schema** (§16.5): `setup` writes `rounds[]` with `id, name, archetype (enum=7 archetypes+custom), guidelines_path, additional_docs[], interviewers[]{name,role:lead|shadow|panel}`.
- [ ] **Scorecard machine-anchoring** (§16.1): canonical scorecard skeleton with `data-dim/data-weight/data-scale/data-v/data-input/data-flags`; foreign-sheet path infers dimensions then echoes back for confirmation (open-questions log when non-interactive) before filling.
- [ ] **Three-tier grounding** (§9, §16.3, §16.4): transcript (verbatim ≥40-char citations) → interviewer notes → emitted questionnaire form (§16.6, non-interactive emits blank + refuses to fabricate). Per-interviewer attribution confidence flagged; unattributable claims fall to tier-3.
- [ ] **Grounding-integrity gate** (§16.4): a deterministic script verifies every transcript-tier citation is a verbatim substring of `transcript.refined.txt`; unresolved citations fail verify.
- [ ] **Transcription** (§10, §16.2): managerkit-owned ffmpeg-extract → whisper-cli step; model resolution incl. `~/whisper-models/`, default `medium`; graceful degrade to tier 2/3 with a nudge when absent.
- [ ] **Interviewer-effectiveness rubric** (§11): researched (verified-source), bundled, role-agnostic; instantiates the canonical scorecard skeleton (§16.7); output (b) scores against it.
- [ ] **Reference-override resolution** (§7); **interviewer model** lead/shadow/panel (§8).
- [ ] **Outputs** (§12): self-contained HTML filled scorecard + interviewer-performance notes; concise, bulleted, every subjective claim grounded + source-tagged.
- [ ] **Live dogfood**: run `score` end-to-end against the Porter PM case (incl. transcript from the recording if a whisper model is available, else tier-2/3); verify outputs grounded and the citation gate passes.

## Notes

skill-eval (route:skill) gates this story. Release prerequisites (v0.1.0 baseline, manifest sync,
README row) go under the spec's `## Release prerequisites`, not in any wave — `/complete-dev` owns them.
