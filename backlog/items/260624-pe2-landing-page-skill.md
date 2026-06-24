---
schema_version: 1
id: 260624-pe2
kind: story
parent: 260624-ajy
title: "/landing-page SKILL.md — six-phase guided workflow (research+brief → propose-structure → hero-explore → style-pick → draft → visual self-review), per-page folder output, opt-in web research, non-interactive contract, skill-eval"
type: feature
priority: should
route: skill
dependencies: [260624-dqg]
plugin: pmos-toolkit
status: planned
feature_folder: docs/pmos/features/2026-06-24_landing-page/
plan_doc: docs/pmos/features/2026-06-24_landing-page/stories/260624-pe2/03_plan.md
tasks: docs/pmos/features/2026-06-24_landing-page/stories/260624-pe2/tasks.yaml
worktree:
claimed_by:
driver_holder:
labels: [pmos-toolkit, landing-page, skill, new-skill]
created: 2026-06-24
updated: 2026-06-24
---

## Story

Author the `/landing-page` SKILL.md (and its frontmatter) at
`plugins/pmos-toolkit/skills/landing-page/SKILL.md`, implementing the six-phase guided workflow from
`02_design.html` and consuming Story 260624-dqg's bundled style system + references. The skill is the sole
writer of `SKILL.md`; it cites the bundled references rather than restating them.

Scope is fixed by `02_design.html` §2 (workflow), §6 (output contract), §7 (copy + visual gates), §8 (research &
brief). Cites `design_doc:` anchors `#workflow`, `#hero-fold`, `#style-system`, `#output`, `#copy-gates`,
`#ingestion`.

## Acceptance criteria

1. **Frontmatter** — single-line quoted `description:` with rich triggers ("create a landing page", "build a
   landing page for my product", "marketing page", "/landing-page"); `name: landing-page` matches the directory;
   passes `skill-patterns.md §A–§L` and the repo CLAUDE.md skill conventions (canonical path, etc.).
2. **Six integer phases with stable `{#kebab-slug}` anchors** implementing §2: (1) research+brief, (2)
   propose-structure [always propose+approve, D4], (3) hero-explore [2–3 rendered options, D2], (4) style-pick
   [bundled gallery, D1], (5) draft, (6) self-review. Each cites the relevant bundled reference + design_doc anchor.
3. **Phase 1 research & brief (§8, D9)** — accepts local repo / GitHub URL / doc / description; researches
   provided context; writes a cited `brief.md` + extracts source into `reference/`; confirms with user; web fetch
   is **opt-in, default off** (only on user-named references/approval); missing fields asked, never invented (D6).
4. **Per-page folder output (§6, D8)** — emits `{docs_path}/landing-page/<date>-<title-slug>/` containing
   `brief.md`, `index.html` (the single self-contained inline-CSS/vanilla-JS page — no CDN, D3), `reference/`,
   `working/hero-options.html`. `index.html` carries the inline pmos-comments block + `pmos:skill=landing-page`
   meta. Placeholders for missing assets are clearly labelled (D6).
5. **Phase 6 gates (§7)** — applies the copy/conversion gates (cites `reference/copy-gates.md`) AND the visual
   self-check (D10): render `index.html` headless, screenshot desktop+mobile into `working/`, reviewer ≤2-loop
   fixes issues; graceful text-gate + structural-HTML fallback when no headless browser (logged, never silent).
6. **Required skill scaffolding** — Track Progress, Platform Adaptation, the inline non-interactive block
   (byte-identical to `_shared/non-interactive.md`), learnings load-line, a literal `## Phase N: … Capture
   Learnings` section. Non-interactive run AUTO-PICKs the 3 gate defaults (product-type-driven, D5) + logs OQs.
7. **Gates green** — `skill-eval` [D]+[J] pass (or accepted residuals), 4 hygiene lints + audit-recommended pass,
   non-interactive lint passes (inline block byte-match). Load-bearing dogfood: run the skill end-to-end on a real
   product (e.g. this repo) and confirm a styled, gate-passing `index.html` + cited `brief.md` land in the folder.

## Notes

Depends on 260624-dqg (the style tokens, gallery, and reference files must exist in the worktree before this
story's skill-eval — D9 claim-time dep-merge). File-disjoint: this story writes only `SKILL.md`.
