---
name: wayrttd
description: WAYRTTD — What Are You Really Trying To Do — a fast reflexive gut-check for an assumed-solution ask. Climbs the "and what would that get you?" ladder from the proposed solution up to the real goal, then re-tests whether that solution even serves it. Runs a five-step inversion (capture Solution X verbatim, climb to intent, name Problem Y in the first person, re-test X against Y, then a proceed/reconsider/pivot verdict) in 2–5 minutes and a handful of turns, and emits a compact commentable HTML capture. The fast counterpart to /shape (a deep shaping session) and /ideate (solution fan-out) — hands off to them for depth, never absorbs it. Use when the user says "what am I really trying to do", "wayrttd", "am I solving the right problem", "surface the real goal behind this ask", "sanity-check what I'm about to build", or "/wayrttd".
user-invocable: true
argument-hint: "<assumed-solution-or-ask> [--non-interactive | --interactive]"
---

# /wayrttd

**Announce at start:** "Using /wayrttd — climbing from the assumed solution up to what you're really trying to do."

WAYRTTD ("What Are You Really Trying To Do?") is a fast reflexive thinking tool. The picture that *is* the skill: someone tapes chairs into a tower to reach a balloon ("how do I stick these chairs together?" — the assumed **Solution X**) when what they actually want is *to reach the balloon* (the real **Problem Y**) — and once Y is named, the tape already in hand may beat the chair-tower they were about to build.

The job: catch yourself asking for help with an assumed solution, climb from that solution up to the real goal, and re-examine whether the solution even serves it — **before** sinking effort into building X. It is deliberately shallow-but-fast: the value is the inversion, not exhaustiveness. When you want depth, it hands off — it never turns into a shaping session.

## When to use this

- Someone is about to build / ask for / commit to a specific thing and wants a 2-minute sanity check that it's the right thing.
- A request arrives phrased as a solution ("I need a dashboard for X") and the real goal behind it is worth surfacing first.
- You want the real goal named before opening a deeper tool, so that tool works the right problem.

**When NOT to use:**

- The problem is already known and you want it deeply shaped (JTBD, HMW, ceiling-breaker) → run `/shape` (a full session).
- The goal is clear and you want solution options fanned out and pressure-tested → run `/ideate`.
- You have a committed plan to adversarially interrogate → run `/grill`.

WAYRTTD is the fast **tee-up** for those tools, not a replacement — see the handoff in Phase 5 (`#verdict`).

## Track Progress

This skill has multiple phases. Create one task per phase using your agent's task-tracking tool (e.g., `TaskCreate` in Claude Code, `TodoWrite` equivalent in older harnesses). Mark each task `in_progress` when you start it and `completed` when it finishes — never batch completions. Because the whole run targets ≤~5 exchanges (INV-3), keep the tracking lightweight; the conversation itself is the artifact until Phase 6 (`#emit-capture`).

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No `AskUserQuestion` tool:** This skill is free-form conversational by design (one plain question per turn) — there is nothing structured to degrade. The intent-climb ladder is ordinary dialogue.
- **No subagents:** All phases run single-agent; there is no parallel work to degrade.
- **No `.pmos/settings.yaml`:** Run `_shared/pipeline-setup.md` Section A first-run setup before resolving `{docs_path}` for the Phase 6 capture.
- **TaskCreate / TodoWrite missing:** The skill body works without task tracking; the emitted capture (`pmos:skill` meta) is the durable record.
- **Browser / Playwright:** Not used by this skill.

## Non-interactive mode

This skill honours `--non-interactive` per the canonical contract inlined below (byte-identical to `_shared/non-interactive.md`; audited by `tools/lint-non-interactive-inline.sh`). WAYRTTD issues no `AskUserQuestion` calls — the ladder is free-form dialogue — so the classifier never fires; under `--non-interactive` the skill runs the autonomous single-pass path in Phase 0 (`#setup`) → Phase 5 (`#verdict`) described at each phase (D7), buffering any genuinely blocking ambiguity to the open-questions log rather than deadlocking.

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

## The five-step inversion

```
/wayrttd <ask> ─▶ ① CAPTURE Solution X (verbatim, first person)
               ─▶ ② CLIMB   "and what would that get you?" → stop at the actionable rung
               ─▶ ③ NAME    Problem Y (one first-person sentence)
               ─▶ ④ RE-TEST X against Y → 1–3 bounded alternatives
               ─▶ ⑤ VERDICT proceed / reconsider / pivot + named handoff
               ─▶ ⑥ EMIT    compact HTML capture (X → ladder → Y → alts → verdict)
```

Setup (Phase 0) and capture-learnings (Phase 7) wrap the loop. Every WAYRTTD line — prompts and the emitted capture alike — is written **in the first person, from the POV of the person making the decision** ("what *I'm* really trying to do"), never a detached third-person analysis (INV-1). This is a hard voice constraint for the whole skill.

## Phase 0: Setup {#setup}

1. **Resolve the seed.** The argument string (minus mode flags) is the assumed solution or ask (Solution X). If empty in interactive mode, ask one plain question: "What are you about to build, buy, or do?" In `--non-interactive` mode with an empty seed, buffer an open question and stop with a stderr note (no deadlock).
2. **Read `~/.pmos/learnings.md`** if present; note any entries under `## /wayrttd` and factor them into your approach. Skill body wins on conflict; surface conflicts to the user before applying.
3. **Resolve `{docs_path}`** for the Phase 6 capture (`.pmos/settings.yaml :: docs_path`, default `docs/pmos`); if settings are missing, run `_shared/pipeline-setup.md` Section A first.
4. **Mode.** Print the `mode:` line per the non-interactive block. In `--non-interactive`, run Phases 1–5 as a single autonomous pass over the seed — a best-effort ladder, a named Y, and a verdict — without pausing for confirmation (D7).

## Phase 1: Capture Solution X {#capture-solution}

Restate the assumed solution **verbatim, in the user's own words and first-person voice** — "I want to tape these chairs into a tower." Do not paraphrase into goal language yet; capturing X unedited is what makes the later re-test honest (INV-1). Echo it back in one line so the user can confirm or correct it. In `--non-interactive`, take the seed as X as-is.

## Phase 2: Climb the intent ladder {#climb-ladder}

Climb from X toward the real goal, **one rung at a time**, asking the same question each rung: *"and what would that get you?"* / *"what are you really trying to do?"* In interactive mode this is one plain question per turn — free-form dialogue, not a structured card. Each answer becomes the next rung.

- **Stop at the actionable rung.** Terminate at the highest rung that is still specific enough to act on — *not* at an un-actionable life-goal platitude ("be happy", "grow the business"). State the stop reason in one line: "Stopping here — the next rung ('…') is too broad to act on" (INV-4).
- **Stay solutions-agnostic while climbing.** The ladder surfaces the goal; it does not propose solutions yet (that comes in Phase 4). Do not fan out an idea list — that is `/ideate` (INV-2).
- **Keep it fast.** Two to four rungs is typical; if you are past ~5 you have probably overshot into life-goals — back down to the last actionable rung (INV-3).

In `--non-interactive`, infer the ladder from the seed in a single pass and record each rung.

## Phase 3: Name Problem Y {#name-problem}

Name the real goal as **a single first-person sentence** — "What I'm really trying to do is reach the balloon before the party starts" (INV-1). This is the highest actionable rung from Phase 2, sharpened into one crisp statement. It is the pivot the whole skill turns on: everything before it climbs *to* Y, everything after re-tests X *against* it.

## Phase 4: Re-test the solution {#retest-solution}

Now that Y is explicit, re-test the assumed X against it:

- **Does X actually serve Y?** Judge honestly whether the assumed solution is even the right shape for the named goal.
- **Is there a cheaper / simpler / already-available path?** ("We already have tape.") Surface **1–3 bounded alternatives** that also reach Y — no more. This is a bounded re-test, never an idea fan-out (INV-2); if the user wants the full solution space, hand off to `/ideate` in Phase 5 (`#verdict`).

## Phase 5: Verdict & handoff {#verdict}

Close with exactly one verdict on the assumed solution:

- **Proceed** — X genuinely serves Y; go build it (now with the goal named).
- **Reconsider** — a lighter path from Phase 4 reaches Y more cheaply; weigh it before committing.
- **Pivot** — X solves the wrong Y; the real goal points elsewhere.

Then add **one** named handoff line — WAYRTTD delegates depth, it never re-implements it inline (INV-5):

- Fuzzy or contested Y that needs deep shaping → **`/shape`**.
- Clear Y but competing solutions to explore → **`/ideate`**.
- Y is sharp and X confirmed → **`/requirements`** to write it up.

The terminal state is a first-person Y statement + a verdict + one handoff. Depth is a handoff, not a feature of this skill (D5).

## Phase 6: Emit the capture {#emit-capture}

Emit a **compact** commentable HTML capture — light by construction so it never becomes a `/shape`-weight brief (D4).

1. **Render** from `reference/artifact-template.html` (see `#reference-files`) via the html-authoring substrate — `_shared/html-authoring/render.js`'s `renderArtifact()` with a **content-only fragment** (never hand-author the HTML). Five sections, each `<section id="kebab-id">` with a matching `<h2 id="kebab-id">` per `_shared/html-authoring/conventions.md` §3: `solution-x`, `intent-ladder` (the rungs as an ordered list), `problem-y`, `alternatives`, `verdict`.
2. **Emit per the `_shared/html-authoring/README.md` checklist** — atomic temp-then-rename write with the `.sections.json` companion, idempotent asset copy (the substrate payload, including `comments.js`, rides along), cache-busted asset URLs. Save path = `{docs_path}/wayrttd/{YYYY-MM-DD}_<slug>.html`; `<slug>` derived from Problem Y. The `wayrttd` dir is a loose archive — no index regeneration.
3. **Skill meta.** Embed `<meta name="pmos:skill" content="wayrttd">` in `<head>` (required for `/comments resolve` routing). All prose sections are editable via standard anchor resolution — see `#reference-files`.

In `--non-interactive`, still emit the capture; append the open-questions block per the non-interactive flush rules if any ambiguity was buffered.

## Phase 7: Capture Learnings {#capture-learnings}

If the run surfaced a reusable lesson — a ladder that kept overshooting into life-goals, a class of ask where the verdict is reliably "reconsider", a phrasing that lands the first-person Y better — append it under `## /wayrttd` in `~/.pmos/learnings.md` (create the file/heading if absent). Keep entries short and imperative. Skip silently if there is nothing durable to record — do not manufacture a learning.

## Anti-patterns {#anti-patterns}

- **Turning the ladder into a shaping session.** WAYRTTD is fast by construction (INV-3); if you are running six lenses or many turns, you are doing `/shape`'s job. Name Y and hand off.
- **Proposing solutions while climbing.** Phase 2 (`#climb-ladder`) surfaces the goal only; solutions are re-tested once, boundedly, in Phase 4 (`#retest-solution`) — never a fan-out (INV-2).
- **Climbing to a life-goal.** Stopping at "be happy" makes Y un-actionable; stop at the highest rung you can still act on and say why (INV-4).
- **Third-person analysis.** The whole run and capture are first-person, decision-maker POV (INV-1) — "what *I'm* really trying to do", not "the user is trying to…".

## Reference files {#reference-files}

- `reference/artifact-template.html` — the compact five-section capture scaffold rendered in Phase 6 (`#emit-capture`).
- `scripts/apply-edit-at-anchor.js` — Node-callable shim for `/comments resolve` routing; exports `apply(input)` returning the three output shapes in `_shared/apply-edit-at-anchor.md` §9.1. The minimal edit inserts an HTML annotation comment immediately before the resolved anchor element.
- `tests/apply-edit-at-anchor.test.js` — the 5-case contract test for the shim (id-first, orphan, idempotent, infeasible, clarification).
