---
schema_version: 1
id: 260617-7ag
kind: story
parent: 260617-vvd
title: "/converter foundation + data pair — skill scaffold, zero-dep server, single-file UI, converter registry, JSON↔YAML + CSV↔JSON"
type: feature
priority: should
route: skill
dependencies: []
plugin: pmos-utilities
status: in-progress
feature_folder: docs/pmos/features/2026-06-17_converter/
plan_doc: docs/pmos/features/2026-06-17_converter/stories/260617-7ag/03_plan.html
tasks: docs/pmos/features/2026-06-17_converter/stories/260617-7ag/tasks.yaml
worktree: .claude/worktrees/feat-260617-7ag
claimed_by: build:loop-main
driver_holder: build:loop-main
labels: [pmos-utilities, converter, web-ui]
created: 2026-06-17
updated: 2026-06-18
---

<!-- status: planned at define (Loop 1); tasks.yaml authored, route:skill. Build via /skill-sdlc build --story 260617-7ag -->

## Context

The foundation story for `/converter` (epic 260617-vvd). It builds the whole launch + server + UI +
**registry** substrate that S2 (260617-rck) and S3 (260617-ade) extend, and ships a working skill with the
two pure data-format pairs (JSON↔YAML, CSV↔JSON). Cross-skill contract, registry/descriptor shape, and
invariants are in the `design_doc:` (../../02_design.html). One `/execute` run.

## Acceptance Criteria

- **AC1 (launch, D7):** `/converter` SKILL.md is launch-only; resolves + runs `server.js`; asserts Node present (hard error, no silent `file://` fallback); reports the `http://127.0.0.1:<port>/` URL; Ctrl-C stops. Canonical skill path `plugins/pmos-utilities/skills/converter`. (Inv-4/Inv-5)
- **AC2 (zero-dep server, D2):** `server.js` uses only Node built-ins (`http,fs,path,url,crypto,os`); loopback + ephemeral port; serves `GET /` (the single-file UI), `GET /conversions` (registry list), `POST /convert`.
- **AC3 (registry, D3/Inv-1):** `lib/registry.js` exposes `register()` + auto-discovery of `lib/converters/*.js` + lookup; `GET /conversions` returns the descriptor list; the UI builds its selector from it. Adding a conversion = one new descriptor module, zero server/UI edits.
- **AC4 (single-file UI, Inv-4):** `ui/converter.html` is one self-contained file (inline CSS/JS, no external refs/CDN/build); supports both a paste text-area and file upload/drag-drop (OQ1); registry-driven conversion selector; output preview + download; binary output handled per descriptor mode (Inv-6).
- **AC5 (JSON↔YAML, pure):** `lib/yaml.js` `parse`/`stringify` over the D9 subset (maps/seqs/scalars/flow+block, comment-tolerant parse, safe quoting); descriptors `json→yaml`, `yaml→json` registered and working end-to-end.
- **AC6 (CSV↔JSON, pure):** `lib/csv.js` RFC-4180 parse (quoted fields, embedded commas/newlines/escaped quotes, header→objects) + serialize; descriptors `csv→json`, `json→csv` registered and working end-to-end.
- **AC7 (tests, D7-test):** `tests/run.mjs` covers per-lib golden + round-trip (`parse(stringify(x)) deepEqual x` for yaml; csv↔json fixtures) + server endpoint tests (`/conversions` returns the registry; `/convert` round-trips a sample per converter). A test asserts zero npm `dependencies` (Inv-3). Plus the mandatory load-bearing dogfood (launch + convert a real sample per pair in-browser).
- **AC8 (conformance):** SKILL.md + code conform to `skill-patterns.md §A–§L` and host `CLAUDE.md`; non-interactive inline block per the lint. No version-bump/changelog/README tasks (those are `/complete-dev`'s).
