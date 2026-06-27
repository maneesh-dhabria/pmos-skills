---
schema_version: 1
id: 260626-sbf
kind: story
parent: 260626-4sm
title: "/to-notion-doc skill — parse md/html/txt → faithful Notion page via MCP, with remembered heading + visual-style prefs (settings.yaml), runtime-gated image-upload ladder (File Upload API → local-extract stub), table-fidelity contract, chunked/resumable write, create-or-update (rewrite/archive/in-place), and a completeness + integrity verification pass"
type: feature
priority: should
route: skill
dependencies: []
plugin: pmos-utilities
status: in-progress
feature_folder: docs/pmos/features/2026-06-26_to-notion-doc/
plan_doc: docs/pmos/features/2026-06-26_to-notion-doc/stories/260626-sbf/03_plan.html
tasks: docs/pmos/features/2026-06-26_to-notion-doc/stories/260626-sbf/tasks.yaml
worktree: .claude/worktrees/feat-260626-sbf
claimed_by: build:e385ea38
driver_holder: build:e385ea38
build_branch: feat/260626-sbf
labels: [pmos-utilities, to-notion-doc, notion, mcp, document-conversion, new-skill]
created: 2026-06-26
updated: 2026-06-27
---

## Context

Build the new **pmos-utilities** skill `/to-notion-doc` per the epic design contract
`../../02_design.html` (grounded in `../../research/notion-api-findings.md`). One vertical slice — parser +
block-mapper + image ladder + chunked writer + create-or-update + verification + `SKILL.md` are co-designed
and ship together. Canonical path `plugins/pmos-utilities/skills/to-notion-doc/SKILL.md`.

## Acceptance criteria

- [ ] **AC1 — invocation + parse.** `/to-notion-doc <path>` accepts `.md` / `.html` / `.txt`; format inferred
  from extension. MD + HTML parsed structurally; `.txt` parsed with **light heuristics** (blank-line paragraphs,
  ALL-CAPS / underlined-line headings, `- ` bullets — D-grill). Produces a normalized block tree. (design §2, §5)

- [ ] **AC2 — block mapping.** Each source node maps to its best-match Notion block per the §5 table: headings
  (h1–h3), paragraph, bulleted/numbered/to_do lists (nested via children within the 2-level limit), quote,
  code (language validated against Notion's enum; unknown → `plain text`), divider, bookmark vs inline link,
  equation, image, table. Inline marks (bold/italic/strike/code/link) preserved as `rich_text` annotations.

- [ ] **AC3 — heading-style preference (D5).** Toggle vs normal headings honored: toggle ⇒
  `heading_N.is_toggleable:true` with body nested as `children`. Remembered in
  `.pmos/settings.yaml :: to_notion_doc.heading_style`; confirmed-against-last-run (one prompt), not re-asked
  from scratch; `--headings` flag overrides for the run.

- [ ] **AC4 — visual-style preference (D6).** Two modes: **minimal** (no emojis, no text colors, no callouts —
  plain blocks) and **expressive** (emoji + semantic text color + callout blocks per the §9 mapping). Identical
  structure across modes; expressive only adds decoration. Remembered in
  `.pmos/settings.yaml :: to_notion_doc.visual_style`; `--style` overrides. minimal is the first-run default.

- [ ] **AC5 — preferences persisted in settings.yaml.** First run asks heading + visual style and writes the
  `to_notion_doc:` block (with `updated:` date) to `.pmos/settings.yaml`; later runs do a single
  confirm-against-last-run (Confirm all / Edit). Flags override without rewriting settings unless the user opts
  to save. (design §10)

- [ ] **AC6 — image ladder (D2, runtime-gated).** When the source has images: ask once whether a Notion File
  Upload API token is configured (env-var name from `to_notion_doc.notion_token_env`, default `NOTION_TOKEN`;
  value read from env, never committed). **Token present** ⇒ upload each local image via the File Upload API
  (create → send multipart `file` → attach `image{type:"file_upload",id}`), respecting the 1-hour attach window
  + size limits. **External HTTPS URL in source** ⇒ pass through as `external` image. **Otherwise** ⇒
  **local-extract stub**: copy image to `./to-notion-doc-assets/<slug>/`, emit a `callout` naming the relative
  path + name, then an empty `image` placeholder block. Google-Drive trick is NOT used. (design §6)

- [ ] **AC7 — table-fidelity contract (D3, D4).** Tables built so columns/rows are never dropped: every
  `table_row.cells` length == `table_width` (short rows padded with empty `[]` cells, over-long rows
  truncated + flagged); `table_width` set once; table created with ≥1 row; rows beyond the first batch appended
  in ≤100-row chunks. No attempt to set full-width (not API-controllable — documented as a known Notion limit
  in the skill).

- [ ] **AC8 — chunked, resumable write (D7).** Blocks written in ≤100/request batches, ≤2 nesting levels per
  request, create-then-append for deeper nesting / large tables. A write cursor (page id + last source-block
  index) is persisted so a mid-write failure resumes without duplicating already-written blocks.

- [ ] **AC9 — create-or-update (D8, D11).** Bare invocation creates a new page under a chosen parent
  (`--parent` wins; else `notion-search` + pick; `last_parent` suggested not auto-applied). `--into <page>`
  targets an existing page and asks the update mode: **rewrite** (clear + write anew), **archive** (move
  existing top-level blocks under a new collapsed toggleable `heading_1` "Archive", then write new content
  above) — the **default**, non-destructive — or **in-place** (append/reconcile).

- [ ] **AC10 — rich-media ambiguity prompts (D10).** Nodes with no faithful mapping (inline SVG / diagrams /
  embeds / cards / iframes / footnotes) go to an ambiguity queue; each gets one `AskUserQuestion` offering
  realistic conversions (e.g. upload-as-image / bookmark-source / placeholder-callout). Never silently dropped;
  the always-available fallback is a labeled placeholder callout that verification can account for.

- [ ] **AC11 — verification: completeness + integrity (design §8).** After writing, re-fetch page blocks and
  (a) reconcile every source block → disposition ∈ {mapped, stubbed, user-skipped}; fail loudly on any
  unaccounted-for source block; (b) assert integrity: no orphaned blocks, every `table_row.cells.length ==
  table_width`, no accidentally-empty blocks, valid code languages, valid colors. Emit a conversion report with
  block counts, ambiguities resolved, image dispositions, and the verification result.

- [ ] **AC12 — non-interactive contract (W14).** Inlines the canonical non-interactive block byte-identical to
  `skills/_shared/non-interactive.md`; every `AskUserQuestion` carries a `(Recommended)` option or a defer-only
  tag (AUTO-PICK: image→stub, ambiguity→placeholder-callout, update-mode→archive, parent→error-if-absent);
  open questions buffer into the report. (design §D9, §12)

- [ ] **AC13 — live dogfood.** Convert the real document
  `/Users/maneeshdhabria/Desktop/Projects/porter/pm-docs/metrics-store/pov/pov_v6.html` (9 tables, 2 inline SVG
  diagrams, 17 dividers, nested lists, code, links) end-to-end: tables render with correct column/row counts,
  the SVGs trigger ambiguity prompts, chunking handles the size, both style modes produce valid output, and the
  verification pass reports zero unaccounted-for source blocks. Evidence = the conversion report +
  reconciliation table (Notion content is the maintainer's; never committed).

- [ ] **AC14 — conformance.** Conforms to `feature-sdlc/reference/skill-patterns.md §A–§L` + host `CLAUDE.md`
  (canonical skill path; **no** version-bump / changelog / README / manifest-sync tasks in the plan —
  `/complete-dev` owns those at epic release). `/to-notion-doc` skill-eval `[D]` passes; the 4 hygiene lints +
  audit-recommended run clean. Notion-API facts live only in the skill's `reference/` (one-fact-one-home, §K).

## Notes

Defined 2026-06-26 (Loop-1, `/skill-sdlc define`). Two forks resolved with maintainer: plugin = pmos-utilities;
image strategy = runtime-ask-then-stub. Grill resolved token-source (env-var name in settings), txt-parsing
(light heuristics), and update-scope (supported in v1: rewrite / archive-under-toggle-H1 / in-place). Build is
one `/execute` run; no dependencies, no substrate extraction.
