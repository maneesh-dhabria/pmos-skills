# Backlog Item Schema

> Binds the shared tracker contract in [`../_shared/tracker-crudl.md`](../_shared/tracker-crudl.md). This file declares backlog's **bindings** (fields, enums, INDEX shape, archive root, claim locks); the shared contract governs the **invariants** (id/slug rules, `created`/`updated`/`schema_version`, INDEX regenerability, archive convention). **This file is the single source of truth for every enum value and default** — SKILL.md cites it and never re-lists enums.

Every backlog item is a markdown file at `backlog/items/{id}-{slug}.md`. An item is either an **epic** or a **story** (`kind:`). The three-loop model (define → build → release) runs over these two levels; see `docs/pmos/reviews/2026-06-10_ops-observations/backlog-three-loop-design.md` for the design rationale and decision log (D1–D30).

## Filename

Numeric-id store — `id`/`slug` rules per `../_shared/tracker-crudl.md` §2. Binding: `id` counters are **per-repo** (local to each repo's `backlog/`, no global coordination). Epics and stories share one id sequence.

## The two kinds

| `kind` | Role | Status machine | Owns | Executed? |
|---|---|---|---|---|
| `epic` | Release unit (Loop 3). Every story has a `parent:` epic — single-story epics are allowed and auto-wrapped at capture (D18). | `inbox → defining → defined → released` (+ `wontfix`) | requirements + spec (epic-level, D3); the feature folder | never directly |
| `story` | Atomic unit of all three loops: independently testable & shippable; one story = one worktree = one branch = one `/plan` = one `tasks.yaml` (D1). | `draft → ready → planned → in-progress → done → released` (+ `blocked`, `wontfix`) | a `/plan` + a `tasks.yaml` under the epic's `stories/` | yes (Loop 2) |

Epic in-between states (`in-flight`, `all-stories-done`) are **derived** by rolling up children at render time — never stored, so never stale.

## Frontmatter — shared fields

YAML frontmatter at the top of every item file. Unrecognized fields are preserved on edit but ignored.

```yaml
---
schema_version: 1              # shared §3; absent == 1
id: 0042
kind: story                    # epic | story — absent == story (back-compat, see Migration)
title: SSL renewal cron is flaky
type: bug                      # enum (below)
status: draft                  # enum — interpreted against the item's kind machine
priority: should               # enum
score: 280                     # optional, integer 1-1000 (ICE: Impact x Confidence x Ease)
labels: [auth, ops]            # optional, free-string list
route: feature                 # optional pipeline route: feature | skill | lite (story inherits epic's unless overridden)
created: 2026-04-25            # ISO date, set on create, never modified
updated: 2026-04-25            # ISO date, updated on every write
source:                        # optional, path to originating doc (e.g. an /ideate brief, or a /plan/verify auto-capture)
released:                      # optional, vX.Y.Z — written ONLY by /complete-dev --epic (D6)
---
```

## Frontmatter — epic-only fields

```yaml
kind: epic
status: defined                # epic machine: inbox → defining → defined → released | wontfix
feature_folder: docs/pmos/features/2026-06-12_magazine-interop/
requirements_doc: docs/pmos/features/2026-06-12_magazine-interop/01_requirements.html  # set by /feature-sdlc define
spec_doc:         docs/pmos/features/2026-06-12_magazine-interop/02_spec.html           # set by /feature-sdlc define (feature/lite epics)
design_doc:       docs/pmos/features/2026-06-12_magazine-interop/02_design.html         # route: skill epics ONLY — the cross-skill coherence contract stories cite (G2); set by /feature-sdlc define --route skill in place of spec_doc
```

For `route: skill` epics there is **no epic-level `spec_doc:`** — the skill "spec" is per-skill and folds into each story's `/plan`. Instead the epic carries a **`design_doc:`** (G2): the shared design contract the stories cite by anchor (the role `spec_doc:` plays for feature epics). Its source is an adopted design-doc seed, a page synthesized from the feedback triage, or `skill-new` epic requirements. `feature`/`lite` epics carry `spec_doc:` and leave `design_doc:` absent; the two are mutually exclusive by route.

## Frontmatter — story-only fields

```yaml
kind: story
parent: 0010                   # MANDATORY for stories (D2) — the epic id
status: planned                # story machine: draft → ready → planned → in-progress → done → released | blocked | wontfix
dependencies: [0013]           # optional, story-level: gates pickup AND defines merge order (D6); intra-epic only
worktree:                      # set at FIRST claim (D10); non-null ⇒ re-claims re-enter it (D19); null ⇒ create fresh from main
plan_doc:   docs/pmos/features/2026-06-12_magazine-interop/stories/0012-opml-export/03_plan.html
tasks_file: docs/pmos/features/2026-06-12_magazine-interop/stories/0012-opml-export/tasks.yaml
claimed_by:                    # display/audit MIRROR only — ground truth is backlog/claims/<id>.lock (O_EXCL, D13)
pr:                            # optional, set by /verify --backlog or `link`
# --- build-loop reconcile poison-guard fields (epic 0612-w4e; skill-managed) ---
resume_attempts: 0             # skill-managed: consecutive UNPRODUCTIVE build-resume count; reset to 0 on forward progress; cap 2 → blocked (D4/D5)
last_progress:                 # skill-managed: marker of the last observed progress — last completed task id OR the commit sha at the prior resume's start; reconcile compares against it to detect forward progress (D4)
driver_holder:                 # skill-managed: stable per-loop holder id that last claimed/resumed (mirror of the claim lock's holder); lets reconcile recognize its own abandoned claim (D3)
```

`dependencies:` is **inter-story only** and must point at sibling stories within the same epic (D24). Task-level ordering lives in `tasks.yaml deps:` and is **intra-story only** — the two systems never cross (D24 litmus: if a task in story A depends on a task in story B, the split is wrong — merge the stories or move the task).

`resume_attempts`, `last_progress`, and `driver_holder` are the cross-tick durable store for the build loop's `reconcile-in-flight` step 0 (`feature-sdlc/SKILL.md#build-mode`) — they live on the story item (not in the per-worktree `state.yaml`) because `reconcile` runs **before** the story worktree exists and must survive a worktree recreated fresh. They are **skill-managed**: rejected by `/backlog set` with the standard `the skill manages it` message (same posture as `id`/`created`/`updated`, D7). Absent `resume_attempts` reads as `0`. Design + decision log: `docs/pmos/features/2026-06-12_build-resume-reconcile/02_design.html#decisions`.

### Enum values (the skill MUST validate against these and never invent new ones)

| Field | Allowed values |
|---|---|
| `kind` | `epic` \| `story` (absent == `story`) |
| `type` | `feature` \| `enhancement` \| `bug` \| `tech-debt` \| `chore` \| `docs` \| `idea` \| `spike` |
| `priority` | `must` \| `should` \| `could` \| `maybe` |
| `route` | `feature` \| `skill` \| `lite` |
| `status` (epic) | `inbox` \| `defining` \| `defined` \| `released` \| `wontfix` |
| `status` (story) | `draft` \| `ready` \| `planned` \| `in-progress` \| `done` \| `released` \| `blocked` \| `wontfix` |

`status` is validated against the machine matching the item's `kind`. The legacy flat enum (`inbox, ready, spec'd, planned, in-progress, done, wontfix`) is retired; `spec'd` no longer exists for stories (spec is epic-level per D3) — see Migration.

### Story status gate semantics (each status is a loop boundary)

| Status | Gate to enter it |
|---|---|
| `ready` | ≥1 acceptance criterion (what makes unattended Loop 2 safe) AND groomed `dependencies:` |
| `planned` | `plan_doc` + `tasks_file` both exist (stamped by `/plan`); for `route: lite`, only `tasks_file` (authored at grooming, D15) |
| `in-progress` | a claim lock is held (D13) and `/execute` has started |
| `done` | a `/verify` PASS (PASS-WITH-GAPS → `blocked` with gaps appended to the body — the return-to-human channel) |
| `blocked` | re-enterable from `in-progress`; exits back to `planned`/`in-progress` after human action — re-pickup REUSES the existing `worktree:` and resumes from `tasks.yaml` (D19) |
| `released` | written ONLY by `/complete-dev --epic` (D6) |

A `dependencies:` entry pointing at a `wontfix` story is permanently unsatisfiable: the dependent flips `blocked` and surfaces in `groom` with the reason (D30) — never silently skipped.

### Epic status gate semantics

| Status | Meaning |
|---|---|
| `inbox` | captured, not yet defined — surfaces in `groom` as "needs definition" |
| `defining` | `/feature-sdlc define` is mid-flight (requirements/spec/story-split) |
| `defined` | definition merged to main; stories exist at `planned`; epic is open for additions (D16) |
| `released` | `/complete-dev --epic` shipped it; `released:` stamped |
| `wontfix` | descoped epic |

### Defaults on create

- `schema_version: 1` (shared §3)
- `kind: story` unless `--kind epic` / auto-wrap (D18) selects `epic`
- `status:` — `draft` for a story, `inbox` for an epic
- `priority: should`
- `score:` omitted (the field is absent, not present-and-empty)
- `created`, `updated`: today's ISO date (shared §3)
- a story created via `/backlog add` is auto-wrapped in a same-titled singleton epic (D18) unless `--epic <id>` attaches it to an existing one
- All other optional fields: present with empty value (e.g., `spec_doc:`)

## Body

Three fixed H2 sections, all optional. When present they MUST appear in this order so a parser can read them deterministically:

```markdown
## Context
Why this exists, what problem it solves, links to discussions. (Epics: the goal / journeys summary.)

## Acceptance Criteria
- [ ] Behavior 1
- [ ] Behavior 2

## Notes
Free-form. Investigation, decisions, screenshots, links. /verify appends gap lines here on a blocked story.
```

Items captured via `/backlog add` may have NO body at all — title-only is valid (D26: shape is enforced at the `ready` gate, never at capture). The body is created on first refine/promote/define.

## tasks.yaml — single home of task state (D4)

Tasks are NEVER backlog items. They live in one file per story, emitted by `/plan`, status-written by `/execute`, rendered read-only by `/backlog show <id> --tasks`. Path: `{epic feature_folder}/stories/{story-id}-{slug}/tasks.yaml`.

```yaml
# docs/pmos/features/<epic>/stories/<story>/tasks.yaml
story: 0012
spec: ../../02_spec.html          # the epic spec this plan implements (route: skill stories cite ../../02_design.html — the epic design_doc — instead, G2)
tasks:
  - id: T1
    title: exporter script opml-export.js
    deps: []                      # intra-story task ids only (D24)
    parallel: true                # [P] marker — wave-planner hint
    acceptance:
      - "node opml-export.js fixtures/feeds.json emits OPML that xmllint validates"
    status: done                  # pending | in-progress | done | skipped — readiness DERIVED from deps, never stored (D21)
    evidence:                     # optional: test name / screenshot path / commit sha
  - id: T2
    title: wire /magazine export --opml
    deps: [T1]
    status: in-progress
  - id: T5
    title: backfill feed UUIDs
    deps: []
    discovered: true              # appended by /execute for AC-required work found mid-run (D29a)
    status: pending
```

Rules: `/plan` is the only creator — with one exception: `/execute` may append `discovered: true` tasks required to satisfy the story's **existing** ACs (D29a); `/execute` is the only `status:` writer; the plan HTML is narrative (approach, risks, decision log) that cites task IDs and never holds status (D4); `/backlog` renders it read-only. Regenerating `tasks.yaml` on a plan revision is safe and expected (derived artifact). Task `status` enum is exactly `pending | in-progress | done | skipped` — readiness ("ready" = `pending` + all `deps` done) is **derived by every reader** (the wave planner, `--tasks` views), never stored (D21).

## Claim locks (D13)

Atomic story claims are O_EXCL lockfiles under `backlog/claims/<id>.lock`, managed by [`scripts/claim-lock.cjs`](scripts/claim-lock.cjs) (the re-homed /magazine-worker pattern). The lockfile is the ground truth; the item's `claimed_by:` is a display/audit mirror. Default stale-lease TTL is 4h with steal-on-warning; `/backlog unclaim <id>` releases manually. `backlog/claims/` is created on first claim; lockfiles are transient and gitignored (see Migration).

## Feature-folder layout per epic

```
docs/pmos/features/2026-06-12_magazine-interop/
├── 01_requirements.html              # epic-level (Loop 1) — feature/lite; or skill-new epic requirements (G7)
├── 02_spec.html                      # epic-level (Loop 1) — feature/lite epics
│   (route: skill epics carry 02_design.html instead of 02_spec.html — the design_doc, G2)
└── stories/
    ├── 0012-opml-export/{03_plan.html, tasks.yaml}
    ├── 0013-rss-import/{03_plan.html, tasks.yaml}
    └── 0014-bundle-share/{03_plan.html, tasks.yaml}
```

Pre-three-loop feature folders keep their flat layout; the `stories/` layout applies only to epics created after this change (no back-migration of shipped folders — they are frozen decision records).

## INDEX.md format

`backlog/INDEX.md` follows the regenerable-cache contract in `../_shared/tracker-crudl.md` §5 (never the source of truth; regenerated from `items/` on every write op and on `/backlog rebuild-index`; `Last regenerated:` line; empty cells, never `null`). Backlog's binding (grouping/sort/columns):

```markdown
# Backlog

Last regenerated: 2026-04-25

## Epics
| id | status | route | plugin | stories (done/total) | title |
|----|--------|-------|--------|----------------------|-------|
| 0010 | defined | feature | pmos-learnkit | 1/3 | Magazine interop |

## must
| id | kind | type | status | parent | title | spec | plan | pr |
|----|------|------|--------|--------|-------|------|------|----|
| 0012 | story | feature | planned | 0010 | OPML export command | | 03_plan.html | |

## should
...
## could
...
## maybe
...
```

The `## Epics` rollup table lists every epic with a **derived** `stories (done/total)` count (non-wontfix stories) — collapses single-story epics into one row; epics are ordered by **`created` desc**. Stories are then grouped by `priority` (must > should > could > maybe), sorted within each group by `score` desc (nulls last), then **`created` desc** as the chronology tiebreak (replacing the former `updated` desc tiebreak). **Sort never keys on `id`** — ids are non-monotonic under the `<YYMMDD>-<rand3>` scheme (`_shared/tracker-crudl.md` §2), so `created:` is the chronology source (the same rationale as §2.2's no-lexical-id-sort rule); `score` remains the primary prioritization signal, unchanged. Archived items are NOT listed. The `spec` / `plan` / `pr` columns show the filename only (not the full path) when set, otherwise blank.

INDEX.md is a **derived artifact** (§5): the only sanctioned writer is the `rebuild-index` regeneration (scan `items/*.md`) — `#add`, `set`, `promote`, and the `define` definition-merge all regenerate rather than hand-appending rows, so INDEX can never drift from the item files or merge into duplicate rows (the root of the 0016 duplicate-id incident — `docs/pmos/features/2026-06-12_concurrency-safe-ids/02_design.html#incident`).

## Archive

Backlog archives, per `../_shared/tracker-crudl.md` §6. Binding: archive root `backlog/archive/`, so items land at `backlog/archive/YYYY-QN/{id}-{slug}.md` (full content preserved, mirrors `items/`, never in `INDEX.md`).

## Migration (run lazily / manually — 8 open items, manual is fine)

- Existing items with no `kind:` read as `kind: story`. Backfill `parent:` to a per-item singleton "orphan" epic, or group manually.
- Legacy story status `spec'd` maps to `ready` (spec is epic-level now). The legacy flat status enum is otherwise a subset of the story machine.
- Item 0003's unofficial `closed:`/`closed_reason:` fields → `wontfix` during this schema change.
- Add `backlog/claims/` to `.gitignore` (lockfiles are transient, machine-local).
