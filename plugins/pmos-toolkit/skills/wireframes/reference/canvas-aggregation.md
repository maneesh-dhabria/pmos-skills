# Phase 7 — Canvas Aggregation

Reference for the always-on Phase 7 step that aggregates per-device wireframes into a single Figma-like canvas viewer. Consumed by `SKILL.md` Phase 7.

## Contents

- [Invocation](#invocation)
- [Output files](#output-files)
- [canvas.json schema (v1)](#canvasjson-schema-v1)
- [Screen extraction](#screen-extraction)
- [DESIGN.md journey parsing](#designmd-journey-parsing)
- [Auto-layout algorithm](#auto-layout-algorithm)
- [Merge semantics on re-run](#merge-semantics-on-re-run)
- [Failure modes](#failure-modes)
- [Bootstrap-only mode carve-out](#bootstrap-only-mode-carve-out)

## Invocation

From Phase 7 in `SKILL.md`:

```bash
node ${CLAUDE_PLUGIN_ROOT}/skills/wireframes/assets/canvas/build-canvas.js \
  {feature_folder}/wireframes \
  {feature_folder}/wireframes/DESIGN.md
```

Second arg is the DESIGN.md path. Pass empty string `""` (or omit) when DESIGN.md is not present — arrows fall back to empty array, viewer still works.

The script exits 0 on success AND on most soft-fail conditions (no per-device files, no extractable screens, malformed canvas.json). It logs the reason to stderr but never blocks `/wireframes` from continuing — the canvas view is additive.

## Output files

Written into the same `wireframes/` dir as the per-device files:

| File | Purpose | Versioned? |
|---|---|---|
| `canvas.html` | Self-contained viewer (CDN deps + inlined `canvas.json` data block) | Regenerated each run; safe to gitignore. |
| `canvas.json` | Canonical layout + arrows. Preserves user drags across re-runs (FR-4). | **Commit this.** It carries the curated layout. |

## canvas.json schema (v1)

```json
{
  "version": 1,
  "generated_at": "<ISO-8601>",
  "generator": "pmos-toolkit/wireframes canvas-aggregator v<plugin-version>",
  "viewport": { "default_zoom": 0.3, "default_x": 0, "default_y": 0 },
  "screens": [
    {
      "id": "login-desktop-web",
      "screen_id": "login",
      "device": "desktop-web",
      "source_file": "desktop-web.html",
      "anchor": "#login",
      "title": "Log in",
      "journey": "onboarding",
      "x": 0, "y": 0, "w": 1280, "h": 800
    }
  ],
  "arrows": [
    { "from": "login-desktop-web", "to": "dashboard-desktop-web", "label": "", "journey": "onboarding" }
  ]
}
```

- **`id`** — composite `{screen_id}-{device}`. Unique. The canvas viewer keys all DOM state on this.
- **`screen_id`** — value of the source section's `data-screen` attribute, or its `id`, in priority order.
- **`x, y, w, h`** — canvas-space coordinates and dimensions. Pixels. User drags update `x, y`; `w, h` stay fixed unless the source device changes.
- **`journey`** — null if the screen isn't referenced in any DESIGN.md journey. Used for grouping in auto-layout.

## Screen extraction

`extract-screens.js` walks each per-device HTML file with a depth-tracking regex pass:

1. Find every top-level `<section>` tag (nested sections are ignored — they belong to the parent screen).
2. ID priority: `data-screen="<id>"` attribute → `id="<id>"` attribute → skip the section.
3. Title: first `<h2>` inner text inside the section (tags stripped, whitespace collapsed). Falls back to `screen_id` if absent.
4. Device label: derived from the filename. Recognised: `desktop-web`, `mobile-web`, `tablet-web`. Filenames like `01_desktop-web.html` or `mobile-web_v2.html` are matched by substring. Unknown filenames are treated as the device label verbatim.

Sections without an extractable ID are silently skipped. This is intentional: not every `<section>` in a wireframe is a top-level screen.

## DESIGN.md journey parsing

`loadJourneys()` reads DESIGN.md as a Markdown string and walks line-by-line:

1. Looks for a `## User journeys` h2. Lines before it are ignored.
2. Inside that section, looks for `## Journey: <name>` or `### Journey N — <name>` (or any h2/h3 with the word `journey` in it).
3. Per journey, scans following lines for screen references: either `[text](#screen-id)` markdown links or backticked `` `screen-id` `` identifiers. Order preserved; duplicates dropped.
4. Section ends when an h2 not containing "journey" is hit, or EOF.

Tolerant parser — it does not enforce strict structure. If DESIGN.md is malformed or empty, an empty array is returned (arrows will be empty).

## Auto-layout algorithm

Runs only when no existing `canvas.json` is present (or for screens new since last run).

```
for each journey J (in DESIGN.md order):
  rowY = next-free row Y
  colX = 0
  for each screen_id S in J.screen_ids:
    variants = all (S, device) screens
    if no variants: skip
    place variants stacked vertically at (colX, rowY..)
    colX += max(variant widths) + GUTTER_X (200px)
  rowY += max(stack heights) + GUTTER_Y (400px)

orphan-row: all screens not in any journey, laid left-to-right at rowY
```

Device widths default: `desktop-web=1280`, `mobile-web=390`, `tablet-web=834`. Heights: `800, 844, 1112`. Unknown devices default to `1280×800`.

## Merge semantics on re-run

Per FR-4 in the spec — never silently drop user-curated positions:

- Screens present in both old and new canvas.json → keep old `x, y`. Use new `w, h` only if the device changed.
- Screens new (post-regen, not in old canvas.json) → auto-laid out using the algorithm above, then appended.
- Screens removed (in old, not in new) → dropped.
- Arrows: always regenerated fresh from DESIGN.md. (DESIGN.md is canonical for journey structure; the canvas.json arrows array is a cache.)

## Failure modes

| Condition | Behavior | Exit |
|---|---|---|
| `<wireframes-dir>` doesn't exist | Log to stderr, do nothing | 0 |
| No `*.html` files (excluding `index.html`/`canvas.html`) | Log to stderr, do nothing | 0 |
| No `<section>` with extractable ID in any file | Log to stderr, do nothing | 0 |
| DESIGN.md missing | Arrows empty, screens still rendered | 0 |
| DESIGN.md present but no journeys parsed | Log warning, arrows empty | 0 |
| Existing canvas.json is malformed JSON | Log warning, regenerate from scratch (drops user layout) | 0 |
| Wrong argv (no wireframes-dir) | Print usage, exit 64 | 64 |

The aggregator is "additive": its job is to enrich `/wireframes` output, never to block it. All non-fatal conditions degrade gracefully.

## Bootstrap-only mode carve-out

When `/wireframes` is invoked as `--bootstrap-design-only`, Phase 5 (Index & Serve) does not run; only DESIGN.md and COMPONENTS.md are produced. Phase 7 therefore also does not run (there are no per-device files to aggregate). This is by-design and not a silent skip: it follows directly from the bootstrap-mode contract documented in `SKILL.md`'s `## --bootstrap-design-only mode` section.
