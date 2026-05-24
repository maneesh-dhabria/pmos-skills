---
task_number: 5
task_name: "Launcher trio (.command/.sh/.bat)"
plan_path: "docs/pmos/features/2026-05-23_inline-doc-comments/03_plan.html"
branch: "feat/inline-doc-comments"
worktree_path: "/Users/maneeshdhabria/Desktop/Projects/agent-skills-inline-doc-comments"
status: done
started_at: 2026-05-24T05:24:00Z
completed_at: 2026-05-24T05:30:00Z
files_touched:
  - plugins/pmos-toolkit/skills/_shared/html-authoring/assets/comments-open.command
  - plugins/pmos-toolkit/skills/_shared/html-authoring/assets/comments-open.sh
  - plugins/pmos-toolkit/skills/_shared/html-authoring/assets/comments-open.bat
  - tests/scripts/launcher.test.sh
  - tests/scripts/assert_launcher.sh
---

## Outcome

4/4 launcher cases green on macOS host. Line counts: .command 33, .sh 35, .bat 35 — all under 40-LOC cap. Executable bits set on .command + .sh.

## Concerns logged (not blocking)

- Windows .bat is implemented but only statically smoke-checked (no MINGW/CYGWIN host locally). Runtime TODO logged. Should exercise on Windows CI runner when one exists.
- Launcher logs are stderr-tagged (reuse line + browser-stub line). Downstream consumers that wanted stdout would need re-routing.

## Runtime evidence

```
$ bash tests/scripts/assert_launcher.sh
--- case (a) node-missing — PASS exit 127
--- case (b) cold start    — PASS pid=47931
--- case (c) reuse         — PASS same pid
--- case (d) stale cleanup — PASS new pid=48024
ALL PASS
```
