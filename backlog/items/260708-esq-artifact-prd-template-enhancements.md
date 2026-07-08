---
schema_version: 1
id: 260708-esq
title: "Enhance the /artifact PRD template — MSF narrative section, /artifact-critique borrows (alternatives+hypothesis, pre-mortem, conditional AI-risk), Doshi-categorized question-first metrics, mandated per-story validation, and a user-facing conceptual-wireframes hook"
type: feature
kind: epic
status: defined
route: skill
priority: should
labels: [pmos-toolkit, artifact, prd-template, skill]
created: 2026-07-08
updated: 2026-07-08
design_doc: docs/pmos/features/2026-07-08_artifact-prd-template-enhancements/02_design.html
feature_folder: docs/pmos/features/2026-07-08_artifact-prd-template-enhancements/
parent:
released:
dependencies: []
---

## Context

Five targeted upgrades to the **PRD template** shipped inside `/artifact`
(`plugins/pmos-toolkit/skills/artifact/templates/prd/{template.md, eval.md}`) plus one behavioural hook in
`/artifact`'s create flow. **Skill-new-shaped, `route: skill`**, single skill / single plugin (pmos-toolkit), one
release unit. The PRD template is already mature (14 sections + a matching eval rubric); this epic makes five
additions the maintainer asked for — it is content + one gated create-flow stage, not a new skill.

Four define-time decisions were confirmed interactively (D1–D4 in `02_design.html`): MSF renders as **narrative**
under three sub-heads (not a table); the critique borrows are **alternatives+falsifiable-hypothesis, pre-mortem, and
a conditional AI-risk surface** (Strategy/GTM/Pricing and the lightweight Stage cue are out); the wireframe hook
**offers `/wireframes` by default** (`/prototype` opt-in); and the epic splits into **two stories** (content → behaviour).

Coherence contract (INV-1..6, D1..D8, section-numbering map, story map) in `02_design.html`.

## Acceptance Criteria

- [ ] A PRD from `/artifact prd` carries a **§8 Motivation, Friction & Satisfaction** narrative section (three
  sub-heads) that substantively addresses the 24 `/msf-req` considerations, rendered as prose not a table (D1).
- [ ] **§6 Solution** requires a falsifiable if/then/because hypothesis (tied to the §5 primary metric) + 2–3
  alternatives considered (incl. do-nothing/buy) with rejection reasons; **§11 Risks** carries a pre-mortem and a
  conditional AI-risk surface (D2).
- [ ] **§5 Success Metrics** is organized under exactly Shreyas Doshi's six categories (Health, Usage, Adoption,
  Satisfaction, Ecosystem, Outcome — **no invented categories**), question-first (2–3 behaviour/outcome success
  questions per applicable category → proxy metrics), with KM/LM designation and ≥1 guardrail retained; skipped
  categories carry an explicit N/A rationale (D6, INV-3).
- [ ] **Every** user story in §9 carries ≥1 concrete, executable validation criterion — enforced by a high-severity
  eval item, not just guidance (D8).
- [ ] For a **user-facing** PRD, `/artifact`'s create flow offers to run `/wireframes` (default) or `/prototype` and
  back-links the output into §6; the stage degrades cleanly when not user-facing, as a subagent, headless, or at
  `brief` depth (D3, D7, INV-4).
- [ ] template.md ↔ eval.md keep §N 1:1 after the renumber (INV-2); both stories pass `skill-eval.md` (both halves)
  and the four hygiene lints; conform to `skill-patterns.md §A–§L` and repo `CLAUDE.md` conventions.
- [ ] Both stories ship in one pmos-toolkit release unit.

## Stories

- 260708-j79 — PRD template + eval content enhancements (MSF §8, §6 alternatives+hypothesis, §5 Doshi rework, §9
  per-story validation, §11 pre-mortem + AI-risk, renumber, `user_facing` flag). route: skill. No deps.
- 260708-9xh — conceptual-wireframes post-draft hook (Phase 3.6 in artifact/SKILL.md). route: skill. Depends on 260708-j79.
