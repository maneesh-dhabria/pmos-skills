---
name: ideate
description: Turn a fuzzy idea into a structured, pressure-tested one-page brief in ~10–15 minutes. Standalone utility — runs a 3-phase default loop (Frame → Expand → Pressure-test) with always-on premortem + inversion + assumption-mapping against the chosen idea, plus an opt-in Amplify phase (Brian Chesky's 11-star ladder) between Expand and Pressure-test that recommends a sweet-spot reframe of the finalist. Writes a single per-idea HTML artifact to {docs_path}/ideate/{YYYY-MM-DD}_<slug>.html (markdown sidecar when output_format=both). Lives outside the requirements→spec→plan pipeline — for pre-requirements ideation, not committed-plan interrogation. Use when the user says "help me brainstorm this idea", "stress-test this idea", "I have a half-formed idea", "ideate on X", "what should we build to solve Y", "pressure-test this concept", "poke holes in this idea before I write it up", "11-star this idea", "amplify this idea past its obvious shape", or "/ideate".
user-invocable: true
argument-hint: "<seed-text> [--format html|md|both] [--no-stress-test] [--slug <slug>] [--resume <path>] [--non-interactive | --interactive]"
---

# /ideate

**Announce at start:** "Using /ideate to brainstorm and pressure-test this idea."

This is a standalone utility — it does NOT load workstream context, does NOT feed into `/spec` automatically, and lives outside the requirements→spec→plan pipeline. It produces a single HTML artifact per idea that the user can read, share, or promote into the pipeline via an explicit handoff (`/requirements`, `/grill`, `/backlog add`).

**Flags are NL-first.** Infer options from the request — "11-star this idea" / "amplify this" runs the Amplify phase, "polish the artifact" runs Refine; an explicit flag overrides the inferred intent. Three legacy flags stay parsed as silent aliases but are deliberately not advertised:

<!-- nl-sugar -->
- `--amplify` / `--no-amplify` — force-run / force-skip the Amplify phase (the Phase 2 gate covers the interactive case).
<!-- nl-sugar -->
- `--refine` — force the optional Refine pass (the end-of-pressure-test prompt covers the interactive case; the Phase 7 handoff still emits this spelling).

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
/ideate <seed> ─▶ FRAME (HMW + JTBD + success signal + idea-type)
               ─▶ EXPAND (auto-pick 2 techniques → 8–15 variants → user picks 1–3 finalists)
               ─▶ AMPLIFY (11-star ladder; opt-in, new/extend only)
               ─▶ PRESSURE-TEST (premortem + inversion + assumption-map; always-on, batch)
               ─▶ WRITE ARTIFACT ({docs_path}/ideate/<date>_<slug>.html)
```

Setup, the optional Refine pass, handoff, and capture-learnings (Phases 0 / 5 / 7 / 8) wrap the core loop. Amplify (Phase 3) is opt-in for `new`/`extend` ideas and auto-skipped for `fix`.

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

## Phase 0: Setup {#setup}

1. **Read `.pmos/settings.yaml`.** If missing → run `_shared/pipeline-setup.md` §A first-run setup before proceeding. Set `{docs_path}` from `settings.docs_path`.
2. **Resolve `output_format`.** Default `html`. `--format <html|md|both>` overrides settings; last flag wins. Print to stderr exactly once: `output_format: <value> (source: <cli|settings|default>)`.
3. **Read `~/.pmos/learnings.md`** if present; note any entries under `## /ideate` and factor them into your approach. Skill body wins on conflict; surface conflicts to the user.
4. **Resolve mode** (interactive / non-interactive) per the canonical `_shared/non-interactive.md` contract — `cli_flag > parent_marker > settings.default_mode > "interactive"`. Print `mode: <m> (source: <s>)` to stderr.
5. **Derive slug** from the seed per `reference/slug-derivation.md` (kebab-case, ≤4 words, drop stopwords). `--slug <custom>` overrides. Surface the derived slug via `AskUserQuestion` — **Use it (Recommended)** / Edit / Cancel — single-call confirmation, no chain.
6. **Resume detection.** If `--resume <path>` was passed, read the artifact's `<meta name="pmos:ideate-phase" content="...">` tag; jump to that phase. If `--resume` was given but the file is missing → abort with `--resume specified but <path> does not exist`. Without `--resume`, if `{docs_path}/ideate/{YYYY-MM-DD}_<slug>.html` already exists, ask: Overwrite / Pick-new-slug-with-suffix / Cancel.

## Phase 1: Frame {#frame}

Goal: pin **HMW + JTBD + success signal** in one short pass, then classify the idea so the Expand phase auto-picks the right techniques.

<!-- defer-only: free-form -->
1. **Auto-derive from the seed.** If the seed contains a verb + object + audience signal, draft HMW + JTBD + success signal yourself. Otherwise emit one consolidated `AskUserQuestion` with up to 4 sub-questions to gather them — one question per missing field.
<!-- defer-only: ambiguous -->
2. **Classify idea-type** per `reference/idea-type-classifier.md` — first-match-wins regex on the seed: `new` / `extend` / `fix` / ambiguous. Ambiguous → issue one disambiguation `AskUserQuestion`.
3. **Announce the technique pair** as a single chat line (no structured ask): `Using <technique1> + <technique2> because this looks like a <type> — override?`. User may reply with a free-form override naming a different pair from the supported set (HMW riffs, SCAMPER, Crazy 8s, First Principles, Analogous Inspiration, Premortem-as-generator, Inversion), or "ok" / no reply / continue to accept.

Rationale: the conversational announce-and-allow-override pattern (vs. a structured pick prompt) saves a turn and signals the skill has an opinion. Forcing a structured pick every time produces decision fatigue.

## Phase 2: Expand {#expand}

Goal: generate **8–15 distinct one-line variants** using the two techniques, then let the user pick 1–3 finalists.

1. **Generate variants.** Apply each technique to the framed idea per the prompt templates and variant-quality rules in `reference/techniques.md` (distinctness, length cap, regenerate-below-floor).
2. **Present as a numbered list.** Plain chat output, not a structured ask. Brief one-line rationale per variant when non-obvious.
3. **Convergence prompt.** Issue one `AskUserQuestion` asking the user to pick 1–3 finalists. Options: "Pick #N — the strongest single idea (Recommended)" / "Pick multiple — reply with numbers" / "Regenerate — different angles needed". On Regenerate, swap one of the two techniques and re-run step 1 with a `(2/3)` indicator (cap: 3 regenerations; after that, force a finalist pick).
4. **Persist a partial artifact** (Frame + Expand sections populated; Amplify and Pressure-test sections are placeholders; `<meta name="pmos:ideate-phase" content="expand">`). Atomic write per Phase 6's substrate contract.
5. **Amplify gate (end of Phase 2).** Apply the gating rules in `reference/eleven-star-ladder.md` §"When this phase runs": `fix` → auto-skip with log line `Phase 3 Amplify: skipped — idea-type=fix (no UX ceiling to raise)`; `new`/`extend` → `--amplify` force-runs, `--no-amplify` force-skips, otherwise one `AskUserQuestion` with **Skip Amplify (Recommended)** / **Run Amplify (11-star ladder on the finalist)** — most ideas don't earn the ceiling-raising cost.

## Phase 3: Amplify (opt-in; new/extend only) {#amplify}

Goal: stretch the chosen finalist(s) past their obvious shape via Brian Chesky's 11-star design exercise, then **recommend** a concrete sweet-spot reframe that feeds the pressure-test. Runs only when gated in by Phase 2 step 5.

Run the ladder per `reference/eleven-star-ladder.md` — it owns the ladder shape, sweet-spot selection (almost always rung 7–8, never 11), multi-finalist handling, skip signaling, and artifact preservation (the original finalists stay on record; amplification is additive, never destructive). Then:

1. **Recommend the sweet-spot reframe** as a one-line restated finalist.
2. **Confirm via `AskUserQuestion`.** Three options: **Use sweet-spot reframe (Recommended)** / **Stay with original Phase-2 finalist** / **Pick a different rung**.
3. **Persist a partial artifact** (Frame + Expand + Amplify populated; Pressure-test is a placeholder; `<meta name="pmos:ideate-phase" content="amplify">`). Atomic write per Phase 6's substrate contract.

## Phase 4: Pressure-test (always-on) {#pressure-test}

Goal: run a structured battery against the chosen finalist(s) — premortem + Munger inversion + assumption mapping — in **one non-interactive batch pass**. No clarifying questions in this phase.

**Input.** The reframed variant(s) when the user accepted a reframe in Phase 3; the original Phase-2 finalist(s) otherwise. Either way, the original Phase-2 selection is preserved in the artifact.

For **each finalist (or reframe)**, run the three sub-batteries per `reference/pressure-test-battery.md` — it owns the verbatim frames, prompt templates, table schemas, row caps, and operating rules. In brief: premortem (failure-modes table), Munger inversion (inverted-action bullets), assumption mapping (impact × uncertainty table with cheapest tests).

**When multiple finalists were picked**, emit the cross-cutting decision table after the per-finalist batteries (schema and scoring rules in the reference). It is the only place the skill expresses a cross-finalist opinion.

**Escape:** `--no-stress-test` short-circuits this phase. The artifact's TL;DR carries a `⚠ Stress-test skipped — failure modes and assumptions NOT validated` warning line and the Next Steps section recommends `--resume <path>` to add the battery later. This escape is for deliberately throwaway brainstorms only.

## Phase 5: Refine (optional) {#refine}

Default: skip. When `--refine` is passed OR the user opts in via an end-of-Phase-4 `AskUserQuestion` — **Skip (Recommended)** / Refine — rewrite the artifact for voice consistency, tighten the TL;DR, and cross-link failure-modes ↔ assumptions where they reinforce each other.

Most ideas don't earn the polish cost — the Phase-4 working artifact is itself shippable. Run this only when the artifact will be shared widely or attached to a written brief.

## Phase 6: Write Artifact {#write-artifact}

Goal: emit `{docs_path}/ideate/{YYYY-MM-DD}_<slug>.html` (plus `.md` sidecar when `output_format=both`).

1. **Render the artifact** from `reference/artifact-template.html` — 13 sections (TL;DR / HMW / Target user & JTBD / Hypothesis / Idea variants considered / Amplify: 11-star ladder / How it works / Alternatives & prior art / Premortem: failure modes / Riskiest assumptions / Success signals / Next steps / Open questions). Each section is `<section id="kebab-case-id">` with an `<h2 id="kebab-case-id">` per `_shared/html-authoring/conventions.md` §3. The `amplify-ladder` section carries either the ladder table(s) + sweet-spot reframe(s) (when Phase 3 ran) or a `<em>Skipped — <reason></em>` placeholder per `reference/eleven-star-ladder.md` §"Skip signaling".
2. **Emit per the `_shared/html-authoring/README.md` checklist** (atomic temp-then-rename write with the `.sections.json` companion via `build_sections_json.js`, idempotent asset copy — `comments.js` and the rest of the substrate payload ride along — cache-busted asset URLs). Deltas: scaffold = this skill's own `reference/artifact-template.html` (not the substrate's `template.html`); save path = `{docs_path}/ideate/`; asset prefix = `assets/` (assets copy to `{docs_path}/ideate/assets/`); no index regeneration (the ideate dir is a loose archive, not a feature folder). `output_format=both` is retired — treated as `html` until a future feature re-introduces MD export.
3. **Phase cursor + skill meta tag.** Embed `<meta name="pmos:skill" content="ideate">` (required for `/comments resolve` routing) and `<meta name="pmos:ideate-phase" content="complete">` in `<head>`. For partial-write checkpoints in Phases 2 / 3 / 4, use `pmos:ideate-phase content="expand"` / `content="amplify"` / `content="pressure-test"` — the `pmos:skill` tag is always `ideate`.
4. **Print the absolute file path** in the chat summary so the user can click through.

## Phase 7: Handoff {#handoff}

**Capture-at-close (D27 — "never silently drops").** First, present ONE keystroke, default-on, **verdict-aligned** capture gate, then print the remaining suggestions as text. Resolve the pressure-test verdict from Phase 4 (per `reference/pressure-test-battery.md`): the multi-finalist cross-cutting table's `Verdict` column (`Lead`/`Backup`/`Drop`); for a single finalist with the battery run, the implicit verdict is `Lead`. Map `Lead`/`Backup` → **build-aligned** (Recommended = capture); `Drop` → **kill-aligned** (Recommended = don't capture). If `--no-stress-test` skipped the battery (no verdict), treat as build-aligned (the user kept the idea).

Issue one `AskUserQuestion` whose Recommended option is the verdict-aligned one:
- **Build-aligned verdict** (`Lead`/`Backup`, or no battery) — options: **Capture as epic (Recommended)** / Don't capture. On **Capture**, invoke `/backlog add --kind epic "<finalist title>"` (creating an epic at status `inbox`), read the new epic id from its one-line confirmation, then invoke `/backlog set <id> source=<absolute brief path>` (status stays `inbox`). The brief path is the Phase 6 artifact path.
- **Kill-aligned verdict** (`Drop`) — options: **Don't capture (Recommended)** / Capture as `wontfix` for the record. On **Capture as wontfix**, run the same two invocations, then `/backlog set <id> status=wontfix`.

Non-interactive mode AUTO-PICKs the verdict-aligned Recommended option per the inlined non-interactive block — captures on a build verdict, skips on a kill verdict. This is exactly the desired behavior (it closes the 0-of-14 leak without polluting the backlog with correctly-killed ideas).

Then print 1–3 candidate follow-up commands in the chat summary, named by exact slash-command syntax:

- Idea-type `new`: suggest `/requirements <slug>`.
- Idea-type `extend`: suggest `/requirements <slug>` + `/grill <artifact-path>`.
- Idea-type `fix`: suggest `/grill <artifact-path>`.
- All cases: include `/ideate --refine --resume <artifact-path>` when Phase 5 was skipped.

The skill auto-invokes `/backlog` only on an accepted capture above; the follow-up commands are printed text — promotion to `/requirements` / `/grill` stays explicit.

## Phase 8: Capture Learnings {#capture-learnings}

**This skill is not complete until the learnings-capture process has run.** Read and follow `_shared/learnings-capture.md` now. Reflect on whether this session surfaced anything worth capturing under `## /ideate` — e.g., a recurring idea-type classifier miss, a technique pair that worked unusually well, a pressure-test pattern that surfaced a non-obvious failure mode. Proposing zero learnings is a valid outcome for a smooth session; the gate is that the reflection happens, not that an entry is written.

## Apply comment-resolver edit

This phase is the `/ideate` entrypoint that `/comments resolve` dispatches into when walking open threads in an ideate artifact's inline `pmos-comments` JSON block. The contract — input/output JSON shapes, closed `error_enum` set, idempotency rules, subagent invocation convention — lives in the shared contract doc and is the single source of truth:

- **Contract (normative):** `plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md`

Per [NFR-08](../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#nfr-h), this phase MUST cite that file rather than restate the contract. Anything below is `/ideate`-specific implementation guidance only.

`/ideate`-specific deltas only (resolution order, output shapes, and the closed `error_enum` set are the contract's, not restated here):

- **Shim:** `plugins/pmos-toolkit/skills/ideate/scripts/apply-edit-at-anchor.js` — exports `apply(input)`, returns the contract's three output shapes per §9.1. The shim's minimal edit inserts an HTML annotation comment immediately before the resolved anchor element — real prose rewriting is deferred to T12+.
- **Feasibility:** no read-only regions for `/ideate` — all prose sections are editable via standard anchor resolution; only the generic multi-section-restructure infeasibility heuristic applies.
- **Tests:** `plugins/pmos-toolkit/skills/ideate/tests/apply-edit-at-anchor.test.js` (5 cases) + wrapper `tests/scripts/assert_apply_edit_at_anchor_ideate.sh`.

---

## Anti-Patterns (DO NOT)

1. **Generating fewer than 8 variants in Phase 2.** Breadth before convergence is the load-bearing rule — LLMs over-converge in single-shot generation. A 6-variant pass dressed up as "good enough" is the most common failure mode of LLM-assisted ideation. Aim for the upper end (12–15) when in doubt.
2. **Skipping the pressure-test phase by default.** Pressure-test is the *differentiating value* vs `/superpowers:brainstorming` and `/creativity`. Making it opt-in causes users to skip the half that matters. The only path to skipping is the explicit `--no-stress-test` flag with the in-artifact warning.
3. **Folding `/creativity` in as a sub-phase.** `/creativity` stays standalone (Tier-3-requirements enhancer per its own surface). Tight coupling would erase its standalone use case and couple release cycles. The Expand phase has its own auto-picked techniques (the closed set, with the named exclusions and reasons, lives in `reference/techniques.md`).
4. **Acting like `/grill`.** `/grill` is a *decision-tree interrogation* of a committed plan (one question per turn, branch walking). Pressure-test is a *batch structured battery* against an uncommitted idea (premortem + inversion + assumption-map in one pass). Different inputs, cadence, outputs. Do NOT issue turn-by-turn questions in Phase 4.
5. **Loading workstream context.** This is a standalone utility — workstream pollution biases variant generation. Do NOT call any workstream-loader. (`/diagram`, `/polish`, `/design-crit`, `/survey-design` all skip workstream — same shape.)
6. **Auto-promoting to `/requirements`, or capturing a killed idea by default.** Promotion to the pipeline (`/requirements` / `/grill`) is always explicit — suggest, don't dispatch. The Phase 7 capture gate (D27) is the one sanctioned `/backlog` write, and it is *verdict-aligned*: a `Drop` verdict makes "don't capture" the Recommended/AUTO-PICK default, so the premortem-killed ideas the bar exists to filter never auto-land. Capture "never silently drops"; it does not "always add".
7. **Re-asking locked decisions.** If the seed already contains HMW + JTBD signal, do NOT ask the user to confirm — auto-derive and present as a single confirm prompt. Saving a turn is more polite than ceremony.
8. **Treating Amplify as default-on, or breaking its ladder rules.** Amplify is opt-in even when the idea-type gate passes — the only force-runs are `--amplify` or an explicit gate pick. Ladder discipline (never 11★ as sweet spot, always recommend a concrete reframe, never dump raw rungs) lives in `reference/eleven-star-ladder.md`.

---

*Spec lineage: `2026-05-13_ideation` (loop design, 8–15 variant floor, battery schemas, artifact contract); Amplify phase added in `03497ec` (11-star ladder, opt-in gating); `2026-05-23_inline-doc-comments` NFR-08 (comment-resolver citation rule); `2026-05-08_non-interactive-mode` (mode contract); body↔reference dedup per the 2026-06-10 skill-design review.*
