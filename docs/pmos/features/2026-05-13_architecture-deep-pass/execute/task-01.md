---
task_number: 1
task_name: "Tracer bullet — schema_version 2 + disposition rename + triplet emission"
task_goal_hash: a22802e840fb02e79e32b9a58a6242c59e4d41abec1d55d228918ef40a0211b3
plan_path: "docs/pmos/features/2026-05-13_architecture-deep-pass/03_plan.html"
branch: "feat/architecture-deep-pass"
worktree_path: "/Users/maneeshdhabria/Desktop/agent-skills-architecture-deep-pass"
status: done
started_at: 2026-05-20T12:00:00Z
completed_at: 2026-05-20T12:45:00Z
files_touched:
  - plugins/pmos-toolkit/skills/architecture/principles.yaml
  - plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh
  - plugins/pmos-toolkit/skills/architecture/tests/run.sh
  - plugins/pmos-toolkit/skills/architecture/tests/audit-wrapper.sh
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/output-triplet/.assert
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/output-triplet/src/main.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/exemption-row/.assert
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/l1-security/.assert
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/l3-override/.assert
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/l3-override/.pmos/architecture/principles.yaml
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/py-tidy-imports/.assert
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/tool-missing/.assert
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/tracer/.assert
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/vue-mixed/.assert
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/adr-reconcile/informational/.assert
---

## Key decisions

- **Internal `severity` preserved, JSON-emit remaps to `disposition`.** Instead of renaming `severity` everywhere through the harness (~30 evaluator functions assigning string values), the loader maps incoming `disposition` → internal `severity` once at load time, and the jq emit at the end remaps `severity` → `disposition` on every finding before serializing. Keeps T1's diff surgical; the value-map is the only place where the new vocabulary lives in the harness.
- **Test-only `audit-wrapper.sh` shim.** Production stdout is empty per FR-66 / D17; existing fixtures' `.assert` scripts parse `$AUDIT | jq` from stdout. The wrapper runs run-audit.sh and cats the resulting JSON sidecar — keeps the existing fixture pattern working without rewriting 17 .assert scripts. The output-triplet fixture explicitly bypasses the wrapper and calls run-audit.sh directly to test the empty-stdout contract.
- **`{{title}}` etc. substrate placeholders rendered via Python string-replace.** No template engine; the template only has 5 placeholders.

## Deviations from plan

- Plan T1's File Map said "Update tests/fixtures/principles-16-rules/.assert to use disposition key" — that .assert never referenced severity in the first place (only `.rules_loaded.total` and `.rules_loaded.tier_1`), so no edit was needed. No-op.
- Plan said "other fixtures may fail (their .assert scripts still reference severity; T22 + T24 fix them)" — per user direction at the pre-task scoping ask ("Add migration to T1 scope"), I migrated all affected `.assert` scripts in T1 instead of deferring. 8 fixtures touched: exemption-row, l1-security, l3-override (including its `.pmos/architecture/principles.yaml` L3 yaml), py-tidy-imports, tool-missing, tracer, vue-mixed, adr-reconcile/informational. T22/T24 will not need to re-touch these.
- **Bash 3.2 quote-counting gotcha (recorded for resume sessions):** the existing run-audit.sh has a documented workaround (`\x22\x27` escapes around line 380) that requires the *literal apostrophe count* across the heredoc body to stay even. My first edit accidentally introduced an odd apostrophe via the contraction "harness's" inside a Python comment; bash 3.2 then misparsed the second heredoc and reported a syntax error at line 381. Resolved by replacing "harness's" with "harness". Any future edit to the loader heredoc must preserve even apostrophe count.

## Runtime evidence

Empty-repo smoke (the tracer's purpose):
```
$ cd /tmp/empty-trace && git init -q
$ bash $SKILL_DIR/tools/run-audit.sh audit . > /tmp/stdout 2> /tmp/stderr
$ echo "rc=$?"; wc -c < /tmp/stdout; tail -1 /tmp/stderr
rc=0
0
Wrote docs/pmos/architecture/2026-05-20_empty-trace.html: 0 Must Fix, 0 Should Fix, 0 Won't Fix in 0 files
$ ls docs/pmos/architecture/
2026-05-20_empty-trace.html  2026-05-20_empty-trace.json  2026-05-20_empty-trace.md
$ jq -e '.schema_version == 2 and (.findings | length == 0)' docs/pmos/architecture/*.json
true
```

## Verification outcome

- `bash -n run-audit.sh` — clean
- `shellcheck run-audit.sh` — clean
- `shellcheck tests/audit-wrapper.sh` — one SC2012 info (ls in pipeline), non-blocking
- `bash tests/run.sh` — **23 passed, 1 failed**; the only failure is `ts-circular` which is pre-existing (dep-cruiser not on PATH; was failing before T1 against the same baseline). All other 22 fixtures green, plus the new `output-triplet` fixture.
