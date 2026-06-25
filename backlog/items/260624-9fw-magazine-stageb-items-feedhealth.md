---
schema_version: 1
id: 260624-9fw
kind: story
title: "/magazine Stage-B GUID reconciliation + durable per-issue items JSON + feed-failure quarantine suggestion"
type: feature
status: planned
priority: should
labels: [pmos-learnkit, magazine]
route: skill
created: 2026-06-24
updated: 2026-06-25
plan_doc: docs/pmos/features/2026-06-24_magazine-pipeline-robustness/stories/260624-9fw/03_plan.html
tasks_file: docs/pmos/features/2026-06-24_magazine-pipeline-robustness/stories/260624-9fw/tasks.yaml
parent: 260624-2bm
dependencies: [260624-xck]
spec: docs/pmos/features/2026-06-24_magazine-pipeline-robustness/02_design.html
feature_folder: docs/pmos/features/2026-06-24_magazine-pipeline-robustness/stories/260624-9fw/
---

## Context

Resolves findings **#3 (friction)**, **#4 (friction)**, and **#5 (nit)** — the Stage-B / render / feed-health
cluster. Implements design decisions **D3** (suggest-only feed quarantine) and the durable-intermediate fixes.
Depends on **260624-xck**: both stories edit `SKILL.md` and the `state.json` schema, so this rides xck's
snapshot/durable-intermediate groundwork and the serialization avoids a merge collision. See `spec:`
(02_design.html) for FR-3.x / FR-4.x / FR-5.x and the invariants.

## Acceptance criteria

- [ ] **AC1 (FR-3.1):** A single shared GUID-normalization helper (the `safeGuid` transform, today at
  magazine-run.js:42-44) is the source of truth for the safe-ify rule and is exported/reused for re-keying.
- [ ] **AC2 (FR-3.2):** SKILL.md Phase 4 instructs summarizer subagents to **echo the source GUID verbatim** (in a
  fenced/opaque field, not re-derived) AND specifies a **normalized-key reconciliation fallback** (normalize
  both the returned key and the manifest GUID before matching) so safe-ified GUIDs (`/p/slug` vs `/p_slug`) no
  longer silently drop items. The reconciliation is selftested with a safe-ified-key fixture.
- [ ] **AC3 (FR-4.1):** `render-issue.js issue` mode persists a durable per-issue items JSON sidecar
  (`{YYYY-MM-DD}_items.json`) next to the emitted issue HTML (deterministic, no extra agent step).
- [ ] **AC4 (FR-4.2, D8):** `render-issue.js library` assembles `issues.json` by **globbing the `*_items.json`
  sidecars** rather than reverse-engineering rendered HTML — **no HTML parser and no legacy pre-`data-guid`
  parser is retained**; Phase 5 is updated to read the sidecars. Issues with no sidecar (those built before
  this ships) are **skipped, not backfilled** — and the rebuild emits **one loud notice naming the skipped
  issues** (no silent drop, per the trust rule; rebuilding an issue re-creates its sidecar and re-includes it).
  Selftested with a fixture containing a sidecar-less issue: the notice fires and that issue is omitted without
  crashing.
- [ ] **AC5 (FR-4.3, D6):** Issue assembly **reuses persisted takeaways** — when building a multi-window issue,
  already-`summarized`/`rendered` items are populated from their per-issue items JSON (AC3) rather than
  re-summarized; only items with no cached summary go through Stage B. A monthly issue that overlaps prior
  weekly runs reuses those weeks' bullets and re-summarizes nothing already done. Phase 5 documents this
  reuse path; it is selftested with a fixture where some snapshot items already carry cached bullets.
- [ ] **AC6 (FR-5.1, D3):** `state.json` tracks `feedHealth[slug].consecFails` — incremented on each **run** where
  the feed fetch fails, **reset to 0 on any successful fetch** ("consecutive runs" is the unit even when runs
  are days apart). At **≥ N=3** (named constant), `discover`/`prep` prints **one compact suggestion line per
  run** (disable/remove the feed) — it **never auto-disables** (the no-silent-drop trust rule). Selftested:
  three failing runs cross the threshold and emit the line; a success resets the counter and silences it.
- [ ] **AC7:** Pure zero-dep Node (≥18). New normalization, sidecar persistence, library-from-sidecars, reuse-on-
  render, and the failure-counter/suggestion are covered by in-file `--selftest` + `tests/structure.test.sh`;
  existing tests stay green; the issue/library HTML contract (`reference/issue-format.md`) is preserved.
- [ ] **AC8:** Conforms to `skill-patterns.md §A–§L` and the host `CLAUDE.md` (canonical skill path; no
  version-bump / changelog / README / manifest-sync tasks in the plan).

## Notes

(empty)
