# Screenshot Ingestion

## Contents

- [Inputs](#inputs)
- [Vision-extraction prompt](#vision-extraction-prompt)
- [`source-screens.md` format](#source-screensmd-format)
- [Journey anchoring protocol](#journey-anchoring-protocol)
- [Generator briefing](#generator-briefing)

Lets users seed wireframe generation with screenshots of an existing flow ("here's today's onboarding — redesign step 3"). Optional. Augments the requirements doc, never replaces it.

## Inputs

Two ways the user can supply screenshots:

1. **CLI flag(s):** `--screenshots <path>`. Value is a file or a directory; multiple `--screenshots` flags allowed. Supported extensions: `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.heic` (model-readable image formats).
2. **Inline attachments:** images attached to the user's prompt (Claude Code supports multimodal input). Treat each attached image as a screenshot.

If both are supplied, ingest all of them.

If neither is supplied, skip the rest of this file.

## Vision-extraction prompt

For each screenshot, `Read` the image file (the model sees it natively) and extract a structured description using this prompt template:

> Describe this screenshot of an existing product UI. Output the following fields and **only** these fields:
>
> - **inferred_name**: a short slug for the screen (e.g., `onboarding-step-2`, `pricing-page`). Lowercase, hyphenated.
> - **purpose**: one sentence on what the screen lets the user do.
> - **device**: one of `desktop-web`, `mobile-web`, `desktop-app`, `android-app`, `ios-app`. Infer from aspect ratio and chrome.
> - **layout**: bullet list of the major regions, top-to-bottom or left-to-right (e.g., `header (logo-left, nav-right) → hero (left image, right CTA) → 3-column feature grid → footer`).
> - **components**: bullet list of distinct UI components present (e.g., `primary CTA button`, `email input`, `progress stepper (3 dots, step 2 active)`, `link "Skip for now"`).
> - **state**: which state of the screen is captured (`empty`, `loaded`, `loading`, `error`, `success`, `partial-data`, …). If unclear, say `default`.
> - **copy**: bullet list of the visible labels/headings/body text, verbatim.
> - **brand_signals**: any obvious brand color, logo style, or typographic choice. If none stand out, say `none obvious`.
>
> Do not redesign or critique. Describe what is on screen.

## `source-screens.md` format

Append one section per screenshot to `{feature_folder}/wireframes/assets/source-screens.md`. Create the file with a header on first write:

```markdown
# Source Screens

Captured: {YYYY-MM-DD}
Origin: provided by the user as anchors for wireframe generation.

---
```

Then for each screenshot:

```markdown
## `{filename}`

- **Inferred name:** `{inferred_name}`
- **Device:** `{device}`
- **State:** `{state}`
- **Purpose:** {purpose}

**Layout**
- {layout bullet 1}
- {layout bullet 2}

**Components**
- {component 1}
- {component 2}

**Copy**
- "{label 1}"
- "{label 2}"

**Brand signals:** {brand_signals}

**Anchored to:** _(filled in during journey-anchoring step; left blank initially)_

---
```

Also copy the original image into `{feature_folder}/wireframes/assets/source-screens/{filename}` (preserve the original filename; if a collision occurs, suffix with `-1`, `-2`, …). Do not move the original.

## Journey anchoring protocol

After ingestion AND after the requirements doc has been read (Phase 1 step 3), but BEFORE the journey-confirmation gate (Phase 1 step 4):

1. For each screenshot, propose a candidate journey-step mapping:
   - Match the screenshot's `inferred_name` and `purpose` against the journey steps in the req doc.
   - If multiple plausible matches, pick the strongest one as the proposal.
2. Present mappings via `AskUserQuestion` (batch ≤ 4 per call):
   - **Question (one per screenshot):** "Anchor `{filename}` ({inferred_name}) to journey '{journey}' step {n}: '{step description}'?"
   - **Options:** **Yes, anchor here** / **Different step** / **Standalone reference** / **Discard this screenshot**
3. "Different step" — follow up with a free-form prompt to capture the correct journey + step number.
4. "Standalone reference" — keep the screenshot in `source-screens.md` but do not pass it to any generator subagent.
5. "Discard" — remove the section from `source-screens.md` and delete the copied image.

For each anchored screenshot, fill the **Anchored to** line in its `source-screens.md` section:

```markdown
**Anchored to:** journey "New user signup", step 2 → component slug `email-verify`
```

The mapping connects screenshot → component slug from the inventory matrix, NOT just journey step number — this is what Phase 3 generators key off of.

**Platform fallback (no `AskUserQuestion`):** print the proposed mappings as a numbered list and ask the user to confirm or correct in free text. Update `source-screens.md` accordingly.

## Generator briefing

When Phase 3 dispatches a generator subagent for a component that has at least one anchored screenshot:

- Pass **only** the `source-screens.md` section(s) for the screenshot(s) anchored to this component (not the whole file). Keep token budget lean.
- Pass the absolute path to the original image so the generator can re-open it if needed.
- Add this instruction to the generator brief:

> A source screenshot is provided as the IA anchor for this component. Match the layout regions, navigation pattern, and overall information architecture. You MAY improve states, accessibility, copy clarity, and visual rhythm. You MUST NOT reorganize the IA (move primary actions, change the screen's purpose, drop sections) without explicit user direction. If you spot a meaningful IA improvement, leave it as a `<!-- TODO: -->` comment in the HTML — do not apply it silently.

Components without an anchored screenshot are generated normally per the existing Phase 3 protocol — no screenshot context is passed to them.

## Failure modes

- Image unreadable (corrupt file, unsupported format) → log a warning, skip that screenshot, continue. Do NOT abort the skill.
- Vision extraction returns garbled output → retry once with a more directive prompt; if still garbled, log the screenshot as `state: unknown` with whatever fields were captured and surface to the user.
- Screenshot maps to no journey step at all → keep as standalone reference; do not force a mapping.
- Screenshot count > 10 → still ingest, but warn the user that subagent context will be tight; recommend pre-trimming to the most representative ~5.
