# Backlog

Last regenerated: 2026-05-23

8 open items. Capture more with `/backlog add <text>`; refine with `/backlog refine <id>`; promote with `/backlog promote <id>`.

## should

| id | type | status | priority | title | spec | plan | pr |
|---|---|---|---|---|---|---|---|
| 0001 | tech-debt | inbox | should | /feature-sdlc fails its own skill-eval-check.sh — e-scripts-dir (script at tools/ not scripts/) + c-portable-paths (heuristic flags prose example paths) | — | — | — |
| 0004 | bug | inbox | should | skill-eval-check.sh --selftest aborts before reaching selftest dispatch (arg-validation order bug) | — | — | — |
| 0009 | enhancement | inbox | should | /feature-sdlc has no mid-flight base-drift check — origin can advance during a long single-session run, surfacing only at /complete-dev Phase 9 stale-bump | — | — | — |

## could

| id | type | status | priority | title | spec | plan | pr |
|---|---|---|---|---|---|---|---|
| 0002 | tech-debt | inbox | could | feature-sdlc/reference/failure-dialog.md has no leading ToC (119 lines) → fails c-reference-toc | — | — | — |
| 0005 | tech-debt | inbox | could | skill-eval-check.sh HAS_SCRIPTS detection uses `find … \| grep -q .` — same SIGPIPE/pipefail pattern as the body-check race | — | — | — |
| 0006 | feature | inbox | could | /polish — optionally honor HTML for URL / Notion inputs (currently always normalized to markdown) | — | — | — |
| 0007 | feature | inbox | could | /polish — symmetric "expansion" mode (grow a doc that's too thin) | — | — | — |
| 0008 | tech-debt | inbox | could | skill-eval-check.sh --selftest failure surfacing — bijection break (e.g., §[A-F] vs §G) exits 1 with no stdout; stderr alone is easy to lose | — | — | — |
