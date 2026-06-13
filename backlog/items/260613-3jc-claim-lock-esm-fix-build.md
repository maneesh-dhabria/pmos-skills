---
schema_version: 1
id: 260613-3jc
kind: story
parent: 260613-7tm
title: Rename claim-lock.js → .cjs, repoint every reference, add ESM-mode regression + structural guard
type: bug
priority: should
status: planned
route: skill
dependencies: []
feature_folder: docs/pmos/features/2026-06-13_claim-lock-esm/
plan_doc: docs/pmos/features/2026-06-13_claim-lock-esm/stories/260613-3jc/03_plan.html
tasks: docs/pmos/features/2026-06-13_claim-lock-esm/stories/260613-3jc/tasks.yaml
worktree:
claimed_by:
driver_holder:
labels: [pmos-toolkit, backlog, feature-sdlc, build-loop, esm, bug]
created: 2026-06-13
updated: 2026-06-13
---

<!-- status: planned at define (Loop 1); plan_doc + tasks.yaml authored. Build via /feature-sdlc build --story 260613-3jc (or build --next). -->

## Context

The singleton fused build story for epic `260613-7tm`. Renames the scaffolded backlog story-claim lock from CommonJS-but-`.js` to an explicit `.cjs` extension (so it runs in host repos with `"type": "module"`), repoints every reference across `/backlog` and `/feature-sdlc`, and adds an ESM-mode regression test + a structural "no bare `.js`" guard. The source body of the script is kept byte-for-byte CommonJS — only the extension and references change (D1). Fused because the rename is atomic and the two skills cannot ship independently (D2). One `/execute` run = one PR.

Built against the design contract `docs/pmos/features/2026-06-13_claim-lock-esm/02_design.html` (anchors `#decisions`, `#reference-surface`, `#regression-guard`, `#invariant`) and the standing skill-authoring criteria (`reference/skill-patterns.md` + the host `CLAUDE.md`).

## Acceptance Criteria

(Drawn from epic `260613-7tm` — the change-set for this story.)

- [ ] AC1 — `git mv plugins/pmos-toolkit/skills/backlog/scripts/claim-lock.js → claim-lock.cjs`; the source body is byte-unchanged (CommonJS `require`/`module.exports`/`require.main` retained). The two self-referential output strings (the `usage:` line and the `--selftest: PASS/FAIL` line) are updated `claim-lock.js` → `claim-lock.cjs` for accuracy.
- [ ] AC2 — Every site in the design's `#reference-surface` table points at `claim-lock.cjs`: `backlog/SKILL.md` (~8 lines: L31, L39, L45, L149, L158, L166, L170, L249), `backlog/schema.md` (L175 link), `backlog/tests/claim-lock.test.sh` (L7 `LOCK`), `backlog/tests/scenarios.md` (L115 + L135), `feature-sdlc/SKILL.md` (L481). `backlog/tests/id-scheme.test.sh` is NOT touched.
- [ ] AC3 — A repo-wide `grep -rn 'claim-lock\.js' plugins/pmos-toolkit/skills/` returns no invocation, SKILL/schema/test path, or markdown link to the old name (only incidental historical prose, if any, in unrelated files).
- [ ] AC4 — **Regression (D3):** `backlog/tests/claim-lock.test.sh` gains a case that creates a temp dir with `package.json {"type":"module"}` and runs `node "$LOCK" --selftest` + an `acquire`→`release` round-trip from within it — all exit 0. (This case fails against the pre-rename bare `.js`.)
- [ ] AC5 — **Structural guard (D4):** the test asserts no bare `.js` remains in `backlog/scripts/` (e.g. `ls scripts/*.js` matches nothing). The full `bash backlog/tests/claim-lock.test.sh` prints PASS; `node scripts/claim-lock.cjs --selftest` prints PASS.
- [ ] AC6 — Conventions: no version-bump / changelog / README-row / manifest-version-sync / learnings-bootstrap tasks in any `/execute` wave (listed under the plan's `## Release prerequisites` only — `/complete-dev` is the sole writer). Repo hygiene lints (lint-flags-vs-hints, lint-phase-refs, lint-non-interactive-inline, audit-recommended) stay green — none of the touched SKILL.md edits introduce a new flag, phase ref, prompt, or non-interactive-block drift.

## Notes

Plan + `tasks.yaml` authored at define time (this loop). No dependencies — build immediately via `/feature-sdlc build --story 260613-3jc` (or `build --next`).
