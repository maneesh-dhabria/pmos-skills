# Plan — Story A · engine & bundled viewer (260624-1e5)

Epic `260624-c62` · route: skill · pmos-toolkit · **foundational engine, no deps**.
Design contract: [`02_design.html`](../../02_design.html) — anchors `#data-model`, `#viewer`,
`#pipeline`, `#story-split`.
Implementation standard: `feature-sdlc/reference/skill-patterns.md §A–§L` (engine/substrate — §H
deterministic work is *script*, never LLM-judged; §K the sidecar schema is the single home Story
`rmq` cites, never forks).

## Overview

Author the deterministic engine + bundled viewer for `/wiki` under
`plugins/pmos-toolkit/skills/wiki/{reference,scripts,tests}/`, with **no `SKILL.md`** (Story
`260624-rmq` authors that and consumes these). The engine must produce a greppable corpus and a
working viewer from a corpus *fixture* with zero LLM enrichment present — proving an interrupted
ingest still yields a usable wiki. All transport/MCP code is out of scope (that is D15, Story B);
these files are source-agnostic.

This is the foundation: Story `rmq` claim-time-merges this branch (D9) so the engine + viewer are
present in its worktree before its `skill-eval`, and calls these scripts rather than reimplementing
them (anti-pattern #6 / §H deterministic-vs-LLM split).

## Files

| File | Purpose |
|---|---|
| `wiki/reference/sidecar-schema.md` | the frozen per-document JSON contract (`02_design.html#data-model`): deterministic + nullable-enriched fields; the single home Story `rmq` cites |
| `wiki/scripts/hash.mjs` | normalized content hash (strip fetch ts, sort frontmatter, collapse whitespace) + two-factor drift (`last_edited` pre-filter → hash confirm; hash-only degrade) |
| `wiki/scripts/stitch.mjs` | byte-exact overflow-stitch (pure byte concat, saved-file mechanism) |
| `wiki/scripts/queue.mjs` | resumable smallest-first checkpointed enrichment queue (no dupes; clean rate-limit halt + resume) |
| `wiki/scripts/retrieval.mjs` | ripgrep+BM25 over sidecars → heading-path citation anchors (block-ID fallback) |
| `wiki/reference/wiki-viewer.html` | zero-dep single-file viewer rendering an embedded corpus JSON (all §6 fold-ins) |
| `wiki/tests/selftest.mjs` | script selftests (hash/stitch/queue/drift/retrieval) — fail-first then green |
| `wiki/tests/viewer.test.*` | viewer fold-in assertions against a corpus fixture + headless dogfood |
| `wiki/tests/fixtures/corpus.sample.json` | a small enriched + half-enriched corpus fixture |

## Approach

TDD: `tests/selftest.mjs` is authored to FAIL-FIRST against empty `scripts/`, then T2–T5 make it
green. The viewer fold-ins (T6) are proven by a fixture render + a headless dogfood (T7) that is the
closing gate. The sidecar schema (T1) is the contract both the scripts and the viewer agree on.
