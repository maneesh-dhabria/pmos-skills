---
task_number: 28
task_name: "Manual smoke checklist + Chrome FSA E2E test scaffold"
task_goal_hash: t28-manual-smoke-checklist-chrome-e2e-scaffold
plan_path: docs/pmos/features/2026-05-23_inline-doc-comments/03_plan.html
branch: feat/inline-doc-comments
worktree_path: /Users/maneeshdhabria/Desktop/Projects/agent-skills-inline-doc-comments
status: done
started_at: 2026-05-25T10:00:00Z
completed_at: 2026-05-25T10:30:00Z
implementer_commits:
  - feat(T28)  # manual smoke checklist + Chrome FSA E2E scaffold
  - fix(T28)   # server-ready detection — reject on silent hang
files_touched:
  - plugins/pmos-toolkit/skills/comments/tests/MANUAL-fsa-fallback.md
  - plugins/pmos-toolkit/skills/comments/tests/fsa-write.e2e.test.js
  - tests/scripts/assert_fsa_write_e2e.sh
---

## What was implemented

T28 has TWO deliverables — a manual smoke document + an automated Chrome E2E test scaffold. The manual exec rows (terminal transcripts, screenshots) are by design deferred to the maintainer; an automated agent cannot run them.

**MANUAL-fsa-fallback.md** (126 LOC, 7 sections): per-platform/per-browser checklist with 13 `DEFERRED — maintainer attestation` rows.
- macOS launcher (3 rows: double-click happy path, Node-missing exit-127, Save-sidecar Safari fallback).
- Linux launcher (2 rows: bash invocation, Node-missing).
- Windows launcher (2 rows: .bat from File Explorer, Node-missing).
- Chrome (2 rows: FSA happy path automated by fsa-write.e2e.test.js; permission revocation simulation deferred).
- Safari (2 rows: download trigger, localStorage rehydration).
- Firefox (1 row: same as Safari).
- file:// guard edge cases (1 row: blocking modal verified by T24-f auto + manual visual deferred).

How-to-execute intro + status-key legend at the top.

**fsa-write.e2e.test.js** (325 → ~350 LOC after fix): Chrome E2E via `chrome-devtools-mcp`. Env-var contract:
- `CHROME_DEVTOOLS_MCP_AVAILABLE` unset or `"skip-this"` → exit 0 with `SKIP: chrome-devtools-mcp E2E not configured` log line (CI default).
- `"run"` → full live orchestration: free-port detection, `serve.js` spawn (T4), Chrome navigation via MCP, FSA stub injection (in-page `__pmos_fsa_written__` accumulator since FSA can't write host FS from a stub), programmatic text-range selection, comment-form submit, sidecar JSON assertion via `mcpEvaluate`.

Three-tier MCP adapter resolution: `globalThis.__mcp_*` → local `_mcp_bridge` require → descriptive throw. Maintainers attempting the live run outside a Claude Code + chrome-devtools-mcp session get a clear failure message rather than a silent hang.

**assert_fsa_write_e2e.sh**: BASH_SOURCE-fallback + walk-up sentinel per CLAUDE.md. Defaults env-var to `"skip-this"`; maintainers override:
```
CHROME_DEVTOOLS_MCP_AVAILABLE=run bash tests/scripts/assert_fsa_write_e2e.sh
```

**Pre-seal fix** (Important from quality round 1): the server-ready detection in `fsa-write.e2e.test.js` had a 2s fallback timer that always fired regardless of server state. If serve.js bound but never logged ready, the test would proceed against a dead server and fail later with a confusing nav error. **Fixed:** `serverReady` + `receivedAnyOutput` flags; fallback branches (silent → reject with hang/dead message; output-but-no-ready-line → console.warn + optimistic proceed); server 'exit' before ready → reject with code. Outer 10s hard timeout preserved.

## Tests

- Default-skip invocation: `bash tests/scripts/assert_fsa_write_e2e.sh` → `SKIP: chrome-devtools-mcp E2E not configured` + exit 0. ✓
- Live invocation (maintainer-only): `CHROME_DEVTOOLS_MCP_AVAILABLE=run bash tests/scripts/assert_fsa_write_e2e.sh` runs the full orchestration when a chrome-devtools-mcp session is active. Not exercised in this seal (no live Chrome session attached); maintainer attestation in subsequent passes.

## Runtime evidence

Default-skip CI path: PASS log line emitted at every invocation.

Manual checklist rows: by design DEFERRED for maintainer attestation. The 13 rows are pre-authored with the per-row evidence-capture instructions (terminal snippet, screenshot, 1-2 sentence outcome note) — when a maintainer runs the matrix, each row's placeholder is replaced inline.

## Reviewer findings

**Combined spec + code-quality review:** **Spec ✅ + Quality Approved with 1 Important + 2 Minor.**

- Spec: §14.3 + NFR-04 matrix covered; env-var contract documented at top of test file; MCP adapter stubs throw descriptive errors outside Claude Code; default-skip → exit 0 with documented SKIP line; BASH_SOURCE-fallback + walk-up sentinel per CLAUDE.md; no real-disk writes from the FSA stub.

- Quality round 1: 0 Critical, 1 Important, 2 Minor:
  1. *Important:* 2s fallback timer always fired alongside stdout/stderr listeners; silent-hang case would proceed against dead server. **→ FIXED** in second commit: `receivedAnyOutput` gate; silent → reject; output-but-no-ready-line → warn + proceed; server-exit-before-ready → reject with code.
  2. *Minor:* hard-coded `02_spec_mini.html` fixture path. **→ ADDRESSED:** TODO comment added at line 81-82 of the test file.
  3. *Minor:* 325 LOC for a deliberately-skipped test is proportionate (skip gate ~6 LOC; rest is real orchestration). No action.

Strengths flagged: three-tier MCP adapter resolution (graceful degradation, maintainer-friendly errors); defense-in-depth on server-ready detection (after fix); strong attestation ergonomics in the checklist (per-row PASS/FAIL/SKIP with explicit evidence-capture instructions).

## Notes for downstream

- **Live E2E execution is maintainer-only.** Document the env-var-override invocation in any onboarding/release-prep doc.
- **The 13 DEFERRED rows** in MANUAL-fsa-fallback.md are awaiting attestation per platform. Track via the document itself (replace `DEFERRED` with PASS/FAIL + evidence inline).
- **`serve.js` ready-line regex** matches `listening|started|port` (case-insensitive). If serve.js's actual ready log line differs, maintainers may need to tune the regex; the fallback-with-warn path covers the gap pragmatically.
- **T29 next:** final verification task — runs the full plan-verification checklist + closes the loop.
