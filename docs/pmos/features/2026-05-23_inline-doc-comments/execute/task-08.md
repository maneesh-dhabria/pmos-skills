---
task_number: 8
task_name: "bake comments.js+css into template + /spec emit instructions"
task_goal_hash: t8-2026-05-24-comments-substrate-bake
plan_path: "docs/pmos/features/2026-05-23_inline-doc-comments/03_plan.html"
branch: "feat/inline-doc-comments"
worktree_path: null
status: done
started_at: 2026-05-24T07:00:00Z
completed_at: 2026-05-24T07:08:00Z
files_touched:
  - plugins/pmos-toolkit/skills/_shared/html-authoring/template.html
  - plugins/pmos-toolkit/skills/spec/SKILL.md
  - tests/scripts/template_comments_bake.test.sh
  - tests/scripts/assert_template_comments_bake.sh
commit: 66a409d
---

## Decisions

- Used `{{pmos_skill}}` as a template-level placeholder for the per-skill meta tag, so every emitting skill substitutes its own name during the template-expansion pass — keeps the substrate skill-agnostic.
- Asset-copy block emitted as a fenced bash block in `spec/SKILL.md` (one line per file). The single-prose-line form satisfied substring checks but failed the plan's `grep -c` line-count assertion; the per-line form satisfies both and matches existing snippet style in Phase 5.
- Test script honors the CLAUDE.md bash-portability invariant (BASH_SOURCE[0] fallback walking up to a repo-root sentinel).

## Runtime evidence

```
$ bash tests/scripts/assert_template_comments_bake.sh; echo "EXIT=$?"
PASS: template.html bakes comments substrate and spec/SKILL.md documents launcher trio + pmos:skill meta
EXIT=0

$ grep -E 'comments\.(css|js)\?v=' plugins/pmos-toolkit/skills/_shared/html-authoring/template.html | wc -l
       2

$ /usr/bin/grep -c 'comments-open\.\(command\|sh\|bat\)' plugins/pmos-toolkit/skills/spec/SKILL.md
4
```

## Reviewer notes (controller-inline, two-stage)

- Spec compliance: FR-01 (substrate bake) ✓; FR-40 (`pmos:skill` meta routing) ✓; idempotency (`cp -n` / `install -m 0755`) documented per-file ✓.
- Code quality: BSD-sed-compatible substitutions, no scope creep, clear FAIL messages, surgical 3-line template edit, prose-section extension preserves surrounding context.

## Deviations

None.
