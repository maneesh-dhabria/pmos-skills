---
schema_version: 1
id: 260708-9xh
title: "Conceptual-wireframes post-draft hook in /artifact — depth-gated Phase 3.6 offering /wireframes (default) or /prototype for a user-facing PRD, back-linking the output into §6, with subagent / non-interactive / brief / not-user-facing degradations"
type: feature
kind: story
status: done
route: skill
priority: should
labels: [pmos-toolkit, artifact, prd-template, skill, wireframes]
claimed_by: null
driver_holder: null
worktree: /Users/maneeshdhabria/Desktop/Projects/agent-skills/.claude/worktrees/feat-260708-9xh
created: 2026-07-08
updated: 2026-07-09
design_doc: docs/pmos/features/2026-07-08_artifact-prd-template-enhancements/02_design.html
feature_folder: docs/pmos/features/2026-07-08_artifact-prd-template-enhancements/
parent: 260708-esq
released:
dependencies: [260708-j79]
plan: docs/pmos/features/2026-07-08_artifact-prd-template-enhancements/stories/260708-9xh/03_plan.html
---

## Context

Story 2 of epic 260708-esq. The **behaviour** half: adds a new depth-gated post-draft stage — **Phase 3.6:
Conceptual wireframes** — to `plugins/pmos-toolkit/skills/artifact/SKILL.md`, modelled on the existing post-draft
child-skill stages (3.5 persona, 3.7 diagram, 3.8 /polish, 3.9 /grill). Grounds in `02_design.html` §10 (D3, D7,
INV-4). Plan + task waves in the story `03_plan.html`.

**Depends on 260708-j79** — reads the `user_facing: true` frontmatter flag Story 1 adds and back-links into Story 1's
enhanced §6. At build time the dependency merges into this story's worktree first, so the flag is present.

Because this story changes the SKILL.md instruction surface, `skill-eval` (both halves) is a real gate here.

## Acceptance Criteria

- [ ] **Phase 3.6 exists** in artifact/SKILL.md between 3.5 and 3.7, with a stable `{#wireframe-pass}` anchor.
  *Validation:* `lint-phase-refs.sh` resolves the anchor and any cross-refs; the create-flow ordering note reads
  "persona → conceptual wireframes → diagram → /polish → /grill".
- [ ] **Full firing gate.** 3.6 runs only when ALL hold: template frontmatter `user_facing: true`; `{depth} ∈
  {standard, deep}`; the deterministic frontend detector (reused `feature-sdlc/reference/frontend-detection.md`) is
  positive on the drafted §2/§6/§7; and no wireframe/prototype is already linked in §6.
  *Validation:* dogfood — a user-facing standard-depth PRD fires the gate; a non-user-facing draft, a `brief`-depth
  run, and an already-linked §6 each skip silently with a one-line logged reason.
- [ ] **Offer, don't force (D3).** The interactive prompt offers *Run /wireframes (Recommended)* / Run /prototype /
  Skip; on Run the main agent invokes the chosen child skill with the drafted PRD as context.
  *Validation:* the prompt has a `(Recommended)` option; `audit-recommended.sh` (SKILL.md file arg) classifies it.
- [ ] **Back-link (D3).** On Run, the emitted wireframe/prototype path replaces the §6 "wireframe … or TBD"
  placeholder and `{slug}.sections.json` is re-emitted.
  *Validation:* dogfood §6 carries the real path post-run; sections.json regenerated.
- [ ] **Degradations, never hard-fail (INV-4).** Subagent → skip-with-note (`<!-- pmos:deferred-pass: wireframes -->`
  + chat line), same contract as 3.7–3.9; `--non-interactive` → Recommended = Skip (AUTO-PICK Skip, buffer an OQ);
  not-user-facing / already-linked / detector-negative / `brief` depth → silent skip with a logged reason.
  *Validation:* a `--non-interactive` dogfood run AUTO-PICKs Skip and buffers the OQ; a subagent-dispatched run emits
  the deferred-pass note; no path hard-fails.
- [ ] **Contract compliance.** The frozen non-interactive block stays byte-identical; the `## Platform Adaptation`
  subagent-skip bullet lists 3.6 alongside 3.7/3.8/3.9; `#load-context` depth "drives:" list and `## Track Progress`
  mention 3.6. §K: cite `frontend-detection.md` + the subagent-skip contract, don't restate them.
- [ ] **Gates.** `skill-eval.md` (both halves) + the four hygiene lints pass (or residual proven pre-existing on
  pre-epic main); conforms to `skill-patterns.md §A–§L` + repo `CLAUDE.md`; only `artifact/SKILL.md` touched (+ a
  README row if warranted).

## Notes

- 3.6 sits before 3.7 so the diagram/polish passes can reference the freshly-linked wireframe.
- Reuse over fork: the subagent-skip and non-interactive contracts already exist in this SKILL.md — 3.6 cites the
  same `## Platform Adaptation` bullet (§K).
