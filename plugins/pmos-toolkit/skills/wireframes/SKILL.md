---
name: wireframes
description: Generate static HTML wireframes (single-file, mid-fi, Tailwind) for a user-facing feature — every screen, component, state, and target device, matched to the host repo's house style (DESIGN.md), plus a single-file Figma-like canvas viewer (canvas.html) aggregating all screens. Optional bridge between /requirements and /spec; auto-triggers /requirements if no req doc exists. Use when the user says "create wireframes", "mock up the UI", "wireframe this feature", "show all screens on a canvas", "Figma-like view", or "extend this existing flow".
user-invocable: true
argument-hint: "<path-to-requirements-doc or feature description> [--feature <slug>] [--screenshots <path>] [--bootstrap-design-only] [--skip-folded-msf-wf] [--non-interactive | --interactive]"
---

# Wireframe Generator

Produce static HTML wireframes that visualize every screen, component, and state needed to fulfill a feature's user journeys. Output is mid-fidelity (Tailwind via CDN, neutral palette, real typography, no real images) — polished enough to review with stakeholders but clearly not final design. This is an OPTIONAL stage between requirements and spec for user-facing features; skip it for backend-only or API-only work:

```
/requirements  →  [/wireframes]  →  /spec  →  [/simulate-spec]  →  /plan  →  /execute  →  /verify
                  (this skill, optional)
```

**Design vocabulary** is shared across every wireframe via `assets/wireframe.css` (theme tokens, state-switcher, annotations layer, device frames, `mock-*` primitives), copied into each output folder so wireframes stay portable and consistent.

**Announce at start:** "Using the wireframes skill to generate HTML wireframes for this feature."

## Flags & natural language

Every option also has a natural-language form — infer it from the request; an explicit flag overrides. Canonical phrasings: "desktop and mobile" ≡ device pre-selection, "skip the UX pass" ≡ `--skip-folded-msf-wf`. Two flags stay parsed for back-compat but are deliberately not advertised:

<!-- nl-sugar -->
- `--devices=desktop-web,mobile-web,...` — pre-selects target devices; `#component-breakdown` step 4 confirms (or infers) the device list anyway.
<!-- nl-sugar -->
- `--msf-auto-apply-threshold N` — confidence override for the folded-MSF-wf apply-loop (default 80; semantics in `_shared/folded-phase.md`).

## `--bootstrap-design-only` mode

Invoked as `/wireframes --bootstrap-design-only` (typically by `/prototype` when DESIGN.md is missing but wireframes already exist). The skill produces ONLY DESIGN.md and COMPONENTS.md — no wireframe HTML, no review loops, no folded MSF-wf, no canvas, no enrichment. Existing wireframes are not touched.

**Phases that run in this mode:** `#pipeline-setup`, `#resolve-design-md` (including its confirm gate — DO NOT skip it), `#composition-context` (COMPONENTS.md load/create). All other phases are skipped.

**COMPONENTS.md scope in this mode (mandatory):** enumerate ONLY components that exist in the host frontend (`<app_dir>/src/components/` or equivalent). Do NOT propose feature-specific or speculative new components — those belong to `/prototype`'s output (its components.js generator flags new variants in the footer; `/verify` promotes them later). A bootstrap-mode COMPONENTS.md naming components not present in the host frontend is a contract violation.

**Announce at start in this mode:** "Bootstrap-design-only: skipping wireframe regen. Producing DESIGN.md + COMPONENTS.md from the host frontend." **Exit:** announce the path to the two files and return; do NOT trigger downstream phases or commit anything beyond the two files.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:
- **No interactive prompt tool:** State your assumption (default device = desktop-web; default scope = all components from the req doc), document it in the output's README, and proceed.
- **No subagents:** Generate wireframes sequentially in the main agent; run reviewer critiques inline.
- **No background processes:** Skip the local server and print the absolute `file://` path to `index.html`.
- **No Playwright MCP:** Note browser-based verification as a manual step for the user.
- **No git or `state.yaml` (outside /feature-sdlc):** in `#folded-msf-wf`, skip per-finding commits and failure capture; record applied findings in the findings doc instead — or skip the phase via `--skip-folded-msf-wf`.

## Track Progress

Create one task per phase using your agent's task-tracking tool (e.g., `TodoWrite` in Claude Code). Mark each in-progress when started and completed as soon as it finishes — do not batch completions.

## Rigor & Corner-Cut Protocol

This skill is permissive — several phases have a "cheap option". Permissiveness is fine; **silent downgrades are not**. The rigor tiers below are defined once, here; `#review` picks one, it does not redefine them.

- **High-rigor (default).** One reviewer subagent per file in parallel; one review pass, second loop only on unresolved hard-fails; full `#resolve-design-md` extraction.
- **Medium-rigor (recommended for ≤ 6 files or a focused enhancement).** ONE cross-file reviewer subagent (single message, multi-file critique); apply fixes; no second loop. `#resolve-design-md` still runs in full.
- **Low-rigor (personal-tool, single-user, time-bound only).** Inline grep + rubric spot-check PLUS one mandatory cross-file reviewer subagent (200-word brief: meaningful `data-region` naming, adequate annotation text-alternative, negative-space violations, high-variance findings). The cross-file pass is non-negotiable — it's cheap and catches what grep misses.

**Announcement rule (non-negotiable):** whenever you choose the lighter option for a phase, announce it first — "Choosing [lighter option] for [phase] because [rationale]. Trade-off: [what we lose]. Override?" — and give the user one beat to redirect. Applies to: scope-triage skips (`#component-breakdown` step 1), skipping `#resolve-design-md` despite a host frontend, skipping screenshot ingestion (`#locate-requirements` step 4) despite attached screenshots, and `#review` running below high-rigor.

---

## Phase 0: Pipeline Setup (inline — do not skip) {#pipeline-setup}

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

## Phase 1: Locate Requirements {#locate-requirements}

1. **Find the requirements doc.** Follow `_shared/resolve-input.md` with `phase=requirements`, `label="requirements doc"`. Accept either a path or an inline feature description.
2. **No requirements doc found?** Stop and trigger `/requirements` first: tell the user "Wireframes need a requirements doc to anchor user journeys. Running `/requirements` first.", hand off to `/pmos-toolkit:requirements` with the original ask, and resume once the doc is written.
3. **Read the req doc end-to-end.** Extract: user journeys, functional requirements that imply UI, non-goals (so you do NOT wireframe out-of-scope flows), and explicit UX constraints (brand, accessibility tier, declared device support).
4. **Ingest screenshots, if provided.** If the user passed `--screenshots <path>` (one or more times) OR attached images inline, follow `reference/screenshot-ingestion.md`: copy each image to `{feature_folder}/wireframes/assets/source-screens/`, run vision-extraction per that file's prompt template, append a section per screenshot to `{feature_folder}/wireframes/assets/source-screens.md`. Defer the journey-anchoring question to the gate below so the user reviews journeys and screenshot mappings together. No screenshots → skip this step.
<!-- defer-only: ambiguous -->
5. **Confirm understanding.** Summarize the journeys you'll wireframe AND (if step 4 ran) propose anchor mappings between each screenshot and a journey step. Ask the user to confirm both via `AskUserQuestion` (batch ≤ 4 per call, screenshots first then journeys). Update `source-screens.md` "Anchored to" lines per the answers. Platform fallback: numbered list + free-text confirmation.

**Gate:** do not proceed until the user confirms the journey list.

---

## Phase 2: Component & Device Breakdown {#component-breakdown}

1. **Scope triage (first).** Classify every req-doc item:

   | Class | Symptom | Treatment |
   |---|---|---|
   | **Net-new IA / flow** | new screen, tab, modal, reshaped chrome | Full wireframe with state matrix |
   | **Comparison / before-after** | restyle, change a single visual property | One file, 2 states ("before / after") |
   | **Trivially specifiable** | data fix, label change, link wiring | Skip wireframe — note in handoff that /spec proceeds directly |

   <!-- defer-only: ambiguous -->
   Present the triage table via `AskUserQuestion` (one question per row OR a single multiSelect) so the user confirms classifications before inventory work; show default recommendations. Per the Rigor & Corner-Cut Protocol, **announce every "skip wireframe" and "comparison only" classification with rationale**. Only the first two classes enter the inventory; skipped items are listed in the `#spec-handoff` under "Skipped from wireframing".

2. **Component inventory.** From the journeys, derive the design surface, grouped into screens/pages, modals/overlays, reusable components, and layouts (only when multiple screens share non-trivial chrome). Number each item and give it a lowercase-hyphenated `slug` (becomes the filename). **For each item, look up matching patterns** in `patterns/README.md` — a screen is typically a composition of patterns — and tag the row `patterns: [<category>/<file>, ...]`. No match → tag `patterns: novel` and flag for extra reviewer attention.

3. **State coverage.** For each component, enumerate the states it must show: default/loaded, empty, loading, error, success, plus edge cases the req doc calls out. Every wireframe file MUST cover all its states via the state-switcher tab pattern (`reference/html-template.md`) — one file, switchable states.

<!-- defer-only: ambiguous -->
4. **Device selection.** Ask via `AskUserQuestion` (multiSelect): desktop-web, mobile-web, desktop-app (desktop-web + window chrome), android-app (bottom nav, FAB, system bar), ios-app (tab bar, sheet, large title). Default: whatever the req doc declared; if silent, recommend desktop-web + mobile-web for consumer-facing features. An explicit `--devices` value or natural-language pre-selection seeds the default.

<!-- defer-only: ambiguous -->
5. **Clarifying questions.** `AskUserQuestion` (max 4 per call) for genuine ambiguities about scope, IA, or interaction model only — cosmetic questions are reviewer-loop concerns. None → skip and announce why.

**Gate:** do not proceed until the user confirms the inventory, state matrix, and device list. Print the matrix:

```
| # | Component | Slug | Type | States | Devices | Patterns |
```

The `Patterns` column drives what the generator and reviewer subagents load in `#generate` and `#review` — keep it accurate.

---

## Phase 3: Resolve DESIGN.md {#resolve-design-md}

DESIGN.md is the durable, repo-resident brand contract for the target app. This phase **finds** it, or **creates** it on first run, then merges it (resolving `x-extends`) into an in-memory object the rest of the skill consumes. It replaced the legacy in-folder `house-style.json` / `house-style.css` artifacts. The procedure lives in three reference docs — `reference/design-md-spec.md` (schema), `reference/design-md-resolver.md` (resolution walk, `x-extends` cascade, staleness check, workstream persistence), `reference/design-md-extractor.md` (auto-extraction / greenfield elicitation):

<!-- defer-only: ambiguous -->
1. **Resolve target app** per resolver Step 1 (workstream-first, then frontend detection, then `AskUserQuestion` if ambiguous). The chosen `app_dir` persists to the workstream as `target_app.path`.
2. **Find or create DESIGN.md** per resolver Step 2 (walk: `<app>/DESIGN.md` → `packages/ui/DESIGN.md` → `<repo-root>/DESIGN.md`).
   - **Found** → load; resolve `x-extends` (resolver Step 3); staleness check (Step 4). Fresh → step 3.
     <!-- defer-only: destructive -->
     Stale → `AskUserQuestion`: **Re-extract** / **Use as-is** / **Abort**. Re-extract runs extractor Branch A and rewrites the file (preserving hand-edited `## Anti-patterns` and `x-content.voice` — diff and confirm before overwrite).
   - **Not found** → run the extractor: frontend present → Branch A (auto-extract, via one read-only subagent if available — `model: sonnet`, schema-bound extraction); greenfield → Branch B (interactive elicitation, 4 questions).
     <!-- defer-only: ambiguous -->
     Monorepo with shared `packages/ui/` → `AskUserQuestion`: write to **shared base** or **app-specific** (with `x-extends` to the shared base). Recommend shared.
<!-- defer-only: ambiguous -->
3. **Confirm with user.** `AskUserQuestion`: "Use this DESIGN.md for wireframes?" — **Use as-is** / **Edit before continuing** / **Discard for this run**. Edit → print absolute path, wait, re-read. Discard → set `x-source.applied: false`; proceed with `wireframe.css` defaults only (no overlay).
4. **Generate `design-overlay.css`** per `reference/design-md-to-css.md` into `{feature_folder}/wireframes/assets/design-overlay.css` (regenerated every run).
5. **Workstream persistence** per resolver Step 5: `target_app`, `design_md_path`, `components_md_path`, `last_extraction_sha` (set only on extract/re-extract).
6. **Migration from legacy `## Design System / UI Patterns`.** First DESIGN.md for a workstream that has a non-empty legacy section → show existing patterns + proposed DESIGN.md additions, then
   <!-- defer-only: ambiguous -->
   `AskUserQuestion`: **Migrate (recommended)** / **Skip migration**. On migrate: append patterns to DESIGN.md, replace the workstream section's body with `→ See DESIGN.md at <path>`.

**Gate:** the user must confirm DESIGN.md (step 3) before `#composition-context` begins.

---

## Phase 4: Resolve Composition Context {#composition-context}

DESIGN.md captures visual identity; this phase captures **structural composition** — without it, wireframes *look* like the app but don't *fit* it. Output is three in-memory blobs passed to `#generate`: `components_inventory`, `layout_anchor`, `decision_context`.

1. **Load or create COMPONENTS.md** (same dir as DESIGN.md; procedure per `reference/components-md-spec.md` "Extractor procedure"):
   - **Found and fresh** (commit SHA matches DESIGN.md's `x-source.sha` ± any `/verify` updates) → load.
   <!-- defer-only: destructive -->
   - **Found but stale** → `AskUserQuestion`: **Re-extract** / **Use as-is**.
   - **Missing AND host frontend exists** → run the extractor, write `<dirname design_md_path>/COMPONENTS.md`, announce the path, and auto-accept the fresh extraction (print a one-line summary; the user can edit the file at any time). Prompt only if extraction confidence is low or results look partial.
   - **Missing AND greenfield** → write a stub (header + `_No components yet._`). Don't block.
2. **Pick a layout anchor.** If DESIGN.md `x-information-architecture.layouts` has entries:
   <!-- defer-only: ambiguous -->
   `AskUserQuestion` (single-select): "Which existing layout does this feature follow?" — each named layout + "None — start fresh" (cap 4; if more, recommend the 3 most common). **Persist the chosen layout name** to `{feature_folder}/wireframes/.layout-anchor` (single-line text file) so `/prototype` inherits it without re-asking. No declared layouts → skip; generators infer from DESIGN.md `## Layout` prose.
3. **Assemble decision context.** Concatenate, in order: workstream `## Constraints & Scars` (read-only — this skill never writes it), DESIGN.md `## Anti-patterns`, DESIGN.md `## Do's and Don'ts`, workstream `## Design System / UI Patterns` (only if migration was skipped).

**Gate:** none — data assembly only.

---

## Phase 5: Generate Wireframes (Parallel Subagents) {#generate}

For each `(component × device)` pair in the matrix, generate one HTML file at `{feature_folder}/wireframes/{NN}_{screen-slug}.html` — `NN` is a 2-digit sequence in intended viewing order starting at `01`; `{screen-slug}` combines component slug and device (e.g., `01_dashboard_desktop-web.html`). Supporting assets live in `{feature_folder}/wireframes/assets/`.

**Step 1 — Copy the shared stylesheet BEFORE generating anything:**

```bash
mkdir -p "{feature_folder}/wireframes/assets"
cp "${CLAUDE_PLUGIN_ROOT:-$HOME/.claude-personal/plugins/cache/pmos-toolkit/pmos-toolkit/*/}skills/wireframes/assets/wireframe.css" \
   "{feature_folder}/wireframes/assets/wireframe.css"
```

If the copy fails, `Read` the skill's `assets/wireframe.css` and `Write` it to the destination. Do NOT inline its contents into wireframe files. Also copy the comments substrate per "Comments instrumentation" below.

**Step 2 — Dispatch generators.** With subagents available, dispatch `general-purpose` subagents in parallel (`model: sonnet` — bounded, template-bound generation; `#review` validates the output), one per **component** (not per file — one subagent generates all device variants of its component for visual consistency), up to ~5 per message. Each subagent receives:

- The component's inventory entry, states, and assigned devices; relevant req-doc journey excerpts; the full template from `reference/html-template.md`.
- **Only the pattern files tagged on this component's row** (typically 1–3 from `patterns/`) — never the whole library; it dilutes attention. Patterns are authoritative: best practices, common mistakes, and skeletons must be respected.
- **The merged DESIGN.md verbatim** as YAML + instruction: "Link `./assets/design-overlay.css` immediately after `./assets/wireframe.css` in every file. The overlay handles tokens; honor `## Components` prose for shape patterns and `x-interaction` for behavior."
- **`components_inventory`** + instruction: prefer COMPONENTS.md variant names over inventing new ones; mock genuinely new components AND flag them in the file footer under "New components proposed: <list>".
- **`layout_anchor`** (name + skeleton) + instruction: use as the chrome for screen-level wireframes; modals/overlays exempt. Omit when "None — start fresh".
- **`decision_context`** + instruction: honor every anti-pattern; a wireframe that must violate one flags it in the footer with rationale.
- **The design-slop floor** at `../_shared/slop-engine/design-slop-rules.md` — emitted screens must also clear its generated DON'T lines (the same deterministic tells `/verify`'s slop gate checks). Honor the floor; do not restate it here.
- **If the component has an anchored screenshot:** only that screenshot's description block + the original image's absolute path, plus the IA-preservation instruction from `reference/screenshot-ingestion.md` (match layout/IA; may improve states/a11y/copy; must NOT silently reorganize IA).
- Strict instruction: produce ONLY the HTML file(s), no commentary.

No subagents → generate sequentially in the main agent.

**File requirements (every wireframe MUST satisfy):** one `.html` per `(component × device)` pair; links `./assets/wireframe.css` then `./assets/design-overlay.css` (overlay link skipped only on "Discard for this run"); Tailwind via CDN; state-switcher tabs; toggleable annotations layer; realistic domain copy (no "Lorem ipsum"); the per-device frame, accessibility baseline (semantic HTML, focus-visible, aria labels on icon-only buttons, contrast ≥ 4.5:1), ≥ 44×44px touch targets on mobile/native, and footer — all exactly per `reference/html-template.md`. Do not deviate from the template unless the component genuinely needs it.

---

## Phase 6: Self-Refinement (Reviewer Subagent + Loops) {#review}

Pick a rigor tier per the **Rigor & Corner-Cut Protocol** at the top of this skill (the tier ladder lives there, only there) and announce it with rationale. The protocol below is high-rigor; medium/low reduce the fan-out as the ladder describes.

**Loop structure** — one review pass per file by default; a second loop ONLY when loop 1 surfaced hard-fails that the applied fixes did not resolve. Hard-fails are of two kinds: **deterministic** ones caught by `scripts/lint-wireframe-svg.mjs` (an off-grid coordinate, an out-of-allowlist colour, the annotation red bleeding outside the annotation layer, a missing `<title>`/`<desc>`, a sub-44px mobile tap target, a `viewBox` mismatch), and **judgment** ones from `reference/eval-rubric.md` (a missing required state `S1`, an annotation list that is an inadequate text alternative `C5`). Advisory/judgment findings that are not hard-fails (layout taste, copy, IA) never trigger loop 2. Hard cap: 2 loops per file — the cap is a cost governor; on cap-hit, surface residuals and continue.

1. **Dispatch one reviewer subagent per file, in parallel** (`model: sonnet` — rubric-guided review with explicit acceptance criteria). Prompt: load `reference/eval-rubric.md` AND the pattern files tagged on this component's row (same files the generator got); score against BOTH; return findings as JSON `[{source: "rubric:<id>" | "pattern:<file>:<rule>", severity, finding, suggested_fix}]`. Cross-referencing catches what pure heuristics miss.
2. **Apply fixes:** high/medium severity → apply via `Edit` (or a generator re-emit); low → log in the wireframe footer as "Known minor issues". Track changes in a `Review Log` HTML comment at the top of the file.
3. **Decide continuation** per the loop structure above.

Platform fallback (no subagents): run the reviewer pass inline.

**Cross-file rollup:** after per-file refinement, present unresolved high/medium findings per `_shared/findings-dispositions.md` (severity tags, the four dispositions, ≤4-per-batch, non-interactive classification, platform fallback, edge cases). Delta for this skill: deferrals are logged in the affected wireframe's `Review Log` comment, not a doc-level Open Questions section.

---

## Phase 7: Index & Serve {#index-serve}

**Generate `{feature_folder}/wireframes/index.html`** — a navigation-only surface: a card grid linking every `(component × device)` file (name, device chip, state-count badge, small preview), filterable by device and by name, working offline from `file://`, using Tailwind CDN + the shared `./assets/wireframe.css`. Header links back to the req doc and to `canvas.html` ("Canvas view (all devices)") — rendered unconditionally; `#canvas` always emits the file moments later. With a single target device, omit the device-filter row (a one-tab control is noise) and note the omission in the footer.

**The index does NOT include** state-switcher tabs or annotations toggles — those live inside each wireframe (per `reference/html-template.md`). To flip states, reviewers open the wireframe itself.

**Serve:** if `command -v node && command -v npx` succeeds, start `cd {feature_folder}/wireframes && npx --yes http-server -p 0 -c-1 --silent` in the background and report `http://localhost:<port>/index.html`. Otherwise print the absolute `file://` path (noting some browsers restrict `file://` iframes). Always print BOTH the served URL (if any) and the file path.

---

## Phase 8: Folded MSF-wf {#folded-msf-wf}

This phase folds `/msf-wf` (combined MSF + PSYCH analysis with inline edit application) into the pipeline as an apply-loop folding. **All mechanics — escape flag, tier gating, pre-apply clobber guard, auto-apply threshold, per-finding commits, failure capture + advisory continue, resume-via-git-log — follow `_shared/folded-phase.md`.** This folding's parameters:

- **Folded skill:** msf-wf, invoked as `/msf-wf {feature_folder}/wireframes --apply-edits`. **Escape flag:** `--skip-folded-msf-wf` (machine-coupled; never renamed). Threshold override: `--msf-auto-apply-threshold N`.
- **Tier gating:** substrate default (Tier 1 skip, Tier 2 opt-in, Tier 3 default-on; boundary semantics in `_shared/tier-matrix.md`).
- **Host artifacts** (apply-loop edit and clobber-guard target): the per-wireframe HTML files — guard each `{feature_folder}/wireframes/<NN>_<slug>.html` individually; a dirty wireframe skips auto-apply for that file only (critique + findings doc still emit) while clean siblings proceed.
- **Per-finding commit message:** `wireframes: auto-apply msf-wf finding F<N>`.
- **State key:** `state.yaml.phases.wireframes.folded_phase_failures[]`.
- **Findings docs:** `{feature_folder}/wireframes/msf-wf-findings/<wireframe-id>.md` — one per reviewed wireframe; never the legacy combined `msf-findings.md`.
- **Reviewer dispatch + parent-side validation:** per-wireframe chrome-strip and quote-grounded validation per `_shared/reviewer-protocol.md`, with this skill's deltas (no `sections.json` set-equality — `/wireframes` emits no such companions; per-wireframe hard-fail strings; post-return verification) in `reference/folded-msf-wf.md`.

**Delta from the substrate's advisory-continue:** a non-zero `/msf-wf` exit or user termination aborts this phase — do NOT auto-continue to `#spec-handoff`; surface the error (the user can re-run `/msf-wf` manually, then `/spec`).

---

## Phase 9: Canvas Aggregation (always-on) {#canvas}

Aggregate every per-device wireframe into a single Figma-like viewer so stakeholders see the whole feature spatially with flow arrows. Reads the `#generate` HTML files (plus any `#folded-msf-wf` edits), parses DESIGN.md journeys for arrows, and emits:

- `canvas.html` — self-contained viewer (CDN panzoom + leader-line with SRI; inline JSON data block so it works from `file://`). Screens render as sandboxed lazy iframes — the per-device files remain the source of truth.
- `canvas.json` — canonical layout (positions, dimensions, journey labels) + DESIGN.md-derived arrows, schema-versioned. The viewer's **Save layout** button downloads the current state; commit `canvas.json` to keep curated layouts.

```bash
node ${CLAUDE_PLUGIN_ROOT}/skills/wireframes/assets/canvas/build-canvas.js \
  {feature_folder}/wireframes {feature_folder}/wireframes/DESIGN.md
```

Pass `""` as the second argument when DESIGN.md is absent — arrows fall back to empty; screens still render.

**Success:** both files exist; the script logs `canvas-aggregator: wrote ... (N screens, M arrows)` on stdout. **Failure handling:** the aggregator is additive — it logs to stderr and exits 0 on any non-fatal condition; it must never block `/wireframes`. On exit 64 (bad CLI args), surface the error but proceed to `#spec-handoff`. **Re-run idempotency:** existing `canvas.json` positions are preserved for surviving screens; new screens auto-layout below; arrows always regenerate from DESIGN.md. Full schema, extraction rules, journey parser, and auto-layout: `reference/canvas-aggregation.md`.

(In `--bootstrap-design-only` mode no per-device files exist, so this phase doesn't run — a by-design mode-conditional non-presentation. The index's canvas link was already rendered in `#index-serve`; do not append a second one.)

---

## Phase 10: Spec Handoff {#spec-handoff}

Append a `## Wireframes` section to the requirements doc:

```markdown
## Wireframes

Generated: {YYYY-MM-DD}
Folder: `{relative_path_to_folder}`
Index: `{relative_path}/index.html`
Canvas view: `{relative_path}/canvas.html` (layout in `canvas.json`)
MSF + PSYCH: `{relative_path}/msf-wf-findings/` (if the folded MSF-wf phase ran)

| # | Component | Devices | States | File |
```

Commit (`canvas.json` included so curated layouts persist):

```bash
git add {feature_folder}/wireframes/ {requirements_doc_path}
git commit -m "docs: add wireframes for <feature>"
```

Tell the user: "Wireframes are ready. Open `{served_url_or_file_path}` to review. When you're satisfied, run `/pmos-toolkit:spec` — it picks up the wireframes (and any MSF + PSYCH findings) from the requirements doc automatically."

---

## Phase 11: Workstream Enrichment {#workstream-enrichment}

**Skip if no workstream was loaded in `#pipeline-setup`.** Otherwise mandatory — and pointer-only: visual content lives canonically in DESIGN.md and COMPONENTS.md, never the workstream. Update the workstream's `## Wireframes & Design System` section with exactly these four fields:

```yaml
target_app:
  path: <app_dir>
  confirmed_at: <YYYY-MM-DD>
design_md_path: <relative path>
components_md_path: <relative path>
last_extraction_sha: <SHA at extraction; only set/update on extract>
```

**Do NOT write** brand color, typography, or component patterns into the workstream — duplicating DESIGN.md/COMPONENTS.md facts creates drift. New, reusable device-support decisions (e.g., "no iOS app — never wireframe ios-app") may go to `## Constraints & Scars`; one-off device choices stay in the feature folder. `## Constraints & Scars` is otherwise read-only from this skill.

---

## Phase 12: Capture Learnings {#capture-learnings}

Read and follow `_shared/learnings-capture.md` (relative to the skills directory) now. Reflect on whether this session surfaced anything worth capturing — a heuristic that fired repeatedly, a Tailwind pattern that broke on iOS Safari, a device the user always wants but never declares. Proposing zero learnings is valid for a smooth session; the gate is that the reflection happens.

---

## Anti-Patterns (DO NOT)

- Do NOT use `Lorem ipsum` — it makes reviewers debate the layout instead of the content
- Do NOT use real photographs or finished iconography — wireframes are not visual design
- Do NOT split a single component across multiple files per state — use the state-switcher tab pattern
- Do NOT generate wireframes for non-user-facing features (cron jobs, internal APIs) — recommend skipping the skill
- Do NOT use screenshots as the sole journey source — they augment the requirements doc, not replace it
- Do NOT redesign IA away from an anchored screenshot without explicit user direction — improving states, a11y, and copy is fine; moving primary actions or restructuring sections needs the user to ask
- Do NOT blend tokens from multiple host frontends — pick one (user-selected) so wireframes have a coherent visual language
- Do NOT bypass COMPONENTS.md by inventing button/input/card/modal variants — prefer existing variants; flag novel ones explicitly in the file footer
- Do NOT write brand colors, typography, or component patterns into the workstream — it stores only the four navigation fields

---

## Apply comment-resolver edit

This is the `/wireframes` entrypoint that `/comments resolve` dispatches into when walking open threads in a wireframe artifact's inline `pmos-comments` JSON block. The contract — input/output JSON shapes, closed `error_enum`, idempotency rules, anchor-resolution order (id-first → ≥40-char quote substring → `anchor_orphaned`, never mutating on a miss) — lives in the shared contract doc and is the single source of truth:

- **Contract (normative):** `plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md`.

This section MUST cite that file rather than restate the contract. `/wireframes`-specific implementation only:

- **Shim:** `plugins/pmos-toolkit/skills/wireframes/scripts/apply-edit-at-anchor.js` — exports `apply(input)`, returns one of the three contract output shapes (success / failure / clarification). No-ops use the `diff_ref` substring form (`"no-op: edit already applied"`).
- **Applyable vs infeasible:** edits to section content, copy, annotations, or state descriptions inside a per-screen `.html` file apply; edits to `index.html` structure (nav, screen list, card grid, reordering) return `agent_judged_infeasible` with `system_reply: "Cannot apply: edit targets index.html navigation or screen-list structure. Regenerate via /wireframes to restructure across-screen layout."`.
- **Two emit references (one instrumentation surface):** both the per-screen template (`reference/html-template.md` `<head>`) AND the `#index-serve` index template MUST include `<meta name="pmos:skill" content="wireframes">` plus the comments.js/css asset links — the `/comments` resolver routes apply-edit dispatches via this meta tag.
- **Asset substrate** (copied alongside `wireframe.css` in `#generate` step 1): from `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/`, `cp -n` `comments.js`, `comments.css`, and `comments-open.bat` into `{feature_folder}/wireframes/assets/`; `install -m 0755` the `comments-open.command` and `comments-open.sh` launchers there too. (`/wireframes` does not use the html-authoring emit substrate otherwise — no `template.html` slot-fill and no `.sections.json` companions; its own template is `reference/html-template.md`.)
- **SVG data-anchor retrofit:** when a per-screen file contains inline `<svg>`, pass the HTML through `retrofitSvg()` from `skills/_shared/html-authoring/assets/svg-anchor.js` before writing — injects `data-anchor` slugs on `<g>` and top-level `<rect>`/`<path>` (idempotent; no-op without SVG). Consumed by `/comments resolve`'s svg-data-anchor strategy.
- **Tests:** `plugins/pmos-toolkit/skills/wireframes/tests/apply-edit-at-anchor.test.js` (5 cases); wrapper `tests/scripts/assert_apply_edit_at_anchor_wireframes.sh`.

---

*Spec lineage: `docs/pmos/features/2026-04-30_wireframes-style-and-screenshot-input` (house style, screenshots-as-IA-anchors), `2026-05-02_design-md-integration` (DESIGN.md/COMPONENTS.md contract, `--bootstrap-design-only`), `2026-05-08_msf-skill-split` (PSYCH → /msf-wf), `2026-05-10_pipeline-consolidation` (folded MSF-wf, escape flag, per-finding commits), `2026-05-09_html-artifacts` (wireframes excluded from the `sections.json` emit), `2026-05-23_inline-doc-comments` (comment resolver, emit references, SVG anchors), `2026-05-24_wireframes-canvas` (canvas viewer), `2026-05-08_non-interactive-mode` (mode block).*
