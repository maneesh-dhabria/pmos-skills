---
task_number: 7
task_name: "Replace DMP call sites in 14 apply-edit shims + anchor-resolver (exact-id + substring-contains)"
task_goal_hash: t7-replace-dmp-substring-contains
plan_path: "docs/pmos/features/2026-05-28_inline-html-artifacts/03_plan.html"
branch: "feat/inline-html-artifacts"
worktree_path: "/Users/maneeshdhabria/Desktop/Projects/agent-skills-inline-html-artifacts"
status: done
started_at: 2026-05-28T01:30:00Z
completed_at: 2026-05-28T01:50:00Z
files_touched:
  - plugins/pmos-toolkit/skills/architecture/scripts/apply-edit-at-anchor.js
  - plugins/pmos-toolkit/skills/artifact/scripts/apply-edit-at-anchor.js
  - plugins/pmos-toolkit/skills/diagram/scripts/apply-edit-at-anchor.js
  - plugins/pmos-toolkit/skills/feature-sdlc/scripts/apply-edit-at-anchor.js
  - plugins/pmos-toolkit/skills/ideate/scripts/apply-edit-at-anchor.js
  - plugins/pmos-toolkit/skills/plan/scripts/apply-edit-at-anchor.js
  - plugins/pmos-toolkit/skills/polish/scripts/apply-edit-at-anchor.js
  - plugins/pmos-toolkit/skills/prototype/scripts/apply-edit-at-anchor.js
  - plugins/pmos-toolkit/skills/readme/scripts/apply-edit-at-anchor.js
  - plugins/pmos-toolkit/skills/requirements/scripts/apply-edit-at-anchor.js
  - plugins/pmos-toolkit/skills/spec/scripts/apply-edit-at-anchor.js
  - plugins/pmos-toolkit/skills/spec/tests/apply-edit-at-anchor.test.js
  - plugins/pmos-toolkit/skills/survey-analyse/scripts/apply-edit-at-anchor.js
  - plugins/pmos-toolkit/skills/survey-design/scripts/apply-edit-at-anchor.js
  - plugins/pmos-toolkit/skills/wireframes/scripts/apply-edit-at-anchor.js
  - plugins/pmos-toolkit/skills/comments/scripts/anchor-resolver.js
  - plugins/pmos-toolkit/skills/comments/tests/anchor.test.js
---

## Outcome

Dropped diff-match-patch from all 14 apply-edit shims and `comments/anchor-resolver.js`. The shims now use exact-id + substring-contains (≥40 chars) per FR-25 / P6. Resolver keeps prefix/suffix proximity logic for short-quote disambiguation but drops the Bitap fuzzy fallback.

## Key decisions / deviations

- **Plan claim "15 apply-edit shims" → actual 14**: comments has no apply-edit-at-anchor.js (only anchor-resolver.js). Touchpoints: 14 shims + 1 resolver = 15 call sites total.
- **Spec shim TDD**: extended existing `apply-edit-at-anchor.test.js` with case (f) `substring-contains` rather than authoring a new `apply-edit-at-anchor.no-dmp.test.js` — fewer test files, same coverage. Case (b) (`anchor_orphaned` on absent quote) continues to verify the substring path miss.
- **Resolver test (g) removed**: `long-quote Bitap hit` cannot pass after Bitap removal. The orphan case (c) covers perturbed-input behavior under the new resolver. Documented in the test header.
- **Resolver `threshold`/`distance` params**: accepted for back-compat but unused (no Bitap to tune). Removed `DEFAULT_THRESHOLD` / `DEFAULT_DISTANCE` constants and the `_bitapFind` helper. `_quoteFallback` signature drops them too.
- **Mechanical refactor via Node script** (`/tmp/refactor-shims.js`, ephemeral): identical Bitap → substring-contains transform across 13 shims after spec was hand-refactored as the canonical version. Script removed after run.

## Verification

```
$ grep -rln "diff_match_patch\|diff-match-patch" plugins/pmos-toolkit/skills/ --include="*.js"
plugins/pmos-toolkit/skills/_shared/html-authoring/assets/diff-match-patch.js  # the vendored asset itself; T6 deletes

$ for f in plugins/pmos-toolkit/skills/*/tests/apply-edit-at-anchor*.test.js; do node "$f"; done
PASS × 14

$ for f in plugins/pmos-toolkit/skills/comments/tests/{anchor,scorer,reanchor.integration,schema}.test.js; do node "$f"; done
PASS × 4
```

Full sanity run (html-authoring tests + all comments tests + all shim tests): 0 failures.
