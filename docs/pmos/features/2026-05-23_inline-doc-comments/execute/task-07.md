---
task_number: 7
task_name: "comments.js — text-selection capture + side panel + thread persist (Chrome FSA path)"
task_goal_hash: t7-2026-05-24-fsa-side-panel
plan_path: "docs/pmos/features/2026-05-23_inline-doc-comments/03_plan.html"
branch: "feat/inline-doc-comments"
worktree_path: null
status: done
started_at: 2026-05-24T05:50:00Z
completed_at: 2026-05-24T06:10:00Z
files_touched:
  - plugins/pmos-toolkit/skills/_shared/html-authoring/assets/comments.js
  - plugins/pmos-toolkit/skills/_shared/html-authoring/assets/comments.css
  - tests/scripts/comments-js.test.js
execution_mode: subagent-driven
reviews:
  spec_compliance: pass
  code_quality: approved-with-followups
---

## T7 outcome

Extended T3 substrate skeleton with the browser-side UI + FSA write path:

- **`captureSelection({start, end, text, prefix, suffix})`** — returns `{ quote_hash: fnv1a64Hex(text).slice(0,16), context_before: prefix.slice(-30), context_after: suffix.slice(0,30) }`. Sync hash via inline FNV-1a 64-bit (no async crypto, no extra deps).
- **`selectionchange` listener** — module attaches lazily on first `mount()` call; guarded behind `typeof document !== 'undefined'` so Node `require()` doesn't break. Computes prefix/suffix (30 chars each) from `getSelection().anchorNode.textContent`, spawns `.pmos-floating-btn` at `rect.bottom + 8 / rect.right + 8`.
- **`onFloatingButtonClick(anchor)`** — opens `.pmos-side-panel.open`, mounts compose form.
- **`submitThread({anchor, body, author})`** — delegates to existing `buildThread()`, appends to `state.sidecar.threads`, calls `writeSidecar`.
- **`writeSidecar(sidecar, handle)`** — implements FSA-per-save-re-request (FR-13/S16). Exact order: `requestPermission` → `getFileHandle('<artifact>.comments.json', {create:true})` → `createWritable({keepExistingData:false})` → `write(serialize_sidecar(sidecar))` → `close()`. On denied permission, mounts `.pmos-banner` toast with text `"Click to grant write access"` and returns `false` before any write — prior sidecar on disk untouched.
- **`mountBanner(msg)`** — idempotent (single banner element at most).
- **`_rehydrateHandle()` (S17)** — `indexedDB.open('pmos-comments', 1)`, object store `handles`, key = `location.pathname`. Rehydrates handle reference but does NOT auto-open the file until first interaction. Guarded behind `typeof indexedDB !== 'undefined'`.

Public surface extended: `captureSelection`, `onFloatingButtonClick`, `submitThread`, `writeSidecar`, `mountBanner`, `mount`. Existing T3 exports intact. IIFE / dual-export pattern preserved.

CSS filled in for `.pmos-floating-btn`, `.pmos-side-panel` (+ `.open`), `.pmos-panel-header`, `.pmos-thread-list`, `.pmos-thread-card` (+ `.collapsed` / `.expanded`), `.pmos-thread-messages`, `.pmos-message`, `.pmos-thread-compose`, `.pmos-banner`, `.pmos-diagram-marker`. Neutral zinc/gray palette + single warm-red for banner. Matches wireframes IA + states.

## Verification

```
$ bash tests/scripts/assert_comments_js_unit.sh
  15 passed, 0 failed
PASS: comments.js helpers
```

5 new T7 cases green: (a) captureSelection populates quote_hash + context_before/after; (b) onFloatingButtonClick opens .pmos-side-panel; (c) submitThread appends thread + invokes writeSidecar; (d) writeSidecar invokes requestPermission → getFileHandle → createWritable → write → close in order (call-order assertion against mock); (e) revoked permission surfaces banner + does NOT write.

Module size: **14787 bytes** (under 15000-byte internal cap; 213-byte headroom).

Diff: comments.js +261 lines, comments.css +150, comments-js.test.js +225 (+619 insertions / -16 deletions; 0 deletions to existing exports).

## Reviews

- **Spec-compliance subagent:** ✅ all 11 graded requirements pass (FR-02, FR-03, FR-04, FR-11, FR-13, FR-14, S16, S17, §11 5-case test surface, write-order in writeSidecar, permission-denied path). Node-safe (`require()` succeeds; 15/15 tests pass under pure Node, no JSDOM).
- **Code-quality subagent:** ✅ APPROVED FOR COMMIT. No Critical findings. Three **Important** findings tracked as follow-ups (not blockers — none affect correctness on the T7 test surface or the happy path):
  1. **`writeSidecar` blanket-catches all errors after `requestPermission`.** `getFileHandle`/`write`/`close` failures all surface as the "Click to grant write access" banner, which is misleading and hides bugs. Follow-up: differentiate post-grant errors with a distinct banner (`"Save failed — see console"`) and log to console. **Carried to T8 or a hardening pass.**
  2. **`_attachSelectionListener` uses `document.addEventListener` instead of `doc.addEventListener`.** Works because the test stub assigns `global.document`, but inconsistent with the `_doc()` guard. Follow-up: 1-line fix. **Carried to T8.**
  3. **`submitThread` ambiguous return.** Callers can't distinguish "banner shown, must re-grant" from "wrote successfully but returned false." Follow-up: return distinct sentinel values (`'ok'` / `'denied'` / `'no-handle'`) or throw. **Carried to T11 (when real-browser callers wire up).**

## Deviations from plan

- **`du -b` in plan verification recipe is GNU-only.** macOS BSD `du` fails with a usage error. Used `wc -c` to confirm 14787 bytes < 15000 cap. Future task verification recipes should standardize on `wc -c` (portable) — captured here so /verify or a later hardening task can sweep.
- **Test runner harness extended** to await Promises returned from `test()` callbacks — async tests were previously at risk of silent false-pass. Sync tests unaffected. Documenting because the async-aware harness is a substrate-level change other future test files in `tests/scripts/` should be aware of.
- **Reviewer-subagent dispatch used `general-purpose` agent type** rather than a dedicated reviewer template (no such type exists in this harness). The implementer subagent → spec-reviewer → quality-reviewer separation was preserved; the prompts followed `subagent-driven.md` templates.

## Notes for T8

T8 ("bake comments.js + comments.css references into template.html + /spec emit instructions") will need to:
- Inject `<link rel="stylesheet" href="{{asset_prefix}}comments.css?v={{plugin_version}}">` in `<head>` of `template.html`.
- Inject `<script defer src="{{asset_prefix}}comments.js?v={{plugin_version}}"></script>` before `</body>`.
- Add the `<meta name="pmos:skill" content="spec">` tag to `/spec`'s HTML body wrapper guidance (per FR-40 originating-skill routing).
- Extend `/spec`'s asset-substrate copy list with: `comments.js`, `comments.css`, `diff-match-patch.js`, `comments-open.command`, `comments-open.sh`, `comments-open.bat`, `LICENSE.dmp.txt`. `install -m 0755` for the `.command`/`.sh` launchers; `cp -n` for the rest.

Optionally fold in Important finding #2 (1-line doc reference fix) as part of T8.
