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
status: planned
feature_folder: docs/pmos/features/2026-06-14_artifact-wordmark-footer-links/
plan_doc:
tasks: docs/pmos/features/2026-06-14_artifact-wordmark-footer-links/stories/260614-3jd/tasks.yaml
labels: [html-authoring, substrate, links, attribution, readme, cross-plugin]
created: 2026-06-14
updated: 2026-06-14
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

- [ ] **AC1 — Token (FR-1):** `template.html` + `render.js` carry a `{{repo_url}}` / `repoUrl` token threaded through `renderArtifact` exactly like `{{plugin_url}}`; `DEFAULTS.repoUrl = 'https://github.com/maneesh-dhabria/pmos-skills'`.
- [ ] **AC2 — Header wordmark (FR-2):** `a.pmos-wordmark` in the header uses `href="{{repo_url}}"`; rendered value = the repo root (no `#readme`).
- [ ] **AC3 — Footer wordmark (FR-3):** `a.pmos-wordmark--footer` uses `href="{{plugin_url}}"`; rendered value = the producing plugin's README path.
- [ ] **AC4 — Attribution (FR-4):** both "Created using <plugin>" links keep `href="{{plugin_url}}"` and read correctly with the corrected value.
- [ ] **AC5 — Fix stale default (FR-5):** `DEFAULTS.pluginUrl` in **both** `render.js` copies repointed from `pmos-toolkit#readme` to `…/pmos-skills/blob/main/plugins/<plugin>/README.md` (per-plugin); no default references the archived repo.
- [ ] **AC6 — Prose sweep (FR-6):** `primer/SKILL.md`, both `index-generator.md` (index.html masthead wordmark href → `{{repo_url}}`), and the `template.html` header comment updated; grep for `pmos-toolkit#readme` across `plugins/**/*.md` + substrate = clean.
- [ ] **AC7 — Plugin READMEs (FR-7):** `plugins/<plugin>/README.md` authored for all four plugins — one-paragraph charter (from CLAUDE.md), skill list, install/marketplace line, link to repo root; valid Markdown.
- [ ] **AC8 — Sync (FR-8):** `scripts/sync-shared.sh --from=pmos-toolkit` run; `diff` of the two `_shared/html-authoring/` copies clean.
- [ ] **AC9 — No regressions (FR-9):** `build_sections_json.js` + `chrome-strip.js` produce identical output on a re-rendered doc (only href values changed); inline-comments overlay unaffected.
- [ ] **AC10 — Live verification (load-bearing dogfood):** render ≥1 toolkit doc AND ≥1 learnkit doc through the substrate, serve over http, open in a browser; assert header wordmark href = repo root and footer wordmark/attribution href = that plugin's README; click both and confirm each loads a real page (HTTP 200, not the archived repo). Gaps → fix → re-run (cap 2, then accept-residuals-and-surface).

## Tasks

See `tasks.yaml`. No release-prerequisite tasks in any wave — version bump / changelog / manifest sync are
`/complete-dev`'s job at Loop 3 (substrate change → "ride which release?" for both plugins).
