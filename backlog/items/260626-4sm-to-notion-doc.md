---
schema_version: 1
id: 260626-4sm
kind: epic
title: "/to-notion-doc — convert a local markdown / HTML / txt document into a faithful Notion page via the Notion MCP, with per-user heading + styling preferences, a robust image-upload ladder, full-width table guidelines, block-by-block mapping with ambiguity prompts, and a post-write completeness + orphan-block verification pass"
type: feature
status: defining
priority: should
labels: [pmos-toolkit, to-notion-doc, notion, mcp, document-conversion, new-skill]
route: skill
created: 2026-06-26
updated: 2026-06-26
defined: 2026-06-26
source: docs/pmos/features/2026-06-26_to-notion-doc/
feature_folder: docs/pmos/features/2026-06-26_to-notion-doc/
design_doc: docs/pmos/features/2026-06-26_to-notion-doc/02_design.html
parent:
dependencies: []
---

## Context

A new **pmos-toolkit** skill, **`/to-notion-doc`**, that takes a local source document
(`.md` / `.html` / `.txt`) and reproduces it as a Notion page through the Notion MCP — faithfully,
with the friction the user has hit using the raw MCP designed out:

- **Heading style preference** (toggleable vs. normal heading blocks) — remembered per-user, confirmed
  against last run rather than re-asked from scratch.
- **Visual style** — two named styles: **minimal** (no emojis, no text colors, no callout blocks) and
  **expressive** (uses emojis, text colors, and callout blocks appropriately).
- **Images** — the Notion MCP/API image pain point (no external host, no obvious upload path). The design
  must research and pin the best 2026 approach (direct File Upload API vs. external-URL vs. Drive
  workaround) with a graceful fallback ladder ending in a local-extract + callout-and-image-block stub.
- **Tables** — Notion tables frequently render narrow or drop rows/columns from malformed markup. The
  design must pin correct table-construction guidelines (cell-count = table_width invariant, header row,
  append chunking, full-width handling).

**Overall flow:** parse the source → map each content block to the best-match Notion block (prompting
the user via `AskUserQuestion` on genuinely ambiguous / unsupported rich media) → confirm remembered
preferences → create the Notion page → verify nothing from the source is missing and there are no
formatting errors or orphaned blocks.

## Decisions / open questions (resolved during this define run)

Tracked in `02_design.html`; key forks: image-upload ladder, preference persistence shape,
minimal-vs-expressive style mapping, table-construction contract, and the parse→map→verify control flow.

## Stories

- `260626-sbf` — `/to-notion-doc` skill (single vertical slice; the whole skill is one `/execute` run).
