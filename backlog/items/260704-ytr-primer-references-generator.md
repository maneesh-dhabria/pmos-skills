---
schema_version: 1
id: 260704-ytr
title: "/primer References — shared deterministic generator + forward wiring (Phase 4/5) + guideline (required section + rubric R11): new primers emit a bottom `## References` section listing all sources.json entries, cited ones marked"
type: feature
kind: story
status: done
route: skill
priority: should
labels: [pmos-learnkit, primer, references, skill]
created: 2026-07-04
updated: 2026-07-04
parent: 260704-rgt
dependencies: []
design_doc: docs/pmos/features/2026-07-04_primer-references/02_design.html
plan_doc: docs/pmos/features/2026-07-04_primer-references/stories/260704-ytr/03_plan.html
feature_folder: docs/pmos/features/2026-07-04_primer-references/
worktree: agent-skills-260704-ytr
claimed_by: "build:b0e236c5-8aab-4a88-8bd7-4d40d8d8e0bc"
driver_holder: "build:b0e236c5-8aab-4a88-8bd7-4d40d8d8e0bc"
---

## Context

The forward-capability half of epic 260704-rgt: make **new** primers emit a bottom `## References` section, and
codify it as a guideline. Grounded in `02_design.html` §3 (what the section is), §4 (shared generator + forward
path), §5 (guideline & enforcement), decisions D1–D8, invariants INV-1/INV-2/INV-4/INV-5. The corpus backfill
is the sibling story 260704-3jt, which consumes this story's `injectReferences` export.

Ships the single deterministic generator both stories share (INV-1) — this story is its sole author. The LLM
never hand-writes a References list (INV-2, mirroring Anti-pattern #9).

## Acceptance Criteria

- [ ] **AC1 — shared generator module.** New `plugins/pmos-learnkit/skills/primer/scripts/references-section.mjs`
  (zero-dep Node ESM) exports: `renderReferencesFragment(sources, citedUrls) → htmlString` (pure; returns a
  content-only `<h2 id="references">References</h2>` + `<ol>` fragment) and `injectReferences(primerHtml, sources)
  → newHtml` (computes `citedUrls` from body `<a href>` URLs outside the References section, removes any existing
  `#references` section, inserts the fragment immediately before `</main>`; idempotent — INV-4).
- [ ] **AC2 — entry format (D4/D5/D3).** Each entry is a flat numbered `[N]` list item: `<a href="{url}">{label}</a>`
  where `label` = cleaned host of `{url}` (strip scheme + `www.`), the tier badge, `·cited·` iff `{url}` appears
  in a body `<a href>` outside the References section, and the verbatim `takeaway` beneath. Ordered by tier
  (T1→T2→…) then original `sources.json` order. Output is stable / byte-idempotent for identical inputs (D6).
- [ ] **AC3 — all sources, honestly (INV-5/D1).** Every `sources.json[].url` appears exactly once in the list;
  none silently dropped; `·cited·` is present only when the url truly appears inline in the body.
- [ ] **AC4 — forward wiring (Phase 5, §4.1).** Phase 5 builds the References fragment via
  `renderReferencesFragment(sources, citedUrls)` and **appends it to the content-only `{{content}}` fragment as
  the last block, before `renderArtifact()`** — the shell still comes only from `template.html` (Anti-pattern #9
  preserved). The atomic-trio `sections.json` includes the `references` id (its id set equals the on-page id set,
  R7). References is the last section, after `## Where this connects` (D7).
- [ ] **AC5 — SKILL.md.** Phase 4 states References is generated deterministically (not drafted); Phase 5 step 7
  documents appending the fragment + adding the id to `sections.json`; the worked example mentions the References
  section; Anti-patterns gains "don't hand-author the References list" (mirrors #9).
- [ ] **AC6 — guideline / required section.** `reference/audience-presets.md` adds `## References` to the required
  closing-sections contract for both presets (senior-pms + all-pms), placed after `## Where this connects`.
- [ ] **AC7 — rubric R11 (deterministic, trust-tier).** `reference/rubric.md` adds R11: (a) `<h2 id="references">`
  present; (b) every `sources.json[].url` ∈ References list; (c) `references` id ∈ `sections.json`. R11 joins the
  rubric's id set (Phase-5 orchestrator-side validation expects the extended id set); documented as a
  membership/structure test that needs no re-fetch. `word_count` (R10 informational) excludes the References
  section (D8).
- [ ] **AC8 — tests.** Unit test for `references-section.mjs` covering: fragment shape + ordering, `·cited·`
  detection (cited vs background), idempotency of `injectReferences` (inject twice = inject once), all-sources
  membership, and the before-`</main>` placement. Runs with `node --test` (or the repo's existing script-test
  convention); green.
- [ ] **AC9 — release-prereq scope (§G).** No version-bump / changelog / README / manifest / learnings tasks in
  any build wave — those are `/complete-dev`'s (Loop 3). List them under the plan's Release prerequisites only.
- [ ] Conforms to `skill-patterns.md §A–§L`; `skill-eval` (`[D]`+`[J]`) passes; 4 hygiene lints +
  `audit-recommended` green.
