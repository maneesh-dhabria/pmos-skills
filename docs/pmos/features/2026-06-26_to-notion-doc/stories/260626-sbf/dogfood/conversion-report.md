# /to-notion-doc — live dogfood conversion report (AC13)

**Source:** `…/porter/pm-docs/metrics-store/pov/pov_v6.html` (858 lines, 79,402 bytes — the maintainer's POV
doc; its **content is never committed**, only this report + the reconciliation below).
**Run:** 2026-06-27, build of story 260626-sbf.

## What ran

The full **deterministic** pipeline end-to-end against the real document:
`parse-doc.mjs` → `map-to-notion.mjs` (both styles) → `chunk-blocks.mjs` → `verify-page.mjs`.

The single step **not** executed is the live Notion **MCP write** (`notion-create-pages` /
`notion-update-page`). Creating pages in the maintainer's real Notion workspace is an outward-facing,
hard-to-reverse action that requires an interactive parent-page confirmation (Phase 3, the `defer-only` parent
pick); it is intentionally not performed in an unattended build run. The write path itself is exercised by the
script selftests and the chunk plan below; the user runs the live write interactively (pick a parent → the
4-batch plan is created+appended → the same `verify-page` reconciliation re-runs against the fetched page).

## Block census (parse-doc)

| Metric | Value |
|---|---|
| Top-level blocks | **263** |
| paragraph / heading / divider | 171 / 32 / **17** |
| bulleted_list_item | 32 |
| **tables** | **9** |
| **ambiguous (inline SVG)** | **2** (both `kind: svg`) |

Matches the AC13 expectation (9 tables, 2 inline SVG diagrams, 17 dividers, nested lists, code, links).

## Table fidelity (AC7) — the "dropped rows/columns" fix

All 9 tables, both style modes: **0 ragged rows, 0 truncations.** `table_width` set once from the header row;
every `table_row.cells.length == table_width`.

| Table | table_width | rows |
|---|---|---|
| 1–9 | 2, 2, 2, 4, 2, 3, 2, 2, 3 | 6, 7, 5, 8, 4, 9, 5, 8, 14 |

## Style modes (AC4)

Both `minimal` and `expressive` produce valid output. They are byte-identical **for this document** because it
contains no admonition quotes (the expressive-only trigger for callout/color decoration — the census has zero
`quote` blocks). The `<callout>`/emoji present in both renders come from the **2 SVG ambiguity placeholders**
(structural never-drop fallback), not style decoration. `map-to-notion --selftest` proves `minimal ≠ expressive`
on an admonition fixture.

## Chunking (AC8)

`chunk-blocks` plan: **4 batches** — `create, append, append, append` — block counts **100 / 96 / 97 / 36**
(every batch ≤100). Source-indices covered: **263 unique, contiguous 0…262, no gaps or overlaps** → the resume
cursor (`last_si` per batch) is well-formed.

## Verification (AC11)

`verify-page` with the 2 SVG ambiguities resolved to `stubbed` (placeholder-callout) and simulated full fetch
coverage:

- **Completeness:** 263 / 263 source blocks accounted-for, **0 unaccounted.**
- **Integrity:** **0 findings** (no orphans, every table row == table_width, all code languages + colors
  in-enum, no accidentally-empty blocks).
- **Overall: PASS.**

## Gate summary

- Script selftests: parse-doc 22/0 · map-to-notion 20/0 · chunk-blocks 18/0 · upload-image 19/0 ·
  verify-page 10/0 — **89/0**.
- `skill-eval-check.sh --target claude-code`: **EXIT 0**, 22 checks pass, 0 fail.
- Hygiene: `lint-non-interactive-inline`, `lint-flags-vs-hints`, `lint-phase-refs`, `audit-recommended` — all
  clean (5 AskUserQuestion calls: 4 Recommended + 1 defer-only).
