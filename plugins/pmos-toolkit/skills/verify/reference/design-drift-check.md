# Design-System Drift Check (Phase 7a)

Detects drift between the current diff and the canonical `DESIGN.md` / `COMPONENTS.md` for the changed app, then offers per-item updates so the design-system files stay self-sufficient over time.

**Advisory, never blocking.** A failing drift check never fails `/verify`.

---

## Skip-fast guards

Run these checks first. Any one true → skip the entire phase silently.

| Guard | Skip condition |
|---|---|
| **No frontend changes** | `git diff --name-only main...HEAD` matches none of: `*.tsx`, `*.jsx`, `*.vue`, `*.svelte`, `*.css`, `tailwind.config.*`, `<theme>.json` |
| **No DESIGN.md** | Resolver returns `design_md_path: null`. Print one line: "No DESIGN.md found — run `/wireframes` to bootstrap." |
| **DESIGN.md discarded** | `x-source.applied == false`. User opted out; respect that. |
| **`--skip-design-drift` flag** | User passed it on the command line. |

---

## Step 1 — Locate files

Use `wireframes/reference/design-md-resolver.md` Step 1–3 to find:
- `design_md_path` and the merged DESIGN.md object (after `x-extends`).
- `components_md_path` and its content (may not exist; that's OK).

Also read the workstream's `## Wireframes & Design System` section if present, specifically `last_extraction_sha` — drift is computed from that SHA forward (not from `x-source.sha`) so successive `/verify` runs don't re-prompt about the same drift.

If `last_extraction_sha` is missing, fall back to `x-source.sha`.

---

## Step 2 — Detect drift

Run all three drift detectors in parallel. Each returns a list of items.

### 2a. Token drift

For each `extracted_from` path in `x-source` (and any newer file that matches the same patterns):
- `git diff <last_extraction_sha>...HEAD -- <path>`
- Parse the diff for added/changed token lines:
  - `tailwind.config.*` → look at `theme.extend.colors`, `borderRadius`, `fontFamily`, `spacing`, `fontSize`.
  - CSS files → look for `--<name>: <value>` additions/changes inside `:root` or `@theme`.
- For each candidate, compare against the merged DESIGN.md tokens.
- Classify:
  - **Additive** — token name doesn't exist in DESIGN.md.
  - **Modified** — token name exists, value differs.
  - **Removed** — token name exists in DESIGN.md but the source removed it.

### 2b. Component drift

Walk component dirs (per `wireframes/reference/components-md-spec.md` extractor procedure A.2 → A.5) and:
- For each component file changed in the diff: re-extract its name + variants + sizes + key props.
- Compare against COMPONENTS.md sections:
  - **New component** — section doesn't exist in COMPONENTS.md.
  - **New variant/size** — section exists, variant string isn't listed.
  - **Removed variant** — variant in COMPONENTS.md doesn't appear in source anymore.
  - **Modified props** — key props in source diverge from COMPONENTS.md (only flag if 3+ props changed; 1–2 are noise).

### 2c. Layout drift

If routes/pages are introspectable:
- Enumerate top-level routes/pages in the diff.
- For each new route added: compare its layout shell against `x-information-architecture.layouts` named entries.
- **New layout** — chrome shape doesn't match any existing template.

---

## Step 3 — High-volume escape hatch

If total drift count > 20:
- Skip per-item prompts.
- Single AskUserQuestion: "Large design-system drift detected (N tokens, M components, K layouts). Re-run `/wireframes` Phase 2a + 2.6 extractors instead of per-item prompts?"
- **Re-extract** → invoke the extractor inline (writes new DESIGN.md + COMPONENTS.md), bump `last_extraction_sha`, done.
- **Skip drift this run** → log items to `<dirname design_md_path>/.design-drift-deferred.md` for later review.
- **Per-item anyway** → fall through to Step 4 (warn that this will be a lot of prompts).

---

## Step 4 — Surface via AskUserQuestion

Batch up to 4 questions per call, sequential calls for more. **Cap total surfaced items at 16** — beyond that, the rest go to `.design-drift-deferred.md`.

Per item, options:

- **Apply to DESIGN.md/COMPONENTS.md** (default) — apply the proposed edit.
- **Modify** — open free-text follow-up: "What should the entry say instead?"
- **Skip (don't track)** — don't apply, don't ask again. Add the token/variant to a `<dirname design_md_path>/.design-drift-ignored.md` allowlist so future runs don't re-surface it.
- **Defer** — log to `.design-drift-deferred.md`, ask again next run.

Question text examples:

> "Token `colors.brandSecondary` (#7C3AED) added in `tailwind.config.ts`. Add to DESIGN.md `colors`?"

> "Component `<NotificationBadge>` is new in `src/components/NotificationBadge.tsx`. Add a section to COMPONENTS.md?"

> "Variant `\"link\"` added to `Button` (was: primary, secondary, ghost, destructive). Add to COMPONENTS.md and DESIGN.md `x-components-extended.button.variants`?"

Group by file in the batching: all DESIGN.md edits first, then COMPONENTS.md, then layouts. This keeps the user's mental context coherent.

---

## Step 5 — Apply approved changes

For each "Apply" / "Modify" disposition:

1. **DESIGN.md edits:**
   - Use `Edit` to insert/update the YAML token. Preserve formatting.
   - For new components landing in `x-components-extended`, append at end of that block.
2. **COMPONENTS.md edits:**
   - Append new component sections in the correct group + alphabetical order.
   - For new variants on existing components, edit the `**Variants:**` line.
3. **`x-source` bump:**
   - Update `x-source.sha` to current HEAD.
   - Update `x-source.extracted_at` to now (ISO).
   - Append the new file path(s) to `x-source.extracted_from` if they weren't there.
4. **Workstream bump:**
   - Update `last_extraction_sha` to current HEAD.

All edits are staged using `/verify`'s existing commit boundary (Phase 8). Don't make a separate commit.

---

## Step 6 — Report

Add a section to the `/verify` summary:

```markdown
### Design-System Sync

- DESIGN.md: 2 additions, 1 modification
- COMPONENTS.md: 1 new component (`NotificationBadge`), 1 new variant (`Button.link`)
- Deferred: 0
- Ignored: 0
```

Or, if no drift found:

```markdown
### Design-System Sync

Design-system files in sync (no drift detected since <SHA>).
```

---

## Edge cases

| Situation | Behavior |
|---|---|
| Greenfield-elicited DESIGN.md (no `extracted_from`) | Skip token drift detection (nothing to diff). Run component + layout drift only. |
| `x-extends` parent's source files changed | Detect drift against the parent file separately. Prompt user once: "Parent DESIGN.md is stale — update it now?" Yes → re-extract parent. |
| User added a NEW component dir not in `extracted_from` | Re-walk component dirs (don't trust `extracted_from` as exhaustive for components). |
| User edited DESIGN.md by hand between runs | Respect hand edits — diff is between source and current DESIGN.md, not against the previous DESIGN.md. |
| `.design-drift-ignored.md` lists an item | Skip surfacing it. The user explicitly opted out. |
| Cannot resolve a component's category | Categorize as "domain"; flag in the prompt so the user can correct placement. |

---

## Failure modes

- `git diff` fails → skip the phase, log warning. Don't fail `/verify`.
- DESIGN.md write fails → emit error, log unwritten changes to `.design-drift-deferred.md`, continue.
- Component dir walk crashes → fall back to "no component drift detected". Log warning.

---

## What this phase does NOT do

- **Does not generate wireframes** — that's `/wireframes`.
- **Does not regenerate `design-overlay.css`** — next `/wireframes` run does that.
- **Does not auto-create DESIGN.md or COMPONENTS.md** if missing — that's `/wireframes` job. This phase only updates files that already exist.
- **Does not modify the workstream `## Constraints & Scars`** — that needs human judgment. Surface it as a "consider adding to scars" note in the report instead.
- **Does not block `/verify`** — drift is advisory.

---

## See also

- `wireframes/reference/design-md-spec.md`
- `wireframes/reference/design-md-resolver.md`
- `wireframes/reference/components-md-spec.md`
