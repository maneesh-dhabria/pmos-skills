# `_shared/html-authoring/` — HTML authoring substrate

Shared substrate consumed by every pmos-toolkit pipeline skill that writes feature-folder artifacts (`/requirements`, `/spec`, `/plan`, `/msf-req`, `/msf-wf`, `/simulate-spec`, `/grill`, `/artifact`, `/verify`, `/design-crit`, plus `/feature-sdlc` orchestrator artifacts).

Skills used to write Markdown directly. Now they author HTML — an HTML version of the artifact lives next to the legacy `.md` shape and surfaces inside a per-feature `index.html` viewer.

## What's in this directory

| File | Purpose |
|------|---------|
| `README.md` | This file — entry point for skills consuming the substrate. |
| `template.html` | Base scaffold a skill copies + slot-fills (`{{title}}`, `{{asset_prefix}}`, `{{plugin_version}}`, `{{content}}`). FR-02. |
| `conventions.md` | Semantic structure rules every skill MUST follow when generating `{{content}}`. Heading-id contract lives here. FR-03 / FR-03.1. |
| `assets/` | Per-folder runtime assets — `style.css`, `viewer.js`, `serve.js`, `comments.js`, `comments.css`, `comments-open.command`, `comments-open.sh`, `comments-open.bat`, `build_sections_json.js`, `chrome-strip.js`, `svg-anchor.js`. Skills copy this directory into `{feature_folder}/assets/` at write time (FR-10). |

## The authoring contract (skill author's checklist)

When a pipeline skill writes its artifact, it MUST:

1. **Author HTML in memory** following `conventions.md` (`<section>` per logical area; `<h2>`/`<h3>` carry stable kebab-case `id`; `<figure>`/`<dl>`/`<table>` per the conventions).
2. **Slot-fill `template.html`** with `{{title}}`, `{{asset_prefix}}` (relative depth-aware path to `assets/`, e.g., `./assets/` or `../assets/`), `{{plugin_version}}` (read from `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`), `{{pmos_skill}}` (the emitting skill's slug — fills `<meta name="pmos:skill">`, which the `/comments` resolver routes on, so it MUST be set per-skill), `{{source_path}}`, and `{{content}}`. Append `?v=<plugin-version>` to any asset URL the skill emits inside `{{content}}` (cache-bust, FR-10.3 — template-emitted references already carry it).
3. **Write atomically** (FR-10.2): `<NN>_<artifact>.html` and `<NN>_<artifact>.sections.json` via temp-then-rename — both succeed or neither persists. Sections.json is built from the same section tree the skill just authored (FR-71); no post-write HTML parsing.
4. **Copy `assets/*` idempotently** into `{feature_folder}/assets/`: launchers `comments-open.command` / `comments-open.sh` via `install -m 0755` (so the executable bits survive the copy); everything else via `cp -n` (no-clobber). New substrate files added in future releases ride along automatically without per-skill prose updates.
5. **Regenerate `{feature_folder}/index.html`** with the manifest inlined as `<script type="application/json" id="pmos-index">` per `index-generator.md` (no on-disk `_index.json` is written — FR-20–FR-22, FR-41) so the viewer surfaces the new artifact.
6. **`output_format: both`?** Retired (FR-12.1) — `output_format=both` is treated as `html` until a future feature re-introduces MD export.

## How consumers cite this

A consumer SKILL.md does not restate the checklist above — it cites it and states only its per-skill deltas: the output filename, the `<meta name="pmos:skill">` value, and the save path. Canonical wording in a skill body:

> **Emit per `_shared/html-authoring/README.md` checklist.** Deltas: artifact = `02_spec.html`, `{{pmos_skill}}` = `spec`, save path = `{feature_folder}/`.

Anything beyond those three deltas (a different asset prefix for nested directories, an extra sidecar file) is also stated at the call site; the checklist itself lives only here. The emit contract is test-backed by `tests/fanout.test.sh`, so a pointer is safe — drift fails the test, not the consumer's prose.

## Heading-id enforcement (FR-03.1)

Every `<h2>` and `<h3>` carries a stable kebab-case `id`; the skill is responsible for emitting them at write time. `/verify` smoke (FR-72) hard-fails if any artifact's HTML contains an `<h2>` or `<h3>` without an `id`. `assert_heading_ids.sh` (Phase 4) enforces this in CI.

The id-derivation rule (lowercase, non-alnum→`-`, dedupe `-2`/`-3`) is documented in `conventions.md`.

## Out of scope

- ES modules in `viewer.js` or any `assets/*.js` (FR-05.1 — pre-push hook fails on `^(import|export)\b|type=["']module["']`).
- External CDN at runtime — all scripts and styles are local-relative (FR-02).
- Tailwind / utility-CSS bundles in `style.css` (FR-04 — vanilla CSS, hand-authored, ≤30 KB).

## Pointers

- Authoring rules → `conventions.md`
- Scaffold to copy → `template.html`
- Asset payload + their contracts → `assets/`
- Resolver pattern (read upstream artifact respecting both `.html` and `.md` shapes) → `../resolve-input.md` (created in Phase 2 of this feature; absent until then).
