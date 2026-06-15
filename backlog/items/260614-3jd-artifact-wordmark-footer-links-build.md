---
schema_version: 1
id: 260614-3jd
kind: story
parent: 260614-za3
title: Wire artifact wordmark → pmos-skills repo + footer → per-plugin README (new {{repo_url}} token, fix stale archived-repo default, sweep prose, author 4 plugin READMEs, sync to pmos-learnkit)
type: enhancement
priority: should
route: feature
dependencies: []
plugin: pmos-toolkit
status: done
worktree: 
feature_folder: docs/pmos/features/2026-06-14_artifact-wordmark-footer-links/
plan_doc:
tasks: docs/pmos/features/2026-06-14_artifact-wordmark-footer-links/stories/260614-3jd/tasks.yaml
labels: [html-authoring, substrate, links, attribution, readme, cross-plugin]
claimed_by:
driver_holder:
created: 2026-06-14
updated: 2026-06-15
released: 2.83.0
---

<!-- status: planned at define (Loop 1); tasks.yaml authored, route:feature (no plan_doc HTML — lean). Build via /feature-sdlc build --story 260614-3jd -->

## Context

The single build story for epic `260614-za3`. The change is to the canonical html-authoring substrate —
`assets/template.html` (split header wordmark href → repo, keep footer wordmark href → plugin README),
`render.js` (add `{{repo_url}}`/`repoUrl`, repoint stale `pluginUrl` default) — plus a prose sweep of the three
md files that hardcode the URL, four new plugin `README.md` files, and a `sync-shared.sh` propagation to
pmos-learnkit. One vertical slice = one `/execute` run = one PR; no cross-story dependencies (D24 litmus holds).

Built against `docs/pmos/features/2026-06-14_artifact-wordmark-footer-links/02_design.html` (FR-1…FR-9).

## Acceptance Criteria

- [x] **AC1 — Token (FR-1):** `template.html` + `render.js` carry a `{{repo_url}}` / `repoUrl` token threaded through `renderArtifact` exactly like `{{plugin_url}}`; `DEFAULTS.repoUrl = 'https://github.com/maneesh-dhabria/pmos-skills'`.
- [x] **AC2 — Header wordmark (FR-2):** `a.pmos-wordmark` in the header uses `href="{{repo_url}}"`; rendered value = the repo root (no `#readme`).
- [x] **AC3 — Footer wordmark (FR-3):** `a.pmos-wordmark--footer` uses `href="{{plugin_url}}"`; rendered value = the producing plugin's README path.
- [x] **AC4 — Attribution (FR-4):** both "Created using <plugin>" links keep `href="{{plugin_url}}"` and read correctly with the corrected value.
- [x] **AC5 — Fix stale default (FR-5):** `DEFAULTS.pluginUrl` in **both** `render.js` copies repointed from `pmos-toolkit#readme` to `…/pmos-skills/blob/main/plugins/<plugin>/README.md` (per-plugin); no default references the archived repo.
- [x] **AC6 — Prose sweep (FR-6):** `primer/SKILL.md`, both `index-generator.md` (index.html masthead wordmark href → `{{repo_url}}`), and the `template.html` header comment updated; grep for `pmos-toolkit#readme` across `plugins/**/*.md` + substrate = clean.
- [x] **AC7 — Plugin READMEs (FR-7):** `plugins/<plugin>/README.md` authored for all four plugins — one-paragraph charter (from CLAUDE.md), skill list, install/marketplace line, link to repo root; valid Markdown.
- [x] **AC8 — Sync (FR-8):** `scripts/sync-shared.sh --from=pmos-toolkit` run; `diff` of the two `_shared/html-authoring/` copies clean.
- [x] **AC9 — No regressions (FR-9):** `build_sections_json.js` + `chrome-strip.js` produce identical output on a re-rendered doc (only href values changed); inline-comments overlay unaffected.
- [x] **AC10 — Live verification (load-bearing dogfood):** render ≥1 toolkit doc AND ≥1 learnkit doc through the substrate, serve over http, open in a browser; assert header wordmark href = repo root and footer wordmark/attribution href = that plugin's README; click both and confirm each loads a real page (HTTP 200, not the archived repo). Gaps → fix → re-run (cap 2, then accept-residuals-and-surface).

## Tasks

See `tasks.yaml`. No release-prerequisite tasks in any wave — version bump / changelog / manifest sync are
`/complete-dev`'s job at Loop 3 (substrate change → "ride which release?" for both plugins).

## Notes

### Build write-back (Loop 2, 2026-06-14)

Built on branch `feat/260614-3jd` (commits `c54f3ae` T1, `a6e65a1` T2, `a0e9cf7` T3, `ba96f5f` T4; branched
from main `d1809c6` which carried the claim). **Verdict: PASS** — all 10 ACs verified with live evidence.

- **T1 (token):** `render.js` (both copies) gained `repoUrl` in DEFAULTS + the `{{repo_url}}` sub, threaded
  exactly like `{{plugin_url}}`; `pluginUrl` default repointed off the archived `pmos-toolkit#readme` to the
  per-plugin `pmos-skills` README. `template.html` header wordmark → `{{repo_url}}`; footer wordmark + both
  attributions stay on `{{plugin_url}}`. TDD: new `wordmarkHrefs` assertion in `render.test.js` (red→green).
- **T2 (prose + archived-ref purge):** both `index-generator.md` masthead wordmark → `<repo_url>`;
  `primer/SKILL.md` documents `{{repo_url}}` vs `{{plugin_url}}`. Broader grep surfaced 3 archived refs beyond
  the named list — fixed all: **`emit-findings.js`** (it renders through the *shared* template, so the missing
  `{{repo_url}}` was a T1-introduced regression — added to its subs map + repointed `plugin_url`; its
  `test-emit-findings.sh` 17/17 green), `ideate/reference/artifact-template.html` (2 attribution hrefs),
  `template-bytestable.sh` (both copies rewritten for the two-token contract). `grep pmos-toolkit#readme`
  across `plugins/` = **zero**.
- **T3 (READMEs):** authored `plugins/<plugin>/README.md` for all four plugins (charter + grouped skill list +
  install/marketplace block + repo-root link); all tracked at the exact href-encoded paths.
- **T4 (sync + no-regression):** `sync-shared.sh --from=pmos-toolkit` — `template.html` byte-identical across
  copies; `render.js` differs ONLY on the documented per-plugin `pluginUrl` line (sync resets it to toolkit;
  restored to learnkit README). Regression proven: `build_sections_json.js` + `chrome-strip.js` produce
  **byte-identical** output across different wordmark hrefs (they read `<main>`/h2-h3, blind to the chrome);
  comments overlay untouched.
- **T5 (load-bearing live dogfood):** rendered a toolkit doc + a learnkit doc through the patched substrate,
  served over `http://localhost`, drove both with Playwright. DOM (`getAttribute`) confirmed on **both**:
  header wordmark = repo root, footer wordmark + both attributions = that plugin's README, **zero** archived
  refs. Live HTTP: repo root → **200**; archived `maneesh-dhabria/pmos-toolkit` → **404** (correctly
  abandoned). Screenshots `dogfood-3jd-{toolkit,learnkit}.png` (untracked worktree evidence).
- **Tests/lints:** `render.test.js` (both), `template-bytestable.sh` (both), `json-escape`, `fanout`,
  `test-emit-findings.sh` 17/17 — all green. 4 repo lints green. `comments-detect.test.js` is an
  environment-skip (`jsdom` not installed; pre-existing, comments logic untouched).

Code merge + release happen at Loop 3 (`/complete-dev --epic 260614-za3` — substrate change rides both
pmos-toolkit and pmos-learnkit releases via the "ride which release?" prompt).

### accepted_residuals

- **Plugin-README live-200 deferred to merge** — the footer/attribution hrefs encode
  `…/pmos-skills/blob/main/plugins/<plugin>/README.md`. Those files are authored and tracked on
  `feat/260614-3jd` at exactly those paths, but `main` has no plugin READMEs until this epic merges, so the
  URLs return 404 on github.com *pre-merge*. Not fixable inside the build loop (no push capability — pushing
  is Loop-3's job). They resolve to 200 once `/complete-dev --epic 260614-za3` merges + pushes. The DOM hrefs
  and the abandonment of the archived repo (404 by design) are fully verified now.
- **`comments-detect.test.js` env-skip** — requires `jsdom` at `/tmp/pmos-jsdom`, absent in this environment;
  fails identically on the base tree. No comments code was touched this story.
