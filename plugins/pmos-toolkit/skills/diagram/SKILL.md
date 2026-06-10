---
name: diagram
description: Generate a single SVG vector diagram from a free-form description (with optional source markdown) — architecture, flow, hierarchy, dependency, sequence, state, mental-model, etc. Brainstorms 2–3 structural framings from first principles, asks the user to pick, then drafts and self-evaluates against a hybrid rubric (deterministic SVG metrics with hard-fails + a binary vision check on a rendered raster) with up to 2 refinement loops. Applies a configurable theme (default `technical`; switch with `--theme editorial`) so every output is consistent. Standalone utility — does not load workstream context. Use when the user says "draw a diagram", "create an architecture diagram", "show how X flows", "make an SVG of this concept", "diagram this", or wants a vector visual of any system/flow/structure.
user-invocable: true
argument-hint: "<free-form description> [--source <path>] [--out <path>] [--approach <free-text>] [--theme technical|editorial] [--mode diagram|infographic] [--rigor high|medium|low] [--clear-cache] [--selftest] [--non-interactive | --interactive] [--on-failure drop|ship-with-warning|exit-nonzero]"
---

# `/diagram` — SVG Diagram Generator

**Announce at start:** "Using the diagram skill to generate an SVG from your description."

Produce one `.svg` file plus a `<slug>.diagram.json` sidecar that records the design decisions. The active theme (`themes/<theme>/theme.yaml`) is the single machine authority for visual style; a hybrid eval (`eval/code-metrics.md` + `eval/rubric.md`) gates the output. The skill is **standalone** — it does not load workstream context and does not gate any pipeline stage.

**NL-first options:** infer flag values from the request — "quick draft" ≡ `--rigor low`, "editorial style" ≡ `--theme editorial`, "make it an infographic" ≡ `--mode infographic`; an explicit flag always overrides. Never infer `--clear-cache` (destructive) or `--on-failure` (machine contract for callers).

---

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No interactive prompt tool:** state your assumption, document it in the sidecar, and proceed.
  - Phase 1 collision: default to `suffix` (write `<slug>-2.svg`).
  - Phase 1 same-concept: default to `redraw`.
  - Phase 2 brainstorm: pick the first framing you'd recommend; record alternatives in the sidecar's `alternativesConsidered`.
  - Phase 6 refinement findings: present per the platform fallback in `_shared/findings-dispositions.md` (numbered table, structured ask); do NOT silently self-fix.
  - Phase 7 terminal failure: default to `ship-with-warning`, prepend an XML comment to the SVG.
- **No subagents:** run the Phase 5 reviewer call inline — same prompt, same rubric (the capability check in Phase 5 covers this automatically).
- **No Playwright MCP:** use `rsvg-convert` or `cairosvg` per `reference/render-to-raster.md`; refuse to run if none are available.

---

## Track Progress

This skill has integer phases 0–10 (Phase 8 runs only in `--mode infographic`). Create one task per phase you'll touch using your agent's task-tracking tool (e.g., `TodoWrite` in Claude Code, equivalent in other agents). Mark each task in-progress when you start it and completed as soon as it finishes — do not batch completions.

---

## Load Learnings

Read `~/.pmos/learnings.md` if it exists. Note any entries under `## /diagram` and factor them into your approach for this session.

---

## Phase 0 — Setup, args, hard-gate renderer detection {#setup}

1. **Parse args.**
   - Positional: free-form description (required, unless `--clear-cache` or `--selftest` is the only arg).
   - Flags: `--source <path>`, `--out <path>`, `--approach <text>`, `--theme <name>` (default `technical`), `--mode diagram|infographic` (default `diagram`), `--rigor high|medium|low` (default `high`), `--clear-cache`, `--selftest`, `--on-failure {drop|ship-with-warning|exit-nonzero}`.
   - `--on-failure` validation: unknown value → print `error: --on-failure must be one of {drop, ship-with-warning, exit-nonzero}` to stderr, exit 64. Default when `mode == non-interactive` and flag absent: `exit-nonzero`. When `mode == interactive` the flag is parsed but advisory only — Phase 7's interactive prompt remains the source of truth.
   - Derive `<slug>` = first 5–6 content words of the description, kebab-cased.
   - **Resolve `{docs_path}`**: read `.pmos/settings.yaml` in the current repo; if present, use its `docs_path` value. If absent, fall back to `docs/pmos/` (create on demand).
   - Default `--out` = `{docs_path}/diagrams/<slug>.svg` (create `diagrams/` if needed). The sidecar lives next to the SVG: `<out basename>.diagram.json`.

2. **Special-mode shortcuts** (handle and exit):
   - `--clear-cache` → wipe `~/.pmos/diagram-cache/` (and only that directory). Print count of files removed. Exit.
   - `--selftest` → run `python3 "${CLAUDE_PLUGIN_ROOT}/skills/diagram/tests/run.py"`. Exit with the runner's exit code.

3. **Renderer detection (HARD GATE).** Detect per `reference/render-to-raster.md` §Detection — Playwright MCP → `rsvg-convert` → `cairosvg`, first hit wins. If none → REFUSE TO RUN: print that file's install-hint block verbatim and exit 2. Vision review is non-negotiable; without it half the eval is missing.

4. **Resolve `--theme`** (default `technical`). Load `themes/<theme>/theme.yaml` and validate it against `themes/_schema.json`. Missing file or schema failure → print the error and exit 2. The theme governs palette, typography, strokes, connector dispatch, arrowheads, and rubric overrides.

5. **Resolve `--mode`** (default `diagram`). If `--mode infographic` AND `theme.infographic.supported: false`, refuse with: `Theme '<theme>' does not support infographic mode. Use --theme editorial or --mode diagram.` Exit 2.

6. **Read `themes/<theme>/style.md`** end-to-end — it carries the rationale and layout guidance behind the theme.yaml tokens.

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

## Phase 1 — Comprehension + existing-output handling {#comprehension}

<!-- defer-only: ambiguous -->
1. **Read `--source` if provided.** Extract entities, relationships, and any explicit hierarchy or order. If the doc is long, surface your extracted entity list to the user (via `AskUserQuestion` "is this the right entity set?" with options Confirm / Refine / Add missing) before brainstorming. Prose-fallback: print the extracted list and proceed assuming it is correct unless contradicted in the next message.

2. **Existing-output check.** If `<out>.svg` already exists:
   - Look for sibling `<out>.diagram.json` sidecar; load via `read_sidecar()` (see `tests/run.py`). It returns `None` when the file is missing OR has a pre-v2 `schemaVersion` (v1 sidecars are intentionally ignored). It raises `ValueError` for any version newer than the current schema (refuse).
   - If `read_sidecar()` returned `None`, treat the sidecar as absent and skip directly to the **Different concept** branch below.
   - **Same concept** (sidecar `concept` field substantially matches current input — case-insensitive substring or ≥0.6 Jaccard on tokens):
     <!-- defer-only: destructive -->
     - `AskUserQuestion`: "Existing diagram is for the same concept. Extend with the new instruction, or redraw from scratch?"
       Options: **Extend** / **Redraw** / **Cancel**.
     - On **Extend**: read the existing SVG. Treat sidecar `positions` and `colorAssignments` as fixed. **If the sidecar has `mode: "infographic"` and a populated `wrappedText`, also treat `wrappedText` as fixed** — Phase 8 will skip its copy-generation and user-review steps. Apply the new instruction as a minimal patch (e.g., recolor a single node, add a single connector, relabel a node). Skip Phase 2 (no new brainstorm). Proceed to Phase 4 with the patched SVG.
     - On **Redraw**: discard the existing SVG (don't delete yet — overwrite at Phase 9). Use the sidecar's `approach` as a starting hint to Phase 2 but allow new framings.
     - On **Cancel**: exit 0.
   - **Different concept** (or sidecar absent / unreadable):
     <!-- defer-only: destructive -->
     - `AskUserQuestion`: "Output path collision. Overwrite, write to `<slug>-2.svg`, or cancel?"
       Options: **Overwrite** / **Suffix** / **Cancel**.

3. **Entity model.** From either `--source` or the description, build an internal list:
   ```
   entities = [{id, label, category}]
   relationships = [{from, to, label?, kind: directed|bidirectional, role?: contribution|emphasis|feedback|dependency|reference}]
   ```
   When the active theme has `connectors.mixingPermitted: true`, Phase 3 MUST assign a `role` to every relationship (default to `default` only when no other role fits). When `mixingPermitted: false`, `role` is optional and ignored at draw time. This becomes the sidecar's `entities` / `relationships` arrays.

---

## Phase 2 — Approach selection {#approach}

If `--approach <text>` was passed: skip the brainstorm, use the supplied framing, announce it. Sidecar `alternativesConsidered` is `[]`.

Otherwise, **brainstorm 2–3 structurally distinct framings from first principles** for THIS specific content — do not pick from a hardcoded list of diagram types. Vary real structural dimensions: hierarchy direction, what's primary (actor vs artifact vs trigger), granularity, sync-vs-async edges, nesting.

<!-- defer-only: ambiguous -->
For each framing, write one paragraph: what it emphasizes, what it de-emphasizes, who it's best for. Then issue one `AskUserQuestion` ("Three ways to frame this diagram. Which lens?") with one option per framing — label = short framing name, description = one-line trade-off. Prose-fallback: print the framings as a numbered list, default to #1 if no response.

Record the chosen framing and the rejected ones in sidecar `approach` and `alternativesConsidered`.

---

## Phase 3 — Draft {#draft}

1. **Choose canvas** from the active theme's `style.md` §5.7 by content shape — 16:10 (flows, architectures, sequences; default), 1:1 (hierarchies, radial), 4:5 (tall trees, deep stacks). Announce the choice and why.

2. **Place nodes.** Snap coordinates to multiples of 4. Maintain ≥ 24px between distinct groups, ≥ 16px between siblings, ≥ 32px padding from canvas edges.

3. **Author SVG by hand** using the scaffold in `reference/svg-primer.md`: `xmlns` + `viewBox` + root `font-family`, `<title>` first child (a11y), one `<marker>` in `<defs>` reused everywhere, `<style>` class palette, content, and a legend block (top-right) whenever ≥ 2 categorical colors are used.

4. **Apply the active theme's tokens exactly as declared in `themes/<theme>/theme.yaml`** — palette, typography, stroke weights, radii, arrowheads. The YAML is the single machine authority; `style.md` carries the rationale (do not improvise values from memory). When the theme defines `palette.accents[].pinnedRole`, that mapping is fixed across every diagram drawn under the theme — never reassign per diagram.

5. **Connector style** from `theme.connectors`: if `mixingPermitted: false`, use one style for the whole diagram (orthogonal for flows/architectures/sequences, curves for mind maps/networks). If `true`, assign every relationship a `role` and draw it per `theme.connectors.byRole[role]` — all edges sharing a role MUST use the same lookup result.

6. **Write the SVG to a temp path** first (`<out>.svg.tmp`). Don't overwrite the real file until Phase 9.

7. **Write a working sidecar now** at `<out>.diagram.json.tmp` with `concept`, `approach`, `entities`, and `relationships` (including `role` and `_svgId` for every drawn edge). Phase 4's `role-style-consistency` check reads it — without a sidecar the check silently passes and mixed-role styling ships unchecked.

---

## Phase 4 — Code-metric self-review {#code-metrics}

Run:

```bash
python3 -c "
import sys, json
sys.path.insert(0, '${CLAUDE_PLUGIN_ROOT}/skills/diagram/tests')
import run
print(json.dumps(run.evaluate('<out>.svg.tmp', theme='<active-theme>', sidecar_path='<out>.diagram.json.tmp'), indent=2))
"
```

Metric definitions live in `eval/code-metrics.md`; the implementation is `tests/run.py:evaluate()`.

**Decision tree:**

- `hard_fails == []` AND `code_score >= 0.8` → proceed to Phase 5.
- Any `hard_fails` OR `code_score < 0.8` →
  - If node-count diagnostic is in [21, 30]: issue the node-count split prompt now — `AskUserQuestion`: "This diagram has N nodes. Split into 2 diagrams or proceed?" Options: **Proceed anyway (Recommended)** / **Split** / **Cancel**. Record any override in sidecar `evalSummary.userOverrides`.
  - Otherwise: enter Phase 6 with these findings as targets. Skip Phase 5 for now (vision review is wasted on a code-failing draft).

---

## Phase 5 — Vision review {#vision-review}

1. **Render** `<out>.svg.tmp` → `~/.pmos/diagram-cache/<slug>-<sha1>.png` per `reference/render-to-raster.md`. If the cache file already exists for this SVG content, reuse.

2. **Dispatch reviewer — runtime capability check.** If a subagent (Task) tool is callable in this session AND `--rigor high`: dispatch the reviewer as a subagent with `model: sonnet` (rubric-guided review with clear acceptance criteria — skill-patterns §L), passing the PNG, the source SVG, and the prompt from `eval/rubric.md`. Otherwise — `medium`/`low` rigor, no subagent capability, or `/diagram` itself running inside a subagent — run the same reviewer prompt inline. Rubric and JSON shape are identical either way; dispatch buys fresh-eyes isolation, not different criteria.

3. **Reviewer returns** the JSON shape defined in `eval/rubric.md` — `items` keyed by stable rubric IDs (each `{verdict, evidence}`), `blocker_count` (gating fails only), `top_priorities[]`. **Gating items are `legibility` plus any theme `rubricOverrides.add` items** (the theme's defining moves). Everything else is advisory — reported, surfaced as findings, never blocking. Arrowhead consistency and legend *presence* are enforced deterministically in Phase 4 (`arrowhead-mix`, `legend-missing`), not by vision.

4. **Decision:**
   - `blocker_count == 0` → combined gate satisfied → proceed to Phase 9 (via Phase 8 in infographic mode). Carry advisory fails forward as findings if entering Phase 6 anyway.
   - `blocker_count > 0` → enter Phase 6.

---

## Phase 6 — Refinement loop {#refinement}

**Loop budget by rigor tier:**

| Rigor | Up to N loops | Behavior |
|---|---|---|
| `high` (default) | 2 | Full protocol; reviewer per Phase 5's capability check |
| `medium` | 1 | Inline reviewer |
| `low` | 0 | **Skip Phase 6 entirely** — proceed to Phase 9 with whatever fails exist; ship-with-warning |

The cap is a cost governor, not a quality gate — exhausting it routes to Phase 7, never to a silent retry. For each loop iteration:

1. **Aggregate findings** from Phase 4 `hard_fails` + Phase 5 gating fails (+ advisory fails, marked as such).

2. **Present findings per `_shared/findings-dispositions.md`** — canonical options **Fix as proposed / Modify / Skip / Defer**, severity-tagged, batched ≤4 per call. `/diagram` deltas:
   - **Deterministic, safe fixes** — concrete minimal SVG edits the eval itself re-verifies (recolor to a declared token, nudge an overlapping node, add the missing `marker-end`, raise a font size, re-route a tunneling edge) → mark **Fix as proposed (Recommended)**. Under `--non-interactive` the classifier AUTO-PICKs these, so headless runs self-fix instead of stalling.
   - **Re-framing-level findings** (split the diagram, switch to an alternative framing, rethink the categorization) → tag `<!-- defer-only: ambiguous -->` at the call site; under `--non-interactive` they defer to the OQ buffer.
   - **Record every disposition** — interactive or auto-applied — in the working sidecar as `evalSummary.dispositions[]` entries `{finding, disposition, source: user|auto}`. Defer target: the SVG's open-questions sidecar (`<artifact>.open-questions.md`).

3. **Apply the disposed fixes** to `<out>.svg.tmp` as minimal SVG edits (don't redraw from scratch).

4. **Re-run Phase 4 + Phase 5.**

5. **Exit early on clean pass:** `hard_fails == []` AND `code_score >= 0.8` AND `blocker_count == 0` → break.

6. **Loop exhausted with gating fails remaining** → Phase 7 (high/medium) or proceed to Phase 9 with warning (low rigor).

---

## Phase 7 — Terminal failure + exit codes {#terminal-failure}

Loops are exhausted and gating fails remain. Disposition depends on `mode`.

### Non-interactive mode (`mode == non-interactive`)

Dispatch on `--on-failure` (default: `exit-nonzero`). Do NOT issue an interactive prompt.

| `--on-failure` | Behavior |
|---|---|
| `drop` | Do NOT write the SVG. Do NOT write the sidecar. Print `diagram dropped: <comma-joined hard_fails>` to stderr. **Exit 3.** |
| `ship-with-warning` | Write the SVG with a leading `<!-- WARNING: <comma-joined hard_fails> -->` comment. Write the sidecar normally. **Exit 0.** |
| `exit-nonzero` | Do NOT write the SVG. Do NOT write the sidecar. Print `diagram failed: <comma-joined hard_fails>` to stderr. **Exit 4.** |

### Interactive mode (`mode == interactive`)

<!-- non-interactive: handled-via on-failure-flag -->
<!-- defer-only: ambiguous -->
`AskUserQuestion`: "After N refinement loops, the diagram still has gating fails. What now?" Options:
- **Ship with warning** — write the SVG with a leading XML comment listing remaining fails.
- **Try alternative framing** — restart from Phase 3 using one of the brainstormed alternatives.
- **Abandon** — delete the temp SVG, exit non-zero.

Prose-fallback: ship-with-warning by default.

If user picks **alt framing** → restart at Phase 2 with the next brainstormed approach pre-selected; loop budget is fresh. If even the alternative fails its terminal handler, default to ship-with-warning.

### Exit-code contract (across all modes)

| Exit code | Meaning |
|---|---|
| 0 | Success — SVG + sidecar written. May include a leading warning comment if `ship-with-warning` was selected. |
| 2 | Environmental — renderer missing, theme schema invalid, mode/theme combo unsupported. |
| 3 | Non-interactive `--on-failure drop` — caller dropped the diagram slot. |
| 4 | Non-interactive `--on-failure exit-nonzero` (default) — caller decides. |
| 64 | Argument error — unknown `--on-failure` value, malformed `settings.yaml`, etc. |

---

## Phase 8 — Editorial wrapper (only if `--mode infographic`) {#editorial-wrapper}

Runs after Phase 6 produces a clean diagram; skipped for `--mode diagram` (Phase 0 already rejected unsupported theme/mode combos). The full layout spec — zones, caption auto-fit grid, anchor modes, text wrapping, sidecar additions — is `themes/editorial/infographic/editorial-v1.md`; the composition implementation is the `wrapper/` module. This phase is the orchestration only:

1. **Generate copy** with a single inline LLM prompt (short structured prompt, small output — inline beats dispatch here): description + `--source` + entity model + chosen framing + color assignments → JSON `{eyebrow, headline, lede, figLabel, captions[], footer}`.
   > **Extend short-circuit:** if Phase 1's Extend branch found a populated `wrappedText`, skip steps 1–2 and reuse it verbatim.

<!-- defer-only: ambiguous -->
2. **User-review checkpoint.** `AskUserQuestion`: "Generated infographic copy — accept, edit a field, or regenerate?" Options: **Accept** / **Edit field** (then one prompt per field: Keep / Replace / Skip) / **Regenerate** (one re-prompt with the user's feedback; further iterations are manual edits). Prose-fallback: print the JSON, accept by default.

3. **Compose and check** per editorial-v1.md: clamp captions to 3–5 (`wrapper.caption_grid.clamp_captions()`), decide color-vs-ordinal anchors (`wrapper.anchors.decide_anchor_mode()`), remap any caption color absent from the diagram to `ink` (the `caption-color-not-in-diagram` code check hard-fails leftovers), compose via `wrapper.compose.compose_wrapper()`, render to PNG, and run the slim 4-item wrapper rubric INLINE, single pass. **Wrapper rubric failures DO NOT GATE** — prepend `<!-- WRAPPER QUALITY WARNING: <ids> -->` and ship; Phase 5 already gated the diagram itself.

4. **Record** `wrappedText`, `captionAnchorMode`, `captionAnchorRemaps`, `captionCountClamp`, `wrapperRubricResults` in the working sidecar (`mode: "infographic"`, `wrapperLayout: "editorial-v1"`). Phase 9 finalizes.

---

## Phase 9 — Finalize: SVG + sidecar {#finalize}

1. **Move** `<out>.svg.tmp` → `<out>.svg`. If shipped-with-warning, prepend immediately after the `<?xml` declaration:
   ```xml
   <!-- DIAGRAM QUALITY WARNING: <comma-separated remaining fails> -->
   ```

   **SVG data-anchor retrofit:** before writing the final `.svg`, pass the SVG string through the shared helper:
   ```js
   const { retrofitSvg } = require('${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/svg-anchor.js');
   svgText = retrofitSvg(svgText);
   ```
   This injects `data-anchor="<slug>"` on every `<g>`, top-level `<rect>`, and top-level `<path>`. Slug derivation order: `kebab(id)` → `kebab(aria-label)` → `kebab(first <text> child)` → `shape-<N>` ordinal; duplicates get `-2`/`-3` suffixes. Idempotent — re-applying is a no-op. These anchors are consumed by `/comments resolve`'s svg-data-anchor strategy when routing comment threads to diagram nodes.

2. **Write `<out>.diagram.json`** (finalizing the working sidecar) via `write_sidecar()` per `reference/sidecar-schema.md`: `schemaVersion: 2`, `theme`, `mode`, `concept`, `approach`, `alternativesConsidered`, `canvas`, `entities`, `relationships` (with `role`/`_svgId` where assigned), `positions`, `colorAssignments`, `evalSummary` (including `visionItems` keyed by stable rubric IDs and `dispositions[]` from Phase 6), `createdAt` (ISO 8601 UTC), `createdBy: "pmos-toolkit:diagram@v2"`.

3. **Print final stdout** (one line of path + one line of eval summary):
   ```
   <absolute-path>/<slug>.svg
   Eval: PASS — code <score>, vision gating pass (advisory fails: <ids or none>), canvas <aspect>, <node-count> nodes
   ```
   Or, on shipped-with-warning:
   ```
   <absolute-path>/<slug>.svg
   Eval: WARNING — <comma-separated remaining fails>; <other summary>
   ```

---

## Phase 10 — Capture Learnings {#capture-learnings}

**This skill is not complete until the learnings-capture process has run.** Read and follow `_shared/learnings-capture.md` (relative to the skills directory) now. Reflect on surprising rendering behaviors, repeated user corrections, eval-rubric drift, framings that worked unusually well or badly. Proposing zero learnings is valid; the gate is that the reflection happens. If the shared file is not found, append entries to `~/.pmos/learnings.md` under `## /diagram`.

---

## Anti-patterns (DO NOT)

- Do NOT brainstorm from a hardcoded list of diagram types ("flowchart vs hierarchy vs swimlane"). Always reason from the specific content's structure.
- Do NOT copy the structure of any file in a theme's `atoms/` directory — those are visual primitives, not templates. Re-derive layout each time.
- Do NOT regenerate the entire SVG when the user requests a tweak via the extend flow. Apply minimal patches preserving sidecar `positions`.
- Do NOT silently dump prose findings in Phase 6 — interactive findings go through `_shared/findings-dispositions.md`; non-interactive auto-applies are recorded in `evalSummary.dispositions`, never invisible.

(Everything else the old anti-pattern list restated — palette, font floor, node cap, connector mixing, forbidden SVG features, renderer gate — is enforced by the Phase 0/4 hard gates and `themes/<theme>/style.md` §5.9; one home each.)

---

## Apply comment-resolver edit

This is the `/diagram` entrypoint that `/comments resolve` dispatches into when walking open threads in a diagram artifact's inline `pmos-comments` JSON block. The contract — input/output JSON shapes, closed `error_enum` set, idempotency rules, subagent invocation convention — lives in the shared contract doc, which this section cites rather than restates:

- **Contract (normative):** `plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md`.
- **Shim:** `plugins/pmos-toolkit/skills/diagram/scripts/apply-edit-at-anchor.js` — exports `apply(input)`, returns one of the three output shapes (success / failure / clarification).

### Applyable vs infeasible edits (diagram-specific)

- **Applyable:** textual edits to SVG `<text>` elements (node labels, edge labels, annotations). Anchors may use `data-anchor="<id>"` (SVG-native) or `id="<id>"` (HTML wrapper `<section>` elements).
- **Infeasible:** edits to geometry (shape coords, path data, viewBox, dimensions). The shim returns `agent_judged_infeasible` with `system_reply: "Cannot apply: edit targets SVG geometry (shape coords, paths, dimensions). SVG-retrofit is deferred to T23. Regenerate the diagram via /diagram for structural layout changes."`.

### Comments meta tag + asset substrate

Every generated diagram HTML wrapper MUST include `<meta name="pmos:skill" content="diagram">` in `<head>`. For standalone `.svg` output, the resolver routes via the `<title>` element and the sidecar's `concept` field.

Copy the inline-doc-comments substrate alongside the diagram output:

```bash
cp -n  "${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/comments.js"          "{output_dir}/assets/"
cp -n  "${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/comments.css"         "{output_dir}/assets/"
install -m 0755 "${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/comments-open.command" "{output_dir}/assets/comments-open.command"
install -m 0755 "${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/comments-open.sh"      "{output_dir}/assets/comments-open.sh"
cp -n  "${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/comments-open.bat"    "{output_dir}/assets/comments-open.bat"
```

### Resolution order

Per the contract (diagram-specific: supports both `id=` and `data-anchor=`):

1. **id-first.** If `anchor.id_anchor` is set, locate `id="<id>"` in the artifact HTML, OR `data-anchor="<id>"` on SVG elements. Match → success, `strategy: "id-first"`, `score: 1.0`.
2. **quote-fallback.** Otherwise, substring-contains match `anchor.quote_anchor.text` (≥40 chars) against the candidate's text content.
3. **Neither hits** → `{ success: false, error_enum: "anchor_orphaned" }`; do NOT mutate the artifact.

Closed `error_enum` (authoritative list in the contract doc): `anchor_orphaned`, `edit_conflicted`, `agent_judged_infeasible`, `agent_errored`. Idempotent no-ops return the `diff_ref` substring form: `{ "success": true, "diff_ref": "no-op: edit already applied", ... }`.

### Tests

- Per-skill contract: `tests/apply-edit-at-anchor.test.js` (5 cases: id-first happy, orphan, idempotent, infeasible, clarification); wrapper at `tests/scripts/assert_apply_edit_at_anchor_diagram.sh` (repo root).

---

*Spec lineage: `2026-05-03_diagram-skill` (hybrid eval, 2-loop cap, brainstorm-first), `2026-05-08_update-skills-diagram-on-failure` (`--on-failure` + exit-code contract), `docs/superpowers/specs/2026-05-06-diagram-themes-and-infographic-mode-design.md` (themes, infographic mode, sidecar v2), `2026-05-23_inline-doc-comments` + `2026-05-28_inline-html-artifacts` (comment resolver, data-anchor retrofit, asset substrate), `2026-05-08_non-interactive-mode` (mode contract), `2026-06-10_skill-design-review` (gating rebalance, non-interactive self-fixing, theme.yaml single authority).*
