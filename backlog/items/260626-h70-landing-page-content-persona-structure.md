---
schema_version: 1
id: 260626-h70
kind: story
title: "/landing-page — content, persona & structure"
type: enhancement
priority: should
status: released
route: skill
parent: 260626-7s4
dependencies: []
worktree:
build_branch: feat/260626-h70
build_commit: 120d7904
plan_doc: docs/pmos/features/2026-06-26_landing-page-enhancements/stories/260626-h70-content-persona-structure/03_plan.html
tasks_file: docs/pmos/features/2026-06-26_landing-page-enhancements/stories/260626-h70-content-persona-structure/tasks.yaml
claimed_by:
driver_holder:
pr:
labels: [landing-page, pmos-toolkit, skill, content]
created: 2026-06-26
updated: 2026-06-27
---

## Context

The content/structure half of epic `260626-7s4`. Touches the upstream brief + structure phases of
`/landing-page`: narrow the persona, make do>show>tell a stated principle, add a "who this is for / not for"
section, dedup proof, offer ≥3 structure variants, handle multi-product repos, and bake the attribution
footer.

Epic design (cite by anchor, do not restate): `docs/pmos/features/2026-06-26_landing-page-enhancements/02_design.html`
— decisions D1 (do>show>tell principle), D2 (persona), D3 (sections + dedup), D4 (variants), D9 (multi-product),
D11 (footer). Constraints C1–C5.

Acceptance criteria are the standing skill contract: the revised skill must conform to
`plugins/pmos-toolkit/skills/feature-sdlc/reference/skill-patterns.md §A–§L` and pass `skill-eval.md`.

## Acceptance Criteria

- [ ] Brief (Phase 1) selects 1–2 personas, each with a jargon-tolerance (novice/fluent); unknowns asked, never invented (D2)
- [ ] Brief captures a "signature moments to demonstrate" field (2–4 product moments worth showing) (D1)
- [ ] do>show>tell stated as a governing principle in SKILL.md + `section-scaffolds.md`, alongside the governing equation (D1)
- [ ] `section-scaffolds.md` gains a "Who this is for / not for" row with product-type placement (D3)
- [ ] Phase 2 runs a coherence/dedup pass: below-hero proof omitted when the hero caption already carries it; no section restates the hero value prop (D3)
- [ ] Phase 2 proposes ≥3 distinct structure variants (order/framing/copy-length) with one-line summaries + a recommended default; gate AUTO-PICKs recommended non-interactively (D4)
- [ ] New `reference/multi-product.md`: detection heuristic (monorepo apps / multi-skill plugin) + 3 organizing principles (suite page / product-index / single-focus); Phase 1 detects, Phase 2 applies per-product sections; non-interactive default = single-focus + OQ (D9)
- [ ] `copy-gates.md` gains a persona-jargon rule (novice persona → undefined domain jargon rejected/defined) and a do>show>tell show-ratio check (D1, D2)
- [ ] Phase 5 bakes a "Built with pmos-toolkit" + repo-link footer into every emitted page (`{{repo_url}}` convention) (D11)
- [ ] Output stays single self-contained `file://` HTML (C1); no rule duplicated between body and reference (C2); no fabricated proof (C3); new gates non-interactive-safe (C4)
- [ ] Conforms to `skill-patterns.md §A–§L`; passes `skill-eval.md` (flags-vs-hints, phase-refs, non-interactive inline block, audit-recommended) (C5)

## Notes

`/plan` scoped by (design_doc anchors D1/D2/D3/D4/D9/D11 + these ACs). `tasks.yaml :: spec:` → `../../02_design.html`.

## Build outcome (Loop 2, 2026-06-27)

BUILT on `feat/260626-h70` (impl commit `120d7904`, worktree kept). route:skill inner pipeline
(skill-tier-resolve T2 → execute → skill-eval → verify). Story A of epic 260626-7s4 (unblocks qrm).
Procedure-only skill revision — edits the upstream brief + structure phases of `/landing-page`; one fact,
one home (rules land in `reference/*`, SKILL.md body cites them).

- **Phase 1 (`#research-brief`)** — brief now selects **1–2 personas** each with a jargon tolerance
  (novice/fluent) [AC1] + captures a **signature moments to demonstrate** field [AC2]; detects
  single-vs-multi-product [AC7].
- **`section-scaffolds.md`** — **do>show>tell** elevated to a governing principle beside the governing
  equation [AC3], cited from Phase 2/5; new **"Who this is for / not for"** row → 11→12-row taxonomy with
  product-type placement + count refs updated [AC4]; dedup note (D3).
- **Phase 2 (`#propose-structure`)** — coherence/**dedup pass** (omit below-hero proof when the hero caption
  carries it; no value-prop restatement) [AC5] + **≥3 distinct structure variants** with a Recommended
  default that AUTO-PICKs non-interactively [AC6]; signature-moments → show-surface mapping.
- **new `reference/multi-product.md`** — detection heuristic + 3 organizing principles (suite / hub /
  single-focus); Phase 1 detects, Phase 2 applies; non-interactive default = single-focus + OQ [AC7].
- **`copy-gates.md`** — **persona-jargon rule** (novice persona rejects undefined domain jargon) +
  **do>show>tell show-ratio** (advisory, §H — not arithmetic) [AC8], both cited from Phase 6.
- **Phase 5 (`#draft`)** — **"Built with pmos-toolkit"** footer baked into every emitted page via the
  `{{repo_url}}` token (default `github.com/maneesh-dhabria/pmos-skills`, the shared wordmark token);
  additive, self-contained preserved [AC9].

Gates: landing-page **selftest 200/0**; skill-eval `--target claude-code` **[D] 21/21 EXIT0** (zero residuals
— landing-page already conformed); 4 hygiene lints + audit-recommended all PASS (audit: 3 gate calls, all
Recommended); every new anchor (`#governing-principles`, `#persona-jargon-rule`, `#show-ratio`,
multi-product anchors) resolves; no orphaned cites; no rule duplicated body-vs-reference (C2). All 11 ACs
satisfied [AC10/AC11]. 0 new deps; no contract flags added (new behavior is gate-driven, argument-hint
unchanged).

Epic 260626-7s4: **1/2 built** (h70 done; **qrm** now unblocked — visual/media/assets half, D5/D6/D7/D8/D10).
