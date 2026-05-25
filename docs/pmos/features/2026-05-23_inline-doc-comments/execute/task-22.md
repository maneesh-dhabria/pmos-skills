---
task_number: 22
task_name: "Safari/Firefox download fallback + bundle-size CI guard + NFR-02 amendment + wave-4 Minor cleanups"
task_goal_hash: t22-fsa-fallback-plus-bundle-ci-plus-nfr02-amend
plan_path: docs/pmos/features/2026-05-23_inline-doc-comments/03_plan.html
branch: feat/inline-doc-comments
worktree_path: /Users/maneeshdhabria/Desktop/Projects/agent-skills-inline-doc-comments
status: done
started_at: 2026-05-25T02:55:00Z
completed_at: 2026-05-25T04:00:00Z
implementer_commits:
  - 77bb455  # feat(T22): Safari/Firefox download fallback + bundle-size CI + wave-4 cleanups
  - dec542d  # fix(T22): amend NFR-02 — split bundle thresholds (authoring vs vendor)
  - fe046a6  # fix(T22): validate LS-rehydration before seeding (Important)
files_touched:
  - plugins/pmos-toolkit/skills/_shared/html-authoring/assets/comments.js
  - plugins/pmos-toolkit/skills/_shared/html-authoring/assets/comments.css
  - tests/scripts/comments-js.test.js
  - .github/workflows/comments-bundle-size.yml
  - plugins/pmos-toolkit/skills/wireframes/scripts/apply-edit-at-anchor.js
  - plugins/pmos-toolkit/skills/survey-analyse/scripts/apply-edit-at-anchor.js
  - plugins/pmos-toolkit/skills/feature-sdlc/scripts/apply-edit-at-anchor.js
  - plugins/pmos-toolkit/skills/feature-sdlc/SKILL.md
  - docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html
  - docs/pmos/features/2026-05-23_inline-doc-comments/execute/DEVIATIONS.md
---

## What was implemented

### Part A — Safari/Firefox FSA fallback (FR-12, NFR-04)

`comments.js` (393 → 553 LOC) gains:
- `_detectFsaSupport()` — `typeof window.showDirectoryPicker === 'function'` + `showSaveFilePicker` check; sets module-scoped `_fsaFallbackMode`.
- `_lsKey(artifactPath)` — `'pmos:comments:' + String(artifactPath || '/')`.
- `_lsDraftSave/Load/Clear` — try/swallow wrap around `localStorage.{setItem,getItem,removeItem}` (handles quota / private-mode / no-`localStorage` Node case). Serializer byte-exact with resolver's `_serializeSidecar` (`JSON.stringify(obj, null, 2) + "\n"`).
- `_renderSaveSidecarButton(panel)` — idempotent; `data-pmos-save-sidecar` attr; `display:none` when FSA available; click handler wired to `triggerSidecarDownload()`.
- `triggerSidecarDownload()` — assembles in-memory sidecar → `Blob` (`application/json`) → `URL.createObjectURL` → `<a href download style.display:none>` → `body.appendChild` → `click()` → `setTimeout(100ms)` → `revokeObjectURL` + `a.remove()` → `_lsDraftClear`.
- `mount()` in FSA-fallback mode: rehydrates LS draft via `_lsDraftLoad`, **validates via `validate_sidecar` BEFORE seeding** (round-2 quality fix); on validation fail, calls `_lsDraftClear` so the bad entry doesn't keep re-firing on every reload.
- `_docRef` test-injectable document reference via mount opts — prevents async global-document race in jsdom tests.

`comments.css` (141 → 172 LOC): `[data-pmos-save-sidecar]` button styles + panel-header flex so Save aligns right via `margin-left:auto`.

### Part A — Bundle-size CI guard (NFR-02 amended)

`.github/workflows/comments-bundle-size.yml`: `pull_request` + `push: branches: [main]`; `ubuntu-latest`. TWO buckets:
- `AUTH_SIZE` = `du -b` of `comments.js + comments.css` → warn at >20480 bytes (20KB soft), fail at >40960 (40KB hard).
- `VEND_SIZE` = `du -b` of `diff-match-patch.js` → fail at >102400 (100KB ceiling), no soft warn.
- Final summary line emitted with both numbers + their limits.

Current sizes (at HEAD): authoring = 24,557 bytes (soft-warn fires; under hard); vendored = 79,574 bytes (under ceiling). CI passes.

### Part A — NFR-02 amendment (DEVIATION D22)

T22 surfaced a spec/plan misalignment: original NFR-02 (single 20KB soft / 40KB hard across the whole bundle) was wildly violated by diff-match-patch's ~80KB vendored payload. User chose to split thresholds.

`02_spec.html` NFR-02 row rewritten with split thresholds + rationale. `DEVIATIONS.md` D22 entry documents the decision + current sizes + soft-warn triage note (comments.js at 20,758 bytes is 278 bytes over soft — candidates for future tightening: extract Save button to optional asset, fold `_ls*` helpers into smaller closure).

### Part B — Wave-4 carryover Minors (5)

1. wireframes basename TODO comment at the `path.basename === 'index.html'` gate (`wireframes/scripts/apply-edit-at-anchor.js:68`).
2. survey-analyse dead `chart-config-` regex alternative removed (`survey-analyse/scripts/apply-edit-at-anchor.js:71`).
3. feature-sdlc SKILL.md cross-refs added at Phase 1 step 2 (line 484) + Phase 9 (line 757) pointing to "Apply comment-resolver edit" for the required `<meta name="pmos:skill">` bake.
4. feature-sdlc `_detectSurface` regex dropped; `startsWith` only (cleaner, no behavior change).
5. feature-sdlc `_isPipelineSchemaChange` JSDoc heuristic header comment noting body-text keyword limit.

## Tests

20 sub-cases pass in `comments-js.test.js` (was 19 pre-T22):
- T7 / T10 / T16 pre-existing sub-cases preserved (FSA-available paths).
- T22-a: FSA unavailable → LS draft written + Save button visible.
- T22-b: Click Save → `<a download="..." href="blob:...">` + Blob content matches serializer.
- T22-c: Download success → LS draft cleared.
- T22-d: workflow file present with both AUTH_SIZE/VEND_SIZE buckets + threshold constants.
- T22-e (round-2 quality fix): LS rehydration validates schema before seeding; bad draft cleared post-mount.

All apply-edit-at-anchor + resolver suites unaffected and green.

## Runtime evidence

Local bundle size measured: `du -b plugins/pmos-toolkit/skills/_shared/html-authoring/assets/{comments.js,comments.css,diff-match-patch.js}` → 20758 / 3799 / 79574. Matches workflow expectations.

## Reviewer findings

**Spec-compliance:** ✅ all FSA fallback + CI workflow + NFR-02 amendment + 5 Minor carryovers verified.

**Code-quality (round 1):** Changes required — 1 Important, 6 Minor:
1. *Important:* `comments.js` mount() rehydration seeded `state.sidecar` from LS WITHOUT calling `validate_sidecar`. **→ FIXED** in `fe046a6`: validate-first; on pass seed; on fail clear LS entry. New sub-case (T22-e) verifies the path.
2. *Minor:* `_lsKey` uses string concat (collision risk if two artifacts share trailing path at different origins). Defer.
3. *Minor:* `triggerSidecarDownload` `setTimeout(100ms)` is undocumented magic. Defer.
4. *Minor:* StubNode.click() calls listeners with `{}` only (no MouseEvent semantics). Adequate for T22; defer.
5. *Minor:* `du -b` is GNU-only; one-line portability comment recommended. Defer.
6. *Minor:* `_fsaFallbackMode` is module-scoped, not on `state`. Cosmetic. Defer.
7. *Pre-existing bug flagged:* `comments.js:427` `_attachSelectionListener` uses bare `document.addEventListener` instead of `doc.`. Not T22 scope; flagged for follow-up.

**Code-quality (round 2):** **Approved.** Validate-first guard correct; (T22-e) sub-case present with both required assertions; 20/20 tests green.

## Notes for downstream

- **T23+ owes** the 6 Minor cleanups (LS key hash, setTimeout magic-number doc, StubNode.click MouseEvent semantics, du -b portability comment, _fsaFallbackMode placement, selectionchange listener bug).
- **NFR-02 is now split** in the spec. Future bundle changes are graded against the two-bucket workflow; the soft-warn on authoring is a real signal to watch.
- **Bundle soft-warn:** comments.js at 20,758 bytes is 278 bytes over soft. Refactor candidates per D22 triage note.
- **D22 DEVIATIONS entry** is the canonical record of the NFR-02 amendment decision.
