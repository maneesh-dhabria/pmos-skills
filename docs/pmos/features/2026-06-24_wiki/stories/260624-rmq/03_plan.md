# Plan — Story B · the /wiki skill (260624-rmq)

Epic `260624-c62` · route: skill · pmos-toolkit · **depends on `260624-1e5`** (engine + viewer).
Design contract: [`02_design.html`](../../02_design.html) — anchors `#skill-shape`, `#decisions`,
`#pipeline`, `#story-split`.
Implementation standard: `feature-sdlc/reference/skill-patterns.md §A–§L` (a user-invocable skill —
the full rubric: frontmatter/triggering, progressive disclosure, §H gates, §I NL-first flags, §J
phases, §K one-home, §L subagent dispatch). Scored against `reference/skill-eval.md`.

## Overview

Author `plugins/pmos-toolkit/skills/wiki/SKILL.md` and the verb behaviours that drive the engine from
`260624-1e5`. This story owns everything LLM-side — MCP fetch + enrichment authoring + classification +
citation phrasing + the command surface — and calls the engine scripts (never reimplements them: §H,
anti-pattern #6). D9 claim-time dep-merge brings the engine + viewer skeleton into this worktree before
`skill-eval`.

The defining design constraint is **D15 — no per-tool MCP adapter code.** The body discovers the right
MCP tools for a page's source at run time against a generic `fetch / search / extract-links` contract
and prompts auth on a missing MCP; the deterministic helpers stay transport-free.

## Files

| File | Purpose |
|---|---|
| `wiki/SKILL.md` | the skill — five verbs, generic MCP protocol, resumable pipeline, incremental re-derivation, Q&A, curate, non-interactive contract, phases |
| `wiki/reference/mcp-protocol.md` | the generic `fetch/search/extract-links` contract + tool-discovery + auth-on-missing prose (D15) |
| `wiki/reference/enrichment-contract.md` | the anti-slop summary + section-summary + glossary + classification authoring contract |
| `wiki/tests/dogfood/` | a live ingest→view→ask dogfood (recorded MCP fixture or a local-doc source) |

## Approach

The verbs sit on the engine: `add`/`sync` orchestrate discover-MCP → mirror+sidecar (engine) → queued
enrichment (body) → incremental re-derivation (only artifacts whose citation set includes a changed doc);
`view` emits the bundled viewer with the corpus injected; `ask` calls `retrieval.mjs` and phrases a cited
answer; `curate` edits the inferred workstream/exclude/vocab. The closing gate is `skill-eval` + the 4
hygiene lints + `audit-recommended.sh` + the live dogfood. Per-story spec residuals (auth-prompt copy,
taxonomy bootstrap prompt) are pinned in T1/T2 below.
