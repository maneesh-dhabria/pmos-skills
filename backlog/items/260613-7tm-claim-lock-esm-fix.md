---
schema_version: 1
id: 260613-7tm
kind: epic
title: claim-lock script breaks in ESM host repos ("type":"module") — rename .js → .cjs + ESM regression test
type: bug
priority: should
status: defined
route: skill
feature_folder: docs/pmos/features/2026-06-13_claim-lock-esm/
requirements_doc:
spec_doc:
design_doc: docs/pmos/features/2026-06-13_claim-lock-esm/02_design.html
labels: [pmos-toolkit, backlog, feature-sdlc, build-loop, esm, bug]
created: 2026-06-13
updated: 2026-06-13
---

## Context

The backlog story-claim lock `plugins/pmos-toolkit/skills/backlog/scripts/claim-lock.js` is authored in CommonJS (`require`, `module.exports`, `require.main === module`). The `/backlog` scaffolding ships it verbatim into a host repo's `backlog/scripts/`. In any host whose `package.json` declares `"type": "module"`, Node parses the bare `.js` as ESM and the script dies immediately:

```
ReferenceError: require is not defined in ES module scope
```

This silently disables the Loop-2 (`build`) claim/unclaim/reconcile machinery — `feature-sdlc/SKILL.md#build-mode` (D11–D13) and the epic `0612-w4e` own-holder reclaim (D3) all shell out to this script — so an unattended `/loop … build --next` tick cannot claim or release a story in an ESM host without a manual `.cjs`-copy workaround. The sibling generator `scripts/mint-id.mjs` is already `.mjs`; only `claim-lock` stayed a bare `.js`, relying on the host's `"type"` default — the exact assumption that fails.

Reported as a self-contained bug report (raw feedback) and promoted to a `route: skill` define epic. Singleton epic (D18) wrapping one fused build story (the rename is atomic and spans two skills that cannot ship independently — D2). Single plugin (pmos-toolkit) → D17 satisfied.

Design contract: `docs/pmos/features/2026-06-13_claim-lock-esm/02_design.html`.

### Maintainer decisions captured at define (2026-06-13)

- **D1 — Fix approach: `.cjs` rename** (feedback's option 1), keeping the CommonJS source byte-for-byte. A `.cjs` extension is unambiguously CommonJS under any host `package.json` `"type"` — correct in both CJS and ESM hosts, zero logic-rewrite risk. Rejected option 2 (convert to `.mjs` ESM): cosmetically consistent with `mint-id.mjs` but rewrites every module-system line of tested logic for no correctness gain. Maintainer-confirmed.
- **D2 — One fused build story.** A rename can't be half-applied; `/feature-sdlc`'s prose mention can't lag the `/backlog` rename without leaving the docs incoherent → the two skills can't be `skill-eval`'d/shipped independently → route:skill fuse rule.
- **D3 — Regression guard.** Extend `backlog/tests/claim-lock.test.sh` to run the renamed script inside a temp dir whose `package.json` has `"type":"module"` (the case that fails today), asserting `--selftest` + an acquire/release round-trip succeed.
- **D4 — Codify the invariant.** Every scaffolded backlog script carries an explicit module-system extension; no bare `.js` in `backlog/scripts/`. Enforced as a structural assertion in the test (not a separate lint), keeping the change small.

## Acceptance Criteria

- [ ] The scaffolded lock script is `plugins/pmos-toolkit/skills/backlog/scripts/claim-lock.cjs`; `claim-lock.js` no longer exists in that dir. The CommonJS source body is byte-unchanged (only the two self-referential `usage:`/`--selftest` output strings updated for accuracy).
- [ ] Every reference in the design's `#reference-surface` table points at `claim-lock.cjs`: `backlog/SKILL.md` (~8 lines), `backlog/schema.md` (L175 link), `backlog/tests/claim-lock.test.sh` (L7 `LOCK`), `backlog/tests/scenarios.md` (L115/L135 invocation prose), `feature-sdlc/SKILL.md` (L481 prose mention). `backlog/tests/id-scheme.test.sh` is explicitly NOT changed (its mentions are about `<id>.lock` files, not the script path).
- [ ] No live reference to `claim-lock.js` remains under `plugins/pmos-toolkit/skills/{backlog,feature-sdlc}/` — a repo-wide grep for `claim-lock\.js` returns only historical backlog-item prose, never an invocation or a SKILL/schema/test path.
- [ ] **Regression test (D3):** `backlog/tests/claim-lock.test.sh` gains an ESM-mode case — under a temp `package.json {"type":"module"}`, `node scripts/claim-lock.cjs --selftest` exits 0 and an acquire→release round-trip exits 0. The whole test file passes.
- [ ] **Structural guard (D4):** the test asserts `backlog/scripts/*.js` matches nothing (no bare `.js` survives).
- [ ] **Acceptance proof:** in an ESM-mode host a fresh `/feature-sdlc build --next` claims, reconciles, and releases a story via the shipped script with no manual `.cjs` copy.
- [ ] Conventions: release prerequisites (version bump / changelog / manifest sync) listed under the plan's `## Release prerequisites` only, NOT as `/execute` wave tasks; repo hygiene lints (lint-flags-vs-hints, lint-phase-refs, lint-non-interactive-inline, audit-recommended) stay green. This is a scripts+docs change to two skills' supporting files — no SKILL.md behavioral surface changes, so no new `skill-eval` floor risk beyond keeping the touched docs coherent.

## Stories

- `260613-3jc` — Rename `claim-lock.js` → `.cjs`, repoint every reference, add the ESM-mode regression + structural guard (singleton fused build story). route: skill.
