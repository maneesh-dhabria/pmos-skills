---
name: primer
description: Produces a verified-source, audience-shaped HTML primer on any topic — researched, outlined, drafted, and self-evaluated into a single teachable artifact. Use to ramp-up before a meeting / a scope / a doc review, when the user needs to learn a topic quickly with citations they can trust. Triggers when the user says "write me a primer on X", "ramp me up on Y", "generate a primer", "I need to learn about Z before a meeting", "/primer", or "create a teachable artifact on this topic". Shapes depth, jargon, and examples to the chosen audience (senior-pms vs all-pms) and prefers primary sources over secondary commentary.
user-invocable: true
argument-hint: <topic> [--audience <senior-pms|all-pms>] [--autonomous] [--format <html|md|both>] [--non-interactive] [--interactive]
---

# Primer

**Announce at start:** "Using primer to research and draft a teachable artifact on the requested topic."

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

<!-- defer-only: ambiguous -->
- **No `AskUserQuestion` available:** Intake confirmation, audience selection, and Phase 0.5 consolidated confirm all degrade to numbered free-form prompts per `_shared/interactive-prompts.md`. The non-interactive auto-pick contract (Recommended → AUTO-PICK) still applies.
- **No `Task` subagent:** Research, drafting, and eval phases run inline in the host conversation; the try-both research pattern in Phase 2 collapses to a single sequential pass (web search first, then context7 if available).
- **No `WebFetch`:** Phase 2 research falls back to context7 MCP (if available) plus any user-supplied URLs/snippets pasted into the conversation; surface the degraded-source warning in the eval phase (see `reference/source-floor.md` §WebFetch unavailable).
- **No `context7` MCP:** Phase 2 research falls back to `WebFetch` plus user-supplied material; if neither is available, refuse with a clear message naming the missing tools and exit 64.

## Track Progress

This skill has 5 sequential phases (Intake, Research, Outline, Draft, Eval + Write) plus an intake/setup phase (Phase 0 + Phase 0.5) and a closing Capture Learnings phase, with eval gates inside Phase 5. Create one task per phase using the host agent's task-tracking tool (e.g., `TaskCreate` in Claude Code). Mark each task in-progress when you start it and completed as soon as it finishes — do not batch completions.

## Phase 0: Pipeline setup + Load Learnings

Inline `_shared/pipeline-setup.md` to: read `.pmos/settings.yaml` (REQUIRE `version` and `docs_path`; default `output_format` to `html` when absent), resolve `{docs_path}`, and resolve the per-run artifact folder `{primer_dir} = {docs_path}/primer/` (mkdir -p if missing).

Resolve `output_format` with precedence `cli --format > settings.output_format > default "html"`. On Phase 0 entry, print to stderr: `output_format: <v> (source: <cli|settings|default>)`.

Read `~/.pmos/learnings.md` if present; note any entries under `## /primer` heading and factor them into your approach. **The skill body wins on conflict** — surface any conflict between a learning and the skill body to the user before applying the learning.

Capture a Phase-0 wall-clock timestamp (used in Phase 5 step 14 to compute `last_elapsed_seconds`).

The canonical non-interactive block below handles `mode` resolution + per-checkpoint classifier + OQ buffer + end-of-skill summary. Do not paraphrase or move this block.

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

## Phase 0.5: Consolidated confirm

Read `.pmos/primer.lastrun.yaml` if present. The file shape:

```yaml
last_topic: "<string>"
last_audience: senior-pms | all-pms
last_output_format: html | md | both
last_artifact_path: "<path>"
last_elapsed_seconds: <int>
```

If the file is present AND `--autonomous` is NOT set, surface a single prompt seeded from the prior values:

- `AskUserQuestion` — `"Use last-run defaults? audience=<v>, output_format=<v>"` options:
  - `Use last values (Recommended)` — apply lastrun `audience` + `output_format` for this run.
  - `Edit audience` — re-prompt later in Phase 1 for audience (senior-pms / all-pms).
  - `Edit output_format` — re-prompt later in Phase 1 for output_format (html / md / both).

This prompt carries a `(Recommended)` option, so it auto-picks under `--non-interactive` and does not need a `defer-only` tag.

If `--autonomous` is present, skip this gate entirely; apply lastrun values when present, otherwise apply built-in defaults (`audience=senior-pms`, `output_format=html`).

If no lastrun file exists AND `--autonomous` is not set, defer Phase 0.5 silently — the Phase-1 audience prompt will fire instead.

## Phase 1: Intake

Parse the argument string. Recognised tokens: positional `<topic>` (1st arg, may be multi-word — strip surrounding quotes); flags `--audience <v>`, `--format <v>`, `--autonomous`, `--non-interactive`, `--interactive`. Any unknown flag → emit a platform-aware error listing the valid set (per `_shared/platform-strings.md`) and exit 64.

**Derive `<slug>`** from `<topic>` per `_shared/canonical-path.md` slug rules: lowercase the topic; replace any run of non-alphanumeric chars with a single `-`; collapse consecutive `-`; trim leading/trailing `-`; truncate to ≤64 chars.

**Canonical artifact path:** `{docs_path}/primer/{YYYY-MM-DD}_<slug>.html` where `YYYY-MM-DD` is today's UTC date.

**Topic vagueness heuristic (FR-4.1).** If `<topic>` has <3 whitespace-separated tokens AND no clear noun phrase (i.e., no token of length ≥4 that looks like a content word), surface the following:

<!-- defer-only: ambiguous -->
- `AskUserQuestion` — `"Topic looks ambiguous. Pick a refinement or write your own:"` with 3 LLM-generated candidate refinements + `Other (free-form)`. Under `--autonomous` the deferred default is to proceed with the topic as given (log to OQ buffer with reason `topic-vague`).

**Audience resolve.** Precedence: cli `--audience > lastrun.last_audience (from Phase 0.5) > interactive prompt`. When the interactive prompt is required:

- `AskUserQuestion` — `"Audience preset?"` options:
  - `senior-pms (Recommended)` — PM-fluent reader; no inline definitions of common PM terms.
  - `all-pms` — every term-of-art defined on first use; concrete next-steps closing.

This prompt has a `(Recommended)` option (no `defer-only` tag needed); under non-interactive mode it auto-picks `senior-pms`.

**Unknown audience value (FR-4).** If `--audience` is given but is not one of `{senior-pms, all-pms}` (e.g., `--audience eng-leads`), reject with platform-aware error: `unknown audience '<v>'. Valid: senior-pms, all-pms. Use --audience all-pms as the broadest preset.` Exit 64.

**Path collision (FR-4.2).** If `{date}_{slug}.html` already exists at the canonical path:

<!-- defer-only: destructive -->
- `AskUserQuestion` — `"<path> already exists. Choose:"` options: `Append -2 suffix (Recommended)` (find the lowest unused integer suffix `-2`, `-3`, …) / `Overwrite (git-snapshot first)` (first runs `git stash push --keep-index -m "primer-overwrite-{slug}-{date}"`) / `Abort`.

See `reference/audience-presets.md` for the full per-preset required-sections / vocab posture / closing-shape contract that downstream phases consume.

## Phase 2: Research (try-both)

Dispatch two source-discovery strands **in parallel**:

- **(a) context7 strand.** Call `mcp__plugin_context7_context7__resolve-library-id` with the topic verbatim. For each library match returned, follow up with `mcp__plugin_context7_context7__query-docs` to capture per-library takeaways.
- **(b) WebFetch strand.** LLM-generate 6–10 candidate URLs by combining the topic with frames like `<topic> overview`, `<topic> best practices`, `<topic> architecture`, `<topic> tradeoffs`. Dispatch `WebFetch` against each candidate. For each successful fetch, capture page title, byte size, and a 1-sentence on-topic takeaway. Push failures (404/timeout) and off-topic returns into `sources.json[].rejected` with the appropriate reason.

**≥3-source short-circuit (FR-5.1).** If either strand returns ≥3 *usable* sources (resolved fetch, >500 chars non-boilerplate, on-topic — per `reference/source-floor.md` §"Usable source" definition) BEFORE the other settles, prefer the fast strand. Best-effort cancellation of pending fetches in the slower strand; arriving-late results are dropped.

**Source-floor gate (FR-5.2).** After both strands settle, count merged usable sources. If `<4`, surface the source-floor gate exactly as specified in `reference/source-floor.md` §"Source floor = 4" and §"Retry-once protocol" — same options (`Abort (Recommended)` / `Continue with thin-source disclosure` / `Retry with alternate query frame`), same single-retry semantics. This prompt MUST be tagged `<!-- defer-only: ambiguous -->`.

**WebFetch unavailable (FR-5.4).** Before dispatching strand (b), check tool availability. If `WebFetch` is missing, follow the early-gate degraded path in `reference/source-floor.md` §"WebFetch unavailable (FR-5.4)".

**`sources.json` schema (FR-5.3).** Persist accepted + rejected sources into the schema defined in `reference/source-floor.md` §"sources.json schema". Path: `{docs_path}/primer/{date}_{slug}.sources.json`. The actual write happens in Phase 5 as part of the atomic trio — Phase 2 only assembles the structure in memory (FR-RECOVERY path in Phase 5 may persist it earlier).

**Per-source takeaway.** For each accepted source, record a 1–2 sentence on-topic summary the draft can cite. This `takeaway` field is what Phase 4 quotes from when it needs to avoid lifting source text verbatim (rubric R2: no-plagiarism).

## Phase 3: Outline

Generate a 10–14 H2 outline biased by the resolved audience preset. See `reference/audience-presets.md` for the required-sections floor per preset (4 named H2s for both presets, plus 1–2 optional additions).

Inline the outline in chat as a markdown bulleted list of `## H2 title — short rationale` (one line per H2). No body prose yet — outline only.

**Phase-3 interactive gate (FR-6.1).**

<!-- defer-only: ambiguous -->
- `AskUserQuestion` — `"Outline ready. Approve, edit, or re-prompt?"` options:
  - `Approve outline (Recommended)` — proceed to Phase 4 with this outline as-is.
  - `Edit` — accept a free-form user reply; apply the edits and re-render the outline once (if the user wants further edits, re-surface this gate).
  - `Re-prompt with feedback` — accept free-form guidance and regenerate the outline from scratch under the new framing.
  - `Abort` — exit cleanly; Phase-2 work is preserved in working memory but no artifact is written.

Under `--autonomous` (or non-interactive mode), the AUTO-PICK is `Approve outline`.

## Phase 4: Draft

Single-pass draft against the approved outline. Target ~3000 words for a default-depth primer (a future `--depth` flag is a planned hook; not present in v1's argument-hint).

**Curator-lens framing (FR-7).** Read `reference/curator-lens.md` and inline its §"Phase-4 framing prompt" verbatim into the draft-generation context, with `<topic>` and `<audience>` substituted. This framing prompt teaches the LLM to write as a curator (selects + frames + attributes named camps) rather than an explainer (argues a thesis). It is the load-bearing quality lever — if drafts come back as explainer-voice, edit `reference/curator-lens.md` first before any other part of the pipeline.

**Citation discipline (FR-7.1).** Every `<a href="X">` URL X in the draft body MUST be a verbatim member of `sources.json[].url`. **No novel URLs introduced in Phase 4** — draw only from `sources.json[].url`. The Phase-5 reviewer's `cites-real-urls` (R1) check enforces this as a trust-tier hard-block; Phase 4 prevents the violation in the first place.

**Audience vocab posture.** Apply the posture from `reference/audience-presets.md` for the resolved preset: `senior-pms` writes without inline definitions of common PM terms; `all-pms` defines every term-of-art on first use.

**Non-goals (spec §3).** No diagram-pass. No persona-pass. No blind-primer. Single linear draft against the outline; reviewer enters in Phase 5.

**Output.** Hold `{date}_{slug}.draft-prose` in working memory; the actual file write happens in Phase 5 (atomic trio).

## Phase 5: Eval + Write

The substantive phase. Execute in order.

1. **Reviewer dispatch (FR-8).** Dispatch a fresh subagent via `Task` tool. The subagent prompt MUST inline `reference/rubric.md` **verbatim**. Inputs: the Phase-4 draft prose, the assembled `sources.json` structure, the resolved audience preset name. The subagent returns a single JSON array — one object per check_id with `{check_id, verdict: 'pass'|'fail', evidence, quote}` (schema per `reference/rubric.md` §"Output contract"). **The reviewer scores only — it MUST NOT edit the draft** (mirrors the /skill-eval D10 separation pattern).

2. **Reviewer URL verification (FR-8.1).** As part of its R1 check, the reviewer cross-checks every `<a href>` URL in the draft against `sources.json[].url`. The reviewer does NOT re-fetch URLs — Phase 2 owns URL resolution; the reviewer trusts the `sources.json` membership test.

3. **Orchestrator-side JSON validation (FR-8.2).** /primer (NOT the reviewer) validates the returned JSON before acting on it:
   - **(a) check_id set match.** The returned `check_id` set MUST equal the 10 IDs declared in `reference/rubric.md` (R1–R10). On any mismatch, hard-fail with the precise diff: `reviewer returned check_ids that do not match rubric.md: missing=[…], extra=[…]`.
   - **(b) Quote verbatim test.** For every `fail` verdict, the `quote` field MUST be a ≥40-char verbatim substring of the draft (or of `sources.json[].takeaway` for the `no-plagiarism` check). A `fail` whose quote is empty or fails the substring test is **treated as `pass`** by the orchestrator (defense against hallucinated quotes).

4. **Auto-apply iteration 1 (FR-8.3).** If iteration 1 returned any `fail`, /primer (the writer — not the reviewer) authors a fix patch inline against the draft, addressing each surviving fail. Re-dispatch the reviewer **once** on the patched draft. **Iteration cap = 1** (no iteration-2 retry; the spec rejects unbounded refinement loops).

5. **Trust-tier hard-block (FR-8.4).** After iteration 1's re-run, if ANY trust-tier check is still failing (R1 `cites-real-urls`, R2 `no-plagiarism`, R3 `no-hand-wavy-claims`, R6 `structurally-complete`, R7 `sections-json-ids-match`), execute the FR-RECOVERY path (step 15 below) and exit.

6. **Taste-tier accept-as-known-risk (FR-8.5).** If after iteration 1 only taste-tier checks (R4, R5, R8, R9, R10) are failing, surface:

   <!-- defer-only: ambiguous -->
   - `AskUserQuestion` — `"Taste-tier residuals: <list of failing check_ids>. Accept and ship, iterate manually, or abort?"` options:
     - `Accept as known risk and write (Recommended)` — proceed; the artifact ships with a "Known residuals" footer note listing the failing taste-tier check IDs.
     - `Iterate manually` — exit to chat with the failing check IDs and reviewer evidence; the user patches and re-runs /primer.
     - `Abort` — exit cleanly; no artifact written.

7. **Phase-5 interactive write gate (FR-8.6).** When not hard-blocked, before the final write, surface:

   <!-- defer-only: ambiguous -->
   - `AskUserQuestion` — `"All checks resolved. Approve, iterate, or abort?"` options:
     - `Approve and write (Recommended)`
     - `Iterate manually`
     - `Abort`

   Under `--autonomous` this gate AUTO-PICKs `Approve and write`. Trust-tier hard-block (step 5) and taste-tier residual disclosure (step 6) still apply.

8. **Atomic write trio — temp-then-rename (FR-9).** On Approve, write three files to temp paths first: `{date}_{slug}.html.tmp`, `{date}_{slug}.sections.json.tmp`, `{date}_{slug}.sources.json.tmp`. Only after all three succeed do you `mv` each to its final name. If any rename fails, `rm` all `.tmp` files and abort (no partial states on disk).

9. **Render via substrate template.** Render the HTML through `_shared/html-authoring/template.html` with these token values:
   - `{{plugin_name}}` = `pmos-learnkit`
   - `{{plugin_name_nbsp}}` = `pmos&#8209;learnkit`
   - `{{plugin_url}}` = `https://github.com/maneesh-dhabria/pmos-skills/tree/main/plugins/pmos-learnkit#readme`
   - `{{plugin_version}}` = read from `plugins/pmos-learnkit/.claude-plugin/plugin.json` `:: version` — **fail-fast if plugin.json is missing or unparseable**.
   - Standard substrate tokens (title, content, source_path, asset_prefix) per `_shared/html-authoring/template.html`.
   - The substrate writer sets `data-pmos-plugin="pmos-learnkit"` on the root container per template convention.

10. **Asset substrate.** Copy `assets/*` from `plugins/pmos-learnkit/skills/_shared/html-authoring/assets/` to `{docs_path}/primer/assets/` via `cp -n` (no-clobber, idempotent across runs).

11. **Heading IDs (FR-9.1).** Every `<h2>` and `<h3>` in the rendered body carries a stable kebab-case `id` per `_shared/html-authoring/conventions.md §3`. `sections.json` contains `{id, level, title, parent_id}` for every heading; the `sections.json[].id` set MUST equal the on-page id set in document order. The R7 trust-tier `sections-json-ids-match` check enforces this.

12. **Cache-bust (FR-9.2).** All asset URL references in the rendered HTML carry `?v={{plugin_version}}` per the substrate template. The version is the **pmos-learnkit** plugin version (not pmos-toolkit's).

13. **Index regen.** Regenerate `{docs_path}/primer/index.html` per `_shared/html-authoring/index-generator.md` so the new primer appears in the index.

14. **MD sidecar (FR-9.3).** When `output_format = both` (or `md`), after the HTML rename succeeds, run `node {docs_path}/primer/assets/html-to-md.js {date}_{slug}.html > {date}_{slug}.md`. On sidecar failure, log a warning to chat and continue — the HTML primary is the gate, not the sidecar.

15. **Update lastrun (FR-12).** Write `.pmos/primer.lastrun.yaml`:

    ```yaml
    last_topic: "<resolved topic>"
    last_audience: <resolved audience>
    last_output_format: <resolved output_format>
    last_artifact_path: "<final HTML path>"
    last_elapsed_seconds: <int from Phase-0 timestamp>
    ```

    Per the canonical lastrun pattern. Gitignore is handled at the repo level by /complete-dev.

16. **FR-RECOVERY hard-block path (FR-10).** When step 5 triggers:
    - **(a) Persist `sources.json` to its canonical (non-draft) path** `{date}_{slug}.sources.json` — research work is not discarded.
    - **(b) Write the rejected draft** to `{date}_{slug}.draft.html` with: a top-of-body banner `<div class="primer-rejected-banner" role="alert">REJECTED BY REVIEWER — DO NOT TRUST</div>`; immediately under the banner a `## Failing checks` section listing each failing trust-tier check with its reviewer verdict + quote + evidence; then the full draft body below.
    - **(c) Inline recovery banner CSS (FR-10.1)** in the `draft.html` `<style>` tag — red background, white text, large readable size, sticky-top. Suggested: `.primer-rejected-banner { position: sticky; top: 0; z-index: 100; background: #b00020; color: #fff; font-size: 1.25rem; padding: 1rem; text-align: center; }`.
    - **(d) Print to chat** verbatim: `Trust-tier check '<name>' failed after auto-apply iteration. Hard-block: no primer artifact written. Draft preserved at <path>.draft.html for review. Manually patch and rerun, or rerun fresh.`
    - **(e) Do NOT regenerate index.html** for a draft. **Do NOT update lastrun** (the run is incomplete).

## Phase 6: Capture Learnings

1. This skill is not complete until the learnings-capture process has run. Read and follow `learnings/learnings-capture.md` (relative to the skills directory) now. Reflect on whether this session surfaced anything worth capturing — surprising source-quality patterns, audience-shaping heuristics, rubric edge-cases, reviewer drift between iteration 1 and the trust-tier verdict, framing-prompt failures that ended in FR-RECOVERY. Proposing zero learnings is a valid outcome for a smooth run; the gate is that the reflection happens, not that an entry is always written. Skip silently if the run errored before Phase 5 completion (the partial OQ buffer captures the failure context instead).

## Anti-Patterns (DO NOT)

- Do NOT invent URLs that do not appear in `sources.json` — citation discipline is the trust-tier hard-block (FR-7.1, rubric R1). The reviewer cross-checks every `<a href>` against `sources.json[].url`; mismatches trigger FR-RECOVERY.
- Do NOT skip the Phase-5 reviewer — there is no clean exit path that bypasses it (FR-8 + FR-8.4). The artifact ships only after the reviewer has scored the draft and the orchestrator has validated the JSON.
- Do NOT write the artifact when a trust-tier check fails after auto-apply iteration 1 — the FR-RECOVERY draft path (Phase 5 step 16) is the only allowed exit (FR-8.4 + FR-10). Shipping a trust-tier failure is the worst-case outcome for /primer.
- Do NOT deep-fetch a single source repeatedly in Phase 2 — the source-floor (FR-5.2) targets breadth, not depth; multiple shallow on-topic sources beat one deep one when the gate counts usable sources.
- Do NOT introduce novel URLs in Phase 4 — the draft draws only from `sources.json[].url`. The R1 rubric check catches this, but Phase 4 must avoid producing the violation in the first place rather than relying on the reviewer to catch it.
- Do NOT conflate audience presets within one primer — `reference/audience-presets.md` §Anti-patterns covers this; half-defining terms confuses both audiences (senior PMs find it patronising; newer PMs lose trust in the doc).
- Do NOT spawn subagents in Phases 2–4 — only Phase 5 dispatches the reviewer subagent. Phases 2–4 run inline in the host conversation (per spec D2 architectural decision); parallel Phase-2 strands are tool-level parallelism, not subagent dispatch.
- Do NOT mix curator and explainer voice — the Phase-4 framing prompt at `reference/curator-lens.md` is the load-bearing quality lever; deviating drops primer-quality below the rubric R10 (`primer-shaped`) floor.

## Worked example

Topic: `"feature flagging at scale"`. Walks Phases 0 → 5 in compact form.

- **Phase 0.** Read `.pmos/settings.yaml`: `version=1, docs_path=docs/pmos, output_format=html`. Stderr: `output_format: html (source: settings)`. Learnings `## /primer` section: empty.
- **Phase 0.5.** `.pmos/primer.lastrun.yaml` absent on first run; defer silently.
- **Phase 1.** Topic = `"feature flagging at scale"` (4 tokens; not vague). Slug = `feature-flagging-at-scale`. Path = `docs/pmos/primer/2026-05-23_feature-flagging-at-scale.html`. Audience AskUserQuestion auto-picks `senior-pms (Recommended)`. No path collision.
- **Phase 2.** Try-both: context7 returns LaunchDarkly + Unleash + Flagsmith docs (3 usable sources, short-circuit triggers); WebFetch in flight is cancelled but 4 already-arrived industry blog responses are kept after on-topic filter. Merged usable = 7, passes source-floor (≥4).
- **Phase 3.** 12-section outline including `## What this is`, `## Why it matters now`, `## How the smart teams are using it`, `## Tradeoffs we considered against`, `## Metrics calibration`, `## Open debates`, `## Where to dig deeper`. User approves.
- **Phase 4.** Draft ~2900 words; 14 inline `<a href>` citations, all verbatim members of `sources.json[].url`. Curator voice: names the LaunchDarkly / Unleash / build-in-house camps rather than picking one.
- **Phase 5.** Iteration-1 reviewer returns 1 fail (R3 `no-hand-wavy-claims` — the phrase "most teams use percentage rollouts" has no citation). Auto-apply patch adds a citation to the Unleash blog source. Re-dispatch reviewer; iteration-2 all-pass. Phase-5 interactive write gate AUTO-PICKs `Approve and write`. Atomic write trio succeeds. Index regen. Lastrun updated. Total wall-clock ~5 minutes.
