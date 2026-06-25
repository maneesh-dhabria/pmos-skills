---
schema_version: 1
id: 260624-xck
kind: story
title: "/magazine windowing flags (days/since/until + date range) + loud unknown-flag + prep snapshot-scoping"
type: feature
status: planned
priority: should
labels: [pmos-learnkit, magazine]
route: skill
created: 2026-06-24
updated: 2026-06-25
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

- [ ] **AC1 (FR-1.1, FR-6.1, D7):** `magazine-run.js discover` natively parses an **explicit window** — the date
  aliases `--from <YYYY-MM-DD>` / `--to <YYYY-MM-DD>` and the ISO `--since <ISO>` / `--until <ISO>`
  equivalents — plus `--days N` sugar (trailing window `now − N days` .. now). It resolves a **lower bound**
  (interactive precedence: explicit `--from`/`--since` > `--days`; **no cursor/unbounded fallback** on the
  interactive path) and an **optional upper bound** (`--to`/`--until`); both bounds are passed per-feed.
- [ ] **AC2 (FR-6.2):** `fetch-feed.js` filters each item by the upper bound as well as the lower bound (today it
  applies only the lower bound). Range semantics (inclusive endpoints, ISO + bare-date parsing) are documented
  and selftested.
- [ ] **AC3 (FR-1.2):** `parseOpts` **rejects an unrecognized `--`-prefixed flag loudly** — non-zero exit + a
  stderr message naming the flag — instead of silently dropping it (the silent-drop is what hid #1). The four
  new window flags register in the **same shared `parseOpts`** so loud-reject breaks no existing verb
  (`enqueue`/`drain`/`status` caller flags are all already known — verified at grill). Known flags are unchanged.
- [ ] **AC4 (FR-1.3, D7):** **Bare no-arg interactive `discover` errors** (non-zero exit + usage message demanding
  a window) instead of pulling full history; `--since` is accepted but **deprecated/hidden** (not advertised
  in `argument-hint` or docs). SKILL.md Phase 2/Phase 3 + `reference/pipeline.md` §Windowing are rewritten to
  the real flag surface (window-required; `--from/--to`/`--days`); the cursor is documented as **watch-internal
  only**. No instruction tells the runner to hand-convert `--days`→`--since`, and no instruction implies a
  bare cursor-based "since last run" on the interactive path.
- [ ] **AC5 (FR-2.1, D2):** `discover` persists this run's discovered item set under a run-id (= the discover's ISO
  timestamp) as the **single `state.snapshot`** in `state.json`, **overwriting** any prior snapshot (one
  snapshot retained, no list, no GC). The printed snapshot JSON is unchanged.
- [ ] **AC6 (FR-2.2, D2):** `prep` scopes to that single snapshot; `discovered` items outside it are not
  crawled/transcribed. `--snapshot <id>` is **parsed-but-inert** (documented hook, no multi-snapshot store).
  A bad/over-fetched discover can no longer balloon prep.
- [ ] **AC7 (FR-2.3, D6):** The snapshot **includes in-window items already processed in a prior run** — `discover`
  stays GUID-idempotent, so they keep their advanced status — so a wider/overlapping window (e.g. a monthly
  issue spanning prior weekly runs) still renders them. Snapshot-scoping bounds only which `discovered` items
  `prep` *crawls*, never which items the issue *contains*. A snapshot may legitimately reference items already
  at `summarized`/`rendered`.
- [ ] **AC8 (D7):** Pure zero-dep Node (≥18). The per-feed cursor is **retained but no longer read by interactive
  `discover`** — the `watch` `enqueue`/`drain` forward-only cursor contract (FR-7/FR-R4 + tests) is unchanged.
  Plan decides whether interactive Phase-6 render still advances the cursor (see design Risks). New parsing,
  range filtering, bare-discover-errors, and snapshot-scoping are covered by in-file `--selftest` +
  `tests/structure.test.sh`; existing tests (incl. `watch.test.sh`) stay green.
- [ ] **AC9:** Conforms to `skill-patterns.md §A–§L` and the host `CLAUDE.md` (canonical skill path; no
  version-bump / changelog / README / manifest-sync tasks in the plan — `/complete-dev` owns those).

## Notes

(empty)
