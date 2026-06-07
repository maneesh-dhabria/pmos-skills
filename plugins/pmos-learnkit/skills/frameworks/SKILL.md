---
name: frameworks
description: Your searchable library of PM frameworks — describe a problem and get the 2–5 most relevant frameworks (RICE, JTBD, Kano, regret-minimization, …) with a one-line "why it fits", a PM's-take commentary, and an owned diagram, or browse the whole filterable collection offline from file://. Each framework carries problem-tags, a decision-type, and when-to-use / when-not-to-use guidance so matching is precise, and a --json mode lets other skills ask "which framework for this?" programmatically. Ships a pre-built corpus sourced from your Notion framework database; re-ingest with sync. Use when the user is stuck on a decision and wants a thinking tool, asks which framework applies, or wants to browse the library. Triggers when the user says "/frameworks", "which framework should I use", "find a PM framework for this", "frameworks for prioritization", "what framework helps with this decision", "browse my framework library", or "rebuild the frameworks corpus".
user-invocable: true
argument-hint: "[\"<problem>\" | browse | list | situations | sync [--changed-only]] [--json] [--floor N] [--format <html|md|both>] [--non-interactive] [--interactive]"
---

# Frameworks

**Announce at start:** "Using frameworks to find the PM thinking tools that fit this problem."

A searchable, offline library of product-management frameworks. The value is
**precise retrieval + trustworthy framing**, not a list dump: describe a problem in
plain words and get the handful of frameworks actually worth reaching for, each with
a one-line reason it fits, the curator's "PM's take", and an owned diagram. Other
skills can ask the same question programmatically via `--json`.

The corpus ships pre-built under `${CLAUDE_SKILL_DIR}/data/` (sourced from the user's
Notion framework database). Runtime retrieval, browse, and `--json` are **fully
offline** over that shipped corpus — no network, no Notion. Only `sync` touches the
network, and a failed `sync` never disturbs the shipped corpus.

The deep mechanics live one hop away in `reference/` — keep this body lean:

- `${CLAUDE_SKILL_DIR}/reference/corpus-schema.md` — the `frameworks.json` record contract (lean fields + cached match-fields).
- `${CLAUDE_SKILL_DIR}/reference/situation-taxonomy.md` — the closed `problem_tags` registry + the situations design.
- `${CLAUDE_SKILL_DIR}/reference/ingestion.md` — the `sync` pipeline (Stage A scripts + Stage B agent) and the `/diagram` batch contract.
- `${CLAUDE_SKILL_DIR}/reference/matching.md` — the two-stage ranking algorithm and the `--json` contract.

The Stage-A scripts under `${CLAUDE_SKILL_DIR}/scripts/` are zero-dep Node `.mjs`
with a `--selftest` mode each. Drive ingestion and matching through them — never
hand-parse `frameworks.json`.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No `AskUserQuestion`:** the `sync` confirmation and any disambiguation prompt
  degrade to numbered free-form prompts per `_shared/interactive-prompts.md`. The
  non-interactive auto-pick contract (Recommended → AUTO-PICK) still applies.
- **No `Task` subagent:** the Stage-B match-field derivation and the `/diagram`
  batch run sequentially in the host conversation — one framework after another.
  Slower, identical output.
- **No `/diagram` skill available:** `sync` still writes the corpus; it logs each
  framework with `diagram: null` and a `ship-with-warning` note. The library renders
  a text-only card for those — never a broken image.
- **No Notion MCP:** `sync` is unavailable (it fails cleanly with that reason); all
  runtime paths (`"<problem>"`, `browse`, `situations`, `--json`) keep working over
  the shipped corpus.
- **No browser / Playwright:** `browse` still writes `index.html`; opening it is a
  manual step the skill prints as a `file://` path.

## Track Progress

This skill has multiple sequential phases. Create one task per phase using your
agent's task-tracking tool (e.g. `TaskCreate` in Claude Code). Mark each in-progress
when you start it and completed as soon as it finishes — do not batch completions.
The runtime paths (retrieve / browse / situations) are short; the `sync` path is the
long, multi-phase one.

## When NOT to use

- The user wants to **learn a topic in depth** (a primer, a reading list, a
  multi-source explainer) → that is `/primer` or `/learn-list`, not a framework
  lookup.
- The user wants to **apply** one specific framework to their data and produce an
  artifact (e.g. "build me a RICE table for these 12 features") → this skill finds
  and explains the framework; building the filled-in artifact is `/artifact` or a
  spreadsheet, not this skill.
- The user wants **adversarial pressure-testing** of a decision they've already made
  → that is `/grill`.
- The framework they want isn't about product management (a software-design pattern,
  a statistical method) → out of corpus scope; say so rather than forcing a match.

## Phase 0: Setup + Load Learnings

Inline `_shared/pipeline-setup.md` to read `.pmos/settings.yaml` (require `version`;
default `output_format` to `html` when absent) and resolve `{docs_path}`. The browse
library is written to `{docs_path}/frameworks/index.html` (`mkdir -p` if missing);
the shipped source corpus lives read-only under `${CLAUDE_SKILL_DIR}/data/`.

Resolve `output_format` with precedence `cli --format > settings.output_format >
default "html"`. On Phase 0 entry, print to stderr `output_format: <v> (source:
<cli|settings|default>)`. v1 emits HTML only; `--format both` is reserved.

Read `~/.pmos/learnings.md` if present; note any entries under the `## /frameworks`
heading and factor them into your approach. **The skill body wins on conflict** —
surface any conflict between a learning and the body to the user before applying it.

The canonical non-interactive block below handles `mode` resolution, the
per-checkpoint classifier, the OQ buffer, and the end-of-skill summary. Do not
paraphrase or move it.

<!-- non-interactive-block:start -->
1. **Mode resolution.** Compute `(mode, source)` with precedence: `cli_flag > parent_marker > settings.default_mode > builtin-default ("interactive")` (FR-01).
   - `cli_flag` is `--non-interactive` or `--interactive` parsed from this skill's argument string. Last flag wins on conflict (FR-01.1).
   - `parent_marker` is set if the original prompt's first line matches `^\[mode: (interactive|non-interactive)\]$` (FR-06.1).
   - `settings.default_mode` is `.pmos/settings.yaml :: default_mode` if present and one of `interactive`/`non-interactive`. Unknown values → warn on stderr `settings: invalid default_mode value '<v>'; ignoring` and fall through (FR-01.3).
   - If `.pmos/settings.yaml` is malformed (not parseable as YAML, or missing `version`): print to stderr `settings.yaml malformed; fix and re-run` and exit 64 (FR-01.5).
   - On Phase 0 entry, always print to stderr exactly: `mode: <mode> (source: <source>)` (FR-01.2).

2. **Per-checkpoint classifier.** Before issuing any `AskUserQuestion` call, classify it (FR-02):
   - Use the awk extractor below to find the line of this call's `question:` key in the live SKILL.md (FR-02.6).
   - The defer-only tag, if present, is the literal previous non-empty line: `<!-- defer-only: <reason> -->` where `<reason>` ∈ {`destructive`, `free-form`, `ambiguous`} (FR-02.5).
   - Decision (in order): tag adjacent → DEFER; multiSelect with 0 Recommended → DEFER; 0 options OR no option label ends in `(Recommended)` → DEFER; else AUTO-PICK the (Recommended) option (FR-02.2).

3. **Buffer + flush.** Maintain an append-only OQ buffer in conversation memory. On each AUTO-PICK or DEFER classification, append one entry per the schema in spec §11.2. At end-of-skill (or in a caught error before exit), flush (FR-03):
   - Primary artifact is single Markdown → append `## Open Questions (Non-Interactive Run)` section with one fenced YAML block per entry; update prose frontmatter (`**Mode:**`, `**Run Outcome:**`, `**Open Questions:** N` where N counts deferred only — see FR-03.4) (FR-03.1).
   - Skill produces multiple artifacts → write a single `_open_questions.md` aggregator at the artifact directory root; primary artifact's frontmatter `**Open Questions:** N — see _open_questions.md` (FR-03.5).
   - Primary artifact is non-MD (SVG, etc.) → write sidecar `<artifact>.open-questions.md` (FR-03.2).
   - No persistent artifact (chat-only) → emit buffer to stderr at end-of-run as a single block prefixed `--- OPEN QUESTIONS ---` (FR-03.3).
   - Mid-skill error → flush partial buffer under heading `## Open Questions (Non-Interactive Run — partial; skill errored)`; set `**Run Outcome:** error`; exit 1 (E13).

4. **Subagent dispatch.** When dispatching a child skill via Task tool or inline invocation, prepend the literal first line: `[mode: <current-mode>]\n` to the child's prompt (FR-06).

5. **Awk extractor.** The classifier and `tools/audit-recommended.sh` MUST both use the function below. Loaded at script init time; sourcing differs per consumer.

<!-- awk-extractor:start -->
```awk
# Find AskUserQuestion call sites and their adjacent defer-only tags.
# Input: a SKILL.md file (stdin or argv).
# Output (TSV): <line_no>\t<has_recommended:0|1>\t<defer_only_reason or "-">
# A "call site" is a line referencing `AskUserQuestion` in the SKILL's own prose
# (backtick mentions, prose instructions, multi-line invocation hints).
# `(Recommended)` is detected on the call site line OR any subsequent non-blank
# line (the option-list block) until a blank line, defer-only tag, or another
# AskUserQuestion call closes the pending call. Lines inside the inlined
# `<!-- non-interactive-block:... -->` region are canonical contract text and
# never count as call sites.
function emit_pending() {
  if (pending_call > 0) {
    out_tag = (pending_call_tag != "") ? pending_call_tag : "-";
    printf "%d\t%d\t%s\n", pending_call, pending_has_recc, out_tag;
    pending_call = 0;
    pending_has_recc = 0;
    pending_call_tag = "";
  }
}
/^<!-- non-interactive-block:start -->$/ { in_inlined=1; next }
/^<!-- non-interactive-block:end -->$/   { in_inlined=0; next }
in_inlined { next }
/^[[:space:]]*<!--[[:space:]]*defer-only:[[:space:]]*([a-z-]+)[[:space:]]*-->/ {
  emit_pending();
  match($0, /defer-only:[[:space:]]*[a-z-]+/);
  pending_tag = substr($0, RSTART + 12, RLENGTH - 12);
  sub(/^[[:space:]]+/, "", pending_tag);
  pending_line = NR;
  next;
}
/^[[:space:]]*$/ {
  emit_pending();
  pending_tag = "";
  next;
}
/AskUserQuestion/ {
  emit_pending();
  pending_call = NR;
  pending_has_recc = ($0 ~ /\(Recommended\)/) ? 1 : 0;
  pending_call_tag = (pending_tag != "" && NR == pending_line + 1) ? pending_tag : "";
  pending_tag = "";
  next;
}
{
  if (pending_call > 0 && $0 ~ /\(Recommended\)/) {
    pending_has_recc = 1;
  }
}
END { emit_pending() }
```
<!-- awk-extractor:end -->

6. **Refusal check.** If this SKILL.md contains a `<!-- non-interactive: refused; ... -->` marker (regex: `<!--[[:space:]]*non-interactive:[[:space:]]*refused`), and `mode` resolved to `non-interactive`: emit refusal per Section A and exit 64 (FR-07).

7. **Pre-rollout BC.** If the `--non-interactive` argument is present BUT this SKILL.md does NOT contain the `<!-- non-interactive-block:start -->` marker (i.e., this skill hasn't been rolled out yet): emit `WARNING: --non-interactive not yet supported by /<skill>; falling back to interactive.` to stderr; continue in interactive mode (FR-08).

8. **End-of-skill summary.** Print to stderr at exit: `pmos-toolkit: /<skill> finished — outcome=<clean|deferred|error>, open_questions=<N>` (NFR-07).
<!-- non-interactive-block:end -->

## Phase 1: Resolve command

Dispatch the argument string by its first token:

- `browse` | `list` (or bare `/frameworks` with no problem text) → **Browse** (Phase 4).
- `situations` → **Situations** (Phase 3): list the closed taxonomy, grouped by super-category.
- `sync` `[--changed-only]` → **Sync** (Phase 5): re-ingest from Notion. This is the only network path; warn it is long and token-heavy before starting.
- anything else (a quoted or bare problem string) → **Retrieve** (Phase 2).

`--json` is a modifier on the Retrieve path (structured output, no chat prose, no
library open). `--floor N` tunes the confidence threshold on Retrieve. These are
parsed off the argument string before dispatch.

## Phase 2: Retrieve — "<problem>" → ranked frameworks

Run the two-stage matcher per `${CLAUDE_SKILL_DIR}/reference/matching.md`:

1. **Situation shortcut.** If the input is (or fuzzy-matches) a known situation
   label/id from `data/situations.json`, return that situation's `frameworks[]`
   ranked by tag overlap — skip to step 3 for the human path.
2. **Free-text path.** Deterministic prefilter first:
   ```
   node ${CLAUDE_SKILL_DIR}/scripts/match.mjs --query "<problem>" [--floor N] [--json]
   ```
   `match.mjs` tokenizes the problem and scores each record by weighted overlap
   (`problem_tags` ×3, `name`/`aliases` ×2, `when_to_use`+`summary` ×1), returning
   the top ~15 candidates with scores. If the top score is below the floor (default
   `0.15`), it flags `low_confidence` and returns ≤2 closest — **never pad to 5**.
3. **LLM re-rank (human path).** Re-rank the prefilter candidates against the problem
   in-session, write a ≤1-sentence "why it fits" per pick, cap at 5. For `--json`,
   the deterministic prefilter output is acceptable without an LLM re-rank when no
   session context is available (see `reference/matching.md`).
4. **Present.** Human path: print the ranked top-5 (name · why · category ·
   decision_type) in chat, then open the library (`index.html`) focused on those ids.
   `--json` path: emit **only** the JSON object to stdout per the `--json` contract
   in `reference/matching.md` — no chat prose.

## Phase 3: Situations

Read `data/situations.json` and list the situations grouped by `super_category`
(Strategy & Business · Product · Analytics, Design & Finance · People, Personal &
Career). Each line: the situation label and the framework names it maps to. This is
the curated "I don't know what to search for" entry point. No network.

## Phase 4: Browse — the filterable library

Build (if stale) and open the self-contained library:

```
node ${CLAUDE_SKILL_DIR}/scripts/build-library.mjs --out {docs_path}/frameworks/index.html
```

`build-library.mjs` reads `data/frameworks.json` + `data/diagrams/*.svg` and emits a
single self-contained `index.html` (diagrams inlined as `<svg>`, filter controls +
search, inline-expand detail with the "PM's take" block) that works offline from
`file://`. Print the `file://` path. Diagrams are owned SVGs inlined into the page —
**never** hot-linked S3 URLs.

## Phase 5: Sync — re-ingest from Notion

The full ingestion pipeline. Network + token-heavy; confirm before running.

<!-- defer-only: destructive -->
Confirm via `AskUserQuestion` — **Sync now (Recommended)** / **Cancel** — before the
fetch. (`--changed-only` makes this cheap; a full sync regenerates every diagram.)

Then follow `${CLAUDE_SKILL_DIR}/reference/ingestion.md` end to end:

1. **Fetch** each of the 22 Notion category pages via `notion-fetch` (save large
   pages to a temp file and slice past the token cap).
2. **Split** each category markdown into per-framework records:
   `node ${CLAUDE_SKILL_DIR}/scripts/split-corpus.mjs <category.md> ...`.
3. **Derive match-fields** (Stage B): per framework emit `problem_tags` (⊆ registry),
   `when_to_use`, `when_not_to_use`, `decision_type`, `lifecycle_stage`, `related`,
   `summary`; merge + validate via
   `node ${CLAUDE_SKILL_DIR}/scripts/derive-fields.mjs`. Fan out with parallel
   subagents (N frameworks each, strict output contract).
4. **Diagrams** (Stage B, `/diagram` batch): one owned SVG per framework at full
   rigor, `--non-interactive --approach "<framing>" --theme technical --on-failure
   ship-with-warning`. `--changed-only` skips frameworks whose `body_md` content-hash
   is unchanged (cache in `data/.diagram-hashes.json`).
5. **Assemble + validate**: write `data/frameworks.json`; run
   `node ${CLAUDE_SKILL_DIR}/scripts/validate-corpus.mjs` (exit 1 on <95% coverage
   or any invalid tag).
6. **Build library**: `build-library.mjs` → shipped `index.html`.

`sync` never writes derived fields back to Notion, never hot-links S3, and on a
Notion-unreachable error fails cleanly leaving the shipped corpus untouched.

## Anti-Patterns (DO NOT)

- **DO NOT hot-link S3 image URLs** from Notion into the corpus or library — they
  expire in ~1 hour. Diagrams are owned SVGs, generated by `/diagram`, inlined.
- **DO NOT block any runtime path on Notion.** Retrieve / browse / situations /
  `--json` read the shipped corpus only and must work with no network.
- **DO NOT pad matches past the confidence floor.** Below-floor input returns ≤2
  closest with a `low_confidence` caveat, not a fabricated top-5.
- **DO NOT regenerate unchanged diagrams under `--changed-only`** — honor the
  content-hash cache; a full regen is the explicit non-`--changed-only` path.
- **DO NOT write derived match-fields back to Notion.** The taxonomy is skill-owned;
  Notion is the source of framework prose only.
- **DO NOT hand-parse `frameworks.json` or the Notion markdown** — go through the
  Stage-A `.mjs` scripts so extraction stays deterministic and tested.

## Phase 6: Capture Learnings

This skill is not complete until learnings capture has run. Reflect on whether this
session surfaced anything worth recording about `/frameworks` itself — a Notion page
whose structure broke `split-corpus`, a matching miss where the deterministic
prefilter buried the right framework, a `/diagram` framing that worked well across
many frameworks, a coverage gap in the situation taxonomy. If so, append it under the
`## /frameworks` heading in `~/.pmos/learnings.md` (create the heading if missing).
Proposing zero learnings is valid — the gate is that the reflection happens, not that
an entry is written.
