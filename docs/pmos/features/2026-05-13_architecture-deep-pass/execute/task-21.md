---
task_number: 21
task_name: "ADR machinery deletion (code, fixtures, --no-adr, adr-template.md)"
plan_path: "docs/pmos/features/2026-05-13_architecture-deep-pass/03_plan.html"
branch: "feat/architecture-deep-pass"
worktree_path: "/Users/maneeshdhabria/Desktop/agent-skills-architecture-deep-pass"
status: done
started_at: 2026-05-22T12:30:00Z
completed_at: 2026-05-22T12:55:00Z
commit_sha: b01ccd5
files_touched:
  - plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh
  - plugins/pmos-toolkit/skills/architecture/reference/adr-template.md
  - plugins/pmos-toolkit/skills/architecture/tools/check-determinism.sh
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/adr-cap/
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/adr-reconcile/
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/adr-write/
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/citations-missing/
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/l3-malformed/
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/determinism/
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/schema-valid/.assert
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/selector-required/.assert
---

## Key decisions

- **ADR-write block actual location: lines 2114-2246** (not the
  plan's "~973-1080" estimate). 133 source lines removed in two
  contiguous sections: the ADR-write block proper
  (`# ── ADR write (T13, FR-60/61/62)` header through the closing
  `fi` of the per-finding template-stamp loop) plus the immediately
  following `# ── Frontend declarative coverage (T12, FR-50/51/52)`
  block (also gone per spec §10.2 — `frontend_declarative_coverage`
  is no longer a v2 schema field). Net file delta: 2757 → 2608
  lines (-149 across all edits).

- **JSON sidecar fields removed:** `adrs_written`, `adrs_truncated`,
  `frontend_declarative_coverage`. Both the `--argjson` declarations
  in the `jq -n` invocation (lines ~2476-2478 pre-edit) and the
  three field lines in the report object body (lines 2509-2511) are
  excised. Schema v2 stays clean per spec §10.2 (no ADR fields, no
  FDE field — the spec snippet shows exactly the keys retained).

- **`--no-adr` rejection clause replaces the silent flag.** Per
  FR-67, the parser now matches `--no-adr` and emits
  `ERROR: unknown flag --no-adr (ADR promotion removed in schema v2; see CHANGELOG)`
  to stderr, exit 64. This is intentionally a tombstone rather than
  a generic "unknown flag" — operators upgrading from v1 audits get
  a single-glance pointer to the schema bump.

- **Reconcile block retained.** The plan only mentions deleting the
  ADR-*write* block; the reconcile block (lines 1923-2104, header
  `# ── Exemption reconciliation`) reads ADRs from disk for
  exemption matching and still has work to do for any pre-existing
  ADR files in user repos. Variables `ADR_PATH_REL_FOR_RECONCILE`,
  `RECONCILE_ADR_DIR`, `adr_records` survive — they're read-only
  consumers, not writers.

- **Fan-out propagation cleaned.** `NO_ADR_ENV` env var (used to
  forward `--no-adr` into child stack audits during monorepo
  fan-out) and its `parent_no_adr` Python read + `argv.append("--no-adr")`
  branch all removed. The `NONINTERACTIVE_ENV` propagation stays
  intact (FR-04 forward-compat).

- **Usage strings stripped.** Three identical
  `usage: /architecture audit [path] [--no-adr] ...` lines (in
  unknown-flag branch + missing-selector branch + too-many-positionals
  branch) had `[--no-adr]` removed. Used Edit replace_all for a
  single mechanical change.

- **Two `.assert` files patched** that broke as direct consequences
  of T21 deletions (not severity→disposition renames, which are
  T24's scope):
  - `schema-valid/.assert` — removed `adrs_written`,
    `adrs_truncated` from the top-level key existence loop and
    dropped the `.adrs_written | type == "array"` assertion.
  - `selector-required/.assert` — removed `--no-adr` from the
    "audit . works" smoke case + added a new Case 6 that
    *positively* asserts the rejection: `--no-adr` exits 64 with
    the documented "removed in schema v2" stderr.
  Leaving these to T24 would have left the post-T21 commit with 3
  failing fixtures — the task brief explicitly required "previously
  passing test count minus the 6 deleted fixture suites, same 1
  pre-existing ts-circular failure". Patching them inline keeps T21
  the clean breaking-change checkpoint.

- **Untracked test pollution beyond `adr-reconcile/`.** The brief
  flagged `adr-reconcile/{expired,informational}/docs/adr/` as
  needing extra `rm -rf` after `git rm -r`. In practice, four more
  deleted fixture dirs (`adr-cap/`, `adr-write/`, `citations-missing/`,
  `l3-malformed/`, `determinism/`) all had untracked `docs/`
  subdirectories from prior fixture-suite runs. Used a single
  `rm -rf` over all six fixture parent dirs to clear the pollution
  in one pass.

## Deviations

- **Two extra `.assert` patches** beyond the plan's literal T21
  step list (which only mentions code-side deletions). Justification
  above under "Two `.assert` files patched". These are not severity
  renames (T24's scope) — they're stale references to T21-deleted
  schema fields and flag.

## Verification

- `bash -n plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh`
  → exit 0.
- `bash plugins/pmos-toolkit/skills/architecture/tests/run.sh` →
  **45 passed, 1 failed** (pre-existing `ts-circular` baseline).
  Delta vs T20: 54→45 passed (-9), reflecting the 6 deleted fixture
  suites (`adr-cap`, `adr-reconcile`, `adr-write`,
  `citations-missing`, `l3-malformed`, `determinism`) — plus 3 net
  passes recovered from prior parse failures now that the schema is
  consistent. The single ts-circular failure is the same one
  carried since T1.
- Inline plan checks (all pass):
  - `grep -F -- '--no-adr' run-audit.sh` matches only the new
    rejection clause line (no other usage in the file).
  - `test ! -e tools/check-determinism.sh` → exit 0.
  - `test ! -e reference/adr-template.md` → exit 0.
  - `test ! -d tests/fixtures/determinism` → exit 0.
  - `grep -nE 'adrs_written|adrs_truncated|frontend_declarative_coverage' run-audit.sh`
    → no matches.
- Smoke audit on `tracer/` fixture: `bash run-audit.sh audit .`
  exits 0, emits triplet under `docs/pmos/architecture/`, "0 Must
  Fix, 1 Should Fix, 0 Won't Fix in 1 files" (jsdom-missing MD
  fallback warning is pre-existing across the suite, not a T21
  regression).

## Review log

- **Spec compliance reviewer:** `✅ Spec compliant`. All 6 fixture
  dirs deleted; `adr-template.md` + `check-determinism.sh` absent;
  exactly one `--no-adr` match in run-audit.sh (the FR-67 rejection
  clause, verbatim wording); JSON v2 schema clean of `adrs_written`/
  `adrs_truncated`/`frontend_declarative_coverage`. Reconcile read
  block retention is plan-consistent (plan only scopes the
  ADR-*write* block); reviewer notes that under v2 the read block
  is technically dead (v1 configs parse-error at Phase 1 before
  reaching reconcile) — flagged as a follow-up cleanup task, not a
  T21 must-fix. `.assert` patches are T21-scope (consequences of
  deletions, not T24 severity-rename territory). Test math
  54-9=45 checks out.
- **Code-quality reviewer:** `🛠 Changes required` — 3 Minor + 1 Nit:
  - **Minor #1** dangling `# Runs BEFORE ADR write ...` comment at
    line 1935 — applied (deleted; ordering claim now false).
  - **Minor #2** stale stderr `Re-affirm via ADR or remove the row.`
    at line 2110 — applied (changed to "Re-affirm in
    principles.yaml or remove the row." — ADR re-affirmation is
    dead under schema v2).
  - **Minor #3** reconcile header comment block (lines 1920-1934)
    still leans on ADR-write framing — deferred (judgment-call
    narrative scope; the framing is accurate post-T21, just
    over-narrated; flagged as future cleanup).
  - **Nit #4** FR-67 "(see CHANGELOG)" pointer assumes CHANGELOG
    documents schema v2 — deferred to /verify per reviewer
    suggestion (release-prereq territory, /complete-dev owns the
    CHANGELOG).
  - Accepted as-is: no decorator banners; NO_ADR var fully removed;
    parent_no_adr branch excised cleanly; .assert patches scoped
    and minimal (no reflexive defensive padding); no orphan
    `--argjson` declarations; deletion is contiguous (no abandoned
    `# === ADR Write ===` divider).

## Open carry to later tasks

- **T22:** the reconcile block's `RECONCILE_ADR_DIR` variable
  references `.config.adr_path`. Once T22's vocab + rationales land,
  audit whether `adr_path` should stay in the v2 config schema or
  be retired (currently still loaded from principles.yaml; spec
  §10.2 doesn't mention it but doesn't forbid it either).
- **T24:** all other `.assert` files with `severity:` references
  still need renaming to `disposition:`; the two patched here only
  fixed T21-direct breakages.

## Commits

- `83b6d82` — `refactor(T21): remove ADR machinery + determinism check + --no-adr flag (schema v2)`
- `b01ccd5` — `fix(T21): drop dangling ADR-write references in reconcile comments per Q-review`
