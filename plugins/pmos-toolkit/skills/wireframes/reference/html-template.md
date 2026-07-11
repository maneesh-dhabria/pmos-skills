# Wireframe HTML Template

## Contents

- [Skeleton](#skeleton)
- [Screen manifest (`pmos-wireframe-meta`)](#screen-manifest)
- [`data-anchor` coverage](#data-anchor-coverage)
- [Vocabulary cheat-sheet](#vocabulary-cheat-sheet)
- [Annotations](#annotations)
- [Realistic copy guidance](#realistic-copy-guidance)
- [Strict format requirements](#strict-format-requirements)
- [Anti-patterns](#anti-patterns)

Every generated wireframe file MUST follow this skeleton. The **shell** — `<head>`, the `.wf-chrome` reviewer
toolbar, the state-switcher, the `.wf-footer` — is HTML and may keep colour (it is not the design). The **screen
payload** inside each `<section class="wf-state">` is an inline **monochrome `<svg>`** drawn from the closed
house-style palette. The shared CSS at `./wireframe.css` (copied into the output folder at the start of
`#generate`) provides theme tokens, the state-switcher, the annotations layer, and the device frames; the SVG
payload draws its own primitives from [`primitives.md`](./primitives.md). Both the palette and the canvas
dimensions live in [`grid-system.md`](./grid-system.md) — this file composes them, it does not restate the hexes
or the sizes.

## Skeleton

The `<svg>` root carries a `viewBox` at the device's **canvas token** (`grid-system.md` → *Canvas presets*; the
`SKILL.md` `#chrome-canvas` map picks which one per device — desktop-web/desktop-app → `1280 × 800`,
mobile-web/ios-app/android-app → `375 × 812`), a root `stroke="#000"` (ink) and `fill="none"` so the payload is
monochrome by default, one `<g data-region="…">` per region — each carrying its own `<title>` and `<desc>` and a
`data-anchor` slug — and a final `<g data-region="annotations">` that is the **only** place `#d33` may appear.
This desktop example is shown **verbatim** (see [Strict format requirements](#strict-format-requirements)); a
mobile file is identical but at the `375 × 812` canvas with `data-interactive` tap targets ≥ 48px (the next 8-grid
multiple above the 44px floor). On the mobile canvas the **375 width is exempt only on the root `<svg>`** — a
full-bleed child (e.g. a top bar) must still snap to an 8-multiple (`368`, not `375`), or the 8px-grid lint
rejects it.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="pmos:skill" content="wireframes">
  <title>{{COMPONENT_NAME}} — {{DEVICE}} — Wireframe</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="./wireframe.css">
  <link rel="stylesheet" href="./assets/comments.css">
  <script src="./assets/comments.js" defer></script>
</head>
<body data-annotations="on">
  <!--
    Review Log (auto-maintained by refinement loops)
    Loop 1: <findings + fixes>
    Loop 2: <findings + fixes>
  -->

  <!-- Wireframe chrome (NOT part of the design — meta toolbar for reviewers; keeps colour) -->
  <header class="wf-chrome">
    <div class="wf-chrome__inner">
      <span class="wf-chrome__title">{{COMPONENT_NAME}}</span>
      <span class="wf-chrome__device">{{DEVICE}}</span>
      <nav class="wf-tabs" aria-label="State switcher">
        <button class="wf-tab" aria-selected="true"  data-state="default">Default</button>
        <button class="wf-tab" aria-selected="false" data-state="empty">Empty</button>
        <button class="wf-tab" aria-selected="false" data-state="loading">Loading</button>
        <button class="wf-tab" aria-selected="false" data-state="error">Error</button>
        <!-- add more states as needed; emit <button>s only for states the component actually has -->
      </nav>
      <button id="toggle-anno" class="wf-tab" aria-pressed="true">Annotations</button>
    </div>
  </header>

  <!-- Device frame: pick exactly one wf-frame--<device> class -->
  <main class="wf-frame wf-frame--{{DEVICE}}">

    <!-- desktop-app only: traffic lights -->
    <!-- <div class="wf-traffic"><span></span><span></span><span></span></div> -->

    <!-- ios-app only: notch + status bar -->
    <!-- <div class="wf-notch"></div>
         <div class="wf-statusbar"><span>9:41</span><span>5G</span></div> -->

    <!-- One section per state. Only `.active` is visible. Each carries ONE inline monochrome SVG payload. -->
    <!-- CRITICAL: sections key on data-state, NOT data-screen — extract-screens.js splits on
         data-screen, so introducing it here would wrongly fan each state onto its own canvas screen. -->
    <section class="wf-state active" data-state="default" aria-labelledby="state-default-h">
      <h1 id="state-default-h" class="sr-only">Default state</h1>
      <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800"
           stroke="#000" fill="none"
           font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
        <g data-region="app-bar" data-anchor="app-bar" transform="translate(0,0)">
          <title>Top app bar</title>
          <desc>Product name and account avatar.</desc>
          <rect x="0" y="0" width="1280" height="56" fill="#fff" stroke="#e6e6e6"/>
          <text x="24" y="32" font-size="20" fill="#000" stroke="none">Acme Reports</text>
          <rect x="1216" y="8" width="40" height="40" fill="#e6e6e6"/>
        </g>
        <g data-region="heading" data-anchor="heading" transform="translate(24,88)">
          <title>Page heading</title>
          <desc>Screen title and one-line summary.</desc>
          <text x="0" y="24" font-size="28" fill="#000" stroke="none">Q3 Renewals</text>
          <text x="0" y="64" font-size="14" fill="#666" stroke="none">14 accounts up for renewal this quarter.</text>
        </g>
        <g data-region="content" data-anchor="content" transform="translate(24,200)">
          <title>Renewal cards</title>
          <desc>One card per account: title plus renewal date and ARR.</desc>
          <rect x="0" y="0" width="360" height="200" fill="#fff" stroke="#e6e6e6"/>
          <text x="16" y="40" font-size="20" fill="#000" stroke="none">Acme Pilot Q3</text>
          <text x="16" y="72" font-size="14" fill="#666" stroke="none">Renews 2026-09-30 · $1,247.50 ARR</text>
          <rect x="384" y="0" width="360" height="200" fill="#fff" stroke="#e6e6e6"/>
          <text x="400" y="40" font-size="20" fill="#000" stroke="none">Globex Renewal</text>
          <text x="400" y="72" font-size="14" fill="#666" stroke="none">Renews 2026-10-15 · $3,900.00 ARR</text>
        </g>
        <!-- 1: the primary CTA submits, then routes to /renewals/confirm -->
        <g data-region="actions" data-anchor="actions" transform="translate(24,432)">
          <title>Primary action</title>
          <desc>Filled button; submits and routes to the confirmation screen.</desc>
          <rect data-interactive="true" x="0" y="0" width="160" height="40" fill="#000"/>
          <text x="24" y="24" font-size="14" fill="#fff" stroke="none">Start renewal</text>
        </g>
        <!-- annotations: the ONLY place the annotation colour may appear (numbered marker keyed to the footer list) -->
        <g data-region="annotations" data-anchor="annotations" transform="translate(192,432)">
          <title>Reviewer annotations</title>
          <desc>Numbered redlines keyed to the footer list; the only annotation-red in the file.</desc>
          <circle cx="16" cy="16" r="16" fill="#d33"/>
          <text x="16" y="24" font-size="14" fill="#fff" stroke="none" text-anchor="middle">1</text>
        </g>
      </svg>
    </section>

    <section class="wf-state" data-state="empty" aria-labelledby="state-empty-h">
      <h1 id="state-empty-h" class="sr-only">Empty state</h1>
      <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800"
           stroke="#000" fill="none"
           font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
        <g data-region="empty" data-anchor="empty" transform="translate(24,88)">
          <title>Empty state</title>
          <desc>No renewals yet — explains why and offers a CTA (never just "No data").</desc>
          <text x="0" y="24" font-size="20" fill="#000" stroke="none">No renewals this quarter</text>
          <text x="0" y="56" font-size="14" fill="#666" stroke="none">Accounts appear here 90 days before their renewal date.</text>
          <rect data-interactive="true" x="0" y="80" width="160" height="40" fill="#000"/>
          <text x="24" y="104" font-size="14" fill="#fff" stroke="none">Import accounts</text>
        </g>
      </svg>
    </section>

    <section class="wf-state" data-state="loading" aria-labelledby="state-loading-h">
      <h1 id="state-loading-h" class="sr-only">Loading state</h1>
      <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800"
           stroke="#000" fill="none"
           font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
        <g data-region="loading" data-anchor="loading" transform="translate(24,88)">
          <title>Loading state</title>
          <desc>Skeleton rows stand in for content while data loads.</desc>
          <rect x="0" y="0" width="480" height="24" fill="#e6e6e6"/>
          <rect x="0" y="40" width="720" height="16" fill="#f4f4f4"/>
          <rect x="0" y="64" width="640" height="16" fill="#f4f4f4"/>
        </g>
      </svg>
    </section>

    <section class="wf-state" data-state="error" aria-labelledby="state-error-h">
      <h1 id="state-error-h" class="sr-only">Error state</h1>
      <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800"
           stroke="#000" fill="none"
           font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
        <g data-region="error" data-anchor="error" transform="translate(24,88)">
          <title>Error state</title>
          <desc>Load failed — plain-language reason plus a retry affordance.</desc>
          <text x="0" y="24" font-size="20" fill="#000" stroke="none">Couldn't load renewals</text>
          <text x="0" y="56" font-size="14" fill="#666" stroke="none">The reports service timed out. Your data is safe.</text>
          <rect data-interactive="true" x="0" y="80" width="120" height="40" fill="#fff" stroke="#000"/>
          <text x="24" y="104" font-size="14" fill="#000" stroke="none">Retry</text>
        </g>
      </svg>
    </section>

    <!-- ios-app only: home indicator -->
    <!-- <div class="wf-home-indicator"></div> -->
    <!-- mobile/native only: tab bar -->
    <!-- <div class="wf-tabbar">…</div> -->

  </main>

  <footer class="wf-footer">
    <div class="wf-footer__inner">
      <span>{{COMPONENT_NAME}}</span>
      <span class="mock-pill">{{DEVICE}}</span>
      <span>File {{NN}} of {{TOTAL}}</span>           <!-- e.g. "File 03 of 6" — leading zero on file index, NO leading zero on total -->
      <span>Generated {{YYYY-MM-DD}}</span>          <!-- always include — non-optional -->
      <a class="wf-grow" style="text-align:right" href="./index.html">Back to index</a>
    </div>
    <!-- Numbered annotation list — one <li> per annotation, numbered to match the SVG markers and the
         pmos-wireframe-meta `annotations` array. Restate the same list in the skill's chat reply. -->
    <ol class="wf-anno-list wf-footer__inner">
      <li>Primary CTA submits, then routes to /renewals/confirm.</li>
    </ol>
  </footer>

  <!-- Machine-readable screen manifest — the declared home for fields/components/states/annotations.
       Replaces /prototype's th/label/dt tag-grep (empty against SVG text nodes). See #screen-manifest. -->
  <script type="application/json" id="pmos-wireframe-meta">
  {
    "states": ["default", "empty", "loading", "error"],
    "fields": [],
    "components": [
      { "kind": "app-bar", "variant": null,        "label": "Acme Reports",    "state": "default", "region": "app-bar", "anchor": "app-bar" },
      { "kind": "card",    "variant": null,        "label": "Acme Pilot Q3",   "state": "default", "region": "content", "anchor": "content" },
      { "kind": "button",  "variant": "primary",   "label": "Start renewal",   "state": "default", "region": "actions", "anchor": "actions" },
      { "kind": "button",  "variant": "primary",   "label": "Import accounts", "state": "empty",   "region": "empty",   "anchor": "empty" },
      { "kind": "button",  "variant": "secondary", "label": "Retry",           "state": "error",   "region": "error",   "anchor": "error" }
    ],
    "annotations": [
      { "n": 1, "note": "Primary CTA submits, then routes to /renewals/confirm.", "anchor": "annotations", "state": "default" }
    ]
  }
  </script>

  <script>
    // State switcher
    const tabs = document.querySelectorAll('.wf-tab[data-state]');
    const states = document.querySelectorAll('.wf-state');
    tabs.forEach(t => t.addEventListener('click', () => {
      tabs.forEach(x => x.setAttribute('aria-selected', x === t));
      states.forEach(s => s.classList.toggle('active', s.dataset.state === t.dataset.state));
    }));
    // Annotations toggle
    const annoBtn = document.getElementById('toggle-anno');
    annoBtn.addEventListener('click', () => {
      const on = document.body.dataset.annotations === 'on';
      document.body.dataset.annotations = on ? 'off' : 'on';
      annoBtn.setAttribute('aria-pressed', String(!on));
    });
  </script>
</body>
</html>
```

## Screen manifest (`pmos-wireframe-meta`)

Every screen emits **one** inline `<script type="application/json" id="pmos-wireframe-meta">` block carrying
`{states, fields, components, annotations}`. It is the machine-readable single home for what the screen contains —
the deliberate replacement for `/prototype`'s fragile grep of `<th>` / `<label>` / `<dt>` / `data-field`
(`prototype/SKILL.md`, `reference/mock-data-prompt.md`), which returns an **empty entity model, not an error**,
against an SVG payload where a form field is a `<text>` node. `/wireframes` is the **writer** of this manifest;
sibling story `260710-n67` is the **reader** that retires the grep — **do not defer `n67`.**

One manifest per file (not one per `<section>`); every entry carries a `state` discriminator, and the top-level
`states` array enumerates every state the file renders — so a multi-state screen is fully described by the single
block. Shapes:

| Key | Type | Fields |
|---|---|---|
| `states` | `string[]` | every `data-state` present in the file |
| `fields` | object[] | `name:string`, `type:string` (`text\|number\|date\|email\|select\|checkbox\|textarea\|toggle\|…`), `state:string`, `region:string`, `anchor:string` — the declared replacement for the tag-grep |
| `components` | object[] | `kind:string`, `variant:string\|null`, `label:string`, `state:string`, `region:string`, `anchor:string` |
| `annotations` | object[] | `n:integer`, `note:string`, `anchor:string`, `state:string` — keyed to the `<!-- N: … -->` comments and the footer list |

`fields`, `components`, and `annotations` are tagged by the `state` they belong to; every `state` value MUST also
appear in `states`. The `anchor` on each entry MUST match a `data-anchor` slug present in the SVG (see below) so a
consumer can resolve an entry back to its region.

## `data-anchor` coverage

Every `<g>` and every top-level `<rect>` / `<path>` in the payload MUST carry a `data-anchor`. Author them on the
region groups (as the skeleton does — the slug doubles as the manifest `anchor`), and rely on **`retrofitSvg()`**
(`_shared/html-authoring/assets/svg-anchor.js`) to inject any that are missing at write time: it finds **every**
`<svg>…</svg>` block in the per-screen HTML (so all state sections are covered), walks `<g>` nesting depth
(retrofitting every `<g>` at any depth and every `<rect>`/`<path>` at depth 0), and is **idempotent** — an
already-anchored element is left untouched. This is the same retrofit already wired into "Apply comment-resolver
edit" in `SKILL.md`; it is what lets `/comments resolve` route a thread to an SVG region. (The comment
**write-back** resolver's SVG-anchor branch is sibling story `260710-n67`'s deliverable; this story only guarantees
the anchors are present to resolve against.)

## Vocabulary cheat-sheet

The **screen payload** is composed from the named monochrome primitives in [`primitives.md`](./primitives.md) — 26
copy-paste SVG blocks (inputs, buttons, cards, nav, content, media, overlays, annotations). Drop a primitive onto
the canvas and position it with its wrapper `transform="translate(x,y)"`. The **shell** still uses the `.wf-*`
classes from `./wireframe.css`:

| Class / primitive source | Use for |
|-------|---------|
| `.wf-frame--desktop-web` / `--desktop-app` / `--mobile-web` / `--android-app` / `--ios-app` | Outer device frame — pick exactly one |
| `.wf-chrome`, `.wf-chrome__inner`, `.wf-chrome__title`, `.wf-chrome__device` | Top reviewer toolbar (chrome — keeps colour) |
| `.wf-tabs`, `.wf-tab` | State switcher |
| `.wf-state`, `.wf-state.active` | One section per state; only the active one renders |
| `.wf-footer`, `.wf-anno-list` | Footer + numbered annotation list |
| `.wf-statusbar`, `.wf-tabbar`, `.wf-fab`, `.wf-notch`, `.wf-home-indicator`, `.wf-traffic` | Native chrome |
| `primitives.md` §Inputs / §Layout / §Navigation / §Content / §Media / §Overlay | The **monochrome SVG payload** — every element the user sees inside the frame |
| `primitives.md` §Annotation (24–26) | Redline / numbered-marker / measurement — the only place `#d33` is allowed |

Tailwind utilities remain available for laying out the **shell** (header/footer chrome); the SVG payload lays
itself out with `transform` and grid-aligned coordinates.

## Annotations

Reviewer notes live in the `<g data-region="annotations">` group — the only place `#d33` may appear — as a
**numbered marker** (primitive 25) pinned near the region it flags. Each marker's number keys to:

1. a `<!-- N: … -->` comment above the annotated primitive,
2. a `<li>` in the footer `.wf-anno-list`, and
3. an entry in the `pmos-wireframe-meta` `annotations` array.

These are **three renderings of one dataset** — keep them in sync (§K: one fact, one home). Annotations are
toggleable via the chrome button (`data-annotations="off"` hides the layer) so reviewers get a clean view too.

## Realistic copy guidance

- Pull product, role, and entity names from the requirements doc
- Use realistic numbers (`$1,247.50` not `$XX.XX`)
- Use real-shape names ("Acme Pilot Q3 Renewal", not "Project A")
- Dates as actual dates near today, not placeholders

## Strict format requirements

Subagents drift on these unless the format is shown verbatim. Match the [Skeleton](#skeleton) exactly.

**Payload is monochrome SVG:** the `<svg>` root declares `viewBox` = the device's canvas token with matching
`width`/`height`, `stroke="#000"`, `fill="none"`; every fill/stroke is a `grid-system.md` palette token; every
`<text>` carries `stroke="none"` (kills the glyph halo); every box coordinate is a multiple of 8. Run every emitted
screen through `scripts/lint-wireframe-svg.mjs` — it is the deterministic gate for all of the above.

**Footer:**

```html
<span>File 03 of 6</span>          <!-- leading zero on file index; NO leading zero on total -->
<span>Generated 2026-05-01</span>  <!-- always include — non-optional -->
```

**Accessibility — icon-only / short-label controls:**

An interactive SVG primitive whose visible label is fewer than 5 characters or is icon-only MUST carry a
`<title>` (via its region group) describing its purpose; shell `<button>`s under 5 characters keep their
`aria-label`.

```html
<button aria-label="Close" title="Close">×</button>
```

This applies uniformly across files in a feature folder — high-variance coverage (one wireframe with 31 labelled
regions, another with 1) is a defect the cross-file reviewer will catch.

## Anti-patterns

- Do NOT put HTML/`mock-*` UI inside a `<section class="wf-state">` — the payload is inline SVG now; the `mock-*`
  classes are retired from the screen body (the shell keeps its `.wf-*` chrome)
- Do NOT introduce `data-screen` on the state sections — extraction keys on it and would split each state onto its
  own canvas screen; the sections key on `data-state`
- Do NOT let `#d33` appear outside a `<g data-region="annotations">` subtree — the lint rejects it
- Do NOT emit a `<text>` without `stroke="none"` — it paints a halo the lint rejects
- Do NOT add a standalone `.svg` deliverable or an `--emit-svg` flag — the SVG lives **inline** in the per-screen
  `.html` only
- Do NOT use `Lorem ipsum`, real photographs, or finished iconography — labelled boxes and the crossed-box image
  placeholder (primitive 17) only
- Do NOT vary the footer format across files — only "File 03 of 6" is correct
