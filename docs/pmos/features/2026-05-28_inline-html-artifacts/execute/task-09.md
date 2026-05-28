---
task_number: 9
task_name: "comments.js slim — delete FSA + localStorage + Save-sidecar branches"
task_goal_hash: t9-comments-js-slim
plan_path: "docs/pmos/features/2026-05-28_inline-html-artifacts/03_plan.html"
branch: "feat/inline-html-artifacts"
worktree_path: "/Users/maneeshdhabria/Desktop/Projects/agent-skills-inline-html-artifacts"
status: done
started_at: 2026-05-28T02:20:00Z
completed_at: 2026-05-28T02:45:00Z
files_touched:
  - plugins/pmos-toolkit/skills/_shared/html-authoring/assets/comments.js
  - plugins/pmos-toolkit/skills/_shared/html-authoring/assets/comments.css
  - plugins/pmos-toolkit/skills/comments/tests/MANUAL-fsa-fallback.md  # renamed → MANUAL-cross-context.md
  - plugins/pmos-toolkit/skills/comments/tests/MANUAL-cross-context.md  # new content
  - plugins/pmos-learnkit/skills/_shared/html-authoring/assets/comments.js  # manual sync
  - plugins/pmos-learnkit/skills/_shared/html-authoring/assets/comments.css  # manual sync
---

## Outcome

comments.js dropped from 989 → 689 LOC (−300). Removed: FSA detection (`_detectFsaSupport`, `_fsaFallbackMode`), localStorage helpers (`_lsKey`, `_lsDraftSave`, `_lsDraftLoad`, `_lsDraftClear`), Save-sidecar button (`_renderSaveSidecarButton`, `triggerSidecarDownload`), FSA write path (`writeSidecar`, `submitThread`), IndexedDB handle rehydrate (`_rehydrateHandle`), `state.dirHandle` + `state.writeSidecarImpl` fields, all FSA branches in `mount()`, and the `localStorage` read/write in `_initReviewMode` / keyboard toggle (D14: review-mode is in-memory only). Public API drops `submitThread`, `writeSidecar`, `_detectFsaSupport`, `_lsKey`, `_lsDraftSave`, `_lsDraftLoad`, `_lsDraftClear`, `triggerSidecarDownload`.

comments.css dropped the `[data-pmos-save-sidecar]` block (~26 LOC).

`MANUAL-fsa-fallback.md` renamed → `MANUAL-cross-context.md` and restructured for the new context matrix: macOS / Linux / Windows × { IDE preview, mail attachment, downloaded archive } × `file://` E1 expectation, plus a per-platform `http://localhost via launcher` row covering POST `/save` happy path + FR-17 409 reload-banner.

## Key decisions / deviations

- **DEVIATION (LOC):** Plan estimated final comments.js at <400 LOC (~350 expected). Actual is 689. The plan's listed deletion regions (~lines 127–145, 144–175, 178–200, 530–600, 713–732, 755-onward) sum to ~200 LOC, not the implied ~425. T3 (inline read path) + T24 (overlay UX surfaces) + helpers add up to ~580 LOC, which is the floor. The functional test gate (`comments-detect.test.js` passes) is the truth signal, not the LOC count.
- **D14 honored:** Review-mode is in-memory only — both the `_initReviewMode` localStorage read AND the keyboard-toggle localStorage write are dropped. `_reviewMode = 'on'` is the default; Ctrl/Cmd+Alt+R toggles for the session only.
- **`fsa-write.e2e.test.js` left in place.** Its surfaces are gone, but the test defaults to SKIP (`CHROME_DEVTOOLS_MCP_AVAILABLE != "run"`), so it passes vacuously. T11 (coverage script update) is the natural place to drop this test from the required-list and decide whether to delete the file. Documenting the leftover here rather than expanding T9 scope.
- **`html-to-md.js` CLI shim still leaks turndown refs** (surfaced during T8). Out of T9 scope — T13 docs cleanup will remove the README/conventions.md refs; the shim itself is dead code from T6 and should be deleted by T11 or T13.
- **Cross-plugin substrate sync was manual this time** — the auto-sync hook that mirrored T8's edits didn't fire on this set. `cp` of comments.js + comments.css from toolkit → learnkit; md5s match.

## Verification

```
$ node --check plugins/pmos-toolkit/skills/_shared/html-authoring/assets/comments.js
(exit 0)

$ wc -l plugins/pmos-toolkit/skills/_shared/html-authoring/assets/comments.js
989 → 689

$ grep -nE "FSA|_fsaFallbackMode|showSaveFilePicker|_lsKey|_lsDraft|saveSidecarBtn|triggerSidecarDownload|writeSidecar|dirHandle|_rehydrateHandle|pmos:reviewMode" \
       plugins/pmos-toolkit/skills/_shared/html-authoring/assets/comments.js
# Only matches: 2 deletion-history comment lines (T9 changelog). No code refs.

$ for f in plugins/.../tests/*.test.js; do node "$f"; done
ALL 15/15 PASS (4 html-authoring + 11 comments).

$ md5 -q plugins/pmos-{toolkit,learnkit}/skills/_shared/html-authoring/assets/comments.{js,css}
Both pairs match — substrate sync clean.
```

