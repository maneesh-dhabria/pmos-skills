# Design: three-loop backlog — epics, stories, tasks

**Date:** 2026-06-10 (clarifications D23–D30 + git-level timeline + capture-to-release journey added 2026-06-12) · **Status:** Design agreed with maintainer, then **deep-grilled same day (14/14 branches resolved — amendments D9–D22 below; four genuine defects in the original draft closed: G1/G3/G7/G11)**; to be implemented as a **separate piece of work** (a dedicated `/skill-sdlc` run), independent of the ops-observations fix batches already applied. · **Inputs:** [05_backlog-ideation-loop.md](05_backlog-ideation-loop.md) (gap analysis), the maintainer's three-loop proposal (2026-06-10 discussion), prior-art research (below), and the grill report (`.pmos/grills/2026-06-10_backlog-three-loop-design.html`).

## Problem

The maintainer wants three independently-runnable loops over a shared backlog:

1. **Define** (interactive, human-paced) — capture and shape ideas; produce requirements/spec/plans so work is execution-ready.
2. **Build** (unattended-capable) — pick ready work, execute + verify it, return blockers to the human.
3. **Release** (semi-interactive) — club a feature's finished work into one merge/changelog/version/deploy.

Today: /backlog captures but nothing grooms (8 items, all `inbox`, 4 weeks stale); 0 of 14 /ideate briefs ever became items; nothing can answer "what's next" unattended; /complete-dev never writes back. /feature-sdlc is end-to-end only — there is no stop-at-plan or pick-up-at-execute entry point.

## Prior art consulted

- **[Beads](https://github.com/steveyegge/beads)** (Yegge) — git-backed dependency DAG; computed ready-work (`bd ready` = no open blockers); atomic claim (`--claim` sets assignee + in-progress in one op); epics as containers, never executed. → We adopt *computed ready + atomic claim*, at story level.
- **[Backlog.md](https://github.com/MrLesk/Backlog.md)** — markdown task files in-repo; acceptance criteria required; project-wide Definition of Done; one task = one agent session = one PR. → We adopt *AC-gated readiness* and the *one-story-one-session sizing rule*.
- **[GitHub spec-kit](https://github.com/github/spec-kit)** — Spec → Plan → Tasks → Implement; tasks.md **generated from the plan, grouped by user story**, dependency-ordered with `[P]` parallel markers, derived and regenerable. → We adopt the *derived task artifact* as the single home of task state.

Convergent principles: (1) the executable unit carries its own AC + status and is machine-queryable; (2) "next" is computed from deps + status and claimed atomically, never hand-picked from prose; (3) never two live homes for tasks — either the plan lives in the task or tasks are derived from the plan and become the execution source of truth.

## Decisions (locked 2026-06-10)

| # | Decision | Rationale |
|---|---|---|
| D1 | **Story is the atomic unit** of all three loops: independently testable & shippable; one story = one worktree = one branch = one /plan = one tasks.yaml. | Matches the pipeline's natural increment and Backlog.md's session-sizing rule. |
| D2 | **Epics are a mandatory level.** Every story has a `parent:` epic (single-story epics allowed). Epic owns requirements + spec; epic is the Loop-3 release unit. Epics are never executed directly. | Maintainer decision; uniform release-train semantics. |
| D3 | **Requirements + spec run once at epic level; /plan runs per story.** Story plans cite the epic spec by anchor; no epic-level plan exists. | One tech design serving multiple workstreams, like real orgs; keeps stories independently shippable. |
| D4 | **Tasks live in `tasks.yaml` in the story's feature folder** — emitted by /plan, updated by /execute, rendered read-only by /backlog. Tasks are NEVER backlog items. (Option C; B = tasks-as-backlog-rows rejected: forces /plan//execute rebuild or two-home drift, churns permanent IDs on derived units; A = tasks-in-plan-prose rejected: state smeared across plan HTML + state.yaml, non-queryable, observed drift in 04_sdlc-artifact-model.md.) | Single home by construction; spec-kit-proven shape. |
| D5 | **No new orchestrator skill.** /feature-sdlc gains `define` and `build` subcommands (same state.yaml/worktree/resume machinery `prototype` mode already uses); /complete-dev gains `--epic`. The *looping* is the harness (`/loop`, cron) invoking one bounded iteration per call. | Orchestrator+thin-alias is the repo's proven best pattern; a second orchestrator duplicates worktree/state machinery. |
| D6 | **Epic release train** (Loop 3 v1 scope): merge story branches in dependency order, one changelog assembled from story summaries, one version bump/tag, write `released:` back to all stories + epic. | Maintainer chose epic-level release. `dependencies:` does double duty: pickup gating AND merge order. |
| D7 | **Loop 1 ends by merging the epic's definition branch to main** (docs-only — including all story plans + tasks.yaml, per D10). Story worktrees are created later, at Loop-2 claim time, branched from current main. *(Amended by D10/D20.)* | Keeps story branches unentangled and never-stale; makes the merge train tractable. |
| D8 | End-to-end `/feature-sdlc <idea>` **remains unchanged** as a drive mode (no backlog involvement unless `--backlog`). | Story-sized idea + free afternoon = one command is still the right UX. |

### Grill amendments (locked 2026-06-10, deep grill — 14 questions, all resolved on the recommended position)

| # | Amendment | Rationale / what it fixes |
|---|---|---|
| D9 | **Claim-time dep merge.** At claim, Loop 2 merges every `done` dep story's branch (transitive closure) into the story worktree before /execute starts. | *Closes a real defect:* the dep gate passed while the dependency's code sat unmerged on a sibling branch until release — the dependent worktree never contained it. |
| D10 | **One definition worktree; story worktrees born at claim.** All /plan runs happen in the epic definition worktree; plans + tasks.yaml ride the D7 merge to main. The claim step creates the story worktree fresh from current main (+ D9 dep merges). Amends D7 and Loop 1 steps 4–5. | Branches are never born stale; Loop 1 needs 1 worktree instead of 1+N. |
| D11 | **Backlog state lives in main only; tasks read through the worktree.** Backlog item files are mutated exclusively in the main checkout (claim/in-progress/done/blocked stamps — never via a worktree's copy). tasks.yaml stays branch-local; while a story is claimed, `--tasks` views resolve the file through the worktree directory on disk. | *Closes a real defect:* item status written on a story branch is invisible to the main-checkout picker until release — `done` stories would be re-picked. |
| D12 | **Backlog mutations auto-commit, path-scoped.** Every mutation commits immediately with `git commit -- backlog/` and a conventional message (`chore(backlog): 0012 → in-progress [claim]`). | Claims get crash-durability + audit trail; main stays clean between unattended iterations. Docs-only direct-to-main commits, same class as D20. |
| D13 | **Claim = O_EXCL lockfile + YAML mirror.** Atomic claim is `backlog/claims/<id>.lock` created with O_EXCL (the /magazine-worker pattern), containing holder + timestamp; `claimed_by:` in the item is display/audit only. Stale-lease TTL (default ~4h) with steal-on-warning; manual `/backlog unclaim`. | YAML check-then-write is not atomic; two drivers could double-claim. |
| D14 | **Integrated deterministic gate at release.** Between the merge train and the version bump, Loop 3 runs the repo's deterministic suite (tests, lints, hard-gate scripts) on the merged tree; red ⇒ train stops, epic → `blocked`. No fresh LLM review pass. | Two independently-PASSing stories can interact badly; deterministic checks do the catching (0-of-27 judge-rerun yield, 06_self-verification-value.md). |
| D15 | **Lite route = tasks.yaml only.** `route: lite` stories skip the plan HTML; grooming authors a minimal tasks.yaml (1–3 tasks) directly from the ACs. The `planned` gate requires only `tasks_file` when `route: lite`. | *Closes a real defect:* as drafted, lite stories could never legally reach `planned`. |
| D16 | **Epics open for additions, never removals.** New stories may join a `defined` epic any time (enter at `draft`, mini define pass + optional spec-delta); descoping = `wontfix`, never deletion. Loop 3 precondition: all **non-wontfix** stories `done`, evaluated at release time. | Discovered work (auto-capture, Loop-2 gaps) needs a landing spot mid-epic; frozen scope recreates today's leak. |
| D17 | **One plugin (release unit) per epic**, validated at the story-split step; substrate-only stories use the existing "ride which release?" rule. Cross-plugin initiatives = sibling epics with cross-epic deps. | /complete-dev's single-plugin invariant stays untouched; the train stays a straight line. |
| D18 | **Auto-wrap epic at capture.** `/backlog add <title>` creates the story AND a same-titled single-story epic silently; `--epic <id>` attaches instead; stories are re-parentable until claimed; rollup views collapse single-story epics. | Keeps D2 invariant without killing one-keystroke capture. |
| D19 | **Re-pickup reuses the worktree.** First claim sets `worktree:`; later claims re-enter it if it exists on disk (refresh from main + D9 dep merges, resume from tasks.yaml state). Fresh-from-main only when the field is null. | *Closes a real defect:* D10's fresh-worktree rule would orphan a blocked story's half-finished work. |
| D20 | **Docs-only merge class for the definition merge.** `define` merges to main only after a deterministic path-scope check: the branch diff touches nothing outside `{docs_path}/features/**` and `backlog/**` — any other path ⇒ refuse with the file list. No version bump, no tag. /complete-dev remains the only path that ships code. | Sanctions D7 without weakening the canonical-release-path policy. |
| D21 | **Task status enum stores 4 states** (`pending | in-progress | done | skipped`); readiness is derived from deps by every reader (/execute's wave planner, `--tasks` views). | `status: ready` was a stored derived fact — the drift class this design exists to kill. |
| D22 | **Picker uses an epic-focus tiebreak.** Ordering: stories of in-flight epics (any sibling in-progress/done) first, then priority bucket → score → updated. | Globally-greedy picking maximizes WIP across epics while shipping nothing; this drives epics to releasable completion. |

### Post-grill clarifications (locked 2026-06-12)

| # | Clarification | Rationale / what it fixes |
|---|---|---|
| D23 | **Release-candidate discovery surface.** `/backlog releases [--json]` lists epics by rollup-derived readiness: **release-ready** (all non-wontfix stories `done` — shows epic id, plugin, each completed story with its one-line summary and verify verdict, i.e. a preview of the changelog the train will assemble, plus the copy-ready `/complete-dev --epic <id>` command), **in-flight** (progress rollup, e.g. `3/5 done, 1 blocked`), and **blocked** (which story, what gap). All readiness is derived at render time — never stored. Ergonomic twin: `/complete-dev --epic` with **no id** offers the release-ready list as a one-shot prompt instead of erroring. | Without a discovery surface, "what can I release and what's in it?" requires reading item files by hand — Loop 3 stays human-triggered (deliberate), so the human needs a zero-effort answer to *what* to trigger. |
| D24 | **Dependency-scoping litmus rule.** Task deps (`tasks.yaml deps:`) may never cross story boundaries; story deps (`dependencies:`) may never point inside another story's tasks. **If a task in story A depends on a task in story B, the split is wrong** — merge the stories or move the task. Default to vertical-slice stories (endpoint + UI + tests for one capability, layered ordering handled as tasks inside); split horizontally (backend story / frontend story) only when the lower layer is independently shippable. Optional parallelization escape: drop the story dep and build the consumer against the epic spec's interface contract (mocked) — the D14 integrated gate catches contract drift at release; otherwise accept serialization (an unattended queue idles nothing by waiting). | A reader confused per-task and per-story isolation — the design's two dependency systems compose only if their scopes never overlap. |
| D25 | **Loop-1 discovery surface.** `/backlog groom` lists everything waiting on a *human*, grouped with copy-ready next commands: **needs definition** (epics at `inbox`/`defining` → `/feature-sdlc define <id>`), **needs grooming** (stories at `draft` / missing ACs → `/backlog refine <id>`), **blocked** (with the gap text → fix, then `/feature-sdlc build --story <id>`), **stale claims** (→ `/backlog unclaim <id>`). Bare `/backlog` becomes the three-queue dashboard: groom (your desk) + `next` preview (the machine's queue) + `releases` (the release shelf). | Three loops need three queues; the human queue was missing — the 4-week-stale all-`inbox` backlog is the direct evidence that nothing resurfaces captured work. |
| D26 | **Capture input contract: a sentence.** `/backlog add "<title>"` is the complete required input — type/priority inferred (existing heuristics), kind=story + auto-wrap epic (D18), status `draft`/`inbox`. Everything else (`--epic`, `--type`, `--route`, body, `source:`) is optional sugar. The quality bar is enforced at the `ready` gate (ACs required before the machine may touch it), never at `add`. | If capture demands shape, capture stops happening — the current leak. ACs are mandatory before *execution*, not before *writing the idea down*. |
| D27 | **Ideate close-capture: default-on, verdict-aligned.** At /ideate's close, one keystroke: pressure-test verdict *build/pursue* → Recommended = "capture as epic (`inbox`, `source:` → brief)"; verdict *kill/park* → Recommended = "don't capture" (optionally capture as `wontfix` for the record). Non-interactive runs AUTO-PICK the verdict-aligned default. | Not "always adds" — "never silently drops." Auto-adding every brief would pollute the backlog with ideas the premortem correctly killed; the 0-of-14 leak is fixed by the default, not by removing the choice. |
| D28 | **/ideate stays standalone; `define` consumes its brief.** No folding into /feature-sdlc: ideate's charter is pre-commitment thinking (many runs correctly end "don't build this") and every pipeline stage in this repo is dual standalone+orchestrated — the highest-graded pattern. The missing piece is wiring: when `define` picks up an epic whose `source:` is an ideate brief, Phase 1a detects it, **skips re-ideating**, and feeds the brief into /requirements as the seed. | Without brief detection, define would ask you to ideate an idea you already ideated; with it, nothing is thought about twice and nothing is lost between the two tools. |
| D29 | **Discovered-work routing.** Mid-execution discoveries split on one test — is it needed to satisfy the story's *existing* ACs? (a) **Yes** → /execute may append a `discovered: true` task to tasks.yaml and continue (the one exception to "/plan is the only creator"; /execute remains sole status writer; the append is logged in the task itself). (b) **No (beyond the ACs)** → never built inline; auto-captured as a `draft` story in the epic (D16) and surfaced in `groom`. | "Need task addition during development" is routine, not exceptional; without a routing rule it either gets silently gold-plated into the story or silently lost. The AC boundary makes the call deterministic. |
| D30 | **Wontfix poisons its dependents, visibly.** The picker treats a dep on a `wontfix` story as permanently unsatisfiable: the dependent story flips `blocked` and surfaces in `groom` with the reason — the human drops the dep, re-points it, or wontfixes the dependent too. Never silently skipped, never auto-resolved. | Descoping a story (D16) must not strand its dependents in an invisible forever-wait. |

## Schemas

### Epic item — `backlog/items/<id>-<slug>.md`

```yaml
---
id: 0010
kind: epic                  # NEW field: epic | story
title: Magazine interop (OPML/RSS import-export)
type: feature               # existing enum: feature | bug | tech-debt | idea
status: defined             # epic machine: inbox → defining → defined → released | wontfix
priority: should
route: feature              # feature | skill | lite — pipeline its stories run (story may override)
labels: [pmos-learnkit]
feature_folder: docs/pmos/features/2026-06-12_magazine-interop/
requirements_doc: docs/pmos/features/2026-06-12_magazine-interop/01_requirements.html
spec_doc: docs/pmos/features/2026-06-12_magazine-interop/02_spec.html
released: null              # vX.Y.Z written by /complete-dev --epic
---
## Goal
<problem statement / journeys summary>
```

Epic in-between states (`in-flight`, `all-stories-done`) are **derived** by rolling up children at render time — never stored, so never stale.

### Story item

```yaml
---
id: 0012
kind: story
parent: 0010                # mandatory for stories (D2)
title: OPML export command
status: planned             # story machine below
priority: must
dependencies: [0013]        # story-level: gates pickup AND defines merge order (D6)
route: feature              # inherited from epic unless overridden (e.g. one lite story in a feature epic)
worktree: null              # set at FIRST claim (D10); non-null ⇒ re-claims re-enter it (D19)
plan_doc:  docs/pmos/features/2026-06-12_magazine-interop/stories/0012-opml-export/03_plan.html
tasks_file: docs/pmos/features/2026-06-12_magazine-interop/stories/0012-opml-export/tasks.yaml
claimed_by: null            # NEW: display/audit mirror — ground truth is backlog/claims/<id>.lock (O_EXCL, D13)
released: null
---
## Story
<one-paragraph user-value statement>
## Acceptance criteria
- [ ] /magazine export --opml writes OPML that xmllint validates
- [ ] All active feeds present; muted feeds excluded
- [ ] Round-trips through /magazine add --opml
```

**Story status machine:** `draft → ready → planned → in-progress → done → released`, plus `blocked` (re-enterable from in-progress; exits back to planned/in-progress after human action — re-pickup **reuses the existing worktree** and resumes from tasks.yaml, per D19) and `wontfix`.

Gate semantics (each status is a loop boundary):
- `ready` requires ≥1 acceptance criterion (what makes unattended Loop 2 safe) and groomed deps.
- `planned` requires `plan_doc` + `tasks_file` to exist (stamped by /plan via the existing pipeline-bridge); for `route: lite`, only `tasks_file` (authored at grooming, D15).
- `done` requires a /verify PASS (PASS-WITH-GAPS → `blocked` with gaps appended to the item body — the return-to-human channel).
- `released` written only by /complete-dev.

Existing statuses `spec'd` is retired for stories (spec is epic-level per D3); migration below.

### tasks.yaml — single home of task state (D4)

```yaml
# docs/pmos/features/<epic>/stories/<story>/tasks.yaml
story: 0012
spec: ../../02_spec.html          # the epic spec this plan implements
tasks:
  - id: T1
    title: exporter script opml-export.js
    deps: []
    parallel: true                # [P] marker — wave planner hint
    acceptance:
      - "node opml-export.js fixtures/feeds.json emits OPML that xmllint validates"
    status: done                  # pending | in-progress | done | skipped — readiness DERIVED from deps, never stored (D21)
    evidence: null                # optional: test name / screenshot path / commit sha
  - id: T2
    title: wire /magazine export --opml
    deps: [T1]
    status: in-progress
  - id: T3
    title: exporter tests
    deps: [T1]
    parallel: true
    status: pending               # readable as "ready": pending + all deps done
  - id: T4
    title: docs + changelog note
    deps: [T2, T3]
    status: pending
```

Rules: /plan is the only creator — with one exception: /execute may append `discovered: true` tasks required to satisfy the story's existing ACs (D29); /execute is the only status writer; the plan HTML is narrative (approach, risks, decision log) that cites task IDs and never holds status; /backlog renders it read-only (`/backlog show 0012 --tasks`). Regenerating tasks.yaml on a plan revision is safe and expected (derived artifact).

### Feature-folder layout per epic

```
docs/pmos/features/2026-06-12_magazine-interop/
├── 01_requirements.html              # epic-level (Loop 1)
├── 02_spec.html                      # epic-level (Loop 1)
└── stories/
    ├── 0012-opml-export/{03_plan.html, tasks.yaml}
    ├── 0013-rss-import/{03_plan.html, tasks.yaml}
    └── 0014-bundle-share/{03_plan.html, tasks.yaml}
```

## Loop contracts

### Loop 1 — Define: `/feature-sdlc define <epic-id | idea>`

1. Resolve/create the epic item (idea seed → `/backlog add --kind epic` if new; quick captures arrive pre-wrapped in a singleton epic per D18). Status → `defining`. Epics remain open for story additions after `defined` — a mini define pass + optional spec-delta (D16).
2. Epic worktree: if the epic's `source:` points at an /ideate brief, Phase 1a skips re-ideating and feeds the brief into /requirements as the seed (D28); then /requirements → /grill (→ /creativity, /wireframes, /prototype per tier — unchanged gates) → /spec, at epic level. Bridge stamps `requirements_doc`/`spec_doc`. (Epics awaiting this loop surface in `/backlog groom`, D25.)
3. **Story-split step (new):** carve the spec into stories with the maintainer — each gets title, AC, deps, route; created as `kind: story` children (`draft` → `ready` once ACs land). Sizing rule: a story is what one /execute run can carry (one session, one PR); default to vertical slices, and apply the D24 litmus — if a task in one story would depend on a task in another, fix the split. **Validate every story targets the epic's single plugin/release unit (D17).**
4. Per ready story: run /plan **inside the epic definition worktree** (D10), scoped by (epic-spec anchors + story ACs) → emits 03_plan.html + tasks.yaml → story `planned`. Lite stories skip /plan; grooming authored their tasks.yaml directly (D15). **No story worktrees are created in Loop 1.**
5. Merge the epic definition branch to main — gated by the deterministic docs-only path-scope check (`{docs_path}/features/**` + `backlog/**` only; anything else ⇒ refuse with the file list; no bump, no tag — D20). Epic → `defined`. STOP.

### Loop 2 — Build: `/feature-sdlc build [--next | --story <id>] [--non-interactive]`

One bounded iteration = one story:

1. **Pick** — `/backlog next --kind story --status planned --json`: deps all `done`+ (a dep on a `wontfix` story is permanently unsatisfiable → dependent flips `blocked` and surfaces in groom, D30), unclaimed, ordered **in-flight-epic-first** (any sibling in-progress/done, D22), then priority-bucket → score → updated. (Beads `bd ready`, story-level.)
2. **Claim** — create `backlog/claims/<id>.lock` via O_EXCL (atomic; refuse if it exists; stale-lease TTL with steal-on-warning — D13), then stamp `claimed_by:` in the item **in the main checkout** and auto-commit path-scoped (`chore(backlog): …` — D11/D12).
3. **Worktree** — if the item's `worktree:` field names an existing worktree, re-enter and refresh it (resume case, D19); else create it fresh from current main and set the field (D10). Either way, **merge every `done` dep story's branch in (transitive closure, D9)**. Then **/execute** consumes tasks.yaml as its work queue (wave planner reads `deps` + `parallel`, derives readiness per D21; per-task TDD + commit; updates `status:` per task — T<N> resume preserved). Mid-execution discoveries route per D29: needed for the existing ACs → append a `discovered: true` task and continue; beyond the ACs → auto-capture as a `draft` story in the epic, never built inline.
4. **/verify** — story ACs join the spec-compliance table; the browser-evidence hard gate applies.
5. **Write-back** — in the **main checkout** (D11), auto-committed (D12): PASS → `done`; FAIL / PASS-WITH-GAPS → `blocked` + gaps appended to the item. Remove the claim lock either way. STOP.

Unattended posture: W14 non-interactive contract (AUTO-PICK recommended options; buffer open questions into the item). Driver: `/loop 1h "/feature-sdlc build --next --non-interactive"` or a scheduled run. Multiple drivers are safe via claims.

**Dependency scoping (D24):** `tasks.yaml deps:` is intra-story only; `dependencies:` is inter-story only. Tasks of one story share ONE worktree and ONE branch — a task dep is just wave ordering (sequential commits on the same branch; nothing is merged). Cross-worktree mechanics (D9 claim-time merges) exist only between stories. If a task in story A needs a task in story B, fix the split, not the loop.

### Loop 3 — Release: `/complete-dev --epic <id>`

**Discovery (D23):** `/backlog releases` answers "what can I release, and what's in it?" — release-ready epics with their completed stories' summaries (the changelog preview) and the copy-ready command; in-flight epics with rollup progress; blocked epics with the gap. `/complete-dev --epic` with no id offers that same release-ready list. Loop 3 itself is always explicitly human-triggered — the discovery surface exists so triggering costs nothing.

Preconditions: all **non-wontfix** stories `done` (D16; or an explicit `--stories` subset, confirmation-gated). Then: merge story branches into main **in dependency order** → **integrated deterministic gate on the merged tree** (tests, lints, hard-gate scripts; red ⇒ train stops, epic → `blocked`; no fresh LLM review pass — D14) → assemble one changelog from story summaries → one version bump + tag + push (existing complete-dev phases; single plugin guaranteed by D17) → write `released: vX.Y.Z` to every story + the epic → clean up story worktrees. Destructive prompts fire as usual (never short-circuit); the PASS-WITH-GAPS confirmation check (shipped 2026-06-10) applies per story.

## Worked timeline — one epic at the git level

The lifecycle of epic `#0010 magazine-interop` (stories: `#0013 backend export API`; `#0012 export UI` with `dependencies: [0013]`; `#0014 docs page`, independent), showing where every commit lands. The load-bearing invariant: **main only ever receives docs and backlog stamps until Loop 3; code reaches main exclusively through the epic release train.**

| Step | Command / event | Git effect |
|---|---|---|
| 1 | `/feature-sdlc define 0010` | Epic definition worktree on branch `define/0010`: requirements → spec → story split → 3× /plan (plans + tasks.yaml). **Zero story worktrees exist.** |
| 2 | Definition merge (D20 path-scope check passes) | `define/0010` → main. Main now holds spec + all plans + all tasks.yaml. Stories: `planned`. No bump, no tag. |
| 3 | Loop 2 iteration 1 picks **#0013** (0012 invisible — dep not `done`) | Claim lock + `chore(backlog): 0013 → in-progress [claim]` committed **on main** (D11/D12). Worktree `feat/0013` cut from current main (D10). Every task commits onto `feat/0013` — one branch, no per-task worktrees. Verify PASS → `chore(backlog): 0013 → done` on main. **`feat/0013` holds finished code, unmerged.** |
| 4 | Iteration 2 picks **#0012** (dep now satisfied) | Fresh `feat/0012` from main, then D9: `git merge feat/0013` inside 0012's worktree — the backend code is physically present; the UI builds and verifies against the real API. Tasks commit onto `feat/0012`. Done → stamped on main. |
| 4a | *(Vertical-slice contrast)* backend endpoint + frontend wiring as tasks T2/T4 of ONE story | No merging anywhere: the wave planner runs T2's wave first, T4's after — sequential commits in the story's single worktree (D24). |
| 5 | Iteration 3 picks **#0014** | Independent: fresh worktree, no dep merges. Done. End state of Loop 2: main = docs + stamps only; all code on three finished story branches. |
| 6 | `/backlog releases` | Reports #0010 release-ready: 3/3 stories done, per-story summaries (changelog preview), suggests `/complete-dev --epic 0010` (D23). |
| 7 | `/complete-dev --epic 0010` | Merge train in dep order: `feat/0013` → `feat/0012` (git dedupes — 0012 already contains 0013's commits) → `feat/0014`. Then the D14 deterministic gate on merged main (red ⇒ stop, epic `blocked`, nothing tagged). Then once for the whole epic: changelog from story summaries, ONE version bump, release-mechanics commit (specific files only), tag `pmos-learnkit/vX.Y.Z`, push everywhere, `released:` write-back to all 4 items, story worktrees deleted. |

Note the contrast with classic mode (D8): the no-flag `/complete-dev` remains "release the branch I'm standing in"; `--epic` is "release that epic's train". Neither mode ever scoops uncommitted work — by release time, everything is already committed (execute per task; backlog stamps per D12; complete-dev's own commit covers only the release mechanics it generates).

## Worked journey — one-line capture to release, with the edge cases

The same lifecycle from the *human's* seat: what you type, what the queues show, and what happens when reality misbehaves. Scenario: a stray thought about /magazine.

**Day 0 — capture (five seconds).**
`/backlog add "magazine: export my feeds as OPML"` — that sentence is the complete required input (D26). Inference fills `type: feature`, priority; D18 silently creates story `#0031` (`draft`) wrapped in singleton epic `#0030` (`inbox`). You return to whatever you were doing. *(Alternate entry: had this come out of an /ideate session, the close prompt's verdict-aligned default (D27) would have captured the brief as the epic with `source:` pointing at it.)*

**Day 3 — groom (the queue remembers, you don't).**
Bare `/backlog` shows the three-queue dashboard (D25); the groom queue lists `#0030 — needs definition → /feature-sdlc define 0030`. You run it. No ideate brief attached, so Phase 1a's classifier runs normally (D28 would have skipped it if `source:` held a brief). Requirements → spec at epic level; story split produces `#0031 OPML export` (must) and `#0032 OPML import` (should) — both vertical slices per D24; an "auto-sync to cloud" idea that surfaces during the split is judged out of scope and *not* created (ideas rejected at split simply don't enter; only accepted-then-descoped work becomes `wontfix`). /plan runs twice in the definition worktree; the definition merge lands plans + tasks.yaml on main (D20). Stories: `planned`. You walk away.

**Night 1 — Loop 2, iteration 1 (unattended).**
The picker takes `#0031`. Two discoveries mid-execution, routed by the D29 test — *is it needed for the existing ACs?*
- **Edge: in-scope discovered task.** T2 reveals the feed ledger lacks per-feed UUIDs, without which AC-2 (round-trip) cannot pass → /execute appends `T5 {discovered: true, title: backfill feed UUIDs}` to tasks.yaml and keeps going (D29a). No human needed.
- **Edge: out-of-scope discovery.** The agent notices exports would be nicer grouped by category — beyond the ACs → NOT built; auto-captured as `draft` story `#0034` in epic `#0030` (D29b), waiting in groom.
Verify PASS → `#0031 done`.

**Day 4 — groom again (two decisions, two minutes).**
The dashboard shows `#0034` (needs grooming). You decide category grouping isn't worth it → `wontfix` with a reason (D16).
- **Edge: wontfix with dependents.** Had any story listed `dependencies: [0034]`, it would now flip `blocked` and appear in groom with the reason — drop the dep, re-point it, or wontfix the dependent too (D30). Nothing waits invisibly on a dead story.

**Night 2 — iteration 2.**
The picker takes `#0032`. /verify returns **PASS-WITH-GAPS** (import preview never browser-verified — the evidence gate) → `blocked`, gaps appended to the item, claim lock removed.

**Day 5 — unblock and finish.**
Groom shows `#0032 blocked: import preview unverified`. You fix the preview issue, run `/feature-sdlc build --story 0032` — the claim finds `worktree:` set and **re-enters the existing worktree** (D19), resumes from tasks.yaml (done tasks stay done), verify PASS → `done`.

**Day 5 — release (you, two commands).**
`/backlog releases` → `#0030 release-ready: 2/2 non-wontfix stories done` with both story summaries (the changelog preview) — `#0034` excluded by the D16 precondition. `/complete-dev --epic 0030` → train merges `feat/0031`, `feat/0032` → D14 deterministic gate green → one changelog, one bump, tag, push → `released:` stamped on `#0030/#0031/#0032`; `#0034` remains `wontfix` as the permanent record of the descope; worktrees deleted.

- **Edge: late-arriving story.** Had you groomed `#0034` to `ready` instead on Day 4, `releases` would show `#0030 in-flight 2/3` and the train would wait for it (D16) — or you release the finished subset explicitly via `--stories 0031,0032` (confirmation-gated).

Total human touch-time across the journey: one sentence at capture, one define session, two groom decisions, one unblock, one release command. Everything else ran in the loops — and every deviation (discovered task, scope creep, descope, dependency on a corpse, browser gap, late addition) had a deterministic route back into a queue instead of into the void.

## Per-skill change list

| Skill | Change |
|---|---|
| /backlog | `kind:` + `claimed_by:` fields; story/epic status machines (+`released`, `blocked`, `draft`; retire `spec'd` for stories); `next` verb (`--kind --status --route --json --claim`) with in-flight-epic-first ordering (D22); O_EXCL claim locks under `backlog/claims/` + stale-lease + `unclaim` (D13); auto-wrap single-story epic at `add` / `--epic <id>` attach / re-parent until claimed (D18); main-checkout-only mutations + path-scoped auto-commit (D11/D12); epic rollup view (collapses singletons); `releases` discovery view — release-ready / in-flight / blocked epics with changelog preview, derived at render time (D23); `groom` human-queue view + bare-`/backlog` three-queue dashboard (D25); title-only `add` contract — shape enforced at `ready`, not capture (D26); wontfix-dep blocking in the picker (D30); `show <id> --tasks` derived view (read-through-worktree while claimed, D11); `add --done` retro capture |
| /feature-sdlc | `define` + `build` subcommands (same stop/resume machinery as `prototype` mode); Phase 1a detects an attached /ideate brief via `source:` and skips re-ideating (D28); story-split step after /spec with single-plugin validation (D17) + D24 litmus; docs-only path-scope guard on the definition merge (D20); claim-time worktree create-or-reuse + transitive dep merge (D9/D10/D19); state.yaml: epic-level state + per-story pointers |
| /plan | Emit tasks.yaml beside the plan HTML (serializes the breakdown it already produces; 4-state task enum, readiness derived — D21); runs inside the epic definition worktree (D10); story-scoped invocation citing epic-spec anchors |
| /execute | Consume tasks.yaml as the work queue; sole writer of task `status:`; wave planner input switches from prose-parse to the file (readiness computed from deps, D21); discovered-work routing — append `discovered: true` tasks for AC-required work, auto-capture beyond-AC work as draft stories (D29) |
| /verify | Story ACs join the compliance table; `done`/`blocked` write-back via the existing bridge — into the main checkout (D11) |
| /complete-dev | `--epic` release train (dependency-ordered merges, integrated deterministic gate pre-bump (D14), combined changelog, multi-item `released:` write-back); bare `--epic` with no id offers the release-ready list (D23) — today it has zero backlog integration |
| /ideate | Capture-at-close: one-keystroke, default-on, verdict-aligned (build/pursue → Recommended = capture as epic with `source:` → brief; kill/park → Recommended = don't capture) — "never silently drops" (D27; closes the 0-of-14 leak). Stays standalone (D28) |

## Migration

- Existing items: `kind: story` default; `parent:` backfilled to a per-item "orphan" epic or grouped manually (8 open items — manual is fine). `spec'd` items map to `ready`.
- Existing in-flight feature folders keep their flat layout; the `stories/` layout applies to epics created after the change. No back-migration of shipped folders (they're frozen decision records per the artifact-model review).
- Item 0003's unofficial `closed:`/`closed_reason:` fields get legalized or mapped to `wontfix` during the /backlog schema change.

## Risks & mitigations

1. **Story-split quality** (the new judgment step) — bad splits create entangled stories. Mitigation: the sizing rule is in the define flow ("one /execute run"); split is interactive with the maintainer; `dependencies:` + file-overlap awareness mirror what /execute's wave planner does at task level.
2. **Epic-spec drift mid-flight** — a story's execution invalidates spec sections siblings depend on. Mitigation: the supersession-marker mechanism from [04_sdlc-artifact-model.md](04_sdlc-artifact-model.md) (P2 item) applies; verify writes `superseded-by` anchors; blocked siblings surface at pickup because the picker re-reads deps.
3. **Merge-train conflicts** between sibling branches. Mitigation: D6/D7 (deps define merge order; branches cut from current main at claim time per D10 — much shorter divergence windows); dependent stories already contain their deps' commits via D9, so those merges dedupe cleanly; stories touching the same files should be dependency-linked at split time; conflict during the train → stop, surface, human resolves (never auto-resolve). The D14 integrated gate catches semantic (non-textual) interactions post-merge.
4. **tasks.yaml vs plan-HTML narrative drift** — same fact twice if /plan restates tasks in prose. Mitigation: contract is cite-IDs-only in the HTML (same rule as D4); skill-eval can check it.
5. **Unattended /execute quality** — Loop 2 ships code nobody watched. Mitigation: AC gate at `ready`, verify PASS gate at `done`, browser-evidence hard gate, PASS-WITH-GAPS → `blocked` → human. Releases stay human-confirmed (Loop 3).

## Implementation note

This design is **deliberately not part of the 2026-06-10 ops-observations apply wave**. It is a separate piece of work, to be routed through `/skill-sdlc --from-feedback` with this document as the seed, ideally bundled with the 2026-06-10 design review's approved backlog NL-routing item (per-skill/backlog.md, grade B-) to pay the test-update tax once.
