---
schema_version: 1
id: 260626-5cq
kind: story
parent: 260626-8pa
title: "/people — delete committed INDEX, retire rebuild-index from add/set/refine + Phase 8, inline derived render"
type: tech-debt
priority: should
route: skill
dependencies: [260626-psr]
plugin: pmos-toolkit
status: released
feature_folder: docs/pmos/features/2026-06-26_trackers-index-merge-tax/
plan_doc: docs/pmos/features/2026-06-26_trackers-index-merge-tax/stories/260626-5cq/03_plan.html
tasks: docs/pmos/features/2026-06-26_trackers-index-merge-tax/stories/260626-5cq/tasks.yaml
worktree:
build_branch: feat/260626-5cq
build_commit: 824ae16e
claimed_by:
driver_holder: build:e385ea38
labels: [pmos-toolkit, people, tracker-crudl, merge-path]
created: 2026-06-26
updated: 2026-06-27
---

<!-- status: planned at define (Loop 1). Depends on 260626-psr so the rewritten _shared/tracker-crudl.md §5 is merged into this worktree at claim time (D9). Build via /skill-sdlc build --story 260626-5cq. -->

## Context

`/people` mirrors `/backlog`'s INDEX anti-pattern with an inline LLM-regenerated committed
`~/.pmos/people/INDEX.md` (no script). This story removes the committed index and the rebuild-index
procedure from every mutating handler (add/set/refine + Phase 8), making bare `/people` render an inline
view derived from `~/.pmos/people/*.md` on read. It is the **prerequisite for S4** (the new web viewer),
which builds the web-default surface on top of the now-derived read path. Cross-skill contract + decision
log live in the `design_doc:` (../../02_design.html). One `/execute` run.

## Acceptance Criteria

- **AC1 (FR-7/FR-1):** No committed `~/.pmos/people/INDEX.md` exists after the change; the store carries `*.md` person files only.
- **AC2 (FR-7):** the inline "Regenerate INDEX" procedure is removed from `add` (:146), `set` (:218), `refine` (:229), and Phase 8 (:89) is retired — no mutating handler regenerates an index.
- **AC3 (FR-3/INV-2):** bare `/people` renders an inline view derived from `~/.pmos/people/*.md` on read (web-default arrives in S4 260626-nq0); empty-state gated on "no person files", never on a missing index.
- **AC4 (FR-7):** `schema.md` `## INDEX.md format` (:63) becomes `## Index view format` (derived, not persisted); the `with-people/INDEX.md` test fixture is removed and any fixture assertion expecting it dropped.
- **AC5 (FR-9):** `/people` conforms to `skill-patterns.md §A–§L` + CLAUDE.md skill-authoring conventions; SKILL.md index references (:83-85) updated; `/skill-eval` passes.

### Build outcome (2026-06-27, build:e385ea38) — DONE

Story S3 BUILT (route:skill, pmos-toolkit). Deleted the committed people INDEX
fixture and made bare `/people` an **index view derived on read** from
`~/.pmos/people/*.md`. The web-default surface arrives in S4 (260626-nq0); this
story leaves the **inline derived render** as the bare-command read path (INV-2's
fallback). 4 files, +37/−71. Built against the rewritten `_shared/tracker-crudl.md`
§5 (from dep story 260626-psr, merged into the worktree at claim time, D9).

- **AC1** committed `tests/fixtures/with-people/INDEX.md` removed (`git rm`); store = `*.md` only; the skill writes no index file.
- **AC2** "Regenerate INDEX" stripped from `#add`/`#set`/`#refine`; Phase 8 `#rebuild-index` retired entirely (verb + routing-table row + argument-hint token removed).
- **AC3** bare `/people` → Phase 1 inline derived render (glob → parse → sort by name → render the §5 table); empty-state gated on **record-file absence**, never a missing index; never prints/writes an index blob.
- **AC4** `schema.md` `## INDEX.md format` → `## Index view format` (derived, no writer, no `Last regenerated:` line); intro reworded; `with-people/INDEX.md` fixture removed and all scenarios.md assertions reworded to derive-on-read (rebuild-index scenarios dropped).
- **AC5** skill-patterns §A–§L conformant; SKILL.md index refs + `#find`/`#list` stale "INDEX.md" mentions cleaned; skill-eval `[D]` EXIT0 (3 advisory pre-existing fails — learnings-load / capture-learnings / progress-tracking — identical on base main, untouched), `[J]` pass.

**Gates green:** skill-eval `[D]` EXIT0 (pre-existing residuals only) · `[J]` pass ·
4 hygiene lints + audit-recommended green · phase refs resolve (no dangling
`#rebuild-index` anchor) · dogfood (load-bearing): derive-on-read produced the
correctly-sorted 3-person index view from record files with `INDEX.md` absent +
empty store → "no person files" empty-state, no INDEX written. No SKILL.md
schema/dep change; no release-prereq files (Loop-3 owns those).

Impl `824ae16e` on `feat/260626-5cq` (worktree KEPT; dep `260626-psr` merged in at
claim time). **Unblocks `260626-nq0`** (the new /people web viewer, `dependencies:
[260626-5cq]`). Epic `260626-8pa` now **2/4** built (psr + 5cq); `3d4` (/mytasks)
remains; ships Loop-3 only when all 4 done.
