# DESIGN.md Specification (pmos-toolkit dialect)

## Contents

- [File shape](#file-shape)
- [Base fields (Google Labs alpha)](#base-fields-google-labs-alpha)
- [Canonical section order (markdown body)](#canonical-section-order-markdown-body)
- [pmos-toolkit `x-*` extensions](#pmos-toolkit-x-extensions)

`DESIGN.md` is a single-file, human-and-machine-readable description of an app's visual identity. It is the canonical brand contract used by `/wireframes`, `/prototype`, and `/verify`.

This document defines the **pmos-toolkit dialect** of DESIGN.md: the base spec from Google Labs (open-sourced April 2026, Apache 2.0, upstream at <https://github.com/google-labs-code/design.md>) **plus** namespaced `x-*` extensions that the pmos-toolkit pipeline relies on.

A pmos-toolkit DESIGN.md is a **strict superset** of the Google Labs alpha. Files we produce remain valid DESIGN.md for any other tool that consumes the base spec — extra `x-*` fields are simply ignored by tools that don't recognize them.

---

## File shape

A DESIGN.md file has two layers:

1. **YAML front matter** between `---` delimiters — normative, machine-readable tokens.
2. **Markdown body** — human/agent-readable rationale, in a fixed canonical section order.

```markdown
---
name: AcmeApp
version: alpha
description: Internal CRM for Acme's enterprise sales team.
colors:
  primary: "#2563EB"
  ...
---

# AcmeApp Design System

## Overview
...

## Colors
...
```

Tokens are normative. Prose is rationale. When they conflict, tokens win.

---

## Base fields (Google Labs alpha)

### Required

| Field    | Type   | Notes |
|----------|--------|-------|
| `name`   | string | Design system identifier. Free-form. |
| `colors` | object | Color tokens; values are hex sRGB strings (e.g. `"#1A1C1E"`). |

### Optional

| Field         | Type   | Notes |
|---------------|--------|-------|
| `version`     | string | Spec version we're targeting. Use `"alpha"` while Google's spec is alpha. |
| `description` | string | One-line summary of the design system. |
| `typography`  | object | Named type styles. Each entry: `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`. |
| `rounded`     | object | Border-radius scale (e.g. `sm`, `md`, `lg`, `full`). |
| `spacing`     | object | Spacing scale (e.g. `xs`, `sm`, `md`, `lg`, `xl`). |
| `components`  | object | Per-component token bindings. Keys are component slugs (e.g. `button-primary`, `button-primary-hover`). Values may use `backgroundColor`, `textColor`, `typography`, `rounded`, `padding`, `size`, `height`, `width`. |

### Token reference syntax

Use `{path.to.token}` curly-brace references inside YAML strings to point at other tokens:

```yaml
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.onPrimary}"
    rounded: "{rounded.md}"
```

References resolve at consumption time. Cycles are an error.

### Color values

- Hex sRGB only (`"#RRGGBB"` or `"#RRGGBBAA"`). No `rgb()`, no named colors, no CSS color-mix.
- Validate **WCAG AA contrast ≥ 4.5:1** for any text-on-surface pair declared in `components`. WCAG AAA (≥ 7:1) is recommended for primary body text.

### Dimension values

- Use `<number>px` or `<number>rem` strings (e.g. `"16px"`, `"1rem"`).
- Numeric-only values are interpreted as px.

---

## Canonical section order (markdown body)

Sections appear in this order. Each section is `## <Title>`. Skip sections that don't apply, but do not reorder.

1. **Overview** — What this design system is, who uses it, the one-sentence aesthetic intent.
2. **Colors** — Palette rationale, color-mode story (light/dark), accessibility notes.
3. **Typography** — Type stack rationale, hierarchy logic, voice in type.
4. **Layout** — Grid system, spacing rhythm, breakpoint philosophy.
5. **Elevation & Depth** — Shadow scale, layering model. Skip if the system is flat.
6. **Shapes** — Border-radius rationale, signature shape decisions.
7. **Components** — One subsection per primitive (Button, Input, Card, Modal, …) with usage notes.
8. **Do's and Don'ts** — Hard rules the system enforces.

The pmos dialect adds one optional appended section:

9. **Anti-patterns** — Repo-specific anti-patterns with the *why* (often referencing past incidents). Stronger than "Don'ts" — these are scars.

---

## pmos-toolkit `x-*` extensions

All `x-*` fields are non-normative under the Google Labs base spec. Other tools ignore them. The pmos pipeline consumes them.

### `x-source` — provenance

Where this DESIGN.md was extracted from. Required when extraction was automated; omitted for fully hand-written files.

```yaml
x-source:
  source: "auto-extraction" | "interactive-elicitation" | "hand-written"
  extracted_from:
    - "tailwind.config.ts"
    - "src/styles/globals.css"
    - "packages/ui/src/tokens.css"
  sha: "4af3e8392b1a..."          # commit at extraction time
  extracted_at: "2026-05-02T14:30:00Z"
  extractor_version: "1"          # bump if extractor logic changes shape
  applied: true                   # false when user discarded the result
```

`/verify`'s drift check reads `extracted_from` + `sha` to compute drift against current HEAD.

### `x-extends` — inheritance

Relative path to a parent DESIGN.md. The child's tokens are deep-merged onto the parent's; the child overrides at the leaf.

```yaml
x-extends: "../../packages/ui/DESIGN.md"
```

Cascade rules:
- Parent loaded first, child applied on top.
- Deep-merge (objects merge key-by-key); leaf values replace.
- Cycles error loudly. Missing parent → fall back to child-only with a logged warning.
- `x-source` is **not** inherited; each file owns its own provenance.

### `x-version` — extension version

Integer. Bump when the shape of any `x-*` field changes incompatibly. Lets future `/wireframes` versions detect old files and migrate.

```yaml
x-version: 1
```

### `x-interaction` — behavioral patterns

Patterns the visual spec doesn't cover. All fields optional.

```yaml
x-interaction:
  modals:
    style: "centered" | "drawer-right" | "drawer-bottom" | "fullscreen"
    dismiss: "backdrop-click" | "explicit-button" | "esc-key"
    nested: "discouraged" | "allowed"
  toasts:
    position: "top-right" | "bottom-center" | "top-center"
    autoDismissMs: 5000
  destructiveActions:
    confirmation: "always" | "double-click" | "type-to-confirm"
  defaultStates:
    empty: "illustrated"      # illustrated | minimal | none
    loading: "skeleton"       # skeleton | spinner | progress
    error: "inline-banner"    # inline-banner | full-page | toast
  focus:
    visibleStyle: "outline-2 outline-offset-2 outline-primary"
    trapInModals: true
  shortcuts:
    cmdK: "global-search"
    escape: "close-topmost-overlay"
```

### `x-information-architecture` — IA + layout templates

Nav model, breakpoints, page templates.

```yaml
x-information-architecture:
  navModel: "left-rail" | "top-bar" | "top-bar+left-rail" | "bottom-tabs"
  breakpoints:
    sm: "640px"
    md: "768px"
    lg: "1024px"
    xl: "1280px"
  responsiveBehavior:
    sm: "single-column, drawer nav"
    md: "two-column, collapsed left rail"
    lg: "full layout"
  pageHeader:
    anatomy: "title, subtitle, primary-action-right, breadcrumbs-above"
  breadcrumbs:
    style: "slash-separated"
    rootAlwaysVisible: true
  layouts:
    left-rail-dashboard:
      slots: ["nav", "header", "main", "right-rail?"]
      skeleton: |
        <div class="grid grid-cols-[240px_1fr]">
          <aside>{nav}</aside>
          <main><header>{header}</header>{main}</main>
        </div>
    two-pane-detail:
      slots: ["list", "detail"]
      skeleton: |
        <div class="grid grid-cols-[360px_1fr]">…</div>
    single-column-form:
      slots: ["header", "form", "footer-actions"]
      skeleton: |
        <main class="max-w-2xl mx-auto">…</main>
```

`layouts` entries are referenced by name from Phase 2b of `/wireframes` (the layout anchor).

### `x-content` — voice, tone, conventions

```yaml
x-content:
  voice: "direct, calm, second-person"
  tone:
    success: "warm, brief"
    error: "blameless, actionable"
  buttonVerbs:
    save: "Save"            # not "Submit", not "Update"
    create: "Create"        # not "Add", not "New"
    delete: "Delete"        # confirm copy: "Permanently delete <thing>?"
  emptyState:
    pattern: "icon + one-line explainer + primary CTA"
  formats:
    date: "MMM D, YYYY"     # "May 2, 2026"
    dateShort: "M/D/YY"
    currency: "USD"
    numberThousands: ","
```

### `x-components-extended` — components the base spec underweights

Mirror of the rich entries that live in `COMPONENTS.md`. Token-level summary only (names + variants); the prose lives in COMPONENTS.md.

```yaml
x-components-extended:
  table:
    density: "compact" | "comfortable" | "spacious"
    sortable: true
    stickyHeader: true
    rowHover: true
    selection: "checkbox"   # checkbox | row-click | none
  form:
    labelPosition: "top" | "left"
    requiredIndicator: "asterisk"
    validationTiming: "onBlur" | "onSubmit" | "onChange"
  dataViz:
    palette: ["#2563EB", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"]
    rules:
      - "Use the palette in declared order; do not swap for aesthetic preference."
      - "Color-blind safe: rely on shape + label, not color alone."
```

---

## Validation rules

A DESIGN.md is **valid** if all of the following hold:

1. Front matter parses as YAML. `name` and `colors` exist.
2. All hex color strings match `^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$`.
3. All `{path}` references resolve to a defined token (or to a defined parent token via `x-extends`).
4. Every `components.<key>.backgroundColor` paired with a `textColor` passes WCAG AA (≥ 4.5:1) contrast. Failures are warnings, not hard errors — flag them in the `## Do's and Don'ts` section.
5. Canonical sections, when present, appear in canonical order.
6. `x-extends` does not form a cycle, and the parent file exists.

Validation is best-effort by the consuming skill — there is no separate validator binary.

---

## Worked example

```markdown
---
name: AcmeCRM
version: alpha
description: Acme's internal CRM for enterprise sales reps.
x-version: 1
x-source:
  source: "auto-extraction"
  extracted_from:
    - "apps/web/tailwind.config.ts"
    - "apps/web/src/styles/globals.css"
  sha: "4af3e8392b1a"
  extracted_at: "2026-05-02T14:30:00Z"
  extractor_version: "1"
  applied: true
colors:
  primary: "#2563EB"
  primaryHover: "#1D4ED8"
  onPrimary: "#FFFFFF"
  background: "#FFFFFF"
  surface: "#F8FAFC"
  border: "#E2E8F0"
  text: "#0F172A"
  textMuted: "#64748B"
  destructive: "#DC2626"
  success: "#16A34A"
typography:
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  heading-lg:
    fontFamily: "{typography.body.fontFamily}"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: "32px"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.onPrimary}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primaryHover}"
    textColor: "{colors.onPrimary}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
x-interaction:
  modals:
    style: "centered"
    dismiss: "explicit-button"
  destructiveActions:
    confirmation: "type-to-confirm"
  defaultStates:
    empty: "illustrated"
    loading: "skeleton"
    error: "inline-banner"
x-information-architecture:
  navModel: "left-rail"
  breakpoints:
    sm: "640px"
    md: "768px"
    lg: "1024px"
  layouts:
    left-rail-dashboard:
      slots: ["nav", "header", "main"]
    two-pane-detail:
      slots: ["list", "detail"]
x-content:
  voice: "direct, calm, second-person"
  buttonVerbs:
    save: "Save"
    create: "Create"
    delete: "Delete"
  formats:
    date: "MMM D, YYYY"
    currency: "USD"
x-components-extended:
  table:
    density: "comfortable"
    sortable: true
    stickyHeader: true
    selection: "checkbox"
  form:
    labelPosition: "top"
    requiredIndicator: "asterisk"
    validationTiming: "onBlur"
---

# AcmeCRM Design System

## Overview

AcmeCRM is the internal sales tool used daily by ~400 enterprise reps. The design system optimizes for **dense data scanning** and **fast keyboard-driven workflows** over visual flourish. Aesthetic intent: *quiet, precise, trustworthy.*

## Colors

Single accent (`primary`) on a near-white surface. `destructive` and `success` are reserved for state — never decoration. Dark mode is on the roadmap but not in this version; light tokens are canonical.

## Typography

Inter at 14px body. Headings stay in the same family — hierarchy comes from weight and size, not face. Avoid script or display fonts entirely.

## Layout

12-column grid at `lg`+, single column at `sm`. Generous use of `spacing.md` (16px) as the default rhythm. Page header anatomy: title left, primary action right, breadcrumbs above the title.

## Components

### Button

Three variants only: `primary`, `secondary`, `ghost`. Destructive actions use `primary` colors with `destructive` background — never an additional variant.

### Table

Comfortable density, sticky header, sortable columns. Row click opens detail; checkboxes for multi-select. Empty state uses the illustrated pattern (icon + one-line + primary CTA).

## Do's and Don'ts

**Do:**
- Use `colors.primary` for the single primary action per screen.
- Use `colors.textMuted` for secondary metadata, never for body copy.
- Validate destructive copy against `x-content.buttonVerbs`.

**Don't:**
- Don't introduce a third grayscale variable. Use `text`, `textMuted`, `border`.
- Don't use shadows for emphasis. The system is flat by intent.
- Don't bypass the layout templates in `x-information-architecture.layouts`.

## Anti-patterns

- **Two primary actions per screen.** We tried a "Save and continue" + "Save" pair on the deal-detail screen in 2025; users clicked the wrong one 22% of the time. One primary, one secondary.
- **Color-only status.** A 2024 release used green/red dots without labels for deal health; failed accessibility review and shipped a fix two weeks later. Always pair color with shape or text.
```

---

## Versioning policy

- `version: alpha` while Google Labs spec is alpha. Bump in lock-step with upstream major changes.
- `x-version: 1` for our extensions. Bump only when an `x-*` field changes shape incompatibly.
- The extractor records `extractor_version` so the drift check can detect "extracted by an old extractor" and offer re-extraction.

---

## See also

- `design-md-resolver.md` — how `/wireframes` finds and loads a DESIGN.md (with `x-extends` cascade).
- `design-md-extractor.md` — how `/wireframes` produces a DESIGN.md from a host frontend (or interactive elicitation for greenfield).
- `design-md-to-css.md` — how the merged DESIGN.md becomes `design-overlay.css` for the wireframe runtime.
- `components-md-spec.md` — the COMPONENTS.md sidecar that complements DESIGN.md.
- Upstream: <https://github.com/google-labs-code/design.md>
