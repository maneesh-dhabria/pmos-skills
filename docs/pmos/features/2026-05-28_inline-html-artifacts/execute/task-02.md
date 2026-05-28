---
task_number: 2
task_name: "serve.js POST/HEAD /save + atomic write + orphan scan"
task_goal_hash: t2-serve-save-atomic
plan_path: "docs/pmos/features/2026-05-28_inline-html-artifacts/03_plan.html"
branch: "feat/inline-html-artifacts"
worktree_path: "/Users/maneeshdhabria/Desktop/Projects/agent-skills-inline-html-artifacts"
status: done
started_at: 2026-05-28T00:34:00Z
completed_at: 2026-05-28T00:42:00Z
files_touched:
  - plugins/pmos-toolkit/skills/_shared/html-authoring/assets/serve.js
  - plugins/pmos-toolkit/skills/_shared/html-authoring/tests/serve.save.test.js
---

## Summary

serve.js gained HEAD/POST `/save` handlers, a `handleSave(root, body, res)` algorithm, a `writeArtifactAtomic(path, content)` helper using `writeFileSync + renameSync` (mirrors `writePidFileAtomic` per Pattern), and a startup orphan-`*.html.tmp` scan that logs to stderr without auto-deleting. Reused `jsonInlineEscape` from T1's `render.js` via `require('../render.js')`. Existing static-file path and `safeJoin` hardening preserved unchanged.

## Verification

- `node …/tests/serve.save.test.js` → all 5 OK lines, exit 0.
- handleSave implements the 9-step algorithm: shape-validate → resolve artifact (query `?artifact=` or sole `*.html` at root) → safeJoin → read → regex-extract sentinel block → JSON.parse → version compare (409 on mismatch) → build new payload with `version+1` + fresh `generated_at` → write atomically → respond 200.
- Closed `error_enum` honored: `schema-validation-failed` (400), `version-conflict` (409), `internal` (500).

## Spec refs

FR-08, FR-09, FR-10, FR-11, FR-12, NFR-05, NFR-07, §9 (API contracts).

## Deviations from plan

- **Extra `--idle 0` flag in tests.** Tests spawn serve.js with `--idle 0` to disable the existing idle-shutdown timer; cleaner subprocess lifecycle. Pre-existing serve.js feature.
- **`405 Method Not Allowed` for non-HEAD/non-POST `/save`** (e.g., GET). Sensible REST extension not in spec; consistent with §9. Easy to relax to 404-fall-through later if a use case emerges.
- **Internal `body.__url` field.** Passes `req.url` through `handleSave` so it can parse `searchParams.get('artifact')` without re-plumbing the parsed URL. Strictly internal — not exposed in the API contract.

## Concerns

- None blocking. Orphan-scan logs to stderr only (per D14); no auto-delete preserves crash-evidence for operator inspection.
- Body cap is 5MB per Step 3 — generous for v=N+1 round-trips even with many threads. Below the NFR-03 200KB soft-warn ceiling for inline JSON.

## Next

T3 (comments.js inline read + FR-14 detection + POST submit + 409 banner) — depends on T1 + T2.
