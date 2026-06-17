---
schema_version: 1
id: 260616-vwn
title: "pmos-managerkit + /interview-feedback core"
type: feature
kind: story
status: done
released: 0.1.0
route: skill
priority: should
labels: [interview-feedback, pmos-managerkit, new-plugin, skill]
created: 2026-06-16
updated: 2026-06-17
parent: 260616-9bt
dependencies: []
worktree: /Users/maneeshdhabria/Desktop/Projects/agent-skills-260616-vwn
build_branch: feat/260616-vwn
build_commit: deb6df0
claimed_by: null
driver_holder: null
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

- [x] **Plugin scaffold** (design §2, §16.8): `pmos-managerkit` with both manifests at v0.1.0, both `marketplace.json` entries (no `version`), CLAUDE.md `## Plugin charters` + `## Release policy → Plugins list` updated. Any cited pmos-toolkit `_shared/` protocol copied into managerkit byte-identical.
- [x] **Verb skill** (§3): `/interview-feedback setup`, bare/`score`, `list`. SKILL.md conforms to `skill-patterns.md §A–§L` and the repo canonical-path rule; carries the inline non-interactive block.
- [x] **Storage model** (§4): configurable root, default `./interviews/` under CWD with a **gitignore guard** (refuse/auto-ignore inside a git repo); raw inputs copied into each candidate folder for citation.
- [x] **role.json schema** (§16.5): `setup` writes `rounds[]` with `id, name, archetype (enum=7 archetypes+custom), guidelines_path, additional_docs[], interviewers[]{name,role:lead|shadow|panel}`.
- [x] **Scorecard machine-anchoring** (§16.1): canonical scorecard skeleton with `data-dim/data-weight/data-scale/data-v/data-input/data-flags`; foreign-sheet path infers dimensions then echoes back for confirmation (open-questions log when non-interactive) before filling.
- [x] **Three-tier grounding** (§9, §16.3, §16.4): transcript (verbatim ≥40-char citations) → interviewer notes → emitted questionnaire form (§16.6, non-interactive emits blank + refuses to fabricate). Per-interviewer attribution confidence flagged; unattributable claims fall to tier-3.
- [x] **Grounding-integrity gate** (§16.4): a deterministic script verifies every transcript-tier citation is a verbatim substring of `transcript.refined.txt`; unresolved citations fail verify.
- [x] **Transcription** (§10, §16.2): managerkit-owned ffmpeg-extract → whisper-cli step; model resolution incl. `~/whisper-models/`, default `medium`; graceful degrade to tier 2/3 with a nudge when absent.
- [x] **Interviewer-effectiveness rubric** (§11): researched (verified-source), bundled, role-agnostic; instantiates the canonical scorecard skeleton (§16.7); output (b) scores against it.
- [x] **Reference-override resolution** (§7); **interviewer model** lead/shadow/panel (§8).
- [x] **Outputs** (§12): self-contained HTML filled scorecard + interviewer-performance notes; concise, bulleted, every subjective claim grounded + source-tagged.
- [x] **Live dogfood**: run `score` end-to-end against the Porter PM case (incl. transcript from the recording if a whisper model is available, else tier-2/3); verify outputs grounded and the citation gate passes.

## Notes

skill-eval (route:skill) gates this story. Release prerequisites (v0.1.0 baseline, manifest sync,
README row) go under the spec's `## Release prerequisites`, not in any wave — `/complete-dev` owns them.

## Build outcome (2026-06-17, Loop-2)

BUILT on `feat/260616-vwn` @ `deb6df0` (19 files, +2418). All ACs met.

- **Gates green:** `tests/run-tests.sh` 8/8 (storage 5/5, transcribe 8/8, check-citations 4/4,
  fill-scorecard 22/22, questionnaire 7/7, +3 smoke); skill-eval `[D]` EXIT 0 (zero fails); 4 lints
  PASS (non-interactive-inline byte-identical across 49 skills, audit-recommended, flags-vs-hints,
  phase-refs).
- **Live dogfood (load-bearing):** real PM case interview → `transcribe.sh` (base) produced a real
  transcript → `fill-scorecard.mjs` grounded scorecard → `check-citations.mjs` gate **3 passed / 0
  failed**; **negative control** (planted fabricated quote) correctly **FAILED (exit 1)**; degrade
  path emits `degrade:tier3`/exit 3 (no crash); tier-3 questionnaire emits a blank non-fabricated
  form. Evidence (sanitized, no candidate content): `stories/260616-vwn/dogfood/DOGFOOD.md`.
- **Live-only fix:** `check-citations.mjs` now strips HTML comments before scanning, so the
  scorecard skeleton's contract doc-comment isn't mis-scored. Selftest still 4/4.
- **New-plugin scaffold:** `pmos-managerkit` both `plugin.json` @ v0.1.0 (same name+version); both
  marketplace entries carry no `version`; CLAUDE.md charter + Plugins-list updated. The inline
  non-interactive block is the only pmos-toolkit `_shared` content used and is inlined byte-identical
  (no cross-plugin `_shared/` cite to bootstrap).
- **Scope:** Story B (260616-06q) adds the 7 bundled PM round guideline templates. Epic 260616-9bt
  NOT released this iteration — awaits `/complete-dev --epic` once its stories are built.

Worktree kept for the next loop. Claim `build:cron-vwn` released.
