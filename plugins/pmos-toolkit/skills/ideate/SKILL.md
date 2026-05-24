---
name: ideate
description: Turn a fuzzy idea into a structured, pressure-tested one-page brief in ~10–15 minutes. Standalone utility — runs a 3-phase loop (Frame → Expand → Pressure-test) with always-on premortem + inversion + assumption-mapping against the chosen idea, then writes a single per-idea HTML artifact to {docs_path}/ideate/{YYYY-MM-DD}_<slug>.html (markdown sidecar when output_format=both). Lives outside the requirements→spec→plan pipeline — for pre-requirements ideation, not committed-plan interrogation. Use when the user says "help me brainstorm this idea", "stress-test this idea", "I have a half-formed idea", "ideate on X", "what should we build to solve Y", "pressure-test this concept", "poke holes in this idea before I write it up", or "/ideate".
user-invocable: true
argument-hint: "<seed-text> [--format html|md|both] [--no-stress-test] [--refine] [--slug <slug>] [--resume <path>] [--non-interactive | --interactive]"
---

# /ideate

**Announce at start:** "Using /ideate to brainstorm and pressure-test this idea."

This is a standalone utility — it does NOT load workstream context, does NOT feed into `/spec` automatically, and lives outside the requirements→spec→plan pipeline. It produces a single HTML artifact per idea that the user can read, share, or promote into the pipeline via an explicit handoff (`/requirements`, `/grill`, `/backlog add`).

## When to use this

- The user has a half-formed thought and wants structure around it before committing to `/requirements`.
- The user wants to know what would kill an idea before investing in it.
- The user wants a written ideation artifact they can revisit, share, or attach to a `/backlog` item.

**When NOT to use:**
- The idea is already shaped enough to need acceptance criteria → run `/requirements` directly.
- The user has a committed plan they want adversarially-reviewed → run `/grill`.
- The user wants alternative angles on a single committed direction → run `/creativity`.

## Track Progress

This skill has multiple phases. Create one task per phase using your agent's task-tracking tool (e.g., `TaskCreate` in Claude Code). Mark each task `in_progress` when you start it and `completed` when it finishes — never batch completions. The phase cursor stored in the artifact (`<meta name="pmos:ideate-phase">`) is the resume contract; tasks track *your* progress.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No `AskUserQuestion` tool:** Degrade to numbered free-form prompts per `_shared/interactive-prompts.md`. The non-interactive auto-pick contract still applies (Recommended → AUTO-PICK).
- **No subagents:** All phases run single-agent; no parallel work to degrade.
- **No `.pmos/settings.yaml`:** Run `_shared/pipeline-setup.md` Section A first-run setup before resolving `{docs_path}`.
- **TaskCreate / TodoWrite missing:** Skill body works without task tracking; the in-artifact phase cursor is canonical.
- **Browser / Playwright:** Not used by this skill.

## The loop

```
                    ┌─────────────────────────────────────┐
                    │  Phase 1 — FRAME                    │
                    │   HMW + JTBD + success signal       │
  /ideate <seed>──▶   + idea-type classification        │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │  Phase 2 — EXPAND                   │
                    │   auto-pick 2 techniques            │
                    │   generate 8–15 variants            │
                    │   user picks 1–3 finalists          │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │  Phase 3 — PRESSURE-TEST (always-on)│
                    │   Premortem + Inversion +           │
                    │   Assumption-map (batch)            │
                    └──────────────┬──────────────────────┘
                                   │ (optional Refine)
                    ┌──────────────▼──────────────────────┐
                    │  Phase 5 — WRITE ARTIFACT           │
                    │  {docs_path}/ideate/<date>_<slug> │
                    └─────────────────────────────────────┘
```

Phases 0 / 4 / 6 / 7 (setup, optional refine, handoff, capture-learnings) wrap the core loop.

## Phase 0: Setup

1. **Read `.pmos/settings.yaml`.** If missing → run `_shared/pipeline-setup.md` §A first-run setup before proceeding. Set `{docs_path}` from `settings.docs_path`.
2. **Resolve `output_format`.** Default `html`. `--format <html|md|both>` overrides settings; last flag wins. Print to stderr exactly once: `output_format: <value> (source: <cli|settings|default>)`.
3. **Read `~/.pmos/learnings.md`** if present; note any entries under `## /ideate` and factor them into your approach. Skill body wins on conflict; surface conflicts to the user.
4. **Resolve mode** (interactive / non-interactive) per the canonical `_shared/non-interactive.md` contract — `cli_flag > parent_marker > settings.default_mode > "interactive"`. Print `mode: <m> (source: <s>)` to stderr.
5. **Derive slug** from the seed per `reference/slug-derivation.md` (kebab-case, ≤4 words, drop stopwords). `--slug <custom>` overrides. Surface the derived slug via `AskUserQuestion` (Recommended: use it; alternative: edit; Cancel) — single-call confirmation, no chain.
6. **Resume detection.** If `--resume <path>` was passed, read the artifact's `<meta name="pmos:ideate-phase" content="...">` tag; jump to that phase. If `--resume` was given but the file is missing → abort with `--resume specified but <path> does not exist`. Without `--resume`, if `{docs_path}/ideate/{YYYY-MM-DD}_<slug>.html` already exists, ask: Overwrite / Pick-new-slug-with-suffix / Cancel.

## Phase 1: Frame

Goal: pin **HMW + JTBD + success signal** in one short pass, then classify the idea so the Expand phase auto-picks the right techniques.

1. **Auto-derive from the seed.** If the seed contains a verb + object + audience signal, draft HMW + JTBD + success signal yourself. Otherwise emit one consolidated `AskUserQuestion` with up to 4 sub-questions to gather them — one question per missing field.
2. **Classify idea-type** per `reference/idea-type-classifier.md` — first-match-wins regex on the seed: `new` / `extend` / `fix` / ambiguous. Ambiguous → issue one disambiguation `AskUserQuestion`.
3. **Announce the technique pair** as a single chat line (no structured ask): `Using <technique1> + <technique2> because this looks like a <type> — override?`. User may reply with a free-form override naming a different pair from the supported set (HMW riffs, SCAMPER, Crazy 8s, First Principles, Analogous Inspiration, Premortem-as-generator, Inversion), or "ok" / no reply / continue to accept.

Rationale: the conversational announce-and-allow-override pattern (vs. a structured pick prompt) saves a turn and signals the skill has an opinion. Forcing a structured pick every time produces decision fatigue.

## Phase 2: Expand

Goal: generate **8–15 distinct one-line variants** using the two techniques, then let the user pick 1–3 finalists.

1. **Generate variants.** Apply each technique to the framed idea per the prompt templates in `reference/techniques.md`. Variants are deliberately diverse — no two should paraphrase the same idea. Each ≤120 characters.
2. **Present as a numbered list.** Plain chat output, not a structured ask. Brief one-line rationale per variant when non-obvious.
3. **Convergence prompt.** Issue one `AskUserQuestion` asking the user to pick 1–3 finalists. Options: "Pick #N — the strongest single idea (Recommended)" / "Pick multiple — reply with numbers" / "Regenerate — different angles needed". On Regenerate, swap one of the two techniques and re-run step 1 with a `(2/3)` indicator (cap: 3 regenerations; after that, force a finalist pick).
4. **Persist a partial artifact** (Frame + Expand sections populated; Pressure-test section is a placeholder; `<meta name="pmos:ideate-phase" content="expand">`). Atomic write per Phase 5's substrate contract.

## Phase 3: Pressure-test (always-on)

Goal: run a structured battery against the chosen finalist(s) — premortem + Munger inversion + assumption mapping — in **one non-interactive batch pass**. No clarifying questions in this phase.

For **each finalist** (per `reference/pressure-test-battery.md`):

1. **Premortem.** Frame: "It is 2027-05-13. This idea, shipped 12 months ago, has failed. Why?" Produce a 3–6-row table: `mode | likelihood (H/M/L) | mitigation`.
2. **Munger Inversion.** Frame: "What set of choices would *guarantee* this idea fails?" Produce 3–5 inverted-action bullets — concrete, actionable inversions, not platitudes.
3. **Assumption Mapping.** Enumerate the load-bearing assumptions of the idea. Rank by `impact × uncertainty`. Produce a 4–8-row table: `assumption | impact (H/M/L) | uncertainty (H/M/L) | cheapest test to validate`.

**When multiple finalists were picked**, after the per-finalist batteries, emit a final **cross-cutting decision table** with one row per finalist on a fixed 3-axis schema: `risk-density (count of H likelihood × H impact) | assumption-load (count of H impact × H uncertainty) | ease-of-validation (count of cheap tests)`. Lower risk-density + assumption-load + higher ease-of-validation wins. This is the only place the skill expresses a numerical opinion.

**Escape:** `--no-stress-test` short-circuits this phase. The artifact's TL;DR carries a `⚠ Stress-test skipped — failure modes and assumptions NOT validated` warning line and the Next Steps section recommends `--resume <path>` to add the battery later. This escape is for deliberately throwaway brainstorms only.

## Phase 4: Refine (optional)

Default: skip. When `--refine` is passed OR the user opts in via an end-of-Phase-3 `AskUserQuestion` (Recommended Skip), rewrite the artifact for voice consistency, tighten the TL;DR, and cross-link failure-modes ↔ assumptions where they reinforce each other.

Most ideas don't earn the polish cost — the Phase-3 working artifact is itself shippable. Run this only when the artifact will be shared widely or attached to a written brief.

## Phase 5: Write Artifact

Goal: emit `{docs_path}/ideate/{YYYY-MM-DD}_<slug>.html` (plus `.md` sidecar when `output_format=both`).

1. **Render the artifact** from `reference/artifact-template.html` — 12 sections (TL;DR / HMW / Target user & JTBD / Hypothesis / Idea variants considered / How it works / Alternatives & prior art / Premortem: failure modes / Riskiest assumptions / Success signals / Next steps / Open questions). Each section is `<section id="kebab-case-id">` with an `<h2 id="kebab-case-id">` per `_shared/html-authoring/conventions.md` §3.
2. **Atomic write.** Temp-then-rename for `.html` and the `.sections.json` companion (build via `_shared/html-authoring/assets/build_sections_json.js`). On the `.md` sidecar (`output_format=both`), pipe through `_shared/html-authoring/assets/html-to-md.js`.
3. **Asset substrate.** Copy the following from `_shared/html-authoring/assets/` to `{docs_path}/ideate/assets/` if not already present (`cp -n`): `style.css`, `viewer.js`, `comments.js`, `comments.css`, `diff-match-patch.js`, `launcher.js`, `launcher.css`, `launcher-config.js`. Asset prefix in the rendered HTML is `assets/` (relative to the `{docs_path}/ideate/` parent). Apply `?v=<plugin-version>` cache-bust on all asset URLs.
4. **Phase cursor + skill meta tag.** Embed `<meta name="pmos:skill" content="ideate">` and `<meta name="pmos:ideate-phase" content="complete">` in `<head>`. The `pmos:skill` tag is required for `/comments resolve` routing (FR-01, FR-40). (For partial-write checkpoints in Phases 2 / 3, use `pmos:ideate-phase content="expand"` / `content="pressure-test"` — the `pmos:skill` tag is always `ideate`.)
5. **Print the absolute file path** in the chat summary so the user can click through.

## Phase 6: Handoff

Print 1–3 candidate follow-up commands in the chat summary, named by exact slash-command syntax:

- Idea-type `new`: suggest `/requirements <slug>` + `/backlog add`.
- Idea-type `extend`: suggest `/requirements <slug>` + `/grill <artifact-path>`.
- Idea-type `fix`: suggest `/grill <artifact-path>` + `/backlog add`.
- All cases: include `/ideate --refine --resume <artifact-path>` when Phase 4 was skipped.

The skill does NOT auto-invoke any of these. Promotion is explicit.

## Phase 7: Capture Learnings

**This skill is not complete until the learnings reflection has produced a one-line output.**

Reflect on whether this session surfaced anything worth capturing under `## /ideate` in `~/.pmos/learnings.md` — e.g., a recurring idea-type classifier miss, a technique pair that worked unusually well, a pressure-test pattern that surfaced a non-obvious failure mode.

**You MUST emit exactly one of these two lines:**

- `Learning: <new entry written to ~/.pmos/learnings.md under ## /ideate>` — when the session surfaced a non-obvious lesson worth keeping.
- `No new learnings this session because <specific reason tied to this session>` — when the session was smooth and routine. The reason must be specific, not boilerplate.

Empty reflection (no line emitted) counts as unfinished work.

## Apply comment-resolver edit

This phase is the `/ideate` entrypoint that `/comments resolve` dispatches into when walking open threads in an ideate artifact's `.comments.json` sidecar. The contract — input/output JSON shapes, closed `error_enum` set, idempotency rules, subagent invocation convention — lives in the shared contract doc and is the single source of truth:

- **Contract (normative):** `plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md`

Per [NFR-08](../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#nfr-h), this phase MUST cite that file rather than restate the contract. Anything below is `/ideate`-specific implementation guidance only.

### When invoked

The resolver dispatches a subagent with the §9.1 input JSON. The subagent's tools include this skill's Node shim:

- **Shim:** `plugins/pmos-toolkit/skills/ideate/scripts/apply-edit-at-anchor.js` — exports `apply(input)`, returns one of the three output shapes (success / failure / clarification) per §9.1. Success responses include the optional `applied_artifact` field (full post-edit HTML); the shim's minimal edit inserts an HTML annotation comment immediately before the resolved anchor element — real prose rewriting is deferred to T12+.

### Resolution order

Per the contract:

1. **id-first.** If `anchor.id_anchor` is set, locate `id="<id>"` in the artifact HTML. Match → success path, `strategy: "id-first"`, `score: 1.0`.
2. **quote-fallback.** Otherwise (or on id miss), run diff-match-patch Bitap against `anchor.quote_anchor.text`. Accept when the normalized score ≥ 0.7.
3. **Neither hits** → emit `{ success: false, error_enum: "anchor_orphaned" }`; do NOT mutate the artifact.

### Skill-specific feasibility

No read-only regions for `/ideate` — all prose sections are editable via standard anchor resolution. The only generic infeasibility heuristic applies: a `body` that reads as a multi-section out-of-scope restructure (first sentence contains `rewrite` + two `§N`/`SN` references) returns `agent_judged_infeasible`.

### Closed error_enum

`anchor_orphaned`, `edit_conflicted`, `agent_judged_infeasible`, `agent_errored`.

### Tests

- Per-skill contract: `plugins/pmos-toolkit/skills/ideate/tests/apply-edit-at-anchor.test.js` (5 cases: id-first happy, orphan, idempotent, infeasible, clarification).
- Wrapper: `tests/scripts/assert_apply_edit_at_anchor_ideate.sh`.

---

## Anti-Patterns (DO NOT)

1. **Generating fewer than 8 variants in Phase 2.** Breadth before convergence is the load-bearing rule — LLMs over-converge in single-shot generation. A 6-variant pass dressed up as "good enough" is the most common failure mode of LLM-assisted ideation. Aim for the upper end (12–15) when in doubt.
2. **Skipping the pressure-test phase by default.** Pressure-test is the *differentiating value* vs `/superpowers:brainstorming` and `/creativity`. Making it opt-in causes users to skip the half that matters. The only path to skipping is the explicit `--no-stress-test` flag with the in-artifact warning.
3. **Folding `/creativity` in as a sub-phase.** `/creativity` stays standalone (Tier-3-requirements enhancer per its own surface). Tight coupling would erase its standalone use case and couple release cycles. The Expand phase has its own auto-picked techniques.
4. **Acting like `/grill`.** `/grill` is a *decision-tree interrogation* of a committed plan (one question per turn, branch walking). Pressure-test is a *batch structured battery* against an uncommitted idea (premortem + inversion + assumption-map in one pass). Different inputs, cadence, outputs. Do NOT issue turn-by-turn questions in Phase 3.
5. **Loading workstream context.** This is a standalone utility — workstream pollution biases variant generation. Do NOT call any workstream-loader. (`/diagram`, `/polish`, `/design-crit`, `/survey-design` all skip workstream — same shape.)
6. **Auto-promoting to `/backlog` or `/requirements`.** Handoff is explicit. Auto-promotion floods `/backlog` with half-baked ideas; manual promotion preserves the bar. Suggest, don't dispatch.
7. **Inventing techniques the skill doesn't support.** The auto-pick set is closed (HMW, SCAMPER, Crazy 8s, First Principles, Analogous Inspiration, Premortem-as-generator, Inversion). Six Thinking Hats, Disney Method, 6-3-5 Brainwriting, Reverse Brainstorming are explicitly excluded — they are workshop-shaped and don't translate to chat.
8. **Writing the artifact without a Pressure-test section.** Even with `--no-stress-test`, the section must exist with an explicit `<em>Skipped — see TL;DR warning</em>` placeholder. Silently omitting it breaks the artifact schema and downstream tooling that expects the 12 sections.
9. **Re-asking locked decisions.** If the seed already contains HMW + JTBD signal, do NOT ask the user to confirm — auto-derive and present as a single confirm prompt. Saving a turn is more polite than ceremony.
10. **Hardcoding paths.** Use `${CLAUDE_PLUGIN_ROOT}` (or `${CLAUDE_SKILL_DIR}`) and the resolved `{docs_path}` token. Hardcoded `/Users/<name>/...` paths break the moment the skill is installed elsewhere.
