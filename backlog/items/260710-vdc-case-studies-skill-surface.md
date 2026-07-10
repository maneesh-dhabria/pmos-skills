---
schema_version: 1
id: 260710-vdc
title: "/case-studies skill surface — SKILL.md (token-dispatch browse/retrieve + frozen non-interactive block), build-library.mjs viewer as a thin adapter over the shared library-viewer substrate (columns reader; pillar/topics/region/artifact_type/year facets), match.mjs deterministic prefilter + LLM re-rank returning a chat shortlist AND an offer to open the filtered viewer, a --json contract at /frameworks parity, reference docs, and tests"
type: feature
kind: story
status: in-progress
route: skill
priority: should
labels: [pmos-learnkit, case-studies, skill, library-viewer]
created: 2026-07-10
updated: 2026-07-11
claimed_by: "build:0d5e385f-c675-46f6-a126-345344fa277d"
driver_holder: "build:0d5e385f-c675-46f6-a126-345344fa277d"
worktree: .claude/worktrees/feat-260710-vdc
parent: 260710-4bh
feature_folder: docs/pmos/features/2026-07-10_case-studies-skill/
design_doc: docs/pmos/features/2026-07-10_case-studies-skill/02_design.html
plan_doc: docs/pmos/features/2026-07-10_case-studies-skill/stories/260710-vdc/03_plan.html
tasks_file: docs/pmos/features/2026-07-10_case-studies-skill/stories/260710-vdc/tasks.yaml
dependencies: [260710-a2b]
---

## Context

Story B of epic 260710-4bh. The skill surface built on Story A's frozen corpus: the `/case-studies` SKILL.md, the
viewer builder (thin adapter over the shared substrate), the topic-match retrieve path (chat shortlist + offer to
open the filtered viewer), the `--json` programmatic contract, reference docs, and tests.

Depends on 260710-a2b — the D9 claim-time dep-merge brings `data/case-studies.json`, `corpus-vocab.mjs`, and
`validate-corpus.mjs` into this story's worktree before build, so the viewer/match build against the real corpus.

`route: skill` — runs skill-tier-resolve → execute → skill-eval → verify. Coherence contract: `02_design.html` —
INV-1..7, D1..D8, viewer, matching, change surface.

## Change surface

- `plugins/pmos-learnkit/skills/case-studies/SKILL.md`
- `plugins/pmos-learnkit/skills/case-studies/scripts/build-library.mjs`
- `plugins/pmos-learnkit/skills/case-studies/scripts/match.mjs`
- `plugins/pmos-learnkit/skills/case-studies/reference/matching.md`
- `plugins/pmos-learnkit/skills/case-studies/reference/corpus-expansion.md`
- `plugins/pmos-learnkit/skills/case-studies/tests/structure.test.sh`
- `plugins/pmos-learnkit/skills/case-studies/tests/build-library.test.sh`
- `plugins/pmos-learnkit/skills/case-studies/tests/json-contract.test.mjs` (+ mini fixture)

## Acceptance Criteria

- [ ] `SKILL.md` frontmatter: `name: case-studies`, `user-invocable: true`, a description with clear triggers
  ("browse case studies", "case studies about X", "how did companies do Y", "/case-studies"), and
  `argument-hint: "[\"<topic>\" | browse | list] [--json] [--non-interactive] [--interactive]"`. The frontmatter
  `name` matches the directory (a-name-matches-dir).
- [ ] Phase 1 resolves the command on the **first token**: `browse`|`list`|bare → Browse; `--json` is parsed off as
  a modifier valid only on retrieve; anything else → Retrieve. Body stays lean, deep mechanics disclosed into
  `reference/` (§A–§L, INV-7).
- [ ] The frozen non-interactive block is inlined **byte-identical** to `skills/_shared/non-interactive.md`
  (lint-non-interactive-inline.sh green). Every `AskUserQuestion` (e.g. the "open the filtered viewer?" offer)
  carries a `(Recommended)` option or a `defer-only` tag (audit-recommended.sh green).
- [ ] `build-library.mjs` imports only the substrate's public API from `../../_shared/library-viewer/lib.mjs`,
  supplies a `toCard` + strict `ALLOWED` whitelist, the facet config
  (pillar single-select group; topics/region/artifact_type multi-dropdown; year; quantified toggle), the
  `columns` reader composing the four prose blocks + a "Read the original ↗" link to `url`, and a dynamic
  `DATA.length` masthead count. Emits one self-contained offline `library.html` (atomic write) to
  `{docs_path}/case-studies/library.html`; then best-effort opens it and prints the `file://` path. `--selftest`
  asserts no `<img>`, no external asset, no ES module in the emitted JS (INV-1, D1, D6).
- [ ] `match.mjs --query "<topic>"` scores the corpus (topics ×3, title/company ×2, summary/what_they_built ×1),
  normalizes to [0,1], returns top ~15 nonzero candidates tie-broken by id; a confidence floor (default 0.15) caps
  low-signal queries to ≤2 with a caveat; zero-score → empty pool. Exports the tokenizer/scorer/`toJsonContract`.
- [ ] `--json` emits exactly one object to stdout, no prose, no library open:
  `{query,count,low_confidence,reranked,matches[{id,title,company,why,score,pillar,topics,url}]}`, `count` ≤5,
  `score ∈ [0,1]`, `url` always present. `reranked:false` from the script alone. Proven by `json-contract.test.mjs`
  over a fixture corpus (D4, INV-5).
- [ ] The chat retrieve path re-ranks the ≤15 pool in-session, writes a ≤1-sentence "why it fits" per pick, caps at
  5, and then offers via `AskUserQuestion` to open the viewer filtered to the query's dominant topic/pillar (D2).
- [ ] `reference/matching.md` (weights, floor, pool semantics, full `--json` contract) and
  `reference/corpus-expansion.md` (re-run the importer to refresh; direct-authoring recipe; validator gate; DoD)
  are present and cited from the lean body.
- [ ] No edits to `_shared/library-viewer/lib.mjs` or any sibling skill (INV-6). Both halves of `skill-eval.md`,
  all four hygiene lints (flags-vs-hints, phase-refs, non-interactive-inline, recommended-audit), and the skill's
  own tests are green. `skill-eval` target is `claude-code`.
- [ ] Release prerequisites (README row, pmos-learnkit manifest bump) are listed under the plan's
  `## Release prerequisites` only — NOT in any wave (Loop 3 /complete-dev owns them).
