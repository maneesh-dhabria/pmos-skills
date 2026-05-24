# Host Style Extraction (Phase 2.5) — SUPERSEDED

## Contents

- [When this runs](#when-this-runs)
- [Detection algorithm](#detection-algorithm)
- [Output schema](#output-schema)
- [Confidence rules](#confidence-rules)
- [Confirmation prompt](#confirmation-prompt)

> **Superseded as of pmos-toolkit v2.7.0.** Phase 2.5 of `/wireframes` no longer follows this document. The new procedure is split across:
>
> - `design-md-spec.md` — DESIGN.md schema (base + `x-*` extensions).
> - `design-md-resolver.md` — file resolution + `x-extends` cascade + staleness check.
> - `design-md-extractor.md` — auto-extraction (Branch A) and interactive elicitation for greenfield (Branch B). Replaces the extraction logic below.
> - `design-md-to-css.md` — generates `design-overlay.css` (replaces the legacy `house-style.css`).
> - `components-md-spec.md` — the COMPONENTS.md sidecar.
>
> This file is retained as a historical reference for plans that link to it (e.g. `2026-04-30-wireframes-style-and-screenshot-input-plan.md`). New work should follow the docs listed above.
>
> ---

Extracts a "house style" from the host repo's frontend so generated wireframes look like they belong in the same product. Optional. Skips silently when the repo has no frontend.

## When this runs

Phase 2.5 runs after the component matrix is confirmed (Phase 2) and before generation (Phase 3). Triggers when **all** of the following are true:

- Working directory is inside a git repo (`.git` exists at or above `cwd`)
- A frontend signal is present in the repo. Any of:
  - `package.json` whose `dependencies` or `devDependencies` include any of: `react`, `vue`, `svelte`, `next`, `nuxt`, `@remix-run/*`, `solid-js`, `astro`, `preact`
  - `tailwind.config.{js,ts,cjs,mjs}` anywhere in the repo
  - A CSS file containing a `:root { … }` block with `--*` custom properties
  - A top-level `index.html` with a `<style>` block ≥ 30 lines

If none match, write `{feature_folder}/wireframes/assets/house-style.json` with `{"source": null}` and skip the rest of this phase. Tell the user "No host frontend detected — using default wireframe theme."

## Detection algorithm

1. From the repo root, find candidate frontend directories. A candidate is a directory containing one of the trigger signals above. Common shapes:
   - Single-app: repo root itself.
   - Monorepo: `apps/*`, `packages/*-web`, `packages/web/*`, `frontend/`, `web/`, `client/`.
2. Deduplicate candidates whose paths are ancestors of each other — keep the deepest meaningful directory (e.g., prefer `apps/web` over the repo root if both qualify).
3. If exactly **one** candidate remains, use it without prompting (announce the choice).
4. If **>1**, ask the user via `AskUserQuestion` (single-select):
   - **Question:** "Which frontend should the wireframes mirror?"
   - **Options:** one per candidate path + "None — use default style". Cap to 4 options; if more, batch.
   - Platform fallback (no `AskUserQuestion`): pick the candidate with the most `.tsx`/`.vue`/`.svelte` files; announce the assumption.

## Reading the source

Inside the chosen candidate dir, read in this priority order. **Stop when you've read ~20 files or ~30 KB total**, whichever comes first — the goal is a useful summary, not exhaustive analysis.

1. `tailwind.config.*` — extract `theme.extend.colors`, `theme.extend.borderRadius`, `theme.extend.fontFamily`, `theme.extend.spacing` overrides.
2. `package.json` — detect component library:
   - `@radix-ui/*` + `class-variance-authority` + `tailwind-merge` → likely **shadcn/ui**
   - `@mui/material` → **MUI**
   - `@chakra-ui/react` → **Chakra**
   - `@mantine/core` → **Mantine**
   - `@headlessui/react` → **Headless UI**
   - none of the above → "**custom**"
   Also note: icon library (`lucide-react`, `@heroicons/react`, `react-icons`).
3. Top-level CSS files: `globals.css`, `app.css`, `index.css`, `styles/globals.css`, `src/styles/**/*.css`. Extract the `:root` and `:root.dark` custom properties (or `@theme` block for Tailwind v4).
4. 2–3 representative component/page files. Heuristic: largest `.tsx`/`.jsx`/`.vue` files in `app/`, `pages/`, or `src/components/`. Skim for: button shapes (`rounded-md` vs `rounded-full` vs `rounded-none`), card style (border + shadow vs flat), nav layout (top bar vs sidebar vs bottom).

## Output schema

Always write `{feature_folder}/wireframes/assets/house-style.json`. When extraction succeeds:

```json
{
  "source": "apps/web",
  "tokens": {
    "colors": {
      "primary":     "#2563eb",
      "background":  "#ffffff",
      "foreground":  "#0f172a",
      "muted":       "#64748b",
      "border":      "#e2e8f0",
      "destructive": "#dc2626"
    },
    "radius": "0.5rem",
    "fontFamily": {
      "sans": "Inter, ui-sans-serif, system-ui, sans-serif",
      "mono": "JetBrains Mono, ui-monospace, monospace"
    }
  },
  "componentLibrary": "shadcn/ui",
  "iconLibrary": "lucide-react",
  "patterns": {
    "button": "rounded-md, primary fills, ghost on hover",
    "card":   "rounded-lg border bg-card p-6, subtle shadow",
    "nav":    "top horizontal, logo-left, links-right, sticky"
  },
  "notes": [
    "Dark mode via .dark class on <html>",
    "Tailwind v3 with custom color palette in tailwind.config.ts"
  ]
}
```

When extraction yields nothing useful (rare — usually means token files were unreadable), write:

```json
{ "source": null, "notes": ["Extraction skipped: <reason>"] }
```

## Generating `house-style.css`

Only when `source != null` AND `tokens.colors` is non-empty. Map JSON tokens onto the wireframe.css variables (declared in `assets/wireframe.css`):

| `house-style.json` field    | CSS variable to override |
|------------------------------|--------------------------|
| `tokens.colors.primary`      | `--wf-accent`            |
| `tokens.colors.background`   | `--wf-bg`, `--wf-surface`|
| `tokens.colors.foreground`   | `--wf-text`              |
| `tokens.colors.muted`        | `--wf-muted`             |
| `tokens.colors.border`       | `--wf-border`            |
| `tokens.colors.destructive`  | `--wf-error`             |
| `tokens.radius`              | `--wf-radius`            |
| `tokens.fontFamily.sans`     | `--wf-font-sans`         |
| `tokens.fontFamily.mono`     | `--wf-font-mono`         |

Write to `{feature_folder}/wireframes/assets/house-style.css`:

```css
/* Generated from host-style extraction. Override after wireframe.css. */
:root {
  --wf-accent:    #2563eb;
  --wf-bg:        #ffffff;
  --wf-surface:   #ffffff;
  --wf-text:      #0f172a;
  --wf-muted:     #64748b;
  --wf-border:    #e2e8f0;
  --wf-error:     #dc2626;
  --wf-radius:    0.5rem;
  --wf-font-sans: Inter, ui-sans-serif, system-ui, sans-serif;
}
```

Omit any line for which the corresponding JSON field is absent — the wireframe.css default takes over.

## Confidence rules

- If the repo declares both light and dark token sets and they conflict, prefer **light** for the override file. Note "Repo supports dark mode; wireframes use light tokens" in `notes`.
- If multiple `:root { … }` blocks disagree, prefer the one in the file with the largest size (most likely the canonical theme).
- If `tokens.colors.primary` cannot be confidently identified (no `primary` / `accent` / `brand` named token), leave it null — better default theme than wrong color.

## Confirmation prompt

After writing the artifacts, show the extracted summary to the user via `AskUserQuestion`:

- **Question:** "Apply this extracted house style to wireframes?"
- **Options:** **Use as extracted** / **Edit before applying** / **Discard, use default style**
- "Edit before applying" → print the absolute path to `house-style.json`, ask the user to edit + reply when done; re-read the file and regenerate `house-style.css`.
- "Discard" → delete `house-style.css` (keep the JSON for audit but with `"applied": false` added).

Platform fallback (no `AskUserQuestion`): print the summary and the path; assume "use as extracted" unless the user objects in their next message.

## Screenshot fallback

If Phase 2.5 finds no host frontend BUT screenshots were ingested in Phase 1 (`source-screens.md` exists with at least one entry), make a best-effort second pass:

- Read the screenshot descriptions from `source-screens.md`.
- If the descriptions confidently mention a brand color, header style, or component shapes, populate `house-style.json` with `"source": "screenshots"` and the inferred tokens.
- If unsure, leave `source: null` and skip — do NOT guess a brand color from a single screenshot. The default wireframe theme is the safer choice.

## Failure modes

- Token extraction crashes (unreadable file, malformed JSON) → catch, log, write `{"source": null, "notes": ["…"]}`, continue with default theme.
- Multiple frontends and the user picks "None" → write `{"source": null, "notes": ["User declined extraction."]}`.
- `house-style.css` references a variable not in `wireframe.css` → that's a `wireframe.css` bug, not a style-extraction bug. File the gap and skip the unmappable field.
