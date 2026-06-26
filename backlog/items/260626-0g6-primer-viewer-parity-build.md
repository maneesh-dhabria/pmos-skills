---
schema_version: 1
id: 260626-0g6
kind: story
title: "/primer library-viewer full parity with /frameworks"
type: enhancement
priority: should
status: done
route: skill
parent: 260626-z2p
dependencies: []
worktree: .claude/worktrees/feat-260626-0g6
plan_doc: docs/pmos/features/2026-06-26_primer-viewer-parity/stories/260626-0g6/03_plan.html
tasks_file: docs/pmos/features/2026-06-26_primer-viewer-parity/stories/260626-0g6/tasks.yaml
claimed_by:
pr:
labels: [primer, frameworks, learn-list, library-viewer, pmos-learnkit, skill]
created: 2026-06-26
updated: 2026-06-26
---

## Context

The sole story of epic `260626-z2p`. Bring `/primer`'s browse library to full feature parity with
`/frameworks` under the shared `_shared/library-viewer/` interface, fixing the one genuine contract break
(hard-coded subtitle count) in passing. Files in scope:

- `plugins/pmos-learnkit/skills/_shared/library-viewer/lib.mjs` — add the default-off iframe reader seam
  (+ `guidelines.md` doc update)
- `plugins/pmos-learnkit/skills/primer/scripts/build-library.mjs` — retrofit onto the new seam + parity config
- `plugins/pmos-learnkit/skills/primer/scripts/tests/*` (build-library.test.sh + selftest) — new assertions
- `plugins/pmos-learnkit/skills/primer/SKILL.md` `#browse` — prose update for the new viewer behaviour

See the epic design_doc (`02_design.html`) for the substrate↔consumer boundary, INV-1..INV-6, and D1..D9.
Primers are standalone HTML documents, so the in-page reader is a **lazy sandboxed iframe** of the primer's
own HTML (user decision 2026-06-26).

## Acceptance Criteria

- [ ] **Substrate seam (additive, default-off).** `_shared/library-viewer/lib.mjs` gains a `config.reader.mode:'iframe'` path (+ `config.reader.iframeField`): the reader pane renders a sandboxed `<iframe>` whose `src` is lazy-set from the opened card's `iframeField` on open, an "Open in new tab" link in the reader header, and an empty-state when nothing is selected. Absent `reader.mode` (or `'columns'`) renders byte-identically to today. `guidelines.md` documents the seam; the 9 frozen exports keep their signatures (INV-5)
- [ ] **Primer consumer retrofit.** `primer/scripts/build-library.mjs` opts into `reader.mode:'iframe'` with `iframeField:'href'`, switching cards from link-out to reader-open; configures `views:[list,cards,detailed]` (list default) and removes the `.viewswitch{display:none}` rule; makes `category` + `audience` multi-dropdown facets (add `+ search` to `category` if option count warrants) while `collection`/`depth`/`super_category` stay single-select; adopts `valueLabels` for `super_category`
- [ ] **Real bug fix.** The `subtitleTemplate` carries a literal `{count}` token so the substrate emits `#subtitleCount` and the runtime sets it from `DATA.length`; the selftest assertion `/· 1 of yours/` is replaced with one asserting the dynamic `{count}`/`#subtitleCount` form
- [ ] **Adapter + config tidy.** A single named `toCard(rec)` adapter (explicit field-by-field, never spread) + an `ALLOWED` constant replace the inline card construction in `loadCurated()` and `scanUserPrimers()` (PII-safe whitelist preserved); the dead `summaryField:'summary'` config is removed
- [ ] **Zero regression (INV-1/INV-2).** No edits to `/frameworks` or `/learn-list` `build-library.mjs` or corpora; their shipped selftests + `*.test.sh` pass **un-edited**. A consumer that does not set `reader.mode` is byte-identical to pre-change output
- [ ] **Tests (D9).** `primer/scripts/tests/build-library.test.sh` + the in-file `--selftest` gain assertions for: the iframe reader element + lazy-src plumbing, the three-view switch present (not CSS-hidden), the multi-dropdown facet controls, the `valueLabels` rename, and the dynamic `#subtitleCount`. All green
- [ ] **Offline/self-contained (INV-4).** No external `<link>/<script src>/<img>`; iframe is `sandbox`ed and points only at sibling on-disk primer files; page + iframe open from `file://`. Best-effort live dogfood: build the library against the shipped corpus, open it, verify a card opens its primer in the iframe reader, views switch, and multi-select facets filter
- [ ] **SKILL.md `#browse` prose** updated to describe the in-page iframe reader + three views + multi-select facets (no longer "every primer becomes a card linking to its standalone HTML" only)
- [ ] Conforms to `skill-patterns.md §A–§L`; passes `skill-eval.md` ([D] deterministic + [J] judge); 4 hygiene lints + audit-recommended + comments-coverage green

## Notes

**Risk to resolve in the plan / build (carry forward from design grill):**
- **iframe sandbox attributes.** Primers are self-contained inline-CSS/JS pmos-artifact docs. A bare `sandbox`
  (no `allow-scripts`/`allow-same-origin`) renders inline CSS fine but disables the primer's own JS (e.g. the
  pmos-comments overlay) — acceptable for reading. Decide the minimal `sandbox` token set in the plan
  (likely `allow-popups allow-popups-to-escape-sandbox` for the "Open in new tab", reading-only otherwise);
  do NOT add `allow-same-origin` + `allow-scripts` together (escape risk).
- **`file://` iframe load.** Verify a sibling-relative `src` resolves under `file://` in the live dogfood;
  if a browser blocks `file://`→`file://` iframe, fall back to a same-directory relative path (the library
  page and primers already co-locate in `{docs_path}/primer/`).
- **Perf with 60+ primers.** Only the opened primer's `src` is set (lazy) — never eager-load all.

Substrate built in epic 260616-tqf/260616-f7w; primer retrofitted in 260616-w1v. The iframe seam is the
first new substrate reader mode since extraction — keep it generic so `/frameworks`/`/learn-list` can adopt it.
