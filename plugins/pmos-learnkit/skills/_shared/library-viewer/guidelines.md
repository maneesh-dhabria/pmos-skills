# library-viewer — the shared faceted-listing substrate

A reusable, zero-dependency engine that turns a corpus of records into a single
self-contained HTML "library" page: a faceted, searchable, multi-view listing with a
sidebar reader. Consumers (`/frameworks`, `/primer`, `/learn-list`, …) supply only a
**corpus adapter** + a small **viewer config** and get the whole browse experience for
free. The richest existing viewer — `/frameworks`' `build-library.mjs` — is the reference
implementation and was the first consumer refactored onto this substrate (it froze the API).

This file is the **design contract**: it describes the behaviour every consumer inherits and
the hard constraints the emitted page must satisfy. The executable contract is
`tests/lib.test.mjs` (the frozen public API) + each consumer's own regression test.

## The three listing views

Every page offers three views via an inline-SVG view-switch (no external icon font):

- **List** (the **default**) — a grouped `<ul>`; each row is `name — summary`.
- **Detailed** — a responsive card grid; each card shows category, name, summary, tags, and a
  lazily-mounted thumbnail (see below).
- **Compact** — dense comma-separated name links, grouped by the primary category only.

The default view is **list**, and the list view-switch button carries `class="active"` at
emit time (so the default is correct even before any JS runs).

## Facets, filtering & the applied-filters bar

Facets are declared in config; the engine supports three facet **kinds**:

- **single-select** — a native `<select>` (e.g. frameworks' "area" filter). One value or "all".
  May carry a presentation-only `valueLabels` map: the rendered `<option>` label is remapped,
  but the option **value** (and everything matching/grouping uses) stays the **raw** field value.
- **multi-dropdown** — a button-triggered panel of native checkboxes; one panel open at a time;
  the panel stays open across picks. Optional per-option counts from the corpus.
- **multi-dropdown + search** — as above plus a type-to-filter search box over the options.

Filter semantics are fixed and identical across consumers:

- **OR within a facet** (any selected decision-type matches), **AND across facets** (must pass
  every active facet), **AND** the free-text search.
- Free-text search is **multi-token AND** over the configured search fields, **debounced**
  (~120 ms) so each keystroke does not trigger a full re-render.

An always-present **applied-filters bar** shows one removable chip per active filter
(facet-labelled, e.g. `Decision: prioritize ✕`) plus a non-empty search chip and a **Clear all**
control. Chips and the dropdown checkboxes stay in sync (removing a chip unchecks its box).
The result count lives in an `aria-live="polite"` region.

## Sorting & grouping

- Items within a group sort **alphabetically** (case-insensitive) by name.
- Group names sort alphabetically, with configured **trailing** buckets
  (`Uncategorized`, `(untagged)`) pinned **last**.
- Group-by is configurable (e.g. frameworks groups by Product Areas or Tags). Compact view
  always groups by the primary category.

## Sidebar reader — layout-shift, not an overlay

Opening a record opens an `<aside>` reader **in normal flow** that **shifts the layout** (its
width animates open); it is **not** a `position:fixed` overlay and has **no backdrop**. This
preserves the page's `scrollY` — opening/closing a record never snaps the list to the top. The
reader:

- Reflects the open record in the URL hash (`#id`); a guarded `hashchange` handler supports
  back/forward and deep-links (`#id` on load opens that record).
- **Escape** closes the reader (after first closing any open dropdown), and **focus returns** to
  the list item that opened it.
- On **mobile (≤720 px)** the layout stacks (reader below the list) and the reader
  `scrollIntoView`s on open.
- Offers **Copy markdown**, **Copy link**, and **Share** actions (clipboard API with a
  `execCommand('copy')` textarea fallback).

Selection highlight in all three views is a **targeted** class toggle on the existing nodes —
never a full `#groups` rebuild — so opening a record causes no perceived reload.

## Reader mode — markdown columns (default) vs. iframe (opt-in)

The sidebar reader has two modes, selected by `config.reader.mode`:

- **`'columns'` (default — also the value when `reader.mode` is absent):** the markdown-column
  reader described above (renders `bodyHtmlField` / `columns` / `refsField` inline). This is the
  only mode the substrate emitted before the seam existed, and it stays **byte-identical** — a
  consumer that does not set `reader.mode` gets exactly the previous output (INV-1). The iframe
  CSS and runtime are injected **only** when `mode === 'iframe'`, so the unset path adds zero
  bytes.
- **`'iframe'` (opt-in):** the reader renders the item's **own standalone HTML document** in a
  lazily-loaded `<iframe>` instead of a markdown column. Use this when each card already maps to a
  self-contained HTML file (a published artifact) and a large corpus should not eagerly load every
  document. Set `config.reader.iframeField` to the card field holding the document URL/path
  (default `'href'`). The iframe `src` is assigned **only on open** (never at first paint), carries
  a restrictive `sandbox="allow-popups allow-popups-to-escape-sandbox"` (never
  `allow-same-origin` + `allow-scripts` together), offers an **"Open in new tab ↗"** affordance,
  and shows a visible **empty-state** when a card has no document. `openReader` is overridden to
  the iframe renderer; the rest of the sidebar (hash deep-link, Escape-to-close, focus return,
  mobile stacking) is inherited unchanged.

Both modes are **config-driven** — the iframe mode adds **no new export** and does not change any
of the 9 frozen signatures (INV-5); it is reached purely through `config.reader.mode` /
`config.reader.iframeField`.

## Thumbnails (detailed view)

Detailed cards emit a `data-thumb` **placeholder**; the thumbnail HTML is injected **lazily**
via `IntersectionObserver` as cards approach the viewport (eager fallback where the observer is
absent). Thumbnails are **never** inlined at first paint.

## Masthead & theme

A sticky header carries a PMOS **wordmark**, a title, and a subtitle whose **count is dynamic**
(read from the corpus length / `DATA.length` at runtime — never a hard-coded number). A single
dark theme ships by default; consumers may pass `extraHead` CSS to extend it.

## Hard constraints (every emitted page MUST satisfy)

- **Offline from `file://`** — the page works with no network and no server.
- **Zero external asset references** — no `<link href="http…">`, no `<script src="http…">`, no
  `<img>` (images/diagrams are inlined as `<svg>`), no `amazonaws`/S3 URLs. Everything is
  inlined into the single HTML file.
- **Zero runtime dependencies** — only the build tool runs under Node; the page ships no deps.
- **NO ES modules in the emitted asset JS** — the in-page `<script>` is **plain, var-style,
  ES5-safe vanilla JS** (no `import`/`export`/`let`/`const`/arrow functions inside the page).
  Only the **build-side** code (`lib.mjs` and the consumer's builder) is Node ESM.
- **Vanilla CSS only** — no preprocessor, no CSS framework.

## Public API (frozen — see `tests/lib.test.mjs`)

The substrate (`lib.mjs`) exports a small, skill-agnostic surface:

- `esc(s)` — HTML-escape.
- `renderMarkdown(md)`, `parseBlocks(md)`, `renderBody(md, inserts)` — minimal markdown →
  HTML, and block-aware placement of HTML fragments (e.g. diagrams) after their anchored block
  (null/unmatched anchors go to a leading group; missing fragments never re-index survivors).
- `extractFacets(cards, fieldSpecs)` → `{ facets: { key: { values: [{ value, count }] } } }`.
- `buildIndex(records, adapter)` — normalize raw records into cards via a consumer adapter.
- `filterEngine(cards, state)` — pure filter/search (OR-within / AND-across + multi-token
  search), the same algorithm the emitted client runs. Used by tests + any `--json` consumer.
- `sortGroups(names, { trailing })` — alpha sort with trailing buckets pinned last.
- `emitHtml({ cards, facets, config, masthead, theme, extraHead, extraScript, bodyRenderer })`
  → a single self-contained HTML string.

**Skill-agnostic invariant (D12):** `lib.mjs` must never name or branch on a specific skill
(`frameworks` / `primer` / `learn-list`). All skill-specific behaviour arrives through the
adapter, the config, `bodyRenderer`, `extraHead`, and `extraScript` extension seams. A source
grep in `tests/` enforces this.
