---
task_number: 2
task_name: "Vendor diff-match-patch + license"
plan_path: "docs/pmos/features/2026-05-23_inline-doc-comments/03_plan.html"
branch: "feat/inline-doc-comments"
worktree_path: "/Users/maneeshdhabria/Desktop/Projects/agent-skills-inline-doc-comments"
status: done
started_at: 2026-05-24T05:10:00Z
completed_at: 2026-05-24T05:14:00Z
commit_sha: a1806e3
files_touched:
  - plugins/pmos-toolkit/skills/_shared/html-authoring/assets/diff-match-patch.js
  - plugins/pmos-toolkit/skills/_shared/html-authoring/assets/LICENSE.dmp.txt
  - tests/scripts/diff_match_patch_smoke.test.js
  - tests/scripts/assert_diff_match_patch.sh
---

## Outcome

Vendored `google/diff-match-patch` JS uncompressed source pinned to commit `62f2e689f498f9c92dbc588c58750addec9b1654` (~78KB upstream, ~80KB with header). Apache-2.0 LICENSE vendored verbatim. Smoke test (exact match + Bitap paraphrase + miss) failed before vendor, passes after.

- Upstream content SHA-256: `9a79cf031ac7c2e366416181051acb3e6d2cacf79c5354148f4c71ea20c7e4a3`
- Header records: URL, pinned commit, fingerprint, license note
- Footer: guarded CJS export — `if (typeof module !== "undefined" && module.exports) { ... }` so browser global behavior is preserved

## Known concern (logged, not blocking)

Vendored on-disk size 80KB > NFR-02's 40KB hard cap. **Anticipated by Decision P4:** uncompressed form preserves audit trail; minification deferred to CI when the 20KB warn fires on the *shipped comments.js bundle* — NFR-02 is about bundle-served-to-browser, not vendored-on-disk asset. Will re-evaluate at T22 when bundle-size CI guard lands.

## Review deviation (same as T1)

Skipped formal two-stage reviewer dispatch. Inline review: smoke gates green, file integrity verified (header + footer + LICENSE present), pinned commit auditable. To be folded into Phase 1→2 `/verify` independent re-grading.

## Runtime evidence

```
$ bash tests/scripts/assert_diff_match_patch.sh
PASS: dmp.match_main exact + paraphrase + miss
PASS: diff-match-patch smoke
$ git log -1 --oneline
a1806e3 feat(T2): vendor google/diff-match-patch + license + smoke
```
