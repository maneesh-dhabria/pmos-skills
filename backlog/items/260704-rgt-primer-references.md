---
schema_version: 1
id: 260704-rgt
title: "/primer References section — surface each primer's full verified source set as a bottom `## References` section (all sources, cited ones marked), backfill all 61 bundled primers, and make it a rubric-enforced guideline for new primers"
type: feature
kind: epic
status: defined
route: skill
priority: should
labels: [pmos-learnkit, primer, references, corpus, skill]
created: 2026-07-04
updated: 2026-07-04
design_doc: docs/pmos/features/2026-07-04_primer-references/02_design.html
feature_folder: docs/pmos/features/2026-07-04_primer-references/
parent:
dependencies: []
---

## Context

Every `/primer` is already built on a fully-verified source set persisted as a `{date}_{slug}.sources.json`
sidecar (array of `{url, takeaway, topic, tier, paywalled}`), but that evidence base is invisible in the
reader artifact — the HTML ends at `## Where this connects` and the sources live only in the sidecar JSON.
This epic **surfaces** that existing data as a bottom `## References` section: all sources the primer was
built on (every one was read + synthesized = "used in creating"), with the ones actually cited inline in the
prose marked. No re-fetching, no re-sourcing — a pure local transform of data that already exists.

Grounded in the epic `design_doc:` (`02_design.html`), grill-hardened decisions D1–D10, invariants INV-1
(one generator, two callers), INV-2 (deterministic, not model-authored), INV-3 (data exists; nothing
re-fetched), INV-4 (idempotent injection), INV-5 (show every source honestly).

Decisions settled with the maintainer:
- **List scope (D1):** all `sources.json` entries, with inline-cited ones visually marked (`·cited·`).
- **Enforcement (D2):** required closing section + a new deterministic rubric check R11 (eval-gated).
- **Format (D4):** flat numbered `[N]` list, ordered tier-then-appearance, at the absolute bottom (D7).
- **Split (D9):** two stories — generator+forward+guideline (260704-ytr) → corpus backfill (260704-3jt).

## Acceptance Criteria

- [ ] A **newly generated primer** ends with a `## References` (`<h2 id="references">`) section listing every
  `sources.json` entry as a flat numbered `[N]` list — anchor to the verbatim url, cleaned-host label, tier
  badge, and verbatim takeaway — with each source that also appears as an inline `<a href>` in the body marked
  `·cited·`. The section is the last body section, before `</main>`.
- [ ] The References HTML is produced by **one shared deterministic generator** (`renderReferencesFragment` +
  `injectReferences` in `scripts/references-section.mjs`); the forward write path and the backfill CLI both
  call it (INV-1); the LLM never hand-authors it (INV-2).
- [ ] **All 61 bundled corpus primers** (`data/primers/*.html`) carry the `## References` section injected from
  their existing `*.sources.json` sidecars; the backfill is **idempotent** (a second run is a no-op diff).
- [ ] References is a **required closing section** (`reference/audience-presets.md`) enforced by a new
  deterministic **rubric check R11** (`reference/rubric.md`): section present · every `sources.json[].url` in
  the list (no source dropped) · `references` id in `sections.json`.
- [ ] No network / no re-verification / no re-sourcing anywhere — both paths read only the primer's own
  `sources.json` (INV-3, D10).
- [ ] Conforms to `skill-patterns.md §A–§L`; passes `skill-eval` (`[D]`+`[J]`); 4 hygiene lints +
  `audit-recommended` green. Single plugin (pmos-learnkit), one release unit.

## Stories

- **260704-ytr** — generator + forward wiring + guideline: shared `references-section.mjs`
  (`renderReferencesFragment`/`injectReferences`) + unit tests, SKILL.md Phase 4/5 + worked example +
  anti-pattern, `audience-presets.md` required section, `rubric.md` R11. No deps.
- **260704-3jt** — corpus backfill: `backfill-references.mjs` CLI over all 61 bundled primers using
  260704-ytr's `injectReferences`; idempotent. Deps: 260704-ytr (shared generator).

## Release prerequisites

- pmos-learnkit `plugin.json` ×2 version bump (behavior change to existing skill → minor).
- Changelog entry; manifest version-sync; no new README row (existing skill).
- All owned by `/complete-dev` (Loop 3) — never in a build wave (§G).
