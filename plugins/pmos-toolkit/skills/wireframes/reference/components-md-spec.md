# COMPONENTS.md Specification

## Contents

- [Why a separate file?](#why-a-separate-file)
- [File shape](#file-shape)
- [Per-component section](#per-component-section)
- [Header block (required)](#header-block-required)

`COMPONENTS.md` is the prose-first companion to `DESIGN.md`. Where DESIGN.md captures **visual identity** (tokens, rationale), COMPONENTS.md captures the **existing component library inventory** so generators can reuse what's already built instead of inventing parallel components.

Lives next to `DESIGN.md` in the same directory.

---

## Why a separate file?

DESIGN.md's `x-components-extended` field is a token-level summary (component names, variants). That's deliberately small — DESIGN.md should stay readable. The richer per-component prose (props, sample code, call-sites, gotchas) is too much for a YAML field. It lives here.

The two files mirror each other at the summary level: every component in `x-components-extended` has a corresponding `## <ComponentName>` section in COMPONENTS.md.

---

## File shape

Markdown, no front matter. Header block on top with provenance, then one `## ComponentName` section per component.

```markdown
# COMPONENTS.md — AcmeCRM

Source: apps/web/src/components, packages/ui/src
Commit: 4af3e8392b1a
Generated: 2026-05-02

## Button

**Path:** `packages/ui/src/Button.tsx`
**Variants:** primary, secondary, ghost, destructive
**Sizes:** sm, md, lg
**Props (key):** variant, size, loading, leftIcon, rightIcon, disabled, asChild
**Used in:** Dashboard (12 call-sites), Settings (8), Onboarding (6), Deals (22), Reports (4)
**Notes:** Loading state shows spinner replacing leftIcon; disabled is `opacity-50 + pointer-events-none`. Destructive variant uses `bg-destructive text-onPrimary`. `asChild` enables Radix Slot composition for link-as-button.

[...repeat per component...]
```

---

## Header block (required)

Top of file:

```markdown
# COMPONENTS.md — <App Name>

Source: <comma-separated dirs walked>
Commit: <SHA at extraction>
Generated: <YYYY-MM-DD>
Extractor version: 1
```

Mirrors DESIGN.md's `x-source` block. `/verify`'s drift check reads `Source` + `Commit` to detect new components since extraction.

---

## Per-component section

Required fields (skip the line if not applicable, don't omit the field arbitrarily):

| Field | Notes |
|---|---|
| **Path** | Primary file. If multiple files compose the component, list the entry. |
| **Variants** | Visual variants (e.g. `primary`, `secondary`). Empty if there are none. |
| **Sizes** | Size tokens (e.g. `sm`, `md`, `lg`). Empty if uniform. |
| **Props (key)** | Comma-separated key props. Don't dump the full TS interface — pick the 4–8 that matter for usage. |
| **Used in** | Top 5 call-site features by frequency. Helps generators know where the component is real load-bearing. |
| **Notes** | 1–3 sentences on non-obvious behavior, gotchas, composition patterns. |

Optional:

| Field | When to include |
|---|---|
| **Subcomponents** | If the component exposes a compound API (e.g. `Card.Header`, `Card.Body`). List child names. |
| **A11y** | If there's a non-default a11y contract (e.g. focus management, aria pattern). |
| **Replaces** | If this component supersedes an older one still in the tree, name it so generators don't reach for the legacy. |

---

## Section ordering

Group components by category, in this order:

1. **Primitives** — Button, Input, Select, Checkbox, Radio, Switch, Textarea, Label
2. **Layout** — Card, Sheet, Stack, Grid, Divider, ScrollArea
3. **Navigation** — TopNav, SideNav, Tabs, Breadcrumbs, Pagination
4. **Feedback** — Toast, Banner, Tooltip, Popover, Dialog/Modal, AlertDialog
5. **Data display** — Table, DataGrid, List, Avatar, Badge, Empty, Stat
6. **Form composition** — Form, FormField, FormError
7. **Domain components** — App-specific components that aren't generic primitives.

Within each group, alphabetical.

---

## Extractor procedure

The COMPONENTS.md extractor runs from `/wireframes` `#composition-context` (and is re-runnable from `/verify`'s drift check).

### Inputs

- App directory (resolved via `design-md-resolver.md`).
- Optional shared base directory (e.g. `packages/ui/`).

### Steps

1. **Walk component dirs.** Heuristics, in priority order:
   - `<app>/src/components/`
   - `<app>/components/` (Next.js app dir)
   - `packages/ui/src/`
   - `packages/design-system/src/`
   - `<app>/app/components/`
   Stop at the first 2 that exist; budget ~60 component files total.

2. **Identify components.** For each `.tsx`/`.jsx`/`.vue`/`.svelte` file:
   - Find the default or named export that's a function/component.
   - Skip files exporting hooks, utilities, or pure types.
   - Skip files with `.test.`, `.stories.`, `.spec.` in the name.

3. **Extract variants and sizes.** Look for:
   - TypeScript union string types: `variant: "primary" | "secondary" | "ghost"`.
   - `cva()` (class-variance-authority) calls — read the `variants` object.
   - `tv()` (tailwind-variants) calls — same.
   - Vue/Svelte `props` declarations.

4. **Extract key props.** From the component's props interface:
   - Take all props.
   - Drop event handlers (`onClick`, `onChange`) — too noisy.
   - Drop `className`, `style`, `children` — universal.
   - Cap the rest at 8; prefer required props, then frequently-used optional ones.

5. **Find call-sites.** For each top-10-by-import-count component:
   - `git grep "<ComponentName>" -- 'src/**/*.tsx'` (or equivalent for the framework).
   - Group results by top-level feature directory.
   - Emit top 5 by count.

6. **Categorize.** Assign each component to one of the 7 groups above based on name + props heuristics:
   - Has `variant` and accepts no children-as-content → primitive.
   - Renders a layout shell → layout.
   - Has nav-like props (`active`, `href`, `items`) → navigation.
   - Has `open`, `onClose`, `title` → feedback (dialog/popover/toast).
   - Has `columns`, `rows`, `data` → data display.
   - Otherwise → domain.

7. **Write `COMPONENTS.md`** to the same directory as `DESIGN.md`.

8. **Update DESIGN.md `x-components-extended`** (if it exists) with the component-name + variants summary. Don't duplicate the prose.

### Skip conditions

- **No component dirs found** → write an empty COMPONENTS.md with header + a single "No components extracted — repo has no detected component library" line. Do not block.
- **Greenfield** (no frontend) → skip COMPONENTS.md entirely; `/wireframes` will note the absence and use only DESIGN.md tokens.

### Read budget

Cap at ~60 files / 80 KB total reads. Larger libraries get the top components by import frequency; rest are listed by name only with a "(not introspected — read budget)" marker.

---

## Validation rules

A COMPONENTS.md is **valid** if:

1. The header block exists with `Source`, `Commit`, `Generated`.
2. Every `## <Name>` section has `Path:` and `Variants:` (or `Variants: none`).
3. Every component referenced from DESIGN.md `x-components-extended` exists here as a section (and vice versa for the top-10).

---

## Example

```markdown
# COMPONENTS.md — AcmeCRM

Source: apps/web/src/components, packages/ui/src
Commit: 4af3e8392b1a
Generated: 2026-05-02
Extractor version: 1

## Button

**Path:** `packages/ui/src/Button.tsx`
**Variants:** primary, secondary, ghost, destructive
**Sizes:** sm, md, lg
**Props (key):** variant, size, loading, leftIcon, rightIcon, disabled, asChild
**Used in:** Deals (22), Dashboard (12), Settings (8), Onboarding (6), Reports (4)
**Notes:** Loading state shows spinner replacing leftIcon. Destructive variant pairs `bg-destructive` with `text-onPrimary`. `asChild` uses Radix Slot for composition.

## Input

**Path:** `packages/ui/src/Input.tsx`
**Variants:** default, error
**Sizes:** sm, md
**Props (key):** type, value, onChange, placeholder, error, leftAdornment, rightAdornment
**Used in:** Settings (14), Deals (11), Onboarding (9)
**A11y:** Always paired with Label via `htmlFor`. `error` prop sets `aria-invalid` and links `aria-describedby` to the error text.

## Card

**Path:** `packages/ui/src/Card.tsx`
**Variants:** elevated, outlined, ghost
**Sizes:** none
**Props (key):** variant, padding, interactive
**Subcomponents:** Card.Header, Card.Body, Card.Footer
**Used in:** Dashboard (18), Deals (12), Reports (7)
**Notes:** `interactive` adds hover state and focus ring; use for clickable cards.

## DataTable

**Path:** `packages/ui/src/DataTable.tsx`
**Variants:** none
**Sizes:** none
**Props (key):** columns, data, sortable, selectable, onRowClick, density, emptyState
**Used in:** Deals (4), Reports (3), Activity (2)
**Notes:** Wrapper around TanStack Table. `density` accepts `comfortable` | `compact`. `emptyState` accepts a slot for the illustrated empty pattern; falls back to a generic message.
**Replaces:** legacy `<Table>` in `apps/web/src/components/_legacy/Table.tsx` — do not use the legacy.
```

---

## Lifecycle

- **Created** by `/wireframes` `#composition-context` (alongside DESIGN.md) on first run for an app.
- **Read** by `/wireframes` `#generate` (generator subagent prompt) on every run.
- **Updated** by `/verify`'s drift check when new components or variants land.
- **Hand-edited** freely by users — additions, notes, replacements. The drift check respects hand edits and only proposes additive changes.

---

## See also

- `design-md-spec.md` — DESIGN.md spec; cross-references here under `x-components-extended`.
- `design-md-resolver.md` — file-resolution walk (COMPONENTS.md is found in the same dir as DESIGN.md).
