---
schema_version: 1
id: 0016
kind: epic
title: /frameworks browse-UI fixes — selection, default view, view icons, multi-select filters, area rename
type: enhancement
priority: should
status: defined
route: skill
plugin: pmos-learnkit
feature_folder: docs/pmos/features/2026-06-12_frameworks-browse-ux/
requirements_doc:
spec_doc:
design_doc: docs/pmos/features/2026-06-12_frameworks-browse-ux/02_design.html
labels: [frameworks, browse-ui, filters, pmos-learnkit]
created: 2026-06-12
updated: 2026-06-12
---

## Context

Singleton epic wrapping the five browse-UI fixes for `/frameworks` (pmos-learnkit). All five
land in `scripts/build-library.mjs`'s emitted `index.html` (HTML/CSS/JS), plus its `--selftest`,
the structure/build tests, and SKILL.md prose. Lean define (D-lean, mirrors epic 0015): no epic
`/requirements` or `/grill` — story 0017's ACs + the design doc are the contract. The multi-select
filter work was grounded by dedicated UX research (NN/g, Baymard, GOV.UK, WAI-ARIA APG).

Design doc: `docs/pmos/features/2026-06-12_frameworks-browse-ux/02_design.html`

## Acceptance Criteria

- [ ] Selecting a framework highlights it in all three views; opening the reader does not auto-scroll the page
- [ ] List view is the default
- [ ] Each view-toggle button carries a representative inline-SVG icon (offline-safe, accessible names kept)
- [ ] Decision type + tags are dropdown multi-select filters (tags dropdown has type-to-filter search); inline tag cloud + More-filters disclosure removed
- [ ] Always-visible applied-filters bar: each active filter a removable ✕ chip labeled with its facet, plus Clear all; chips ↔ checkboxes stay in sync
- [ ] Filter semantics OR-within / AND-across; dropdowns stay open across selections; Escape closes + restores focus; count in aria-live region
- [ ] Four product areas display renamed (presentation-only; corpus / --json / match.mjs unchanged)
- [ ] Selftest + structure + build tests green with updated assertions; SKILL.md doc-synced; index.html re-derived

## Notes

Stories: 0017 (the whole change set — single skill story).
Route: skill (edits `plugins/pmos-learnkit/skills/frameworks/scripts/build-library.mjs` + its tests + SKILL.md; pmos-learnkit).
Lean define: story 0017's ACs are the design contract (D-lean in the design doc).
Rename mapping (D5, presentation-only):
- "Analytics, Design & Finance" → "Cross Functional Skills"
- "People, Personal & Career" → "PM Skills & Mindset"
- "Product" → "Product Management"
- "Strategy & Business" → "Business & Strategy"
