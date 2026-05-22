---
task_number: 2
task_name: "Substrate copy idempotence + heading-id assert + sections.json companion"
task_goal_hash: pending
plan_path: "docs/pmos/features/2026-05-13_architecture-deep-pass/03_plan.html"
branch: "feat/architecture-deep-pass"
worktree_path: "/Users/maneeshdhabria/Desktop/agent-skills-architecture-deep-pass"
status: done
started_at: 2026-05-20T13:05:00Z
completed_at: 2026-05-20T13:15:00Z
files_touched:
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/output-triplet/.assert
  - plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh
commit_sha: 624ce64
---

## Key decisions

- **T2 surfaced a latent T1 bug rather than adding new structure.** T1 already implemented the substrate-copy `cp -n` semantics, FR-60 `-2` slug collision, `build_sections_json.js` invocation, and the heading-id guard (lines 1298–1301 of run-audit.sh). But `substrate_dir` was being resolved as `skill_dir.parent.parent / "_shared" / "html-authoring"` — one level too deep — landing at a non-existent path. The Python `shutil.copy2(src, dst)` call inside a `if src.exists()` guard silently skipped on missing source, so the assets/ directory ended up empty without raising. T2's failing test was what surfaced it. Fix is one line: `.parent.parent` → `.parent`.
- **No new `kebab_id()` helper.** Every `<h2>/<h3>` emitted by `emit_triplet()` is a hardcoded kebab-case literal (`must-fix`, `should-fix`, `wont-fix`, `architecture-metrics`, `run-metadata`). T1's inline assert-heading-ids guard already enforces presence. The .assert adds a kebab-case regex check (`^[a-z0-9-]+$`) as defence-in-depth; downstream tasks that introduce dynamic headings will need the helper.
- **sections.json substrate emits an array, not a `{ids: […]}` envelope.** The plan's example `jq -e '(.ids | length) > 0'` doesn't match the canonical substrate output. The .assert handles both shapes defensively and uses `[.[] | .id]` for the inline verification. Substrate shape is authoritative — plan example was illustrative.

## Deviations from plan

- The plan's inline-verification example uses `jq -e '(.ids | length) > 0'`. The substrate emits `[{id, level, title, parent_id}, …]`, so the working query is `jq -e '([.[] | .id] | length) > 0'`. Adapted in the .assert; no code-side change needed.
- The plan's Goal sentence mentions "PD7's caveat receives an explicit Phase 4 review prompt entry" — but the Files list does NOT include `SKILL.md` and the Steps don't reference it. Treating this as out-of-scope for T2 and deferred to T23 (SKILL.md rewrite), which already owns the Phase 4.5 / Phase 4 review-prompt structure. Flagged for the spec reviewer.

## Runtime evidence

Two-run idempotence:
```
$ cd /tmp/empty-trace && git init -q
$ bash $SKILL_DIR/tools/run-audit.sh audit . 2>/dev/null
$ bash $SKILL_DIR/tools/run-audit.sh audit . 2>/dev/null
$ ls docs/pmos/architecture/*.html
2026-05-20_empty-trace.html
2026-05-20_empty-trace-2.html
$ md5 docs/pmos/architecture/assets/style.css   # stable across both runs
MD5 (…/style.css) = a8cfcd3ca86f955087dc7564a79ecfcd
```

sections.json companion:
```
$ cat docs/pmos/architecture/2026-05-20_empty-trace.sections.json \
    | jq -e '([.[] | .id] | length) > 0'
true
$ jq '[.[] | .id]' < …sections.json
["must-fix","should-fix","wont-fix","architecture-metrics","run-metadata"]
```

Fixture suite:
```
$ bash plugins/pmos-toolkit/skills/architecture/tests/run.sh
ok output-triplet
…
23 passed, 1 failed
```
(The one failure is the pre-existing `ts-circular` fixture — unrelated to T2; will be addressed by T24's bulk fixture sweep.)

## Verification outcome

T2's spec ref FR-61 (substrate + cache-bust + sections.json + kebab IDs) is satisfied. Idempotence + heading-id guard + sections.json companion all working end-to-end. PD7's review-prompt entry deferred to T23 with rationale.
