# DESIGN.md → `design-tokens.js`

Converts a merged DESIGN.md (after `x-extends` cascade) into a JS-shaped tokens file the prototype's JSX can import for inline styles, conditional logic, chart palettes, and any value not naturally expressed as a CSS variable.

This is the JS counterpart of `wireframes/reference/design-md-to-css.md`. Both run in `/prototype` Phase 1a.

---

## Inputs

- The merged DESIGN.md object from `wireframes/reference/design-md-resolver.md`.
- Output path: `{feature_folder}/prototype/assets/design-tokens.js`.

## Output

A single JS file that exposes a frozen tokens object on the global window. Loaded **before** `runtime.js` and `components.js` so all prototype code can read tokens via `window.__designTokens`.

---

## Output shape

```js
// Generated from DESIGN.md (apps/web/DESIGN.md @ 4af3e83). Do not edit by hand.
window.__designTokens = Object.freeze({
  name: "AcmeCRM",
  colors: {
    primary: "#2563EB",
    primaryHover: "#1D4ED8",
    background: "#FFFFFF",
    surface: "#F8FAFC",
    text: "#0F172A",
    textMuted: "#64748B",
    border: "#E2E8F0",
    destructive: "#DC2626",
    success: "#16A34A"
  },
  typography: {
    body: { fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", fontSize: "14px", fontWeight: 400, lineHeight: "20px" },
    "heading-lg": { fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", fontSize: "24px", fontWeight: 600, lineHeight: "32px" }
  },
  rounded: { sm: "4px", md: "8px", lg: "12px", full: "9999px" },
  spacing: { xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "32px" },
  components: {
    "button-primary": { backgroundColor: "#2563EB", textColor: "#FFFFFF", rounded: "8px", padding: "8px 16px" }
  },
  interaction: {
    modals: { style: "centered", dismiss: "explicit-button" },
    destructiveActions: { confirmation: "type-to-confirm" },
    defaultStates: { empty: "illustrated", loading: "skeleton", error: "inline-banner" },
    focus: { trapInModals: true, visibleStyle: "outline-2 outline-offset-2 outline-primary" },
    shortcuts: { cmdK: "global-search", escape: "close-topmost-overlay" }
  },
  informationArchitecture: {
    navModel: "left-rail",
    breakpoints: { sm: "640px", md: "768px", lg: "1024px" },
    layouts: {
      "left-rail-dashboard": { slots: ["nav", "header", "main"] },
      "two-pane-detail": { slots: ["list", "detail"] }
    }
  },
  content: {
    voice: "direct, calm, second-person",
    buttonVerbs: { save: "Save", create: "Create", delete: "Delete" },
    formats: { date: "MMM D, YYYY", currency: "USD" }
  },
  componentsExtended: {
    table: { density: "comfortable", sortable: true, stickyHeader: true, selection: "checkbox" },
    form: { labelPosition: "top", requiredIndicator: "asterisk", validationTiming: "onBlur" },
    dataViz: { palette: ["#2563EB", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"], rules: [] }
  }
});
```

---

## Field mapping

JS keys are camelCase versions of the DESIGN.md YAML keys, with `x-` prefixes stripped:

| DESIGN.md path | JS path on `window.__designTokens` |
|---|---|
| `name` | `name` |
| `colors.*` | `colors.*` (verbatim) |
| `typography.*` | `typography.*` (keys preserved, including hyphenated like `heading-lg` → quoted) |
| `rounded.*` | `rounded.*` |
| `spacing.*` | `spacing.*` |
| `components.*` | `components.*` (verbatim, hyphenated keys quoted) |
| `x-interaction` | `interaction` |
| `x-information-architecture` | `informationArchitecture` |
| `x-content` | `content` |
| `x-components-extended` | `componentsExtended` |

**Omitted from JS output:**
- `x-source` — provenance lives on DESIGN.md itself; not useful at runtime.
- `x-extends` — already resolved into the merged object before this generator runs.
- `x-version` — runtime doesn't branch on it.
- `description`, `version` (the spec version) — ditto.
- The markdown body — rationale, not data.

---

## Reference resolution

DESIGN.md tokens may use `{path.to.token}` references. Resolve them **before** emitting JS so consumers see literal values.

1. Build a flat lookup table from the merged YAML object.
2. For each value, recursively expand `{…}` references.
3. Cycles → emit warning comment in the file, leave value as the literal `{…}` string. Don't crash.
4. Missing references → same.

---

## Generation procedure

1. Build the flat lookup table.
2. Resolve all `{…}` references.
3. Construct the JS object by walking the merged DESIGN.md per the field mapping above.
4. Serialize via `JSON.stringify(obj, null, 2)` then strip the surrounding quotes from object keys where they're safe identifiers (cosmetic — not required for correctness).
5. Wrap in `Object.freeze(...)` and assign to `window.__designTokens`.
6. Prepend a one-line provenance comment: `// Generated from DESIGN.md (<path> @ <sha>). Do not edit by hand.`

---

## Idempotency

Always overwrite. Same merged DESIGN.md, same output. Each `/prototype` run regenerates `design-tokens.js` from scratch — never patched, never reused across runs.

---

## Why `Object.freeze`

Prevents accidental mutation of tokens during prototype interaction (a Modal that mutates `window.__designTokens.colors.primary` to "fix" a bug should fail loudly, not silently). One extra line, no runtime cost worth caring about. Keep it.

---

## Why `window.__designTokens`

Consistent with the prototype's existing global-shape (`window.__protoComponents`, `window.__screens`). The leading double-underscore signals "infrastructure, don't import in app logic" — though prototype code is small enough that everything imports everything.

---

## Failure modes

| Failure | Behavior |
|---|---|
| `colors` missing or empty | Emit a header-only file with a warning comment + `window.__designTokens = Object.freeze({});`. Consumers should null-check (Phase 4c generator instructed accordingly). |
| Reference cycle / missing reference | Comment in file, value left as `{…}` literal. |
| Output path unwritable | Hard error — tell user, abort phase. |
| Hyphenated key in `colors` (rare) | Quote it: `"primary-foreground": "#…"`. |

---

## Drift check exclusion

`design-tokens.js` is fully derived from DESIGN.md and always regenerated by `/prototype`. The `/verify` Phase 7a drift check **does not** track it — there's nothing to drift against. Drift on the source DESIGN.md propagates to the JS file on the next `/prototype` run.

---

## See also

- `design-artifact-resolver.md` — the prototype-side resolver that calls this generator.
- `wireframes/reference/design-md-to-css.md` — the CSS counterpart.
- `wireframes/reference/design-md-spec.md` — token paths referenced above.
