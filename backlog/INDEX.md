# Backlog

Last regenerated: 2026-06-12

12 open items. Capture more with `/backlog add <text>`; refine with `/backlog refine <id>`; promote with `/backlog promote <id>`.

## Epics
| id | status | route | plugin | stories (done/total) | title |
|----|--------|-------|--------|----------------------|-------|
| 0010 | released | | pmos-toolkit | 0/0 | Deepen /artifact into a document pipeline (pmos-toolkit/v2.65.0) |
| 0011 | defined | skill | pmos-toolkit | 0/2 | compact-mode setting for /compact checkpoints |

## should

| id | kind | type | status | parent | title | spec | plan | pr |
|---|---|---|---|---|---|---|---|---|
| 0001 | story | tech-debt | inbox | | /feature-sdlc fails its own skill-eval-check.sh — e-scripts-dir (script at tools/ not scripts/) + c-portable-paths (heuristic flags prose example paths) | | | |
| 0004 | story | bug | inbox | | skill-eval-check.sh --selftest aborts before reaching selftest dispatch (arg-validation order bug) | | | |
| 0009 | story | enhancement | inbox | | /feature-sdlc has no mid-flight base-drift check — origin can advance during a long single-session run, surfacing only at /complete-dev Phase 9 stale-bump | | | |
| 0012 | story | enhancement | done | 0011 | compact-checkpoint auto-mode support | docs/pmos/features/2026-06-12_compact-mode-setting/02_design.html | docs/pmos/features/2026-06-12_compact-mode-setting/stories/0012-compact-checkpoint-auto-mode/03_plan.html | |
| 0013 | story | enhancement | planned | 0011 | phase-boundary-handler auto-mode support | docs/pmos/features/2026-06-12_compact-mode-setting/02_design.html | docs/pmos/features/2026-06-12_compact-mode-setting/stories/0013-phase-boundary-handler-auto-mode/03_plan.html | |

## could

| id | kind | type | status | parent | title | spec | plan | pr |
|---|---|---|---|---|---|---|---|---|
| 0002 | story | tech-debt | inbox | | feature-sdlc/reference/failure-dialog.md has no leading ToC (119 lines) → fails c-reference-toc | | | |
| 0005 | story | tech-debt | inbox | | skill-eval-check.sh HAS_SCRIPTS detection uses `find … \| grep -q .` — same SIGPIPE/pipefail pattern as the body-check race | | | |
| 0006 | story | feature | inbox | | /polish — optionally honor HTML for URL / Notion inputs (currently always normalized to markdown) | | | |
| 0007 | story | feature | inbox | | /polish — symmetric "expansion" mode (grow a doc that's too thin) | | | |
| 0008 | story | tech-debt | inbox | | skill-eval-check.sh --selftest failure surfacing — bijection break (e.g., §[A-F] vs §G) exits 1 with no stdout; stderr alone is easy to lose | | | |
