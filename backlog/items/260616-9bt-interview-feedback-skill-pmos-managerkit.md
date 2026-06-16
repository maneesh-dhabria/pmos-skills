---
schema_version: 1
id: 260616-9bt
title: "/interview-feedback skill + pmos-managerkit plugin"
type: feature
kind: epic
status: defined
route: skill
priority: should
labels: [interview-feedback, pmos-managerkit, new-plugin, skill]
created: 2026-06-16
updated: 2026-06-16
source: docs/design-briefs/2026-06-16-interview-feedback-skill.md
design_doc: docs/pmos/features/2026-06-16_interview-feedback/02_design.html
parent:
dependencies: []
---

## Context

New plugin **`pmos-managerkit`** (charter: "help me do manager work") and its first skill
**`/interview-feedback`** — a general, extensible interview-evaluation skill. Given a role's
guidelines + a candidate's interview inputs, it produces (a) a **filled scoring sheet**
(scores + qualitative feedback + hire/no-hire) and (b) **interviewer-performance notes**
(per-interviewer coaching, scored against a researched effectiveness rubric). PM interviews
are the first use case; the role → rounds → per-round-guideline schema is interview-agnostic.

Approved design brief: `docs/design-briefs/2026-06-16-interview-feedback-skill.md`
(adopted verbatim as the epic `design_doc:` — `02_design.html`).

Dogfood case (gitignored, never committed): Porter PM "bidding" case, Round 3, at
`/Users/maneeshdhabria/Downloads/interview-candidates` (JD, resume, interviewer brief,
scorecard, case question, ~830 MB recording).

## Acceptance Criteria (epic-level — stories carry the testable ACs)

- [ ] `pmos-managerkit` plugin scaffolded per repo "New-plugin scaffolding" (both manifests v0.1.0, both marketplace entries no-version, CLAUDE.md charter + Plugins-list).
- [ ] `/interview-feedback` verb skill: `setup` (role + round guidelines scaffold), bare/`score` (per-candidate eval), `list`.
- [ ] Storage model: configurable root, default CWD subfolder with a gitignore guard; raw inputs copied per candidate for citation.
- [ ] Three-tier input grounding: transcript (quote+timestamp) → interviewer notes → generated interviewer questionnaire fallback.
- [ ] Transcription pipeline: ffmpeg + whisper-cli with graceful degrade (modeled on existing transcribe.sh).
- [ ] Bundled, role-agnostic interviewer-effectiveness rubric (researched, verified-source) that output (b) scores against.
- [ ] Bundled PM round guideline starter set (reference + scorecard skeletons) for `setup`.
- [ ] Outputs: self-contained HTML filled scorecard + interviewer-performance notes; concise, bulleted, grounded.
- [ ] Reference-override resolution; lead/observer/panel interviewer model.
- [ ] Dogfooded live against the Porter PM case.

## Notes

route: skill — discovery shape is design-doc-adopt (no epic /spec; stories cite `02_design.html`
by anchor). Story split: judgement, default 1-skill-1-story; see define-loop story-split step.
