---
schema_version: 1
id: 260617-rck
kind: story
parent: 260617-vvd
title: "/converter document pair — HTML↔MD (vendored markdown + tolerant HTML parser)"
type: feature
priority: should
route: skill
dependencies: [260617-7ag]
plugin: pmos-utilities
status: planned
feature_folder: docs/pmos/features/2026-06-17_converter/
plan_doc: docs/pmos/features/2026-06-17_converter/stories/260617-rck/03_plan.html
tasks: docs/pmos/features/2026-06-17_converter/stories/260617-rck/tasks.yaml
worktree:
claimed_by:
driver_holder:
labels: [pmos-utilities, converter, markdown, html]
created: 2026-06-17
updated: 2026-06-17
---

<!-- status: planned at define (Loop 1); tasks.yaml authored, route:skill. Build via /skill-sdlc build --story 260617-rck. Depends on 260617-7ag (claim-time merge brings the registry into the worktree). -->

## Context

Adds the HTML↔MD document pair to `/converter` (epic 260617-vvd) by registering two new `pure`
descriptors against the **existing registry** built in 260617-7ag — zero server/UI edits (Inv-1). All
new logic is vendored, zero-dep, and headlessly testable. Cross-skill contract and the markdown/HTML
scope (D10) live in the `design_doc:` (../../02_design.html). One `/execute` run; depends on the
foundation story (its branch is merged into this worktree at claim time, D9).

## Acceptance Criteria

- **AC1 (markdown lib, D10):** `lib/markdown.js` exports `mdToHtml(md)→html` and `htmlToMd(html)→md` over the CommonMark-ish subset (headings, emphasis, inline code, links, images, lists, blockquotes, fenced code, hr, basic tables); exposes the block model that S3's `pdf-writer.js` will reuse.
- **AC2 (HTML parser, D2):** `lib/html-parser.js` is a small tolerant HTML tokenizer → lightweight node tree (no server-side DOMParser), walked by `htmlToMd`; handles malformed/partial HTML without throwing.
- **AC3 (descriptors, Inv-1):** `lib/converters/html-md.js` registers `html→md` and `md→html` (both `pure`, text↔text); they appear in `/conversions` and work end-to-end in the UI with **no edits to `server.js` or `ui/converter.html`** (proves the registry extension contract).
- **AC4 (purity, Inv-2):** both converters are pure — no network/fs/DOM/global state; deterministic.
- **AC5 (tests):** `tests/run.mjs` gains golden cases for both directions + a `md→html→md` stability check over the canonical subset (documented lossy edges asserted, not silently dropped); `/convert` round-trip tests for the new descriptors. Plus the load-bearing dogfood (convert a real HTML page → MD and a real MD doc → HTML in-browser).
- **AC6 (conformance):** conforms to `skill-patterns.md §A–§L` + host `CLAUDE.md`; no version-bump/changelog/README tasks.
