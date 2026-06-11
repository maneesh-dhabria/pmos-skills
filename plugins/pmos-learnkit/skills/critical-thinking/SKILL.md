---
name: critical-thinking
description: Run a low-friction, time-boxed critical-thinking practice session for product managers — a varied mix of PM-scoped reasoning exercises (pick-and-defend, assumption-hunt, spot-the-bias, calibration, second-order mapping, reframing, metric-choice, and more), graded on reasoning moves rather than the answer, with an accumulating per-muscle + calibration scorecard so you can see yourself improve. Standalone utility; optionally pulls scenarios from the current repo. Use when the user says "practice critical thinking", "critical thinking exercise", "give me a PM scenario", "quiz me on a product decision", "sharpen my reasoning", "practice product judgment", "PM decision drill", "spot-the-bias drill", "calibration practice", "metric-choice drill", or "/critical-thinking".
user-invocable: true
argument-hint: "[quick|standard|deep|marathon] [--no-repo]"
---

# /critical-thinking

<!-- non-interactive: refused; reason: a live practice session graded on the user's own-words reasoning cannot run unattended; alternative: run /critical-thinking interactively -->

**Announce at start:** "Using /critical-thinking to run a critical-thinking practice session."

A standalone practice gym for PMs. Each session serves a varied mix of PM reasoning exercises sized to the time you have, makes you reason in your own words, grades the *reasoning moves* (not the choice), and tracks per-muscle + calibration progress across sessions. It is **not** part of the requirements→spec→plan pipeline and does **not** load workstream context.

## Track Progress

This skill loops over N exercises. Use your task tracker (e.g. `TaskCreate`) for the phases if helpful; the session summary + scorecard are the canonical record.

## Reference files (loaded on demand)

- `reference/exercise-shapes.md` — the 10 v1 shapes (Generate + Evaluate halves).
- `reference/grading-rubrics.md` — the 9 named moves + the universal grading rule.
- `reference/scorecard-schema.md` — the scorecard JSON + Brier definition.
- `scripts/scorecard.js` — node-stdlib helper: `read` / `update <session.json>` / `summary`.

## Phase 0: Setup {#setup}

1. Announce.
2. **Load learnings.** Read `~/.pmos/learnings.md` if present and factor any entries under the `## /critical-thinking` header into how you run the session (recurring blind spots to probe, calibration tendencies). If the file or header is absent, continue — this skill is otherwise standalone.
3. **Repo framing (README-or-propose).** If the cwd is a git repo and the user hasn't opted out (`--no-repo`, or plain English — "stay generic" works the same): derive the product-decision framing from a `README*` (root or first-level subdir). If no clean framing emerges, skip silently and stay generic.
   - **No README →** study the codebase enough to understand what it does and **offer** to write a reusable `README.md` — an offer, never an unasked write — then use that framing for this session and future ones.
   - Everything else is read-only, and secrets are out of bounds entirely: never read `.env`/secret files; never echo tokens or keys.
4. **Load the scorecard.** Run `node scripts/scorecard.js read` (relative to this skill dir). Degradation (no node, missing/corrupt file): see Platform Adaptation.

## Phase 1: Commitment band (hard input) {#commitment-band}

Issue one `AskUserQuestion` offering four bands → exercise counts:

| Band | Minutes | Exercises |
|---|---|---|
| Quick | 5–10 | 2–3 |
| Standard | 15–20 | 4–5 |
| Deep | ~30 | 6–8 |
| Marathon | 45+ | uncapped — re-prompt "another? / wrap up" every ~3 |

If a band was passed as an argument (`quick|standard|deep|marathon`) or in plain English ("a quick one"), confirm it instead of re-asking. Set `N` = the band's exercise count (Marathon: start at 3, then loop).

## Phase 2: Plan the mix {#plan-the-mix}

Select the session's `N` shapes from `reference/exercise-shapes.md` by principle, not formula: weight toward the weakest muscles (`muscle_scores.strong / seen` ascending; unseen muscles first; first-ever session → spread evenly), cover all three groups (Core / Targeted / Analysis), and vary shapes — never the same shape twice in a row, preferring the least-recently-used (`sessions[].shapes`).

Assign each exercise a PM **domain** (product design · prioritization/tradeoffs · metrics/experimentation · influence/stakeholder · strategy-under-ambiguity · GTM), rotating. Repo-derived exercises: at most **2**, only if Phase 0 (#setup) derived a clean framing, and always keep **≥1–2 generic**. (See Anti-Patterns 3 and 5.)

## Phase 3: Run exercises (loop) {#run-exercises}

For each exercise:

1. **Generate** the scenario **fresh at runtime** — invent a believable PM dilemma on the spot from the shape + its assigned domain (or, for repo-contextual exercises, from the Phase 0 (#setup) repo framing) per the shape's Generate half. Do not draw from a static template bank. State the expected answer shape/length explicitly.
2. **Capture the answer.** Own-words free-form is the default — present a clear numbered prompt. Use `AskUserQuestion` ONLY for the two MC shapes (pick-and-defend, spot-the-bias). On a platform without `AskUserQuestion`, present numbered options as free-form text and ask the user to reply with the number + reasoning.
3. **Grade** per the shape's Evaluate half + `reference/grading-rubrics.md`: score the *moves*, not the choice; name ≥1 missing/weak move and one concrete way to strengthen it; never pure praise. Probe with one pointed follow-up if the shape's primary move is absent.
4. **Record** for the scorecard: per target move, `seen += 1` and `strong += 1` if done well; for calibration exercises, record the `{p, outcome}` pair — shape 7 always resolves in-exercise by revealing its pre-committed hidden resolution after the user states `p` (`reference/exercise-shapes.md` §7).
5. **Marathon only:** after every ~3 exercises, ask "another? / wrap up".

## Phase 4: Session summary + scorecard update {#session-summary}

1. Summarize: muscles practiced, per-muscle takeaways, the **weakest muscle** to target next time, calibration (Brier) trend if any predictions were made, and the streak.
2. Build a session-delta JSON (see `reference/scorecard-schema.md`) and persist via `node scripts/scorecard.js update <delta.json>` (atomic; degradation: see Platform Adaptation).
3. Print the summary to chat with the weakest muscle called out, so the next session can target it.

## Phase 5: Capture Learnings {#capture-learnings}

Reflect on whether this session surfaced anything worth keeping (a shape whose grading was hard to apply, a scenario domain that misfired, a recurring weak muscle pattern). Emit exactly one line:

- `Learning: <what was learned>`, or
- `No new learnings this session because <specific reason>`.

## Platform Adaptation

- **No `AskUserQuestion`:** the two MC shapes degrade to numbered free-form prompts ("reply with the number + one sentence why"); all other shapes are already free-form.
- **No subagents:** the skill is single-agent throughout; nothing to degrade.
- **No `node`:** `scripts/scorecard.js` is bypassed — read/write the scorecard JSON inline and compute Brier = mean((p−outcome)²) directly; log a one-line fallback note. This is the one home of the scorecard-degradation rule: scorecard I/O is never fatal — a missing or corrupt file is reseeded with a note, never a crash.
- **No `.pmos/settings.yaml` needed:** this is a standalone utility; it reads/writes only `~/.pmos/learnkit/critical-thinking/`.

## Anti-Patterns (DO NOT)

1. **Mushy praise grading.** "Great reasoning!" with no move-level critique trains nothing. Every verdict MUST name a specific gap. Grade the reasoning, not how nicely it's written.
2. **Grading the choice instead of the reasoning.** There is no right answer to most scenarios. A confident, well-reasoned defense of any defensible option scores well; a hand-wave for the "best" option does not.
3. **Forcing repo context.** Only use repo-derived scenarios when a clean product-decision framing exists; otherwise stay generic. Never fabricate a product decision from infra-only repos, and never echo secrets, tokens, or file contents.
4. **Lazy, generic scenarios.** Generate each scenario fresh and specific (a real-feeling company stage, domain, and constraint) — vague "a SaaS company…" scenarios feel fake and kill engagement.
5. **Repeating the same 2 shapes every session.** Honor Phase 2 (#plan-the-mix)'s weakest-muscle weighting + least-recently-used rotation; never serve two of the same shape back-to-back.
6. **Loading workstream context or coupling to the pipeline.** This is a standalone utility — workstream pollution biases scenarios. Do not call any workstream loader.

---

*Spec lineage: `docs/pmos/features/2026-05-29_critical-thinking/` (founding feature; README-or-propose framing per rework item A2 and the marathon re-prompt cadence per D2 — see `RESUME_NOTES.md` there); in-exercise calibration resolution and mix-engine principle per the 2026-06-10 skill-design review.*
