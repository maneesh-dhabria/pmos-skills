---
schema_version: 1
id: 260709-v3z
title: "§2 Problem-framing blocks in the PRD template — fold a How-Might-We reframe + a WAYRTTD assumed-solution gut-check into §2 (template.md + mirrored eval.md), no renumber, no skill/SKILL.md change"
type: feature
kind: story
status: planned
route: skill
priority: should
labels: [pmos-toolkit, artifact, prd-template, skill, problem-framing]
created: 2026-07-09
updated: 2026-07-09
design_doc: docs/pmos/features/2026-07-08_artifact-prd-template-enhancements/02_design.html
feature_folder: docs/pmos/features/2026-07-08_artifact-prd-template-enhancements/
parent: 260708-esq
released:
dependencies: [260708-j79]
plan: docs/pmos/features/2026-07-08_artifact-prd-template-enhancements/stories/260709-v3z/03_plan.html
---

## Context

Story 3 of epic 260708-esq (added 2026-07-09, "ask 6"). A **content-only** enhancement to the PRD template that
makes explicit *problem-framing* a first-class part of §2. Grounds in `02_design.html` §14 (`#design-framing`).

**Scope is entirely inside `/artifact`:** edits `plugins/pmos-toolkit/skills/artifact/templates/prd/template.md`
and its mirror `templates/prd/eval.md` **only**. **No change to `/shape`, `/wayrttd`, or any referenced skill** —
the two disciplines already live upstream (`/shape` FRAME does HMW + JTBD; `/wayrttd` does the assumed-solution
inversion); this story carries the same *thinking* into the PRD as authored template prose/prompts, never invoking
those skills.

**Placement — fold into §2, no renumber (D10).** The two blocks fold into the existing §2 "Problem & Customer"
(retitled "§2 Problem, Customer & Framing"), which already carries `segment-and-jtbd`. **No section is inserted**, so
§3–§15 keep their post-j79 numbers — critically, story 260708-9xh's §6 back-link is untouched.

**Depends on 260708-j79** (HARD) — this story edits the same two files and must build on the post-j79 renumbered
§1–§15 base, not stale main. At build time the dep merges into this story's worktree first (D9), so the renumbered
§2 is present. **Not blocked by 260708-9xh:** 9xh touches `artifact/SKILL.md` + a §6 back-link, this touches §2 —
disjoint regions, clean parallel merge off j79 (Loop-3 proves the disjoint-region merge).

Because this story changes no instruction surface (SKILL.md untouched), `skill-eval` passes trivially; the real
quality gate is the template's own `eval.md` checks + a dogfood `/artifact prd` run.

## Acceptance Criteria

- [ ] **HMW block in §2.** A PRD from `/artifact prd` §2 carries a **"How Might We"** sub-head prompting 1–3 HMW
  reframes of the problem that open a solution space without naming a solution.
  *Validation:* dogfood a user-facing PRD → §2 renders a "How might we…" sub-head with ≥1 well-formed HMW; a HMW that
  names a feature/mechanism trips the new `hmw-present` eval check.
- [ ] **WAYRTTD gut-check block in §2.** §2 carries a **"What are you really trying to do?"** sub-head prompting the
  three-step note — assumed solution → climb to real goal → re-test — with a proceed/reconsider/pivot verdict, as one
  compact paragraph (not a multi-turn exercise).
  *Validation:* dogfood §2 renders the gut-check with a verdict; a missing or solution-restating gut-check trips the
  new `wayrttd-gutcheck` eval check.
- [ ] **JTBD retained.** The existing `segment-and-jtbd` requirement stays in §2 unchanged; the two new blocks sit
  beside it.
  *Validation:* `segment-and-jtbd` still present in eval.md; dogfood §2 still names a segment + JTBD.
- [ ] **No renumber (D10, INV-2).** No PRD section is inserted or renumbered — §2 is *augmented in place*, every other
  §N (incl. §6, §8, §9) keeps its post-j79 number; template.md ↔ eval.md stay §N 1:1.
  *Validation:* `git diff` on template.md shows only §2 additions (no `## §N` heading text changed for N≥3); the
  eval.md "every eval §N has a matching template §N" backstop passes.
- [ ] **Eval mirror.** `eval.md` gains `hmw-present` (judgment, medium) and `wayrttd-gutcheck` (judgment, medium)
  under §2, in the existing eval item schema (id / kind / severity / check).
  *Validation:* both ids present with correct `kind: judgment`; the eval file parses.
- [ ] **Lite variant / length (INV-6).** Both blocks carry compact lite variants (a single HMW line + a two-sentence
  WAYRTTD note) so the lite PRD set stays reasonable; guidance comments match the §8-MSF / §6-alternatives voice.
  *Validation:* the lite section set renders the compact variants; template length growth is bounded.
- [ ] **Gates.** `skill-eval.md` (both halves — trivial pass, SKILL.md unchanged) + the four hygiene lints pass (or
  residual proven pre-existing on pre-epic main); only `templates/prd/{template.md, eval.md}` touched (+ a README row
  only if warranted); conforms to `skill-patterns.md §A–§L` + repo `CLAUDE.md`.
  *Validation:* `skill-eval-check.sh --target claude-code <artifact dir>` clean/pre-existing; four lints green; diff
  scoped to the two template files.

## Notes

- Fold-not-insert is the whole point: a standalone §2.5 would renumber §3–§15 and break 9xh's §6 back-link.
- Reuse over restate (§K): the guidance comments *reference* that `/shape` and `/wayrttd` do these disciplines live
  upstream (so an author who already shaped can paste the frame) — they do not restate those skills' logic.
- Data-only story: the substantive verification is a dogfood `/artifact prd` smoke + the two new eval checks, same
  stance as sibling 260708-j79.
