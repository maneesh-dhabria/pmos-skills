---
schema_version: 1
id: 260624-rmq
kind: story
parent: 260624-c62
title: "The /wiki skill — SKILL.md with five verbs (add/sync/view/ask/curate) + generic instruction-driven MCP adapter (agent tool-discovery + auth-on-missing, no per-tool code) + resumable enrichment pipeline + incremental understanding-layer re-derivation + grounded ripgrep+BM25 Q&A + curate/classification + non-interactive contract; consumes the 260624-1e5 engine"
type: feature
priority: should
route: skill
dependencies: [260624-1e5]
plugin: pmos-toolkit
status: in-progress
feature_folder: docs/pmos/features/2026-06-24_wiki/
plan_doc: docs/pmos/features/2026-06-24_wiki/stories/260624-rmq/03_plan.md
tasks: docs/pmos/features/2026-06-24_wiki/stories/260624-rmq/tasks.yaml
worktree: .claude/worktrees/feat-260624-rmq
claimed_by: build:6681ff46-e6d7-4cb7-854d-4ca3ea2b44ff
driver_holder: build:6681ff46-e6d7-4cb7-854d-4ca3ea2b44ff
labels: [pmos-toolkit, wiki, skill, mcp, qa, new-skill]
created: 2026-06-24
updated: 2026-06-24
---

## Story

Author `plugins/pmos-toolkit/skills/wiki/SKILL.md` and the verb behaviours that drive the engine built in
`260624-1e5`. This story owns everything LLM-side: MCP fetch + enrichment authoring + classification +
citation phrasing + the user-facing command surface. Depends on `260624-1e5` (D9 claim-time dep-merge brings
the engine scripts + viewer skeleton into this worktree before `skill-eval`).

Scope is fixed by `02_design.html` §5 (verb set), §7 (generic-MCP pipeline + incremental re-derivation),
§3 (D15/D16/D17), and §9 (story B row). Cites `design_doc:` anchors `#skill-shape`, `#decisions`,
`#pipeline`, `#story-split`.

## Acceptance criteria

1. **`SKILL.md` with five verbs**, `add` ≠ `sync` (`02_design.html#skill-shape`): `add/ingest`
   `<page>[,…] [--depth N]` (everyday ingest, hub fan-out), `sync/refetch` `[<page>|--all]` (manual drifted
   re-crawl + incremental re-derivation), `view/browse` `[<ws>|--all]` (emit + open the bundled viewer),
   `ask` `[<ws>|--all] "<q>"` (grounded cited answer), `curate` (re-tag/exclude/promote/accept-reject vocab).
2. **Generic MCP protocol (D15)** — the body identifies a page's source, discovers the available MCP tools
   against a generic `fetch / search / extract-links` contract, **prompts the user to authenticate** when the
   source's MCP is unauthenticated (clean halt + resume), and surfaces an absent MCP honestly. **No
   per-tool/per-source adapter code.**
3. **Resumable pipeline (D9)** — mirror + deterministic sidecar (via the engine) land before any LLM
   enrichment; queued smallest-first enrichment halts cleanly on a usage cap and resumes at the next
   un-enriched doc, no dupes. Anti-slop summary contract enforced (metrics-with-numbers, ban "this document
   covers…").
4. **Understanding layer (D6) + incremental re-derivation (§7)** — topic pages / primer / glossary /
   entity index are derived-with-citations and re-derived **only** for artifacts whose dependency set
   includes a changed doc on `sync`.
5. **Q&A (D13/D17)** — `ask` returns a grounded, cited answer via the engine's ripgrep+BM25 retrieval with
   heading-path citation anchors, scoped by workstream or `--all`.
6. **Workstream inference (D16)** — inferred at ingest from hub-provenance + corpus tag-overlap; low-confidence
   → `uncategorized`, never force-tagged; user-editable via `curate`.
7. **Confidentiality (D12)** — substrate gitignored by default + a visible warning; **not** a fail-closed gate.
8. **Conventions** — inlined non-interactive block byte-identical to `skills/_shared/non-interactive.md`;
   every `AskUserQuestion` `(Recommended)`-tagged or `defer-only`-marked; §H–§L skill-patterns compliance.
   Passes `skill-eval` (the binary rubric), the 4 hygiene lints, `audit-recommended.sh`, and a live
   ingest→view→ask dogfood.
