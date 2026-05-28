---
task_number: 4
task_name: "Re-emit preserves threads + bumps version"
task_goal_hash: t4-render-reemit-threads-version
plan_path: "docs/pmos/features/2026-05-28_inline-html-artifacts/03_plan.html"
branch: "feat/inline-html-artifacts"
worktree_path: "/Users/maneeshdhabria/Desktop/Projects/agent-skills-inline-html-artifacts"
status: done
started_at: 2026-05-28T01:00:00Z
completed_at: 2026-05-28T01:06:00Z
files_touched:
  - plugins/pmos-toolkit/skills/_shared/html-authoring/render.js
  - plugins/pmos-toolkit/skills/_shared/html-authoring/tests/render.test.js
---

## Summary

`render.js` gained `extractExistingPayload(html)` — sentinel regex with `type="application/json"` anchor → trim → un-escape `<` → `<` → `JSON.parse`; returns `null` on no-match or parse failure. `renderArtifact` now consumes `opts.existingHtml`: when an existing inline block is found, seed = `{schema:1, version: prior.version + 1, generated_at: <fresh ISO>, threads: prior.threads}` (D13: always increment, fresh `generated_at`); else fresh seed (version:0, threads:[]). E13 (missing block) covered by the fallback path.

## Verification

- `node tests/render.test.js` → `OK: freshEmit / OK: reEmit / OK: missingBlock`. Three blocks PASS.
- Regression: `serve.save.test.js` (T2) + `comments-detect.test.js` (T3) still PASS.

## Spec refs

FR-06, FR-07, E11, E13, D13.

## Deviations from plan

- **Tightened regex anchor.** Plan sketch used `<script id="pmos-comments"[^>]*>` which matches a literal `<script id="pmos-comments">` token embedded inside the inlined `comments.js` text (the JS source contains that token in a comment / string ref). Implementer tightened both the helper and the test regex to `<script id="pmos-comments" type="application\/json">` — disambiguates the JSON block from the JS-content occurrence. Functionally equivalent and strictly safer. **Surface this for T7 (DMP replacement / anchor-resolver sweep) — anywhere downstream code reaches into a re-emitted artifact for the inline JSON, it MUST use the same tightened anchor.**

## Concerns surfaced (non-blocking)

- The plan sketch's regex defect (above) is a latent bug that would have produced silent JSON.parse failures on any artifact whose inlined comments.js contained the token. Caught by the implementer at test-write time. Worth a callout in /verify Phase 4 spec-compliance review.

## Next

T5 (JSON-string escape adversarial table) — depends on T1 only. Independent of T4's file (new test only). Could parallelize with T6 (deletion sweep) if cadence shifts to wave-mode.
