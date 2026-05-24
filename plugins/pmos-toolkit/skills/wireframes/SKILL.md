---
name: wireframes
description: Generate static HTML wireframes (single-file, mid-fi, Tailwind) for a user-facing feature — covers all screens, components, states, and target devices. Optional bridge between /requirements and /spec (run before /spec when the feature is user-facing). Auto-triggers /requirements if no req doc exists. Extracts a "house style" from the host repo's frontend so wireframes match the app, accepts screenshots (`--screenshots`) as IA anchors, and self-evaluates each file via a reviewer subagent with up to 2 refinement loops. Also emits a single-file Figma-like canvas viewer (`canvas.html`) aggregating every screen of every device on an infinite pan/zoom surface, with flow arrows from DESIGN.md journeys and drag-positionable screens persisted to `canvas.json`. Use when the user says "create wireframes", "mock up the UI", "wireframe this feature", "show all screens on a canvas", "Figma-like view", "extend this existing flow", or has a requirements doc ready and wants visuals before the spec.
user-invocable: true
argument-hint: "<path-to-requirements-doc or feature description> [--devices=desktop-web,mobile-web,...] [--feature <slug>] [--screenshots <path>] [--bootstrap-design-only] [--skip-folded-msf-wf] [--msf-auto-apply-threshold N] [--non-interactive | --interactive]"
---

# Wireframe Generator

Produce static HTML wireframes that visualize every screen, component, and state needed to fulfill a feature's user journeys. Output is mid-fidelity (Tailwind via CDN, neutral palette, real typography, no real images) — looks polished enough to review with stakeholders but clearly not final design. This is an OPTIONAL stage that sits between requirements and spec for user-facing features:

```
/requirements  →  [/wireframes]  →  /spec  →  [/simulate-spec]  →  /plan  →  /execute  →  /verify
                  (this skill, optional)
```

Use this when the feature has meaningful UI surface and the team benefits from seeing the flow before writing technical design. Skip for backend-only or API-only features.

**Design vocabulary** is shared across every wireframe in a feature folder via `assets/wireframe.css` (theme tokens, state-switcher, annotations layer, device frames, and `mock-*` primitives — vocabulary borrowed from `superpowers:brainstorming/visual-companion`; CSS-variable theme discipline borrowed from `claude-plugins-official:frontend-design`). The CSS is copied into each output folder at the start of generation so wireframes remain portable and consistent.

**Announce at start:** "Using the wireframes skill to generate HTML wireframes for this feature."

## `--bootstrap-design-only` mode

Invoked as `/wireframes --bootstrap-design-only` (typically by `/prototype` Phase 1.5 when DESIGN.md is missing but wireframes already exist). In this mode the skill produces ONLY DESIGN.md and COMPONENTS.md — no wireframe HTML, no review loops, no Phase 6 delegation, no Phase 7 polish, no Phase 9–10 enrichment. The user's existing wireframes are not touched.

**Phases that run in this mode:** Phase 0 (workstream context), Phase 2.5 (DESIGN.md, including 2.5c review gate — DO NOT skip the gate), Phase 2.6a (COMPONENTS.md load/create — including 2.6a accept/edit/skip gate). All other phases are skipped.

**COMPONENTS.md scope in bootstrap mode (mandatory):** enumerate ONLY components that exist in the host frontend (`<app_dir>/src/components/` or equivalent). Do NOT propose feature-specific or speculative new components — those belong to `/prototype`'s output (Phase 4c flags new variants in the components.js footer; `/verify` promotes them later). A bootstrap-mode COMPONENTS.md that names components not present in the host frontend is a contract violation.

**Announce at start in this mode:** "Bootstrap-design-only: skipping wireframe regen. Producing DESIGN.md + COMPONENTS.md from the host frontend."

**Exit:** announce path to the two files and return; do NOT trigger downstream phases or commit anything beyond the two files.

For all other invocations, proceed through every phase below as usual.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:
- **No interactive prompt tool:** State your assumption (default device = desktop-web; default scope = all components from the req doc), document it in the output's README, and proceed. The user reviews after completion.
- **No subagents:** Generate wireframes sequentially in the main agent; run the reviewer critique inline rather than dispatching a separate reviewer agent.
- **No background processes:** Skip the local server and print the absolute `file://` path to `index.html` instead.
- **No Playwright MCP:** Note browser-based verification as a manual step for the user.

## Track Progress

This skill has multiple phases. Create one task per phase using your agent's task-tracking tool (e.g., `TodoWrite` in Claude Code, equivalent in other agents). Mark each task in-progress when you start it and completed as soon as it finishes — do not batch completions.

---

## Rigor & Corner-Cut Protocol

This skill is permissive — several phases have a "cheap option" (skip Phase 2.5, fewer Phase 4 loops). Permissiveness is fine; **silent downgrades are not**. The protocol below makes rigor visible.

### Rigor tiers

Pick the tier that matches the work. The tier governs Phase 4 (review loops) and the default density of Phase 2 prompts. Phase 6 (MSF + PSYCH) is delegated to `/msf-wf` — its rigor is governed there, not here.

- **High-rigor (default).** One reviewer subagent per file in parallel; full 2-loop protocol; full Phase 2.5 extraction.
- **Medium-rigor (recommended for ≤ 6 files OR a focused enhancement).** ONE cross-file reviewer subagent (single message, multi-file critique); apply fixes; no second loop. Phase 2.5 still runs in full.
- **Low-rigor (personal-tool, single-user, time-bound only).** Inline grep + read-aloud spot-check against the rubric headings PLUS one mandatory cross-file reviewer subagent (200-word brief: aria coverage on icon-only buttons, focus-visible styles, contrast against dark/light surfaces, high-variance findings across files). The cross-file pass is non-negotiable — it's cheap (~30s) and catches what grep misses.

The user can override the chosen tier at any phase boundary. Default is high-rigor; recommend medium for ≤ 6 files; recommend low only when the user has signaled time-pressure or personal-tool context.

### Announcement rule (non-negotiable)

Whenever you choose the lighter option for a phase, **announce it before doing it** with this format:

> "Choosing [lighter option] for [phase] because [rationale]. Trade-off: [what we lose]. Override?"

The user gets one beat to redirect; if they don't, proceed. Phases that have cheap options and therefore require an announcement when downgraded:

- **Phase 2 scope-triage** — items classified as "skip wireframe" or "comparison only"
- **Phase 2.5** — when skipped despite a host frontend being present
- **Phase 3.5 screenshot ingestion** — when skipped despite screenshots being attached
- **Phase 4 review loops** — when running medium- or low-rigor instead of full

Silently downgrading rigor is a small integrity leak that compounds across phases.

---

## Phase 0: Pipeline Setup (inline — do not skip)

Use workstream context (loaded by step 3 below) — design tokens, brand voice, and prior wireframe conventions live here. Wireframes are commonly produced before /spec, so this skill may create the feature folder.

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

## Phase 1: Locate Requirements

1. **Find the requirements doc.** Follow `../.shared/resolve-input.md` with `phase=requirements`, `label="requirements doc"`. Accept either a path or inline feature description.
2. **No requirements doc found?** Stop and trigger `/requirements` first:
   - Tell the user: "Wireframes need a requirements doc to anchor user journeys. Running `/requirements` first."
   - Hand off to `/pmos-toolkit:requirements` with the user's original ask.
   - Resume `/wireframes` once the req doc is written.
3. **Read the req doc end-to-end.** Extract:
   - User journeys (each step the user takes)
   - Functional requirements that imply UI
   - Non-goals (so you do NOT wireframe out-of-scope flows)
   - Any explicit UX constraints (brand, accessibility tier, device support already declared)
3.5. **Ingest screenshots, if provided.** If the user passed `--screenshots <path>` (one or more times) OR attached images inline, follow `reference/screenshot-ingestion.md`:
   - Copy each image to `{feature_folder}/wireframes/assets/source-screens/`
   - Run vision-extraction per the prompt template in that file
   - Append a section per screenshot to `{feature_folder}/wireframes/assets/source-screens.md`
   <!-- defer-only: ambiguous -->
   - Defer the journey-anchoring `AskUserQuestion` step to the journey-confirmation gate below (so the user reviews journeys and screenshot mappings together)
   - If no screenshots provided, skip this step entirely.
<!-- defer-only: ambiguous -->
4. **Confirm understanding.** Summarize the journeys you'll wireframe AND (if step 3.5 ran) propose anchor mappings between each screenshot and a journey step. Ask the user to confirm both via `AskUserQuestion` (batch ≤ 4 per call, screenshots first then journey list, sequential calls if needed). Update `source-screens.md` "Anchored to" lines per the user's answers. Platform fallback: present journeys + proposed mappings as a numbered list and ask for confirmation in free text.

**Gate:** Do not proceed until the user confirms the journey list.

---

## Phase 2: Component & Device Breakdown

### 2a-pre. Scope Triage (do this first)

Read every item in the requirements doc. For each, classify into one of three treatments:

| Class | Symptom | Treatment |
|---|---|---|
| **Net-new IA / flow** | new screen, new tab, new modal, reshaped chrome | Full wireframe with state matrix |
| **Comparison / before-after** | restyle, remove stripes, change a single visual property | Single-screen "before / after" wireframe (1 file, 2 states) |
| **Trivially specifiable** | data fix, label change, link wiring, refactor | Skip wireframe — note in handoff that /spec proceeds directly |

<!-- defer-only: ambiguous -->
Present the triage table via `AskUserQuestion` (one question per row OR a single multiSelect with labeled rows) so the user confirms classifications before any inventory work. Default recommendations should be visible. Per the Rigor & Corner-Cut Protocol, **announce every "skip wireframe" and "comparison only" classification with rationale** — these are scope-cuts, not silent omissions.

After triage, only the items classed "Net-new IA / flow" or "Comparison / before-after" enter the inventory below. Skipped items get listed in the Phase 8 spec handoff under "Skipped from wireframing — proceed directly to /spec".

### 2a. Component Inventory

From the journeys, derive the design surface. Group into:

- **Screens / pages** — full-viewport destinations (e.g., "Dashboard", "Settings", "Onboarding step 2")
- **Modals / overlays** — temporary surfaces (e.g., "Confirm delete", "Image picker")
- **Reusable components** — surfaces that appear in multiple screens (e.g., "Top nav", "Empty-state card", "Toast")
- **Layouts** — only if multiple screens share a non-trivial chrome that's worth wireframing once

Write the inventory as a numbered list. Each item gets a `slug` (lowercase, hyphenated) — this becomes the filename later.

**For each item, look up matching patterns** in `patterns/README.md`. A screen is typically a composition of patterns (e.g., a "Deals dashboard" = `layout/page-header` + `data-display/stats-dashboard` + `data-display/table` + `feedback/empty-state`). Tag the inventory row with `patterns: [<category>/<file>, ...]`. If no pattern matches a component → tag `patterns: novel` and flag it for explicit human review (the generator should still produce it, but the reviewer subagent should pay extra attention).

### 2b. State Coverage

For each component, enumerate the states it must show. Standard checklist:

- Default / loaded
- Empty (no data yet)
- Loading
- Error / failure
- Success / confirmation
- Edge cases the req doc explicitly calls out (over-limit, partial-permission, etc.)

A wireframe file MUST cover every state for its component — use a state-switcher tab pattern (see `reference/html-template.md`) so reviewers can flip between states in one file.

### 2c. Device Selection

<!-- defer-only: ambiguous -->
Ask the user (`AskUserQuestion`, multiSelect=true) which devices to target:

- desktop-web
- mobile-web
- desktop-app (Electron-like, treat as desktop-web with frame chrome)
- android-app (native patterns: bottom nav, FAB, system bar)
- ios-app (native patterns: tab bar, sheet, large title)

Default offered: whatever the req doc declared. If silent, recommend `desktop-web` + `mobile-web` for any consumer-facing feature.

### 2d. Clarifying Questions

<!-- defer-only: ambiguous -->
Use `AskUserQuestion` (max 4 per call) to resolve genuine ambiguities about scope, IA, or interaction model. Do NOT ask cosmetic questions — those are reviewer-loop concerns. If you have no genuine ambiguities, skip and announce why.

**Gate:** Do not proceed until the user confirms the component inventory, state matrix, and device list. Print the matrix as a table:

```
| # | Component | Slug | Type | States | Devices | Patterns |
|---|-----------|------|------|--------|---------|----------|
```

The `Patterns` column lists the `patterns/<category>/<file>` references for each component. This drives what the generator and reviewer subagents load in Phases 3 and 4 — keep it accurate.

---

## Phase 2.5: Resolve DESIGN.md

> Decimal phase number is intentional — Phase 3 onward keeps existing numbering so external references (other skills, prior conversations) still resolve.

DESIGN.md is the durable, repo-resident brand contract for the target app. This phase **finds** it, or **creates** it on first run, then merges it (resolving `x-extends`) into an in-memory object that the rest of the skill consumes. The legacy in-folder `house-style.json` / `house-style.css` artifacts are gone — DESIGN.md replaces them.

Detailed procedure lives in three reference docs:
- `reference/design-md-spec.md` — schema (base + `x-*` extensions).
- `reference/design-md-resolver.md` — the resolution walk + `x-extends` cascade + staleness check + workstream persistence.
- `reference/design-md-extractor.md` — auto-extraction from a host frontend; interactive elicitation for greenfield.

### 2.5a — Resolve target app

<!-- defer-only: ambiguous -->
Follow `reference/design-md-resolver.md` Step 1 (workstream-first, then frontend detection, then AskUserQuestion if ambiguous). The chosen `app_dir` persists to the workstream `## Wireframes & Design System` section as `target_app.path`.

### 2.5b — Find or create DESIGN.md

Follow `reference/design-md-resolver.md` Step 2 (walk: `<app>/DESIGN.md` → `packages/ui/DESIGN.md` → `<repo-root>/DESIGN.md`).

- **Found** → load it. Resolve `x-extends` per resolver Step 3. Run staleness check per resolver Step 4.
  - **Fresh** → proceed to 2.5c.
  <!-- defer-only: destructive -->
  - **Stale** → AskUserQuestion: **Re-extract** / **Use as-is** / **Abort**. Re-extract runs `reference/design-md-extractor.md` Branch A and rewrites the file (preserving any hand-edited `## Anti-patterns` and `x-content.voice` — diff and confirm before overwrite).
- **Not found** → run `reference/design-md-extractor.md`:
  - **Frontend present** → Branch A (auto-extract).
  - **Greenfield** → Branch B (interactive elicitation, 4 questions).
  <!-- defer-only: ambiguous -->
  - **Monorepo with shared `packages/ui/`** → AskUserQuestion: write to **shared base** (`packages/ui/DESIGN.md`) or **app-specific** (`<app_dir>/DESIGN.md`, with `x-extends` to the shared base if one exists). Recommend shared.

### 2.5c — Confirm with user

<!-- defer-only: ambiguous -->
After load/create, AskUserQuestion:
- **Question:** "Use this DESIGN.md for wireframes?"
- **Options:** **Use as-is** / **Edit before continuing** / **Discard for this run**
- "Edit" → print absolute path; wait for user signal; re-read.
- "Discard" → set `x-source.applied: false` in the file; proceed with `wireframe.css` defaults only (no overlay).

### 2.5d — Generate `design-overlay.css`

Once confirmed, follow `reference/design-md-to-css.md` to produce `{feature_folder}/wireframes/assets/design-overlay.css` from the merged DESIGN.md. This file is regenerated every run.

### 2.5e — Workstream persistence

Update the workstream `## Wireframes & Design System` section per resolver Step 5: `target_app`, `design_md_path`, `components_md_path`, `last_extraction_sha` (only set on extract/re-extract).

### 2.5f — Migration from legacy `## Design System / UI Patterns`

If this is the first DESIGN.md created for this workstream AND the workstream has a non-empty `## Design System / UI Patterns` section (legacy from older `/wireframes` runs):
1. Show the user the existing patterns and the proposed DESIGN.md additions (into `## Anti-patterns` / `## Do's and Don'ts`).
<!-- defer-only: ambiguous -->
2. AskUserQuestion: **Migrate (recommended)** / **Skip migration**.
3. On migrate: append patterns to DESIGN.md, replace the workstream section's body with `→ See DESIGN.md at <path>`.

**Subagents:** if available, dispatch one read-only subagent for extraction. Otherwise inline.

**Gate:** the user must confirm DESIGN.md before Phase 2.6 begins.

---

## Phase 2.6: Resolve Composition Context

DESIGN.md captures visual identity. Phase 2.6 captures **structural composition**: existing components, layout templates, and the decision log. Without this, Phase 3 would generate wireframes that *look* like the app but don't *fit* it.

Output of this phase is three in-memory blobs passed to Phase 3:
- `components_inventory` — from COMPONENTS.md.
- `layout_anchor` — chosen named layout from `x-information-architecture.layouts`.
- `decision_context` — concatenated workstream scars + DESIGN.md anti-patterns.

### 2.6a — Load or create COMPONENTS.md

COMPONENTS.md lives in the same dir as DESIGN.md. Procedure per `reference/components-md-spec.md` ("Extractor procedure"):

- **Found and fresh** (commit SHA matches DESIGN.md's `x-source.sha` ± any `/verify` updates) → load.
<!-- defer-only: destructive -->
- **Found but stale** → offer re-extract via AskUserQuestion: **Re-extract** / **Use as-is**.
<!-- defer-only: ambiguous -->
- **Missing AND host frontend exists** → run the extractor; write to `<dirname design_md_path>/COMPONENTS.md`; AskUserQuestion accept/edit/skip gate (same shape as 2.5c).
- **Missing AND greenfield** → write a stub COMPONENTS.md (header + `_No components yet._`). Don't block.

### 2.6b — Pick a layout anchor

If DESIGN.md `x-information-architecture.layouts` has entries:
<!-- defer-only: ambiguous -->
- AskUserQuestion (single-select): "Which existing layout does this feature follow?"
- Options: each named layout + "None — start fresh"
- Cap at 4; if more, recommend the 3 most common (by call-site count if available, else alphabetical).

The chosen layout name + skeleton (from `x-information-architecture.layouts.<name>.skeleton`) is the `layout_anchor` passed to Phase 3.

**Persist the chosen layout name** to `{feature_folder}/wireframes/.layout-anchor` (single-line text file). This lets `/prototype` Phase 1.5 inherit the anchor without re-asking.

If no layouts are declared, skip — generators infer from DESIGN.md `## Layout` prose.

### 2.6c — Assemble decision context

Build a single text block by concatenating, in this order:
1. Workstream `## Constraints & Scars` (if loaded in Phase 0).
2. DESIGN.md `## Anti-patterns` (if present).
3. DESIGN.md `## Do's and Don'ts`.
4. Workstream `## Design System / UI Patterns` (only if migration in 2.5f was skipped).

This is read-only — Phase 2.6 never writes to the workstream's `## Constraints & Scars` (that needs human judgment).

**Gate:** none — Phase 2.6 is data assembly. Proceed to Phase 3.

---

## Phase 3: Generate Wireframes (Parallel Subagents)

For each `(component × device)` pair in the matrix, generate one HTML file at:

```
{feature_folder}/wireframes/{NN}_{screen-slug}.html
```

Where `NN` is a 2-digit zero-padded sequence number reflecting intended viewing order. The skill controls numbering — start at `01` and increment per screen, following the inventory order. Use a `{screen-slug}` that combines the component slug and device (e.g., `01_dashboard_desktop-web.html`). Supporting assets (CSS, images, thumbnails) live in `{feature_folder}/wireframes/assets/`.

### 3a. Copy shared stylesheet (do this BEFORE any wireframe is generated)

Copy `assets/wireframe.css` from this skill into the output folder so every wireframe can link `./assets/wireframe.css` (relative). Resolve the skill path from `${CLAUDE_PLUGIN_ROOT}` when available; otherwise fall back to the cached plugin path:

```bash
mkdir -p "{feature_folder}/wireframes/assets"
cp "${CLAUDE_PLUGIN_ROOT:-$HOME/.claude-personal/plugins/cache/pmos-toolkit/pmos-toolkit/*/}skills/wireframes/assets/wireframe.css" \
   "{feature_folder}/wireframes/assets/wireframe.css"
```

If the copy fails (path not resolvable), `Read` the skill's `assets/wireframe.css` and `Write` it to the destination. Do NOT inline the contents into individual wireframe files.

### 3b. Generation Protocol

**If subagents are available** (Claude Code): dispatch `general-purpose` subagents in parallel — one per component (NOT per file; a single subagent generates all device variants for its component to keep them visually consistent). Send up to ~5 subagents in a single message. Each subagent receives:
- The component's inventory entry, states, and assigned devices
- Relevant excerpts from the req doc (journeys this component participates in)
- The full HTML template from `reference/html-template.md`
- **Only the pattern files tagged on this component's inventory row** (typically 1–3 files from `patterns/`). Do NOT pass the whole patterns library — it's too large and dilutes attention. The patterns are authoritative: each pattern's "best practices", "common mistakes", and "skeleton" must be respected
- Workstream tech-stack hints if loaded (brand color, type stack — note: most of this now lives in DESIGN.md)
- **The merged DESIGN.md (after `x-extends`) verbatim** as YAML, plus the instruction: "Link `./assets/design-overlay.css` immediately after `./assets/wireframe.css` in every generated file. The overlay handles tokens; honor `## Components` prose for shape patterns and `x-interaction` for behavior."
- **The Phase 2.6 `components_inventory` (COMPONENTS.md content)** with the instruction: "When wireframing a button/input/card/modal/etc., prefer the variant names listed in COMPONENTS.md over inventing new ones. If no matching component exists in the inventory, mock the new component AND flag it in the file footer under 'New components proposed: <list>' so the reviewer can confirm."
- **The Phase 2.6 `layout_anchor`** (named layout + skeleton) with the instruction: "Use this layout shell as the chrome for screen-level wireframes. Modals and overlays are exempt." If `layout_anchor` is "None — start fresh", omit this block.
- **The Phase 2.6 `decision_context`** (workstream scars + DESIGN.md anti-patterns) with the instruction: "Honor every anti-pattern listed. If a wireframe needs to violate one, flag it in the file footer with rationale."
- **If this component has at least one anchored screenshot** (per `source-screens.md`): include only that screenshot's description block (not the whole file) plus the absolute path to the original image. Include the IA-preservation instruction from `reference/screenshot-ingestion.md` ("match layout/IA, may improve states/a11y/copy, must NOT silently reorganize IA"). Components without anchored screenshots receive no screenshot context.
- Strict instruction: produce ONLY the HTML file(s), no commentary

**If subagents are unavailable**: generate sequentially in the main agent.

### File Requirements (every wireframe MUST satisfy)

- One `.html` file per `(component × device)` pair
- Links the shared `./assets/wireframe.css` (copied in step 3a) — do NOT inline the rules from that stylesheet
- Links `./assets/design-overlay.css` **immediately after** `wireframe.css` so DESIGN.md's `:root` overrides take effect (skip the link only if the user chose "Discard for this run" in Phase 2.5c)
- Tailwind via CDN: `<script src="https://cdn.tailwindcss.com"></script>` (used alongside the shared CSS for layout/spacing utilities)
- State-switcher tabs at the top so reviewers flip between states without reload
- Annotations layer (toggleable) explaining non-obvious interactions
- Realistic placeholder copy (not "Lorem ipsum") drawn from the req doc's domain
- Device frame:
  - desktop-web → 1280×800 viewport hint, no chrome
  - mobile-web → 375×812 frame with rounded corners
  - android-app → status bar + bottom nav chrome
  - ios-app → status bar + home indicator + tab bar chrome
  - desktop-app → window chrome with traffic-light buttons
- Accessibility baseline: semantic HTML, focus-visible styles, aria labels on icon-only buttons, contrast ≥ 4.5:1 for text
- Touch targets ≥ 44×44px on mobile/native variants
- A bottom footer with: component name, device, file index, generation date

The full template lives in `reference/html-template.md` — do not deviate from its structure unless the component genuinely needs it.

---

## Phase 4: Self-Refinement (Reviewer Subagent + Loops)

### 4a. Loop-rigor decision (do this before dispatching anything)

Pick the rigor tier per the **Rigor & Corner-Cut Protocol** at the top of this skill:

- **High-rigor (default):** one reviewer subagent per file in parallel; up to 2 refinement loops per file.
- **Medium-rigor:** ONE reviewer subagent across all files (single message, multi-file critique); apply fixes; no second loop. Recommend for ≤ 6 files or a focused enhancement.
- **Low-rigor:** inline grep + spot-check PLUS one mandatory cross-file reviewer subagent (200-word brief: aria-label coverage on icon-only buttons, focus-visible styles, color contrast against dark/light surfaces, high-variance findings across files). The cross-file pass is **non-negotiable** even in low-rigor — grep alone misses contrast, focus-visible rendering, and "wireframe 01 didn't actually change relative to current state" type findings.

**Announce the chosen tier with rationale before proceeding.** Format: "Choosing [tier] for Phase 4 because [reason]. Trade-off: [what we lose]. Override?"

The remainder of this phase describes the high-rigor protocol. Medium- and low-rigor variants follow the same loop structure but with the subagent fan-out reduced as described above.

### 4b. Loop Structure (high-rigor)

For each generated wireframe file, run up to 2 refinement loops. Stop early when the reviewer reports zero issues at severity ≥ medium.

**Step 1 — Dispatch reviewer subagent (parallel where possible):**
- One reviewer subagent per wireframe file
- Prompt: load `reference/eval-rubric.md` AND the pattern files tagged on this component's inventory row (the same files the generator received). Score the file against BOTH the rubric heuristics and the pattern's "best practices" / "common mistakes". Return findings as JSON: `[{source: "rubric:<id>" | "pattern:<file>:<rule>", severity: high|medium|low, finding, suggested_fix}]`. Cross-referencing both sources catches issues that pure heuristics miss (e.g., "destructive action in middle of dropdown menu" is a `dropdown-menu.md` rule, not a generic heuristic).

**Step 2 — Apply fixes:**
- For findings at severity `high` or `medium`: apply the suggested fix via `Edit` (or have a generator subagent re-emit the fixed section)
- For severity `low`: log in the wireframe footer as "Known minor issues" and skip
- Track every change in a `Review Log` HTML comment block at the top of the file

**Step 3 — Decide loop continuation:**
- If high/medium findings remain → run loop 2
- If only low findings or none → exit
- Hard cap: 2 loops per file regardless

**Platform fallback (no subagents):** run the reviewer pass inline — read the file, mentally apply the rubric, log findings, fix.

### Findings Presentation Protocol (cross-file rollup)

<!-- defer-only: ambiguous -->
After all per-file refinement is done, present a cross-file rollup of any unresolved high/medium findings to the user via `AskUserQuestion`:

1. **Group findings by heuristic category** (max 4 per batch — respects the 4-question limit).
2. **One question per finding**:
   - `question`: one-sentence finding + which file(s) it affects + proposed fix
   - `options`: **Fix as proposed** / **Modify** / **Skip** / **Defer**
3. **Batch up to 4 questions per call**; sequential calls for more.
4. **Open-ended findings** (free-form fixes): ask inline as a follow-up.
5. **Platform fallback** (no interactive prompt tool): present findings as a numbered table with disposition column; do NOT silently self-fix.

**Anti-pattern:** A wall of prose ending in "Let me know what you'd like to fix." Always structure the ask.

**Edge cases of structured asks:** when a user reply slips outside the offered options (free-form text, a non-recommended pick that may break an invariant, or leftover findings that don't share a category), follow `../_shared/structured-ask-edge-cases.md`.

---

## Phase 5: Index & Serve

### 5a. Generate `index.html`

Create `{feature_folder}/wireframes/index.html` with:

- Header: feature name, generation date, link back to req doc, and a prominent link to `canvas.html` ("Canvas view (all devices)") which is added by Phase 7 after this index is generated. The link is rendered unconditionally (Phase 7 always emits the file); if a reviewer opens the index before Phase 7 lands, the link 404s briefly — acceptable since Phase 7 follows immediately.
- **Device tabs** at the top — one tab per device targeted; clicking filters the card grid. **When only one device is targeted, omit the device-tabs row entirely** (a single-tab control is visual noise). Document the omission in the index footer ("All wireframes target desktop-web — device filter omitted") so the user knows it was intentional, not forgotten.
- **Card grid** — one card per `(component × device)` pair showing:
  - Component name + device chip
  - State count badge ("4 states")
  - 200×140 px iframe preview of the wireframe (scaled), or a static thumbnail block if iframes prove flaky
  - Click → opens the wireframe in a new tab
- Search box that filters cards by component name
- Footer: total file count, file path of the folder

**The index does NOT include:** state-switcher tabs or annotations toggles. Those live inside each wireframe file (per `reference/html-template.md`). The index is purely a navigation surface — a card grid + filter, nothing else. If a reviewer wants to flip states or toggle annotations, they open the wireframe in a new tab.

Use the same Tailwind CDN approach AND link the shared `./assets/wireframe.css` so the index inherits the same theme tokens, typography, and chrome styles as the wireframe files. The index must work offline as a `file://` URL.

### 5b. Serve

Detect Node:

```bash
command -v node && command -v npx
```

- **Node available**: start a static server in the background:
  ```bash
  cd {feature_folder}/wireframes && npx --yes http-server -p 0 -c-1 --silent
  ```
  Capture the printed port and report `http://localhost:<port>/index.html` to the user.
- **Node missing**: print the absolute `file://` path to `index.html` and tell the user to open it in Chrome. Note that some browsers restrict iframe loading from `file://` — the cards may need to be opened in new tabs instead.

Always print BOTH the served URL (if any) AND the file path so the user has a fallback.

---

## Phase 6: MSF + PSYCH (delegated to /msf-wf)

Wireframes are now generated. Phase 6 hands off to `/msf-wf` for combined MSF + PSYCH analysis with inline edit application.

**Invocation:**
```
/msf-wf {feature_folder}/wireframes --apply-edits
```

**Reviewer-subagent contract (FR-50/51/52, T13a):** /msf-wf reviews each wireframe HTML in the folder. Before passing each wireframe to the subagent, chrome-strip it: `Bash('node ${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/chrome-strip.js {feature_folder}/wireframes/<NN>_<slug>.html > /tmp/msf-wf-<NN>-stripped.html')` (loop over every `*.html` in the wireframes folder). Each subagent invocation receives the stripped HTML inline with the canonical FR-51 template: *"Read this HTML content (the document's `<main>` body — chrome already stripped). First, enumerate every `<section>` id and every `<h2>`/`<h3>` id you can locate — return as `sections_found: [...]`. Then evaluate against the rubric below. For every finding, return `{section_id, severity, message, quote: \"<≥40-char verbatim from source>\"}`."* After each return, run FR-52 validation (hard-fail on per-wireframe miss): (1) read `{feature_folder}/wireframes/<NN>_<slug>.sections.json`; (2) assert `sections_found` set-equality with sections.json `ids[]` — any miss/extra → hard-fail with `[/wireframes] reviewer msf-wf returned sections_found that do not match <NN>_<slug>.sections.json`; (3) for each finding, substring-grep `quote` against the un-stripped source HTML — any miss → hard-fail; (4) "no findings" allowed per-wireframe only if `sections_found` matches AND the rubric permits it. On any hard-fail, abort the wireframe iteration and surface the failure to the user (do NOT silently continue to the next wireframe).

**Behavior:**
- `/msf-wf` runs persona alignment, MSF Pass A (grounded in wireframe DOM), and PSYCH Pass B (per-screen scoring with directional thresholds).
<!-- defer-only: ambiguous -->
- With `--apply-edits`, each finding is presented via `AskUserQuestion` for Fix / Modify / Skip / Defer disposition. Approved findings are applied as inline `Edit` calls to the relevant `.html` files.
- Output: a single `msf-findings.md` co-located with the wireframes folder, containing both the MSF analysis matrix and the PSYCH scoring tables.

**Tier gating:**
- **Tier 1**: skip Phase 6 entirely → jump to Phase 8 (Spec Handoff). Tier 1 wireframes are usually 1–2 screens; MSF/PSYCH overkill.
- **Tier 2 / Tier 3**: Phase 6 is **default-on per D2** (Tier 3) / optional (Tier 2). Skip explicitly via `--skip-folded-msf-wf` (D13).

### Folded-phase contract (per pipeline-consolidation v2.34.0)

This phase is the canonical "folded MSF-wf inside /wireframes" contract per W2. The standalone `/msf-wf` skill remains available; the folded path here is the default trigger when /wireframes runs at Tier 2/3.

#### Pre-apply guard (FR-65)

Before opening the apply-loop on each wireframe HTML:

```bash
git status --porcelain {feature_folder}/wireframes/<NN>_<slug>.html
```

If non-empty: emit `WARNING: <NN>_<slug>.html has uncommitted edits — folded MSF-wf apply-loop will skip auto-apply (per FR-65) for this wireframe to avoid clobbering. Run /wireframes --skip-folded-msf-wf OR commit your edits first.` Skip auto-apply for that wireframe (fall through to manual disposition); continue with critique + per-wireframe finding emission for advisory value.

#### Output slug (D3)

Per-wireframe findings doc is written to `{feature_folder}/wireframes/msf-wf-findings/<wireframe-id>.md` (directory variant of the slug-distinct convention). The legacy combined `msf-findings.md` is no longer written.

#### Per-finding commits (D16)

Each auto-applied finding is its own git commit:

```
wireframes: auto-apply msf-wf finding F<N>
```

Commit body includes `Depends-on: F<M>` when finding F<N> requires F<M> to land first. /complete-dev release-notes recipe (FR-68) consumes this. Commits-as-state is the resume cursor (FR-57).

#### Failure capture (FR-50, M1, D35)

On apply failure, capture `{folded_skill: msf-wf, error_excerpt: <first-200-chars>, ts: <ISO-8601>}` and append to `state.yaml.phases.wireframes.folded_phase_failures[]` per the dedup rule in `feature-sdlc/reference/state-schema.md`. Emit chat line at moment-of-append:

```
WARNING: msf-wf crashed (advisory continue per D11): <error_excerpt>
```

Continue per D11 advisory — folded-phase failures do NOT halt /wireframes. /feature-sdlc Phase 11 surfaces the failures (T12b).

#### Flag handling (Phase 0 parser additions)

`--skip-folded-msf-wf` (boolean) — short-circuits this phase entirely.
`--msf-auto-apply-threshold N` (int, default 80) — overrides the apply threshold.

**Failure handling:**
If `/msf-wf` returns a non-zero state or the user terminates it, this Phase aborts. /wireframes MUST NOT auto-continue to Phase 8. Surface the underlying error to the user; the user can re-run `/msf-wf` manually and then continue with `/spec`.

**Post-delegation verification:**
After /msf-wf returns:
1. Spot-check any wireframes modified during /msf-wf's apply-edits phase against `reference/eval-rubric.md` — do NOT trigger another Phase 4 review-loop.
2. Confirm `{feature_folder}/wireframes/msf-findings.md` exists.

---

## Phase 7: Canvas Aggregation (always-on)

Aggregate every per-device wireframe into a single Figma-like canvas viewer so stakeholders can see the whole feature laid out spatially with flow arrows. Reads the per-device HTML files written by Phase 3 (and any inline edits from Phase 6 /msf-wf), parses DESIGN.md journeys for arrow derivation, and emits two files alongside the existing wireframes:

- `canvas.html` — self-contained viewer (CDN-loaded panzoom + leader-line with SRI). Inlines a `<script type="application/json" id="canvas-data">` block so the viewer works under `file://` without a fetch. Each screen rendered as a sandboxed `<iframe src="<device-file>#<anchor>" sandbox="allow-same-origin" loading="lazy">` — no content duplication; the per-device files remain the source of truth.
- `canvas.json` — canonical layout (positions, dimensions, journey labels) + DESIGN.md-derived arrows. Schema-versioned (`version: 1`). User drags update positions in-memory; the **Save layout** button serializes the current state and triggers a browser download (no dev-server write needed). Commit `canvas.json` to preserve the curated layout across re-runs.

**Invocation:**

```bash
node ${CLAUDE_PLUGIN_ROOT}/skills/wireframes/assets/canvas/build-canvas.js \
  {feature_folder}/wireframes \
  {feature_folder}/wireframes/DESIGN.md
```

Pass an empty string `""` for the second argument when DESIGN.md is not present — arrows fall back to empty; screens still render.

**Success criteria:** `canvas.html` and `canvas.json` exist in `{feature_folder}/wireframes/` after the script returns. The script logs `canvas-aggregator: wrote ... (N screens, M arrows)` to stdout on success.

**Failure handling:** The aggregator is additive — it logs to stderr and exits 0 on any non-fatal condition (missing DESIGN.md, no per-device files, no extractable screens, malformed existing canvas.json). It must never block `/wireframes` from completing. If exit 64 (bad CLI args), surface the error to the user but proceed to Phase 8.

**Idempotency on re-run:** if `canvas.json` already exists, the aggregator preserves user-curated `(x, y)` positions for screens still present; newly-added screens (post-regen) are auto-laid-out below the existing layout; removed screens are dropped. Arrows are always regenerated from DESIGN.md (canonical source).

**Bootstrap-only mode carve-out:** when `/wireframes --bootstrap-design-only` is invoked, Phase 5 does not run (no per-device files produced); Phase 7 therefore also does not run. This is a by-design mode-conditional non-presentation, not a silent skip — it follows directly from the bootstrap-mode contract.

See `reference/canvas-aggregation.md` for the full `canvas.json` schema, the screen-extraction rules, the DESIGN.md journey parser, and the auto-layout algorithm.

**Index link:** also append a row to `{feature_folder}/wireframes/index.html` (generated in Phase 5) linking to `canvas.html` with the label "Canvas view (all devices)" so reviewers find it from the index.

---

## Phase 8: Spec Handoff

Append a `## Wireframes` section to the requirements doc:

```markdown
## Wireframes

Generated: {YYYY-MM-DD}
Folder: `{relative_path_to_folder}`
Index: `{relative_path}/index.html`
Canvas view: `{relative_path}/canvas.html` (Figma-like infinite-canvas aggregator; layout in `canvas.json`)
MSF + PSYCH: `{relative_path}/msf-findings.md` (if Phase 6 ran)

| # | Component | Devices | States | File |
|---|-----------|---------|--------|------|
| 01 | … | … | … | `01_…_desktop-web.html` |
```

Commit:

```bash
git add {feature_folder}/wireframes/ {feature_folder}/msf-findings.md {requirements_doc_path}
# Includes canvas.html + canvas.json from Phase 7 — commit canvas.json so curated layouts persist across re-runs.
git commit -m "docs: add wireframes for <feature>"
```

Tell the user: "Wireframes are ready. Open `{served_url_or_file_path}` to review. When you're satisfied, run `/pmos-toolkit:spec` — it will pick up the wireframes and (if Phase 6 ran) the MSF + PSYCH findings from the requirements doc automatically."

---

## Phase 9: Workstream Enrichment

**Skip if no workstream was loaded in Phase 0.** Otherwise, this phase writes only the **navigation pointers** for the Wireframes & Design System contract — visual content lives canonically in `DESIGN.md` and `COMPONENTS.md`, not the workstream.

Update (or create) the workstream's `## Wireframes & Design System` section with these four fields exactly:

```yaml
target_app:
  path: <app_dir>
  confirmed_at: <YYYY-MM-DD>
design_md_path: <relative path>
components_md_path: <relative path>
last_extraction_sha: <SHA at extraction; only set/update on extract>
```

**Do NOT write** brand color, typography, or recurring component patterns into `## Tech Stack` / `## Design System / UI Patterns` — those facts are canonical in DESIGN.md/COMPONENTS.md. Duplicating them creates drift.

**Device support decisions** still go to workstream `## Constraints & Scars` if they're new and reusable across features (e.g. "no iOS app — never wireframe ios-app"). One-off device choices stay local to the feature folder.

`## Constraints & Scars` is otherwise read-only from this skill — Phase 2.6 reads it; nothing here writes to it automatically. (Migration of an existing `## Design System / UI Patterns` section is handled in Phase 2.5f, not here.)

This phase is mandatory whenever Phase 0 loaded a workstream — do not skip it just because the core deliverable is complete.

---

## Phase 10: Capture Learnings

**This skill is not complete until the learnings-capture process has run.** Read and follow `learnings/learnings-capture.md` (relative to the skills directory) now. Reflect on whether this session surfaced anything worth capturing — surprising behaviors, repeated corrections, non-obvious decisions (e.g., a heuristic that fired repeatedly, a Tailwind pattern that broke on iOS Safari, a device the user always wants but never declares upfront). Proposing zero learnings is a valid outcome for a smooth session; the gate is that the reflection happens, not that an entry is written.

---

## Anti-Patterns (DO NOT)

- Do NOT generate wireframes without a confirmed user-journey list — you'll miss flows or invent ones
- Do NOT use `Lorem ipsum` — it makes reviewers debate the layout instead of the content
- Do NOT use real photographs or finished iconography — wireframes are not visual design
- Do NOT skip the state matrix — a wireframe that shows only the happy path hides the hard work
- Do NOT split a single component across multiple files per state — use the state-switcher tab pattern
- Do NOT exceed 2 refinement loops per file — diminishing returns; defer to user review
- Do NOT silently self-fix high-severity findings without the cross-file rollup question
- Do NOT skip `index.html` even for a single-component feature — it documents the artifact set
- Do NOT generate wireframes for non-user-facing features (cron jobs, internal APIs) — recommend skipping the skill
- Do NOT commit half-finished wireframes — finish all phases before the git commit in Phase 8
- Do NOT skip Phase 6 on Tier 2 or Tier 3 — Phase 6 (delegated to /msf-wf) is mandatory for both (Tier 1 only is exempt)
- Do NOT auto-continue to Phase 8 if /msf-wf returned non-zero in Phase 6 — surface the error and let the user re-run /msf-wf manually
- Do NOT enumerate identical elements separately (5 nav links each at -1) — collapse to one row ("Nav links (5), -5 total")
- Do NOT default the entry-context to High (60) or Low (25) silently — Medium (40) is the unbiased default unless the req doc declares otherwise (this default lives in /msf-wf; if you find yourself overriding it from /wireframes, surface it as user-visible)
- Do NOT blend tokens from multiple host frontends in Phase 2.5 — pick one (user-selected) so wireframes have a coherent visual language
- Do NOT use screenshots as the sole journey source — they augment the requirements doc, they don't replace it; trigger /requirements first if no req doc exists
- Do NOT redesign IA away from an anchored screenshot without explicit user direction — generators may improve states, a11y, and copy, but moving primary actions or restructuring sections needs the user to ask for it
- Do NOT silently downgrade rigor at any phase — the Rigor & Corner-Cut Protocol mandates announcement-with-rationale before choosing a lighter option (skipping subagents, fewer review loops). Silent downgrades compound across phases and erode user trust in the artifact
- Do NOT skip Phase 2.5 (Resolve DESIGN.md) — even if you "know" the tokens. DESIGN.md is the durable artifact other tools (Stitch, Cursor, /verify) consume; not having it is technical debt. Cost is ~1 minute when the file exists; ~5 minutes on first creation
- Do NOT write brand colors, typography, or component patterns into the workstream — those live in DESIGN.md / COMPONENTS.md. The workstream stores only the four navigation fields (`target_app`, `design_md_path`, `components_md_path`, `last_extraction_sha`)
- Do NOT bypass COMPONENTS.md by inventing button/input/card/modal variants — Phase 3 generators must prefer existing variants and flag novel ones explicitly in the file footer
- Do NOT modify the workstream `## Constraints & Scars` from this skill — Phase 2.6 reads it; only humans (or `/verify` with explicit confirmation) write to it
- Do NOT keep the legacy `house-style.json` / `house-style.css` artifacts alive in new feature folders — Phase 2.5 produces `design-overlay.css` from DESIGN.md instead. Old folders' artifacts are left in place but not consulted

---

## Apply comment-resolver edit (FR-22, FR-30, FR-60)

This phase is the `/wireframes` entrypoint that `/comments resolve` (T10) dispatches into when walking open threads in a wireframe artifact's `.comments.json` sidecar. The contract — input/output JSON shapes, closed `error_enum` set, idempotency rules, subagent invocation convention — lives in the shared contract doc and is the single source of truth:

- **Contract (normative):** `plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md` (T6).

Per [NFR-08](../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#nfr-h), this phase MUST cite that file rather than restate the contract. Anything below is `/wireframes`-specific implementation guidance only.

### When invoked

The resolver dispatches a subagent with the §9.1 input JSON. The subagent's tools include this skill's Node shim:

- **Shim:** `plugins/pmos-toolkit/skills/wireframes/scripts/apply-edit-at-anchor.js` — exports `apply(input)`, returns one of the three output shapes (success / failure / clarification) per §9.1.

### Applyable vs infeasible edits (wireframes-specific)

/wireframes emits a subfolder of N per-screen HTML files plus `index.html`. The apply-edit shim only handles textual/HTML edits inside an individual screen file.

- **Applyable:** edits to section content, copy, annotations, state descriptions inside a per-screen `.html` file.
- **Infeasible:** edits to `index.html` structure (`<nav>`, screen list, card grid, reordering screens) — those require regeneration via `/wireframes`. The shim returns `agent_judged_infeasible` with `system_reply: "Cannot apply: edit targets index.html navigation or screen-list structure. Regenerate via /wireframes to restructure across-screen layout."`.

### Comments instrumentation (FR-21) — two emit references

FR-21 counts wireframes as ONE instrumentation surface but with TWO emit references:

1. **Per-screen template** (`reference/html-template.md` skeleton `<head>`): must include `<meta name="pmos:skill" content="wireframes">` and the comments.js/css asset links.
2. **`index.html` template** (Phase 5a generation): must also include `<meta name="pmos:skill" content="wireframes">` and the comments.js/css asset links so threads can be opened on the index too.

**Asset substrate (FR-10):** in addition to the existing `wireframe.css` copy, copy the inline-doc-comments substrate for BOTH the wireframes folder and the index:

```bash
cp -n  "${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/comments.js"          "{feature_folder}/wireframes/assets/"
cp -n  "${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/comments.css"         "{feature_folder}/wireframes/assets/"
cp -n  "${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/diff-match-patch.js"  "{feature_folder}/wireframes/assets/"
cp -n  "${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/LICENSE.dmp.txt"      "{feature_folder}/wireframes/assets/"
install -m 0755 "${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/comments-open.command" "{feature_folder}/wireframes/assets/comments-open.command"
install -m 0755 "${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/comments-open.sh"      "{feature_folder}/wireframes/assets/comments-open.sh"
cp -n  "${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/comments-open.bat"    "{feature_folder}/wireframes/assets/comments-open.bat"
```

**Comments meta tag (FR-01, FR-40):** every generated wireframe file (per-screen AND `index.html`) MUST include `<meta name="pmos:skill" content="wireframes">` in `<head>`. The `/comments` resolver routes apply-edit dispatches via this meta tag.

### Resolution order

Per the contract:

1. **id-first.** If `anchor.id_anchor` is set, locate `id="<id>"` in the artifact HTML. Match → success path, `strategy: "id-first"`, `score: 1.0`.
2. **quote-fallback.** Otherwise (or on id miss), run diff-match-patch Bitap against `anchor.quote_anchor.text`. Accept when the normalized score ≥ 0.7.
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

- Per-skill contract: `plugins/pmos-toolkit/skills/wireframes/tests/apply-edit-at-anchor.test.js` (5 cases: id-first happy, orphan, idempotent, infeasible, clarification).
- Wrapper: `tests/scripts/assert_apply_edit_at_anchor_wireframes.sh`.
