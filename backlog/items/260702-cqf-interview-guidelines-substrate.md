---
schema_version: 1
id: 260702-cqf
kind: story
parent: 260702-3bb
title: "Extract the PM-round guidelines corpus + skeletons + effectiveness rubric to pmos-managerkit _shared/interview-guidelines/ and retrofit /interview-feedback to consume it (no behavior change)"
type: enhancement
priority: should
route: skill
dependencies: []
plugin: pmos-managerkit
status: done
released: 0.3.0
feature_folder: docs/pmos/features/2026-07-02_interview-guide/
plan_doc: docs/pmos/features/2026-07-02_interview-guide/02_design.html
tasks: docs/pmos/features/2026-07-02_interview-guide/stories/260702-cqf/tasks.yaml
worktree:
branch: feat/260702-cqf
claimed_by: "build:b0e236c5-8aab-4a88-8bd7-4d40d8d8e0bc"
driver_holder: "build:b0e236c5-8aab-4a88-8bd7-4d40d8d8e0bc"
labels: [pmos-managerkit, interview-feedback, interview-guide, substrate, skill]
created: 2026-07-02
updated: 2026-07-05
---

<!-- status: planned at define (Loop 1); tasks.yaml authored, route:skill. Build via /skill-sdlc build --story 260702-cqf -->

## Context

Behavior-preserving substrate lift. Today the researched interview-guidelines assets live inside
`plugins/pmos-managerkit/skills/interview-feedback/reference/`:

- `guidelines/<archetype>/{interviewer-reference.html, scorecard.html}` for 7 archetypes
  (recruiter-screen, product-sense, analytical, technical, behavioral, case-study, case-presentation)
  + `guidelines/case-study/additional/README.md`
- `reference-skeleton.html`, `scorecard-skeleton.html` (the authoring/anchor contracts)
- `interviewer-effectiveness.html` (the coaching rubric)
- `reference-resolution.md` (the resolution contract)

Story 2 (`/interview-guide`) needs the same corpus. Per the design doc (D2) and CLAUDE.md's shared-substrate
rule, these move to a **new** `plugins/pmos-managerkit/skills/_shared/interview-guidelines/` (first `_shared/` dir
in this plugin — created by hand, not via `sync-shared.sh`, which is intersection-only and cross-plugin). Then
`/interview-feedback` is retrofitted to read from the new home with **zero behavior change**.

Decisions/invariants: `design_doc:` (`../../02_design.html`) — D2, INV-1.

## Acceptance Criteria

- [x] **AC1 (move).** The corpus (`guidelines/` all 7 archetypes + `additional/`), `reference-skeleton.html`,
  `scorecard-skeleton.html`, `interviewer-effectiveness.html`, and `reference-resolution.md` now live under
  `plugins/pmos-managerkit/skills/_shared/interview-guidelines/`. `git mv` preserves history.
- [x] **AC2 (retrofit paths).** Every reference in `/interview-feedback` to the moved files is updated to the new
  `_shared/` path: `SKILL.md` (Phase Resolve reference-resolution, Phase Setup skeleton instantiation, Phase Coach
  effectiveness rubric), `scripts/fill-scorecard.mjs` (skeleton path), `scripts/questionnaire.mjs` (if it reads
  the scorecard), and `reference-resolution.md`'s own internal paths. Grep for `reference/guidelines`,
  `reference/*skeleton`, `interviewer-effectiveness` returns no stale in-skill path.
- [x] **AC3 (behavior-preserving).** `/interview-feedback`'s `setup` and `score` no-op paths produce
  byte-identical output to pre-move (INV-1). All selftests green with no assertion changes beyond path updates:
  `transcribe.sh --selftest` 13/13, `check-citations.mjs` 7/7, `fill-scorecard.mjs` 28/28, `tests/run-tests.sh`
  9/9.
- [x] **AC4 (NI + refusal frozen).** The `/interview-feedback` non-interactive block and the tier-3 refusal marker
  are byte-identical (INV-2/INV-5 of that skill) — this story touches only reference paths, not prompt logic.
- [x] **AC5 (conformance).** `/interview-feedback` still conforms to `skill-patterns.md §A–§L`; passes
  `skill-eval.md` (`[D]`+`[J]`); 4 hygiene lints + `audit-recommended` green. No release-prerequisite tasks in
  waves (§G).

## Notes

- This is a **move + path retrofit**, not a rewrite. The safest sequence: `git mv` the assets → grep-and-update
  every path in `/interview-feedback` → run all four selftests → confirm byte-identical fixtures.
- No `sync-shared.sh` involvement: the substrate is managerkit-internal (two sibling skills, same plugin), so it
  is created by hand as a first `_shared/` dir (design-doc bootstrap note).
- Confidentiality unchanged: no candidate data touched.

---

Built 2026-07-05 via `/feature-sdlc build` (route:skill) on branch `feat/260702-cqf` (commit `4f8473a6`,
UNMERGED — awaits Loop-3 `/complete-dev --plugin pmos-managerkit`). Diff: 19 renames (`git mv`, history
preserved) + 4 in-place path edits; `23 files changed, 31 insertions(+), 29 deletions(-)`.

All 5 ACs met:
- **AC1 (move).** New `plugins/pmos-managerkit/skills/_shared/interview-guidelines/` holds the 7-archetype
  `guidelines/` corpus (+ `case-study/additional/`), `reference-skeleton.html`, `scorecard-skeleton.html`,
  `interviewer-effectiveness.html`, `reference-resolution.md`. `git status` recorded 19 renames (R), no
  delete+add. `interviewer-notes-skeleton.html` correctly **stayed** in `interview-feedback/reference/`
  (runtime per-session notes template, not shared corpus — not in the design-doc D2 move-set).
- **AC2 (retrofit).** Every `reference/`-prefixed cite to a moved file updated to `../_shared/interview-guidelines/`:
  `SKILL.md` ×4 (resolution doc L116, scorecard skeleton L140, effectiveness rubric L186, both skeletons L190),
  `fill-scorecard.mjs` (`resolve(__dirname,'..','..','_shared','interview-guidelines',…)` + its header comment),
  `questionnaire.mjs` (both skeleton reads), `tests/run-tests.sh` (new `GUIDE=$SKILL_DIR/../_shared/interview-guidelines`
  var; 5 skeleton/rubric checks repointed, notes-skeleton check left on `$REF`). Also fixed the moved files' OWN
  now-stale internal cross-cites (14 `guidelines/*/*.html` → `../../<skeleton>`; effectiveness↔scorecard sibling
  cites). AC2 grep clean. The bare runtime `guidelines/<round>/` + `role.json guidelines_path` paths correctly
  retained (they resolve inside the user's role store, not the bundle).
- **AC3 (behavior-preserving).** Pre-move baseline captured, then post-move **byte-for-byte match**: transcribe
  13/13, check-citations 7/7, fill-scorecard 28/28, questionnaire 7/7, storage 5/5, `tests/run-tests.sh` 9/9.
  Skeletons are byte-identical (pure `git mv`) and scripts read them from the new path → `filled-scorecard.html`
  is byte-identical by construction (INV-1).
- **AC4 (NI + refusal frozen).** `git diff SKILL.md` is **exactly** the 4 path substitutions. NI block shasum
  identical pre/post (`3c0b3254…`); the tier-3 `<!-- non-interactive: refused … -->` marker byte-unchanged.
- **AC5 (conformance).** `skill-eval [D]` `--target claude-code` exit 0 (all checks pass, incl. `c-references-dir-name`
  — `reference/` still exists with the notes skeleton); `[J]` unchanged by inheritance (path-only diff, no
  prompt/phase/flag/description change); `lint-flags-vs-hints` / `lint-phase-refs` / `audit-recommended`
  (1 call/1 Recommended) / `lint-non-interactive-inline` (56 skills — the unmerged one-on-one from 6ks isn't on
  this branch) all green. §G clean — zero release-prereq files (the only README touched is the corpus
  `case-study/additional/README.md`, a moved data file, not a plugin README row).

Unblocks story **260702-jz4** (`/interview-guide`), which cites this substrate (its `dependencies: [260702-cqf]`
means the branch is merged into jz4's worktree at claim-time per D9). Epic **260702-3bb** still has jz4 to build
before Loop-3.
