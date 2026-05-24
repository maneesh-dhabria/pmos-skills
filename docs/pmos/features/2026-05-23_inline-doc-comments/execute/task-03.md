---
task_number: 3
task_name: "comments.js + comments.css skeleton + headless unit tests"
plan_path: "docs/pmos/features/2026-05-23_inline-doc-comments/03_plan.html"
branch: "feat/inline-doc-comments"
worktree_path: "/Users/maneeshdhabria/Desktop/Projects/agent-skills-inline-doc-comments"
status: done
started_at: 2026-05-24T05:14:00Z
completed_at: 2026-05-24T05:19:00Z
commit_sha: dce1cf5
files_touched:
  - plugins/pmos-toolkit/skills/_shared/html-authoring/assets/comments.js
  - plugins/pmos-toolkit/skills/_shared/html-authoring/assets/comments.css
  - tests/scripts/comments-js.test.js
  - tests/scripts/assert_comments_js_unit.sh
  - plugins/pmos-toolkit/skills/comments/tests/id.test.js
  - tests/scripts/assert_comments_id.sh
---

## Outcome

10/10 helper tests + 1/1 nanoid uniqueness test green. comments.js: 4579 B (< 5KB target), 134 LOC.

Exports (sorted): `SCHEMA_VERSION, SidecarCorruptedError, buildThread, derive_kebab_id, load_sidecar, nanoid8, parse_sidecar, serialize_sidecar, validate_sidecar`.

- nanoid: 64-char URL-safe alphabet (`A-Za-z0-9_-`), 6 bits/char, no modulo skew. Uses `crypto.getRandomValues` (browser) / `require('crypto').randomFillSync` (Node).
- `validate_sidecar`: refuse-newer + refuse-older + v4-uuid lineage check.
- `serialize_sidecar`: byte-exact `JSON.stringify(o, null, 2) + '\n'`. Test asserts last byte `0x0a`, no CR, 2-space indent.
- Unknown top-level + thread-level keys round-trip verbatim.
- `derive_kebab_id` mirrors `_shared/html-authoring/conventions.md §3` (lowercase, non-alphanumeric runs → `-`, em-dash treated as separator, trim, optional `seen` Set for `-2`/`-3` dedupe).

comments.css is an empty-rule shell for the 10 required classes (styles land at T7).

## Review deviation (same as T1/T2)

Skipped formal reviewer subagent dispatch. Inline review: TDD discipline visible (failed before impl, passed after), all 10 assertion lines green, exports surface matches contract, byte-exact serializer test gives strong correctness signal. Phase 1→2 `/verify` will re-grade.

## Runtime evidence

```
$ bash tests/scripts/assert_comments_js_unit.sh
  ok (a)–(g) + exports SCHEMA_VERSION = 1
  10 passed, 0 failed
PASS: comments.js helpers
$ bash tests/scripts/assert_comments_id.sh
  ok 1000 unique nanoid8 ids
PASS: 1000 unique ids
```
