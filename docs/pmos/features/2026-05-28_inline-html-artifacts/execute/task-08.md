---
task_number: 8
task_name: "Remove Copy-MD button + handler"
task_goal_hash: t8-remove-copy-md
plan_path: "docs/pmos/features/2026-05-28_inline-html-artifacts/03_plan.html"
branch: "feat/inline-html-artifacts"
worktree_path: "/Users/maneeshdhabria/Desktop/Projects/agent-skills-inline-html-artifacts"
status: done
started_at: 2026-05-28T02:05:00Z
completed_at: 2026-05-28T02:15:00Z
files_touched:
  - plugins/pmos-toolkit/skills/_shared/html-authoring/template.html
  - plugins/pmos-toolkit/skills/_shared/html-authoring/assets/viewer.js
  - plugins/pmos-learnkit/skills/_shared/html-authoring/template.html  # auto-synced
  - plugins/pmos-learnkit/skills/_shared/html-authoring/assets/viewer.js  # auto-synced
---

## Outcome

Copy-MD toolbar button removed from `template.html`. From `viewer.js`: `getTurndown()` deleted, `setupCopyMarkdown()` slimmed to just the `copy-link` URL handler, section-anchor `¶` feature removed (it depended on turndown). Quickstart banner text updated ("Copy Markdown for export" → "Copy section link to share a section"). Net: viewer.js shrinks by 45 LOC; template.html by 1 line.

## Key decisions / deviations

- **Section-anchor `¶` removed wholesale**, not just the turndown branch. The feature's sole purpose was turndown-based section-MD copy; without turndown there's no useful behavior left, and the inline verification `! grep -n "turndown" viewer.js` is strict.
- **Banner copy updated.** The Quickstart banner referenced "Copy Markdown" — leaving it would mislead users post-T8.
- **Out-of-scope leftover surfaced (not addressed here):** `assets/html-to-md.js` is a CLI turndown shim broken since T6 deleted `turndown.umd.js`; `README.md` + `conventions.md` still reference turndown. These belong to T9 (FR-deletions clean-up) / T13 (docs) per scope; T8 verification command is viewer.js-only.

## Verification

```
$ grep -n "turndown\|copy-md\|Copy Markdown" plugins/.../assets/viewer.js plugins/.../template.html
(no matches — OK)

$ node --check plugins/.../assets/viewer.js
(exit 0)

$ node -e "renderArtifact(...)" → actions = [copy-link, copy-link, copy-link]   # 3× because viewer chrome + toolbar + sidebar btn

$ node plugins/pmos-toolkit/skills/_shared/html-authoring/tests/*.test.js
ALL PASS (5 test files: 409-banner, json-escape, freshEmit/reEmit/missingBlock, orphan scan)
```

