---
schema_version: 1
id: 260624-2bm
kind: epic
title: "/magazine pipeline robustness — windowing flags (days/since/until + date range), prep snapshot-scoping, Stage-B GUID reconciliation, durable per-issue items, feed quarantine"
type: feature
status: released
released: v0.30.0
priority: should
labels: [pmos-learnkit, magazine]
route: skill
created: 2026-06-24
updated: 2026-06-24
defined: 2026-06-24
source: docs/pmos/features/2026-06-24_magazine-pipeline-robustness/0c_feedback_triage.html
feature_folder: docs/pmos/features/2026-06-24_magazine-pipeline-robustness/
design_doc: docs/pmos/features/2026-06-24_magazine-pipeline-robustness/02_design.html
parent:
dependencies: []
---

## Context

A real `/magazine` "catch me up on last week" run shipped a valid 59-item issue + 3-issue library with the
trust rule honored (16 honestly-degraded cards, zero fabrication) — but the path was rough, requiring three
hand-rolled workarounds. A `/reflect` retro surfaced five findings + one feature request, all confirmed live
in the shipped scripts (grounded against source 2026-06-24 — see the `design_doc:` Pre-flight section):

- **#1 [blocker]** `discover` parses only `--since`/`--max`; `--days N` is **silently dropped** (no `else`
  branch in `parseOpts`, magazine-run.js:423-442) → with no lower bound, discover fetches each feed's **full
  history** (the run pulled 3,231 items back to 2015). The SKILL/pipeline docs describe a `--days` lookback
  the entrypoint cannot consume and never tell the runner to convert it to an ISO `--since`.
- **#2 [blocker]** `prep` loops **every** ledger item with `status==='discovered'` (cmdPrep, :167-169); the
  discover snapshot is never persisted or consulted. A contaminated ledger made prep try ~3,100 stale URLs →
  10-min timeout (svpg 522 storm). No run-id / snapshot scoping exists.
- **#3 [friction]** Stage-B haiku summarizers "safe-ify" URL GUIDs (`/p/slug` → `/p_slug`) when keying their
  JSON; the Phase-4 exact-GUID merge then silently drops those items (`safeGuid` only normalizes on-disk
  filenames, :42-44 — no re-keying of summarizer output anywhere).
- **#4 [friction]** No per-issue items JSON is persisted; `render-issue.js library` regenerates the whole
  index from an agent-assembled `issues.json`, forcing reverse-engineering of prior issue HTML (the oldest
  issue predates `data-guid`, needing a second parser).
- **#5 [nit]** A persistently-failing feed (svpg 522) is reported every run with no escalation; state tracks
  no per-feed failure count and there is no quarantine logic.
- **#6 [feature]** The user wants to specify an explicit **start AND end date** (a date range), not just
  `--since`/`--days`. Only a lower bound + count cap exist today; no upper bound at any layer. Same call-site
  as #1.

The shipped scripts are pure zero-dep Node (≥18); tests are bash integration (`tests/structure.test.sh` et al)
+ in-file `--selftest` harnesses. Full FRs, decisions (D1–D5), the cross-skill invariants, and the grounded
pre-flight live in the `design_doc:` (02_design.html).

**Out of scope:** auto-disabling a feed (D3 keeps quarantine *suggest-only* — the no-silent-drop trust rule);
a crawl-time *content* filter beyond date bounds; reworking the issue HTML reader's existing client-side
`f-from`/`f-to` UI filter (unrelated to crawl-time windowing).

## Story split

Two serialized vertical slices on one skill (`/magazine`), mirroring the established 1-skill-N-stories pattern.
Story **B depends on A** because both edit `SKILL.md` and `state.json`'s schema (the windowing/prep docs +
snapshot field vs. the Phase-4/5 reconciliation docs + feed-failure field); serializing avoids the collision
and lets B build on A's snapshot/durable-intermediate groundwork (D2 ↔ #4 share the "persist durable
intermediates" mechanism). The D24 litmus holds: A is the discover/prep call-site cluster, B is the
Stage-B/render/feed-health cluster — each independently shippable and each scored once against `skill-eval.md`.

## Stories
- 260624-xck — windowing flags + date range + prep snapshot-scoping (#1, #2, #6) (route: skill) — planned
- 260624-9fw — Stage-B GUID reconciliation + durable per-issue items + feed quarantine (#3, #4, #5) (route: skill, depends on 260624-xck) — planned
