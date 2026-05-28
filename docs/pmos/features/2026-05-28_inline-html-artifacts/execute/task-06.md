---
task_number: 6
task_name: "Delete DMP + turndown + LICENSE files"
task_goal_hash: t6-delete-dmp-turndown
plan_path: "docs/pmos/features/2026-05-28_inline-html-artifacts/03_plan.html"
branch: "feat/inline-html-artifacts"
worktree_path: "/Users/maneeshdhabria/Desktop/Projects/agent-skills-inline-html-artifacts"
status: done
started_at: 2026-05-28T01:52:00Z
completed_at: 2026-05-28T01:55:00Z
files_touched:
  - plugins/pmos-toolkit/skills/_shared/html-authoring/assets/diff-match-patch.js  # DELETED
  - plugins/pmos-toolkit/skills/_shared/html-authoring/assets/LICENSE.dmp.txt  # DELETED
  - plugins/pmos-toolkit/skills/_shared/html-authoring/assets/turndown.umd.js  # DELETED
  - plugins/pmos-toolkit/skills/_shared/html-authoring/assets/turndown-plugin-gfm.umd.js  # DELETED
  - plugins/pmos-toolkit/skills/_shared/html-authoring/assets/LICENSE.turndown.txt  # DELETED
---

## Outcome

5 vendored asset files removed from substrate. Reordered T6 after T7 per the task's own Step 1 pre-flight ("complete T7 first to keep tree consistent"). Asset count drops from 17 → 12.

## Verification

```
$ ls plugins/pmos-toolkit/skills/_shared/html-authoring/assets/ | grep -E "diff-match|turndown"
(empty — OK)

$ node plugins/pmos-toolkit/skills/_shared/html-authoring/tests/*.test.js
PASS × N

$ node plugins/pmos-toolkit/skills/*/tests/apply-edit-at-anchor*.test.js  # × 14
PASS × 14
```

Full sanity suite (html-authoring + comments + 14 shim tests): 0 failures.
