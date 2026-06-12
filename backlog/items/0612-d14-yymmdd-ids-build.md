---
schema_version: 1
id: 0612-d14
kind: story
title: Extend the backlog id scheme to <YYMMDD>-<rand3> — year-prefixed mint + triple-accept validator across /backlog and /mytasks
type: enhancement
status: done
priority: should
route: skill
parent: 0612-jjs
dependencies: []
worktree: ../agent-skills-0612-d14
plan_doc: docs/pmos/features/2026-06-12_yymmdd-ids/stories/0612-d14-yymmdd-ids-build/03_plan.html
tasks_file: docs/pmos/features/2026-06-12_yymmdd-ids/stories/0612-d14-yymmdd-ids-build/tasks.yaml
claimed_by:
driver_holder: build:3e313489-a624-4b93-b86e-c56f8eb34df6
released:
labels: [backlog, mytasks, ids, tracker-crudl]
created: 2026-06-12
updated: 2026-06-12
source: 2026-06-12 /skill-sdlc define --from-feedback "include year in /backlog numbering — yymmdd-rnd"
pr:
---

## Context

The single build story for epic 0612-jjs. Extends the coordination-free id scheme from
`<MMDD>-<rand3>` to `<YYMMDD>-<rand3>` per the epic design contract
`docs/pmos/features/2026-06-12_yymmdd-ids/02_design.html`. One change = one `/execute` run =
one branch (`feat/0612-d14`). The two edited skills (`/backlog`, `/mytasks`) are `skill-eval`'d
(Phase 6a) before ship. No epic `/spec`; the design doc + these ACs + `skill-patterns.md §A–§L`
are the implementation contract.

## Acceptance Criteria

- [x] **AC1 — Canonical format + validator (single home, §K).** `_shared/tracker-crudl.md` §2.1
  documents the third permanently-valid form `<YYMMDD>-<rand3>` and carries the canonical
  triple-accept validator `^([0-9]{4}|[0-9]{4}-[0-9a-hj-km-np-tv-z]{3}|[0-9]{6}-[0-9a-hj-km-np-tv-z]{3})$`;
  §2.3 updated so a single-store tracker also mints the date+rand scheme. Format/validator stated
  here only — every consumer cites §2, never restates (`02_design.html#scheme`).
- [x] **AC2 — Year-prefixed minter (D1).** `backlog/scripts/mint-id.mjs` `mintId()` prepends the
  2-digit year (`getFullYear() % 100`) → `<YYMMDD>-<rand3>` (e.g. `260612-k3f`); `ID_RE` is the
  canonical triple-accept regex byte-identical to tracker-crudl §2.1; the `--date` testing override
  accepts a 6-digit `YYMMDD` (or `YY-MM-DD`); help text updated. No `Math.random()`/`Date.now()` ban
  re-introduced beyond the existing one-shot CLI mint.
- [x] **AC3 — Triple-accept, no migration (D1).** The validator accepts all three forms; every
  existing id — legacy 4-digit, current `<MMDD>-<rand3>` (`0612-xxx`), and new `<YYMMDD>-<rand3>` —
  validates and is **never rewritten**. `check-id-uniqueness.mjs` `ID_PREFIX_RE` gains the 6-digit
  arm (first): `/^([0-9]{6}-[0-9a-hj-km-np-tv-z]{3}|[0-9]{4}-[0-9a-hj-km-np-tv-z]{3}|[0-9]{4})-/`;
  the define-merge gate stays format-agnostic and still passes on mixed legacy+current+new corpora.
- [x] **AC4 — /mytasks adopts the scheme (D2/D3, veto-able).** `mytasks/SKILL.md` quick-capture
  step 2 and rich-capture allocate `<YYMMDD>-<rand3>` (resolve the shared `mint-id.mjs` within
  pmos-toolkit, or inline the mint) instead of the `max(^[0-9]{4}-)+1` serial scan; existing 4-digit
  serials stay valid. **If the maintainer vetoes the /mytasks move, drop this AC and its task — it is
  isolated from AC1–AC3, AC5.**
- [x] **AC5 — Tests + prose (regression guard).** `backlog/tests/id-scheme.test.sh` expects a 6-digit
  date prefix in format/round-trip/claim-lock checks, keeps the legacy-accept checks, and **adds a new
  check that a current `0612-k3f` (`<MMDD>-<rand3>`) id still validates** — the regression guard against
  the naive 4→6 swap that would drop the current arm (`02_design.html#scheme` trap). All `[D]` checks
  and the suite are green. Prose `<MMDD>` references describing newly-minted ids updated to `<YYMMDD>`
  (not the grandfathered-form descriptions) in `backlog/SKILL.md`, `backlog/schema.md`,
  `backlog/tests/scenarios.md`, `feature-sdlc/SKILL.md` #define-mode, `docs/pmos/changelog.md`.

## Notes

- Sequenced in `tasks.yaml`: format (canonical home) → minter → uniqueness extractor → /mytasks → tests + prose.
- Reuse, do not fork: the existing `mint-id.mjs` / `check-id-uniqueness.mjs` / `id-scheme.test.sh` from epic 0020.
- Single `tracker-crudl.md` copy (pmos-toolkit only) → **no cross-plugin `_shared` sync** (`sync-shared.sh` is a no-op for a file one plugin owns).
- Release prerequisites (NOT in `/plan` waves — `/complete-dev` owns these): pmos-toolkit version bump (currently 2.68.0), both `plugin.json` manifests, changelog entry, learnings header. No README row / marketplace change (no new skill).
- Out of scope (v1): migrating existing ids; id-as-sort-key; a `<YYMMDD>-<serial>` mytasks hybrid; 4-digit `YYYY`.

### Build outcome (2026-06-13, build loop, branch `feat/0612-d14`)

- **VERIFY: PASS.** All 5 ACs met. id-scheme suite green (21/21, incl. the new current-`<MMDD>-<rand3>` regression guard); uniqueness gate clean on the real 27-item corpus; `lint-flags-vs-hints`, `lint-phase-refs`, `lint-non-interactive-inline` (37 skills) all PASS; minter mints `260612-xxx` today; triple-accept verified. Phase 6a `[J]` half: 7/7 pass (byte-identical regex, unambiguous arms, regression guard present, grandfathered intact, crypto-only, mytasks coherent).
- **Accepted residuals (pre-existing, NOT introduced by this story).** `skill-eval-check.sh [D]` flags `d-learnings-load-line` + `d-capture-learnings-phase` on both `/backlog` and `/mytasks`, plus `d-progress-tracking` on `/mytasks`. Confirmed identical on baseline `main` (net-worse guard clean) — this id-scheme change adds zero new failures. They are unrelated skill-body debt (missing learnings-load line / Capture-Learnings phase / Track Progress section); fixing them is out of scope for a focused id-scheme story → captured here as known risk for a future grooming item, not silently passed.
- **Changelog decision (judgment).** AC5 lists `docs/pmos/changelog.md` for `<MMDD>→<YYMMDD>` prose updates, but the only `<MMDD>` reference there is inside the **released 2.68.0 entry**, which correctly records what that release shipped. Rewriting it would falsify release history. Left intact; the new `<YYMMDD>` changelog entry is a release prerequisite owned by `/complete-dev` (per the Release-prerequisites note above), not a build-time edit.
