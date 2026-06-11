---
name: creativity
description: Apply structured creativity techniques to requirements and proposed solutions — generate non-obvious improvement ideas across user journeys. Optional enhancer for Tier 3 requirements — apply before /spec. Use when the user says "what are we missing", "think outside the box", "alternative approaches", "can we be more creative", or wants non-obvious ideas for improving the proposed solution.
user-invocable: true
argument-hint: "<path-to-requirements-doc> [--non-interactive | --interactive]"
---

# Creativity Analysis

Evaluate requirements and proposed solutions through structured creativity techniques to generate non-obvious improvement ideas. Quality over quantity, always.

Best applied to **Tier 3 requirements** (features / product launches) after `/requirements` and before `/spec`. Can be combined with `/msf-req`.

```
/requirements  →  [/msf-req, /creativity]  →  /spec  →  /plan  →  /execute  →  /verify
                             (this skill) ↑
```

**Announce at start:** "Using the creativity skill to evaluate improvement ideas for the requirements."

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:
- **No interactive prompt tool:** State your assumption, document it in the output, and proceed. The user reviews after completion.
- **No subagents:** Perform research and analysis sequentially as a single agent.

---

## Phase 0: Setup {#setup}

1. **Load learnings.** Read `~/.pmos/learnings.md` if it exists; note any entries under `## /creativity` and factor them into your approach for this session.
2. **Locate the requirements doc.** Follow `_shared/resolve-input.md` with `phase=requirements`, `label="requirements doc"`. Read the resolved file end-to-end before Phase 1.

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

## Phase 1: Identify & Align on Personas {#personas}

Follow `_shared/persona-journey-alignment.md` Step 1, with `source` = the resolved requirements doc (proposes 2–5 personas, ≤2 scenarios each; priority on **new users** and **power users**).

<!-- defer-only: ambiguous -->
The persona confirmation (`AskUserQuestion`) is mandatory — never skipped. (In non-interactive mode it DEFERs per the standard contract and the proposed personas carry forward as documented assumptions.)

---

## Phase 2: Identify & Confirm Journeys {#journeys}

<!-- defer-only: ambiguous -->
Follow `_shared/persona-journey-alignment.md` Step 2 (`source` = the resolved requirements doc) — list and confirm the journeys via `AskUserQuestion` before proceeding.

---

## Phase 3: Analyze {#analyze}

For each confirmed journey, apply the creativity lenses below from the approved personas and scenarios. When there are multiple journeys, analyze them in parallel — one subagent per journey, capturing both journey-level and aggregate findings — but serialize edits to any shared file: never let two agents edit the same file concurrently.

### Creativity lenses

**Tier 1 — Prioritize (spend more thought here):**

| Technique | Prompt |
|-----------|--------|
| **Remove friction** | What steps, clicks, decisions, or waits can be eliminated entirely? |
| **Reduce anxiety** | Where does the user feel uncertain, exposed, or at risk? How can we reassure them? |
| **Solve an unexpressed but real need** | What does the user actually want but hasn't articulated — or doesn't know they want? |
| **Reframe** | What if we redefine the problem? What if the constraint we assumed isn't actually a constraint? |
| **Make it unnecessary** | What if the user didn't need to do this step at all? Can the system do it for them? |
| **Do the opposite** | What if we reversed the expected flow, the default, or the convention? |

**Tier 2 — Apply but don't force:** the broader repertoire (12 lenses) lives in `reference/techniques.md` — read it when you reach this pass and give each lens a quick pass only.

**Floor, not ceiling:** the lenses are a floor — if a stronger idea comes from outside the catalog, include it and name your own lens.

**Quality over coverage:** each technique should produce 0 or 1 strong idea per journey. Skip freely if nothing strong — don't pad.

### Save Analysis

Save consolidated findings to `docs/creativity/YYYY-MM-DD-<feature-name>-creativity-analysis.md`. Commit.

**Report format:** Table-heavy, minimal prose.

Per-journey output table:

| Technique | Idea | Affected Journey/Screen | Effort | Priority |
|-----------|------|------------------------|--------|----------|

---

## Phase 4: Prioritize & Agree on Recommendations {#prioritize}

Collect a **per-recommendation verdict with grouped display**: group by priority, present each group's recommendations together, and let the user accept/reject each one individually — never a single group-level accept/reject. Priority groups:
- **Must** — High-impact ideas that fundamentally improve the experience
- **Should** — Strong improvements worth the effort
- **Nice-to-Have** — Polish and delight items

<!-- defer-only: ambiguous -->
Present each group via `AskUserQuestion` (multiSelect across the group's recommendations; selected = accepted). Each recommendation states its severity, affected screens/journeys, and implementation effort (Low / Medium / High).

**Dropped items stay in the analysis doc as ~~strikethrough~~ with "DROPPED" label**, for future reconsideration. Capture both agreed and dropped recommendations.

---

## Phase 5: Check Scope of Changes {#apply-scope}

<!-- defer-only: ambiguous -->
Ask the user (`AskUserQuestion`) whether to update:
- (a) The requirements doc
- (b) Wireframes
- (c) Both

Only proceed with what the user approves.

**Companion re-emit:** when this phase edits `01_requirements.html`, re-emit the sibling `01_requirements.sections.json` from the post-edit section tree, atomically via temp-then-rename (the HTML and its sections.json are an atomic pair per `_shared/html-authoring/README.md` FR-71 — both succeed or neither persists).

**Wireframe guidance:** Update the current wireframe files per /wireframes' output layout — never rewrite iteration history. Add visual elements for layout-affecting changes. Copy/label changes can be text annotations only.

---

## Phase 6: Consistency Pass {#consistency}

After any updates, run a final check:

1. Cross-reference every agreed recommendation against the revised requirements to confirm it was applied
2. Check for contradictions between sections
3. Verify wireframes match updated requirements text (if wireframes were updated)

Report any discrepancies found.

---

## Phase 7: Capture Learnings {#capture-learnings}

**This skill is not complete until the learnings-capture process has run.** Read and follow `_shared/learnings-capture.md` (relative to the skills directory) now. Reflect on whether this session surfaced anything worth capturing — surprising behaviors, repeated corrections, non-obvious decisions. Proposing zero learnings is a valid outcome for a smooth session; the gate is that the reflection happens, not that an entry is written.

---

## Anti-Patterns (DO NOT)

- Do NOT skip persona alignment — creativity without user context produces generic ideas
- Do NOT force ideas from every technique — 0 ideas from a technique is fine
- Do NOT present a wall of ideas — grouped display, individual verdicts (Phase 4)
- Do NOT modify requirements or wireframes without user approval in Phase 5
- Do NOT spend equal time on all techniques — Tier 1 gets deep thought, Tier 2 gets a quick pass
- Do NOT remove dropped items from the doc — strikethrough with DROPPED label preserves them for future reconsideration

---

*Spec lineage: founding catalog `727504e`; non-interactive rollout `364d1eb` (mode contract); persona/journey alignment extracted to `_shared/persona-journey-alignment.md` in `73675d7`; sections.json companion re-emit per `2026-05-28_inline-html-artifacts`; Tier-2 catalog moved to `reference/techniques.md` per the 2026-06-10 skill-design review (write-side modernization deliberately deferred — P3).*
