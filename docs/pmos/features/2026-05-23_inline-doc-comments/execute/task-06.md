---
task_number: 6
task_name: "Contract doc — _shared/apply-edit-at-anchor.md"
plan_path: "docs/pmos/features/2026-05-23_inline-doc-comments/03_plan.html"
branch: "feat/inline-doc-comments"
worktree_path: "/Users/maneeshdhabria/Desktop/Projects/agent-skills-inline-doc-comments"
status: done
started_at: 2026-05-24T05:30:00Z
completed_at: 2026-05-24T05:34:00Z
files_touched:
  - plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md
---

## Outcome

169 lines (in [80,300]), 8 H2 sections, all 4 error enum values present, 7/7 cross-refs resolve.

Sections: Purpose / Input schema / Output schema / Error enum / Idempotency contract / Subagent invocation convention / Per-skill implementation expectations / Tests-are-illustrative footer.

## Runtime evidence

```
$ wc -l plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md
169
$ grep -c '^## ' .../apply-edit-at-anchor.md
8
$ grep -cE 'anchor_orphaned|edit_conflicted|agent_judged_infeasible|agent_errored' ...
6 (≥4)
```
