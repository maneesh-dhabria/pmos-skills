---
schema_version: 1
id: 260617-kac
kind: story
parent: 260617-4w1
title: "Re-found /frameworks on direct authoring: remove the Notion sync feature + ship the repeatable research/authoring process as reference docs"
type: feature
priority: should
route: skill
dependencies: [260617-2gw]
plugin: pmos-learnkit
status: released
feature_folder: docs/pmos/features/2026-06-17_frameworks-corpus-expansion/
plan_doc: docs/pmos/features/2026-06-17_frameworks-corpus-expansion/stories/260617-kac/03_plan.html
tasks: docs/pmos/features/2026-06-17_frameworks-corpus-expansion/stories/260617-kac/tasks.yaml
worktree:
build_branch: feat/260617-kac
build_commit: 419aa97
claimed_by: null
driver_holder: null
labels: [pmos-learnkit, frameworks, sync-removal, docs]
created: 2026-06-17
updated: 2026-06-18
released: v0.28.0
---

<!-- status: planned at define (Loop 1); tasks.yaml authored, route:skill. Build via /skill-sdlc build --story 260617-kac. Depends on 260617-2gw (both edit SKILL.md). -->
<!-- BUILT (Loop 2) 2026-06-18 on feat/260617-kac @ 419aa97 (worktree dep-merged 2gw's 346-count tree first).
     All 8 ACs green. Removed sync pipeline (split-corpus/apply-rederive/derive-fields.mjs, split-corpus.test.mjs,
     ingestion.md); extracted the load-bearing validation substrate into scripts/corpus-vocab.mjs (DECISION_TYPES,
     LIFECYCLE_STAGES, validateAnchors) and repointed validate-corpus.mjs's import; re-founded SKILL.md (dropped
     #sync phase/dispatch/argument-hint token + Notion frontmatter/anti-patterns/platform bullets, renumbered
     Capture Learnings to Phase 5, description now = directly-authored offline 346-corpus); authored
     reference/corpus-expansion.md (research process + field/SVG authoring contract); reframed corpus-schema.md +
     situation-taxonomy.md from Notion/sync provenance to direct authoring; updated structure.test.sh rosters +
     GONE-assertion. Gates: 4 script --selftests PASS, 346-corpus validate PASS (dist top 24.6%<30%, n/a 0.9%),
     structure+build-library+json-contract tests PASS, 4 repo lints PASS (audit-recommended now fully clean — old
     #sync false-positive gone), skill-eval [D] exit 0. Live dogfood: self-contained library builds from 346
     corpus, match --json + human paths return contract objects. Worktree KEPT for Loop-3. Completes epic 4w1
     (Deliverable A=2gw done + Deliverable B=kac done) → /complete-dev --epic 260617-4w1. -->

## Context

Deliverable B of epic `260617-4w1`. The corpus is now maintained by **direct authoring** (story `2gw` shipped
the 74 that way) so the Notion `sync` pipeline is no longer needed. Remove it cleanly — preserving the
validation substrate `validate-corpus.mjs` depends on — and ship the research + authoring process as reference
docs so future expansions are repeatable from within the skill. Depends on `260617-2gw` because both edit
`SKILL.md`; the claim-time dep-merge brings the 346-count tree in first. Design seed (FR-B1..B6, the
kept-vs-removed inventory, the `derive-fields` coupling): epic `design_doc` (02_design.html).

## Acceptance criteria

1. **`sync` command surface removed (FR-B1).** Gone from `SKILL.md`: Phase 5 `#sync`, the Phase 1 dispatch
   branch, the `argument-hint` `sync` token, the frontmatter Notion-sourcing language + the "rebuild the
   frameworks corpus" trigger, the `#sync` Track-Progress note, the Notion/S3/`--changed-only`/Notion-write-back
   anti-patterns, and the Notion-specific Platform-Adaptation bullets. The skill no longer advertises or
   dispatches `sync`.
2. **Notion-pipeline scripts removed (FR-B2).** `scripts/split-corpus.mjs` and `scripts/apply-rederive.mjs` are
   deleted; `tests/split-corpus.test.mjs` is removed and `tests/structure.test.sh` updated so it no longer
   asserts the removed scripts (and still passes).
3. **Validation substrate preserved (FR-B3, D6, inv-validate).** The exports `validate-corpus.mjs` imports —
   `DECISION_TYPES`, `LIFECYCLE_STAGES`, `validateAnchors` — survive in a retained module (trimmed
   `derive-fields.mjs` carrying only those, or relocated into `validate-corpus.mjs`/a small shared file). `node
   scripts/validate-corpus.mjs --selftest` and the merged-corpus validation both pass.
4. **`ingestion.md` removed, no dangling cites (FR-B4, inv-nodangle).** `reference/ingestion.md` is deleted;
   `SKILL.md`, `reference/corpus-schema.md`, and `reference/situation-taxonomy.md` drop or repoint every cite to
   it and to the removed scripts. A grep for `ingestion.md`/`split-corpus`/`apply-rederive`/`sync` across the
   skill returns no stale references (grep-clean).
5. **Repeatable process shipped as reference (FR-B5).** `reference/corpus-expansion.md` exists and documents (a)
   the repeatable research process for discovering net-new frameworks (adapted from the source
   `RESEARCH-PROCESS.md`) and (b) the entry-authoring contract — record fields + the owned-SVG recipe + the
   `validate-corpus.mjs` gate (adapted from `AUTHORING-TEMPLATE.md`) — pointing at direct authoring as the
   canonical path (no Notion). `SKILL.md` cites it as how to grow the corpus.
6. **SKILL.md reflects the new reality (FR-B6).** The `description` and body describe a bundled,
   directly-authored, offline corpus (no "sourced from your Notion database" claim) at 346 entries; runtime
   paths (retrieve / `--json` / browse / situations) are unchanged and documented as before.
7. **Runtime paths intact (inv-runtime).** `match.mjs`, `build-library.mjs`, `validate-corpus.mjs` and their
   `--selftest`/`tests/` are unchanged-and-green; `--json` and browse behave identically.
8. **Skill-eval + conventions.** Conforms to `skill-patterns.md §A–§L` and host `CLAUDE.md`; non-interactive
   inline block stays byte-identical; every `AskUserQuestion` keeps a Recommended option or defer-only tag (note:
   removing `#sync` removes its `AskUserQuestion`). Passes the `[D]` half of `skill-eval.md`. Release
   prerequisites (version bump / changelog / README / manifest sync) are **for /complete-dev**, not `/execute`.
