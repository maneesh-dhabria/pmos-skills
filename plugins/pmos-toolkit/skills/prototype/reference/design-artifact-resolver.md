# Prototype Design-Artifact Resolver

How `/prototype`'s `#design-context` phase finds DESIGN.md, COMPONENTS.md, and produces both the CSS overlay and the JS tokens file the prototype runtime needs.

This doc composes existing infrastructure — the heavy lifting lives in `wireframes/reference/design-md-resolver.md` and the two generators. This doc adds the prototype-specific glue: abort-when-missing, overlay reuse from wireframes folder, JS tokens generation.

---

## Inputs

- `{feature_folder}` — resolved by the `/prototype` skill in `#pipeline-setup`.
- Workstream context (if loaded).
- Subagent budget if available; else inline.

## Outputs

Six in-memory / on-disk artifacts:

| Artifact | Where | Notes |
|---|---|---|
| `merged_design_md` | in-memory | Object after `x-extends` cascade. Passed to `#shared-runtime`, `#generate-devices`, `#review`. |
| `components_inventory` | in-memory | COMPONENTS.md content (or empty if absent). |
| `layout_anchor` | in-memory | Chosen named layout from `x-information-architecture.layouts` (or null). |
| `decision_context` | in-memory | Concatenated workstream scars + DESIGN.md anti-patterns + Do's and Don'ts. |
| `design-overlay.css` | `{feature_folder}/prototype/assets/` | Reused from wireframes if fresh; regenerated otherwise. |
| `design-tokens.js` | `{feature_folder}/prototype/assets/` | Always regenerated. |

---

## Step 1 — Resolve DESIGN.md

Call `wireframes/reference/design-md-resolver.md` Steps 1–4 (target app, file walk, `x-extends` cascade, staleness check).

### Hard rule: abort when missing

If the resolver returns `design_md_path: null`, **abort `/prototype`** with this message:

> "DESIGN.md not found for the target app. `/prototype` requires a DESIGN.md to generate consistent visual identity and interaction patterns.
>
> Run `/wireframes` first to bootstrap DESIGN.md (it will guide you through extraction or interactive elicitation), then re-run `/prototype`."

Do NOT auto-bootstrap. That responsibility lives in `/wireframes` exclusively to keep first-run experience predictable and avoid duplicate prompts.

### If DESIGN.md is found but stale

Surface via AskUserQuestion: **Re-extract via /wireframes** / **Use as-is** / **Abort**.

- "Re-extract via /wireframes" → tell the user to run `/wireframes` (which handles re-extraction); abort `/prototype` cleanly.
- "Use as-is" → proceed with the stale file. Note in the prototype's index.html footer: "DESIGN.md is N commits stale; regenerate via /wireframes when convenient."
- "Abort" → exit cleanly.

---

## Step 2 — Resolve `design-overlay.css`

Two paths.

### 2a. Reuse from wireframes folder

If `{feature_folder}/wireframes/assets/design-overlay.css` exists:

1. Read its mtime and the DESIGN.md mtime.
2. **If overlay is newer than or equal to DESIGN.md** → copy to `{feature_folder}/prototype/assets/design-overlay.css`. Done.
3. **If DESIGN.md is newer** → the wireframes overlay is stale. Fall through to 2b (regenerate).

### 2b. Regenerate from DESIGN.md

Follow `wireframes/reference/design-md-to-css.md` end-to-end. Write directly to `{feature_folder}/prototype/assets/design-overlay.css`.

This branch fires when:
- Wireframes folder doesn't exist (prototype run standalone).
- Wireframes folder exists but no `design-overlay.css` in it.
- DESIGN.md has been updated since the wireframes overlay was last written.

---

## Step 3 — Generate `design-tokens.js`

Always regenerate via `reference/design-md-to-tokens-js.md`. Write to `{feature_folder}/prototype/assets/design-tokens.js`.

JS tokens are cheap to produce and consistency wins over reuse. Never reused from wireframes (wireframes don't produce a JS tokens file).

---

## Step 4 — Load COMPONENTS.md

Look for `<dirname design_md_path>/COMPONENTS.md`.

- **Found** → load. Pass content to the `#shared-runtime` components.js generator as `components_inventory`.
- **Missing** → set `components_inventory = null` and emit a warning: "COMPONENTS.md not found at <path>. Prototype generators will infer component variants without inventory grounding. Run `/verify` after the next implementation pass to populate it via the drift check."
- Do NOT extract from `/prototype`. That's `/verify`'s job. Keeping prototype lightweight.

---

## Step 5 — Pick layout anchor

If `merged_design_md.x-information-architecture.layouts` has entries:

1. Check for `{feature_folder}/wireframes/.layout-anchor` marker file (a small text file containing the layout name chosen by `/wireframes`' `#composition-context` phase).
2. **If marker exists and the named layout still exists in DESIGN.md** → reuse silently. Announce: "Inheriting layout anchor `<name>` from /wireframes."
3. **If marker missing or stale** → AskUserQuestion (single-select): "Which layout does this prototype follow?" Options: each named layout + "None — start fresh". Cap 4.
4. **Persist** the chosen layout to `{feature_folder}/prototype/.layout-anchor` for downstream skills.

If no layouts declared → skip silently. `layout_anchor = null`.

Platform fallback (no AskUserQuestion): pick the first declared layout, announce.

---

## Step 6 — Assemble decision context

Concatenate, in this order, into a single text block:

1. Workstream `## Constraints & Scars` (if loaded).
2. DESIGN.md `## Anti-patterns`.
3. DESIGN.md `## Do's and Don'ts`.
4. Workstream `## Design System / UI Patterns` (only if `/wireframes` migration was skipped — usually empty after migration).

Read-only. Never written to from `/prototype`.

---

## Step 7 — Workstream pointers (read-only verification)

Confirm the workstream's `## Wireframes & Design System` section exists and matches the resolved paths. If `target_app.path` is missing, write it (this is the only field `/prototype` ever writes to the workstream).

`design_md_path`, `components_md_path`, `last_extraction_sha` are managed by `/wireframes` and `/verify` — `/prototype` reads them, never writes them.

---

## Failure modes

| Failure | Behavior |
|---|---|
| Resolver returns `design_md_path: null` | Abort `/prototype` with the documented message. |
| DESIGN.md stale, user picks "Re-extract via /wireframes" | Abort cleanly with hand-off message. |
| Overlay reuse: file exists but unreadable | Fall through to regenerate. |
| Overlay reuse: file exists but mismatched (e.g. different CSS variable namespace) | Regenerate. The CSS generator is canonical. |
| `design-tokens.js` write fails | Hard error — abort phase. |
| COMPONENTS.md present but malformed | Warn, treat as null inventory, continue. |
| Layout marker file present but names a layout no longer in DESIGN.md | Treat as stale — re-ask via AskUserQuestion. |

The resolver never blocks on a non-fatal failure except the "DESIGN.md not found" abort, which is the documented hand-off, not a crash.

---

## See also

- `wireframes/reference/design-md-resolver.md` — the underlying resolver this composes.
- `wireframes/reference/design-md-to-css.md` — CSS overlay generator.
- `design-md-to-tokens-js.md` — JS tokens generator (next door).
- `wireframes/reference/design-md-spec.md` — DESIGN.md schema.
- `wireframes/reference/components-md-spec.md` — COMPONENTS.md schema.
