---
schema_version: 1
id: 260617-vvd
kind: epic
title: "/converter — convert files between formats (JSON↔YAML, CSV↔JSON, HTML↔MD, PDF↔MD) via a single-file web UI + zero-dep Node server"
type: feature
status: released
priority: should
labels: [pmos-utilities, converter, web-ui, tooling]
route: skill
created: 2026-06-17
updated: 2026-06-18
defined: 2026-06-17
source: docs/pmos/features/2026-06-17_converter/02_design.html
feature_folder: docs/pmos/features/2026-06-17_converter/
design_doc: docs/pmos/features/2026-06-17_converter/02_design.html
parent:
dependencies: []
released: v0.3.0
---

## Context

`/converter` is a new launch-only `pmos-utilities` skill (D1) that starts a tiny **zero-dependency**
Node server and opens a **single self-contained HTML page** where a PM converts one file format into
another. v1 ships four bidirectional pairs (8 directions): **JSON↔YAML, CSV↔JSON, HTML↔MD, PDF↔MD**.

Architecturally it mirrors the `pmos-gamekit` launch pattern (single-file HTML + zero-dep loopback
server, ephemeral port, Ctrl-C stops, Node-prerequisite hard error — D7) plus a `/convert` backend.
Everything is built around a **converter registry** (D3): the single extension point, so a new
conversion is one lib module with zero server/UI edits (Inv-1). "No dependencies" = no npm packages;
Node built-ins + the optional host `claude` CLI only (D6).

Conversion runs **server-side in Node** (D2) so converter modules stay pure and headlessly testable and
can use built-in `zlib`/`Buffer`/`child_process`. Two backend kinds (D4): `pure` (deterministic vendored
libs — 7 of 8 directions) and `llm` (the `claude` subprocess — only `pdf→md`).

**PDF is hybrid (D5):** `pdf→md` shells out to the `claude` CLI (best quality; vendored FlateDecode
text-extractor fallback if the CLI is absent — Inv-5), while `md→pdf` uses a vendored standard-14-font
PDF writer because Claude can't emit a binary PDF. PDF scope is text-only — no OCR/scanned/complex tables
(D11). Full FRs, the registry/descriptor contract, vendored-lib scopes, decisions (D1–D12), and the
coherence invariants (Inv-1..Inv-6) live in the `design_doc:` (02_design.html).

## Story split

- **260617-7ag** — Foundation + data pair: skill scaffold, zero-dep `server.js`, single-file UI, the
  **registry**, `lib/yaml.js` + `lib/csv.js`, JSON↔YAML + CSV↔JSON descriptors, test harness. `route: skill`,
  no deps. Ships a working 2-pair skill. (The substrate S2/S3 depend on.)
- **260617-rck** — Document pair HTML↔MD: `lib/markdown.js` + `lib/html-parser.js` + descriptors + tests.
  `route: skill`, depends on `260617-7ag`.
- **260617-ade** — PDF pair PDF↔MD: vendored `lib/pdf-writer.js` (md→pdf), the `claude` seam +
  `lib/pdf-text.js` fallback (pdf→md), descriptors, UI `llm` badge, tests (mocked backend). `route: skill`,
  depends on `260617-7ag`. Independent of `260617-rck`.

## Acceptance Criteria

- `/converter` launches a local zero-dep Node server and opens a single self-contained HTML page; Ctrl-C stops it; missing Node is a hard error with no silent `file://` fallback (D7, Inv-4/Inv-5).
- All four pairs convert both ways in the UI: JSON↔YAML, CSV↔JSON, HTML↔MD, PDF↔MD (8 directions).
- The conversion selector is built entirely from the registry's `/conversions` list — adding a conversion needs only a new `lib/converters/*` module, no server/UI edits (Inv-1).
- `pdf→md` uses the `claude` CLI when available and degrades to the vendored extractor (with a quality caveat) when not; `md→pdf` produces a valid `%PDF` file via the vendored writer (D5).
- Zero npm dependencies — Node built-ins + optional host `claude` CLI only; a test asserts empty `dependencies` (D6, Inv-3).
- Each `pure` converter is deterministic and covered by golden + round-trip tests; the `llm` converter is tested with a mocked backend + a fallback-path test (no live API call); the server `/conversions` + `/convert` endpoints are tested.
- SKILL.md + code conform to `skill-patterns.md §A–§L` and host `CLAUDE.md` (canonical skill path `plugins/pmos-utilities/skills/converter`, non-interactive inline block per the lint). Version-bump/changelog/README are `/complete-dev`'s, not story tasks.

## Out of scope (v1)

OCR / scanned-image PDFs, multi-column/complex-table PDF layout (D11); full YAML 1.2 anchors/aliases/tags/
multi-doc (D9); lossless Markdown round-trips for every construct (D10); auth/multi-user/cloud/persistence;
a dedicated `pmos-convertkit` plugin (D1 runner-up, deferred).
