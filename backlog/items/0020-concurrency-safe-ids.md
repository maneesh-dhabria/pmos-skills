---
schema_version: 1
id: 0020
kind: epic
title: Concurrency-safe backlog ids — date+short-rand scheme + define merge id-uniqueness gate + derived INDEX
type: tech-debt
priority: should
status: released
released: pmos-toolkit/v2.68.0
route: skill
plugin: pmos-toolkit
feature_folder: docs/pmos/features/2026-06-12_concurrency-safe-ids/
requirements_doc:
spec_doc:
design_doc: docs/pmos/features/2026-06-12_concurrency-safe-ids/02_design.html
labels: [backlog, three-loop, concurrency, ids, tracker-crudl]
created: 2026-06-12
updated: 2026-06-12
---

## Context

Two parallel `define` sessions branched off the same main (max id 0015) and both minted epic 0016
+ story 0017 (one for /frameworks browse-UI, one for /book-summary) — a silent duplicate-id
corruption: slug-suffixed filenames give no git path conflict, and the hand-edited INDEX.md merges
into duplicate rows. Root cause is `_shared/tracker-crudl.md §2`: "Per-store counter; no global
coordination. Allocate max(existing id) + 1."

Fix is three independent layers: (L1) collision-free `<MMDD>-<rand3>` id scheme, (L2) merge-time
id-uniqueness hard gate on the define merge, (L3) INDEX as a regenerated/derived artifact.

Design doc: `docs/pmos/features/2026-06-12_concurrency-safe-ids/02_design.html`

## Acceptance Criteria

- [ ] New ids minted coordination-free as `<MMDD>-<rand3>` (Crockford base32, no i/l/o/u); no max+1
- [ ] Legacy 4-digit ids parse + never rewritten; validator accepts both
- [ ] define merge refuses loudly on a pre-existing id; asserts no duplicate INDEX ids post-merge
- [ ] INDEX regenerated (not hand-appended), sorted by created desc
- [ ] All id-consuming sites scheme-agnostic; _shared sync propagated
- [ ] Skill rubric + backlog tests green; /backlog add stays frictionless

## Notes

Stories: 0021 (the whole fix — single skill story; splittable into L1/L2/L3 if build finds the diff large).
Route: skill (edits _shared/tracker-crudl.md §2, plugins/pmos-toolkit/skills/backlog/SKILL.md,
plugins/pmos-toolkit/skills/feature-sdlc/SKILL.md #define-mode step 5; all pmos-toolkit + _shared sync).
Id allocated 0020 by hand, skipping book-summary's in-flight 0018/0019 — the manual coordination this fix removes.
