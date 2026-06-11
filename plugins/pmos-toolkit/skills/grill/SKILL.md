---
name: grill
description: Adversarially interview the user about a plan, spec, requirements doc, ADR, design, or code change to surface unresolved decisions and shaky assumptions. Walks the decision tree branch by branch — one question at a time, each with a recommended answer. Use when the user says "grill me", "stress-test this plan", "poke holes in my design", "interview me about X", or wants an adversarial review before committing to a direction.
user-invocable: true
argument-hint: "[<path-to-artifact-or-topic>] [--depth brief|standard|deep] [--save|--no-save] [--format <html|md|both>] [--non-interactive | --interactive]"
---

# Grill

Adversarial interrogation of a plan, design, or artifact. Walks the decision tree one branch at a time and proposes a recommended answer for each question. The goal is to expose unstated assumptions, unresolved branches, and weak rationale **before** the user commits to a direction.

This is **orthogonal to the pipeline** — not a stage. Use it on any artifact at any time: a half-formed idea, a `01_requirements.{html,md}`, a draft `02_spec.{html,md}`, an ADR, a code diff, a Slack proposal.

**Announce at start:** "Using the grill skill to stress-test {artifact}."

**Flags are NL-first.** Infer options from the request — "grill me deeply" ≡ `--depth deep`, "quick pass" ≡ `--depth brief`, "don't save the report" ≡ `--no-save`; an explicit flag overrides the inferred intent.

## Platform Adaptation

- **No interactive prompt tool:** fall back to numbered-choice plain-text per `_shared/interactive-prompts.md`.
- **No subagents:** skip the optional codebase-exploration subagent and grep directly.

---

## Phase 0: Intake & Scope {#intake}

1. **Resolve the target.** A file path → read it directly. A pipeline-doc stem (`01_requirements`, `02_spec`, `03_plan`) → resolve via `_shared/resolve-input.md` with the stem's matching `phase=` and `label="<stem>"` (`.html` preferred, `.md` legacy fallback); any other stem reads as a plain path. A URL or topic name → ask the user to paste the content or point to a file.
   <!-- defer-only: ambiguous -->
   No argument → use `AskUserQuestion`: "What are we grilling? (a) most recent artifact in this conversation, (b) a file path, (c) a topic I'll describe inline."

<!-- defer-only: ambiguous -->
2. **Pick depth.** `--depth brief|standard|deep`, default `standard`; confirm via `AskUserQuestion` when no flag or natural-language equivalent was given. The vocabulary is the shared effort dial from `_shared/tier-matrix.md` ("Tier ↔ depth"); legacy spellings (`--depth quick`, boolean `--deep`) are silent aliases for it. Machine coupling: `/feature-sdlc` passes `--depth deep` as a literal string — never rename.

   | Depth | Branches walked | Approx questions |
   |---|---|---|
   | brief | top-level decisions only | 3–5 |
   | standard | top-level + immediate sub-branches | 6–12 |
   | deep | full decision tree to leaves | **no limit** — keep going until the tree is exhausted or the user calls stop |

3. **Summarize what you read** in 3–5 bullets so the user can confirm you've understood the artifact correctly. If the summary is wrong, fix it before grilling — interrogating a misread is wasted turns.

4. **Resolve `output_format`.** Read `output_format` from `.pmos/settings.yaml` (default: `html`; valid values: `html`, `md`, `both`). A `--format <html|md|both>` argument-string flag overrides settings (last flag wins on conflict). Print to stderr exactly: `output_format: <value> (source: <cli|settings|default>)` once at Phase 0 entry. Controls the format of the optional Phase 4 save only — chat output is unaffected.

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

## Phase 1: Build the Decision Tree {#decision-tree}

Before asking anything, internally enumerate the decisions embedded in the artifact. For each one, classify:

| Class | Action |
|---|---|
| **Stated and justified** | Skip. Don't grill what's already defended. |
| **Stated but unjustified** | Grill — "Why this and not X?" |
| **Implied / unstated** | Grill — "I noticed you assume Y; is that intentional?" |
| **Missing entirely** | Grill — "I don't see how this handles Z." |
| **Answerable from code/docs** | Do NOT ask the user — explore the codebase, then report findings. |

Order branches by leverage: questions whose answers gate other questions go first. Don't grill leaves before the root.

## Input Contract (when invoked as reviewer subagent)

When a parent orchestrator (e.g. `/feature-sdlc`'s `#grill` phase) dispatches this skill as a reviewer over a chrome-stripped artifact slice, follow the reviewer side of `_shared/reviewer-protocol.md`: skip this skill's own resolver, enumerate `sections_found` first, emit findings as `{section_id, severity, message, quote: ≥40-char verbatim}`, and never self-validate — validation lives in the dispatcher.

---

## Phase 2: Grill Loop {#grill-loop}

For each branch, in order:

1. **Try to answer from the codebase first.** If the question is "what does the existing auth middleware do?", grep — don't ask.

<!-- defer-only: free-form -->
2. **Compose one `AskUserQuestion` call per question**, then wait for the answer. Shape:
   - `question`: the challenge in one sentence. Be sharp, not hedged. "Why are you handling retries client-side instead of in the gateway?" not "Have you thought about retries?"
   - `options` (up to 4):
     - **[Recommended]** `<your proposed answer>` — what you'd argue for, with the reasoning compressed into the option label
     - 1–2 plausible alternatives (with their tradeoff in the label)
     - **Elaborate** — user types a free-form answer next turn
     - **Skip / not relevant** — user judges the question doesn't apply

3. **Branch based on the answer:** a sub-branch opens → queue it and ask next; the branch closes → mark it resolved and move to the next sibling; the answer reveals a gap not in your tree → insert it and re-prioritize.

4. **Stop conditions** (any one):
   - All branches at the chosen depth are resolved.
   - User says "stop" / "enough" / "wrap it up".
   - For `brief` and `standard` only: you've hit the depth's question budget and the next branch is low-leverage. **Deep mode has no question budget** — only the user or an exhausted tree stops it (a cap was tried and removed in v2.15.1 because deep runs self-truncated).

---

## Phase 3: Grill Report {#report}

Emit a compact report at the end. The report always goes in the chat. Persisting to a file is **opt-in** (Phase 4).

```markdown
# Grill Report — <artifact>

**Depth:** <brief|standard|deep>  •  **Questions asked:** N

## Resolved
- [decision] → [answer + 1-line rationale]

## Open / Deferred
- [question] — needs [info / stakeholder] before [event]

## Gaps surfaced
- [thing the artifact doesn't address] — recommend [action]

## Recommended next step
- [e.g., "Update §3 of spec to capture the retry decision" / "Run /simulate-spec to pressure-test the revised design"]
```

If the artifact is a pipeline doc, suggest the right follow-up skill in **Recommended next step** — but do not auto-invoke it.

---

## Phase 4: Optional Save {#save}

After emitting the chat report, offer to persist it.

1. **Skip the prompt** if the user passed `--no-save` (do nothing) or `--save` (save without asking).

2. **Resolve the save path** in this order (extension is `.html` when `output_format` ∈ {`html`, `both`}; `.md` when `output_format=md`):
   - Target is inside a pipeline feature dir (matches `.../NN_<slug>/` where `NN` is two digits) → `<feature_dir>/grills/{YYYY-MM-DD}_{slug}.<ext>`
   - Target is a repo file outside the pipeline → `<repo_root>/.pmos/grills/{YYYY-MM-DD}_{slug}.<ext>`
   - Target is an inline topic or has no file → `~/.pmos/grills/{YYYY-MM-DD}_{slug}.<ext>`

3. **Build the slug:** kebab-case from the artifact filename (without extension) or, for inline topics, the topic's leading meaningful words; dedupe an existing path with a `-2`/`-3` suffix.

4. **Prompt** (unless `--save`/`--no-save` was passed): "Save grill report to `<resolved_path>`? [Y/n]" — single yes/no question per `_shared/interactive-prompts.md`.

5. **On save (HTML primary path): emit per the `_shared/html-authoring/README.md` checklist** (template slot-fill, atomic write with the `.sections.json` companion, idempotent asset copy, cache-busted asset URLs, heading ids per `conventions.md` §3). Deltas: artifact = `{YYYY-MM-DD}_{slug}.html` at the path from step 2 (create parent dirs as needed); `{{pmos_skill}}` = `grill`; asset prefix = `../assets/` for feature-dir saves (`grills/` is one level below the feature folder; assets copy to `<feature_dir>/assets/`) and `assets/` for repo/home saves (which seed `<repo_root>/.pmos/grills/assets/` / `~/.pmos/grills/assets/` on first use); feature-dir saves regenerate `<feature_dir>/index.html` per `index-generator.md` — repo and home saves do NOT (loose archives). `output_format=both` is retired — treated as `html` until a future feature re-introduces MD export.

6. **On save (MD primary path, `output_format=md`):** write the same markdown report shown in chat, confirm the path back to the user. No substrate copy, no index regen.

---

## Anti-Patterns (DO NOT)

- Do NOT batch questions. One interactive-prompt call = one question, then wait for the answer.
- Do NOT ask questions answerable from the codebase. Grep first.
- Do NOT hedge the recommended option ("maybe consider X?"). Take a position; the user can override.
- Do NOT grill stated-and-justified decisions just to fill the quota. Stop when the leverage runs out.
- Do NOT write the Grill Report to a file silently — always show it in chat first, then offer to persist (Phase 4).
- Do NOT segue into implementing the fixes you surface. The terminal state is the Grill Report.

---

## Phase 5: Capture Learnings {#capture-learnings}

Read and follow `_shared/learnings-capture.md`. Reflect on whether this session surfaced anything worth capturing under `## /grill` — repeated friction (e.g., users overriding the Recommended option in the same way), question-tree shapes that worked well, depth-budget miscalibration. Zero learnings is a valid outcome.

---

*Spec lineage: `2026-05-08_spec-skill-grill-updates` (decision-tree triage, recommended-option shape); `2026-05-09_html-artifacts` (FR-10/FR-22 emit contract, FR-50/51/52 reviewer contract — now substrate-owned by `_shared/html-authoring/` and `_shared/reviewer-protocol.md`); `2026-05-08_non-interactive-mode` (mode contract, FR-12 output_format); deep-mode no-limit per v2.15.1 (`a96e97e`); depth vocabulary per 2026-06-10 skill-design review decision 3.*
