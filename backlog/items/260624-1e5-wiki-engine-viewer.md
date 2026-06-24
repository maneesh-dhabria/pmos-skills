---
schema_version: 1
id: 260624-1e5
kind: story
parent: 260624-c62
title: "Engine & bundled viewer — deterministic helper scripts (normalized-hash, byte-exact overflow-stitch, resumable smallest-first queue, two-factor drift, ripgrep+BM25 retrieval) + zero-dep single-file wiki-viewer skeleton (skim mode, section summaries, time/workstream/exclude facets, glossary, created/modified header, title toggle, external-link surfacing, inline-comment annotations) + frozen sidecar/data-model schema + selftests; no SKILL.md"
type: feature
priority: should
route: skill
dependencies: []
plugin: pmos-toolkit
status: planned
feature_folder: docs/pmos/features/2026-06-24_wiki/
plan_doc: docs/pmos/features/2026-06-24_wiki/stories/260624-1e5/03_plan.md
tasks: docs/pmos/features/2026-06-24_wiki/stories/260624-1e5/tasks.yaml
worktree:
claimed_by:
driver_holder:
labels: [pmos-toolkit, wiki, engine, viewer, substrate, new-substrate]
created: 2026-06-24
updated: 2026-06-24
---

## Story

Build the deterministic engine and the bundled viewer for `/wiki`, as files under
`plugins/pmos-toolkit/skills/wiki/{reference,scripts,tests}/` with **no `SKILL.md`** (Story 260624-rmq
authors that and consumes these). This is the independently-shippable, self-tested half: it must produce a
greppable corpus and a working viewer from a corpus fixture without any LLM enrichment present.

Scope is fixed by `02_design.html` §4 (data model / frozen sidecar schema), §6 (viewer fold-ins), §7
(deterministic-vs-LLM split, incremental re-derivation), and §9 (story A row). Cites `design_doc:` anchors
`#data-model`, `#viewer`, `#pipeline`, `#story-split`.

## Acceptance criteria

1. **Frozen sidecar/data-model schema** (`reference/`) — the per-document JSON contract from
   `02_design.html#data-model`: deterministic fields (`src`, `id`, `source_hash`, `created`, `last_edited`,
   `length_tier`, `ancestor_path`, `original_title`, `section_offsets`) + nullable enriched fields
   (`summary`, `section_summaries[]`, `glossary_terms[]`, `external_links[]`, `llm_title`, `workstream`,
   `workstream_confidence`, `exclude`, `citation_anchors[]`). A half-enriched sidecar (enriched fields null)
   validates.
2. **Deterministic helper scripts** (`scripts/`), each pure + selftested, never reimplemented by the skill body:
   normalized content hash (strips fetch timestamp, sorts frontmatter, collapses whitespace; degrades to
   hash-only when `last_edited` absent — two-factor drift, D10); byte-exact overflow-stitch (pure byte
   concat, corruption-proof, saved-file mechanism); resumable smallest-first queue with checkpoint (no dupes;
   a rate-limit halt leaves a resumable state); ripgrep+BM25 retrieval over sidecars returning heading-path
   citation anchors (D17).
3. **Zero-dep single-file wiki-viewer skeleton** (`reference/`) — renders an embedded corpus JSON with:
   skim mode (summary-only, doc-by-doc), per-H1/H2 section summaries, time + workstream + exclude facets,
   a glossary section, a created/last-modified header under each title, an LLM-vs-original title toggle,
   external-reference links surfaced per summary, and inline-comment annotation threads that persist in the
   HTML. `exclude`-flagged docs hidden by default, restorable.
4. **Selftests** (`tests/`) — script selftests (hash/stitch/queue/drift/retrieval) all green; a viewer
   selftest asserting each fold-in renders against a corpus fixture; a live viewer dogfood (headless) proving
   skim toggle, a facet filter, and an annotation round-trip with zero console errors.
5. **No `SKILL.md`** in this story; engine files are source-agnostic (no MCP/transport code — that is D15,
   Story B). Verified by the story's selftest/eval gate + the 4 repo hygiene lints where applicable.
