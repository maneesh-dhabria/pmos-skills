---
schema_version: 1
id: 260629-7hm
title: "/to-notion-doc fidelity fixes — honest post-conversion report, single-owner image/SVG stub pipeline, attribute/description→table + annexure-grouping detection, per-phase status banner"
type: enhancement
kind: epic
status: released
route: skill
priority: should
labels: [pmos-utilities, to-notion-doc, notion, document-conversion, skill, from-feedback]
created: 2026-06-29
updated: 2026-07-01
released: 0.5.0
source: "from-feedback (/reflect on first production run, 2026-06-29): converted a 242-block POV HTML to Notion; verification passed 242/242 but three post-conversion sessions surfaced (a) report omitted two deterministic limitations, (b) image-stub pipeline output bugs, (c) source structures not recognized as conversion candidates. Maintainer decisions (define run): D1 map-to-notion is single stub owner; D2 single-callout caption-inline stub; D3 auto-convert dl/label-divs to tables, flag in census."
design_doc: docs/pmos/features/2026-06-29_to-notion-doc-fidelity/02_design.html
parent:
dependencies: []
---

## Context

`/to-notion-doc` (pmos-utilities, built via epic 260626-4sm/story 260626-sbf) had its first real production
run: a 242-block POV HTML converted to a Notion page across two context windows. The conversion was
**structurally correct** — Phase 4 verification passed 242/242 — but three post-conversion feedback sessions
exposed gaps between "structurally complete" and "faithful + honest":

1. **Honesty (blocker).** Two limitations are deterministic and always present — in-page anchor links degrade
   to plain text (block UUIDs unknown at write time), and `fit-page-width="true"` needs the page-level "Full
   width" toggle to render — yet the Phase 5 report declared "clean · Open questions: 0". The user discovered
   both with confusion.
2. **Image-stub output quality (friction ×3).** Two owners write the same stub block (map-script render +
   orchestrator injection) → duplicate "Unresolved svg" markers and wrong nesting; the caption fell outside
   the toggle; and the callout shape surprised users who expected an upload field.
3. **Structure recognition (friction + nit ×2).** `<dl>` / label→description div sections flattened to
   paragraphs (7 post-hoc `update_content` calls); ≥3 sibling "Annexure" sections left flat with no grouping
   offer (12 more ops).

The full finding→fix map, decisions (D1–D7, three resolved with the maintainer this run), FRs, and invariants
are in the `design_doc:` (`02_design.html`). This is a revision of the existing skill — no new charter.

## Acceptance Criteria

- [ ] Phase 5 always emits a **Post-conversion actions** section disclosing the two deterministic limitations
  (anchor-links-as-plain-text count + manual fix; `fit-page-width` set on all N tables + page-level toggle
  note), even on an otherwise-clean run (FR-1).
- [ ] `map-to-notion.mjs` is the **single positional owner** of image/ambiguous-media stub blocks (one
  correctly-nested callout per node, fillable caption slot); Phase 2 fills, never injects a second callout —
  duplicate markers structurally impossible (FR-2).
- [ ] Image stub is a **single callout, caption inline** (`🖼 [filename] · Caption: [text]` + copied path +
  drag hint); Phase 2 announces up front that the MCP has no native image-upload field (FR-3).
- [ ] `parse-doc.mjs` **auto-converts** `<dl>` and clean label→description div subtrees to 2-column
  `Attribute | Description` tables, flagged in the Phase 1 census; flows through the §3 table-fidelity contract
  (FR-5).
- [ ] `parse-doc.mjs` detects ≥3 sibling sections sharing a leading token ("Annexure"/"Appendix"); Phase 1
  asks once (Recommended = group under one parent toggle; AUTO-PICK group when non-interactive) (FR-6).
- [ ] Each phase ends with a one-line, compaction-surviving status banner to chat (FR-7).
- [ ] **No regression:** a source with no images / no dl-or-label-divs / no annexure clusters converts
  byte-identically (INV-4); all five script `--selftest` suites green with new assertions added (INV-2);
  `notion-blocks.md` stays the one home for Notion/NFM facts (INV-3); non-interactive block byte-identical,
  `allowed-tools` unchanged (INV-5).
- [ ] Conforms to `skill-patterns.md §A–§L`; passes `skill-eval.md`; 4 hygiene lints + recommended-audit green.

## Stories

- **260629-sch** — `/to-notion-doc` fidelity fixes (route: skill, plugin pmos-utilities, no deps). All seven
  findings in one `/execute` run. Status: planned (tasks.yaml authored at define).

## Notes

- Single-story epic (singleton wrap, D18/D7). One skill, one `/execute` run; the findings are interdependent
  within `SKILL.md` + three scripts, so splitting would create cross-story task deps (D24 litmus).
- Build via `/skill-sdlc build --next` (or `build --story 260629-sch`) → Loop 3 `/complete-dev --epic 260629-7hm`.
