---
name: ideate
description: Turn a fuzzy idea into a structured, pressure-tested one-page brief in ~10–15 minutes. Standalone utility — runs a 3-phase default loop (Frame → Expand → Pressure-test) with always-on premortem + inversion + assumption-mapping against the chosen idea, plus an opt-in Amplify phase (Brian Chesky's 11-star ladder) between Expand and Pressure-test that recommends a sweet-spot reframe of the finalist. Writes a single per-idea HTML artifact to {docs_path}/ideate/{YYYY-MM-DD}_<slug>.html (markdown sidecar when output_format=both). Lives outside the requirements→spec→plan pipeline — for pre-requirements ideation, not committed-plan interrogation. Use when the user says "help me brainstorm this idea", "stress-test this idea", "I have a half-formed idea", "ideate on X", "what should we build to solve Y", "pressure-test this concept", "poke holes in this idea before I write it up", "11-star this idea", "amplify this idea past its obvious shape", or "/ideate".
user-invocable: true
argument-hint: "<seed-text> [--format html|md|both] [--amplify | --no-amplify] [--no-stress-test] [--refine] [--slug <slug>] [--resume <path>] [--non-interactive | --interactive]"
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
                                   │ (opt-in; new/extend only)
                    ┌──────────────▼──────────────────────┐
                    │  Phase 3 — AMPLIFY (11-star ladder) │
                    │   1→11★ per finalist                │
                    │   recommend sweet-spot reframe      │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │  Phase 4 — PRESSURE-TEST (always-on)│
                    │   Premortem + Inversion +           │
                    │   Assumption-map (batch)            │
                    └──────────────┬──────────────────────┘
                                   │ (optional Refine)
                    ┌──────────────▼──────────────────────┐
                    │  Phase 6 — WRITE ARTIFACT           │
                    │  {docs_path}/ideate/<date>_<slug> │
                    └─────────────────────────────────────┘
```

Phases 0 / 5 / 7 / 8 (setup, optional refine, handoff, capture-learnings) wrap the core loop. Phase 3 (Amplify) is opt-in for `new`/`extend` ideas and auto-skipped for `fix`.

## Non-interactive mode

This skill honours `--non-interactive` per the canonical contract inlined below (byte-identical to `_shared/non-interactive.md`; audited by `tools/lint-non-interactive-inline.sh`). The runtime classifier reads each structured prompt it is about to issue; static auditing lives in `tools/audit-recommended.sh`.

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

## Phase 0: Setup

1. **Read `.pmos/settings.yaml`.** If missing → run `_shared/pipeline-setup.md` §A first-run setup before proceeding. Set `{docs_path}` from `settings.docs_path`.
2. **Resolve `output_format`.** Default `html`. `--format <html|md|both>` overrides settings; last flag wins. Print to stderr exactly once: `output_format: <value> (source: <cli|settings|default>)`.
3. **Read `~/.pmos/learnings.md`** if present; note any entries under `## /ideate` and factor them into your approach. Skill body wins on conflict; surface conflicts to the user.
4. **Resolve mode** (interactive / non-interactive) per the canonical `_shared/non-interactive.md` contract — `cli_flag > parent_marker > settings.default_mode > "interactive"`. Print `mode: <m> (source: <s>)` to stderr.
5. **Derive slug** from the seed per `reference/slug-derivation.md` (kebab-case, ≤4 words, drop stopwords). `--slug <custom>` overrides. Surface the derived slug via `AskUserQuestion` — **Use it (Recommended)** / Edit / Cancel — single-call confirmation, no chain.
6. **Resume detection.** If `--resume <path>` was passed, read the artifact's `<meta name="pmos:ideate-phase" content="...">` tag; jump to that phase. If `--resume` was given but the file is missing → abort with `--resume specified but <path> does not exist`. Without `--resume`, if `{docs_path}/ideate/{YYYY-MM-DD}_<slug>.html` already exists, ask: Overwrite / Pick-new-slug-with-suffix / Cancel.

## Phase 1: Frame

Goal: pin **HMW + JTBD + success signal** in one short pass, then classify the idea so the Expand phase auto-picks the right techniques.

<!-- defer-only: free-form -->
1. **Auto-derive from the seed.** If the seed contains a verb + object + audience signal, draft HMW + JTBD + success signal yourself. Otherwise emit one consolidated `AskUserQuestion` with up to 4 sub-questions to gather them — one question per missing field.
<!-- defer-only: ambiguous -->
2. **Classify idea-type** per `reference/idea-type-classifier.md` — first-match-wins regex on the seed: `new` / `extend` / `fix` / ambiguous. Ambiguous → issue one disambiguation `AskUserQuestion`.
3. **Announce the technique pair** as a single chat line (no structured ask): `Using <technique1> + <technique2> because this looks like a <type> — override?`. User may reply with a free-form override naming a different pair from the supported set (HMW riffs, SCAMPER, Crazy 8s, First Principles, Analogous Inspiration, Premortem-as-generator, Inversion), or "ok" / no reply / continue to accept.

Rationale: the conversational announce-and-allow-override pattern (vs. a structured pick prompt) saves a turn and signals the skill has an opinion. Forcing a structured pick every time produces decision fatigue.

## Phase 2: Expand

Goal: generate **8–15 distinct one-line variants** using the two techniques, then let the user pick 1–3 finalists.

1. **Generate variants.** Apply each technique to the framed idea per the prompt templates in `reference/techniques.md`. Variants are deliberately diverse — no two should paraphrase the same idea. Each ≤120 characters.
2. **Present as a numbered list.** Plain chat output, not a structured ask. Brief one-line rationale per variant when non-obvious.
3. **Convergence prompt.** Issue one `AskUserQuestion` asking the user to pick 1–3 finalists. Options: "Pick #N — the strongest single idea (Recommended)" / "Pick multiple — reply with numbers" / "Regenerate — different angles needed". On Regenerate, swap one of the two techniques and re-run step 1 with a `(2/3)` indicator (cap: 3 regenerations; after that, force a finalist pick).
4. **Persist a partial artifact** (Frame + Expand sections populated; Amplify and Pressure-test sections are placeholders; `<meta name="pmos:ideate-phase" content="expand">`). Atomic write per Phase 6's substrate contract.
5. **Amplify gate (end of Phase 2).** Apply the gating rules in `reference/eleven-star-ladder.md`:
   - If idea-type is `fix` → auto-skip Phase 3. Log `Phase 3 Amplify: skipped — idea-type=fix (no UX ceiling to raise)` and advance to Phase 4.
   - Else (`new` / `extend`) → if `--amplify` was passed, force-run Phase 3; if `--no-amplify` was passed, force-skip; otherwise surface a single `AskUserQuestion` with **Skip Amplify (Recommended)** / **Run Amplify (11-star ladder on the finalist)**. Most ideas don't earn the ceiling-raising cost; opt in when the finalist has room to grow before pressure-testing.
   - Non-interactive mode honors Recommended=Skip per the standard auto-pick contract.

## Phase 3: Amplify (opt-in; new/extend only)

Goal: stretch the chosen finalist(s) past their obvious shape via Brian Chesky's 11-star design exercise, then **recommend** a concrete sweet-spot reframe that feeds Phase 4. Runs only when gated in by Phase 2 step 5; otherwise skipped per the rules in `reference/eleven-star-ladder.md`.

For **each finalist** (per `reference/eleven-star-ladder.md`):

1. **Generate the 1→11 ladder.** Produce one 11-row table — columns `★` and `Experience description`. Follow the anchors in the ladder reference: 1=terrible, 5=baseline (the Phase-2 finalist as written), 7-8=delightful/memorable, 11=deliberately absurd. Each rung must clearly exceed the one below it; do not skip rungs.
2. **Identify the sweet spot.** Almost always rung 7 or 8. Never 11. State it as a one-line **reframed finalist**: *"Finalist (sweet-spot reframe): <restate the original finalist with the sweet-spot rung's ceiling-raising element folded in>."* This is the skill's recommendation.
3. **Confirm via `AskUserQuestion`.** Three options: **Use sweet-spot reframe (Recommended)** / **Stay with original Phase-2 finalist** / **Pick a different rung**. Never present "pick from the 11 rungs" — the skill expresses a recommendation; the user redirects only when their judgement diverges.
4. **Persist a partial artifact** (Frame + Expand + Amplify sections populated; Pressure-test is a placeholder; `<meta name="pmos:ideate-phase" content="amplify">`). Atomic write per Phase 6's substrate contract.

**Multi-finalist handling.** When Phase 2 produced 2–3 finalists, run the ladder per finalist (each gets its own 11-row table + sweet-spot reframe + confirm prompt). Phase 4 then runs its battery against the **chosen reframes** (or originals where the user picked "Stay with original"). The cross-cutting decision table in Phase 4 compares whatever variants Phase 3 hands forward, not the unconditional originals.

**Artifact preservation.** The original Phase-2 finalist(s) stay listed in the `idea-variants` section regardless of which option the user picked — the amplification is additive, never destructive.

## Phase 4: Pressure-test (always-on)

Goal: run a structured battery against the chosen finalist(s) — premortem + Munger inversion + assumption mapping — in **one non-interactive batch pass**. No clarifying questions in this phase.

**Input.** When Phase 3 Amplify ran AND the user chose **Use sweet-spot reframe** (or **Pick a different rung**), this phase attacks the reframed variant(s). When Phase 3 was skipped, or the user picked **Stay with original Phase-2 finalist**, it attacks the original Phase-2 finalist(s) unchanged. Either way, the original Phase-2 selection is preserved in the artifact.

For **each finalist (or reframe)** (per `reference/pressure-test-battery.md`):

1. **Premortem.** Frame: "It is one year from today. This idea, shipped 12 months ago, has failed. Why?" Produce a 3–6-row table: `mode | likelihood (H/M/L) | mitigation`.
2. **Munger Inversion.** Frame: "What set of choices would *guarantee* this idea fails?" Produce 3–5 inverted-action bullets — concrete, actionable inversions, not platitudes.
3. **Assumption Mapping.** Enumerate the load-bearing assumptions of the idea. Rank by `impact × uncertainty`. Produce a 4–8-row table: `assumption | impact (H/M/L) | uncertainty (H/M/L) | cheapest test to validate`.

**When multiple finalists were picked**, after the per-finalist batteries, emit a final **cross-cutting decision table** with one row per finalist on a fixed 3-axis schema: `risk-density (count of H likelihood × H impact) | assumption-load (count of H impact × H uncertainty) | ease-of-validation (count of cheap tests)`. Lower risk-density + assumption-load + higher ease-of-validation wins. This is the only place the skill expresses a numerical opinion.

**Escape:** `--no-stress-test` short-circuits this phase. The artifact's TL;DR carries a `⚠ Stress-test skipped — failure modes and assumptions NOT validated` warning line and the Next Steps section recommends `--resume <path>` to add the battery later. This escape is for deliberately throwaway brainstorms only.

## Phase 5: Refine (optional)

Default: skip. When `--refine` is passed OR the user opts in via an end-of-Phase-4 `AskUserQuestion` — **Skip (Recommended)** / Refine — rewrite the artifact for voice consistency, tighten the TL;DR, and cross-link failure-modes ↔ assumptions where they reinforce each other.

Most ideas don't earn the polish cost — the Phase-4 working artifact is itself shippable. Run this only when the artifact will be shared widely or attached to a written brief.

## Phase 6: Write Artifact

Goal: emit `{docs_path}/ideate/{YYYY-MM-DD}_<slug>.html` (plus `.md` sidecar when `output_format=both`).

1. **Render the artifact** from `reference/artifact-template.html` — 13 sections (TL;DR / HMW / Target user & JTBD / Hypothesis / Idea variants considered / Amplify: 11-star ladder / How it works / Alternatives & prior art / Premortem: failure modes / Riskiest assumptions / Success signals / Next steps / Open questions). Each section is `<section id="kebab-case-id">` with an `<h2 id="kebab-case-id">` per `_shared/html-authoring/conventions.md` §3. The `amplify-ladder` section carries either the ladder table(s) + sweet-spot reframe(s) (when Phase 3 ran) or a `<em>Skipped — <reason></em>` placeholder per `reference/eleven-star-ladder.md` §"Skip signaling".
2. **Atomic write.** Temp-then-rename for `.html` and the `.sections.json` companion (build via `_shared/html-authoring/assets/build_sections_json.js`). The `.md` sidecar emit (`output_format=both`) is retired (FR-12.1) — treated as `html` until a future feature re-introduces MD export.
3. **Asset substrate.** Copy the following from `_shared/html-authoring/assets/` to `{docs_path}/ideate/assets/` if not already present (`cp -n`): `style.css`, `viewer.js`, `comments.js`, `comments.css`, plus the launcher trio (`comments-open.command`, `comments-open.sh`, `comments-open.bat`). Asset prefix in the rendered HTML is `assets/` (relative to the `{docs_path}/ideate/` parent). Apply `?v=<plugin-version>` cache-bust on all asset URLs.
4. **Phase cursor + skill meta tag.** Embed `<meta name="pmos:skill" content="ideate">` and `<meta name="pmos:ideate-phase" content="complete">` in `<head>`. The `pmos:skill` tag is required for `/comments resolve` routing (FR-01, FR-40). (For partial-write checkpoints in Phases 2 / 3 / 4, use `pmos:ideate-phase content="expand"` / `content="amplify"` / `content="pressure-test"` — the `pmos:skill` tag is always `ideate`.)
5. **Print the absolute file path** in the chat summary so the user can click through.

## Phase 7: Handoff

Print 1–3 candidate follow-up commands in the chat summary, named by exact slash-command syntax:

- Idea-type `new`: suggest `/requirements <slug>` + `/backlog add`.
- Idea-type `extend`: suggest `/requirements <slug>` + `/grill <artifact-path>`.
- Idea-type `fix`: suggest `/grill <artifact-path>` + `/backlog add`.
- All cases: include `/ideate --refine --resume <artifact-path>` when Phase 5 was skipped.

The skill does NOT auto-invoke any of these. Promotion is explicit.

## Phase 8: Capture Learnings

**This skill is not complete until the learnings reflection has produced a one-line output.**

Reflect on whether this session surfaced anything worth capturing under `## /ideate` in `~/.pmos/learnings.md` — e.g., a recurring idea-type classifier miss, a technique pair that worked unusually well, a pressure-test pattern that surfaced a non-obvious failure mode.

**You MUST emit exactly one of these two lines:**

- `Learning: <new entry written to ~/.pmos/learnings.md under ## /ideate>` — when the session surfaced a non-obvious lesson worth keeping.
- `No new learnings this session because <specific reason tied to this session>` — when the session was smooth and routine. The reason must be specific, not boilerplate.

Empty reflection (no line emitted) counts as unfinished work.

## Apply comment-resolver edit

This phase is the `/ideate` entrypoint that `/comments resolve` dispatches into when walking open threads in an ideate artifact's inline `pmos-comments` JSON block. The contract — input/output JSON shapes, closed `error_enum` set, idempotency rules, subagent invocation convention — lives in the shared contract doc and is the single source of truth:

- **Contract (normative):** `plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md`

Per [NFR-08](../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#nfr-h), this phase MUST cite that file rather than restate the contract. Anything below is `/ideate`-specific implementation guidance only.

### When invoked

The resolver dispatches a subagent with the §9.1 input JSON. The subagent's tools include this skill's Node shim:

- **Shim:** `plugins/pmos-toolkit/skills/ideate/scripts/apply-edit-at-anchor.js` — exports `apply(input)`, returns one of the three output shapes (success / failure / clarification) per §9.1. Success responses include the optional `applied_artifact` field (full post-edit HTML); the shim's minimal edit inserts an HTML annotation comment immediately before the resolved anchor element — real prose rewriting is deferred to T12+.

### Resolution order

Per the contract:

1. **id-first.** If `anchor.id_anchor` is set, locate `id="<id>"` in the artifact HTML. Match → success path, `strategy: "id-first"`, `score: 1.0`.
2. **quote-fallback.** Otherwise (or on id miss), substring-contains match `anchor.quote_anchor.text` (≥40 chars) against the candidate's text content. First exact substring hit wins.
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
4. **Acting like `/grill`.** `/grill` is a *decision-tree interrogation* of a committed plan (one question per turn, branch walking). Pressure-test is a *batch structured battery* against an uncommitted idea (premortem + inversion + assumption-map in one pass). Different inputs, cadence, outputs. Do NOT issue turn-by-turn questions in Phase 4.
5. **Loading workstream context.** This is a standalone utility — workstream pollution biases variant generation. Do NOT call any workstream-loader. (`/diagram`, `/polish`, `/design-crit`, `/survey-design` all skip workstream — same shape.)
6. **Auto-promoting to `/backlog` or `/requirements`.** Handoff is explicit. Auto-promotion floods `/backlog` with half-baked ideas; manual promotion preserves the bar. Suggest, don't dispatch.
7. **Inventing techniques the skill doesn't support.** The auto-pick set is closed (HMW, SCAMPER, Crazy 8s, First Principles, Analogous Inspiration, Premortem-as-generator, Inversion). Six Thinking Hats, Disney Method, 6-3-5 Brainwriting, Reverse Brainstorming are explicitly excluded — they are workshop-shaped and don't translate to chat.
8. **Writing the artifact without a Pressure-test or Amplify section.** Both sections must exist in every artifact. Pressure-test with `--no-stress-test` carries `<em>Skipped — see TL;DR warning</em>`; Amplify when skipped carries `<em>Skipped — <reason></em>` per `reference/eleven-star-ladder.md` §"Skip signaling". Silently omitting either breaks the artifact schema and downstream tooling that expects the 13 sections.
9. **Re-asking locked decisions.** If the seed already contains HMW + JTBD signal, do NOT ask the user to confirm — auto-derive and present as a single confirm prompt. Saving a turn is more polite than ceremony.
10. **Hardcoding paths.** Use `${CLAUDE_PLUGIN_ROOT}` (or `${CLAUDE_SKILL_DIR}`) and the resolved `{docs_path}` token. Hardcoded `/Users/<name>/...` paths break the moment the skill is installed elsewhere.
11. **Treating Phase 3 Amplify as default-on.** Amplify is opt-in even when the idea-type gate passes (`new`/`extend`). Routine extensions and obvious features don't earn the ceiling-raising cost; defaulting on punishes those cases with a phase whose output they won't use. The only force-runs are `--amplify` (user explicit) or an explicit gate pick.
12. **Picking 11★ as the sweet spot (or dumping the ladder without a recommendation).** 11★ is infeasible by construction — the value lives in the *walk back* from it. Sweet spot is almost always 7–8. And the skill MUST recommend a concrete sweet-spot reframe as a one-line restated finalist — never present "pick from the 11 rungs" as the convergence prompt. The skill expresses a recommendation; the user redirects only when their judgement diverges.
