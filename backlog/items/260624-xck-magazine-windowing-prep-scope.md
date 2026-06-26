---
schema_version: 1
id: 260624-xck
kind: story
title: "/magazine windowing flags (days/since/until + date range) + loud unknown-flag + prep snapshot-scoping"
type: feature
status: done
released: v0.30.0
priority: should
labels: [pmos-learnkit, magazine]
route: skill
created: 2026-06-24
updated: 2026-06-25
status_note: "built 2026-06-25 Loop-2 (build commit 394f9fd2 on feat/260624-xck); all gates green, judge SHIP"
claimed_by:
driver_holder:
worktree:
plan_doc: docs/pmos/features/2026-06-24_magazine-pipeline-robustness/stories/260624-xck/03_plan.html
tasks_file: docs/pmos/features/2026-06-24_magazine-pipeline-robustness/stories/260624-xck/tasks.yaml
parent: 260624-2bm
dependencies: []
spec: docs/pmos/features/2026-06-24_magazine-pipeline-robustness/02_design.html
feature_folder: docs/pmos/features/2026-06-24_magazine-pipeline-robustness/stories/260624-xck/
---

## Context

Resolves findings **#1 (blocker)**, **#2 (blocker)**, and **#6 (feature)** — the `discover`/`prep` call-site
cluster in `plugins/pmos-learnkit/skills/magazine/scripts/magazine-run.js` + `fetch-feed.js` + the windowing
docs (`SKILL.md` Phase 2/3, `reference/pipeline.md` §Windowing). Implements design decisions **D1** (native
window flags) and **D2** (snapshot-scoped prep). See `spec:` (02_design.html) for the grounded pre-flight,
FR-1.x / FR-2.x / FR-6.x, and the invariants.

## Acceptance criteria

- [x] **AC1 (FR-1.1, FR-6.1, D7):** `magazine-run.js discover` natively parses an **explicit window** — the date
  aliases `--from <YYYY-MM-DD>` / `--to <YYYY-MM-DD>` and the ISO `--since <ISO>` / `--until <ISO>`
  equivalents — plus `--days N` sugar (trailing window `now − N days` .. now). It resolves a **lower bound**
  (interactive precedence: explicit `--from`/`--since` > `--days`; **no cursor/unbounded fallback** on the
  interactive path) and an **optional upper bound** (`--to`/`--until`); both bounds are passed per-feed.
- [x] **AC2 (FR-6.2):** `fetch-feed.js` filters each item by the upper bound as well as the lower bound (today it
  applies only the lower bound). Range semantics (inclusive endpoints, ISO + bare-date parsing) are documented
  and selftested.
- [x] **AC3 (FR-1.2):** `parseOpts` **rejects an unrecognized `--`-prefixed flag loudly** — non-zero exit + a
  stderr message naming the flag — instead of silently dropping it (the silent-drop is what hid #1). The four
  new window flags register in the **same shared `parseOpts`** so loud-reject breaks no existing verb
  (`enqueue`/`drain`/`status` caller flags are all already known — verified at grill). Known flags are unchanged.
- [x] **AC4 (FR-1.3, D7):** **Bare no-arg interactive `discover` errors** (non-zero exit + usage message demanding
  a window) instead of pulling full history; `--since` is accepted but **deprecated/hidden** (not advertised
  in `argument-hint` or docs). SKILL.md Phase 2/Phase 3 + `reference/pipeline.md` §Windowing are rewritten to
  the real flag surface (window-required; `--from/--to`/`--days`); the cursor is documented as **watch-internal
  only**. No instruction tells the runner to hand-convert `--days`→`--since`, and no instruction implies a
  bare cursor-based "since last run" on the interactive path.
- [x] **AC5 (FR-2.1, D2):** `discover` persists this run's discovered item set under a run-id (= the discover's ISO
  timestamp) as the **single `state.snapshot`** in `state.json`, **overwriting** any prior snapshot (one
  snapshot retained, no list, no GC). The printed snapshot JSON is unchanged.
- [x] **AC6 (FR-2.2, D2):** `prep` scopes to that single snapshot; `discovered` items outside it are not
  crawled/transcribed. `--snapshot <id>` is **parsed-but-inert** (documented hook, no multi-snapshot store).
  A bad/over-fetched discover can no longer balloon prep.
- [x] **AC7 (FR-2.3, D6):** The snapshot **includes in-window items already processed in a prior run** — `discover`
  stays GUID-idempotent, so they keep their advanced status — so a wider/overlapping window (e.g. a monthly
  issue spanning prior weekly runs) still renders them. Snapshot-scoping bounds only which `discovered` items
  `prep` *crawls*, never which items the issue *contains*. A snapshot may legitimately reference items already
  at `summarized`/`rendered`.
- [x] **AC8 (D7):** Pure zero-dep Node (≥18). The per-feed cursor is **retained but no longer read by interactive
  `discover`** — the `watch` `enqueue`/`drain` forward-only cursor contract (FR-7/FR-R4 + tests) is unchanged.
  Plan decides whether interactive Phase-6 render still advances the cursor (see design Risks). New parsing,
  range filtering, bare-discover-errors, and snapshot-scoping are covered by in-file `--selftest` +
  `tests/structure.test.sh`; existing tests (incl. `watch.test.sh`) stay green.
- [x] **AC9:** Conforms to `skill-patterns.md §A–§L` and the host `CLAUDE.md` (canonical skill path; no
  version-bump / changelog / README / manifest-sync tasks in the plan — `/complete-dev` owns those).

## Notes

### Build notes (2026-06-25, Loop-2)

Built on `feat/260624-xck` (build commit `394f9fd2`, branched off main, no deps). All changes
land in `plugins/pmos-learnkit/skills/magazine/` (2 scripts + 3 docs); zero new deps (Inv-3).

**What landed (T1–T9):**
- **T1** `parseOpts` registers `--from/--to/--since/--until/--days/--snapshot` and now **throws on any
  unknown `--flag`** (the silent-drop that hid finding #1). New `resolveWindow(opts, nowMs)` resolves an
  explicit window — lower-bound precedence explicit `--from`/`--since` > `--days`, optional upper bound —
  and `cmdDiscover` calls it first, so a bare `discover` exits **64** with `window required: …`.
- **T2** `fetch-feed.js windowItems(items, since, max, until)` gains an **inclusive** upper-bound filter +
  a `--until` CLI flag; `fetchOne`/`cmdDiscover` thread the resolved upper bound through.
- **T3** bare `--from/--to` dates parse inclusively (`00:00:00.000Z` .. `23:59:59.999Z`); full ISO
  `--since/--until` pass through verbatim; a bad date errors naming the flag.
- **T4** `discover` persists a **single** `state.snapshot {id, guids}` (run-id = ISO ts), overwriting.
- **T5** `prep` scopes its crawl to that snapshot (D6: already-processed items keep status + stay
  referenced; **no snapshot → whole-ledger fallback**, Inv-4); `--snapshot <id>` is a parsed-but-inert hook.
- **T6** cursor is **watch-internal only** — interactive discover/render never advance it (snapshot is the
  completeness guarantee); `advanceCursors` retained for the watch `enqueue`/`drain` path.
- **T7** docs rewritten: SKILL.md Phase 2 (Discover) / Phase 6 (Finalize issue) / Phase 3 scoping note,
  `reference/pipeline.md` §Windowing + steps 1/7 + Resume, `reference/config-schema.md` defaults + cursor rule.

**Gates (all green):**
- `magazine-run.js` / `fetch-feed.js` / `magazine-state.js` `--selftest` all PASS (new T1–T6 assertions
  incl. child-process exit-64 checks + deterministic snapshot-id via injectable `_now`).
- `tests/structure.test.sh` **91/0**, `tests/watch.test.sh` **8/0**, `tests/bundles.test.sh` **15/0**.
- `skill-eval` `[D]` exit 0, **zero residuals** (all 21 checks pass).
- 4 hygiene lints PASS: `lint-flags-vs-hints`, `lint-phase-refs`, `lint-non-interactive-inline` (52 skills),
  `audit-recommended` — the last required fixing a **pre-existing** false-positive inline (the Platform
  Adaptation degradation bullet read `**No \`AskUserQuestion\`:**`; rephrased to the canonical exempt shape
  `**No \`AskUserQuestion\` tool:**`).
- **Dogfood** (`dogfood/dogfood-transcript.txt` + `dogfood-run.md`): real overlapping-window flow — narrow
  `{post-0002, substack}` ⊆ wide `{post-0001, post-0002, substack}`; single snapshot object throughout;
  D6 status preserved (already-`failed` items not reset on the wider discover); wide prep scopes to only the
  new `post-0001` (`route.discovered=1`); all 3 error paths exit 64. **Blind judge SHIP** —
  error-clarity 5/5, doc-truthfulness 5/5, reuse-intuitiveness 5/5, zero contradictions.

**AC9:** diff carries no version-bump / changelog / README / manifest-sync change — `/complete-dev` owns those.

Worktree KEPT for Loop-3. Next: **`/complete-dev --epic 260624-2bm`** once sibling **260624-9fw** is built
(9fw depends on xck). Sibling 9fw is now unblocked.
