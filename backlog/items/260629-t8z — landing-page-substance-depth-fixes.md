---
released: 2.100.0
schema_version: 1
id: 260629-t8z
kind: story
parent: 260629-xrz
title: "/landing-page substance-depth fixes — per-product personas (D1), claim→show-surface mapping (D2), do>show>tell hard gate (D3), embed show-surface (D4), Phase-6 judgment checks (D5), dev-tool hero subhead (D6)"
type: enhancement
priority: should
route: skill
dependencies: []
plugin: pmos-toolkit
status: done
feature_folder: docs/pmos/features/2026-06-29_landing-page-substance-depth/
plan_doc: docs/pmos/features/2026-06-29_landing-page-substance-depth/stories/260629-t8z/03_plan.html
tasks: docs/pmos/features/2026-06-29_landing-page-substance-depth/stories/260629-t8z/tasks.yaml
worktree:
claimed_by:
driver_holder: build:b0c61220-0a97-4ab0-afcb-144a7c4df518
build_branch: feat/260629-t8z
build_commit: 24785f23
labels: [pmos-toolkit, landing-page, skill, from-feedback]
created: 2026-06-29
updated: 2026-07-01
---

<!-- status: planned at define (Loop 1); tasks.yaml authored, route:skill. Build via /skill-sdlc build --story 260629-t8z -->

## Context

The whole epic (260629-xrz) is one story: all six FRs revise the single `/landing-page` skill across four files —
`SKILL.md` (Phases 1/2/5/6) + `reference/multi-product.md` + `reference/section-scaffolds.md` +
`reference/copy-gates.md`. Decisions (D1–D6), FRs (FR-1..FR-6), finding→FR map, and invariants (INV-1..INV-5) live
in the `design_doc:` (`../../02_design.html`). No `_shared/` change, no script change, no new flag; the style
tokens, style gallery, hero archetypes, and media-strategy references are byte-unchanged. One `/execute` run — see
`tasks.yaml`.

## Acceptance Criteria

- [x] **AC1 (FR-1, D1)** `reference/multi-product.md` carries a per-product persona-derivation override: when
  `product_count: multi`, the global "1–2 personas" cap is overridden so **each detected product gets one primary
  persona** (with its own jargon tolerance + signature moments) in its own brief slice. `SKILL.md` Phase 1
  (`#research-brief`) step 5 emits **one brief slice per product** (persona + jargon + signature moments) and makes
  it a **precondition before Phase 2** — not a post-hoc note. The single-product path is unchanged (still 1–2
  personas).
- [x] **AC2 (FR-2, D2)** `SKILL.md` Phase 2 (`#propose-structure`) step 3 widens the show-surface map from "brief
  signature moments" to **every feature/value claim** the structure intends to make, and makes a complete map a
  **drafting precondition**: an unmapped claim must be demoted (cut) or explicitly flagged tell-only; drafting may
  not start with unmapped feature claims.
- [x] **AC3 (FR-3, D3)** `reference/copy-gates.md#show-ratio` is rewritten from advisory to a **HARD, asset-gated
  binary-presence gate**: a page that makes feature claims AND has ≥1 capturable/embeddable show-surface available
  MUST show ≥1 claimed feature — a page that tells all and shows none does **not emit**. The hardness is stated as a
  **binary presence** condition (no arithmetic ratio / no token count — §H-clean), with an explicit **N/A + logged**
  escape when no asset can exist. `SKILL.md` Phase 6 (`#self-review`) step 1 marks it a blocking gate (no longer
  "advisory: flag …").
- [x] **AC4 (FR-4, D4)** `reference/section-scaffolds.md#governing-principles` adds **"embed the real self-contained
  artifact (iframe, page-folder-relative)"** as the top "do" rung of the do>show>tell ladder, documenting the
  **load-on-open** pattern (`<details>` + a `data-src` that swaps into the iframe `src` on first open) and the
  **page-folder-relative / `file://` / never-remote** constraint (honours the page's self-contained rule). `SKILL.md`
  Phase 2 step 3 and Phase 5 (`#draft`) step 3 cross-reference it as the strongest show-surface.
- [x] **AC5 (FR-5, D5)** `reference/copy-gates.md` gains two new checks: a **value-coverage** section (HARD
  structural for multi-product — the hero/overview fold must name each detected product with a distinct value line,
  else block) and an **asset-claim-match** section (ADVISORY judgment — each embedded visual must depict what its
  caption names; surfaced loudly, never silent, does not block — §H, needs vision). `SKILL.md` Phase 6 step 2 wires
  both into the visual self-check reviewer pass.
- [x] **AC6 (FR-6, D6)** `reference/copy-gates.md` clarity/headline rules carry a **dev-tool hero-subhead rule**:
  when `product_type` is a dev tool, the hero **subhead** must name the buyer (persona) and the category explicitly
  in the headline region — the disambiguator may not be deferred to body copy. `SKILL.md` Phase 6 step 1 enforces it
  as a presence check.
- [x] **AC7 (conformance)** `reference/style-tokens.json`, `reference/style-tokens.md`,
  `reference/style-gallery.html`, `reference/hero-archetypes.md`, and `reference/media-strategy.md` are
  byte-unchanged (INV-1); no `_shared/` change, no script change (INV-1); `argument-hint` unchanged, no new flag,
  `user-invocable: true` preserved (INV-2); the two new hard gates ride binary-presence/structural conditions with
  no arithmetic ratio anywhere, and asset-claim-match stays advisory (INV-3); the new embed rung stays
  page-folder-relative / file://-openable / never-remote (INV-4); phase anchors (`#research-brief`,
  `#propose-structure`, `#draft`, `#self-review`) and reference anchors (`#governing-principles`, `#show-ratio`)
  resolve (INV-5); `skill-eval-check.sh` `[D]` passes for target `claude-code`; the repo lints
  (`lint-flags-vs-hints.sh`, `lint-phase-refs.sh`, `lint-non-interactive-inline.sh`) and `audit-recommended.sh` are
  green.

**Standing AC** — the revised skill conforms to `reference/skill-patterns.md §A–§L` (one-fact-one-home: each fix in
its canonical reference home, SKILL.md cites not restates; §H: deterministic = hard, judgment = advisory, never
model-arithmetic) and the binary `reference/skill-eval.md` rubric (cited as acceptance criteria).

## Build outcome (Loop 2, 2026-06-30)

Built unattended via `/feature-sdlc build` (route:skill inner pipeline). All 6 FRs landed across the four
`/landing-page` files — `SKILL.md` (Phases 1/2/5/6), `reference/multi-product.md`, `reference/section-scaffolds.md`,
`reference/copy-gates.md`. impl commit `24785f23` on `feat/260629-t8z`.

- **skill-eval `[D]`** EXIT 0 / 0 fails (target `claude-code`).
- **`[J]` judge** VERDICT PASS — 0 blockers, all 7 ACs met; 2 cosmetic nits (one fixed: dev-tool rule got its
  own `#dev-tool-hero-subhead` anchor; the other within §K tolerance, left).
- **Lints + audit** all green: `lint-flags-vs-hints`, `lint-phase-refs`, `lint-non-interactive-inline`,
  `audit-recommended` (5 calls / 5 Recommended).
- **INV-1** 5 references + `_shared/` + `scripts/` byte-frozen; **INV-2** argument-hint/flags unchanged,
  `user-invocable: true`; **INV-3** no arithmetic ratio (both HARD gates binary-presence/structural,
  asset-claim-match advisory); **INV-4** embed rung page-folder-relative / `file://` / never-remote;
  **INV-5** all phase + reference anchors resolve.

Worktree `feat/260629-t8z` KEPT (not merged to main — release is Loop-3 `/complete-dev --epic 260629-xrz`).
