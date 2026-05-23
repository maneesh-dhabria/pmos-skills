# Index generator — `index.html` + `_index.json`

> **Algorithm document referenced by the per-skill HTML-rewrite runbook.** Every pipeline skill that writes a feature-folder artifact regenerates `{feature_folder}/index.html` + inlines a fresh `_index.json` manifest after its own write. Skill prompts inline this algorithm by reference.

This is a discipline document, not an executable. Skills implement the steps inline (a few `Read`/`Glob`/`Write` tool calls, no script). Spec refs: FR-20, FR-21, FR-22, FR-41, §9.0 (forward-compat), §9.1 (ordering policy).

---

## 1. Inputs

- `feature_folder` — absolute path to `{docs_path}/features/<YYYY-MM-DD>_<slug>/`.
- Glob results:
  - `{feature_folder}/*.html` — top-level HTML artifacts (`00_pipeline.html`, `01_requirements.html`, `02_spec.html`, `03_plan.html`, `msf-findings.html`, `00_open_questions_index.html`).
  - `{feature_folder}/*.md` — top-level legacy MD artifacts (FR-22 legacy entries; G11). Excludes any `*.md` that has a sibling `*.html` (sidecars from `output_format: both` are NOT legacy entries).
  - `{feature_folder}/{wireframes,prototype,grills,simulate-spec,verify}/index.html` — externally-indexed nested directories (one entry each, `external_index: true`).
  - `{feature_folder}/{grills,simulate-spec}/<YYYY-MM-DD>*.{html,md}` — flat date-stamped artifacts (no nested index.html); each gets its own entry.

---

## 2. Manifest construction

For each globbed artifact, build one entry:

| Field | Source |
|---|---|
| `id` | kebab-case from filename stem (e.g., `01_requirements.html` → `01-requirements`). Wireframes/prototype index → `wireframes-index` / `prototype-index`. Legacy MD → append `-legacy`. Per-skill manifests may supply a stable override (preferred over filename-derived). |
| `title` | For HTML: the artifact's `<h1>` text content (read once at write time; do not re-parse during regeneration — skill in-memory state is canonical). For MD: humanized filename stem (`01_requirements` → `Requirements`); for legacy MD: append ` (legacy markdown)`. |
| `phase` | Phase label per the §9.1 phase-rank table (see §3 below). |
| `path` | Path relative to `feature_folder` (e.g., `01_requirements.html`, `wireframes/index.html`, `simulate-spec/2026-05-09-trace.html`). |
| `format` | `"html"` or `"md"`. |
| `sections_path` | For HTML: companion `<stem>.sections.json` if present, else `null`. For MD: always `null`. |
| `external_index` | `true` only for nested-dir entries (`wireframes/`, `prototype/`); omitted otherwise. |

**Title-extraction policy (FR-21):** The skill that authored the artifact already knows its `<h1>` text — pass it through to the manifest at write time. Re-globbing existing artifacts in the same feature folder reads `<h1>` from each artifact's first `<h1>...</h1>` slice (cheap, no full parser). For externally-indexed entries, the title comes from the nested skill's own emission (`wireframes/index.html`'s `<h1>` is `"Wireframes"`, etc.).

---

## 3. Ordering (§9.1)

Sort `artifacts[]` by `(phase_rank, filename_ascending)`. Phase ranks (lower = earlier):

| Rank | Phase label | Typical artifacts |
|---|---|---|
| 0 | `00 Pipeline` | `00_pipeline.html`, `00_open_questions_index.html` |
| 1 | `01 Requirements` | `01_requirements.html` |
| 2 | `02 Spec` | `02_spec.html` |
| 3 | `03 Plan` | `03_plan.html` |
| 4 | `MSF Findings` | `msf-findings.html` |
| 5 | `Wireframes` | `wireframes/index.html` (external) |
| 6 | `Prototype` | `prototype/index.html` (external) |
| 7 | `Grills` | `grills/<date>_<target>.html` |
| 8 | `Simulate-Spec` | `simulate-spec/<date>-trace.html` |
| 9 | `Verify` | `verify/<date>-<scope>/review.html` |
| 99 | `Legacy` | any `*.md` without an `*.html` sibling |

Within a phase, sort by Unicode-codepoint-ascending filename. The generator MUST be deterministic: same inputs → byte-identical `_index.json` (NFR-07). Stable iteration order (no map/set traversal in unspecified order).

---

## 4. Inlining into `index.html` (FR-41)

The manifest is **inlined into `index.html`** as a JSON `<script>` block — never written to a sibling `_index.json` file that `viewer.js` would `fetch()`. Per FR-41, no runtime `fetch()` of sibling files (file:// CORS-blocks).

```html
<script type="application/json" id="pmos-index">
{ "schema_version": 1, "generated_at": "...", "feature_folder": "...", "artifacts": [...] }
</script>
```

`viewer.js` reads it via `JSON.parse(document.getElementById('pmos-index').textContent)` at boot.

The `_index.json` filename is informally retained in the spec/plan text as the manifest's *content shape name*, but no on-disk `_index.json` file is written. (Initial spec drafts considered an on-disk file; FR-41 collapsed it to inline.)

---

## 5. `index.html` template

Use the substrate's `_shared/html-authoring/template.html`. The generator fills:

- `{{title}}` — `"<feature-slug> — pmos-toolkit"`.
- `{{asset_prefix}}` — `assets/` (root-feature-folder relative; nested-dir indexes compute their own).
- `{{plugin_version}}` — current pmos-toolkit version (FR-10.3 cache-bust).
- `{{source_path}}` — `index.html`.
- `{{content}}` — the chrome HTML: header toolbar (W01 mast), `<aside class="pmos-sidebar">` with per-phase group headers (collapse-to-summary chevron, W01), `<main class="pmos-main">` with the iframe slot (`<iframe class="pmos-artifact-frame">` under serve.js / `<a class="pmos-artifact-link" target="_blank">` on file://, per FR-40), and the `<script type="application/json" id="pmos-index">` block from §4.

`viewer.js` is loaded by `template.html`'s `<head>` (`<script defer src="assets/viewer.js?v=<plugin-version>">`); it consumes the inlined manifest and builds the sidebar at boot.

Wireframe references for sidebar shape: `wireframes/01_index-default_desktop-web.html` (default render) and `wireframes/03_index-mixed-state_desktop-web.html` (legacy entries appearing in a "Legacy" group at the bottom, per §11.3).

---

## 6. `schema_version` (§9.0)

`schema_version: 1` — current. Readers tolerate higher per §9.0 (read fields they understand, ignore unknown). Writers MUST never decrement; new fields land additively at higher versions.

When future phases need new fields (e.g., `last_modified_at`), add them to the entry shape without bumping `schema_version` if they're additive. Bump only when the structure changes incompatibly.

---

## 7. Wireframes / Prototype nesting

Wireframes and Prototype each have their own internally-managed `index.html` (their own skill regenerates it). The feature-folder index treats them as a **single externally-indexed entry**:

```json
{
  "id": "wireframes-index",
  "title": "Wireframes",
  "phase": "Wireframes",
  "path": "wireframes/index.html",
  "format": "html",
  "sections_path": null,
  "external_index": true
}
```

The viewer renders `external_index: true` entries as a single sidebar link that loads the nested index in the iframe — it does NOT walk into the nested folder to enumerate per-screen artifacts at this level. Per FR-15.

---

## 8. Idempotence + atomicity

Regeneration is idempotent: running the algorithm with no new artifacts produces a byte-identical `index.html` (apart from `generated_at`). Skills MUST temp-write-then-rename `index.html` to avoid serving a half-written file (FR-10.2).
