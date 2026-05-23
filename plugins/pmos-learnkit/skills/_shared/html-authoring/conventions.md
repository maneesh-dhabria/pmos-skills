# HTML authoring conventions

Every pipeline skill that emits a feature-folder artifact MUST follow these rules when generating the HTML body that fills `template.html`'s `{{content}}` slot. Reviewer subagents (FR-50/51/52) and `/verify` smoke (FR-72) depend on this contract.

## 1. Section structure

Wrap each logical area of the document in a `<section>` element with a stable `id`:

```html
<section id="overview" data-pmos-section="overview">
  <h2 id="overview">Overview</h2>
  <p>...</p>
</section>
```

- One `<section>` per top-level logical area (Overview, Decision Log, Risks, etc.).
- Nested `<section>` is allowed for deeper structure, but flat is preferred where readable.
- The `<section>` `id` and the leading `<h2>` `id` are typically identical (the heading anchors the section).

## 2. Heading hierarchy

- `<h1>` — document title only. Exactly one per artifact, emitted by `template.html`'s toolbar (do NOT include `<h1>` inside `{{content}}`).
- `<h2>` — top-level sections (matches `## ` in the legacy MD shape).
- `<h3>` — subsections (matches `### `).
- `<h4>+` — discouraged; flatten where possible.

## 3. The heading-id rule (FR-03.1 — enforced by `/verify`)

**every `<h2>` and `<h3>` carries a stable kebab-case `id`; the skill is responsible for emitting them at write time.**

`/verify` smoke (FR-72) hard-fails if any artifact's HTML contains an `<h2>` or `<h3>` without an `id`. `tests/scripts/assert_heading_ids.sh` enforces this in CI.

### Id derivation rule (canonical algorithm)

Given a heading's text content (e.g., `"Decision Log — D7 (proposed)"`):

1. Lowercase the text: `"decision log — d7 (proposed)"`.
2. Replace every non-alphanumeric run with a single `-`: `"decision-log-d7-proposed-"`.
3. Trim leading/trailing `-`: `"decision-log-d7-proposed"`.
4. **Collision dedupe.** If this id has already been emitted in this document, append `-2`, `-3`, ... until unique.

Skills MUST use this exact algorithm so that cross-document anchors (`02_spec.html#fr-html-authoring`, `03_plan.html#t1-scaffold`) resolve deterministically across re-runs of the same skill on the same input.

### Examples

| Heading text | Emitted id |
|--------------|------------|
| `Overview` | `overview` |
| `7.1 HTML authoring contract — _shared/html-authoring/` | `7-1-html-authoring-contract-shared-html-authoring` |
| `### FR-03.1` | `fr-03-1` |
| Second `### FR-03.1` in same doc | `fr-03-1-2` |

## 4. Diagrams — `<figure>` + `<figcaption>`

```html
<figure id="seq-diagram-resolver" data-pmos-figure="seq-diagram-resolver">
  <svg viewBox="0 0 800 400" role="img" aria-label="Resolver flow"> ... </svg>
  <figcaption>Resolver flow: skill → <code>_shared/resolve-input.md</code> → file fallback chain.</figcaption>
</figure>
```

- Inline SVG only (no `<img>` for diagrams); SVG round-trips to MD as a fenced block via turndown.
- `<figcaption>` is required and human-readable.
- For diagrams authored by `/diagram` subagent (FR-60), the parent skill reads the SVG file and inlines its contents inside `<figure>`.

## 5. Term/definition lists — `<dl>`

Use `<dl>` for definition-style content (decision-log entries with `Decision: / Rationale: / Trade-offs:`, FR-ID tables that read as definitions, etc.):

```html
<dl class="pmos-decisions">
  <dt id="d7">D7 — Inline SVG vs. <img></dt>
  <dd>Inline SVG. Round-trips to MD; survives file://.</dd>
</dl>
```

Each `<dt>` may carry an `id` if the definition is anchor-worthy.

## 6. Tables — standard `<table>`

Standard semantic `<table>` with `<thead>` + `<tbody>`. Used for FR-ID matrices, file-map tables, risk tables, etc.:

```html
<table>
  <thead><tr><th>ID</th><th>Requirement</th></tr></thead>
  <tbody>
    <tr><td>FR-01</td><td>...</td></tr>
  </tbody>
</table>
```

No mandatory class names beyond what `style.css` provides. Avoid styling tables via inline `style=`.

## 7. Code — `<pre><code>`

```html
<pre><code class="language-bash">git worktree add .worktrees/feat-x -b feat-x</code></pre>
```

The `language-*` class hints round-trip to a fenced MD block (` ```bash `). No syntax-highlighter library at runtime.

## 8. Inline marks

- `<code>` — inline code, file paths, identifiers.
- `<strong>` — emphasis (round-trips to `**bold**`).
- `<em>` — italic (round-trips to `*italic*`).
- `<a href="...">` — links. Cross-doc anchors use `<file>.html#<section-id>` (e.g., `<a href="02_spec.html#fr-html-authoring">`).

## 9. Forbidden patterns

- ❌ `data-section="..."` taxonomy attributes — rejected per spec D5; rely on `<section id>` only.
- ❌ Mandatory class names beyond what `style.css` styles. Stay close to vanilla semantic HTML.
- ❌ Inline `<style>` blocks inside `{{content}}` — all styling lives in `style.css`.
- ❌ `<script>` blocks inside `{{content}}` — `viewer.js` is the only script.
- ❌ External CDN references — assets are local-relative (FR-02).
- ❌ Tailwind utility classes — vanilla CSS only (FR-04).

## 10. What the skill author MUST emit alongside the HTML

- `<NN>_<artifact>.sections.json` — companion file enumerating every `<section>`/`<h2>`/`<h3>` id with `{id, level, title, parent_id_or_null}` (FR-70/71). Built from the same in-memory section tree the skill authored; do NOT post-parse the HTML.
- `assets/*` — copied idempotently into `{feature_folder}/assets/` (FR-10).
- `index.html` + `_index.json` — regenerated at the feature-folder root (FR-20/21).

## 11. Cross-doc anchor rule

Every `<a href="X.html#frag">` MUST resolve to a real `id` in `X`'s `sections.json`. `tests/scripts/assert_cross_doc_anchors.sh` (Phase 4) enforces this.

When linking from `03_plan.html` to `02_spec.html#fr-html-authoring`, the skill computes the section id using the rule in §3 against the spec's heading text — not by scraping the spec at write time.
