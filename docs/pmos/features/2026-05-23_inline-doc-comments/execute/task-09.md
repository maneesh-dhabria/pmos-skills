---
task_number: 9
task_name: "/spec apply-edit-at-anchor entrypoint + contract test"
task_goal_hash: t9-2026-05-24-spec-apply-edit-shim
plan_path: "docs/pmos/features/2026-05-23_inline-doc-comments/03_plan.html"
branch: "feat/inline-doc-comments"
worktree_path: null
status: done
started_at: 2026-05-24T07:10:00Z
completed_at: 2026-05-24T07:20:00Z
files_touched:
  - plugins/pmos-toolkit/skills/spec/SKILL.md
  - plugins/pmos-toolkit/skills/spec/scripts/apply-edit-at-anchor.js
  - plugins/pmos-toolkit/skills/spec/tests/apply-edit-at-anchor.test.js
  - plugins/pmos-toolkit/skills/spec/tests/fixtures/02_spec_mini.html
  - plugins/pmos-toolkit/skills/spec/tests/fixtures/02_spec_mini.comments.json
  - tests/scripts/assert_apply_edit_at_anchor_spec.sh
commit: 23fb23c
---

## Decisions

- Implementer correctly preferred the T6 contract doc over the orchestrator prompt's enum list. Authoritative closed set is `{anchor_orphaned, edit_conflicted, agent_judged_infeasible, agent_errored}`; the shim raises three of those four (edit_conflicted is the resolver's wave-planner concern in T13).
- Idempotency shape: `diff_ref` substring form (`"no-op: edit already applied"`) — matches the contract doc verbatim. Documented in the new SKILL.md phase.
- diff-match-patch Bitap 32-bit cap acknowledged: probes leading window for long quotes; full alignment deferred to T12's proper anchor-resolver.

## Runtime evidence

```
$ bash tests/scripts/assert_apply_edit_at_anchor_spec.sh
PASS: /spec apply-edit-at-anchor — 5 cases
EXIT=0

$ grep -c 'Apply comment-resolver edit' plugins/pmos-toolkit/skills/spec/SKILL.md
1
```

## Reviewer notes

- Spec compliance: FR-22, FR-30, FR-60 ✓; §9.1 input/output shapes ✓; §9.3 idempotency ✓; §9.2 closed enum ✓.
- Code quality: shim ≤200 LOC, zero new deps (`node:crypto` + vendored dmp), surgical SKILL.md append, BSD-portable wrapper.
- NFR-08 honored: SKILL.md phase cites the contract doc rather than restating.

## Deviations

The orchestrator's prompt listed an incorrect enum set; implementer flagged this and followed the contract doc. Correct call — contract doc is normative.
