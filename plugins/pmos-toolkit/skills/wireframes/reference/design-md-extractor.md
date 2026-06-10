# DESIGN.md Extractor

Produces a `DESIGN.md` (and optionally `COMPONENTS.md`) for a given app. Two paths: **auto-extraction** from an existing frontend, and **interactive elicitation** for greenfield repos.

This document supersedes most of `style-extraction.md`. The legacy doc still exists as a thin pointer for backward compatibility with prior plans.

---

## Inputs

- `app_dir` — chosen via `design-md-resolver.md` Step 1.
- `design_md_path` — target write path (chosen by caller, see "Write location" below).
- Optional `shared_base_path` — a `packages/ui/DESIGN.md` to declare as `x-extends`.
- Subagent budget if available; else inline.

## Output

- `DESIGN.md` written to `design_md_path` (valid per `design-md-spec.md`).
- `COMPONENTS.md` written to the same directory (per `components-md-spec.md`).
- Caller receives the resolved paths + the `x-source.sha` recorded.

---

## Branch A — Auto-extraction

Triggered when `app_dir` contains a frontend signal (per `design-md-resolver.md` Step 1b).

### A.1. Read budget

Cap at ~25 files / 40 KB total. Larger codebases get summary-only treatment for tail components.

### A.2. Source files (priority order)

1. `tailwind.config.{js,ts,cjs,mjs}` → `theme.extend.colors`, `theme.extend.borderRadius`, `theme.extend.fontFamily`, `theme.extend.spacing`, `theme.extend.fontSize`.
2. `package.json` → component library + icon library detection (see A.5).
3. Top-level CSS:
   - `src/styles/globals.css`, `app/globals.css`, `styles/globals.css`, `index.css`, `app.css`
   - Extract `:root { --* }` blocks. For Tailwind v4: `@theme { … }`.
   - When light + dark blocks coexist, prefer light for canonical tokens; record dark in `x-content.notes` (or skip if not needed for v1).
4. 3 representative component/page files — largest by size in `src/components/`, `app/`, `pages/`. Skim for: button shape (`rounded-md` / `rounded-full`), card style (border + shadow vs flat), nav layout.
5. `tsconfig.json` / `vite.config.*` / `next.config.*` only if needed to resolve aliases.

### A.3. Color extraction

Build the `colors:` block from these sources, in priority:

1. CSS custom properties named `--primary`, `--background`, `--foreground`, `--muted`, `--border`, `--destructive`, `--accent`, `--ring`, `--card`, `--popover`. Resolve `hsl(var(--…))` references when needed.
2. Tailwind theme `colors.primary`, `colors.background`, etc.
3. shadcn/ui token names (`primary`, `primary-foreground`, `secondary`, …) if detected.

Emit hex sRGB. Convert HSL/RGB if the source uses them. If the source declares a value as `0 0% 100%` (Tailwind HSL convention), interpret per shadcn rules.

Always include at minimum: `primary`, `background`, `text`, `textMuted`, `border`. Add others when confidently identified.

**Confidence rule:** if `primary` cannot be confidently identified (no `primary` / `accent` / `brand` / `--p-` named token), leave it null and emit a warning. Better default than wrong color.

### A.4. Typography extraction

From `tailwind.config.fontFamily` and CSS `font-family` declarations on `body` / `:root`. Build at least a `body` entry; add `heading-lg`, `heading-md` if the source declares them.

### A.5. Component library detection

| Signal | Library |
|---|---|
| `@radix-ui/*` + `class-variance-authority` + `tailwind-merge` | shadcn/ui |
| `@mui/material` | MUI |
| `@chakra-ui/react` | Chakra |
| `@mantine/core` | Mantine |
| `@headlessui/react` (alone) | Headless UI |
| None | "custom" |

Icon library: `lucide-react`, `@heroicons/react`, `react-icons`, `@phosphor-icons/react`.

Record in `x-source.notes` (a free-form notes array) — not in the base spec.

### A.6. Component patterns

From the 3 representative files:
- Button shape: smallest `rounded-*` used on actions.
- Card style: presence of `shadow-*` + `border` + `bg-card`.
- Nav layout: top vs side, sticky vs not.

Encode as DESIGN.md `## Components` prose entries (1–2 lines each).

### A.7. Layout templates

If routes/pages can be enumerated (Next.js `app/` or `pages/`, React Router config, file-based router):
- For each top-level route, infer the chrome shape from the layout file.
- Emit named templates under `x-information-architecture.layouts` (e.g. `left-rail-dashboard`, `single-column-form`).
- Cap at 5 templates. More gets noisy.

If routes can't be enumerated, skip — a single layout entry is fine. The `#composition-context` layout-anchor question handles selection.

### A.8. Build the DESIGN.md

Assemble the YAML front matter per `design-md-spec.md` schema:

- `name` — derive from `package.json#name` or app dir name.
- `version: alpha`.
- `description` — derive from `package.json#description` if present.
- `x-version: 1`.
- `x-source` — populate fully:
  ```yaml
  x-source:
    source: "auto-extraction"
    extracted_from: [<list of paths actually read>]
    sha: <git rev-parse HEAD>
    extracted_at: <now ISO>
    extractor_version: "1"
    applied: true
  ```
- `colors`, `typography`, `rounded`, `spacing`, `components` (only entries with confident values).
- `x-information-architecture` (at minimum `breakpoints` + `navModel`).
- `x-content` (formats only — voice/tone needs human input).

Write the markdown body with at least the `## Overview`, `## Colors`, `## Typography` sections populated from extraction. Other sections get `_To be filled in._` placeholders.

### A.9. If a shared base exists

If the resolver identified a `shared_base_path` AND the caller chose "shared" placement:
- Set `x-extends: <relative path to base>` in the front matter.
- Strip from the child any tokens that exactly match the parent (the cascade fills them).
- Keep child overrides explicit.

---

## Branch B — Interactive elicitation (greenfield)

Triggered when no frontend signal exists in `app_dir`.

### B.1. Ask 4 questions via AskUserQuestion (one batch)

```
Q1 — Brand color (single-select with previews):
  - Calm blue (#2563EB)
  - Vibrant green (#16A34A)
  - Warm orange (#EA580C)
  - Deep purple (#7C3AED)
  - Neutral / decide later (#0F172A)

Q2 — Type stack:
  - Modern sans (Inter)
  - Friendly sans (Manrope)
  - System (-apple-system, ...)
  - Serif accent (Source Sans + Source Serif headings)

Q3 — Density:
  - Tight (compact tables, dense data)
  - Comfortable (default; balanced)
  - Spacious (generous whitespace, marketing feel)

Q4 — Aesthetic intent (one-sentence free text via "Other"):
  - Quiet, precise, trustworthy
  - Bold, energetic, modern
  - Warm, approachable, human
```

Platform fallback (no AskUserQuestion): assume "Calm blue" + "Modern sans (Inter)" + "Comfortable" + "Quiet, precise, trustworthy". Announce.

### B.2. Synthesize tokens

From the 4 answers, derive a minimal palette + type + spacing scale:

- Primary = chosen brand color. Generate `primaryHover` (-10% lightness) and `onPrimary` (white or near-black per contrast).
- Neutrals: a fixed set (`#0F172A`, `#64748B`, `#E2E8F0`, `#F8FAFC`, `#FFFFFF`).
- Status: `destructive: "#DC2626"`, `success: "#16A34A"`.
- Spacing: density `tight = 4/8/12/16/24`, `comfortable = 4/8/16/24/32`, `spacious = 8/16/24/40/64`.
- `rounded`: `sm: 4px, md: 8px, lg: 12px, full: 9999px` (modify only if the user later edits).

### B.3. Write the file

Same shape as Branch A, with:
- `x-source.source: "interactive-elicitation"`.
- `x-source.extracted_from: []`.
- `x-source.sha: <current HEAD>` (lets `/verify` know the file's baseline commit even though no extraction happened).
- `x-source.applied: true`.

In the markdown body, the `## Overview` section opens with a TODO checklist:

```markdown
## Overview

> **Aesthetic intent:** {user's one-sentence answer}.

> _This DESIGN.md was elicited interactively (no frontend to extract from).
> Please refine over time:_
> - [ ] Fill in `## Colors` rationale
> - [ ] Add at least 3 entries to `## Components`
> - [ ] Capture voice/tone in `x-content` once decisions are made
> - [ ] Add `## Anti-patterns` as you accumulate scars
```

### B.4. Skip COMPONENTS.md

Greenfield has no components to extract. Write a stub COMPONENTS.md with just the header block and a `_No components yet._` line. The drift check will populate it as components land.

---

## Write location

Caller decides; the extractor writes wherever told. Common cases:

| Repo shape | Default write target |
|---|---|
| Single app, repo root has frontend | `<repo-root>/DESIGN.md` |
| Single app under `apps/web/` | `apps/web/DESIGN.md` |
| Monorepo, multiple apps, no shared base | `<app_dir>/DESIGN.md` per app |
| Monorepo, multiple apps, shared `packages/ui/` | Ask: shared (`packages/ui/DESIGN.md`) vs app-specific (`<app_dir>/DESIGN.md`). Recommend shared for first run. |

When writing app-specific in a monorepo with a shared base, set `x-extends` to the shared base path.

---

## Confirmation gate (caller's responsibility)

After write, the caller (`/wireframes` `#resolve-design-md`) shows the result via AskUserQuestion:

- **Use as extracted** → proceed to `#composition-context`.
- **Edit before applying** → print absolute path, wait for user to edit and signal done, re-read.
- **Discard for this run** → set `x-source.applied: false` in the file (keep for audit), proceed with default style for this run only. Future runs respect `applied: false` and skip the file (resolver treats it as not found).

---

## Failure modes

| Failure | Behavior |
|---|---|
| `tailwind.config` exists but won't parse | Skip Tailwind tokens; fall back to CSS-only extraction. Note in `x-source.notes`. |
| CSS files exist but no `:root` block | Use Tailwind-only path. |
| Token detected but value is non-hex (e.g. `currentColor`) | Skip that token; don't emit. |
| Multiple `:root` blocks disagree | Prefer largest file. Note "Multiple :root blocks; chose <path>" in `x-source.notes`. |
| HSL/RGB conversion fails | Leave that token unset; emit warning. |
| Greenfield + no AskUserQuestion + no defaults configured | Use the announced default set (Calm blue + Inter + Comfortable). |

The extractor never blocks on a non-fatal failure — partial DESIGN.md beats no DESIGN.md.

---

## Subagent dispatch (if available)

When subagents are available, dispatch one with read-only access. Prompt skeleton:

```
You are extracting a DESIGN.md for app at <app_dir>.

Read these files (in priority order, cap 25 files / 40 KB):
1. <list>

Produce a DESIGN.md per the spec at reference/design-md-spec.md.
Use the following x-source block verbatim: <pre-filled by caller>.
Return the full file content; do not write to disk yourself (caller writes).
```

Then the caller writes the returned content to `design_md_path`.

---

## See also

- `design-md-spec.md` — the schema this extractor produces.
- `design-md-resolver.md` — how `app_dir` was chosen.
- `components-md-spec.md` — the COMPONENTS.md sidecar this extractor also produces.
- `style-extraction.md` — legacy doc; superseded by this file.
