---
task_number: 10
task_name: "/comments resolver skeleton — --confirm-each only, single-thread happy path"
task_goal_hash: t10-2026-05-24-comments-skeleton-confirm-each
plan_path: "docs/pmos/features/2026-05-23_inline-doc-comments/03_plan.html"
branch: "feat/inline-doc-comments"
worktree_path: null
status: done
started_at: 2026-05-24T07:25:00Z
completed_at: 2026-05-24T07:35:00Z
files_touched:
  - plugins/pmos-toolkit/skills/comments/SKILL.md
  - plugins/pmos-toolkit/skills/comments/scripts/resolver.js
  - plugins/pmos-toolkit/skills/comments/scripts/cli.js
  - plugins/pmos-toolkit/skills/comments/tests/resolver-confirm-each.test.js
  - tests/scripts/assert_resolver_confirm_each.sh
commit: f7eeac3
---

## Decisions

- Resolver takes `(askUser, dispatchSubagent, runGit)` as injectable params — the test seam. CLI in T13/T14 wires the real subagent dispatch + readline askUser.
- Anchor math stays in the originating skill (per T6 contract). Resolver passes the raw `anchor` object through and consumes `applied_artifact` when the dispatched skill returns it.
- Stage-only semantics enforced by Anti-pattern + grep guard (`grep -c 'git commit' resolver.js → 0`).

## Runtime evidence

```
$ bash tests/scripts/assert_resolver_confirm_each.sh
PASS: /comments resolver confirm-each — 1-thread happy path
EXIT=0

$ ls plugins/pmos-toolkit/skills/comments/
SKILL.md  scripts  tests

$ grep -c 'git commit' plugins/pmos-toolkit/skills/comments/scripts/resolver.js
0
$ grep -c 'git add' plugins/pmos-toolkit/skills/comments/scripts/resolver.js
1
```

## Reviewer notes

- Spec compliance: FR-20, FR-22, FR-24, FR-27, FR-28, FR-31 ✓; closed `error_enum` honored; 4-option Accept/Reject/Modify/Skip documented; stage-only contract enforced.
- Code quality: SKILL.md 100 lines (well under 400 target), pointer-heavy progressive disclosure, zero new deps, BSD-portable wrapper.
- `id.test.js` listed in test dir is pre-existing from T3 — not added by T10.

## Deviations (flagged for follow-up)

1. **Meta-tag dual acceptance.** `pmos:skill` is canonical (per FR-01); T9's fixture uses legacy `pmos-originating-skill`. Resolver accepts both with canonical taking precedence. Normalize in a follow-up (one-line fixture edit).
2. **Sidecar shape divergence.** T9 fixture uses `{version, artifact, threads}`; T3 canonical is `{schema_version, lineage, threads}`. Resolver is lenient (only reads `threads[]`). Strict validation deferred.
3. **`applied_artifact` gap (BLOCKS T11 DEMO).** The T9 `/spec` shim returns `diff_ref` as a label string, not full edited HTML. The resolver consumes an optional `applied_artifact` field that T9 doesn't emit. T11's tracer demo (step 7: `git diff --cached 02_spec.html` shows the edit) requires the originating skill to actually mutate bytes. Two options: extend T9 shim to emit `applied_artifact`, or punt full mutation to T12's proper anchor-resolver. **See "Next" below.**
4. **Modify** option recorded as `operator_modify_deferred` skip — inline-edit UX lands in T13.

## Next

T11 is a **manual operator demo** requiring Chrome + FSA. Before running it, the operator must decide on Deviation #3: shim extension (small) or T12 punt (defer demo). Recommend small T9 shim extension to keep T11 honest as a tracer.
