---
name: ripple-effects
description: Simulate the downstream effects of a proposal — first-, second-, and third-order ripples — using the Futures Wheel, then interrogate the user one question at a time (each with a recommended answer) to refine and de-risk it. Use when the user says "what are the knock-on effects", "second-order effects of this", "what could go wrong downstream", "simulate the consequences", "ripple effects of this proposal", or "and then what".
user-invocable: true
argument-hint: "[<path-to-artifact-or-topic>] [--depth brief|standard|deep] [--orders 1|2|3] [--save|--no-save] [--format <html|md>] [--non-interactive | --interactive]"
---

# Ripple Effects

Simulate the downstream consequences of a proposal — first-, second-, and third-order — then use the surfaced ripples to interrogate the user one question at a time, each with a recommended answer, so they can refine and de-risk the proposal **before** committing to it.

This is **orthogonal to the pipeline** — not a stage. Use it on any artifact at any time: a half-formed idea, a `01_requirements.{html,md}`, a draft `02_spec.{html,md}`, an ADR, a Slack proposal.

**Sibling to `/grill`.** Where `/grill` asks "is this decision defensible?" by walking the proposal's internal decision tree, `/ripple-effects` asks "**and then what?**" by walking the proposal's external ripple tree — what it sets in motion in the world, the org, the system, and the market once it ships. It implements its own grill-style loop and cites `/grill` as prior art; it does not edit or share substrate with `/grill`.

**Announce at start:** "Using /ripple-effects to simulate the downstream effects of {artifact}."

**Flags are NL-first.** Infer options from the request — "ripples three levels deep" ≡ `--depth deep`, "just the immediate knock-ons" ≡ `--orders 1`, "don't save the report" ≡ `--no-save`; an explicit flag overrides the inferred intent.

## Platform Adaptation

- **No interactive prompt tool:** fall back to numbered-choice plain-text per `_shared/interactive-prompts.md`.
- **No subagents:** skip the optional codebase-exploration helper (a `sonnet` or session-inherited Task subagent — see Phase 4 {#grill}) and grep directly.

## Track Progress

This skill has multiple phases. Create one task per phase using your agent's task-tracking tool (e.g. `TaskCreate` in Claude Code) and mark each in-progress when you start it and completed when it finishes.

## Load Learnings

Read `~/.pmos/learnings.md` if present and factor any entries under `## /ripple-effects` into your approach. The skill body wins on conflict; surface conflicts before applying.

---

## Phase 0: Intake & Scope {#intake}

1. **Resolve the target.** A file path → read it directly. A pipeline-doc stem (`01_requirements`, `02_spec`, `03_plan`) → resolve via `_shared/resolve-input.md` with the stem's matching `phase=` and `label="<stem>"` (`.html` preferred, `.md` legacy fallback); any other stem reads as a plain path. A URL or topic name → ask the user to paste the content or point to a file.
   <!-- defer-only: ambiguous -->
   No argument → use `AskUserQuestion`: "What proposal are we simulating? (a) most recent artifact in this conversation, (b) a file path, (c) a topic I'll describe inline."

2. **Summarize the proposal** in 3–5 bullets and confirm the read **before simulating** — simulating a misread wastes the whole run. If the summary is wrong, fix it first.

<!-- defer-only: ambiguous -->
3. **Pick depth and order ceiling.** `--depth brief|standard|deep` (default `standard`) governs branching **breadth** at each order; `--orders 1|2|3` (default `3`) is the recursion **ceiling**. Confirm depth via `AskUserQuestion` when no flag or natural-language equivalent was given. The depth vocabulary is the shared effort dial from `_shared/tier-matrix.md` ("Tier ↔ depth"); legacy spellings (`--depth quick`, boolean `--deep`) are silent aliases. Machine coupling: a future orchestrator may pass `--depth deep` as a literal string — never rename it. Bad enum value for either flag → stderr `invalid <flag> value '<v>'` and exit 64.

   | Depth | Branches walked per order | Approx breadth |
   |---|---|---|
   | brief | top effects only | narrow |
   | standard | top + immediate sub-effects | moderate |
   | deep | exhaust the tree | **no limit** — until the tree is exhausted or the user calls stop |

4. **Resolve `output_format`.** Read `output_format` from `.pmos/settings.yaml` (default `html`; valid `html`, `md` — legacy `both` treated as `html` per `_shared/html-authoring/README.md`). A `--format <html|md>` flag overrides settings (last flag wins). Print to stderr exactly: `output_format: <value> (source: <cli|settings|default>)` once at Phase 0 entry. Controls the optional save (Phase 5 {#report}) only — chat output is unaffected.

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

---

## Phase 1: Simulate the Ripple Tree {#simulate}

Run the **Futures Wheel** (Jerome Glenn, 1971): place the proposal at the center and radiate its consequences outward as an if-then tree.

- **Order 1** = the direct effects of the proposal. **Order 2** = the effects of each order-1 effect — ask "**and then what?**". **Order 3** = the effects of each order-2 effect. `--orders` (default 3) caps the recursion; `--depth` governs how many branches you walk at each order.
- Generate order-1 effects across a **lens set** so the tree isn't all one flavor: **Users/customers · Business/economics · Team/org · Technical/system · Market/competitive · Ethics/risk**. Adapt the set to the proposal — an infra change leans technical/team, a pricing change leans business/users/market. Drop a lens that produces nothing (and say so); never pad.
- **Merge convergent chains** — when two paths reach the same downstream effect, note the multiple drivers (convergence usually means higher leverage).

Be honest about what this is: a structured brainstorm of **plausible** consequences, not a prediction. That uncertainty is exactly why effects get scored next. Trust your own reasoning to actually simulate — this is a thinking task, not a script.

## Phase 2: Score {#score}

Tag every **notable** effect with three qualitative judgments (no arithmetic — there is no number to compute):

- **Likelihood** — High / Medium / Low: how plausible the chain is.
- **Impact** — High / Medium / Low: how much it would matter if it occurred.
- **Desirability** — Good / Bad / Mixed: whether it helps or hurts the proposal's intent.

"**Notable**" = anything *not* (Low-impact **and** Low-likelihood). "**Leverage**" — high impact × uncertain likelihood × negative/mixed desirability — is the ordering key for the grill loop; a high-likelihood high-impact *good* effect is flagged "protect this" but rarely needs interrogation. Scoring **orders** the conversation; it does not silently truncate it — every notable effect is surfaced (D1).

## Phase 3: Present the Consequence Map {#present}

Before asking anything, emit the scored nested tree to chat — 1st → 2nd → 3rd order, each effect lens-tagged with its likelihood/impact/desirability — so the user sees the full ripple picture first. This map is the artifact the grill loop draws its questions from (and the body of the saved report — Phase 5 {#report}).

---

## Phase 4: Grill Loop {#grill}

Sibling to `/grill`'s grill loop (`grill/SKILL.md#grill-loop`) — but the questions come from the scored consequence tree, not the proposal's internal decisions. Walk the notable effects in **leverage order**:

1. **Answer from the codebase first.** If a consequence hinges on "what does the current rate limiter do?", grep/read — don't ask. (Same "answerable from code" class as `/grill`.) §L dispatch: this skill runs **inline by default** (the simulation, scoring, and grill loop all need the live conversation); the one optional fan-out is a codebase-exploration helper to resolve a code-answerable consequence without polluting context — dispatch it as a `sonnet` Task subagent (or inherit the session model for a genuine-judgment read).

<!-- defer-only: free-form -->
2. **One `AskUserQuestion` per consequence**, then wait. Tie the ripple to a refinement of the proposal:
   - `question`: name the effect, its order, and its tags, then ask how to handle it — e.g. "Your order-2 effect *'support tickets spike as power users hit the new rate limit'* is High-impact / Medium-likelihood. How do you want to handle it?"
   - `options` (up to 4): **[Recommended]** a concrete **mitigate / design-around**, reasoning compressed into the label · 1–2 alternatives (**accept the risk**; **redesign to invalidate** the chain) · **Elaborate** (free-form next turn) · **Skip / not relevant**.

3. **Branch on the answer:** a mitigation may spawn its own new consequence — ask "and then what?" on the fix and queue it; "not relevant" prunes the chain (recorded); a surprising answer can reveal an effect the simulation missed — insert it and re-prioritize.

4. **Stop conditions** (any one): all notable effects at the chosen depth addressed; the user says "stop" / "enough"; or — `brief`/`standard` only — the depth budget is hit and the next effect is low-leverage. **Deep mode has no budget** — only the user or an exhausted tree stops it (same rule as `/grill`).

---

## Phase 5: Report {#report}

Emit a compact chat summary always; persisting to a file is **opt-in**.

1. **Skip the save prompt** if the user passed `--no-save` (do nothing) or `--save` (save without asking); otherwise ask "Save ripple-effects report to `<resolved_path>`? [Y/n]" per `_shared/interactive-prompts.md`.

2. **Resolve the save path** (extension `.html` when `output_format=html`, `.md` when `output_format=md`): target inside a pipeline feature dir (`.../NN_<slug>/`) → `<feature_dir>/ripple-effects/{YYYY-MM-DD}_{slug}.<ext>`; a repo file outside the pipeline → `<repo_root>/.pmos/ripple-effects/{YYYY-MM-DD}_{slug}.<ext>`; an inline topic / no file → `~/.pmos/ripple-effects/{YYYY-MM-DD}_{slug}.<ext>`. Kebab slug from the artifact filename or the topic's leading words; dedupe with a `-2`/`-3` suffix.

3. **On save (HTML primary):** author a single self-contained doc per the `_shared/html-authoring/README.md` checklist (template slot-fill, atomic write with the `.sections.json` companion, idempotent `cp -n` asset copy, cache-busted asset URLs, kebab heading ids, index regen for feature-dir saves). **Strip the template's leading doc-comment before render** (known gotcha — else `{{content}}` re-substitutes and the body doubles). Deltas: `{{pmos_skill}}` = `ripple-effects`; three sections — (1) the **scored consequence tree** (1st→2nd→3rd order, lens-tagged, H/M/L badges), (2) the **interrogation transcript** (each question, the chosen disposition, any new chains spawned), (3) **refinements & residual risks** to carry back into the proposal. **Tree-only — no SVG Futures-Wheel diagram** (D2). `<meta name="pmos:skill" content="ripple-effects">` in the head.

4. **On save (MD primary, `output_format=md`):** write the same three-section report as markdown; confirm the path. No substrate copy, no index regen.

---

## Anti-Patterns (DO NOT)

- Do NOT batch questions. One interactive-prompt call = one consequence, then wait.
- Do NOT ask questions answerable from the codebase. Grep first.
- Do NOT filter to a top-N of risks — score everything notable and grill broadly (D1). Scoring orders the talk; it doesn't hide effects.
- Do NOT hedge the recommended option. Take a position; the user can override.
- Do NOT present predictions as certainties — these are plausible ripples, tagged by likelihood for exactly that reason.
- Do NOT generate an SVG wheel — the nested tree is the deliverable (D2).
- Do NOT segue into implementing the refinements you surface. The terminal state is the report.

---

## Phase 6: Capture Learnings {#capture-learnings}

Read and follow `_shared/learnings-capture.md`. Reflect on whether this session surfaced anything worth capturing under `## /ripple-effects` — lens sets that consistently came up empty for a class of proposal, depth/orders miscalibration, question shapes that landed. Zero learnings is a valid outcome.

---

*Spec lineage: `docs/pmos/features/2026-06-13_ripple-effects-skill/02_design.html` (D0–D6: name, score-everything-notable, tree-only, standalone sibling, Futures-Wheel method, depth+orders dials, lean body). Method grounding: Futures Wheel (Jerome Glenn, 1971); second-order "and then what?" thinking; adapted-STEEP product lens set. Reuses `/grill`'s intake/loop/save shape and the `_shared/non-interactive.md` W14 contract.*
