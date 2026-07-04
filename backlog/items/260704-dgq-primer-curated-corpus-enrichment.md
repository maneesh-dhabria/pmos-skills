---
schema_version: 1
id: 260704-dgq
title: "/primer curated-corpus enrichment — retrofit the 61 bundled primers with relevant, fetch-verified sources from the ~1,800-record /learn-list curated corpus (primer-by-primer full refine: weave into prose + sources.json, regenerate References via 260704-rgt)"
type: feature
kind: epic
status: defined
route: skill
priority: should
labels: [pmos-learnkit, primer, references, corpus, enrichment, skill]
created: 2026-07-04
updated: 2026-07-04
design_doc: docs/pmos/features/2026-07-04_primer-references-enrichment/02_design.html
feature_folder: docs/pmos/features/2026-07-04_primer-references-enrichment/
parent:
dependencies: [260704-rgt]
---

## Context

`/primer`'s **new-primer** generation already factors in the ~1,800-record curated corpus: Phase 3 sourcing
runs the `curated-references` overlay (`_shared/topic-research/curated-references.md`), prefiltering the corpus
per topic via `curated-references-match.mjs` and fetch-verifying survivors like any live source. The forward
problem is already solved (suppressible with `--no-curated`). This epic does **not** touch that path.

The gap is purely **retrospective**: the 61 bundled corpus primers (`data/primers/*.html` + `*.sources.json`,
~16 sources each) were generated before the overlay existed at today's corpus size, so they under-use the
1,797-record corpus. This epic enriches them **primer-by-primer** (maintainer's preferred approach): run the
existing overlay prefilter over the corpus for each primer's own topics, **fetch-verify** the top curated
candidates this run, weave survivors into the relevant teaching-section prose + `sources.json`, and regenerate
the primer's `## References` section via epic **260704-rgt**'s shared `injectReferences`. A real refine pass,
not a list append.

Grounded in the epic `design_doc:` (`02_design.html`), decisions D1–D8, invariants INV-1 (reuse the corpus
matcher), INV-2 (fetch-verify every added source this run), INV-3 (regenerate References via rgt, never
hand-author), INV-4 (additive/non-destructive), INV-5 (re-runnable/convergent), INV-6 (rubric-gated per primer).

Decisions settled with the maintainer:
- **Enrichment depth (D1):** full refine — verify + weave into prose AND References (not references-only).
- **Verification (D2):** re-fetch-verify each added source this run (trust contract; ~30% yield).
- **vs 260704-rgt (D3):** depend on it and sequence after; regenerate References via rgt's generator to avoid
  the same-61-files commit clash.
- **Approach (D4):** primer-by-primer, capped (~4–6 verified additions per primer).
- **Review posture (D5):** fully unattended, rubric-gated only; a primer failing the rubric is reverted.
- **Split (D6):** two stories — enrichment engine (260704-6rq) → corpus backfill (260704-e3b).

## Dependency — 260704-rgt (hard)

**Both epics rewrite the same 61 `data/primers/*.html` and touch `sources.json`.** 260704-rgt (References
section) must land first: it owns the `## References` format, the shared `injectReferences` generator, and
rubric R11. This epic consumes `injectReferences` and needs the References section already present on the
corpus. Sequencing after rgt prevents commit clashes. **This epic's stories are not buildable until rgt ships.**

## Acceptance Criteria

- [ ] A new `/primer enrich` capability enriches an existing primer primer-by-primer: recovers its topics from
  `sources.json`, runs the `curated-references-match.mjs` prefilter over the corpus (INV-1), dedups against the
  primer's existing sources, applies the overlay coverage gate, **fetch-verifies** the top candidates this run
  (INV-2), weaves verified survivors into the relevant H2 prose + `sources.json` (additive only, INV-4), caps
  additions per primer (D4), and **regenerates `## References` via 260704-rgt's `injectReferences`** (INV-3).
- [ ] Every enriched primer still passes `/primer`'s `rubric.md` — R1 (every `<a href>` ∈ `sources.json[].url`),
  R11 (References membership), trust-tier — or is reverted and logged (INV-6, D5). No unverified source is ever
  written into a primer.
- [ ] **All 61 bundled corpus primers** are enriched by an unattended, rubric-gated backfill run; the enriched
  `data/primers/*.html` + `*.sources.json` are committed with a run report (per-primer considered / verified /
  added / skipped / reverted).
- [ ] Enrichment is additive and non-destructive (INV-4) and re-runnable/convergent (INV-5) — a second run adds
  no already-present source and does not re-weave.
- [ ] No change to the forward new-primer generate path or `--no-curated` semantics (D8).
- [ ] Conforms to `skill-patterns.md §A–§L`; passes `skill-eval` (`[D]`+`[J]`); 4 hygiene lints +
  `audit-recommended` green. Single plugin (pmos-learnkit), one release unit.

## Stories

- **260704-6rq** — enrichment engine + `/primer enrich` verb: `scripts/enrich-references.mjs` (per-primer
  procedure §4.1) + SKILL.md verb + anti-pattern + unit tests. Deps: 260704-rgt (`injectReferences`).
- **260704-e3b** — corpus backfill: run the 260704-6rq engine over all 61 bundled primers, unattended +
  rubric-gated (D5); commit enriched HTML + sidecars + run report. Deps: 260704-6rq, 260704-rgt.

## Release prerequisites

- pmos-learnkit `plugin.json` ×2 version bump (behavior change to existing skill → minor).
- Changelog entry; manifest version-sync; no new README row (existing skill).
- Bundled corpus edits (260704-e3b) ship as data changes within the same release.
- **Sequenced after 260704-rgt ships** — not buildable until rgt's `injectReferences` + corpus References
  sections exist on main.
- All owned by `/complete-dev` (Loop 3) — never in a build wave (§G).
