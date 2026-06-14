---
schema_version: 1
id: 260614-za3
kind: epic
title: Artifact wordmark + footer linking — header wordmark → pmos-skills repo, footer → per-plugin README; fix stale archived-repo URL; author 4 plugin READMEs
type: enhancement
priority: should
route: feature
plugin: pmos-toolkit
status: defined
feature_folder: docs/pmos/features/2026-06-14_artifact-wordmark-footer-links/
requirements_doc:
spec_doc:
design_doc: docs/pmos/features/2026-06-14_artifact-wordmark-footer-links/02_design.html
labels: [html-authoring, substrate, links, attribution, readme, cross-plugin]
created: 2026-06-14
updated: 2026-06-14
---

## Context

Seeded by a "check first, then create the epic if needed" request: the `pmos` wordmark in artifact headers should
link to the **pmos-skills repo**, and the footer should link to the **README of the plugin** that produced the
artifact. The check (Phase 01 of the design doc) found it is **not** happening that way.

Every pmos skill renders artifacts through one shared substrate —
`plugins/<plugin>/skills/_shared/html-authoring/template.html` + `render.js`. Today the header wordmark, footer
wordmark, and both "Created using <plugin>" attribution links all point at the **same** `{{plugin_url}}` token,
whose default in both `render.js` copies is `https://github.com/maneesh-dhabria/pmos-toolkit#readme` — the
**archived** old repo (canonical is now `maneesh-dhabria/pmos-skills`, confirmed by all four `marketplace.json`
`homepage` fields). No plugin even has a `README.md`, so the footer's "plugin readme" target does not exist.

This epic splits the two targets by intent (wordmark → repo; attribution/footer → plugin README), repoints the
stale default at the `pmos-skills` monorepo, and authors a real `README.md` for each of the four plugins.

Design + decisions + FRs: `docs/pmos/features/2026-06-14_artifact-wordmark-footer-links/02_design.html`.

## Decisions

- **D1** — Split link targets by intent: the `pmos` **wordmark** is the project brand → the repo; **attribution** ("Created using <plugin>") → that plugin's README.
- **D2** — Header wordmark → repo root `https://github.com/maneesh-dhabria/pmos-skills` (new `{{repo_url}}` token).
- **D3** — Footer wordmark → the plugin README (`{{plugin_url}}`); the one place the same glyph diverges from the header (literal reading of the request).
- **D4** — Attribution links (header + footer) → `{{plugin_url}}` = plugin README (existing semantic; only the resolved URL is fixed).
- **D5** — `{{plugin_url}}` resolves per-plugin to `…/pmos-skills/blob/main/plugins/<plugin>/README.md`; stale `pmos-toolkit#readme` default fixed in both `render.js` copies; `{{repo_url}}` default = repo root.
- **D6** — Author a real `README.md` for each of the 4 plugins (pmos-toolkit, pmos-learnkit, pmos-utilities, pmos-gamekit) so the footer link lands on a real page. *(maintainer-chosen over a bare directory deep-link.)*
- **D7** — Sweep prose that hardcodes the URL: `primer/SKILL.md`, both `index-generator.md` (index.html masthead wordmark href → `{{repo_url}}`), `template.html` header comment.
- **D8** — Edit canonical pmos-toolkit substrate, then `sync-shared.sh --from=pmos-toolkit` → pmos-learnkit byte-identical; one release per plugin at Loop 3.
- **D9** — Single fused story (`260614-3jd`, route: feature): template + render.js + prose sweep + 4 READMEs + sync = one `/execute` run / one PR (D24 litmus holds).
- **D10 (overlap)** — In-flight epic `260614-m68` also edits `template.html`/reads `render.js`; disjoint changes (m68 = type/layout/comments; this = link hrefs + a new token). Whichever builds second rebases; conflicts are mechanical.

## Acceptance Criteria

- [ ] Rendered artifact: header `a.pmos-wordmark` href = `https://github.com/maneesh-dhabria/pmos-skills` (repo root, no `#readme`)
- [ ] Rendered artifact: footer `a.pmos-wordmark--footer` href = `…/pmos-skills/blob/main/plugins/<plugin>/README.md` for the producing plugin
- [ ] No artifact href anywhere resolves to `maneesh-dhabria/pmos-toolkit` (archived repo) — grep clean
- [ ] Per-plugin resolution proven: a toolkit-rendered doc footer → toolkit README; a learnkit-rendered doc footer → learnkit README
- [ ] All four `plugins/*/README.md` exist, valid Markdown (charter + skill list + repo link), render on GitHub
- [ ] `diff` of pmos-toolkit vs pmos-learnkit `_shared/html-authoring/` clean after sync
- [ ] No regression in `build_sections_json` / `chrome-strip` / inline-comments overlay on a re-rendered doc
- [ ] Load-bearing live dogfood: render one toolkit + one learnkit doc, open in a browser, click header wordmark (→ repo) and footer link (→ that plugin's README); each resolves to a real page (200, not the archived repo); gaps → fix → re-run (cap 2)

## Notes

Single build story (`260614-3jd`, route: feature). Substrate-only cross-plugin change → "ride which release?" at
Loop 3: pmos-toolkit and pmos-learnkit each ship on their next bump. Overlaps file-wise with `260614-m68` — see D10.
