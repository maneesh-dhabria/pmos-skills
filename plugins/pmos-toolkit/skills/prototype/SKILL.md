---
name: prototype
description: Generate a high-fidelity, single-HTML-per-device interactive prototype (React via CDN + JSX, simulated API calls, domain-real LLM-generated mock data) that stitches all wireframe screens into walkable user journeys. Optional bridge between /wireframes and /spec in the requirements -> spec -> plan pipeline. Tier 1 skip; Tier 2 optional; Tier 3 mandatory. Inherits from wireframes (visual reference, IA, copy) and produces forms, CRUD, navigation, loading/error states without any backend or build step. Self-evaluates with a reviewer subagent (≤2 loops per device file) and runs an interactive friction pass measuring clicks/keystrokes/decisions per journey. Use when the user says "create a prototype", "make this clickable", "high-fi mockup", "stakeholder demo", "interactive prototype", "prototype this feature", or has wireframes ready and wants stakeholders to experience the flow before /spec.
user-invocable: true
argument-hint: "<path-to-requirements-doc or feature description> [--devices=desktop-web,mobile-web,...] [--feature <slug>] [--update-handoff] [--non-interactive | --interactive]"
---

# Prototype Generator

Produce a single-HTML-per-device interactive prototype that stitches wireframe screens into walkable user journeys with simulated API calls, mock data, and full client-side interactivity. Output is high-fidelity (real brand colors, typography, no annotation chrome) but unmistakably NOT the real product (no backend, in-memory only, mock data). This is an OPTIONAL stage that sits between wireframes and spec for user-facing features:

```
/requirements  →  /wireframes  →  [/prototype]  →  /spec  →  [/simulate-spec]  →  /plan  →  /execute  →  /verify
                                  (this skill, optional)
```

Use this when stakeholders need to experience the flow end-to-end before committing to implementation. Skip for backend-only or API-only features.

**Single-HTML-per-device** is the scope fence: the prototype is a stakeholder-confidence and design-validation artifact, not the implementation. No build step, no npm packages, no backend — the user can email the folder to a stakeholder and it works.

**Announce at start:** "Using the prototype skill to generate an interactive prototype for this feature."

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:
- **No interactive prompt tool:** State your assumption (default devices = wireframes' device list; default scope = all wireframe screens; mock data = use as generated; layout anchor = first declared in DESIGN.md or none if none exist), document it in the output's `index.html`, and proceed. For Phase 1.5 staleness prompts, default to "Use as-is" and note the staleness in the index footer.
- **No subagents:** Generate sequentially in the main agent; run review and friction passes inline.
- **No background processes:** Skip the local server and print the absolute `file://` path to `index.html`.
- **No Playwright MCP:** Phase 5d runtime smoke runs in degraded analytical-only mode, AND the prototype's landing `index.html` MUST display a "not runtime-smoked — verify in a real browser before sharing" banner. Phase 7 friction pass also runs in analytical-only mode.

## Track Progress

This skill has 14 phases (Phase 1.5 was added in v2.8.0 for DESIGN.md resolution; Phase 5d runtime smoke added in v2.9.0). Create one task per phase using your agent's task-tracking tool (e.g., `TodoWrite` in Claude Code, equivalent in other agents). Mark each task in-progress when you start it and completed as soon as it finishes — do not batch completions.

---

## Phase 0: Pipeline Setup (inline — do not skip)

Use workstream context (loaded by step 3 below) — brand voice, design tokens, domain hints, and prior prototype conventions live here. Prototype is produced AFTER /wireframes, so the feature folder typically already exists.

<!-- pipeline-setup-block:start -->
1. **Read `.pmos/settings.yaml`.**
   - If missing → you MUST invoke the `Read` tool on `_shared/pipeline-setup.md` Section A and run first-run setup before proceeding. (Skipping this Read is the most common cause of folder-naming defects.)
2. Set `{docs_path}` from `settings.docs_path`.
3. If `settings.workstream` is non-null → load `~/.pmos/workstreams/{workstream}.md` as context preamble; if frontmatter `type` is `charter` or `feature` and a `product` field exists, also load `~/.pmos/workstreams/{product}.md` read-only.
4. Resolve `{feature_folder}`:
   - If `--feature <slug>` was passed → glob `{docs_path}/features/*_<slug>/`. **Exactly 1 match required**; on 0 or 2+ → you MUST `Read` `_shared/pipeline-setup.md` Section B before acting.
   - Else if `settings.current_feature` is set AND `{docs_path}/features/{current_feature}/` exists → use it.
   - Else → ask user (offer: create new with derived slug, pick existing from folder list, or specify via Other...).
5. **Edge cases — you MUST `Read` `_shared/pipeline-setup.md` Section B before acting:** slug collision, slug validation failure, legacy date-less folder encountered, ambiguous `--feature` lookup, any folder creation.
6. Read `~/.pmos/learnings.md` if present; note entries under `## /<this-skill-name>` and factor them into approach (skill body wins on conflict; surface conflicts to user before applying).
<!-- pipeline-setup-block:end -->

---

<!-- non-interactive-block:start -->
1. **Mode resolution.** Compute `(mode, source)` with precedence: `cli_flag > parent_marker > settings.default_mode > builtin-default ("interactive")` (FR-01).
   - `cli_flag` is `--non-interactive` or `--interactive` parsed from this skill's argument string. Last flag wins on conflict (FR-01.1).
   - `parent_marker` is set if the original prompt's first line matches `^\[mode: (interactive|non-interactive)\]$` (FR-06.1).
   - `settings.default_mode` is `.pmos/settings.yaml :: default_mode` if present and one of `interactive`/`non-interactive`. Unknown values → warn on stderr `settings: invalid default_mode value '<v>'; ignoring` and fall through (FR-01.3).
   - If `.pmos/settings.yaml` is malformed (not parseable as YAML, or missing `version`): print to stderr `settings.yaml malformed; fix and re-run` and exit 64 (FR-01.5).
   - On Phase 0 entry, always print to stderr exactly: `mode: <mode> (source: <source>)` (FR-01.2).

2. **Per-checkpoint classifier.** Before issuing any `AskUserQuestion` call, classify it (FR-02):
   - Use the awk extractor below to find the line of this call's `question:` key in the live SKILL.md (FR-02.6).
   - The defer-only tag, if present, is the literal previous non-empty line: `<!-- defer-only: <reason> -->` where `<reason>` ∈ {`destructive`, `free-form`, `ambiguous`} (FR-02.5).
   - Decision (in order): tag adjacent → DEFER; multiSelect with 0 Recommended → DEFER; 0 options OR no option label ends in `(Recommended)` → DEFER; else AUTO-PICK the (Recommended) option (FR-02.2).

3. **Buffer + flush.** Maintain an append-only OQ buffer in conversation memory. On each AUTO-PICK or DEFER classification, append one entry per the schema in spec §11.2. At end-of-skill (or in a caught error before exit), flush (FR-03):
   - Primary artifact is single Markdown → append `## Open Questions (Non-Interactive Run)` section with one fenced YAML block per entry; update prose frontmatter (`**Mode:**`, `**Run Outcome:**`, `**Open Questions:** N` where N counts deferred only — see FR-03.4) (FR-03.1).
   - Skill produces multiple artifacts → write a single `_open_questions.md` aggregator at the artifact directory root; primary artifact's frontmatter `**Open Questions:** N — see _open_questions.md` (FR-03.5).
   - Primary artifact is non-MD (SVG, etc.) → write sidecar `<artifact>.open-questions.md` (FR-03.2).
   - No persistent artifact (chat-only) → emit buffer to stderr at end-of-run as a single block prefixed `--- OPEN QUESTIONS ---` (FR-03.3).
   - Mid-skill error → flush partial buffer under heading `## Open Questions (Non-Interactive Run — partial; skill errored)`; set `**Run Outcome:** error`; exit 1 (E13).

4. **Subagent dispatch.** When dispatching a child skill via Task tool or inline invocation, prepend the literal first line: `[mode: <current-mode>]\n` to the child's prompt (FR-06).

5. **Awk extractor.** The classifier and `tools/audit-recommended.sh` MUST both use the function below. Loaded at script init time; sourcing differs per consumer.

<!-- awk-extractor:start -->
```awk
# Find AskUserQuestion call sites and their adjacent defer-only tags.
# Input: a SKILL.md file (stdin or argv).
# Output (TSV): <line_no>\t<has_recommended:0|1>\t<defer_only_reason or "-">
# A "call site" is a line referencing `AskUserQuestion` in the SKILL's own prose
# (backtick mentions, prose instructions, multi-line invocation hints).
# `(Recommended)` is detected on the call site line OR any subsequent non-blank
# line (the option-list block) until a blank line, defer-only tag, or another
# AskUserQuestion call closes the pending call. Lines inside the inlined
# `<!-- non-interactive-block:... -->` region are canonical contract text and
# never count as call sites.
function emit_pending() {
  if (pending_call > 0) {
    out_tag = (pending_call_tag != "") ? pending_call_tag : "-";
    printf "%d\t%d\t%s\n", pending_call, pending_has_recc, out_tag;
    pending_call = 0;
    pending_has_recc = 0;
    pending_call_tag = "";
  }
}
/^<!-- non-interactive-block:start -->$/ { in_inlined=1; next }
/^<!-- non-interactive-block:end -->$/   { in_inlined=0; next }
in_inlined { next }
/^[[:space:]]*<!--[[:space:]]*defer-only:[[:space:]]*([a-z-]+)[[:space:]]*-->/ {
  emit_pending();
  match($0, /defer-only:[[:space:]]*[a-z-]+/);
  pending_tag = substr($0, RSTART + 12, RLENGTH - 12);
  sub(/^[[:space:]]+/, "", pending_tag);
  pending_line = NR;
  next;
}
/^[[:space:]]*$/ {
  emit_pending();
  pending_tag = "";
  next;
}
/AskUserQuestion/ {
  emit_pending();
  pending_call = NR;
  pending_has_recc = ($0 ~ /\(Recommended\)/) ? 1 : 0;
  pending_call_tag = (pending_tag != "" && NR == pending_line + 1) ? pending_tag : "";
  pending_tag = "";
  next;
}
{
  if (pending_call > 0 && $0 ~ /\(Recommended\)/) {
    pending_has_recc = 1;
  }
}
END { emit_pending() }
```
<!-- awk-extractor:end -->

6. **Refusal check.** If this SKILL.md contains a `<!-- non-interactive: refused; ... -->` marker (regex: `<!--[[:space:]]*non-interactive:[[:space:]]*refused`), and `mode` resolved to `non-interactive`: emit refusal per Section A and exit 64 (FR-07).

7. **Pre-rollout BC.** If the `--non-interactive` argument is present BUT this SKILL.md does NOT contain the `<!-- non-interactive-block:start -->` marker (i.e., this skill hasn't been rolled out yet): emit `WARNING: --non-interactive not yet supported by /<skill>; falling back to interactive.` to stderr; continue in interactive mode (FR-08).

8. **End-of-skill summary.** Print to stderr at exit: `pmos-toolkit: /<skill> finished — outcome=<clean|deferred|error>, open_questions=<N>` (NFR-07).
<!-- non-interactive-block:end -->

## Phase 1: Locate Inputs

1. **Find the requirements doc.** Follow `_shared/resolve-input.md` with `phase=requirements`, `label="requirements doc"`. Accept either a path or inline feature description.
2. **No requirements doc found?** Stop and trigger `/wireframes` (which will trigger `/requirements` if needed):
   - Tell the user: "Prototype needs requirements + wireframes. Running `/wireframes` first."
   - Hand off to `/pmos-toolkit:wireframes` with the user's original ask.
   - Resume `/prototype` once both docs exist.
3. **Find the wireframes folder.** Default location: `{feature_folder}/wireframes/`. Check for `index.html` and at least one `NN_*.html` file.
4. **No wireframes found?** Trigger `/pmos-toolkit:wireframes` (announce, hand off, resume).
5. **Read inputs end-to-end:**
   - Req doc: extract user journeys, business rules, entity model, tier tag
   - Wireframes: read `index.html` for the inventory matrix; read each `NN_*.html` for layout, copy, visible fields, state list
   - `wireframes/assets/design-overlay.css` if present (reused as the prototype's CSS overlay in Phase 1.5; otherwise regenerated from DESIGN.md)
<!-- defer-only: ambiguous -->
6. **Confirm understanding.** Summarize the journeys to be made interactive and the device list. Ask via `AskUserQuestion` (≤4 batched). Platform fallback: numbered list + free-text confirmation.

**Gate:** Do not proceed until the user confirms.

---

## Phase 1.5: Resolve DESIGN.md & Composition Context

> Decimal phase number is intentional — Phase 2 onward keeps existing numbering so external references (other skills, prior conversations) still resolve.

`/prototype` consumes the same canonical design artifacts as `/wireframes` and `/verify`: DESIGN.md (visual identity + `x-interaction` + `x-content`), COMPONENTS.md (component-library inventory), `design-overlay.css` (CSS variable overlay), and a new `design-tokens.js` (JS-shaped tokens for JSX imports).

Detailed procedure: `reference/design-artifact-resolver.md`. Summary:

1. **Resolve DESIGN.md** via `wireframes/reference/design-md-resolver.md` (target app → file walk → `x-extends` cascade → staleness check).

   **If no DESIGN.md is found:** check whether wireframes already exist for this feature at `{feature_folder}/wireframes/` (look for `index.html` + at least one `NN_*.html`).

   <!-- defer-only: ambiguous -->
   - **Wireframes EXIST:** offer a targeted bootstrap via `AskUserQuestion`:
     > **Question:** "DESIGN.md is missing but wireframes already exist. How do you want to bootstrap the design system?"
     > **Options:**
     > - **Bootstrap DESIGN.md + COMPONENTS.md only via /wireframes targeted handoff (Recommended)** — runs only Phase 2.5 + 2.6 of /wireframes; no wireframe regen; takes ~2 min.
     > - **Re-run full /wireframes** — regenerates all wireframes too; takes ~30 min; use when wireframes are also stale.
     > - **Abort** — cancel /prototype; you'll bootstrap manually.

     If user picks the targeted handoff, hand off to `/pmos-toolkit:wireframes` with this codified prompt VERBATIM:

     ```
     --bootstrap-design-only
     Feature folder: {feature_folder}
     Existing wireframes: {feature_folder}/wireframes/
     Goal: produce {target_app}/DESIGN.md and {target_app}/COMPONENTS.md ONLY.
     Skip Phases 1, 2, 3-8, 9-10. Run Phase 2.5 (DESIGN.md extraction)
     and Phase 2.6 (COMPONENTS.md inventory) only. Honor the Phase 2.5c
     review gate. COMPONENTS.md MUST enumerate only components present
     in the host frontend; do NOT propose feature-specific components
     (those are /prototype's output).
     ```

     Resume `/prototype` Phase 1.5 from step 2 once `/wireframes` returns.

   - **Wireframes do NOT exist:** abort with "DESIGN.md not found and no wireframes either. Run `/wireframes` first to produce wireframes + DESIGN.md, then re-run `/prototype`." Do NOT auto-bootstrap; that's `/wireframes`' responsibility.
2. **Resolve `design-overlay.css`:**
   - If `{feature_folder}/wireframes/assets/design-overlay.css` exists AND is at least as fresh as DESIGN.md → copy to `{feature_folder}/prototype/assets/design-overlay.css`.
   - Otherwise → regenerate from DESIGN.md via `wireframes/reference/design-md-to-css.md` directly into the prototype folder.
3. **Generate `design-tokens.js`** via `reference/design-md-to-tokens-js.md` → `{feature_folder}/prototype/assets/design-tokens.js`. Always regenerated; cheap; never reused.
4. **Load COMPONENTS.md** from the same dir as DESIGN.md (warn if absent — `/verify` populates it on the next implementation pass).
5. **Pick layout anchor** from `x-information-architecture.layouts`:
   - Inherit from `{feature_folder}/wireframes/.layout-anchor` marker file if present and still valid (announce: "Inheriting layout anchor `<name>` from /wireframes").
   <!-- defer-only: ambiguous -->
   - Else AskUserQuestion (single-select). Persist choice to `{feature_folder}/prototype/.layout-anchor`.
6. **Assemble decision context** by concatenating workstream `## Constraints & Scars` + DESIGN.md `## Anti-patterns` + `## Do's and Don'ts`.

Output: in-memory `merged_design_md`, `components_inventory`, `layout_anchor`, `decision_context` — passed to Phases 4–6. On disk: `design-overlay.css` and `design-tokens.js` in `{feature_folder}/prototype/assets/`.

**Subagents:** if available, dispatch one read-only subagent for DESIGN.md resolution + token generation. Otherwise inline.

<!-- defer-only: ambiguous -->
**Gate:** none for fresh DESIGN.md; user must respond to the staleness AskUserQuestion if the file is stale.

---

## Phase 2: Tier Gate & Scope Confirmation

### 2a. Tier detection

<!-- defer-only: ambiguous -->
Read tier from req doc. If absent, ask via `AskUserQuestion`:

- **Question:** "What tier is this feature?"
- **Options:** Tier 1 (bug fix / minor enhancement) / Tier 2 (enhancement / UX overhaul, **Recommended**) / Tier 3 (new feature / major redesign)

**Tier gating:**

- **Tier 1:** Stop. Tell the user: "Tier 1 features rarely need a prototype. Recommend running `/spec` directly. Re-run with `--force` to override." Exit cleanly.
<!-- defer-only: ambiguous -->
- **Tier 2:** Ask via `AskUserQuestion`:
  - **Question:** "Tier 2 detected. Run /prototype now? Adds ~1 hr; produces interactive prototype for stakeholder review."
  - **Options:** **Run now (Recommended)** / **Skip — proceed to /spec**
  - Platform fallback: state assumption "Skipping /prototype for Tier 2 unless you ask for it" and exit.
- **Tier 3:** Announce: "Tier 3 detected — /prototype is mandatory. Proceeding."

### 2b. Scope confirmation

Print the screen × device matrix:

```
| # | Screen | Slug | Devices | Source wireframe |
|---|--------|------|---------|------------------|
```

<!-- defer-only: ambiguous -->
Confirm via `AskUserQuestion` (batch ≤4):

1. Device list (multiSelect; default = wireframes' devices)
2. Interactivity baseline (multiSelect; default = all four — navigation, forms, CRUD, loading/error/empty)

Platform fallback: print defaults, announce assumptions, proceed.

**Gate:** User confirms scope before Phase 3.

---

## Phase 3: Generate Mock Data

Use `reference/mock-data-prompt.md` as the prompt template.

1. **Extract visible-field summary** from wireframes. Grep across `wireframes/*.html` for `<th>`, `<label>`, `<dt>` text and any `data-field` attributes. Build `{screen, fieldsShown: [...], approxRowCount: N}`.
2. **Dispatch ONE subagent** with:
   - The mock-data prompt template (verbatim)
   - Full requirements doc text
   - Visible-field summary
   - Workstream domain hint if Phase 0 loaded one
   - Output folder: `{feature_folder}/prototype/assets/`

   **Subagent dispatch is the prescribed path.** Inline generation is permitted ONLY when (a) the platform doesn't support subagents at all, OR (b) the parent agent already has full domain context AND the total mock-data volume is < 100 records across all entities. If you generate inline for any other reason, log it in `{feature_folder}/prototype/.deviations.md` as:

   ```markdown
   ## Phase 3 — inline generation
   - Reason: <one-sentence justification>
   - Records produced: <count>
   - Date: <YYYY-MM-DD>
   ```

   `.deviations.md` is read by the Phase 9a landing index and surfaced in the footer so stakeholders can see what was off-spec. Silent deviation is a contract violation.
3. **Validate output** before user review:
   - Each `<entity>.json` is valid non-empty JSON
   - No Lorem ipsum (`grep -i 'lorem\|ipsum'`)
   - No `"User N"` / `"Item N"` patterns (`grep -E '"(User|Item|Test) [0-9]+"'`)
   - Spot-check 1–2 foreign-key relationships resolve
<!-- defer-only: ambiguous -->
4. **User review gate** via `AskUserQuestion`:
   - **Question:** "Approve mock data? {entities + counts + 3 sample records each}"
   - **Options:** **Use as generated (Recommended)** / **Edit before continuing** / **Regenerate**
   - "Edit": print absolute paths to JSON files, wait for user, then re-confirm.
   - "Regenerate": prompt user for adjustments, re-run subagent **once**. No second regen.
5. Platform fallback: print summary, announce "using as generated", proceed.

---

## Phase 4: Generate Shared Runtime + Components + Styles

### 4a. Copy base stylesheet

Copy `assets/prototype.css` from this skill into the output folder so device files can link `./assets/prototype.css`:

```bash
mkdir -p "{feature_folder}/prototype/assets"
cp "${CLAUDE_PLUGIN_ROOT:-$HOME/.claude-personal/plugins/cache/pmos-toolkit/pmos-toolkit/*/}skills/prototype/assets/prototype.css" \
   "{feature_folder}/prototype/assets/prototype.css"
```

If the copy fails, `Read` the skill's `assets/prototype.css` and `Write` it to the destination.

### 4b. Generate runtime.js (subagent)

Dispatch a subagent with `reference/runtime-template.md` as the spec. Inline generation follows the same exception criteria as Phase 3 — log to `.deviations.md` when bypassing the subagent. Output: `{feature_folder}/prototype/assets/runtime.js`. Must implement: hash router, mock-API client (200–800ms latency), in-memory store with pub/sub, mock-data loader (fetch + inline-script fallback), error injection via query param, `useRoute` and `useStore` hooks.

### 4c. Generate components.js (subagent)

Dispatch a subagent with `reference/components-template.md` as the spec. Inline generation follows the same exception criteria as Phase 3 — log to `.deviations.md` when bypassing the subagent. Output: `{feature_folder}/prototype/assets/components.js`. Must export the atoms listed in the template (Button, Input, Modal, Toast, Card, Table, EmptyState, Spinner, Badge, Avatar) on `window.__protoComponents`.

In addition to the existing inputs, the subagent receives **four blocks from Phase 1.5**:

1. **The merged DESIGN.md verbatim** with the instruction: "Tokens are read at runtime via `window.__designTokens`; structural decisions (component variants, voice) read here."
2. **COMPONENTS.md content** (from `components_inventory`) with the instruction: "When emitting an atom, use variant names from COMPONENTS.md. If a needed variant doesn't exist in the inventory, emit the atom anyway but flag in the file footer comment under `/* New variants: <list> */` so reviewer can confirm."
3. **`x-interaction` block (mandatory contract)** with the instruction:
   > "Implement `x-interaction` literally. Specifically:
   > - `modals.style` (centered / drawer-right / drawer-bottom / fullscreen) controls Modal positioning. Hard-code the matching class string.
   > - `modals.dismiss` (backdrop-click / explicit-button / esc-key) controls which dismiss handlers Modal wires up. Wire ONLY the listed dismiss paths — no extras.
   > - `destructiveActions.confirmation`: `always` → simple confirm modal; `double-click` → first click arms a 3-second visual countdown ring on the button; `type-to-confirm` → confirm modal with a text input that must match the resource name to enable the confirm button.
   > - `focus.trapInModals: true` → Modal traps Tab/Shift-Tab within itself when open.
   > - `focus.visibleStyle` → applied as the `:focus-visible` class on Button, Input, Select, etc.
   > - `defaultStates.empty` (illustrated / minimal / none) → EmptyState atom default variant.
   > - `defaultStates.loading` (skeleton / spinner / progress) → default Loading variant in components like Table.
   > - `defaultStates.error` (inline-banner / full-page / toast) → default error rendering in components.
   > - `shortcuts` → wire as global keydown handlers in runtime.js (cross-reference Phase 4b); advertise in a `?` keyboard-shortcut modal.
   > Pull values from `window.__designTokens.interaction.*` at runtime; do not duplicate the values inline."
4. **`x-content.buttonVerbs` and `x-content.formats`** with the instruction: "Use these exact verbs in default Button labels — 'Save', 'Create', 'Delete'. Don't invent 'Submit' or 'Add'. Date and currency formats come from `window.__designTokens.content.formats`."
5. **`decision_context`** with the instruction: "Honor every anti-pattern listed. If a component must violate one, flag in the file footer with rationale."

### 4d. Apply design overlay + emit thin styles.css

**Tokens are already produced in Phase 1.5.** `design-overlay.css` (CSS variables from DESIGN.md) and `design-tokens.js` (JS-shaped tokens) live at `{feature_folder}/prototype/assets/`. This phase:

1. **Confirm both files exist.** If either is missing, return to Phase 1.5 and regenerate.
2. **Emit a thin `styles.css`** (≤ 30 lines typical) containing ONLY prototype-only utility classes that aren't in `prototype.css` and don't belong in DESIGN.md:
   - Mock-data shimmer animations
   - Scroll-snap overrides for prototype-only carousels
   - File-protocol fallbacks
   - Anything device-specific that the overlay doesn't address
   Most prototypes will not need any custom styles here — emit a one-line comment file in that case.
3. Do NOT duplicate tokens from `design-overlay.css` here. The overlay is canonical for tokens.

`reference/styles-derivation.md` is **superseded** as of v2.8.0 — the legacy `house-style.json` codepath is gone. See the banner at the top of that file.

**Subagent dispatch:** 4b, 4c are independent — fire 2 parallel subagents in one message when available. 4d runs inline (it's small) after 1.5 confirms the overlay and tokens are present.

**Validation after 4d:**
- `design-overlay.css` exists and is non-empty (or contains only a header comment if DESIGN.md had no tokens)
- `design-tokens.js` exists and parses (`grep -q "window.__designTokens" design-tokens.js`)
- `styles.css` (if non-empty): balanced braces, no `url(http*)` external URLs, no `@import` statements

---

## Phase 5: Generate Per-Device HTML Files

For each device in the confirmed list, generate `{feature_folder}/prototype/index.<device>.html`.

### 5a. Extract visible-field summary per screen

For each wireframe screen, extract `<th>`, `<label>`, `<dt>`, button text, and CTA text. Save as `{feature_folder}/prototype/.screens-summary.json` for the generator subagents to consume.

### 5b. Dispatch device generators (parallel where possible)

One subagent per device. Each receives:
- `reference/device-html-template.md` (structure + skeleton)
- `.screens-summary.json` (what each screen must contain)
- Full text of `wireframes/<NN>_*.html` files for that device (visual reference)
- Req doc journey list (screens to wire up + transitions)
- Mock-data filenames AND the JSON contents (for inline-script fallbacks — subagent inlines the JSON verbatim)

Strict rules (from `reference/device-html-template.md`):
- **CSS load order** (cascade-critical): `prototype.css` → `design-overlay.css` → `styles.css`. The overlay must come AFTER `prototype.css` so its `:root` overrides take effect, and BEFORE `styles.css` so prototype-only utility classes can use the overlaid variables.
- **JS load order** (dependency-critical): `design-tokens.js` → `runtime.js` → `components.js`. Tokens must load first so `window.__designTokens` is defined when runtime and components evaluate.
- One screen component per wireframe screen, named `<PascalCaseSlug>Screen`, registered on `window.__screens`
- Inline `<script type="application/json" id="mock-<entity>">` for every entity
- Implement navigation across all screens via `useRoute` / `navigate`
- Wire forms, CRUD, loading/error/empty via `mockApi` and `store`
- No external network calls — everything routes through `mockApi`
- Use atoms from `window.__protoComponents` — no raw `<button>` / `<input>` in screens

### 5c. Per-device verification

After each device file is written:

```bash
# 1. Required script + style tags present (in correct order)
grep -c 'react@18\|babel/standalone\|design-tokens.js\|runtime.js\|components.js\|design-overlay.css' "{feature_folder}/prototype/index.<device>.html"
# Expected: ≥6

# 2. All entities have inline-data fallback
# (compare meta mock-entities content to <script id=mock-*> count)

# 3. Forbidden patterns
grep -E 'Lorem ipsum|User [0-9]+|Item [0-9]+|TODO|FIXME|console\.error|console\.log' \
  "{feature_folder}/prototype/index.<device>.html" \
  && echo "FORBIDDEN PATTERN" || echo "OK"

# 4. Screen count matches wireframe inventory
# (count `Screen` function definitions vs wireframe screen count)
```

If any check fails, send a follow-up to the device's generator subagent with the specific failure.

### 5d. Runtime smoke (MANDATORY — catches Babel scope collisions and missing wiring)

The Phase 5c grep checks confirm structure but cannot tell whether the file actually *runs*. Babel-standalone compiles every `<script type="text/babel">` block into the same shared global scope, so an unwrapped top-level `const Button = …` in components.js silently breaks the page on first load with `Identifier 'Button' has already been declared`. Static checks miss this. A real browser load is the only reliable detector.

**Default path — Playwright MCP (when available):**

For each `index.<device>.html`:

1. Start the static server (Phase 9b serve command, used here too) and capture the served URL.
2. Use Playwright MCP to load `http://localhost:<port>/index.<device>.html`.
3. Wait up to 5s for `#root` to have at least one child element.
4. Read browser console messages.
5. **Pass criteria (all must hold):**
   - `#root` has ≥1 child within 5s (page actually rendered, not stuck on the empty React root).
   - Zero `console.error` messages.
   - Zero uncaught exceptions in the page error log.
   - No SyntaxError, ReferenceError, or `has already been declared` substrings anywhere in console output.
6. **On failure:** capture the full console output verbatim, send a follow-up to the device's generator subagent with the failure messages, and re-run the smoke. Hard cap: 2 smoke retries per device file. If still failing, abort with the captured console output and surface to the user as a Phase 8 finding tagged `severity: blocker`.

**Degraded fallback — analytical-only (when Playwright MCP is unavailable):**

Run these greps, but ALSO emit a banner in the prototype's landing `index.html` footer reading "⚠ Prototype was not runtime-smoked — verify in a real browser before sharing." This is a degraded mode; do not claim "interactive prototype" without this banner when the live smoke is skipped.

```bash
# A. Every Babel block must be IIFE-wrapped (matches the rule in device-html-template.md §0)
grep -nE '<script type="text/babel"' "{feature_folder}/prototype/index.<device>.html" \
  | while read -r line; do
      # crude: every Babel block must be followed within 3 lines by `(function () {` or be an external src= reference
      :
    done
# Document this as best-effort — the live smoke is what actually catches the bug.

# B. components.js / runtime.js must contain an outer IIFE
grep -q '^(function () {' "{feature_folder}/prototype/assets/components.js" || echo "FAIL: components.js missing outer IIFE wrap"
grep -q '(() => {' "{feature_folder}/prototype/assets/runtime.js" || grep -q '^(function () {' "{feature_folder}/prototype/assets/runtime.js" || echo "FAIL: runtime.js missing outer IIFE wrap"
```

Analytical mode is a known-degraded fallback. It catches the IIFE-wrap omission only if the generator forgot the wrap entirely; it does NOT catch "wrap is there but a duplicate identifier was emitted in two different blocks." Live smoke is non-negotiable when Playwright MCP is available.

---

## Phase 6: Refinement Loop (Reviewer Subagent + ≤2 Loops Per File)

For each per-device HTML file, run up to 2 refinement loops. Stop early when zero high/medium findings remain.

### Loop Structure

**Step 1 — Dispatch reviewer subagent (parallel where possible):**
- One reviewer per device file
- Prompt: load `reference/eval-rubric.md` AND the following from Phase 1.5:
  - DESIGN.md `## Anti-patterns` and `## Do's and Don'ts` (verbatim) — score the file against each.
  - The `x-interaction` block — score against the **mandatory contract checklist** below.
  - COMPONENTS.md content — flag use of variants not in the inventory.
- Score the file against all seven rubric groups (I, J, M, A, V, F, R) PLUS the contract checks. Group **F (Field-Earns-Its-Place)** is mandatory — for every visible data field on every screen, the reviewer must either (a) name the user decision the field anchors, or (b) flag the field as decoration with a remove/relocate suggestion. Return JSON findings array; tag each finding with `source: "rubric:<id>" | "design-md:antipattern:<n>" | "x-interaction:<key>" | "components-md:<name>"`.

**`x-interaction` contract checklist** (severity ≥ medium when violated):
- Modal positioning class matches `interaction.modals.style`?
- Modal dismiss handlers match `interaction.modals.dismiss` exactly (no extra paths)?
- Destructive Button confirmation matches `interaction.destructiveActions.confirmation` literally (simple-confirm / double-click countdown / type-to-confirm)?
- Modal traps focus when `interaction.focus.trapInModals: true`?
- `interaction.focus.visibleStyle` applied to Button, Input, Select, etc.?
- Declared `interaction.shortcuts` wired up in runtime AND advertised in a `?` modal?
- Default empty/loading/error states match `interaction.defaultStates`?
- Button labels honor `content.buttonVerbs` (Save/Create/Delete, not Submit/Add)?

**Step 2 — Apply fixes:**
- High/medium → apply via `Edit` (or have a generator subagent re-emit the affected section)
- Low → log in HTML comment block at top of file as `<!-- Known minor issues: ... -->`
- Track changes in a `<!-- Review Log -->` HTML comment block at top

**Step 3 — Loop continuation:**
- Remaining high/medium → run loop 2
- Otherwise exit
- Hard cap: 2 loops per file

**Platform fallback:** run reviewer pass inline.

---

## Phase 7: Interactive Friction Pass

<!-- defer-only: ambiguous -->
Use `reference/friction-thresholds.md`. Pull journey list from req doc (cap 5). If req doc has >5 journeys, ask via `AskUserQuestion` (multiSelect) — recommend the most stakeholder-visible ones (signup, first-value, primary daily flow, share/invite, recovery).

**Walk mode resolution (do this first):**
- **Playwright MCP available** → live walk (DEFAULT). Each journey is actually clicked through in a headless browser; metrics are observed, not estimated.
- **Playwright MCP unavailable** → analytical-only walk (DEGRADED FALLBACK). The friction output MUST carry the analytical-mode banner described in `reference/friction-thresholds.md`. Do not present analytical output as equivalent to live-walk output.

For each journey:
1. Resolve the screen path (live walk: actually traverse; analytical: read the route table from `runtime.js`).
2. Count clicks, keystrokes, decisions, screen transitions, modal interruptions per step (live walk: observed; analytical: estimated).
3. Apply thresholds; flag exceedances with severity.
4. **Live-walk only:** flag any console error encountered mid-journey as severity high (it would otherwise leak to stakeholders).
5. **Copy check:** confirm button labels and confirmation copy honor `merged_design_md.x-content.voice` and `x-content.buttonVerbs`. Mismatched verbs ("Submit" where DESIGN.md says "Save") are findings at severity medium.

**Subagents:** one per journey, parallel where available. In live-walk mode, each subagent gets its own Playwright MCP session.

**Output:** `{feature_folder}/prototype/interactive-friction.md` per the format in `reference/friction-thresholds.md`.

**Anti-pattern:** do NOT re-run PSYCH or MSF — those are `/wireframes` responsibilities. The friction pass measures *operational cost*, not motivation/satisfaction.

---

## Phase 8: Findings Presentation Protocol

Aggregate Phase 6 unresolved + Phase 7 flags. Group by target (prototype / wireframe / req doc).

<!-- defer-only: ambiguous -->
`AskUserQuestion`, ≤4 per batch:
- **question:** one-sentence finding + which file(s) + proposed fix
- **options:** **Apply to prototype** / **Update wireframe** / **Update req doc** / **Defer to spec**

Apply dispositions:
- **Prototype edits** via `Edit`. Inline spot-check post-edit against `reference/eval-rubric.md` (no Phase 6 re-loop).
- **Wireframe edits** via `Edit` to the wireframe file directly.
- **Req-doc edits** append a `## Prototype Findings` subsection with the change.

Log every applied change in `{feature_folder}/prototype/prototype-findings.md`.

**Cap total findings surfaced at 12.** Highest severity first (high → medium → low). The rest go to `prototype-findings.md` under "Unsurfaced findings".

**Platform fallback:** numbered findings table with disposition column; do NOT silently self-fix.

**Anti-pattern:** A wall of prose ending in "Let me know what you'd like to fix." Always structure the ask.

**Edge cases of structured asks:** when a user reply slips outside the offered options (free-form text, a non-recommended pick that may break an invariant, or leftover findings that don't share a category), follow `../_shared/structured-ask-edge-cases.md`.

---

## Phase 9: Generate Landing Index + Serve

### 9a. Generate `index.html`

Create `{feature_folder}/prototype/index.html`:
- Header: feature name, generation date, link back to req doc + wireframes folder
- Device tabs/cards: one per device file with device name, screen count, mock-data summary, "Open prototype" button (links to `index.<device>.html`)
- Friction-pass summary: counts of high/medium/low flags per journey
- Findings summary: counts by disposition from Phase 8
- Footer: file count, prototype folder path, AND a "Deviations" section that renders the contents of `{feature_folder}/prototype/.deviations.md` if the file exists (Phase 3/4b/4c inline-mode entries, Phase 5d analytical-only smoke banner, Phase 7 analytical-only friction banner). Silently omitting `.deviations.md` from the index is a contract violation.
- Loads `assets/prototype.css` only (no React — pure static landing page; must work offline as `file://`)

### 9b. Serve

Detect Node:

```bash
command -v node && command -v npx
```

- **Node available:** start a static server in a subshell so cwd is bound to the prototype folder for the server's entire lifetime (a separate `cd …` then `npx http-server` from a follow-up Bash call serves `~`, not the prototype, and returns confusing 200s for nonexistent paths):

  ```bash
  PORT=8765
  ( cd "{feature_folder}/prototype" && nohup npx --yes http-server -p "$PORT" -c-1 > /tmp/proto-server.log 2>&1 & )
  sleep 1

  # MANDATORY smoke before announcing the URL — confirms the server is bound to the right cwd
  curl -sI "http://localhost:$PORT/index.html" | head -1
  # Expected: HTTP/1.1 200 OK   (anything else → wrong cwd or port collision)

  # Optional second smoke: confirm a device file resolves
  curl -sI "http://localhost:$PORT/index.{first_device}.html" | head -1
  # Expected: HTTP/1.1 200 OK
  ```

  If the smoke returns anything other than `200 OK`, kill the server (`pkill -f "http-server -p $PORT"`), pick a different port, and retry. Only announce the URL after the smoke passes.

- **Node missing:** print absolute `file://` path. Note: the inline-data fallback in Phase 5 makes `file://` work even when fetch is blocked.

Always print BOTH a served URL (if any) AND the file path so the user has a fallback.

---

## Phase 10: Spec Handoff

> **`--update-handoff` mode:** if invoked as `/prototype --update-handoff`, skip Phases 1–9 entirely. Read the existing prototype folder, regenerate ONLY this section of the requirements doc to reflect the current on-disk state (current screen list, current device files, current finding counts), then exit. Use this after manual edits to the prototype to re-sync the req-doc reference without rebuilding anything. The mode requires that the req doc already has a `## Prototype` section to overwrite.

Append (or replace under `--update-handoff`) to requirements doc:

```markdown
## Prototype

Generated: {YYYY-MM-DD}  (last sync: {YYYY-MM-DD-HH-MM} via /prototype{ --update-handoff if applicable})
Folder: `{relative_path_to_prototype}`
Index: `{relative_path}/index.html`
Devices: {device-list}
Mock data: {N} entities, ~{record_count} records total
Findings: `{relative_path}/prototype-findings.md`
Friction pass: `{relative_path}/interactive-friction.md`

> ℹ This section is a snapshot of the prototype as of the **last sync** timestamp above. After manual edits to the prototype (adding screens, dropping components, renaming fields), this snapshot drifts. Re-run `/prototype --update-handoff` to re-sync without regenerating the prototype itself.

| # | Screen | Devices | File |
|---|--------|---------|------|
| 01 | … | … | linked from `index.<device>.html` |
```

Commit:

```bash
git add {feature_folder}/prototype/ {requirements_doc_path}
git commit -m "docs: add prototype for <feature>"
```

Tell the user: "Prototype is ready. Open `{served_url_or_file_path}` to review. When you're ready, run `/pmos-toolkit:spec` — it picks up the prototype findings from the requirements doc automatically."

---

## Phase 11: Workstream Enrichment

**Skip if no workstream was loaded in Phase 0.**

The four-field navigation contract under `## Wireframes & Design System` (`target_app`, `design_md_path`, `components_md_path`, `last_extraction_sha`) is **managed by `/wireframes` and `/verify` only**. `/prototype` reads these fields in Phase 1.5 but never writes them.

The only field `/prototype` may write to the workstream is `target_app.path` if it's missing entirely — that's a one-time bootstrap, never a re-write.

**Do NOT write** brand colors, typography, modal style, latency tuning, or recurring interaction patterns into `## Tech Stack` / `## Design System / UI Patterns`. Those facts are canonical in DESIGN.md (`x-interaction`, `x-content`, etc.). Duplicating creates drift.

**`## Constraints & Scars`** is read-only from this skill. If a prototype run surfaces a genuinely new and reusable constraint (e.g. "this device family always needs portrait-only support" — cross-feature, not one-off), surface it as a Phase 8 finding with disposition "Update workstream scars" and let the user explicitly approve. Never auto-write.

**`## Domain Notes`** can still receive mock-data realism heuristics that proved reusable (e.g. "ZIP codes for this domain need leading-zero handling"). This is not design-system content; it's domain knowledge. Keep this enrichment.

This phase is mandatory whenever Phase 0 loaded a workstream — do not skip it just because the core deliverable is complete.

---

## Phase 12: Capture Learnings

**This skill is not complete until the learnings-capture process has run.** Read and follow `learnings/learnings-capture.md` (relative to the skills directory) now. Reflect on whether this session surfaced anything worth capturing — surprising mock-data realism issues, latency calibration that worked, friction thresholds that need adjustment, a runtime pattern that broke in a specific browser, a `file://` portability gotcha, an atom that turned out to be reusable across features. Proposing zero learnings is a valid outcome for a smooth session; the gate is that the reflection happens.

---

## Anti-Patterns (DO NOT)

- Do NOT generate prototype without confirmed wireframes — auto-trigger `/wireframes` if missing
- Do NOT regenerate mock data per device file — generate once in Phase 3, share across all
- Do NOT silently fix high-severity findings — always surface via Findings Presentation Protocol
- Do NOT exceed 2 refinement loops per device file — diminishing returns
- Do NOT prototype non-user-facing features (backend-only, cron jobs, internal APIs) — recommend skipping
- Do NOT introduce build steps, npm packages, bundlers, or any backend
- Do NOT inline `runtime.js` or `components.js` into device files — share via `assets/`
- Do NOT use Lorem ipsum or generic mock data ("User 1", "Item A") — must be domain-real
- Do NOT cherry-pick screens — full coverage is the contract; if user wants partial, run `/wireframes` with narrower scope first
- Do NOT re-run PSYCH or MSF — those are `/wireframes` responsibilities; this skill runs the lighter friction pass
- Do NOT skip Phase 12 (capture learnings) — terminal gate
- Do NOT generate prototypes that fail on `file://` — always emit inline-data fallback alongside JSON files
- Do NOT exceed 5 journeys in the friction pass — diminishing returns and reviewer fatigue
- Do NOT auto-edit upstream wireframes or req doc without explicit user disposition in Phase 8
- Do NOT skip Phase 2 tier gate — Tier 1 features must be turned away politely with a `/spec` recommendation
- Do NOT add a separate interactive-prompt gate around per-finding fixes if Phase 8 already handled them
- Do NOT use `@import url(...)` for fonts or any external resources — breaks `file://` portability
- Do NOT use `console.log` / `console.error` / `console.warn` in generated screen code — debug logs are findings, not features
- Do NOT bootstrap DESIGN.md from `/prototype` directly — when DESIGN.md is missing, Phase 1.5 either offers the targeted-bootstrap handoff to `/wireframes --bootstrap-design-only` (when wireframes exist) or aborts cleanly (when they don't). Bootstrap responsibility lives in `/wireframes` exclusively, but `/prototype` is allowed to invoke it via the codified handoff prompt
- Do NOT regenerate `design-overlay.css` if a fresh one exists in the wireframes folder — copy it instead. Within a feature, wireframes and prototype must use the same overlay (avoids visual drift between the two artifacts)
- Do NOT treat `x-interaction` as advisory — Phase 4c subagent and Phase 6 reviewer enforce it as a contract. Modal style, dismiss paths, destructive confirmation, focus trap, shortcuts must match literally
- Do NOT write design-system content (colors, typography, modal style, interaction patterns) into the workstream — those live in DESIGN.md / COMPONENTS.md (canonical). Phase 11 only writes `target_app.path` if missing
- Do NOT keep the legacy `house-style.json` codepath alive — Phase 4d is rewritten to consume `design-overlay.css` + `design-tokens.js`. The legacy `reference/styles-derivation.md` is superseded
- Do NOT load `design-tokens.js` after `runtime.js` or `components.js` — tokens must be on `window.__designTokens` before runtime/components evaluate, or atoms get `undefined` lookups

---

## Apply comment-resolver edit (FR-22, FR-30, FR-60)

This phase is the `/prototype` entrypoint that `/comments resolve` (T10) dispatches into when walking open threads in a prototype artifact's `.comments.json` sidecar. The contract — input/output JSON shapes, closed `error_enum` set, idempotency rules, subagent invocation convention — lives in the shared contract doc and is the single source of truth:

- **Contract (normative):** `plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md` (T6).

Per [NFR-08](../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#nfr-h), this phase MUST cite that file rather than restate the contract. Anything below is `/prototype`-specific implementation guidance only.

### When invoked

The resolver dispatches a subagent with the §9.1 input JSON. The subagent's tools include this skill's Node shim:

- **Shim:** `plugins/pmos-toolkit/skills/prototype/scripts/apply-edit-at-anchor.js` — exports `apply(input)`, returns one of the three output shapes (success / failure / clarification) per §9.1.

### Applyable vs infeasible edits (prototype-specific)

/prototype emits a single per-device HTML file with embedded React via CDN + simulated API.

- **Applyable:** textual/HTML edits inside `<section>` regions (screen descriptions, copy, notes).
- **Infeasible:** edits inside `<script type="text/babel">` JSX blocks or the simulated mock-data block — those require regeneration via `/prototype`. The shim returns `agent_judged_infeasible` with `system_reply: "Cannot apply: edit targets JSX script block or simulated mock-data. Regenerate the prototype via /prototype to apply structural React or data changes."`.

### Comments meta tag (FR-01, FR-40) + asset substrate (FR-10)

Every generated per-device HTML file (`index.<device>.html`) MUST include `<meta name="pmos:skill" content="prototype">` in `<head>`. The `/comments` resolver routes apply-edit dispatches via this meta tag.

**Asset substrate:** copy the inline-doc-comments substrate alongside the existing prototype assets:

```bash
cp -n  "${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/comments.js"          "{feature_folder}/prototype/assets/"
cp -n  "${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/comments.css"         "{feature_folder}/prototype/assets/"
install -m 0755 "${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/comments-open.command" "{feature_folder}/prototype/assets/comments-open.command"
install -m 0755 "${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/comments-open.sh"      "{feature_folder}/prototype/assets/comments-open.sh"
cp -n  "${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/comments-open.bat"    "{feature_folder}/prototype/assets/comments-open.bat"
```

### Resolution order

Per the contract:

1. **id-first.** If `anchor.id_anchor` is set, locate `id="<id>"` in the artifact HTML. Match → success path, `strategy: "id-first"`, `score: 1.0`.
2. **quote-fallback.** Otherwise (or on id miss), substring-contains match `anchor.quote_anchor.text` (≥40 chars) against the candidate's text content. First exact substring hit wins.
3. **Neither hits** → emit `{ success: false, error_enum: "anchor_orphaned" }`; do NOT mutate the artifact.

### Closed error_enum

Authoritative list in [§9.2](../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#api-error-enum) / the contract doc:

`anchor_orphaned`, `edit_conflicted`, `agent_judged_infeasible`, `agent_errored`.

### Idempotency (§9.3) — local choice

The shim returns the **`diff_ref` substring** form for no-ops:

```json
{ "success": true, "diff_ref": "no-op: edit already applied", "system_reply": "Edit already present in artifact; marking resolved without changes." }
```

### Tests

- Per-skill contract: `plugins/pmos-toolkit/skills/prototype/tests/apply-edit-at-anchor.test.js` (5 cases: id-first happy, orphan, idempotent, infeasible, clarification).
- Wrapper: `tests/scripts/assert_apply_edit_at_anchor_prototype.sh`.
