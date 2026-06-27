# /to-notion-doc — live dogfood conversion report (AC13)

**Source:** `…/porter/pm-docs/metrics-store/pov/pov_v6.html` (858 lines, 79,402 bytes — the maintainer's POV
doc; its **content is never committed**, only this report + the reconciliation below).
**Run:** 2026-06-27, build of story 260626-sbf.

## What ran

The full **deterministic** pipeline end-to-end against the real document:
`parse-doc.mjs` → `map-to-notion.mjs` (both styles) → `chunk-blocks.mjs` → `verify-page.mjs`.

During the unattended build run, the live Notion **MCP write** was intentionally deferred: creating pages in
the maintainer's real Notion workspace is an outward-facing, hard-to-reverse action requiring an interactive
parent-page confirmation (Phase 3, the `defer-only` parent pick). It was **subsequently executed interactively**
once the maintainer was present and authorized it — see "Live MCP write" below.

## Live MCP write (interactive, 2026-06-27)

With maintainer authorization, the full write path ran end-to-end against the connected workspace ("Maneesh",
`maneesh.dhabria@gmail.com`, confirmed via `notion-fetch id:self`). To avoid writing into any shared/parented
location, the page was created as a **standalone workspace-level private page** (no parent), title
"Porter Metrics Store — POV v6 (to-notion-doc dogfood)", icon 📄.

- **Write:** `notion-create-pages` (batch 0 = create) + 3× `notion-update-page insert_content position:end`
  (batches 1–3) — the exact 4-batch plan `chunk-blocks` emitted (100 / 96 / 97 / 36).
- **Structural re-verification** (`notion-fetch` → compare against the offline census): **9 tables**, widths in
  document order **2, 2, 2, 4, 2, 3, 2, 2, 3** — exact match; all headings (Exec summary → Annexure K) and
  the 281-row V1-scope table present.
- **One fidelity drift caught + fixed:** the **2 SVG placeholder callouts** initially did not render — Notion's
  NFM parser choked on a `<br>` inside `<callout>…</callout>` and fell back to escaped literal text, leaving
  stray `</callout>` text blocks. Fixed in place via `notion-update-page update_content` and deleted the
  orphaned closers; post-fix fetch shows both as proper callout blocks.
  **Root cause + skill fix (structural, applied):** the bug was the inline `<br>` right after the opening tag —
  **not** multi-line nesting, which the NFM spec explicitly supports. The renderer (`map-to-notion.mjs`) now
  emits the spec-correct **tab-indented multi-line** form for all callouts (image stub, ambiguity placeholder,
  expressive admonitions):
  ```
  <callout icon="🖼">
  	Body text
  </callout>
  ```
  A regression selftest asserts no `<callout…><br>` is ever produced. See `reference/notion-blocks.md` §1
  ("Callout form — no inline `<br>`").

### Structural skill fixes applied (post-dogfood feedback, 2026-06-27)

Five structural issues the maintainer flagged on the rendered page were fixed in the skill (not just this doc):

1. **Callout `<br>` renderer bug** — above; tab-indented multi-line form + regression test.
2. **Table full-width** — `fit-page-width="true"` already emitted on every table; added a regression selftest
   (`fit-page-width` count == `<table>` count) and documented in §3 that a narrow few-column table is a Notion
   *client* layout choice, not a missing attribute.
3. **Rich tags inside section headers** (e.g. "Query metrics Nowad-hoc/metric-query") — `parse-doc.mjs` now
   detects decorative inline tags/badges/chips/`<code>` in a heading and lifts them to a metadata paragraph
   below, leaving the heading title clean.
4. **Table of contents** — parser detects a source TOC (`<nav>`/`.toc`/anchor-link list) and the skill (Phase 1)
   asks: Notion native `<table_of_contents/>` (recommended) / replicate as list / omit (`--toc` flag overrides).
5. **Section dividers** — new `section_dividers` preference (asked first-run, default off; `--dividers`/
   `--no-dividers` override) inserts a rule before each top-level section heading when on.

All five are covered by selftests (parse-doc 29/0, map-to-notion 35/0; suite 111/0), the 4 hygiene lints,
audit-recommended, and skill-eval (`--target claude-code` EXIT 0).

The page content itself (the maintainer's POV) is **never committed** — only this report and the reconciliation
above.

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
