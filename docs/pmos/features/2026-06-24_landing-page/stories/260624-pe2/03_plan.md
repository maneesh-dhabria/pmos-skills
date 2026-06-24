# 03 — Plan: Story 260624-pe2 — /landing-page SKILL.md

## Overview

Author the `/landing-page` SKILL.md at `plugins/pmos-toolkit/skills/landing-page/SKILL.md` — the **only**
file this story writes — implementing the six-phase guided workflow from the epic design doc
(`docs/pmos/features/2026-06-24_landing-page/02_design.html`): §2 `#workflow`, §4 `#hero-fold`, §5
`#style-system`, §6 `#output`, §7 `#copy-gates`, §8 `#ingestion`.

This is Story **B** of the epic (D7). It **depends on Story 260624-dqg** (D9 claim-time dep-merge), whose
bundled `reference/style-tokens`, `reference/style-gallery.html`, `reference/section-scaffolds.md`,
`reference/hero-archetypes.md`, `reference/copy-gates.md`, and `tests/` already exist in the worktree. The
SKILL **cites** those references and never restates them (§K one-fact-one-home) — that citation discipline
is also how the body stays under the 800-line `c-body-size` cap.

Implementation reference: `skill-patterns.md §A–§L`. Eval rubric: `skill-eval.md` ([D] hard gates + [J]
judgment). Host policy: `CLAUDE.md` (canonical skill path; byte-identical inline non-interactive block;
audit-recommended; hygiene lints).

## Tasks (mirror tasks.yaml)

- **T1** — Study: design anchors §2/§4/§5/§6/§7/§8 + D1–D10; dqg's bundled `reference/` paths+anchors;
  `skill-patterns.md §A–§L` + the gated `skill-eval.md` check list; the inline NI block source; a shipped
  authoring exemplar (`/wireframes`/`/prototype`) for Track Progress / Platform Adaptation / D10 loop.
- **T2** — Frontmatter + skeleton (AC1, AC6): `name: landing-page`, single-line quoted `description:` with
  the 4 trigger phrases, `argument-hint` = contract flags only (`--non-interactive`, `--docs-path`), learnings
  load-line, `## Track Progress`, `## Platform Adaptation`.
- **T3** — Phases 1–3 (AC2, AC3): `{#research-brief}` (research + cited brief.md + reference/ extraction +
  confirm; web-fetch opt-in default off D9; never-invent D6), `{#propose-structure}` (always propose+approve
  D4, cites section-scaffolds.md), `{#hero-explore}` (2–3 rendered options to working/hero-options.html D2,
  cites hero-archetypes.md).
- **T4** — Phases 4–6 (AC2, AC4, AC5): `{#style-pick}` (open style-gallery.html, bind tokens, D1),
  `{#draft}` (per-page folder D8; self-contained no-CDN index.html D3 with inline pmos-comments +
  pmos:skill meta + labelled placeholders D6), `{#self-review}` (cite copy-gates.md §7; D10 headless
  screenshot reviewer ≤2-loop + logged text-gate fallback). Parallel with T3 (disjoint phase blocks, same file).
- **T5** — Required scaffolding (AC6): inline NI block byte-identical to `_shared/non-interactive.md`;
  `--non-interactive` AUTO-PICK of the 3 gate defaults from `product_type` (D5) + OQ logging; literal
  `## Phase N: ... Capture Learnings`; body < 800 lines via reference citation.
- **T6** — Gates + dogfood (AC7): skill-eval [D] all-pass + [J] >= floor; 4 hygiene lints +
  audit-recommended + NI lint green; load-bearing end-to-end run on a real product producing a per-page
  folder with a cited brief.md and a styled gate-passing index.html; Verdict recorded.

## Decisions / risks

- **Headless-render dependency + fallback (D10).** Phase 6 renders `index.html` with Playwright (desktop +
  mobile screenshots, reviewer ≤2-loop, same pattern as `/wireframes`/`/prototype`). Risk: no headless
  browser on the host. Mitigation per design §7 — degrade to the text gates + a structural-HTML check and
  **log** the skipped visual pass (never silent). This is also called out in `## Platform Adaptation`.
- **Staying under the 800-line `c-body-size` cap.** The skill body is workflow + gate orchestration only;
  all heavy domain content (6 styles, 4 archetypes, section taxonomy, the copy-gate checklists) lives in
  dqg's bundled `reference/` files and is **cited by relative path** (§K, c-progressive-disclosure). The
  body never restates them.
- **Non-interactive product-type-default mapping (D5).** The three hard gates branch deterministically on
  the brief's `product_type`: scaffold variant (§3) → `--non-interactive` structure default; best-fit hero
  archetype (§4) → hero default; best-fit style (§5) → style default. Each auto-pick + open question is
  logged per the W14 contract. Every interactive `AskUserQuestion` carries a `(Recommended)` option
  (audit-recommended).
- **Proof honesty (D6).** Missing assets emit clearly-labelled placeholders; the §7 falsifiability gate
  forbids fabricated metrics/quotes/logos. Phase 1 asks for missing fields, never invents.
- **Dep presence (D9).** dqg's `reference/` + `tests/` must be present in the worktree before this story's
  skill-eval (claim-time dep-merge); `lint-phase-refs` will flag any dangling cite if they are not.

## Release prerequisites (handled by /complete-dev, NOT this story)

This story performs **no** version bump, changelog entry, README-row, or manifest-sync work. Per repo
policy those are owned solely by `/complete-dev` (Loop 3): bump `plugins/pmos-toolkit/.claude-plugin/plugin.json`
and `.codex-plugin/plugin.json` (same version), regenerate the changelog, and tag `pmos-toolkit/v<semver>`.
T6 enumerates any deferred-to-release checks for it.

## Final verification checklist

- [ ] `plugins/pmos-toolkit/skills/landing-page/SKILL.md` is the only file changed by this story.
- [ ] Frontmatter: `name: landing-page` matches dir; single-line quoted `description:` with all 4 triggers;
      `argument-hint` = contract flags only (a-name-matches-dir, b-desc-trigger-phrases, i-hint-contract-only,
      f-cc-argument-hint-matches, f-cc-user-invocable).
- [ ] Six integer phases with `{#research-brief}` `{#propose-structure}` `{#hero-explore}` `{#style-pick}`
      `{#draft}` `{#self-review}` anchors, each citing a design anchor + a dqg reference (j-phases-integer,
      j-phase-slug-anchors).
- [ ] Phase 1 writes a source-cited brief.md + reference/ extraction, confirms with user, web-fetch opt-in
      default off (D9), never-invent (D6).
- [ ] Phase 5 emits the D8 per-page folder with a self-contained no-CDN index.html (D3) carrying inline
      pmos-comments + `pmos:skill=landing-page` meta + labelled placeholders.
- [ ] Phase 6 cites copy-gates.md, applies the gates, runs the headless screenshot reviewer ≤2-loop, logs a
      text-gate fallback when no browser (D10).
- [ ] Track Progress, Platform Adaptation, learnings load-line, byte-identical inline NI block, literal
      `## Phase N: ... Capture Learnings` (d-progress-tracking, d-platform-adaptation, d-learnings-load-line,
      d-capture-learnings-phase).
- [ ] `--non-interactive` AUTO-PICKs the 3 gate defaults by product_type (D5) + logs OQs; every prompt has a
      `(Recommended)` option.
- [ ] skill-eval [D] all-pass + [J] >= floor; lint-flags-vs-hints, lint-phase-refs, lint-non-interactive-inline,
      audit-recommended all green; body < 800 lines (c-body-size).
- [ ] Load-bearing dogfood produced a styled, gate-passing index.html + cited brief.md in a real per-page folder.
- [ ] No release-prereq work performed (left to /complete-dev).
