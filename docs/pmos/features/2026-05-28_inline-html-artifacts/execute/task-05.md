---
task_number: 5
task_name: "JSON-string escape adversarial table"
task_goal_hash: t5-json-escape-adversarial
plan_path: "docs/pmos/features/2026-05-28_inline-html-artifacts/03_plan.html"
branch: "feat/inline-html-artifacts"
worktree_path: "/Users/maneeshdhabria/Desktop/Projects/agent-skills-inline-html-artifacts"
status: done
started_at: 2026-05-28T01:10:00Z
completed_at: 2026-05-28T01:12:00Z
files_touched:
  - plugins/pmos-toolkit/skills/_shared/html-authoring/tests/json-escape.test.js
---

## Summary

Adversarial table-driven test for `jsonInlineEscape` covering 5 inputs that could otherwise break embedded-JSON safety: `</script>`, `<!--`, `]]>`, surrogate-pair emoji, and a mixed sequence. For each, asserts (a) no raw `</script>` substring in the escaped output and (b) the escaped JSON round-trips through `JSON.parse` (after un-escaping `<` → `<`) preserving the original quote text byte-for-byte. T1's implementation (`/</g, '\\u003c'`) passes all 5 first-try — no production change needed.

## Verification

- `node tests/json-escape.test.js` → `OK: json-escape`, exit 0.
- All prior tests still green (`render.test.js`, `serve.save.test.js`, `comments-detect.test.js`).

## Spec refs

FR-04, FR-17, E8.

## Deviations from plan

- **Executed inline (no implementer subagent dispatch).** T5 is a single 40-LOC test file with a verbatim sketch in the plan — subagent dispatch overhead isn't justified at this scale. Cadence deviation acknowledged; for T6 onward (deletion sweep + DMP replacement, ≥16 files modified) the subagent-driven dispatch resumes.

## Concerns surfaced (non-blocking)

- None. Existing escape covers all 5 adversarial inputs because `</script>` requires a literal `<` and surrogate pairs are preserved by `JSON.stringify` automatically.

## Next

T6 (delete DMP + turndown + LICENSE files) — but per the plan's Step 1 pre-flight ("confirm T7 is complete or in progress"), T7 (DMP replacement in 16 sites) must land first or concurrently. Recommend sequencing T7 → T6.
