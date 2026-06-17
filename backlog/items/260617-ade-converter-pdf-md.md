---
schema_version: 1
id: 260617-ade
kind: story
parent: 260617-vvd
title: "/converter PDF pair — PDF↔MD (claude subprocess for pdf→md + vendored fallback; vendored standard-14 PDF writer for md→pdf)"
type: feature
priority: should
route: skill
dependencies: [260617-7ag]
plugin: pmos-utilities
status: planned
feature_folder: docs/pmos/features/2026-06-17_converter/
plan_doc: docs/pmos/features/2026-06-17_converter/stories/260617-ade/03_plan.html
tasks: docs/pmos/features/2026-06-17_converter/stories/260617-ade/tasks.yaml
worktree:
claimed_by:
driver_holder:
labels: [pmos-utilities, converter, pdf, llm]
created: 2026-06-17
updated: 2026-06-17
---

<!-- status: planned at define (Loop 1); tasks.yaml authored, route:skill. Build via /skill-sdlc build --story 260617-ade. Depends on 260617-7ag (registry); independent of 260617-rck. -->

## Context

Adds the PDF↔MD pair to `/converter` (epic 260617-vvd) — the hardest pair, deliberately isolated as its
own story. It introduces the `llm` backend kind alongside `pure` (D4). `pdf→md` shells out to the host
`claude` CLI via a **mockable seam** (`runClaudePdfToMd(pdfBuffer)→md`), degrading to the vendored
`lib/pdf-text.js` FlateDecode extractor when the CLI is absent (Inv-5); `md→pdf` uses the vendored
standard-14-font `lib/pdf-writer.js` because Claude can't emit a binary PDF (D5). PDF scope is text-only
(D11). Builds against the registry from 260617-7ag (merged in at claim time, D9); independent of the
HTML↔MD story. Cross-skill contract lives in the `design_doc:` (../../02_design.html). One `/execute` run.

## Acceptance Criteria

- **AC1 (md→pdf, pure / D5):** `lib/pdf-writer.js` produces a valid `%PDF` file from Markdown using the 14 standard base fonts (no embedding) with AFM-metric word-wrap; renders headings (by size), paragraphs, lists, blockquotes, and code blocks (Courier). Reuses S2's markdown block model when present, else a minimal inline block parser. No images/complex tables (D11). Descriptor `md→pdf` (`pure`, text→binary).
- **AC2 (pdf→md primary, llm / D5):** a mockable `runClaudePdfToMd(pdfBuffer)→md` seam writes the PDF to `os.tmpdir()` and invokes the `claude` CLI to extract Markdown; descriptor `pdf→md` is `kind:'llm'`, `requires:['claude-cli']`, binary→text. Temp files cleaned up on success and on error (OQ4).
- **AC3 (pdf→md fallback, Inv-5):** when the `claude` CLI is absent or errors, `pdf→md` falls back to the vendored `lib/pdf-text.js` (parse xref/objects, inflate FlateDecode via built-in `zlib`, extract `Tj`/`TJ` text, basic paragraph reconstruction) and surfaces a quality caveat in the response — never crash/hang.
- **AC4 (UI badge, Inv-1):** the `llm` descriptor's `kind`/`requires` drive a UI badge ("Uses Claude — needs the CLI + network") built purely from `/conversions` data — no hardcoding; registered with no `server.js`/UI structural edits beyond the generic badge-from-descriptor rendering.
- **AC5 (tests, no live API):** `pdf→md` tested with the `runClaudePdfToMd` seam mocked (canned MD) **and** a fallback-path test (claude absent → vendored extractor invoked); `md→pdf` tested structurally (output begins `%PDF-`, has xref/trailer, opens). No live `claude` call in the test suite. Plus the load-bearing dogfood: convert a real text PDF → MD (live claude if available, else fallback) and a real MD doc → a downloadable PDF in-browser.
- **AC6 (conformance):** conforms to `skill-patterns.md §A–§L` + host `CLAUDE.md`; no version-bump/changelog/README tasks.
