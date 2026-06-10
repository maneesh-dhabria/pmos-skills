---
name: polish
description: Critique and refactor a single document — markdown or HTML, output keeps the source format — for clarity, concision, voice, and de-AI-slop. Runs a binary pass/fail rubric of writing principles, optionally runs an editorial reduction pass to hit a target word cut, auto-applies safe mechanical fixes, surfaces high-risk changes per-finding, and writes a polished version preserving author voice. Single-doc only; subagents cannot invoke this skill. Use when the user says "polish this draft", "tighten this prose", "remove the AI slop", "make this more concise", "shorten this doc by ~30%", "cut this draft down", "critique my writing", or wants to clean up a PRD/blog/README/email before sharing.
user-invocable: true
argument-hint: "<file-path (.md or .html — round-trips the source format) | URL | 'inline text' | notion://<id>> [--preset <name>] [--reduce <pct|range>] [--dry-run] [--checks <path>] [--non-interactive | --interactive]"
---

# /polish

**Announce at start:** "Using /polish to critique and refactor this document."

Single-doc only — subagents cannot invoke skills, so multi-doc parallelization is the caller's responsibility.

**Flags are NL-first.** Infer options from the request — "shorten this by ~30%" ≡ `--reduce 30`, "polish this as a technical doc" ≡ `--preset technical`, "just critique it / findings only" ≡ `--dry-run`; an explicit flag overrides the inferred intent.

**Track progress:** create one todo per phase (0–8) before any other action; Phase 6 gets one sub-task per surfaced finding.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:
- **No interactive prompt tool:** Print a numbered findings table with a disposition column. NEVER silently auto-apply high-risk fixes — they require explicit user input. For preset selection, state your assumption and proceed. For the Phase 3 editorial-pass gate, state "no `--reduce` flag → skipping the editorial pass" and proceed (the pass is opt-in).
- **No `TodoWrite`:** Print phase headers as you progress. Do not batch.
- **No `WebFetch` / no Notion MCP:** Refuse URL / `notion://` input with a note; ask the user to paste or export the content.
- **No subagents:** Run all phases sequentially in the main agent, including the Phase 3 editor and rewriter passes.

## Phase 0: Context, custom checks, thresholds {#context}

1. Read `~/.pmos/learnings.md` `## /polish` if present (known false-positive checks, preferred presets, custom phrases) and factor it in.
2. Resolve checks file: `--checks <path>` → load ONLY that file; otherwise `~/.pmos/polish/custom-checks.yaml` if it exists.
3. Validate against `schemas/custom-checks.schema.json`. On schema error: print the offending entries and continue with built-ins only — never silently skip.
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

## Phase 1: Ingest + classify {#ingest}

**Resolve input source:** local file path → `Read`; `http(s)://` → `WebFetch`, strip to markdown; `notion://<id>` → Notion MCP (read-only); quoted inline text → the argument is the document. If a required tool isn't available, refuse the input mode with a one-line note.

**Detect `doc_format`** — deterministic, extension-based, no LLM call: local `.html`/`.htm` → `html`; everything else (including all URL/Notion/inline inputs — their HTML is page chrome, normalized to markdown) → `markdown`. Carry `doc_format` through to Phase 8: it governs the lock-zone set, the chunk anchors, and the output extension. **Never round-trip HTML through markdown** — an `.html` input is polished as HTML and written as `.polished.html`.

Then, per `reference/chunking.md`: compute the **lock zones** (markdown set always; the HTML set additionally when `doc_format == html` — patches intersecting a lock are rejected, the rubric never fires inside one), the **polishable word count** (`total − locked`; drives all size decisions), and the **size bucket** (<4,000 → no chunking; 4,000–25,000 → chunked patch generation on H1/H2; >25,000 → refuse with split-and-retry guidance). Iteration count is independent of size.

**Voice sample** per `reference/voice-sampling.md` — extract the marker JSON once, from the original doc; `low_confidence: true` if <200 polishable words.

**Doc-type classifier:** cheap signals first (filename prefix, frontmatter `type:`); a single LLM classifier call only if no signal matches.

## Phase 2: Pick preset {#preset}

Skip if `--preset` was passed (or inferred from the request).

<!-- defer-only: ambiguous -->
Otherwise, surface preset options via `AskUserQuestion`. Preset semantics live in `reference/presets.md`. The recommended option is the classifier output; if classifier confidence <0.6, recommend **preserve voice**.

```
Detected: <classifier output>
Recommended preset: <name>
Options: [<recommended> (Recommended) | <alternative 1> | <alternative 2> | Preserve voice]
```

## Phase 3: Editorial reduction (opt-in) {#editorial-pass}

Runs between preset selection and the rubric. **Opt-in — the default is Skip.** Full contract — target resolution (`--reduce` parsing, the gate `AskUserQuestion` whose Skip option is `(Recommended)` and auto-picks under `--non-interactive`), the editor and rewriter subagent prompts, validation/prune, the single capped re-critique, HTML fidelity, `--dry-run` and chunking interplay — lives in `reference/editorial-pass.md`. Follow it.

What the rest of the pipeline needs to know:
- Its output (the reduced doc if it ran, else the ingested doc unchanged) is the **working document** for Phase 4 onward.
- The **editor critiques only** (emits `editor_notes.json`); the **rewriter applies** — two distinct roles. `risk: high` notes and rewriter voice-conflicts are never auto-applied; they surface via Phase 6.
- It is **not a polish iteration** — it runs once (plus at most one re-critique), independent of Phase 7's two-iteration cap.

## Phase 4: Run binary eval rubric {#rubric}

Follow `reference/rubric.md` — all 15 built-in checks plus any user-defined checks, on the working document. Each check returns `pass | fail` with cited spans (line + excerpt). Detection skips locked zones.

**Metric checks are scripted.** Run `node scripts/metrics.js <working-doc>` once; checks 2, 3, and 11 compare its output against the preset thresholds deterministically — the judge never computes a number (verdicts from LLM arithmetic flap across model versions).

**LLM-judge contract** (checks 4, 6b, 7, 12, 13, 14 + `prompt`-mode custom checks): determinism comes from structure, not sampling parameters — every call uses the output schema `{verdict: "pass" | "fail", cited_spans: [{line, excerpt}], rationale: string}`, and a `fail` with no `cited_spans` is treated as `pass` (no evidence → no action).

**Output: emit a `rubric_results` YAML block inline** — a hard precondition for Phase 5 (no block → no patches):

```yaml
rubric_results:
  - check: <id>
    verdict: pass | fail
    scope: local | global
    cited_spans: [{line: <n>, excerpt: "..."}]   # required on fail
  # ... one entry per check (15 built-in + any custom)
summary:
  failed_local: <N>
  failed_global: <N>
  total_failed: <N>
```

## Phase 5: Estimate budget + targeted refactor passes {#budget-patches}

**Budget estimate first.** Before generating any patches, show the user what fixing costs and get consent: how many checks failed (`<N>` MUST equal `summary.total_failed`), roughly how many LLM calls the patch passes will take (patch generation + judge re-checks, doubled if a 2nd iteration looks likely, plus the editorial pass's calls if it ran), and a rough duration — then `Continue? [Y / Downscope / Dry-run only]`. Cost in dollars is intentionally NOT shown — pricing varies. **If the estimate exceeds ~30 calls the prompt is mandatory (no default-Y).** A bulk-scope question ("Surgical / Comprehensive / Full") is not a substitute — that's a preset decision, not a budget decision.

If `--dry-run`, stop here and print the rubric report (plus editor notes if Phase 3 drafted them). Do not generate patches.

**Patch generation.** Per failed check (per chunk if chunked), follow `reference/patch-contract.md`: locate spans → rewrite with voice markers + preset thresholds injected → reject lock-zone intersections → per-patch QA on LOCAL checks only (2-retry cap; still failing → mark "partial fix — introduces X"). Global checks re-run once per iteration in Phase 7, never per patch. **Never rewrite technical/factual claims** — flag them as "verify" findings instead.

`PRESERVE_VOICE_CONFLICT` emissions are promoted to high-risk findings (protocol in `reference/patch-contract.md`). **Abort cap:** if conflicts exceed 30% of attempted patches in a non-low-confidence run, abort with: *"Voice constraints too strict for this doc — re-run with `--preset concise` or `--preset narrative`."*

## Phase 6: Findings presentation {#findings}

**Hard rule — Phase 6 is a write-gate.** No `Write`/`Edit` to the polished file until at least one prompt round on surfaced high-risk findings has been answered (exception: zero high-risk findings → straight to Phase 7). A bulk-scope question is not a substitute for per-finding disposition.

Present findings per `_shared/findings-dispositions.md` — four dispositions, ≤4 per batch, platform fallback table, all canonical there. `/polish` deltas (full detail in `reference/findings-protocol.md`):

- **Auto-apply lane (low-risk: checks 1, 5, 6a, 6b, 9, 10):** apply silently in a single batch; aggregate counts in the summary. Nothing else skips the prompt.
- **Surfaced lane (high-risk: checks 2, 3, 4, 7, 8, 11, 12, 13, 14; plus voice-conflicts, partial fixes, and `risk: high` editorial notes):** per-finding `Fix as proposed (Recommended)` / Modify / Skip / Defer. Check 8's patch deletes a claim, not just rhetoric — that's why it is surfaced despite regex detection.
- **Defer target** is an in-document marker comment inserted above the span (exact format in `reference/findings-protocol.md`) — never line numbers, they go stale.
- **Structural changes** (lede moves, merges, reorders) are always individually surfaced, never bundled, never auto-applied.

## Phase 7: Apply, re-run, optional 2nd iteration {#apply-iterate}

1. Apply auto-fixes + approved patches to a working copy (per chunk if chunked).
2. Re-run the FULL rubric on the polished output (whole doc, including the metrics script).
3. Compute before/after metrics: word count, avg sentence length, passive %, AI-vocab hits, em-dash count, hedging hits.
4. NEW failures on the regex checks (1, 5, 6a, 8, 9, 10; excluding user-Skipped/Deferred) → one 2nd findings round (same lanes), apply approved patches. New llm-judge or script-metric failures do NOT trigger a 2nd iteration — list them as residuals (a second pass on those has not been observed to converge).
5. **Hard cap: 2 polish iterations total** — a cost governor, not a quality gate. If iter-2 still finds failures, write the file and list the residuals in the summary; never iterate further.

## Phase 8: Write output, capture learnings, offer replace {#write-output}

1. **Stitch** chunks back together if chunked; verify boundary lines are byte-identical (markdown: fail the run if not; HTML: additionally verify all non-prose bytes, best-effort-warn per `reference/editorial-pass.md` §6).
2. **Write** the polished file with the source-format extension: `<basename>.polished.html` for HTML, else `<basename>.polished.md`. (Inline/URL/Notion input → print the polished text instead.)
3. **Capture learnings** before printing the summary (its `Learnings captured:` line must be honest). Follow `_shared/learnings-capture.md`; polish-specific candidates worth checking: false-positive checks, repeated user `Skip` on the same check, phrases the user flags themselves (→ their `custom-checks.yaml`), preset misclassification, repeated threshold overrides. Zero learnings is a valid outcome; the gate is that the reflection happens.
4. **Print the summary block:**

```
Polish complete: <input> → <output>

Voice: <detected> → applied "<preset>"
Editorial pass: <skipped | target ~30-40% · est ~36% · actual ~33% · 19 applied / 2 skipped / 3 surfaced (2 approved) | dry-run — N notes drafted (est ~X%), not applied>
Findings: 15 checks run, <N> failed, <auto> auto-fixed, <user> user-fixed, <deferred> deferred
Iterations: <N> of 2 (max)
Learnings captured: <N> (see ~/.pmos/learnings.md ## /polish)

Before → After:   (anchored to the ORIGINAL ingested doc — includes editorial cut + rubric tightening)
  Words / avg sentence length / passive % / AI-vocab hits / em-dashes / hedging hits

[⚠ markup outside prose nodes may have shifted — review before replacing]   ← only when HTML fidelity failed
Replace <original> with the polished version? [y/N]
```

5. **Replace prompt** (local-file input only): on `y` — inside a git repo (`git -C <dir> rev-parse --is-inside-work-tree`) `mv` polished over original (git is the safety net); outside a repo, move original to `<original>.bak` first. On `N`, leave both files. If HTML fidelity failed, never default the prompt to yes.

## File map

- `reference/rubric.md` — the 15 checks: modes, risk classes, patterns, judge prompts, thresholds hook
- `reference/presets.md` — preset semantics + per-preset threshold defaults
- `reference/voice-sampling.md` / `reference/chunking.md` / `reference/patch-contract.md` — voice markers · lock zones + size buckets · patch prompt + conflict protocol
- `reference/findings-protocol.md` — polish's deltas on `_shared/findings-dispositions.md`
- `reference/editorial-pass.md` — Phase 3 contract (gate, editor/rewriter prompts, re-critique, HTML fidelity)
- `scripts/metrics.js` — deterministic metrics for checks 2/3/11; `scripts/apply-edit-at-anchor.js` — comment-resolver shim
- `schemas/` — custom-checks + editor-notes JSON schemas; `example/custom-checks.yaml` — copy to `~/.pmos/polish/`
- `tests/fixtures/` + `tests/expected.yaml` — 11 fixtures with property-based detection contracts

## Apply comment-resolver edit {#apply-comment-resolver-edit}

The `/polish` entrypoint that `/comments resolve` dispatches into when walking open threads in a polished artifact's inline `pmos-comments` JSON block.

- **Contract (normative):** `plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md` — input/output JSON shapes, resolution order (id-first, then ≥40-char quote-substring fallback), the closed `error_enum`, idempotency rules, subagent invocation convention. Cite it; never restate it.
- **Shim:** `scripts/apply-edit-at-anchor.js` — exports `apply(input)`, returns the contract's success / failure / clarification shapes; success includes the optional `applied_artifact` field. The shim's minimal edit inserts an HTML annotation comment before the resolved anchor; neither anchor strategy hitting → `{ success: false, error_enum: "anchor_orphaned" }`, no mutation.
- **Emit obligations (Phase 8):** `.polished.html` MUST carry `<meta name="pmos:skill" content="polish">` in the `<head>` (the resolver routes by this tag, byte-exact), and the `assets/` directory gets `comments.js`, `comments.css`, and the launcher trio copied from `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/` via `cp -n`.
- **Tests:** `tests/apply-edit-at-anchor.test.js` (5 cases) + wrapper `tests/scripts/assert_apply_edit_at_anchor_polish.sh`.

---

*Spec lineage: `2026-05-04_polish-skill` (rubric, voice preservation, iteration caps, chunking), `2026-05-13_polish-editorial-pass` (Phase 3 reduction pass, doc_format round-trip), `2026-05-23_inline-doc-comments` + `2026-05-28_inline-html-artifacts` (comment resolver, inline persistence), `2026-05-08_non-interactive-mode` (mode contract).*
