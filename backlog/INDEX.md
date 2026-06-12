# Backlog

Last regenerated: 2026-06-12

0 open items. Capture more with `/backlog add <text>`; refine with `/backlog refine <id>`; promote with `/backlog promote <id>`.

## Epics
| id | status | route | plugin | stories (done/total) | title |
|----|--------|-------|--------|----------------------|-------|
| 0010 | released |  | pmos-toolkit | 0/0 | Deepen /artifact into a document pipeline |
| 0011 | released | skill | pmos-toolkit | 2/2 | compact-mode setting for /compact checkpoints |
| 0015 | released | skill | pmos-toolkit | 1/1 | define-mode worktree exit/cleanup at terminal docs-only merge |
| 0016 | defined | skill | pmos-learnkit | 1/1 | /frameworks browse-UI fixes — selection, default view, view icons, multi-select filters, area rename |
| 0018 | defined | skill | pmos-learnkit | 1/1 | /book-summary — verified public summaries → PM-framed themed takeaways |
| 0020 | released | skill | pmos-toolkit | 1/1 | Concurrency-safe backlog ids — date+short-rand scheme + define merge id-uniqueness gate + derived INDEX |

## should

| id | kind | type | status | parent | title | spec | plan | pr |
|---|---|---|---|---|---|---|---|---|
| 0001 | story | tech-debt | wontfix |  | /feature-sdlc fails its own skill-eval-check.sh — e-scripts-dir (script at tools/ not scripts/) + c-portable-paths (heuristic flags prose example paths) |  |  |  |
| 0004 | story | bug | wontfix |  | skill-eval-check.sh --selftest aborts before reaching selftest dispatch (arg-validation order bug) |  |  |  |
| 0009 | story | enhancement | wontfix |  | /feature-sdlc has no mid-flight base-drift check — origin can advance during a long single-session run, surfacing only at /complete-dev Phase 9 stale-bump |  |  |  |
| 0012 | story | enhancement | done | 0011 | compact-checkpoint auto-mode support |  | 03_plan.html |  |
| 0013 | story | enhancement | done | 0011 | phase-boundary-handler auto-mode support |  | 03_plan.html |  |
| 0014 | story | tech-debt | released | 0015 | /feature-sdlc define mode has no exit/cleanup step at its terminal docs-only merge — leaves the session parked in the define/<epic-id> worktree |  | 03_plan.html |  |
| 0017 | story | enhancement | done | 0016 | /frameworks browse-UI fixes — selection highlight + no auto-scroll, list-default, view icons, multi-select filters + applied bar, area rename | 02_design.html | 03_plan.html |  |
| 0019 | story | feature | done | 0018 | Build the /book-summary pmos-learnkit skill — verified multi-source curation → PM-framed themed takeaways |  | 03_plan.html |  |
| 0021 | story | tech-debt | released | 0020 | Implement concurrency-safe ids — date+short-rand scheme, define merge id-uniqueness gate, derived INDEX | 02_design.html | 03_plan.html |  |

## could

| id | kind | type | status | parent | title | spec | plan | pr |
|---|---|---|---|---|---|---|---|---|
| 0002 | story | tech-debt | wontfix |  | feature-sdlc/reference/failure-dialog.md has no leading ToC (119 lines) → fails c-reference-toc |  |  |  |
| 0005 | story | tech-debt | wontfix |  | skill-eval-check.sh HAS_SCRIPTS detection uses `find … | grep -q .` — same SIGPIPE/pipefail pattern as the body-check race |  |  |  |
| 0006 | story | feature | wontfix |  | /polish — optionally honor HTML for URL / Notion inputs (currently always normalized to markdown) |  |  |  |
| 0007 | story | feature | wontfix |  | /polish — symmetric \"expansion\" mode (grow a doc that's too thin) |  |  |  |
| 0008 | story | tech-debt | wontfix |  | skill-eval-check.sh --selftest failure surfacing — bijection break (e.g., §[A-F] vs §G) exits 1 with no stdout; stderr alone is easy to lose |  |  |  |
| 0003 | story | tech-debt | done |  | README.md still references /push for releases — CLAUDE.md says /complete-dev is canonical |  |  |  |
