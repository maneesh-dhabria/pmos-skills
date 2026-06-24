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
status: done
feature_folder: docs/pmos/features/2026-06-24_landing-page/
plan_doc: docs/pmos/features/2026-06-24_landing-page/stories/260624-pe2/03_plan.md
tasks: docs/pmos/features/2026-06-24_landing-page/stories/260624-pe2/tasks.yaml
worktree: .claude/worktrees/feat-260624-pe2
claimed_by:
driver_holder: build:360c93c8-71d2-4f84-a4b4-db50aec1d4f9
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
   non-interactive lint passes (inline block byte-match). **Load-bearing dogfood — target the pmos-skills repo
   itself:** run `/landing-page` end-to-end against THIS repo (the agent-skills / pmos-skills plugin marketplace as
   the "product") through all six phases, and confirm a styled, gate-passing `index.html` + cited `brief.md` land in
   the per-page folder. Then **iterate** on the produced page (re-run the §7 copy gates + Phase-6 visual self-check,
   refine hero / sections / style) until it ships clean. Commit the produced folder under `{docs_path}/landing-page/`
   as dogfood evidence.

## Notes

Depends on 260624-dqg (the style tokens, gallery, and reference files must exist in the worktree before this
story's skill-eval — D9 claim-time dep-merge). File-disjoint: this story writes only `SKILL.md`.

### Build verdict — 2026-06-24 (Loop 2, branch `feat/260624-pe2`, kept for Loop 3)

**SATISFIED — all 7 ACs met.** Authored `plugins/pmos-toolkit/skills/landing-page/SKILL.md` (289 lines):
the six-phase guided workflow (Phase 1 `#research-brief` → 2 `#propose-structure` → 3 `#hero-explore` → 4
`#style-pick` → 5 `#draft` → 6 `#self-review`, + Phase 0 setup + Phase 7 `#capture-learnings`). Cites the
dqg substrate (`reference/{section-scaffolds,hero-archetypes,copy-gates,style-tokens}.md|json`,
`style-gallery.html`) — does not restate (one fact, one home). Frontmatter triggers ("create a landing
page" / "build a landing page for my product" / "marketing page" / "/landing-page"); `argument-hint`
contract-flags-only (`--docs-path`, `--non-interactive`); web-research toggle `nl-sugar`-marked. NI block
inlined byte-identical; 3 `AskUserQuestion` gates all `(Recommended)`-marked (product-type-driven AUTO-PICK,
D5); brief-confirm `defer-only: free-form`.

**Gates (in `feat/260624-pe2`, dqg dep-merged):** skill-eval [D] 20/20 `pass`, 0 `fail`, EXIT 0 (no
residuals); `lint-flags-vs-hints` PASS; `lint-phase-refs` PASS; `audit-recommended` PASS (3 calls / 3
Recommended); `lint-non-interactive-inline` PASS (53/53 canonical); dqg `selftest.mjs` 200/200.

**Load-bearing dogfood (AC7) — TARGET = the pmos-skills repo itself:** ran `/landing-page` end-to-end
against THIS marketplace → `docs/pmos/landing-page/2026-06-24-pmos-skills/` with cited `brief.md` (product
_type Dev tool, 0 invented facts) + self-contained `index.html` (dark-developer-tool tokens bound,
dev-tool scaffold, product-as-demo terminal hero, single first-person CTA "Install the marketplace",
real in-repo proof counts + D6 labelled placeholders, inline pmos-comments block + `pmos:skill` meta) +
`working/` (hero-options.html, desktop+mobile renders, self-review.md). Phase-6 self-review: copy gates +
visual self-check (served on localhost — `file://` blocked in MCP) PASS; structural gate 17/17.
**Iterated** once (a11y/SEO: `<meta name=description>`, `:focus-visible`, `prefers-reduced-motion`) — no
visual regression, gates still green; reviewer SHIP. Inverted dqg's transient "no SKILL.md" selftest guard
to assert SKILL.md present (long-lived invariant now that substrate + consumer ship together).

**EPIC 260624-ajy NOW FULLY BUILT** (dqg + pe2) → next Loop 3: `/complete-dev --epic 260624-ajy`. Release
prerequisites (version bump, changelog, README row, manifest sync) deferred to that release.
