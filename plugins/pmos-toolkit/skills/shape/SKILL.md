---
name: shape
description: Turn a half-formed sense of a problem into a sharply shaped problem via seasoned-product-leader probing — one question per turn — then hand off. Produces NO solutions; the terminal state is a shaped problem, not a feature or fix. Runs a divergent-early/convergent-late spine over a six-lens floor with a mandatory off-deck ceiling-breaker, and writes one commentable problem-brief HTML rendering the full lens ledger. Use when the user has a fuzzy idea and wants to explore the problem space before any solution or requirements work. Use when the user says "help me shape this problem", "I have a fuzzy idea, help me find the real problem", "what problem am I actually solving here", "think through this problem with me", "probe this before I write requirements", "is this the right problem to solve", or "/shape". NOT for interrogating a committed plan (/grill), generating solution variants (/ideate), or filling a requirements doc (/requirements).
user-invocable: true
argument-hint: "<fuzzy-thought> [--slug <slug>] [--resume <path>] [--non-interactive | --interactive]"
---

# /shape

**Announce at start:** "Using /shape to probe and sharpen the problem before any solution work."

`/shape` is a collaborative thought-partner that co-builds the *framing of a problem* turn by turn, the way a seasoned product leader would — never attacking a committed artifact (`/grill`), never fanning out solution variants (`/ideate`). Its terminal state is a **shaped problem**, handed off downstream. It produces no solutions by design (D2); that discipline is the reason it exists.

**Flags are NL-first.** Infer options from the request — an explicit flag overrides. Canonical phrasings: "resume shaping" ≡ `--resume <path>`; "treat this as a side project / an internal tool / a new bet / a product feature" sets the **context bucket** for the gate in Phase 1 (natural-language only — no flag; it feeds the persisted classification, never overwriting it silently).

## When to use this

- The user has a fuzzy sense of a problem and wants it decomposed and sharpened before committing to `/requirements` or `/ideate`.
- The user suspects they may be solving the wrong problem, or the symptom rather than the root cause.
- The user wants a written, shareable problem-brief they can hand to the pipeline.

**When NOT to use:**
- The user just wants a fast "am I even solving the right thing?" gut-check, not a full shaping session → `/wayrttd` (the 2-minute solution→problem inversion; it can also run as an optional pre-check *inside* `/shape` — see Phase 0.5).
- The problem is already shaped enough to write acceptance criteria → `/requirements`.
- The user wants solution options / idea variants → `/ideate`.
- The user has a committed plan to adversarially review → `/grill`.
- The user wants the downstream consequence tree of a *proposal* → `/ripple-effects`.

## Track Progress

This skill has multiple phases. Create one task per phase using your agent's task-tracking tool (e.g., `TaskCreate` in Claude Code). Mark each task `in_progress` when you start it and `completed` when it finishes — never batch completions. The phase cursor stored in the artifact (`<meta name="pmos:shape-phase">`) is the resume contract; tasks track *your* progress.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No `AskUserQuestion` tool:** Degrade to numbered free-form prompts per `_shared/interactive-prompts.md`. The non-interactive auto-pick contract still applies (Recommended → AUTO-PICK); the turn-by-turn probing degrades to numbered free-form questions.
- **No subagents:** The Phase 6 autonomous non-interactive path (parallel lens drafters + reviewer) degrades to a single-agent sequential pass — draft each lens disposition in turn, then self-review for the ceiling-breaker.
- **No `.pmos/settings.yaml`:** Run `_shared/pipeline-setup.md` Section A first-run setup before resolving `{docs_path}` and reading the persisted context classification.
- **TaskCreate / TodoWrite missing:** Skill body works without task tracking; the in-artifact phase cursor is canonical.
- **Browser / Playwright:** Not used by this skill.

## The spine (divergent early → convergent late)

```
/shape <fuzzy thought>
  ─▶ [WAYRTTD PRE-CHECK]  optional 2-min gut-check → reshape the seed to the real goal (skippable; standalone /shape unchanged)
  ─▶ CONTEXT-GATE  classify side-project / feature-in-product / new-bet / internal-tool
  ─▶ FRAME         one-pass HMW + JTBD + "felt problem"
  ─▶ LADDER        abstraction laddering (why ↑ / how ↓); 5-Whys on a symptom
  ─▶ DECOMPOSE     break into sub-problems; mark the real one
  ─▶ REFRAME       2–3 competing framings + ripple-on-the-framing
  ─▶ CONVERGE      sharpest 1–2 problem statement(s) — mandatory ceiling-breaker fires here
  ─▶ WRITE         one commentable problem-brief HTML (full lens ledger)
  ─▶ HANDOFF       /requirements · /ideate · /backlog · optional /ripple-effects
```

**Interaction model:** `/grill` cadence — one structured question per turn, branch on the answer, walk by leverage, never batch. **Answer style adapts (D3):** offer a Recommended answer ONLY on *convergence* moves (Context-gate confirm, Converge); open probing on *exploration* moves (Frame, Ladder, Decompose, Reframe) carries **no** Recommended answer, so the skill does not think *for* the user.

The **floor / ceiling / context-gate mechanism** — disposition states, the mandatory ceiling-breaker, the context-gate persistence model, and the autonomous non-interactive variant — is defined once in `_shared/lens-ledger.md`. The **six-lens deck + downshift matrix** is `reference/problem-lenses.md`. This body carries only the spine and the per-phase deltas; it cites those two files rather than restating them.

## Non-interactive mode

This skill is fundamentally interactive (one question per turn), so under `--non-interactive` it **does not deadlock and does not hard-refuse** (D10). Instead it runs the **autonomous shaping path** (Phase 6, `#converge`), the canonical non-interactive behaviour per `_shared/lens-ledger.md` (Autonomous variant) — not a skip. The contract below is byte-identical to `_shared/non-interactive.md` (audited by `tools/lint-non-interactive-inline.sh`); the runtime classifier reads each structured prompt it is about to issue, and static auditing lives in `tools/audit-recommended.sh`.

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

1. **Read `.pmos/settings.yaml`.** If missing → run `_shared/pipeline-setup.md` §A first-run setup. Set `{docs_path}` from `settings.docs_path`.
2. **Resolve mode** (interactive / non-interactive) per the inlined contract — `cli_flag > parent_marker > settings.default_mode > "interactive"`. Print `mode: <m> (source: <s>)` to stderr.
3. **Read `~/.pmos/learnings.md`** if present; note any entries under `## /shape` and factor them into your approach. Skill body wins on conflict; surface conflicts to the user.
4. **Derive slug** from the seed (kebab-case, ≤4 words, drop stopwords). `--slug <custom>` overrides. Confirm via one `AskUserQuestion` — **Use it (Recommended)** / Edit / Cancel — single call, no chain.
5. **Resume detection.** If `--resume <path>` was passed, read the artifact's `<meta name="pmos:shape-phase">` and jump to that phase; missing file → abort with `--resume specified but <path> does not exist`. Without `--resume`, if `{docs_path}/shape/{YYYY-MM-DD}_<slug>.html` already exists, ask before clobbering:
<!-- defer-only: destructive -->
   issue one `AskUserQuestion` — Overwrite / Pick-new-slug-with-suffix / Cancel.

## Phase 0.5: WAYRTTD pre-check (optional, additive) {#wayrttd-precheck}

An **optional, skippable** tee-up that runs *before* the lens work: a ~2-minute `/wayrttd` gut-check that inverts an assumed solution back to the real goal, so `/shape` shapes the *right* problem instead of the one the user walked in assuming (D2, the epic sponsor's "plug it into /shape as an upfront step"). **Additive and non-breaking (INV-6):** everything from Phase 1 down — the phases, the resume contract, the artifact — is byte-unchanged when this pre-check is declined *or* when `/wayrttd` is absent. This phase runs **before any artifact exists**, so it writes **no** `pmos:shape-phase` cursor state and is never part of the resume surface — a resumed run (Phase 0 step 5) always lands on Phase 1 or later, so an artifact authored before this phase existed advances past it automatically (back-compat by absence, AC3).

1. **Absence check (back-compat by absence, AC3).** If `/wayrttd` is not installed/available in this environment, skip this phase silently: log `[shape] wayrttd-precheck: /wayrttd unavailable; proceeding to Phase 1 (back-compat by absence)` and go to Phase 1. Standalone `/shape` behaviour is unchanged.

2. **Non-interactive default = Skip (no deadlock, AC4).** If `mode == non-interactive`, do **not** issue the gate — default to Skip and log `[shape] wayrttd-precheck: --non-interactive → skipped (default, no deadlock); run standalone /wayrttd first if you want the pre-check`, then go to Phase 1. (This is a mode-conditional by-design non-presentation, not a silent skip of a presented gate — Anti-pattern #4 is satisfied by the explicit log line. Should a future explicit opt-in force the pre-check on under `--non-interactive`, invoke `/wayrttd`'s own **autonomous path** and thread its Problem Y forward per step 4.)

3. **The gate (interactive).** Issue ONE `AskUserQuestion`:
   - question: `"Before shaping, run a ~2-minute WAYRTTD gut-check to make sure we're shaping the real goal — not an assumed solution?"`
   - options: **Run a 2-min WAYRTTD gut-check first (Recommended)** / **Skip — go straight to shaping**

   This is a convergence-style opt-in (a Recommended answer is appropriate, D3). On **Skip**: log `[shape] wayrttd-precheck: skipped by user; proceeding to Phase 1` and go to Phase 1 — today's flow verbatim, no state written.

4. **On Run — invoke `/wayrttd` and thread Problem Y forward (AC2).** Invoke `/pmos-toolkit:wayrttd` with `/shape`'s seed (prepend the `[mode: <current-mode>]` first line per the subagent-dispatch contract). Take the surfaced **Problem Y** — `/wayrttd`'s single first-person problem statement — and **use it as the shaping seed** for Phases 1–7, so the context gate, frame, and ladder all operate on the real goal rather than the assumed solution. Record a one-line provenance note for the artifact's felt-problem section: `seed reshaped by /wayrttd: <Problem Y>`. If `/wayrttd` returns a **proceed** verdict (the assumed solution genuinely serves Y), keep the original seed and note that instead. Then continue to Phase 1.

## Phase 1: Context gate {#context-gate}

Classify the work into one of four buckets — **side-project / feature-in-product / new-bet / internal-tool** — which parameterises the lens floor (`reference/problem-lenses.md` downshift matrix). Follow the persistence model in `_shared/lens-ledger.md` Mechanism 3 (not restated): read the persisted classification (workstream signal **>** `.pmos/settings.yaml`), **use it silently when unambiguous**, and confirm **only** when it is absent, document-seeded (low-confidence), or conflicting.

When a confirmation is warranted, issue ONE `AskUserQuestion` whose options are the four buckets, with the inferred/persisted bucket marked **(Recommended)** (this is a convergence move, so a Recommended answer is correct per D3); persist/overwrite the chosen classification. A later run whose signal conflicts re-triggers this single confirm, so a wrong bucket self-heals. Record the bucket + source for the artifact's `context-classification` section.

## Phase 2: Frame {#frame}

Pin the **felt problem**: HMW + JTBD + a one-line "who feels this, and when." Borrow `/ideate`'s framing shape but stop at the *problem* — never name a solution. If the seed already carries HMW/JTBD signal, draft it and confirm in one pass rather than re-asking (anti-pattern #4). Otherwise probe — one question per turn, no Recommended answer (exploration move, D3):
<!-- defer-only: free-form -->
issue one `AskUserQuestion` for the single highest-leverage missing field (who, the felt pain, or the moment it bites).

## Phase 3: Ladder {#ladder}

Find the right **altitude**: climb *why* to generalise, descend *how* to concretise. When the seed reads as a symptom rather than a root cause, run 5-Whys. This is exploration — probe one rung at a time, no Recommended answer:
<!-- defer-only: free-form -->
issue one `AskUserQuestion` that moves up or down exactly one rung based on the prior answer. Record the chosen altitude.

## Phase 4: Decompose {#decompose}

Break the problem at the chosen altitude into sub-problems and identify **which one is the real one**. Exploration cadence — one question per turn, no Recommended answer:
<!-- defer-only: free-form -->
issue one `AskUserQuestion` to test whether a candidate sub-problem is the leverage point or a distraction. Mark the real sub-problem ★ for the artifact.

## Phase 5: Reframe {#reframe}

Surface **2–3 competing framings** (diverge) and apply *ripple-on-the-framing* — "if framed as X vs Y, what does each set in motion downstream?" (the `/ripple-effects` spirit at problem altitude, D6; full ripple stays a handoff). Framings are admissible only as **lenses on the problem**, never solution commitments. Exploration cadence — no Recommended answer:
<!-- defer-only: free-form -->
issue one `AskUserQuestion` contrasting two framings and what each makes true downstream.

## Phase 6: Converge {#converge}

Narrow to the **sharpest 1–2 problem statement(s)** + who / when / why-now. This is a convergence move, so a Recommended answer is correct (D3):
1. **Settle every applicable lens's disposition** per `_shared/lens-ledger.md` Mechanism 1 — Answered / Parked-with-reason / Open question / N/A-for-context — driven by the context bucket's matrix row. A downshifted or N/A lens still records *why* (visible in the ledger).
2. **Mandatory ceiling-breaker (runs here, before the brief is written).** Per `_shared/lens-ledger.md` Mechanism 2, do ONE of: surface ≥1 genuine **off-deck probe** (a problem-specific dimension not in the deck) with a one-line justification, **or** record a one-line **sufficiency attestation** — *"deck sufficient for this problem because …"*. Never fabricate a hollow probe. Spin up an **adaptive lens** on any regulatory / ethical / feasibility-as-constraint / network-effects / hard-dependency signal; it takes a disposition like any other.
3. **Convergence prompt.** Issue one `AskUserQuestion` to pick the sharpest framing — **Frame it as <leading candidate> (Recommended)** / **Use the alternative** / **Both are real — keep two**.

**Autonomous path (`--non-interactive`, D10).** When mode is non-interactive, skip the Phases 2–6 turn-by-turn probing and run the autonomous shaping path (`_shared/lens-ledger.md` Autonomous variant): dispatch **one lens drafter subagent per applicable lens** (`model: sonnet` — bounded single-lens disposition drafting checked by the parent) to draft Answered/Parked/Open from the seed + workstream + research; then a **reviewer subagent** (inherit the parent model — genuine seasoned-leader convergence judgement, not mechanical; `_shared/reviewer-protocol.md` input contract) converges the framing and runs the ceiling-breaker. Unresolved lenses land as **Open question** dispositions; reviewer leaps land as recorded **assumptions**. Escalate to a prompt **only** on a *major* gap that blocks a defensible problem statement (rare); everything else proceeds. Then go to Phase 7.

## Phase 7: Write artifact {#write-artifact}

Emit `{docs_path}/shape/{YYYY-MM-DD}_<slug>.html`.

1. **Render from `reference/artifact-template.html`** — sections: the shaped problem (TL;DR) / felt problem (HMW+JTBD) / context classification / abstraction ladder / decomposition / competing framings / **lens ledger** / open questions / handoff. Each is `<section id="kebab">` with an `<h2 id="kebab">` per `_shared/html-authoring/conventions.md` §3. The **lens-ledger** section renders the *full* ledger — every applicable lens with its disposition, **including N/A and Parked-with-reason**, plus any adaptive lenses and the ceiling-breaker outcome — so an uncovered dimension is visible, not silently absent. There is **no solution section** by design.
2. **Emit per the `_shared/html-authoring/README.md` checklist** (atomic temp-then-rename write with the `.sections.json` companion, idempotent asset copy — `comments.js` and the rest of the substrate payload ride along — cache-busted asset URLs). Deltas: scaffold = this skill's `reference/artifact-template.html`; save path = `{docs_path}/shape/`; asset prefix = `assets/`; no index regeneration.
3. **Skill + phase meta tags.** Embed `<meta name="pmos:skill" content="shape">` (required for `/comments resolve` routing) and `<meta name="pmos:shape-phase" content="complete">` in `<head>`; partial-write checkpoints use the current phase slug.
4. **Validate the brief** with `scripts/validate-brief.mjs <artifact>` — the two `/shape`-specific gates per the operational problem/solution boundary: (a) the ceiling-breaker outcome is present and non-empty (an off-deck probe **or** a sufficiency attestation); (b) **no terminal problem statement is solution-shaped** (names a mechanism/feature/implementation rather than a felt outcome + who + when). A failure is a hard stop — re-shape the offending statement, do not ship a solution-shaped brief.
5. **Print the absolute file path** in the chat summary.

## Phase 8: Handoff {#handoff}

This brief shapes the *problem*; solution work begins downstream. Print 1–3 candidate follow-up commands in the chat summary (named by exact slash syntax) — suggest, never auto-dispatch:

- `/requirements <slug>` — when the shaped problem is ready for acceptance criteria.
- `/ideate <slug>` — to explore solution variants now that the problem is sharp (`/ideate` consumes this brief's HMW+JTBD frame rather than re-deriving — D8).
- `/backlog add --kind epic "<problem title>"` — to capture the shaped problem as work.
- `/ripple-effects <artifact-path>` — optional, when the *consequences of solving it* warrant a full futures-wheel.

Promotion stays explicit — `/shape` dispatches nothing automatically.

## Phase 9: Capture Learnings {#capture-learnings}

**This skill is not complete until the learnings-capture process has run.** Read and follow `_shared/learnings-capture.md` now. Reflect on whether this session surfaced anything worth capturing under `## /shape` — e.g., a context-gate misclassification, a lens that kept reaching the same disposition, an off-deck probe that recurs across problems. Proposing zero learnings is a valid outcome for a smooth session; the gate is that the reflection happens, not that an entry is written.

## Apply comment-resolver edit

This phase is the `/shape` entrypoint that `/comments resolve` dispatches into when walking open threads in a shape artifact's inline `pmos-comments` JSON block. The contract — input/output JSON shapes, closed `error_enum` set, idempotency rules, subagent invocation convention — lives in the shared contract doc and is the single source of truth:

- **Contract (normative):** `plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md`

Per [NFR-08](../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#nfr-h), this phase MUST cite that file rather than restate the contract. `/shape`-specific deltas only:

- **Shim:** `plugins/pmos-toolkit/skills/shape/scripts/apply-edit-at-anchor.js` — exports `apply(input)`, returns the contract's three output shapes per §9.1. The shim's minimal edit inserts an HTML annotation comment immediately before the resolved anchor element.
- **Feasibility:** no read-only regions for `/shape` — all prose sections are editable via standard anchor resolution; only the generic multi-section-restructure infeasibility heuristic applies. A comment that asks to add a *solution* to the brief is out of charter — leave it open for the user (the brief is problem-only by design).
- **Tests:** `plugins/pmos-toolkit/skills/shape/tests/apply-edit-at-anchor.test.js` (5 cases) + wrapper `tests/scripts/assert_apply_edit_at_anchor_shape.sh`.

---

## Anti-Patterns (DO NOT)

1. **Shaping the solution.** The terminal state is a shaped *problem*. A statement is solution-shaped if it names a mechanism/feature/implementation ("add a button", "use a queue"); problem-shaped if it names a felt outcome + who + when. Surfacing solution options collapses into `/ideate`'s job — and `scripts/validate-brief.mjs` hard-fails a solution-shaped terminal statement.
2. **Treating the lens deck as a checklist / ceiling.** The deck (`reference/problem-lenses.md`) is the *floor*; the Phase 6 ceiling-breaker meta-probe is mandatory every run (a real off-deck probe **or** a justified sufficiency attestation — never a fabricated hollow question).
3. **Over-asking on a side project.** The context gate must downshift/drop lenses per the matrix — never grill a weekend project on strategic positioning (Lens 4 = N/A for side-project).
4. **Re-asking persisted context.** Read → use silently if unambiguous → confirm-once only on absent / doc-seeded / conflicting. Never re-ask the context bucket per run.
5. **Acting like `/grill` or `/ideate`.** `/shape` *co-builds* the framing turn by turn — it neither interrogates a committed artifact (`/grill`) nor fans out solution variants (`/ideate`). Offer Recommended answers only on convergence moves; keep exploration probes open.

---

*Spec lineage: `2026-06-16_shape-skill` (design brief `docs/design-briefs/2026-06-16-shape-skill-design.md`; epic 260616-bq9, story 260616-p7b). Floor/ceiling/context-gate mechanism extracted to `_shared/lens-ledger.md` (D7); disposition discipline from `_shared/findings-dispositions.md`; autonomous-path reviewer contract `_shared/reviewer-protocol.md`; `2026-05-23_inline-doc-comments` NFR-08 (comment-resolver citation rule); `2026-05-08_non-interactive-mode` (mode contract, D10 autonomous degradation).*
