# High-Fi Styles Derivation — SUPERSEDED

> **Superseded as of pmos-toolkit v2.8.0.** Phase 4d of `/prototype` no longer follows this document. Style is now driven by:
>
> - `design-artifact-resolver.md` — resolves DESIGN.md, copies/regenerates `design-overlay.css`, generates `design-tokens.js`.
> - `design-md-to-tokens-js.md` — produces the JS tokens artifact (`window.__designTokens`).
> - `wireframes/reference/design-md-spec.md` — DESIGN.md schema (base + `x-*` extensions).
> - `wireframes/reference/design-md-to-css.md` — CSS overlay generator (reused from `/wireframes`).
>
> Phase 4d now emits at most a thin `styles.css` for prototype-only utilities (shimmer animations, scroll-snap overrides) — never tokens. Tokens come from `design-overlay.css` (CSS) and `design-tokens.js` (JS).
>
> This file is retained as a historical reference for plans that link to it. New work follows the docs above.
>
> ---

# High-Fi Styles Derivation

How Phase 4d produces `assets/styles.css` from the wireframes' `house-style.json`. The wireframes pipeline already extracted brand tokens; this phase reskins them for high-fidelity (no annotation chrome, real hover/focus/active states, polished typography ramp).

## Inputs

- `{feature_folder}/wireframes/assets/house-style.json` — produced by `/wireframes` Phase 2a
- `{feature_folder}/prototype/assets/prototype.css` — base palette + tokens (already copied to output in Phase 4a)

## Cases

### Case 1: `house-style.json` has `source: null`

No host frontend was detected during wireframes. Write a minimal `styles.css`:

```css
/* No house style detected — prototype.css defaults apply. */
```

That's it. The base CSS handles everything.

### Case 2: `house-style.json` has tokens

Generate `styles.css` with `:root` overrides that take precedence over `prototype.css` defaults. Structure:

```css
/* High-fi skin derived from {detected_source} */

:root {
  /* Color tokens (override prototype.css defaults) */
  --primary: {primary_from_house_style};
  --primary-hover: {derived: 8% darker};
  --primary-active: {derived: 16% darker};
  --primary-fg: {derived: contrast pick — white or near-black};

  --surface: {surface_from_house_style or '#ffffff'};
  --surface-2: {derived: 2% darker than surface};
  --surface-3: {derived: 5% darker};

  --text: {text_from_house_style or '#0f172a'};
  --text-muted: {derived: text at 65% opacity};
  --text-subtle: {derived: text at 45% opacity};

  --border: {derived: 8% darker than surface};
  --border-strong: {derived: 16% darker};

  --danger: {danger_from_house_style or '#dc2626'};
  --warning: {warning_from_house_style or '#d97706'};
  --success: {success_from_house_style or '#16a34a'};
  --info: {info_from_house_style or '#2563eb'};

  /* Radius tokens */
  --radius-sm: {radius_sm_from_house_style or '4px'};
  --radius-md: {radius_md_from_house_style or '8px'};
  --radius-lg: {radius_lg_from_house_style or '16px'};

  /* Typography */
  --font-sans: {font_family_from_house_style or "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"};
  --font-mono: {mono_family or "ui-monospace, 'SF Mono', Menlo, monospace"};
}

/* Component-shape overrides based on library hint */
{if library_hint == "shadcn"}
  .btn { border-radius: var(--radius-md); font-weight: 500; }
  .card { border: 1px solid var(--border); border-radius: var(--radius-lg); }
{else if library_hint == "material"}
  .btn { border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
  .card { box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24); }
{else if library_hint == "chakra"}
  .btn { border-radius: var(--radius-md); font-weight: 600; }
{else}
  /* No specific library hint — prototype.css base shapes apply */
{end}

/* Strip any wireframe annotation classes (defensive — should not appear in prototype output) */
.annotation, .state-tab, .wireframe-frame, .wireframe-only { display: none !important; }
```

## Derivation rules

1. **Color derivation (when only one shade is provided):**
   - `--primary-hover` = primary blended with 8% black
   - `--primary-active` = primary blended with 16% black
   - `--primary-fg` = white if luminance(primary) < 0.5 else `#0f172a`
   - Surface tints (`--surface-2`, `--surface-3`) = surface blended with 2% / 5% black
   - Text variants = text at reduced opacity

2. **If house-style.json provides explicit hover/active variants, use them.** Don't override.

3. **Library hint mapping:** `tailwind` → no shape overrides (Tailwind is the base). `shadcn` / `material` / `chakra` / `mui` → shape overrides as above. `unknown` or absent → no overrides.

4. **Font family:** if house-style.json provides a single family, prepend it to the system stack as a fallback. If it provides a stack, use it verbatim.

5. **No images, no background-images, no SVG embedded in CSS.** The prototype is portable; outbound URLs would break offline review.

6. **No `@import url(...)` for fonts.** Use system stacks only. Loading Google Fonts breaks `file://` review and adds network dependency.

7. **No animations beyond what's in `prototype.css`.** This file is for tokens and shape overrides only.

## Subagent dispatch

Phase 4d sends the subagent:
- The full `house-style.json` content
- This derivation file
- The current `prototype.css` (so it knows what classes exist to override)

The subagent writes `{feature_folder}/prototype/assets/styles.css` (≤200 lines target).

## Validation

After write:

```bash
# 1. Valid CSS (basic — no parser, just check braces match)
python3 -c "
text = open('{feature_folder}/prototype/assets/styles.css').read()
assert text.count('{') == text.count('}'), 'Unbalanced braces'
"

# 2. No external URLs
grep -E 'url\(http' {feature_folder}/prototype/assets/styles.css && echo "EXTERNAL URL FOUND"

# 3. No @import
grep '@import' {feature_folder}/prototype/assets/styles.css && echo "@IMPORT FOUND"
```

If any fail, re-prompt subagent with specific complaint.
