# `_shared/html-authoring/` — HTML authoring substrate

Shared substrate consumed by every pmos-toolkit pipeline skill that writes feature-folder artifacts (`/requirements`, `/spec`, `/plan`, `/msf-req`, `/msf-wf`, `/simulate-spec`, `/grill`, `/artifact`, `/verify`, `/design-crit`, plus `/feature-sdlc` orchestrator artifacts).

Skills used to write Markdown directly. Now they author HTML — an HTML version of the artifact lives next to the legacy `.md` shape, surfaces inside a per-feature `index.html` viewer, and round-trips back to MD on demand via vendored `turndown.umd.js`.

## What's in this directory

| File | Purpose |
|------|---------|
| `README.md` | This file — entry point for skills consuming the substrate. |
| `template.html` | Base scaffold a skill copies + slot-fills (`{{title}}`, `{{asset_prefix}}`, `{{plugin_version}}`, `{{content}}`). FR-02. |
| `conventions.md` | Semantic structure rules every skill MUST follow when generating `{{content}}`. Heading-id contract lives here. FR-03 / FR-03.1. |
| `assets/` | Per-folder runtime assets — `style.css`, `viewer.js`, `serve.js`, `turndown.umd.js`, `turndown-plugin-gfm.umd.js`, `html-to-md.js`, `build_sections_json.js`, `chrome-strip.js`. Skills copy this directory into `{feature_folder}/assets/` at write time (FR-10). |

## The authoring contract (skill author's checklist)

When a pipeline skill writes its artifact, it MUST:

1. **Author HTML in memory** following `conventions.md` (`<section>` per logical area; `<h2>`/`<h3>` carry stable kebab-case `id`; `<figure>`/`<dl>`/`<table>` per the conventions).
2. **Slot-fill `template.html`** with `{{title}}`, `{{asset_prefix}}` (relative depth-aware path to `assets/`, e.g., `./assets/` or `../assets/`), `{{plugin_version}}` (read from `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`), and `{{content}}`.
3. **Write atomically** (FR-10.2): `<NN>_<artifact>.html` and `<NN>_<artifact>.sections.json` via temp-then-rename — both succeed or neither persists. Sections.json is built from the same section tree the skill just authored (FR-71); no post-write HTML parsing.
4. **Copy `assets/*` idempotently** into `{feature_folder}/assets/` (skip if mtime/hash matches).
5. **Regenerate `{feature_folder}/index.html` + `_index.json`** so the viewer surfaces the new artifact (FR-20–FR-22).
6. **`output_format: both`?** Also derive `<NN>_<artifact>.md` by invoking `Bash('node {feature_folder}/assets/html-to-md.js <artifact>.html > <artifact>.md')` (FR-12). Never edit the `.md` directly — it is regenerated on every HTML rewrite.

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
