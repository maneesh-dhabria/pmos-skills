---
name: polish
description: Critique and refactor a single document — markdown or HTML, output keeps the source format — for clarity, concision, voice, and de-AI-slop. Runs a binary pass/fail rubric of writing principles, optionally runs an editorial reduction pass to hit a target word cut, auto-applies safe mechanical fixes, surfaces high-risk changes per-finding, and writes a polished version preserving author voice. Single-doc only; subagents cannot invoke this skill. Use when the user says "polish this draft", "tighten this prose", "remove the AI slop", "make this more concise", "shorten this doc by ~30%", "cut this draft down", "critique my writing", or wants to clean up a PRD/blog/README/email before sharing.
user-invocable: true
argument-hint: "<file-path (.md or .html — round-trips the source format) | URL | 'inline text' | notion://<id>> [--preset <name>] [--reduce <pct|range>] [--dry-run] [--checks <path>] [--non-interactive | --interactive]"
---

# /polish

**Announce at start:** "Using /polish to critique and refactor this document."

## Track Progress (do this FIRST)

**This is the first action of the skill, before any other tool call.** Before you read any input, load any context, or run any phase, create one `TodoWrite` task for each of the 10 phases (0, 1, 2, 2.5, 3, 4, 5, 6, 7, 8). Mark each task `in_progress` when you start it, `completed` when it finishes — never batch completions. Phase 4 (patch generation) gets one sub-task per surfaced finding so the user sees concrete progress.

If you have already taken any other action (Read, Bash, interactive prompts, Write, Edit) before creating the 10 phase tasks, you have skipped this step. Stop, create the tasks now, and resume.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:
- **No interactive prompt tool:** Print a numbered findings table with a disposition column. NEVER silently auto-apply high-risk fixes — they require explicit user input. For preset selection, state your assumption and proceed; the user reviews the polished output. For the Phase 2.5 editorial-pass gate, state the assumption "no `--reduce` flag → skipping the editorial pass" and proceed (the pass is opt-in).
- **No `TodoWrite`:** Print phase headers as you progress (`## Phase 3: Running rubric…`). Do not batch.
- **No `WebFetch`:** Refuse URL input mode with a note; ask the user to paste the content.
- **No Notion MCP:** Refuse `notion://` input with a note; ask the user to export the page first.
- **No subagents:** Run all phases sequentially in the main agent — this includes the Phase 2.5 editor and rewriter passes (run them inline).
- **Format detection is deterministic** (extension-based — see Phase 1) on every platform; it never requires a tool or a prompt.

## Load Learnings

Read `~/.pmos/learnings.md` if it exists. Note any entries under `## /polish` and factor them into your approach for this session (e.g., known false-positive checks, user-preferred preset for a doc type, custom phrases).

---

## Phase 0 — Context, custom checks, thresholds

1. Load `~/.pmos/learnings.md` `## /polish` section if present.
2. Resolve checks file:
   - If `--checks <path>` was passed → load ONLY that file. Ignore the default.
   - Otherwise → load `~/.pmos/polish/custom-checks.yaml` if it exists.
3. Validate the loaded file against `schemas/custom-checks.schema.json`. On schema error: print the offending entries and continue with built-ins only — do NOT silently skip.
4. Merge user threshold overrides on top of preset defaults from `reference/presets.md`.

There is no workstream load. `/polish` operates on derivatives.

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

## Phase 1 — Ingest + classify

**Resolve input source from argument:**

| Argument shape       | Handler                                                     |
|----------------------|-------------------------------------------------------------|
| Local file path      | `Read` tool                                                  |
| `http(s)://...`      | `WebFetch` → strip HTML to markdown                          |
| `notion://<id>`      | Notion MCP `mcp__plugin_Notion_notion__*` (read-only)        |
| Quoted inline text   | Treat the argument as the document content                   |

If a required tool isn't available, refuse the input mode with a one-line note.

**Detect `doc_format`.** Deterministic, extension-based — no LLM call, no prompt:
- Local file whose extension (case-insensitive) is `.html` or `.htm` → `doc_format = html`.
- Everything else — local file with `.md` / `.markdown` / `.txt` / no recognized extension, **and** all URL / Notion / inline-text inputs (their HTML is page chrome, not an authored artifact, so it is normalized to markdown) → `doc_format = markdown`.

Carry `doc_format` through to Phase 7. It governs the lock-zone set (below), the chunk anchors, and the output file extension.

**Compute lock zones.** Per `reference/chunking.md` lock-zone rules: code fences, inline code, HTML blocks, frontmatter, link URLs, footnote refs/defs, table cells with <8 words, Notion non-prose placeholders. **When `doc_format == html`, also apply the HTML lock zones** in `reference/chunking.md` ("Format-aware lock zones": tags + attributes, `<script>`/`<style>`/`<pre>`/`<code>` contents, HTML comments, `<head>`/doctype, short `<td>`/`<th>` cells). Patches that intersect locked zones are rejected; the rubric never fires inside them.

**Compute polishable word count.** `polishable_words = total_words − words_inside_locked_zones`. This count drives all size/chunking decisions and the `low_confidence` flag. Total word count is misleading for table-heavy docs — see `reference/chunking.md` for the definition.

**Voice sample.** Follow `reference/voice-sampling.md`. Extract the marker JSON (avg sentence length, stddev, register, person, idiomatic phrases, contraction rate). Set `low_confidence: true` if <200 polishable words.

**Doc-type classifier.** Cheap signals first (filename prefix, frontmatter `type:`). Only fall back to a single LLM classifier call if no signal matches.

**Size bucketing + chunking.** Apply `reference/chunking.md` thresholds:
- <4,000 polishable words → no chunking
- 4,000–25,000 → chunked patch generation on H1/H2 headings (`<h1>`/`<h2>` open tags when `doc_format == html`)
- >25,000 → refuse with split-and-retry guidance

**Iteration count is independent of size.** A small dense doc gets the same 2-iteration loop as a large one.

## Phase 2 — Pick preset (detect + ask)

Skip if `--preset` was passed.

<!-- defer-only: ambiguous -->
Otherwise, surface preset options via `AskUserQuestion`. Preset semantics live in `reference/presets.md`. The recommended option is the classifier output; if classifier confidence <0.6, recommend **preserve voice**.

```
Detected: <classifier output>
Recommended preset: <name>
Options: [<recommended> (Recommended) | <alternative 1> | <alternative 2> | Preserve voice]
```

## Phase 2.5 — Editorial reduction (opt-in)

Runs after preset selection and before the rubric. **Opt-in — the default is Skip.** Full contract: `reference/editorial-pass.md`. Its output document (the *reduced doc* if the pass ran, else the ingested doc unchanged) becomes the **working document** for Phase 3 onward. **The editorial pass is not a polish iteration** — it runs once (plus at most one capped re-critique), independent of the Phase 6 two-iteration cap.

1. **Resolve the reduction target.** If `--reduce <value>` was passed, parse it: a single percent (`25`) or a `low-high` range (`30-40`); valid only if `0 < low ≤ high ≤ 90`; malformed → print `--reduce: invalid value '<v>'; skipping the editorial pass` and treat as Skip (do not abort, do not prompt). When `--reduce` is present the gate below is **not** shown (parallels `--preset`).

   Otherwise, surface the gate via `AskUserQuestion` (this gate has a Recommended option — it auto-picks Skip in `--non-interactive`; do NOT add a `defer-only` tag):

   ```
   question: "Run an editorial reduction pass before polishing? Target reduction:"
   options:
     - "Skip — no reduction (Recommended)"   # → no-op
     - "~10-20% (light trim)"
     - "~30-40% (substantial cut)"
     - "~50%+ (aggressive)"
   ```
   An "Other"/out-of-options reply is parsed as a custom target by the `--reduce` rule; unparseable → Skip-with-note.

2. **Skip ⇒ no-op.** No subagents, no `editor_notes.json`, the ingested doc is the working doc, Phase 3+ behaves exactly as before. Phase 7's `Editorial pass:` line reads `skipped`.

3. **Non-Skip target ⇒ run the two subagents** (per `reference/editorial-pass.md`):
   - **Editor subagent** — given the verbatim ingested doc (chunked on H1/H2 / `<h1>`/`<h2>` if ≥4,000 polishable words), the Phase-1 voice markers, the lock-zone map, `doc_format`, and the target. It **critiques only — never rewrites**: returns a JSON object conforming to `schemas/editor-notes.schema.json` (notes with `kind`, `locator.heading_path`+`locator.quote` (≥20-char verbatim, no line numbers), `rationale`, `est_words_saved`, `risk`; plus a target reconciliation). `temperature: 0`.
   - **Validate & prune** — schema-validate the editor output (on schema error, print offending entries and proceed with the valid ones); drop any `cut`/`tighten` note whose `quote` isn't a verbatim substring of the source; write `editor_notes.json` next to the run's other artifacts (written even on `--dry-run`).
   - **Rewriter subagent** — given the verbatim original doc, the pruned `editor_notes.json`, voice markers, lock-zone map, `doc_format`. Applies `risk: low` notes (honoring locks; skip-and-log unlocatable/locked), does **not** apply `risk: high` notes, emits the reduced doc + an applied/skipped log; a `PRESERVE_VOICE_CONFLICT` is handled per `reference/patch-contract.md`. `temperature: 0`.
   - **High-risk notes → Phase 5.** Every `risk: high` note (reorders, large merges) and any rewriter voice-conflict is surfaced via the Phase 5 findings protocol (`reference/findings-protocol.md`); structural reorders are individually surfaced. Approved ones are then applied.
   - **Capped re-critique (1×).** If the rewriter's actual reduction lands below `target.low` and the editor hasn't already re-critiqued, dispatch the editor once more (given the rewriter output, the applied/skipped log, and the shortfall); it returns delta notes appended to `editor_notes.json` with `recritique: {ran: true, …}`; the rewriter re-applies once; then the pass is done — never loop further.
   - **HTML fidelity.** After an HTML rewrite, verify all non-prose bytes are byte-identical to the original. If not, keep the output anyway (best-effort) but surface `⚠ markup outside prose nodes may have shifted — review before replacing` in Phase 7 and the chat output, and show the replace prompt with no default-yes. Never refuse, never hard-fail.

4. **`--dry-run` interplay.** With a non-Skip target: the editor subagent runs and `editor_notes.json` is written; the rewriter and the re-critique do **not** run. Phase 4 stops as usual; the dry-run report includes the editor notes + reconciliation above the rubric results. Phase 7's line reads `dry-run — N notes drafted (est ~X%), not applied`.

## Phase 3 — Run binary eval rubric

Follow `reference/rubric.md` — runs all 14 built-in checks plus any user-defined checks **on the working document** (the editor-reduced doc if Phase 2.5 ran, else the ingested doc). Each check returns `pass | fail` with cited spans (line + excerpt). Detection skips locked zones.

**LLM-judge determinism contract** (mandatory for every llm-judge call):
- `temperature: 0`
- Structured output schema: `{verdict: "pass" | "fail", cited_spans: [{line, excerpt}], rationale: string}`
- A `fail` verdict with no `cited_spans` is treated as `pass` (no evidence → no action)

**Output of this phase: emit a structured rubric block inline in the response.** This block is a hard pre-condition for Phase 4 — if it does not exist, Phase 4 cannot start. Format:

```yaml
rubric_results:
  - check: 1-em-dash-density
    verdict: fail
    scope: local
    cited_spans:
      - {line: 42, excerpt: "...the system — which was — designed..."}
      - {line: 78, excerpt: "..."}
  - check: 2-lede-buried
    verdict: pass
    scope: global
  # ... one entry per check (14 built-in + any custom)
summary:
  failed_local: <N>
  failed_global: <N>
  total_failed: <N>
```

The `total_failed` value feeds the Phase 4 budget formula directly. No `rubric_results` block → no patches.

## Phase 4 — Estimate budget + targeted refactor passes

**Budget estimate first.** Emit this block **verbatim** (substitute values only — do not reword the labels or replace the prompt with a custom shape) before generating any patches:

```
Rubric run: <N> of 14 checks failed
Estimated work: ~<calls> LLM calls, ~<seconds>s
Continue? [Y / Downscope / Dry-run only]
```

`<N>` MUST equal `summary.total_failed` from the Phase 3 `rubric_results` block. Formula: `calls = (llm_judge_failures × 1.3 retries avg) + global_check_count + (×2 if iter-2 likely)`. **If the Phase 2.5 editorial pass produced output, add a line under the block: `+ ~2 LLM calls (editorial critique + rewrite)` — `+ ~1` under `--dry-run` (editor only, no rewrite), or `+ ~4` if a re-critique ran.** Cost intentionally NOT shown — pricing varies. If estimate >30 calls, prompt is mandatory (no default-Y). The Surgical/Comprehensive/Full/Findings-only shape is **not** a substitute — that's a preset decision (Phase 2), not a budget decision.

If `--dry-run`, stop here and print the rubric report. Do not generate patches.

**Patch generation.** Per failed check (per chunk if chunked), follow `reference/patch-contract.md`:

1. Locate offending span(s)
2. Generate rewrite via patch prompt (voice markers injected, threshold set included)
3. Reject if patch intersects a locked zone
4. **Per-patch QA — LOCAL checks only.** Re-run local checks on patched span. New local failure → regenerate with the new failure cited. Cap 2 retries; mark "partial fix — introduces X" if still failing
5. If model emits `PRESERVE_VOICE_CONFLICT` → validate JSON `{conflicting_marker, reason}`; promote to high-risk finding; track conflict count
6. **Global checks NOT re-run per patch.** They run once at end of iteration (Phase 6)

**Voice-conflict abort.** If conflicts >30% of attempted patches in a non-low-confidence run → abort with: *"Voice constraints too strict for this doc — re-run with `--preset concise` or `--preset narrative`."*

## Phase 5 — Findings Presentation Protocol

**Hard rule — Phase 5 is a write-gate.** Do NOT emit any `Write` or `Edit` to the polished file (or to `<original>.polished.md`) until at least one interactive-prompt round on surfaced high-risk findings has been answered. The only exception: if the surfaced-findings list is empty (zero high-risk findings — all auto-apply category), proceed directly to Phase 6. A bulk-scope question ("Surgical / Comprehensive / Full") is **not** a substitute for per-finding surfacing — that's preset selection, not finding disposition.

Follow `reference/findings-protocol.md`. Summary:

**Auto-apply (low-risk: checks 1, 5, 6a, 6b, 8, 9, 10):** apply silently in a single batch. Record aggregate counts in summary.

**Surface (high-risk: checks 2, 3, 4, 7, 11, 12, 13, 14, plus voice-conflict + partial-fix, plus any `risk: high` editorial-pass note and any rewriter voice-conflict from Phase 2.5):** group by check category, batch ≤4 per `AskUserQuestion` call. Each finding offers: **Fix as proposed (Recommended)** / **Modify** / **Skip** / **Defer**. Structural changes — including editorial-pass `reorder` notes — are always individually surfaced.

**Defer comment format:** insert immediately above the deferred span:
```
<!-- POLISH: <check-id> kept by user — "<one-line excerpt>" -->
```
No line numbers (they go stale).

**Anti-pattern to avoid:** dumping all findings as prose ending in "let me know what you'd like to fix."

## Phase 6 — Apply, re-run, optional 2nd iteration

1. Apply auto-fixes + approved patches to a working copy (per chunk if chunked)
2. **Re-run the FULL rubric on the polished output** (both local and global checks, whole doc)
3. Compute before/after metrics: word count, avg sentence length, passive %, AI-vocab hits, em-dash count, hedging hits
4. If NEW failures appear (excluding user-Skipped/Deferred):
   - Surface as a 2nd findings round (same auto-apply + ask split)
   - Apply approved 2nd-round patches
5. **Hard cap: 2 polish iterations total.** If iter-2 still finds failures, write the file and list remaining failures in the summary — do NOT iterate further. (The Phase 2.5 editorial pass is **not** a polish iteration — it runs once before the rubric, with its own separate single capped re-critique.)

## Phase 7 — Write output + offer replace

1. Stitch chunks back together if chunked. Verify chunk boundary lines are byte-identical to original; when `doc_format == html`, additionally verify all non-prose bytes are byte-identical (best-effort-warn fallback per `reference/editorial-pass.md` §6 if not).
2. Write the polished file with the **source-format extension**: `<original-basename>.polished.html` when `doc_format == html`, else `<original-basename>.polished.md`. (Print the polished text instead — as markdown — if the input was inline/URL/Notion.) Never emit markdown for an HTML input.
3. Print summary block:

```
Polish complete: <input> → <output>

Voice: <detected> → applied "<preset>"
Editorial pass: <skipped | target ~30-40% · est ~36% · actual ~33% · 19 applied / 2 skipped / 3 surfaced (2 approved) | dry-run — N notes drafted (est ~X%), not applied>
Findings: 14 checks run, <N> failed, <auto> auto-fixed, <user> user-fixed, <deferred> deferred
Iterations: <N> of 2 (max)
Learnings captured: <N> (see ~/.pmos/learnings.md ## /polish)

Before → After:   (anchored to the ORIGINAL ingested doc — the % includes the editorial cut + rubric tightening)
  Words:                 1,842 → 1,310  (-29%)
  Avg sentence length:   24.1  → 16.8
  Passive voice:         18%   → 7%
  AI-vocab hits:         11    → 0
  Em-dashes:             34    → 8
  Hedging stack hits:    9     → 2

[⚠ markup outside prose nodes may have shifted — review before replacing]   ← only when the HTML fidelity check failed
Replace <original> with the polished version? [y/N]
```

The `Before → After` "Words" delta is computed against the **original ingested document**, not the editor-reduced doc, so the headline % reflects the full reduction.

4. **Replace prompt** (only if input was a local file):
   - On `y`: if file is in a git repo (check via `git -C <dir> rev-parse --is-inside-work-tree`), `mv` polished over original (git is the safety net). If NOT in a repo, first move original to `<original>.bak`, then write polished to original path. The `.polished.<ext>` and `.bak` both use the source-format extension.
   - On `N`: leave both files in place.
   - URL/inline/Notion inputs: skip the replace prompt.
   - If the HTML fidelity check failed (best-effort HTML), do **not** default the prompt to yes — print the `⚠` warning and let the user decide explicitly.

## Phase 8: Capture Learnings

**Run this BEFORE printing the Phase 7 summary block.** The summary's `Learnings captured: <N>` line cannot be filled honestly otherwise. The order is: Phase 6 apply → Phase 7 file write → Phase 8 reflection → Phase 7 summary block + replace prompt.

**This skill is not complete until the learnings-capture process has run.** Read and follow `~/.pmos/learnings/learnings-capture.md` (if available) or these inline steps:

Reflect on whether this session surfaced anything reusable:
- False positives (legit uses flagged as violations) → candidate for soft-flag promotion or threshold adjustment
- Repeated user `Skip` on the same check → candidate for preset-specific tuning
- Words/phrases the user repeatedly flags themselves → candidate for the user's `~/.pmos/polish/custom-checks.yaml`
- Preset misclassification → candidate for classifier signal expansion
- Threshold drift (user repeatedly overrides the same threshold) → recommend they persist it in custom-checks.yaml

Append new entries to `~/.pmos/learnings.md` under `## /polish`. Proposing zero learnings is a valid outcome for a smooth session — the gate is that the reflection happens.

---

## Anti-Patterns (DO NOT)

- Do NOT silently apply high-risk fixes. They require user approval (or platform-fallback printed disposition).
- Do NOT touch locked zones — code, frontmatter, link URLs, footnote refs, short table cells, Notion placeholders, and (for HTML inputs) all tags/attributes, `<script>`/`<style>`/`<pre>`/`<code>` contents, HTML comments, and the `<head>`.
- Do NOT rewrite technical/factual claims. Flag as "verify" findings; never auto-rewrite.
- Do NOT re-sample voice markers between iterations. Anchor to the original doc.
- Do NOT skip the budget estimate when failed_checks > 0. The user needs to see the cost before patches generate.
- Do NOT re-outline the document. Structural changes are limited to lede moves and adjacent-paragraph merges, always individually approved.
- Do NOT write line numbers into defer comments — they go stale immediately.
- Do NOT iterate beyond 2 polish iterations. The cap is hard.
- Do NOT batch findings into prose dumps ending in "let me know what to fix." Use the interactive prompt tool or the platform fallback table.
- Do NOT emit any `Write` or `Edit` to the polished file before the Phase 5 interactive-prompt round has completed (unless zero high-risk findings exist). A bulk-scope question is NOT a substitute for per-finding surfacing.
- Do NOT skip Phase 3's `rubric_results` YAML block. No structured rubric output → Phase 4 cannot start.
- Do NOT attempt to polish multiple docs in one invocation. `/polish` is single-doc; subagents cannot invoke skills (SUBAGENT-STOP), so multi-doc parallelization is the caller's responsibility.
- Do NOT begin Phase 0 (or any other phase) before creating the 10 per-phase `TodoWrite` tasks. Per-phase task tracking is the first action of the skill, not an afterthought.
- Do NOT charge ahead if the model emits `PRESERVE_VOICE_CONFLICT` — promote it to a high-risk finding for the user.
- Do NOT exceed the 25,000 polishable-word ceiling. Refuse with split-and-retry guidance.
- Do NOT skip Phase 8. Learning capture is mandatory; zero learnings is fine, but the reflection must happen.
- Do NOT let the Phase 2.5 **editor subagent rewrite** anything — it only emits `editor_notes.json`; the **rewriter subagent** applies the notes. Two distinct roles.
- Do NOT auto-apply `risk: high` editorial-pass notes (reorders, large merges). Surface them via the Phase 5 findings protocol; structural reorders individually.
- Do NOT loop the editorial re-critique more than once. Cap is 1; after that the pipeline proceeds regardless of the achieved reduction.
- Do NOT round-trip HTML through markdown — an `.html` input is polished as HTML and written as `.polished.html`; never emit markdown for an HTML input.

---

## File map

- `SKILL.md` — this orchestrator
- `schemas/custom-checks.schema.json` — JSON schema for user check overrides
- `schemas/editor-notes.schema.json` — JSON schema for the Phase 2.5 `editor_notes.json`
- `reference/rubric.md` — 14 built-in checks: regex patterns + LLM-judge prompts
- `reference/presets.md` — preset semantics + per-preset threshold defaults
- `reference/voice-sampling.md` — voice marker extraction algorithm
- `reference/chunking.md` — chunking algorithm + lock-zone rules (markdown + HTML) + size buckets
- `reference/patch-contract.md` — patch prompt template, conflict protocol, retry logic
- `reference/findings-protocol.md` — categorization, interactive-prompt shape, defer format
- `reference/editorial-pass.md` — Phase 2.5: target gate, editor + rewriter subagent prompts, re-critique, HTML fidelity
- `editor_notes.json` — run artifact written by Phase 2.5 (editor critique) next to the polished file
- `tests/fixtures/` — 11 fixtures (incl. `html-doc.html`, `bloated-doc.md`) with paired `expected.yaml` contracts
- `example/custom-checks.yaml` — example user can copy to `~/.pmos/polish/`

---

## Apply comment-resolver edit (FR-22, FR-30, FR-60)

This phase is the `/polish` entrypoint that `/comments resolve` (T10) dispatches into when walking open threads in a polish artifact's `.comments.json` sidecar. The contract — input/output JSON shapes, closed `error_enum` set, idempotency rules, subagent invocation convention — lives in the shared contract doc and is the single source of truth:

- **Contract (normative):** `plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md` (T6).

Per [NFR-08](../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#nfr-h), this phase MUST cite that file rather than restate the contract. Anything below is `/polish`-specific implementation guidance only.

**Comments meta tag (FR-01, FR-40):** the polished HTML artifact (`.polished.html`) MUST carry `<meta name="pmos:skill" content="polish">` in the `<head>`. This meta tag is written at Phase 7 (write output). The `/comments` resolver routes apply-edit dispatches via this tag, so it MUST be set byte-exact.

**Asset substrate (FR-40):** when writing `.polished.html`, include `comments.js`, `comments.css`, `diff_match_patch.js`, and the launcher trio (`comments-open.command`, `comments-open.sh`, `comments-open.bat`) in the same `assets/` directory as the rest of the HTML substrate assets. Copy from `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/` using `cp -n` (idempotent).

### When invoked

The resolver dispatches a subagent with the §9.1 input JSON. The subagent's tools include this skill's Node shim:

- **Shim:** `plugins/pmos-toolkit/skills/polish/scripts/apply-edit-at-anchor.js` — exports `apply(input)`, returns one of the three output shapes (success / failure / clarification) per §9.1. Success responses include the optional `applied_artifact` field (full post-edit HTML); the shim's minimal edit inserts an HTML annotation comment immediately before the resolved anchor element — real prose rewriting is deferred to T12+.

### Resolution order

1. **id-first.** Locate `id="<id>"` in the artifact HTML. Match → success path, `strategy: "id-first"`, `score: 1.0`.
2. **quote-fallback.** Run diff-match-patch Bitap against `anchor.quote_anchor.text`. Accept when normalized score ≥ 0.7.
3. **Neither hits** → emit `{ success: false, error_enum: "anchor_orphaned" }`; do NOT mutate the artifact.

### Tests

- Per-skill contract: `plugins/pmos-toolkit/skills/polish/tests/apply-edit-at-anchor.test.js` (5 cases: id-first happy, orphan, idempotent, infeasible, clarification).
- Wrapper: `tests/scripts/assert_apply_edit_at_anchor_polish.sh`.
