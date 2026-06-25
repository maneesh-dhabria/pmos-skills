# 03 · Plan — Story · /backlog grooming AC detection (260625-751)

**Epic** 260625-sm0 · **route** skill · **plugin** pmos-toolkit · **Tier 1**
**Design contract** [`../../02_design.md`](../../02_design.md) — cite Root cause, D1–D5.
**Depends on** — none.

Release prerequisites (version bump, changelog, README row, `plugin.json` version-sync) are **not**
tasks here — `/complete-dev` owns them at epic release.

## Overview

A single cohesive, zero-dep change to `/backlog`'s read-side derivation. `hasAcceptanceCriteria()` in
`plugins/pmos-toolkit/skills/backlog/scripts/serve-web-lib.mjs` currently requires a markdown checkbox,
so numbered/dash ACs read as ungroomed and false-flag `planned` stories in `/backlog` + `/backlog groom`.
Make the detector **format-robust** (D1): an AC section counts when it holds ≥1 enumerated criterion in any
form — checkbox, dash/star bullet, or numbered — and is empty only when heading-only. Reconcile `schema.md`
(D3), regression-test the format matrix (D4). The change is confined to the derivation lib + its test
(**D5** — `viewer.html`/`serve-web.mjs` untouched).

TDD: tests first (T1), implementation to green (T2), doc reconcile (T3), live dogfood (T4).

## Tasks

### T1 — Failing tests first: the AC-format matrix (AC1, AC2, AC4)
Extend `plugins/pmos-toolkit/skills/backlog/tests/serve-web.test.mjs` (failing-first, before touching the
lib): (a) a story whose `## Acceptance criteria` uses **numbered** items (`1.` / `2.`) → `has_ac === true`
and it is **absent** from `buildModel().queues.groom.needs_grooming`; (b) a story whose ACs use
**bold-dash bullets** (`- **AC1 …**`) → same; (c) a story with a **heading-only / content-empty** AC
section → `has_ac === false` and **present** in `needs_grooming` when `planned`/`ready`; (d) keep an
existing checkbox-AC case green. Use the lib's own `parseFrontmatter`/`buildModel` over in-test fixtures
(temp `items/` dir or direct-body unit calls), matching the suite's existing style. Run → the new
numbered/dash cases FAIL against the checkbox-only regex; commit red.

### T2 — Make `hasAcceptanceCriteria` format-robust (AC1, AC5)
In `serve-web-lib.mjs`, replace the checkbox-only test with an any-enumerated-criterion test, e.g. the
section is non-empty AND a line matches `/^\s*(?:[-*]\s+|\d+[.)]\s+)/m` (covers `- [ ]`/`- [x]` since
those start with `- `, plain `-`/`*` bullets, and `1.`/`2.`/`1)` numbered). Keep `sectionBody`'s
case-insensitive heading match. No signature change; no `viewer.html`/`serve-web.mjs` edit (D5). Run the
suite → all green (T1 cases pass, existing pass). Pure zero-dep.

### T3 — Reconcile `schema.md` (AC3)
In `plugins/pmos-toolkit/skills/backlog/schema.md`, beside the `## Acceptance Criteria` example
(currently `- [ ]` at ~line 133) and/or the `ready`-gate row, add one line: grooming AC detection accepts
checkbox, dash, or numbered criteria — checkbox (`- [ ]`) remains the recommended canonical form. No other
schema change.

### T4 — Live dogfood + gates (AC2, AC6, AC7)
Rebuild the model from the real `backlog/items/` (`parseItems('./backlog/items')` → `buildModel`) and
assert `needs_grooming` excludes the numbered/dash-AC stories present in the repo while a genuinely
AC-less `draft` (temporary fixture, not committed) still flags. Then: `/backlog` `skill-eval` `[D]` green
(SKILL.md surface unchanged); the 4 repo hygiene lints (`tools/lint-*`) + `audit-recommended.sh` clean.
Capture the before/after `needs_grooming` as evidence.

## Final verification checklist
- [ ] `node --test plugins/pmos-toolkit/skills/backlog/tests/serve-web.test.mjs` green (incl. new matrix cases).
- [ ] `hasAcceptanceCriteria` accepts checkbox, dash/star, and numbered; rejects heading-only.
- [ ] `viewer.html` + `serve-web.mjs` unchanged; no new deps.
- [ ] `schema.md` note added; doc and code agree.
- [ ] Live `needs_grooming` excludes numbered/dash-AC stories; AC-less still flags.
- [ ] `/backlog` skill-eval `[D]` + 4 lints + audit clean.
