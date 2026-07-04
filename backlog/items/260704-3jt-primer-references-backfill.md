---
schema_version: 1
id: 260704-3jt
title: "/primer References — backfill all 61 bundled corpus primers: a `backfill-references.mjs` CLI injects the `## References` section into every data/primers/*.html from its existing sidecar, idempotently"
type: feature
kind: story
status: in-progress
route: skill
priority: should
labels: [pmos-learnkit, primer, references, corpus, skill]
created: 2026-07-04
updated: 2026-07-04
parent: 260704-rgt
dependencies: [260704-ytr]
design_doc: docs/pmos/features/2026-07-04_primer-references/02_design.html
plan_doc: docs/pmos/features/2026-07-04_primer-references/stories/260704-3jt/03_plan.html
feature_folder: docs/pmos/features/2026-07-04_primer-references/
worktree: agent-skills-260704-3jt
claimed_by: "build:b0e236c5-8aab-4a88-8bd7-4d40d8d8e0bc"
driver_holder: "build:b0e236c5-8aab-4a88-8bd7-4d40d8d8e0bc"
---

## Context

The backfill half of epic 260704-rgt: retro-fit the bottom `## References` section into all 61 bundled corpus
primers using the shared generator authored in story 260704-ytr. Grounded in `02_design.html` §4.2
(backfill path), invariants INV-1/INV-3/INV-4/INV-5, decisions D6/D8/D10.

**Depends on 260704-ytr** for `injectReferences` (D9 claim-time merge brings `references-section.mjs` into this
worktree before build). Pure local transform — no network, no re-verification, no re-sourcing (INV-3, D10).
Bundled primers ship **no `sections.json`** (only `.html` + `.sources.json` in the corpus), so backfill touches
HTML only — there is no sections.json to reconcile for the static corpus.

## Acceptance Criteria

- [ ] **AC1 — backfill CLI.** New `plugins/pmos-learnkit/skills/primer/scripts/backfill-references.mjs` (zero-dep
  Node ESM) walks `data/primers/*.html`, reads the sibling `<stem>.sources.json`, calls the 260704-ytr
  `injectReferences(html, sources)` export (imported, not re-implemented — INV-1), and atomically rewrites each
  HTML in place (temp-then-rename). A primer with no sibling sidecar is reported and skipped, never errored-out.
- [ ] **AC2 — corpus coverage.** After a run, **all 61** `data/primers/*.html` carry a `<h2 id="references">`
  section as their last body section (before `</main>`), listing every entry from that primer's sidecar with
  cited ones marked (INV-5). Verified by a coverage assertion (count of primers with the section == count of
  primers with a sidecar).
- [ ] **AC3 — idempotent (INV-4/D6).** Running the CLI a second time produces a **no-op git diff** — the existing
  section is replaced byte-for-byte, never duplicated. Asserted in the story's verification.
- [ ] **AC4 — no index churn (D8).** `primers-index.json` is not rewritten by backfill (`sources_count` already
  present; `word_count` counts teaching prose, excludes References). If a deliberate index touch is ever needed
  it is a separate, justified step — not a silent side effect of backfill.
- [ ] **AC5 — corpus committed.** The 61 modified `data/primers/*.html` are committed as the backfill data
  change; the `library.html` browse page (gitignored, regenerable) is unaffected.
- [ ] **AC6 — release-prereq scope (§G).** No version-bump / changelog / README / manifest / learnings tasks in
  any build wave — `/complete-dev` (Loop 3) owns those.
- [ ] Conforms to `skill-patterns.md §A–§L`; `skill-eval` (`[D]`+`[J]`) passes (skill body unchanged by this
  story — the guard is that the new script + corpus edits don't regress the rubric); 4 hygiene lints +
  `audit-recommended` green.
