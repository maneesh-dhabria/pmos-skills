---
schema_version: 1
id: 260617-4w1
kind: epic
title: "/frameworks corpus expansion + re-found on direct authoring (ingest 74-framework batch; remove Notion sync; ship the research process)"
type: feature
status: released
priority: should
labels: [pmos-learnkit, frameworks, corpus]
route: skill
created: 2026-06-17
updated: 2026-06-18
defined: 2026-06-17
source: docs/pmos/features/2026-06-17_frameworks-corpus-expansion/02_design.html
feature_folder: docs/pmos/features/2026-06-17_frameworks-corpus-expansion/
design_doc: docs/pmos/features/2026-06-17_frameworks-corpus-expansion/02_design.html
parent:
dependencies: []
released: v0.28.0
---

## Context

A corpus-expansion research run in the source repo (`learn-magazine/docs/pmos/frameworks/`) produced **74
net-new, ready-to-ingest framework records** (each an embedded JSON record + a paired house-style owned SVG)
plus a written, repeatable **research + authoring process**. The maintainer wants the 74 merged into the
bundled `/frameworks` corpus (272 → 346), the process captured *inside* the skill for future runs, and — a
re-founding decision — the legacy **Notion `sync` pipeline removed entirely**: the corpus is now maintained by
direct authoring + the documented process, so Notion is no longer the source of truth.

Pre-flight against *this* repo's shipped corpus (not the author's local copy) was clean: 74/74 records parse,
0 id collisions, 0 bad `problem_tags` (⊆ shipped 48-tag registry), 0 dangling `related`, merged
`decision_type` distribution green (top `strategize` 24.6% < 30%, `n/a` 0.9% < 5%), 74/74 paired SVGs present.
So ingestion is low-risk mechanical work gated by the existing `validate-corpus.mjs`.

**Load-bearing invariant for the removal:** `validate-corpus.mjs` imports `DECISION_TYPES` / `LIFECYCLE_STAGES`
/ `validateAnchors` from `derive-fields.mjs` (part of the sync pipeline) — these MUST survive. `match.mjs`,
`build-library.mjs`, `validate-corpus.mjs` are runtime/authoring paths and stay. Only the Notion-fetch pipeline
(`split-corpus.mjs`, `apply-rederive.mjs`, the `sync` verb, `reference/ingestion.md`) is removed.

Full FRs (FR-A1..A5, FR-B1..B6), decisions (D1–D8), the invariants, and the kept-vs-removed inventory live in
the `design_doc:` (02_design.html). **Out of scope:** writing the 74 curator `commentary` "PM's takes" (the
template reserves those for the curator personally) and re-authoring the accepted records.

## Story split

Two vertical slices on one skill (`/frameworks`): a data merge vs. a feature-removal + docs rewrite — each
independently shippable, each scored once against `skill-eval.md`. Story `kac` depends on `2gw` because both
edit `SKILL.md` (count bump vs. verb-surface rewrite); serializing avoids the collision and lets the rewrite
sit on the 346-count tree (D7).

## Stories
- 260617-2gw — ingest the 74-framework batch (route: skill) — ready
- 260617-kac — re-found on direct authoring: remove Notion sync + ship the research process (route: skill, depends on 260617-2gw) — ready
