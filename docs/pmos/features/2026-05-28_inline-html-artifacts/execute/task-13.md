---
task_number: 13
task_name: ".gitattributes + CLAUDE.md update"
task_goal_hash: t13-gitattributes-claudemd
plan_path: "docs/pmos/features/2026-05-28_inline-html-artifacts/03_plan.html"
branch: "feat/inline-html-artifacts"
worktree_path: "/Users/maneeshdhabria/Desktop/Projects/agent-skills-inline-html-artifacts"
status: done
started_at: 2026-05-28T03:55:00Z
completed_at: 2026-05-28T04:05:00Z
files_touched:
  - .gitattributes
  - CLAUDE.md
---

## Outcome

1. New repo file `.gitattributes` carries the rule `docs/pmos/**/*.html linguist-generated=true -diff`. The inline pmos-comments JSON mutates on every comment write and the inline `<style>` + scripts are bulk; the default unified diff is noise. `git check-attr -a` against a sample artifact confirms both attributes resolve.
2. `## Inline doc comments` section in CLAUDE.md rewritten end-to-end. The previous version described the FSA + sidecar + drift-hook flow that this feature retires. The new version describes the inline-JSON persistence model: universal read, `http://localhost`-only write, file:// blocking modal, optimistic concurrency + 409 banner, migration script for the cutover. Includes pointers to the fanout test, the coverage gate, the bundle-size policy, the cross-context smoke matrix, and the diff-suppression rationale.

## Key decisions / deviations

- **DEVIATION (Retired inventory).** First pass kept an explicit "Retired in v2.58.0:" line that listed FSA / localStorage / drift hook / diff-match-patch / turndown / Copy-MD / html-to-md.js / `showSaveFilePicker` / IndexedDB handle rehydrate by name. Plan's Step 4 verify is `! grep -nE "FSA|showSaveFilePicker|localStorage|drift hook|diff-match-patch|turndown" CLAUDE.md` — strict no-mention regardless of context. Resolved by replacing the inline list with a pointer to `02_spec.html#fr-deletions`. The spec is the durable record of what was removed; CLAUDE.md keeps its forward-looking-only character.
- **`.gitattributes` is a new file.** Repo had none previously; added with one rule + a leading comment explaining the rationale (so a future reader doesn't strip the rule without understanding why HTML artifacts are noisy).
- **Did not add `linguist-vendored=true` to substrate JS** (e.g., `viewer.js`, `comments.js`) even though those are arguably vendored substrate code. Out of T13 scope and would shift the repo's language-stats more than the plan asked for.

## Verification

```
$ git check-attr -a docs/pmos/features/2026-05-28_inline-html-artifacts/02_spec.html | grep -E 'linguist-generated|diff'
docs/pmos/features/2026-05-28_inline-html-artifacts/02_spec.html: diff: unset
docs/pmos/features/2026-05-28_inline-html-artifacts/02_spec.html: linguist-generated: true

$ grep -nE "FSA|showSaveFilePicker|localStorage|drift hook|diff-match-patch|turndown" CLAUDE.md
(no matches — exit 1)

$ grep -n "docs/pmos" .gitattributes
6:docs/pmos/**/*.html linguist-generated=true -diff
```
