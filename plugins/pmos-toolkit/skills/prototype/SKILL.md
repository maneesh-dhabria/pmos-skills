---
name: prototype
description: Generate a high-fidelity, single-HTML-per-device interactive prototype (React via CDN + JSX, simulated API calls, domain-real LLM-generated mock data) that stitches all wireframe screens into walkable user journeys. Optional bridge between /wireframes and /spec in the requirements -> spec -> plan pipeline. Tier 1 skip; Tier 2 optional; Tier 3 mandatory. Inherits from wireframes (visual reference, IA, copy) and produces forms, CRUD, navigation, loading/error states without any backend or build step. Self-evaluates with a reviewer subagent (≤2 loops per device file) and runs an interactive friction pass measuring clicks/keystrokes/decisions per journey. Use when the user says "create a prototype", "make this clickable", "high-fi mockup", "stakeholder demo", "interactive prototype", "prototype this feature", or has wireframes ready and wants stakeholders to experience the flow before /spec.
user-invocable: true
argument-hint: "<path-to-requirements-doc or feature description> [--feature <slug>] [--update-handoff] [--non-interactive | --interactive]"
---

# Prototype Generator

Produce a single-HTML-per-device interactive prototype that stitches wireframe screens into walkable user journeys with simulated API calls, mock data, and full client-side interactivity. Output is high-fidelity (real brand colors, typography, no annotation chrome) but unmistakably NOT the real product (no backend, in-memory only, mock data). This is an OPTIONAL stage that sits between wireframes and spec for user-facing features:

```
/requirements  →  /wireframes  →  [/prototype]  →  /spec  →  [/simulate-spec]  →  /plan  →  /execute  →  /verify
                                  (this skill, optional)
```

A prototype is an experiment, not a deliverable: it exists to answer a question — typically "will stakeholders buy this flow before we commit to /spec?" — and `#locate-inputs` makes that question explicit. Skip this skill for backend-only or API-only features.

**Single-HTML-per-device** is the scope fence: the prototype is a stakeholder-confidence and design-validation artifact, not the implementation. No build step, no npm packages, no backend — the user can email the folder to a stakeholder and it works.

**Announce at start:** "Using the prototype skill to generate an interactive prototype for this feature."

## Flags & natural language

Every option also has a natural-language form — infer it from the request; an explicit flag overrides. Canonical phrasings: "prototype this for mobile only" ≡ device pre-selection, "re-sync the prototype handoff" ≡ `--update-handoff`. One flag stays parsed for back-compat but is deliberately not advertised:

<!-- nl-sugar -->
- `--devices=desktop-web,mobile-web,...` — pre-selects target devices; `#tier-gate` step 2 confirms (or infers) the device list anyway (default = wireframes' devices).

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:
- **No interactive prompt tool:** State your assumption (default devices = wireframes' device list; default scope = all wireframe screens; mock data = use as generated; layout anchor = first declared in DESIGN.md or none if none exist), document it in the output's `index.html`, and proceed. For `#design-context` staleness prompts, default to "Use as-is" and note the staleness in the index footer.
- **No subagents:** Generate sequentially in the main agent; run review and friction passes inline.
- **No background processes:** Skip the local server and print the absolute `file://` path to `index.html`.
- **No Playwright MCP:** the `#generate-devices` runtime smoke runs in degraded analytical-only mode, AND the prototype's landing `index.html` MUST display a "not runtime-smoked — verify in a real browser before sharing" banner. The `#friction-pass` also runs in analytical-only mode.

## Track Progress

Create one task per phase using your agent's task-tracking tool (e.g., `TodoWrite` in Claude Code, equivalent in other agents). Mark each task in-progress when you start it and completed as soon as it finishes — do not batch completions.

---

## Phase 0: Pipeline Setup (inline — do not skip) {#pipeline-setup}

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
   - The defer-only tag, if present, is the literal previous non-empty line: `<!-- defer-only: <reason> -->` where `<reason>` ∈ {`destructive`, `free-form`, `ambiguous`} (FR-02.5).
   - Decision (in order): tag adjacent → DEFER; multiSelect with 0 Recommended → DEFER; 0 options OR no option label ends in `(Recommended)` → DEFER; else AUTO-PICK the (Recommended) option (FR-02.2).

3. **Buffer + flush.** Maintain an append-only OQ buffer in conversation memory. On each AUTO-PICK or DEFER classification, append one entry per the schema in spec §11.2. At end-of-skill (or in a caught error before exit), flush (FR-03):
   - Primary artifact is single Markdown → append `## Open Questions (Non-Interactive Run)` section with one fenced YAML block per entry; update prose frontmatter (`**Mode:**`, `**Run Outcome:**`, `**Open Questions:** N` where N counts deferred only — see FR-03.4) (FR-03.1).
   - Skill produces multiple artifacts → write a single `_open_questions.md` aggregator at the artifact directory root; primary artifact's frontmatter `**Open Questions:** N — see _open_questions.md` (FR-03.5).
   - Primary artifact is non-MD (SVG, etc.) → write sidecar `<artifact>.open-questions.md` (FR-03.2).
   - No persistent artifact (chat-only) → emit buffer to stderr at end-of-run as a single block prefixed `--- OPEN QUESTIONS ---` (FR-03.3).
   - Mid-skill error → flush partial buffer under heading `## Open Questions (Non-Interactive Run — partial; skill errored)`; set `**Run Outcome:** error`; exit 1 (E13).

4. **Subagent dispatch.** When dispatching a child skill via Task tool or inline invocation, prepend the literal first line: `[mode: <current-mode>]\n` to the child's prompt (FR-06).

5. **Call-site auditing (CI only).** This runtime classifier reads the call it is about to make — it does not run awk. Static/offline auditing of `AskUserQuestion` call sites across SKILL.md files is performed by `tools/audit-recommended.sh`, which sources the shared call-site extractor from Section D of this file (`_shared/non-interactive.md`). Runtime and audit therefore share one decision contract without inlining the extractor into every skill (FR-02.6).

6. **Refusal check.** If this SKILL.md contains a `<!-- non-interactive: refused; ... -->` marker (regex: `<!--[[:space:]]*non-interactive:[[:space:]]*refused`), and `mode` resolved to `non-interactive`: emit refusal per Section A and exit 64 (FR-07).

7. **Pre-rollout BC.** If the `--non-interactive` argument is present BUT this SKILL.md does NOT contain the `<!-- non-interactive-block:start -->` marker (i.e., this skill hasn't been rolled out yet): emit `WARNING: --non-interactive not yet supported by /<skill>; falling back to interactive.` to stderr; continue in interactive mode (FR-08).

8. **End-of-skill summary.** Print to stderr at exit: `pmos-toolkit: /<skill> finished — outcome=<clean|deferred|error>, open_questions=<N>` (NFR-07).
<!-- non-interactive-block:end -->

## Phase 1: Locate Inputs & Frame the Question {#locate-inputs}

1. **Find the requirements doc.** Follow `_shared/resolve-input.md` with `phase=requirements`, `label="requirements doc"`. Accept either a path or inline feature description.
2. **No requirements doc found?** Stop and trigger `/wireframes` (which will trigger `/requirements` if needed): tell the user "Prototype needs requirements + wireframes. Running `/wireframes` first.", hand off to `/pmos-toolkit:wireframes` with the original ask, and resume once both docs exist.
3. **Find the wireframes folder.** Default location: `{feature_folder}/wireframes/`. Check for `index.html` and at least one `NN_*.html` file. Missing → trigger `/pmos-toolkit:wireframes` (announce, hand off, resume).
4. **Read inputs end-to-end:** req doc (user journeys, business rules, entity model, tier tag); wireframes (`index.html` inventory matrix, each `NN_*.html` for layout, copy, visible fields, state list); `wireframes/assets/design-overlay.css` if present (reused as the prototype's CSS overlay in `#design-context`; otherwise regenerated from DESIGN.md).
5. **State the question this prototype must answer** (1–2 sentences: which journeys/decisions are at stake — e.g., "is the 4-step onboarding too heavy for first-run users?"). Scope, review rigor (`#review`), and friction journeys (`#friction-pass`) follow from it; the default is full wireframe-screen coverage.
<!-- defer-only: ambiguous -->
6. **Confirm understanding.** Summarize the question, the journeys to be made interactive, and the device list. Ask via `AskUserQuestion` (≤4 batched). Platform fallback: numbered list + free-text confirmation.

**Gate:** do not proceed until the user confirms the question and the journey/device list.

---

## Phase 2: Resolve DESIGN.md & Composition Context {#design-context}

`/prototype` consumes the same canonical design artifacts as `/wireframes` and `/verify`: DESIGN.md (visual identity + `x-interaction` + `x-content`), COMPONENTS.md (component-library inventory), `design-overlay.css` (CSS variable overlay), and a `design-tokens.js` (JS-shaped tokens for JSX imports).

Detailed procedure: `reference/design-artifact-resolver.md`. Summary:

1. **Resolve DESIGN.md** via `wireframes/reference/design-md-resolver.md` (target app → file walk → `x-extends` cascade → staleness check).

   **If no DESIGN.md is found:** check whether wireframes already exist at `{feature_folder}/wireframes/` (`index.html` + at least one `NN_*.html`).

   <!-- defer-only: ambiguous -->
   - **Wireframes EXIST:** offer a targeted bootstrap via `AskUserQuestion`:
     > **Question:** "DESIGN.md is missing but wireframes already exist. How do you want to bootstrap the design system?"
     > **Options:**
     > - **Bootstrap DESIGN.md + COMPONENTS.md only via /wireframes targeted handoff (Recommended)** — runs only `/wireframes`' `#resolve-design-md` + `#composition-context` phases; no wireframe regen; takes ~2 min.
     > - **Re-run full /wireframes** — regenerates all wireframes too; takes ~30 min; use when wireframes are also stale.
     > - **Abort** — cancel /prototype; you'll bootstrap manually.

     If user picks the targeted handoff, hand off to `/pmos-toolkit:wireframes` with this codified prompt VERBATIM:

     ```
     --bootstrap-design-only
     Feature folder: {feature_folder}
     Existing wireframes: {feature_folder}/wireframes/
     Goal: produce {target_app}/DESIGN.md and {target_app}/COMPONENTS.md ONLY.
     Run only wireframes/SKILL.md#resolve-design-md (DESIGN.md extraction —
     honor its confirm gate) and wireframes/SKILL.md#composition-context
     (COMPONENTS.md load/create); skip every other phase. COMPONENTS.md MUST
     enumerate only components present in the host frontend; do NOT propose
     feature-specific components (those are /prototype's output).
     ```

     Resume `#design-context` from step 2 once `/wireframes` returns.

   - **Wireframes do NOT exist:** abort with "DESIGN.md not found and no wireframes either. Run `/wireframes` first to produce wireframes + DESIGN.md, then re-run `/prototype`." Do NOT auto-bootstrap; that's `/wireframes`' responsibility.
2. **Resolve `design-overlay.css`:** if `{feature_folder}/wireframes/assets/design-overlay.css` exists AND is at least as fresh as DESIGN.md → copy to `{feature_folder}/prototype/assets/design-overlay.css` (within a feature, wireframes and prototype must share the same overlay — avoids visual drift). Otherwise → regenerate from DESIGN.md via `wireframes/reference/design-md-to-css.md` directly into the prototype folder.
3. **Generate `design-tokens.js`** via `reference/design-md-to-tokens-js.md` → `{feature_folder}/prototype/assets/design-tokens.js`. Always regenerated; cheap; never reused.
4. **Load COMPONENTS.md** from the same dir as DESIGN.md (warn if absent — `/verify` populates it on the next implementation pass).
5. **Pick layout anchor** from `x-information-architecture.layouts`: inherit from `{feature_folder}/wireframes/.layout-anchor` marker file if present and still valid (announce: "Inheriting layout anchor `<name>` from /wireframes").
   <!-- defer-only: ambiguous -->
   Else `AskUserQuestion` (single-select). Persist choice to `{feature_folder}/prototype/.layout-anchor`.
6. **Assemble decision context** by concatenating workstream `## Constraints & Scars` + DESIGN.md `## Anti-patterns` + `## Do's and Don'ts`.

Output: in-memory `merged_design_md`, `components_inventory`, `layout_anchor`, `decision_context` — passed to `#shared-runtime`, `#generate-devices`, `#review`. On disk: `design-overlay.css` and `design-tokens.js` in `{feature_folder}/prototype/assets/`.

**Subagents:** if available, dispatch one read-only subagent for DESIGN.md resolution + token generation. Otherwise inline.

<!-- defer-only: ambiguous -->
**Gate:** none for fresh DESIGN.md; user must respond to the staleness AskUserQuestion if the file is stale.

---

## Phase 3: Tier Gate & Scope Confirmation {#tier-gate}

1. **Tier gate.** Read the tier from the req doc and carry it forward; boundary semantics, detection signals, and the untagged-entry ask-fallback live in `_shared/tier-matrix.md`. This skill's gating:
   - **Tier 1:** stop — "Tier 1 features rarely need a prototype. Recommend running `/spec` directly." Exit cleanly. (If the user explicitly insists on a prototype anyway, proceed.)
   <!-- defer-only: ambiguous -->
   - **Tier 2:** ask via `AskUserQuestion` — "Tier 2 detected. Run /prototype now? Adds ~1 hr; produces interactive prototype for stakeholder review." Options: **Run now (Recommended)** / **Skip — proceed to /spec**. Platform fallback: state assumption "Skipping /prototype for Tier 2 unless you ask for it" and exit.
   - **Tier 3:** announce "Tier 3 detected — /prototype is mandatory. Proceeding."
2. **Scope confirmation.** Print the screen × device matrix:

   ```
   | # | Screen | Slug | Devices | Source wireframe |
   ```

   <!-- defer-only: ambiguous -->
   Confirm via `AskUserQuestion` (batch ≤4): device list (multiSelect; default = wireframes' devices, seeded by any explicit `--devices` value or natural-language pre-selection) and interactivity baseline (multiSelect; default = all four — navigation, forms, CRUD, loading/error/empty). Platform fallback: print defaults, announce assumptions, proceed.

**Gate:** user confirms scope before `#mock-data`.

---

## Phase 4: Generate Mock Data {#mock-data}

Use `reference/mock-data-prompt.md` as the prompt template.

1. **Extract visible-field summary** from wireframes. Grep across `wireframes/*.html` for `<th>`, `<label>`, `<dt>` text and any `data-field` attributes. Build `{screen, fieldsShown: [...], approxRowCount: N}`.
2. **Dispatch ONE subagent** with the prompt template (verbatim), full requirements doc text, the visible-field summary, the workstream domain hint if `#pipeline-setup` loaded one, and output folder `{feature_folder}/prototype/assets/`.

   **Subagent dispatch is the prescribed path** — here and for the `#shared-runtime` generators. Inline generation is permitted ONLY when (a) the platform doesn't support subagents at all, OR (b) the parent agent already has full domain context AND the total mock-data volume is < 100 records across all entities. If you bypass a prescribed subagent for any other reason, say so in `{feature_folder}/prototype/.deviations.md` (one line: phase + reason); `#index-serve` renders that file in the landing-page footer so stakeholders can see what ran off-spec.
3. **Validate output** before user review: each `<entity>.json` is valid non-empty JSON; no Lorem ipsum (`grep -i 'lorem\|ipsum'`); no `"User N"` / `"Item N"` patterns (`grep -E '"(User|Item|Test) [0-9]+"'`); spot-check 1–2 foreign-key relationships resolve.
<!-- defer-only: ambiguous -->
4. **User review gate** via `AskUserQuestion`:
   - **Question:** "Approve mock data? {entities + counts + 3 sample records each}"
   - **Options:** **Use as generated (Recommended)** / **Edit before continuing** / **Regenerate**
   - "Edit": print absolute paths to JSON files, wait for user, then re-confirm. "Regenerate": prompt for adjustments, re-run subagent **once**. No second regen.
5. Platform fallback: print summary, announce "using as generated", proceed.

---

## Phase 5: Generate Shared Runtime, Components & Styles {#shared-runtime}

1. **Copy the base stylesheet.** Create `{feature_folder}/prototype/assets/`, then `Read` this skill's `assets/prototype.css` and `Write` it to `{feature_folder}/prototype/assets/prototype.css` (when `${CLAUDE_PLUGIN_ROOT}` is set, a plain `cp` from `${CLAUDE_PLUGIN_ROOT}/skills/prototype/assets/prototype.css` works too). Device files link it as `./assets/prototype.css`.
2. **Generate `runtime.js` (subagent).** Dispatch a subagent with `reference/runtime-template.md` as the spec → `{feature_folder}/prototype/assets/runtime.js`. Must implement: hash router, mock-API client (200–800ms latency), in-memory store with pub/sub, mock-data loader (fetch + inline-script fallback), error injection via query param, `useRoute` and `useStore` hooks.
3. **Generate `components.js` (subagent).** Dispatch a subagent with `reference/components-template.md` as the spec → `{feature_folder}/prototype/assets/components.js`, exporting the template's atoms on `window.__protoComponents`. Besides the template, the subagent receives four blocks from `#design-context`:
   1. **The merged DESIGN.md verbatim** — "Tokens are read at runtime via `window.__designTokens`; structural decisions (component variants, voice) read here."
   2. **COMPONENTS.md content** (`components_inventory`) — "Use variant names from COMPONENTS.md. A needed variant missing from the inventory: emit it anyway but flag in the file footer under `/* New variants: <list> */` so the reviewer can confirm."
   3. **The `x-interaction` + `x-content` blocks (mandatory contract)** — "Implement the key-by-key mapping in `reference/components-template.md` §'x-interaction contract' literally; pull values from `window.__designTokens.interaction.*` / `.content.*` at runtime, do not duplicate them inline."
   4. **`decision_context`** — "Honor every anti-pattern listed. If a component must violate one, flag in the file footer with rationale."
   5. **The design-slop floor** at `../_shared/slop-engine/design-slop-rules.md` — "Generated device files must also clear its DON'T lines (the deterministic tells `/verify`'s slop gate checks). Honor the floor; do not restate it."
4. **Apply design overlay + emit thin `styles.css`.** `design-overlay.css` and `design-tokens.js` were already produced in `#design-context` — confirm both exist (if either is missing, return to `#design-context` and regenerate). Then emit a thin `styles.css` (≤30 lines typical) containing ONLY prototype-only utility classes that aren't in `prototype.css` and don't belong in DESIGN.md (mock-data shimmer, scroll-snap overrides, file-protocol fallbacks, device-specifics the overlay doesn't address). Most prototypes need none — emit a one-line comment file in that case. Do NOT duplicate tokens here; the overlay is canonical.

**Subagent dispatch:** steps 2 and 3 are independent — fire 2 parallel subagents in one message when available; step 4 runs inline (it's small). Inline-generation exceptions follow `#mock-data` step 2 (log to `.deviations.md`).

**Validation after step 4:** `design-overlay.css` exists and is non-empty (or header-comment-only if DESIGN.md had no tokens); `design-tokens.js` exists and parses (`grep -q "window.__designTokens" design-tokens.js`); `styles.css` (if non-empty) has balanced braces, no `url(http*)` external URLs, no `@import` statements.

---

## Phase 6: Generate Per-Device HTML Files {#generate-devices}

For each device in the confirmed list, generate `{feature_folder}/prototype/index.<device>.html`.

1. **Extract visible-field summary per screen** — `<th>`, `<label>`, `<dt>`, button text, CTA text per wireframe screen → `{feature_folder}/prototype/.screens-summary.json` for the generator subagents.
2. **Dispatch device generators** (one subagent per device, parallel where possible). Each receives: `reference/device-html-template.md` (skeleton + the strict generator rules — CSS/JS load order, the mandatory Babel IIFE wrap, inline-data fallback, atom usage, screen registration; that file is the single home for those rules, do not paraphrase them here); `.screens-summary.json`; full text of that device's `wireframes/<NN>_*.html` files (visual reference); the req-doc journey list; and the mock-data filenames AND JSON contents (inlined verbatim for the `file://` fallback).
3. **Runtime smoke (MANDATORY).** Static greps can't tell whether the file actually *runs* — Babel-standalone's shared global scope makes an unwrapped `const` collide across blocks and kill the page on first load (full failure-mode rationale: `reference/device-html-template.md` strict rule 0). A real browser load is the only reliable detector. For each `index.<device>.html`:

   **Cheap static checks first (always):**

   ```bash
   # Forbidden patterns
   grep -E 'Lorem ipsum|User [0-9]+|Item [0-9]+|TODO|FIXME|console\.error|console\.log' \
     "{feature_folder}/prototype/index.<device>.html" && echo "FORBIDDEN PATTERN" || echo "OK"
   # Screen count: `Screen` function definitions must match the wireframe inventory count
   ```

   **Then the live smoke — default path (Playwright MCP available):**
   1. Start the static server (the `#index-serve` serve recipe, used here too) and capture the URL.
   2. Load `http://localhost:<port>/index.<device>.html` via Playwright MCP.
   3. Wait up to 5s for `#root` to have at least one child element; read browser console messages.
   4. **Pass criteria (all must hold):** `#root` has ≥1 child within 5s; zero `console.error`; zero uncaught page exceptions; no `SyntaxError`, `ReferenceError`, or `has already been declared` substrings anywhere in console output.
   5. **On failure:** capture the full console output verbatim, send a follow-up to the device's generator subagent with the failure messages, re-run the smoke. Hard cap: 2 smoke retries per device file; still failing → abort with the captured console output and surface as a `#findings` finding tagged `severity: blocker`.

   **Degraded fallback — analytical-only (no Playwright MCP):** run the fuller structural grep set instead — required script/style tags present in the order device-html-template.md fixes (react, babel, `design-tokens.js`, `runtime.js`, `components.js`, `design-overlay.css`); every entity in `<meta name="mock-entities">` has a matching `<script id="mock-*">` inline block; `components.js`/`runtime.js` carry an outer IIFE wrap (`grep -q '^(function () {'` or `'(() => {'`). ALSO emit a banner in the landing `index.html` footer: "⚠ Prototype was not runtime-smoked — verify in a real browser before sharing." Analytical mode is best-effort (it can't catch a duplicate identifier emitted inside two wrapped blocks); never claim "interactive prototype" without the banner when the live smoke was skipped.

---

## Phase 7: Refinement Loop (Reviewer Subagent) {#review}

**Rigor** follows the question and scope confirmed in `#locate-inputs` — announce the choice with rationale:
- **High (default; Tier 3 or 3+ device files):** one reviewer subagent per device file, in parallel.
- **Medium (≤2 device files, or a narrowly-framed question):** ONE cross-file reviewer subagent; apply fixes; no second loop.

**Loop mechanics and the 2-loop cap** follow `_shared/reviewer-protocol.md` (the cap is a cost governor — on cap-hit, surface residuals and continue). Deltas for this skill: reviewers receive the device-file path plus the inputs below — no chrome-strip and no `sections.json` set-equality (prototype device files emit no sections companions).

1. **Dispatch reviewer(s).** Prompt: load `reference/eval-rubric.md` AND, from `#design-context`: DESIGN.md `## Anti-patterns` + `## Do's and Don'ts` (verbatim — score against each); the `x-interaction` block (score against the contract mapping in `reference/components-template.md` §"x-interaction contract" — violations are severity ≥ medium); COMPONENTS.md content (flag off-inventory variants). Score all rubric groups; group **F (Field-Earns-Its-Place)** is mandatory — for every visible data field, the reviewer either names the user decision it anchors or flags it as decoration with a remove/relocate suggestion. Return a JSON findings array; tag each finding `source: "rubric:<id>" | "design-md:antipattern:<n>" | "x-interaction:<key>" | "components-md:<name>"`.
2. **Apply fixes:** high/medium → apply via `Edit` (or have a generator subagent re-emit the affected section); low → log in a `<!-- Known minor issues: ... -->` HTML comment at top of file. Track changes in a `<!-- Review Log -->` comment block.
3. **Continuation:** a second loop runs ONLY when loop 1 produced unresolved hard-fails — contract violations checkable against the `#design-context` blocks (x-interaction contract, missing mandatory empty/loading/error states, off-inventory COMPONENTS.md variants). Advisory/judgment findings (including the rubric's advisory accessibility checks) never trigger loop 2 — log and exit.

**Platform fallback:** run the reviewer pass inline.

---

## Phase 8: Interactive Friction Pass {#friction-pass}

<!-- defer-only: ambiguous -->
Use `reference/friction-thresholds.md`. Pull the journey list from the req doc, prioritized by the `#locate-inputs` question (cap 5). If the req doc has >5 journeys, ask via `AskUserQuestion` (multiSelect) — recommend the most stakeholder-visible ones (signup, first-value, primary daily flow, share/invite, recovery).

**Walk mode (resolve first):** Playwright MCP available → live walk (DEFAULT; metrics observed, not estimated). Unavailable → analytical-only walk (DEGRADED; output MUST carry the analytical-mode banner from `reference/friction-thresholds.md` and must not be presented as equivalent).

For each journey: resolve the screen path (live: actually traverse; analytical: read the route table from `runtime.js`); count clicks, keystrokes, decisions, screen transitions, modal interruptions per step; apply thresholds and flag exceedances with severity. **Live-walk only:** any console error mid-journey is severity high (it would otherwise leak to stakeholders). **Copy check:** button labels and confirmation copy must honor `x-content.voice` and `x-content.buttonVerbs` — mismatched verbs ("Submit" where DESIGN.md says "Save") are severity medium.

**Subagents:** one per journey, parallel where available; in live-walk mode each gets its own Playwright MCP session. **Output:** `{feature_folder}/prototype/interactive-friction.md` per the format in `reference/friction-thresholds.md`.

Do NOT re-run PSYCH or MSF — those are `/wireframes` responsibilities; this pass measures *operational cost*, not motivation/satisfaction.

---

## Phase 9: Findings Presentation Protocol {#findings}

Aggregate `#review` unresolved + `#friction-pass` flags. Present per `_shared/findings-dispositions.md` (severity tags, ≤4-per-batch grouping, non-interactive classification, platform fallback, structured-ask edge cases). Deltas for this skill:

- **Options are routing targets**, grouped by where the fix lands: **Apply to prototype** / **Update wireframe** / **Update req doc** / **Defer to spec**.
- **Apply dispositions:** prototype edits via `Edit` with an inline spot-check against `reference/eval-rubric.md` (no `#review` re-loop); wireframe edits via `Edit` to the wireframe file directly; req-doc edits append a `## Prototype Findings` subsection.
- **Cap total findings surfaced at 12**, highest severity first; the rest go to `{feature_folder}/prototype/prototype-findings.md` under "Unsurfaced findings". Log every applied change in that file too.

---

## Phase 10: Generate Landing Index + Serve {#index-serve}

1. **Generate `{feature_folder}/prototype/index.html`:** header (feature name, generation date, links to req doc + wireframes folder); one card per device file (device name, screen count, mock-data summary, "Open prototype" link); friction-pass summary (flag counts per journey); findings summary (counts by disposition); footer (file count, folder path, AND a "Deviations" section rendering `{feature_folder}/prototype/.deviations.md` if present — inline-generation notes plus any analytical-only smoke/friction banners; omitting it from the index is a contract violation). Loads `assets/prototype.css` only — pure static landing page, must work offline from `file://`.
2. **Serve.** If `command -v node && command -v npx` succeeds, start a static server **in a subshell so cwd is bound to the prototype folder for the server's entire lifetime** — a separate `cd` followed by `npx http-server` in a later Bash call serves `~`, not the prototype, and returns confusing 200s:

   ```bash
   ( cd "{feature_folder}/prototype" && nohup npx --yes http-server -p 8765 -c-1 > /tmp/proto-server.log 2>&1 & )
   curl -sI "http://localhost:8765/index.html" | head -1   # expect HTTP/1.1 200 OK
   ```

   Smoke the URL before announcing it; anything but `200 OK` means wrong cwd or a port collision — kill, pick another port, retry. Node missing → print the absolute `file://` path (the inline-data fallback makes `file://` work even when fetch is blocked). Always print BOTH the served URL (if any) AND the file path.

---

## Phase 11: Spec Handoff {#spec-handoff}

> **`--update-handoff` mode:** if invoked as `/prototype --update-handoff`, skip every other phase. Read the existing prototype folder, regenerate ONLY this section of the requirements doc to reflect current on-disk state (screen list, device files, finding counts), then exit. Use after manual prototype edits to re-sync the req-doc reference without rebuilding. Requires an existing `## Prototype` section to overwrite.

Append (or replace under `--update-handoff`) to the requirements doc:

```markdown
## Prototype

Generated: {YYYY-MM-DD}  (last sync: {YYYY-MM-DD-HH-MM} via /prototype{ --update-handoff if applicable})
Question: {the question from the confirm gate}
Verdict: {what the prototype validated / invalidated; what changed upstream as a result}
Folder: `{relative_path_to_prototype}`
Index: `{relative_path}/index.html`
Devices: {device-list}
Mock data: {N} entities, ~{record_count} records total
Findings: `{relative_path}/prototype-findings.md`
Friction pass: `{relative_path}/interactive-friction.md`

> ℹ This section is a snapshot of the prototype as of the **last sync** timestamp above. After manual edits to the prototype, this snapshot drifts. Re-run `/prototype --update-handoff` to re-sync without regenerating the prototype itself.

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

## Phase 12: Workstream Enrichment {#workstream-enrichment}

**Skip if no workstream was loaded in `#pipeline-setup`.** Otherwise mandatory — do not skip just because the core deliverable is complete.

- The four-field navigation contract under `## Wireframes & Design System` (`target_app`, `design_md_path`, `components_md_path`, `last_extraction_sha`) is **managed by `/wireframes` and `/verify` only** — `/prototype` reads it in `#design-context`, never writes it. The only field this skill may write is `target_app.path` if missing entirely (one-time bootstrap, never a re-write).
- **Do NOT write** brand colors, typography, modal style, latency tuning, or interaction patterns into `## Tech Stack` / `## Design System / UI Patterns` — those facts are canonical in DESIGN.md; duplicating creates drift.
- **`## Constraints & Scars`** is read-only here. A genuinely new, cross-feature constraint surfaced by the run goes through `#findings` with disposition "Update workstream scars" for explicit user approval — never auto-write.
- **`## Domain Notes`** may receive mock-data realism heuristics that proved reusable (e.g. "ZIP codes for this domain need leading-zero handling") — domain knowledge, not design-system content.

---

## Phase 13: Capture Learnings {#capture-learnings}

**This skill is not complete until the learnings-capture process has run.** Read and follow `_shared/learnings-capture.md` (relative to the skills directory) now. Reflect on whether this session surfaced anything worth capturing — mock-data realism issues, latency calibration, friction thresholds needing adjustment, a runtime pattern that broke in a specific browser, a `file://` portability gotcha, a reusable atom. Proposing zero learnings is valid for a smooth session; the gate is that the reflection happens.

---

## Anti-Patterns (DO NOT)

- Do NOT introduce build steps, npm packages, bundlers, or any backend — emailable-folder portability is the artifact's whole premise
- Do NOT use `@import url(...)`, external fonts, or any external resource beyond the React/Babel CDN trio — breaks `file://` portability
- Do NOT use Lorem ipsum or generic mock data ("User 1", "Item A") — fake-feeling data is the #1 stakeholder-credibility failure
- Do NOT re-run PSYCH or MSF — those are `/wireframes` responsibilities; this skill runs the lighter friction pass
- Do NOT silently self-fix high-severity findings — always surface via `#findings` for explicit disposition
- Do NOT write design-system facts (colors, typography, modal style, interaction patterns) into the workstream — DESIGN.md / COMPONENTS.md are canonical

---

## Apply comment-resolver edit

This is the `/prototype` entrypoint that `/comments resolve` dispatches into when walking open threads in a prototype artifact's inline `pmos-comments` JSON block. The contract — input/output JSON shapes, closed `error_enum` set (`anchor_orphaned`, `edit_conflicted`, `agent_judged_infeasible`, `agent_errored`), idempotency rules, anchor-resolution order (id-first → ≥40-char quote substring → `anchor_orphaned`, never mutating on a miss), subagent invocation convention — lives in the shared contract doc and is the single source of truth:

- **Contract (normative):** `plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md`.

This section MUST cite that file rather than restate the contract. `/prototype`-specific implementation only:

- **Shim:** `plugins/pmos-toolkit/skills/prototype/scripts/apply-edit-at-anchor.js` — exports `apply(input)`, returns one of the three contract output shapes (success / failure / clarification). No-ops use the `diff_ref` substring form (`{ "success": true, "diff_ref": "no-op: edit already applied", "system_reply": "Edit already present in artifact; marking resolved without changes." }`).
- **Applyable vs infeasible:** textual/HTML edits inside `<section>` regions (screen descriptions, copy, notes) apply; edits inside `<script type="text/babel">` JSX blocks or the simulated mock-data block return `agent_judged_infeasible` with `system_reply: "Cannot apply: edit targets JSX script block or simulated mock-data. Regenerate the prototype via /prototype to apply structural React or data changes."`.
- **Comments meta tag:** every generated `index.<device>.html` MUST include `<meta name="pmos:skill" content="prototype">` in `<head>` — the `/comments` resolver routes apply-edit dispatches via this tag.
- **Asset substrate** (copied alongside the prototype assets): from `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/`, `cp -n` `comments.js`, `comments.css`, and `comments-open.bat` into `{feature_folder}/prototype/assets/`; `install -m 0755` the `comments-open.command` and `comments-open.sh` launchers there too.
- **Tests:** `plugins/pmos-toolkit/skills/prototype/tests/apply-edit-at-anchor.test.js` (5 cases: id-first happy, orphan, idempotent, infeasible, clarification); wrapper `tests/scripts/assert_apply_edit_at_anchor_prototype.sh`.

---

*Spec lineage: `docs/pmos/features/2026-04-30_prototype-skill` (core pipeline, single-HTML-per-device fence, ≤2 review loops, friction pass), `2026-05-02_design-md-prototype-integration` (DESIGN.md/COMPONENTS.md consumption, `design-tokens.js`, x-interaction contract, targeted `--bootstrap-design-only` handoff, retirement of the legacy `house-style.json` path), the v2.9.0 retro-driven hardening (runtime smoke, Field-Earns-Its-Place rubric group), `2026-05-23_inline-doc-comments` (comment resolver, meta tag, asset substrate), `2026-05-08_non-interactive-mode` (mode block).*
