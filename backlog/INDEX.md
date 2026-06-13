# Backlog

Last regenerated: 2026-06-13 (define 260613-wqw — /poker epic + story 260613-kw5 added)

5 open items. Capture more with `/backlog add <text>`; refine with `/backlog refine <id>`; promote with `/backlog promote <id>`.

## Epics
| id | status | route | plugin | stories (done/total) | title |
|----|--------|-------|--------|----------------------|-------|
| 0010 | released |  | pmos-toolkit | 0/0 | Deepen /artifact into a document pipeline |
| 0011 | released | skill | pmos-toolkit | 2/2 | compact-mode setting for /compact checkpoints |
| 0015 | released | skill | pmos-toolkit | 1/1 | define-mode worktree exit/cleanup at terminal docs-only merge |
| 0016 | released | skill | pmos-learnkit | 1/1 | /frameworks browse-UI fixes — selection, default view, view icons, multi-select filters, area rename |
| 0018 | released | skill | pmos-learnkit | 1/1 | /book-summary — verified public summaries → PM-framed themed takeaways |
| 0020 | released | skill | pmos-toolkit | 1/1 | Concurrency-safe backlog ids — date+short-rand scheme + define merge id-uniqueness gate + derived INDEX |
| 0612-h2j | released | skill | pmos-toolkit | 1/1 | /summary-tldr — faithful, grounded TL;DR of any user-supplied content (text/PDF/image/URL/email/tweet/podcast/video) |
| 0612-w4e | released | skill | pmos-toolkit | 1/1 | Build-loop resume-first reconcile-in-flight — self-heal stories that crash mid-build under /loop |
| 0612-jjs | released | skill | pmos-toolkit | 1/1 | Year-prefixed backlog ids — extend the <MMDD>-<rand3> scheme to <YYMMDD>-<rand3> |
| 0612-gd0 | released | skill | pmos-toolkit | 1/1 | /explainer-video — turn a doc/artifact/URL into a narrated slideshow video (local, $0) |
| 0613-kr0 | released | skill | pmos-toolkit | 1/1 | /logos — propose & generate on-brand SVG logo candidates from a brief (text / URL / existing assets) |
| 0613-dnv | released | skill | pmos-toolkit | 1/1 | /ripple-effects — simulate 1st/2nd/3rd-order effects of a proposal (Futures Wheel), then grill the user to refine it |
| 0613-5pq | defined | skill | pmos-toolkit | 1/1 | /complete-dev --epic multi-select + non-interactive ship-all — release several release-ready epics one-by-one in one session |
| 260613-vba | defined | skill | pmos-toolkit | 1/2 | Build /research — PM decision-support deep-research skill |
| 260613-yyj | defined | skill | pmos-toolkit | 1/2 | Load-bearing dogfooding verification — /plan emits a mandatory utility-dogfood task (objective + subjective eval, iterate-until-satisfied) gated by /verify |
| 260613-4mw | defined | skill | pmos-gamekit | 1/1 | pmos-gamekit — new casual-games plugin + /solitaire (Klondike) first game, with a reusable game-launcher substrate |
| 260613-7tm | defined | skill | pmos-toolkit | 1/1 | claim-lock script breaks in ESM host repos ("type":"module") — rename .js → .cjs + ESM regression test |
| 260613-5av | defined | skill | pmos-toolkit | 0/3 | /mytasks web UI — Todoist-class local web interface + lightweight server, with subtasks, projects, recurrence (terminal parity retained) |
| 260613-wqw | defined | skill | pmos-gamekit | 0/1 | /poker — No-Limit Texas Hold'em, single-player vs heuristic bots (cash game), single-file HTML reusing game-launcher; deps 260613-4mw |

## should

| id | kind | type | status | parent | title | spec | plan | pr |
|---|---|---|---|---|---|---|---|---|
| 0001 | story | tech-debt | wontfix |  | /feature-sdlc fails its own skill-eval-check.sh — e-scripts-dir (script at tools/ not scripts/) + c-portable-paths (heuristic flags prose example paths) |  |  |  |
| 0004 | story | bug | wontfix |  | skill-eval-check.sh --selftest aborts before reaching selftest dispatch (arg-validation order bug) |  |  |  |
| 0009 | story | enhancement | wontfix |  | /feature-sdlc has no mid-flight base-drift check — origin can advance during a long single-session run, surfacing only at /complete-dev Phase 9 stale-bump |  |  |  |
| 0012 | story | enhancement | done | 0011 | compact-checkpoint auto-mode support |  | 03_plan.html |  |
| 0013 | story | enhancement | done | 0011 | phase-boundary-handler auto-mode support |  | 03_plan.html |  |
| 0014 | story | tech-debt | released | 0015 | /feature-sdlc define mode has no exit/cleanup step at its terminal docs-only merge — leaves the session parked in the define/<epic-id> worktree |  | 03_plan.html |  |
| 0017 | story | enhancement | released | 0016 | /frameworks browse-UI fixes — selection highlight + no auto-scroll, list-default, view icons, multi-select filters + applied bar, area rename | 02_design.html | 03_plan.html |  |
| 0019 | story | feature | released | 0018 | Build the /book-summary pmos-learnkit skill — verified multi-source curation → PM-framed themed takeaways |  | 03_plan.html |  |
| 0021 | story | tech-debt | released | 0020 | Implement concurrency-safe ids — date+short-rand scheme, define merge id-uniqueness gate, derived INDEX | 02_design.html | 03_plan.html |  |
| 0612-ejq | story | feature | released | 0612-h2j | Build the /summary-tldr pmos-toolkit skill — multi-input, grounded, compression-confirmed summaries with a first-time-reader review pass | 02_design.html | 03_plan.html |  |
| 0612-2w7 | story | feature | released | 0612-w4e | Implement build-loop reconcile-in-flight — resume-first step 0, claim-ownership, forward-progress poison guard | 02_design.html | 03_plan.html |  |
| 0612-d14 | story | enhancement | released | 0612-jjs | Extend the backlog id scheme to <YYMMDD>-<rand3> — year-prefixed mint + triple-accept validator across /backlog and /mytasks | 02_design.html | 03_plan.html |  |
| 0612-jc5 | story | feature | released | 0612-gd0 | Build the /explainer-video pmos-toolkit skill — doc/artifact/URL → narrated slideshow .mp4 ($0, local) | 02_design.html | 03_plan.html |  |
| 0613-36f | story | feature | released | 0613-kr0 | Author the /logos skill end-to-end — brief → logo-need decomposition → per-need SVG variants → eval → logos.html | 02_design.html | 03_plan.html |  |
| 0613-fzy | story | feature | released | 0613-dnv | Author the /ripple-effects skill end-to-end — proposal → Futures-Wheel effect simulation → scored consequence tree → grill loop → report | 02_design.html | 03_plan.html |  |
| 0613-rhf | story | enhancement | done | 0613-5pq | Implement /complete-dev multi-epic release + non-interactive ship-all — multi-select picker, id-list, outer sequential train loop, stop-and-report | 02_design.html | 03_plan.html |  |
| 260613-m64 | story | feature | done | 260613-vba | Author _shared/research/ substrate + the /research skill end-to-end | 02_design.html | 03_plan.html |  |
| 260613-dnp | story | feature | ready | 260613-vba | Refactor /artifact research phase to delegate to _shared/research/ substrate |  |  |  |
| 260613-3ff | story | enhancement | done | 260613-yyj | Author _shared/dogfooding.md substrate + /plan dogfood-task emission, approval gate, and review checks | 02_design.html | 03_plan.html |  |
| 260613-2m7 | story | enhancement | ready | 260613-yyj | /verify load-bearing dogfood gate (Phase-7 hard gate) + iterate-loop residual reconciliation | 02_design.html | 03_plan.html |  |
| 260613-3jc | story | bug | done | 260613-7tm | Rename claim-lock.js → .cjs, repoint every reference, add ESM-mode regression + structural guard | 02_design.html | 03_plan.html |  |
| 260613-7n1 | story | enhancement | planned | 260613-5av | Foundation — /mytasks schema extension (project/parent/order/recur) + workstream→project migration + id-scheme correctness fix | 02_design.html | 03_plan.html |  |
| 260613-044 | story | enhancement | planned | 260613-5av | Terminal parity — /mytasks CLI for projects, subtasks, recurrence, manual order + quick-add token grammar + nested rendering | 02_design.html | 03_plan.html |  |
| 260613-yfr | story | feature | planned | 260613-5av | Web server + UI — zero-dep serve.js + JSON API + single-file Todoist-class app + /mytasks web launcher | 02_design.html | 03_plan.html |  |

## could

| id | kind | type | status | parent | title | spec | plan | pr |
|---|---|---|---|---|---|---|---|---|
| 0002 | story | tech-debt | wontfix |  | feature-sdlc/reference/failure-dialog.md has no leading ToC (119 lines) → fails c-reference-toc |  |  |  |
| 0005 | story | tech-debt | wontfix |  | skill-eval-check.sh HAS_SCRIPTS detection uses `find … | grep -q .` — same SIGPIPE/pipefail pattern as the body-check race |  |  |  |
| 0006 | story | feature | wontfix |  | /polish — optionally honor HTML for URL / Notion inputs (currently always normalized to markdown) |  |  |  |
| 0007 | story | feature | wontfix |  | /polish — symmetric \"expansion\" mode (grow a doc that's too thin) |  |  |  |
| 0008 | story | tech-debt | wontfix |  | skill-eval-check.sh --selftest failure surfacing — bijection break (e.g., §[A-F] vs §G) exits 1 with no stdout; stderr alone is easy to lose |  |  |  |
| 0003 | story | tech-debt | done |  | README.md still references /push for releases — CLAUDE.md says /complete-dev is canonical |  |  |  |
| 260613-c31 | story | feature | done | 260613-4mw | Scaffold pmos-gamekit + _shared/game-launcher substrate + /solitaire (bundled Klondike + tests) | 02_design.html | 03_plan.html |  |
| 260613-kw5 | story | feature | planned | 260613-wqw | Build the /poker skill — single-file No-Limit Hold'em (6-max random bots, heuristic AI, side pots) + tests | 02_design.html | 03_plan.html |  |
