---
schema_version: 1
id: 260708-j79
title: "PRD template + eval content enhancements — MSF §8 narrative, §6 alternatives+falsifiable-hypothesis, §5 Doshi-categorized question-first metrics, §9 mandated per-story validation, §11 pre-mortem + conditional AI-risk, section renumber, user_facing flag"
type: feature
kind: story
status: in-progress
route: skill
priority: should
labels: [pmos-toolkit, artifact, prd-template, skill]
claimed_by: build:832dec02-f66e-433b-bf4d-eeeb7db48e25
driver_holder: build:832dec02-f66e-433b-bf4d-eeeb7db48e25
worktree: /Users/maneeshdhabria/Desktop/Projects/agent-skills/.claude/worktrees/feat-260708-j79
created: 2026-07-08
updated: 2026-07-09
design_doc: docs/pmos/features/2026-07-08_artifact-prd-template-enhancements/02_design.html
feature_folder: docs/pmos/features/2026-07-08_artifact-prd-template-enhancements/
parent: 260708-esq
released:
dependencies: []
plan: docs/pmos/features/2026-07-08_artifact-prd-template-enhancements/stories/260708-j79/03_plan.html
---

## Context

Story 1 of epic 260708-esq. The **content** half: edits `plugins/pmos-toolkit/skills/artifact/templates/prd/template.md`
and its sibling `eval.md` only. No `SKILL.md` change (Story 260708-9xh owns the behaviour hook and depends on this
story for the `user_facing` frontmatter flag it adds). Grounds in `02_design.html` §5–§9, §11 and decisions D1, D2,
D5, D6, D8. Plan + task waves in the story `03_plan.html`.

Because this story changes no instruction surface, its `skill-eval` pass is trivial; the substantive verification is
a dogfood `/artifact prd` run producing a sample PRD that exercises every new section + eval item.

## Acceptance Criteria

- [ ] **Renumber (D5, INV-2).** MSF inserted as §8; §8–§14 → §9–§15 across template.md AND eval.md in lockstep;
  every `## §N` in template.md has a matching `## §N` in eval.md.
  *Validation:* diff the two section-header lists — identical set; any repo-external hardcoded PRD §-number
  reference found by grep is updated.
- [ ] **§8 MSF (D1, ask 1).** New section renders as narrative under three bold sub-heads (Motivation / Friction /
  Satisfaction); a guidance comment enumerates the 24 `/msf-req` considerations (7/11/6) as a coverage checklist;
  an explicit "narrative not a 24-row table" instruction is present.
  *Validation:* dogfood PRD's §8 is prose under the three sub-heads (no 24-row table); eval items
  `motivation-addressed`, `friction-addressed`, `satisfaction-addressed`, `msf-narrative-not-table`,
  `msf-grounded-in-segment` exist with the specified kinds/severities.
- [ ] **§6 alternatives + hypothesis (D2, ask 2a).** §6 requires a falsifiable if/then/because hypothesis tied to
  the §5 primary metric, and 2–3 alternatives (incl. do-nothing/buy) each with a rejection reason.
  *Validation:* eval items `falsifiable-hypothesis-present` (high) and `alternatives-considered` (high) exist; a
  dogfood §6 without a hypothesis is flagged by the reviewer.
- [ ] **§5 Doshi metrics (D6, INV-3, ask 3).** §5 organized under exactly the six Doshi categories (Health, Usage,
  Adoption, Satisfaction, Ecosystem, Outcome) — no invented categories; question-first (2–3 behaviour/outcome
  success questions per applicable category → proxy metrics with the retained full spec); skipped categories carry
  an explicit N/A rationale; 3–5 KMs + 3–5 LMs designated; ≥1 guardrail retained; tabular schema gains `Category`
  and `Answers question` columns.
  *Validation:* grep template §5 for all six category names and no 7th; eval items `metrics-doshi-categorized`
  (high), `metrics-question-first` (high), `km-lm-designated` (medium) exist; the retained metric items remain.
- [ ] **§9 mandated validation (D8, ask 5).** Every user story MUST carry ≥1 concrete, executable validation
  criterion (not a capability restatement); §9 tabular schema gains a "Validation / how we'll test it" column.
  *Validation:* eval item `every-story-has-testable-ac` (high) exists; a dogfood PRD with a story that has only a
  capability restatement is flagged by the reviewer loop.
- [ ] **§11 pre-mortem + AI-risk (D2, ask 2b/2c).** §11 (renumbered Risks) carries a pre-mortem (≥3 named failure
  modes, each with a leading indicator) and a conditional AI-risk block (behaviour contract + fallback + eval bar)
  that fires only for an AI/LLM feature and is marked N/A otherwise.
  *Validation:* eval items `premortem-present` (high) and `ai-risk-surface-when-applicable` (high, conditional)
  exist; a non-AI dogfood PRD marks the AI item N/A (not ABSENT) and forces no gap question.
- [ ] **Frontmatter (D7).** template.md frontmatter carries `user_facing: true` (read by Story 260708-9xh).
- [ ] **Backward compatibility (INV-5).** A pre-existing PRD still validates; new eval items are judgment-severity
  (surfaced by the reviewer, non-blocking) except the pre-existing baseline precondition.
- [ ] **Gates.** `skill-eval.md` (both halves) and the four hygiene lints pass (or any residual is proven
  pre-existing on pre-epic main); conforms to `skill-patterns.md §A–§L` + repo `CLAUDE.md`; no file touched outside
  `plugins/pmos-toolkit/skills/artifact/` except confirmed renumber hits.

## Notes

- Do the renumber first (plan Wave 0) so all additions land in final numbering.
- The 24 MSF considerations' canonical home stays `_shared/msf-heuristics.md`; the §8 guidance comment inlines them
  for author convenience and notes the citation to avoid an undocumented fork (§K).
