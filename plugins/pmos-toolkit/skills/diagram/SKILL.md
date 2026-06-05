---
name: diagram
description: Generate a single SVG vector diagram from a free-form description (with optional source markdown) — architecture, flow, hierarchy, dependency, sequence, state, mental-model, etc. Brainstorms 2–3 structural framings from first principles, asks the user to pick, then drafts and self-evaluates against a hybrid rubric (deterministic SVG metrics with hard-fails + a 7-item binary vision rubric on a rendered raster) with up to 2 refinement loops. Applies a configurable theme (default `technical`; switch with `--theme editorial`) so every output is consistent. Standalone utility — does not load workstream context. Use when the user says "draw a diagram", "create an architecture diagram", "show how X flows", "make an SVG of this concept", "diagram this", or wants a vector visual of any system/flow/structure.
user-invocable: true
argument-hint: "<free-form description> [--source <path>] [--out <path>] [--approach <free-text>] [--theme technical|editorial] [--mode diagram|infographic] [--rigor high|medium|low] [--clear-cache] [--selftest] [--non-interactive | --interactive] [--on-failure drop|ship-with-warning|exit-nonzero]"
---

# `/diagram` — SVG Diagram Generator

**Announce at start:** "Using the diagram skill to generate an SVG from your description."

Produce one `.svg` file plus a `<slug>.diagram.json` sidecar that records the design decisions. Skill enforces a configurable theme (`themes/<theme>/theme.yaml` + `style.md`) and a hybrid eval (`eval/code-metrics.md` + `eval/rubric.md`). The skill is **standalone** — it does not load workstream context, does not gate any pipeline stage. Invoke any time you need a diagram.

---

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No interactive prompt tool:** state your assumption, document it in the sidecar, and proceed.
  - Phase 1 collision: default to `suffix` (write `<slug>-2.svg`).
  - Phase 1 same-concept: default to `redraw`.
  - Phase 2 brainstorm: pick the first framing you'd recommend; record alternatives in the sidecar's `alternativesConsidered`.
  - Phase 6 refinement findings: present as a numbered findings table with disposition column; do NOT silently self-fix.
  - Phase 6.5 terminal failure: default to `ship-with-warning`, prepend an XML comment to the SVG.
- **No subagents:** for Phase 5 vision review, run the reviewer call inline rather than dispatching a `general-purpose` subagent.
- **No Playwright MCP:** use `rsvg-convert` or `cairosvg` per `reference/render-to-raster.md`; refuse to run if none are available.

---

## Track Progress

This skill has multiple phases (0, 1, 2, 3, 4, 5, 6, 6.6, 7, 8). Phase 6.6 runs only in `--mode infographic`. Create one task per phase you'll touch using your agent's task-tracking tool (e.g., `TodoWrite` in Claude Code, equivalent in other agents). Mark each task in-progress when you start it and completed as soon as it finishes — do not batch completions.

---

## Load Learnings

Read `~/.pmos/learnings.md` if it exists. Note any entries under `## /diagram` and factor them into your approach for this session.

---

## Phase 0 — Setup, args, hard-gate renderer detection

1. **Parse args.**
   - Positional: free-form description (required, unless `--clear-cache` or `--selftest` is the only arg).
   - Flags: `--source <path>`, `--out <path>`, `--approach <text>`, `--theme <name>` (default `technical`), `--mode diagram|infographic` (default `diagram`), `--rigor high|medium|low` (default `high`), `--clear-cache`, `--selftest`, `--on-failure {drop|ship-with-warning|exit-nonzero}`.
   - `--on-failure` validation:
     - Accepted values: `drop`, `ship-with-warning`, `exit-nonzero`. Unknown value → print `error: --on-failure must be one of {drop, ship-with-warning, exit-nonzero}` to stderr, exit 64.
     - Default when `mode == non-interactive` and flag absent: `exit-nonzero`.
     - When `mode == interactive`, the flag is parsed but advisory only — Phase 6.5's interactive prompt (the AUQ) remains the source of truth.
   - Derive `<slug>` = first 5–6 content words of the description, kebab-cased.
   - **Resolve `{docs_path}`**: read `.pmos/settings.yaml` in the current repo; if present, use its `docs_path` value (default in that file is `.pmos`). If `.pmos/settings.yaml` does not exist, fall back to `docs/pmos/` (create on demand).
   - Default `--out` = `{docs_path}/diagrams/<slug>.svg`. Create the `diagrams/` subdirectory if it doesn't exist.
   - The sidecar lives next to the SVG: `{docs_path}/diagrams/<slug>.diagram.json`.

2. **Special-mode shortcuts** (handle and exit):
   - `--clear-cache` → wipe `~/.pmos/diagram-cache/` (and only that directory). Print count of files removed. Exit.
   - `--selftest` → run `python3 skills/diagram/tests/run.py`. Exit with the runner's exit code.

3. **Renderer detection (HARD GATE).** In order:
   1. Playwright MCP — check whether `mcp__plugin_playwright_playwright__browser_navigate` is callable in this session.
   2. `rsvg-convert` — `command -v rsvg-convert >/dev/null 2>&1`.
   3. `cairosvg` — `python3 -c "import cairosvg" 2>/dev/null`.

   If none → REFUSE TO RUN. Print:
   ```
   /diagram requires an SVG renderer for vision review. Install one of:
     • Playwright MCP (preferred): add the playwright plugin to your Claude Code session
     • rsvg-convert (macOS):       brew install librsvg
     • rsvg-convert (Linux):       apt-get install librsvg2-bin
     • cairosvg (any platform):    pip install cairosvg
   ```
   Exit non-zero. Vision review is non-negotiable; without it half the eval is missing.

4. **Resolve `--theme`** (default `technical`). Load `themes/<theme>/theme.yaml` and validate it against `themes/_schema.json`. If the file is missing or schema validation fails, print the error and exit 2. The active theme governs palette, typography, stroke choices, connector dispatch, arrowhead style, and rubric overrides.

5. **Resolve `--mode`** (default `diagram`). If `--mode infographic` AND `theme.infographic.supported: false`, refuse with: `Theme '<theme>' does not support infographic mode. Use --theme editorial or --mode diagram.` Exit 2.

6. **Read `themes/<theme>/style.md`** end-to-end. You will be quoting its tokens throughout.

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

## Phase 1 — Comprehension + existing-output handling

<!-- defer-only: ambiguous -->
1. **Read `--source` if provided.** Extract entities, relationships, and any explicit hierarchy or order. If the doc is long, surface your extracted entity list to the user (via `AskUserQuestion` "is this the right entity set?" with options Confirm / Refine / Add missing) before brainstorming. Prose-fallback: print the extracted list and proceed assuming it is correct unless contradicted in the next message.

2. **Existing-output check.** If `<out>.svg` already exists:
   - Look for sibling `<out>.diagram.json` sidecar; load via `read_sidecar()` (see `tests/run.py`). It returns `None` when the file is missing OR has a pre-v2 `schemaVersion` (v1 sidecars are intentionally ignored). It raises `ValueError` for any version newer than the current schema (refuse).
   - If `read_sidecar()` returned `None`, treat the sidecar as absent and skip directly to the **Different concept** branch below.
   - **Same concept** (sidecar `concept` field substantially matches current input — case-insensitive substring or ≥0.6 Jaccard on tokens):
     <!-- defer-only: destructive -->
     - `AskUserQuestion`: "Existing diagram is for the same concept. Extend with the new instruction, or redraw from scratch?"
       Options: **Extend** / **Redraw** / **Cancel**.
     - On **Extend**: read the existing SVG. Treat sidecar `positions` and `colorAssignments` as fixed. **If the sidecar has `mode: "infographic"` and a populated `wrappedText`, also treat `wrappedText` as fixed** — Phase 6.6 will skip its copy-generation and user-review steps. Apply the new instruction as a minimal patch (e.g., recolor a single node, add a single connector, relabel a node). Skip Phase 2 (no new brainstorm). Proceed to Phase 4 with the patched SVG.
     - On **Redraw**: discard the existing SVG (don't delete yet — overwrite at Phase 7). Use the sidecar's `approach` as a starting hint to Phase 2 but allow new framings.
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
   When the active theme has `connectors.mixingPermitted: true`, Phase 3 MUST assign a `role` to every relationship (default to `default` only when no other role fits). When `mixingPermitted: false`, `role` is optional and ignored at draw time. This becomes the sidecar's `entities` / `relationships` arrays in Phase 7.

---

## Phase 2 — Approach selection

If `--approach <text>` was passed: skip the brainstorm, use the supplied framing, announce it. Sidecar `alternativesConsidered` is `[]`.

Otherwise, **brainstorm 2–3 structurally distinct framings from first principles** for THIS specific content. Do not pick from a hardcoded list. Examples of the kind of dimensions you might vary (this is illustrative, not a menu):

- Hierarchy direction (top-down vs left-right vs radial).
- What's primary (the actor vs the artifact vs the trigger event).
- Granularity (groups-and-flows vs every-individual-node).
- Synchronous vs asynchronous edges (sequence vs dataflow).
- Nesting (containers around groups vs flat).

<!-- defer-only: ambiguous -->
For each framing, write one paragraph: what it emphasizes, what it de-emphasizes, who it's best for. Then issue `AskUserQuestion`:

```
question: "Three ways to frame this diagram. Which lens?"
header: "Framing"
options:
  - { label: "<framing 1 short name>", description: "<one-line trade-off>" }
  - { label: "<framing 2 short name>", description: "<one-line trade-off>" }
  - { label: "<framing 3 short name>", description: "<one-line trade-off>" }
```

Prose-fallback: print the three framings as a numbered list, default to #1 if no response.

Record the chosen framing and the rejected ones in sidecar `approach` and `alternativesConsidered`.

---

## Phase 3 — Draft

1. **Choose canvas.** Pick from the active theme's `style.md` §5.7 by content shape:
   - 16:10 (1280×800) — flows, architectures, sequences (default).
   - 1:1 (1280×1280) — hierarchies, concept maps, radial.
   - 4:5 (1280×1600) — tall trees, deep stacks.
   Announce: "Canvas: 16:10 because the content is a 4-stage left-right pipeline."

2. **Place nodes.** Snap every coordinate to multiples of 4. Maintain ≥ 24px between distinct groups, ≥ 16px between siblings. Pad ≥ 32px from canvas edges.

3. **Author SVG by hand.** Use the scaffold in `reference/svg-primer.md`:
   - `xmlns`, `viewBox`, root `font-family`.
   - `<title>` as first child (a11y).
   - `<defs>` with single `<marker id="arrow">` reused everywhere.
   - `<style>` with the class palette from svg-primer.md.
   - Content elements.
   - Legend block (top-right) only if ≥ 2 categorical colors used.

4. **Apply the active theme's tokens strictly.**
   - Palette: only colors declared in the theme's `palette` block (`ink`, `inkMuted`, `warn`, `surface`, `surfaceMuted`, every `accents[].hex`, every `categoryChips[].hex`).
   - Typography: sizes and weights from `theme.typography.body` (and `display` / `mono` / `eyebrow` when defined). For the default `technical` theme that's 12 / 14 / 16 / 20 at weights 400 / 600.
   - Stroke: weights from `theme.nodeChrome.primaryStroke` and the theme's stated defaults (technical: 1 / 1.5 / 2).
   - Radii: from `theme.nodeChrome.primaryRadius` / chip radii (technical: 0 / 4 / 8).
   - Spacing: 4-px grid is global (4 / 8 / 16 / 24 / 32) — not theme-specific.

5. **Connector style.** Inspect `theme.connectors`:
   - If `mixingPermitted: false`, use a single style for the whole diagram — orthogonal for flows/architectures/sequences, curves for mind maps/networks/dependency graphs. Pick once and stick with it.
   - If `mixingPermitted: true`, assign every relationship a `role` (one of `contribution | emphasis | feedback | dependency | reference`; default to `default` when unsure) and look up `theme.connectors.byRole[role]` to get `{shape, stroke, dashed}`. All edges sharing a role MUST use the same lookup result — mixing within a role is forbidden.

6. **Color usage.** 1–4 colors as content needs. Use ONLY colors declared in the active theme's `palette` block. When the theme defines `palette.accents[].pinnedRole`, that mapping is fixed across every diagram drawn under the theme; never reassign a pinned-role accent per diagram. If ≥ 2 categorical colors are used → legend is mandatory.

7. **Write the SVG to a temp path** first (`<out>.svg.tmp`). Don't overwrite the real file until Phase 7.

---

## Phase 4 — Code-metric self-review

Run:

```bash
python3 -c "
import sys, json
sys.path.insert(0, 'skills/diagram/tests')
import run
print(json.dumps(run.evaluate('<out>.svg.tmp'), indent=2))
"
```

(Adjust path to wherever the skill repo lives.)

**Decision tree:**

- `hard_fails == []` AND `code_score >= 0.8` → proceed to Phase 5.
- Any `hard_fails` OR `code_score < 0.8` →
  <!-- defer-only: ambiguous -->
  - If node-count diagnostic is in [21, 30]: issue node-count split prompt now (`AskUserQuestion`: "This diagram has N nodes. Split into 2 diagrams or proceed?" — Split / Proceed-anyway / Cancel). Record any override in sidecar `userOverrides`.
  - Otherwise: enter Phase 6 with these findings as targets. Skip Phase 5 for now (vision review is wasted on a code-failing draft).

---

## Phase 5 — Vision review (binary rubric)

1. **Render** `<out>.svg.tmp` → `~/.pmos/diagram-cache/<slug>-<sha1>.png` per `reference/render-to-raster.md`. If the cache file already exists for this SVG content, reuse.

2. **Dispatch reviewer.**
   - `high`-rigor: dispatch a `general-purpose` subagent with the prompt template from `eval/rubric.md`. Pass the PNG and the source SVG.
   - `medium` / `low`-rigor: run the reviewer prompt inline.

3. **Reviewer returns** the JSON shape from `eval/rubric.md` (keys are stable IDs):
   ```json
   {
     "items": {
       "primary-emphasis": {"verdict": "pass|fail", "evidence": "..."},
       "clear-entry": {"verdict": "pass|fail", "evidence": "..."},
       "legibility": {"verdict": "pass|fail", "evidence": "..."},
       "legend-coverage": {"verdict": "pass|fail", "evidence": "..."},
       "arrowhead-consistency": {"verdict": "pass|fail", "evidence": "..."},
       "style-atom-match": {"verdict": "pass|fail", "evidence": "..."},
       "visual-balance": {"verdict": "pass|fail", "evidence": "..."}
     },
     "blocker_count": "<count of gating items that failed (visual-balance is advisory)>",
     "top_priorities": ["<stable-id of most-important fix>", "..."]
   }
   ```
   When the active theme injects items via `rubricOverrides.add`, those stable IDs also appear as keys in `items` and count toward `blocker_count`.

4. **Decision:**
   - `blocker_count == 0` → combined gate satisfied → proceed to Phase 7.
   - `blocker_count > 0` → enter Phase 6.

---

## Phase 6 — Refinement loop

**Loop budget by rigor tier** (from spec §6):

| Rigor | Up to N loops | Behavior |
|---|---|---|
| `high` (default) | 2 | Full protocol with subagent reviewer |
| `medium` | 1 | Inline reviewer |
| `low` | 0 | **Skip Phase 6 entirely** — proceed to Phase 7 with whatever fails exist; ship-with-warning |

For each refinement loop iteration:

1. **Aggregate findings** from Phase 4 hard_fails + Phase 5 reviewer items 1–6 fails.

2. **Findings Presentation Protocol** (mandatory):
   <!-- defer-only: ambiguous -->
   - Group by category. Max 4 questions per `AskUserQuestion` call. Issue multiple sequential calls for more findings.
   - Each question = one blocker. Options: **Apply fix as proposed** / **Modify fix** / **Skip** / **Defer to user notes**.
   - Open-ended findings ("rethink categorization") asked as a follow-up after the structured batch.
   - Prose-fallback: numbered findings table with disposition column; do NOT silently self-fix.

3. **Apply user-approved fixes** to `<out>.svg.tmp`. Each fix is a minimal SVG edit (don't redraw from scratch).

4. **Re-run Phase 4 + Phase 5.**

5. **Exit early on clean pass:** if `hard_fails == []` AND `code_score >= 0.8` AND `blocker_count == 0`, break the loop.

6. **Loop exhausted with fails remaining** → enter Phase 6.5 (high/medium only) or proceed to Phase 7 with warning (low rigor).

---

## Phase 6.5 — Terminal failure handler (high / medium rigor only)

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
`AskUserQuestion`:

```
question: "After N refinement loops, the diagram still has gating fails. What now?"
header: "Terminal"
options:
  - Ship with warning: write the SVG with a leading XML comment listing remaining fails.
  - Try alternative framing: restart from Phase 3 using one of the brainstormed alternatives.
  - Abandon: delete the temp SVG, exit non-zero.
```

Prose-fallback: ship-with-warning by default.

If user picks **alt framing** → restart at Phase 2 with the next brainstormed approach pre-selected; loop budget is fresh. If even the alternative fails its terminal handler, default to ship-with-warning.

### Exit-Code contract (across all modes)

| Exit code | Meaning |
|---|---|
| 0 | Success — SVG + sidecar written. May include a leading warning comment if `ship-with-warning` was selected. |
| 2 | Environmental — renderer missing, theme schema invalid, mode/theme combo unsupported. |
| 3 | Non-interactive `--on-failure drop` — caller dropped the diagram slot. |
| 4 | Non-interactive `--on-failure exit-nonzero` (default) — caller decides. |
| 64 | Argument error — unknown `--on-failure` value, malformed `settings.yaml`, etc. |

---

## Phase 6.6 — Editorial wrapper (only if `--mode infographic`)

Runs after Phase 6 produces a clean diagram. Skipped if `--mode diagram` or the active theme has `infographic.supported: false` (Phase 0 already rejects the latter combo with a clear error).

> **Extend short-circuit.** If we entered Phase 6.6 via the Extend branch in Phase 1 and the existing sidecar has a populated `wrappedText`, skip step 1 (copy generation) and step 2 (user-review checkpoint). Reuse `wrappedText` directly. Steps 3–7 still run.

1. **Generate copy.** Assemble a single inline LLM prompt with: original description, `--source` markdown if provided, the entity model + relationships, the chosen Phase 2 framing, and the color-to-element assignments captured in the working sidecar. Returns JSON `{eyebrow, headline, lede, figLabel, captions[], footer}`. The prompt is short and structured; **run inline** rather than via subagent (D7).

<!-- defer-only: ambiguous -->
2. **User-review checkpoint.** `AskUserQuestion`: "Generated infographic copy — accept, edit a field, or regenerate?"
   - **Accept** → proceed to step 3.
   <!-- defer-only: ambiguous -->
   - **Edit field** → present each field one at a time (one `AskUserQuestion` per field with current text shown in description; user picks Keep / Replace / Skip-this-field; "Other" lets them rewrite).
   - **Regenerate** → re-prompt the LLM once with whatever feedback the user types. Only one regen attempt; further iterations require manual edits.

   Prose-fallback (no interactive prompt tool): print the JSON, accept by default, allow the user to reject in their next message.

3. **Caption count clamp** (per spec D8). Apply via `wrapper.caption_grid.clamp_captions()`:
   - Length > 5 → drop weakest by body length until 5 remain. Sidecar `captionCountClamp.from/to` records the change.
   - Length < 3 → re-prompt the LLM once for 3+. If still < 3 → drop the caption block entirely (sidecar `captionCountClamp.to: 0`).

4. **Determine caption anchor mode** via `wrapper.anchors.decide_anchor_mode(diagram_colors)`:
   - Count distinct hex values used inside the diagram, excluding `ink-muted` and surface tokens.
   - ≥ 3 → `captionAnchorMode = "color"` (each caption draws its left rule in its `anchorColor`).
   - < 3 → `captionAnchorMode = "ordinal"` (each caption gets a glyph from `["●", "▲", "■", "◆", "★"]`; matching glyph drawn next to the corresponding diagram element).
   - Sidecar records the chosen mode.

5. **Color remap** (color mode only). For each caption whose `anchorColor` is not actually present inside the diagram, replace with `ink` and record `{from, to, reason}` in `captionAnchorRemaps`. The `caption-color-not-in-diagram` code check (run.py) catches any leftover mismatches as a hard-fail in step 7's eval.

6. **Compose wrapper SVG** via `wrapper.compose.compose_wrapper(diagram_svg, wrappedText, theme, anchor_mode, renderer, font_metrics_available)`. Returns the composite SVG text. Wrapper preserves source diagram element `id` attributes verbatim inside `zone-diagram` so ordinal-marker mirroring can find them.

7. **Render the composite to PNG** per `reference/render-to-raster.md`. Run the slim **wrapper rubric** INLINE (no subagent dispatch, regardless of `--rigor` tier — single pass, no refinement loop). The 4 items: `wrapper-typography-hierarchy`, `wrapper-text-fit`, `wrapper-figure-proportion`, `wrapper-edge-padding`. If `wrapper_blocker_count > 0`, prepend an XML comment to the composite: `<!-- WRAPPER QUALITY WARNING: <ids> -->`. **Wrapper rubric failures DO NOT GATE — they ship-with-warning.** The full 7-item diagram rubric in Phase 5 already gated; this is supplementary insurance.

8. **Write sidecar v2** with `mode: "infographic"`, `wrapperLayout: "editorial-v1"`, `wrappedText`, `captionAnchorMode`, `captionAnchorRemaps`, `captionCountClamp`, `wrapperRubricResults`. Phase 7 finalizes the SVG move and the sidecar write.

See `themes/editorial/infographic/editorial-v1.md` for the full layout spec.

---

## Phase 7 — Finalize: SVG + sidecar

1. **Move** `<out>.svg.tmp` → `<out>.svg`. If shipped-with-warning, prepend an XML comment immediately after the `<?xml` declaration:
   ```xml
   <!-- DIAGRAM QUALITY WARNING: <comma-separated remaining fails> -->
   ```

   **SVG data-anchor retrofit (FR-50, FR-51, S15):** Before writing the final `.svg`, pass the SVG string through the shared helper:
   ```js
   const { retrofitSvg } = require('skills/_shared/html-authoring/assets/svg-anchor.js');
   svgText = retrofitSvg(svgText);
   ```
   This injects `data-anchor="<slug>"` on every `<g>`, top-level `<rect>`, and top-level `<path>` in the output. Slug derivation order: `kebab(id)` → `kebab(aria-label)` → `kebab(first <text> child)` → `shape-<N>` ordinal. Duplicates get `-2`/`-3` suffixes within the SVG. The operation is idempotent — re-applying to an already-anchored SVG is a no-op. These anchors are consumed by `/comments resolve`'s svg-data-anchor strategy (T12/T23) when routing comment threads to diagram nodes.

2. **Write `<out>.diagram.json`** sidecar via `write_sidecar()` per `reference/sidecar-schema.md`:
   - `schemaVersion: 2`
   - `theme` — the active theme name (from `--theme`, default `technical`).
   - `mode` — `"diagram"` for vanilla draws; `"infographic"` when invoked with `--mode infographic`.
   - `concept`, `approach`, `alternativesConsidered`, `canvas`, `entities`, `positions`, `colorAssignments`, `evalSummary`, `createdAt` (ISO 8601 UTC), `createdBy: "pmos-toolkit:diagram@v2"`.
   - `relationships[]` includes `role` for every relationship that was assigned one in Phase 3 (mandatory under themes with `connectors.mixingPermitted: true`; optional otherwise).
   - `evalSummary.visionItems` uses stable rubric IDs (e.g. `"primary-emphasis": "pass"`) — see `eval/rubric.md`.

3. **Print final stdout** (one line of path + one line of eval summary):
   ```
   <absolute-path>/<slug>.svg
   Eval: PASS — code <score>, vision <N>/6 items pass (item 7 advisory: <pass|fail>), canvas <aspect>, <node-count> nodes
   ```
   Or, on shipped-with-warning:
   ```
   <absolute-path>/<slug>.svg
   Eval: WARNING — <comma-separated remaining fails>; <other summary>
   ```

---

## Phase 8 — Capture Learnings

**This skill is not complete until the learnings-capture process has run.** Read and follow `_shared/learnings-capture.md` (relative to the skills directory) now.

Reflect on this session — surprising rendering behaviors, repeated user corrections, eval-rubric drift, framings that worked unusually well or badly, refinement-loop budget calibration. Proposing zero learnings is a valid outcome for a smooth session; the gate is that the reflection happens.

If a generic `learnings-capture.md` is not found, append entries directly to `~/.pmos/learnings.md` under a `## /diagram` section, one bullet per insight, with date and 1-line context.

---

## Anti-patterns (DO NOT)

<!-- defer-only: ambiguous -->
- Do NOT use `AskUserQuestion` to ask "should I proceed?" — only to gather decisions or surface findings. Each question must have a clear default fallback for environments without an interactive prompt tool.
- Do NOT skip the renderer hard-gate. If no renderer is available, refuse to run; never silently downgrade to "code-only eval".
- Do NOT brainstorm from a hardcoded list of diagram types ("flowchart vs hierarchy vs swimlane"). Always reason from the specific content's structure.
- Do NOT copy the structure of any file in `themes/technical/atoms/` (or any theme's `atoms/` directory) — those are visual primitives, not templates. Re-derive layout each time.
- Do NOT regenerate the entire SVG when the user requests a tweak via the extend flow. Apply minimal patches preserving sidecar `positions`.
- Do NOT use colors outside the active theme's declared palette. The contrast metric will hard-fail any out-of-token combination, regardless of theme.
- Do NOT reassign pinned-role accents per diagram. When a theme defines `palette.accents[].pinnedRole` (e.g. editorial pins `feedback` to `#1E3A8A`), that mapping is permanent across every diagram drawn under the theme.
- Do NOT mix connector styles within a single role even when the theme permits mixed connectors. Each role uses one consistent style across the diagram.
- Do NOT use font sizes below 12px — even for "subtle annotations". Move the content to the legend or remove it.
- Do NOT write SVGs that include `<image>`, `<foreignObject>`, `<animate>`, `filter`, drop shadows, or gradients (themes' anti-patterns sections).
- Do NOT exceed 30 primary nodes. At 21–30 you MUST prompt for a split before proceeding.
- Do NOT mix connectors unless the active theme permits role-keyed mixing (`connectors.mixingPermitted: true`). Even then, mixing within a single role is forbidden.
- Do NOT skip Phase 6.6 in infographic mode. Auto-generated copy + user-review checkpoint + slim wrapper rubric are mandatory; failures ship-with-warning, never silently.
- Do NOT use `<foreignObject>` for diagram-interior content. It is permitted only inside Phase 6.6 wrapper text zones, and only when the renderer is Playwright.
- Do NOT silently dump prose findings in Phase 6. Always use the Findings Presentation Protocol with structured options.
- Do NOT delete `~/.pmos/diagram-cache/` files outside of the explicit `--clear-cache` flag.

---

## File map

```
skills/diagram/
├── SKILL.md                       # this file (orchestrator)
├── themes/
│   ├── _schema.json               # JSON Schema for theme.yaml (positive-list; rejects layout keys)
│   ├── technical/                 # default theme
│   │   ├── theme.yaml
│   │   ├── style.md
│   │   └── atoms/                 # 8 visual primitives — NOT templates
│   └── editorial/                 # cream + dashed-container + pinned-accent + pastel-chip aesthetic
│       ├── theme.yaml
│       ├── style.md
│       ├── atoms/                 # 5 visual primitives
│       └── infographic/
│           └── editorial-v1.md    # Phase 6.6 layout zones, caption grid, slim wrapper rubric
├── eval/
│   ├── rubric.md                  # 7-item diagram rubric + 4-item wrapper rubric (theme-aware waive/add)
│   └── code-metrics.md            # xml.etree-based metric specs (impl in tests/run.py)
├── reference/
│   ├── svg-primer.md              # SVG authoring scaffold + gotchas
│   ├── render-to-raster.md        # detection + invocation for Playwright MCP / rsvg / cairosvg
│   └── sidecar-schema.md          # v2 schema (theme/mode/role/wrappedText) + versioning policy
├── wrapper/                       # Phase 6.6 composition module
│   ├── caption_grid.py            # auto-fit grid (3/4/5 captions) + clamp policy
│   ├── anchors.py                 # color vs ordinal mode decision + ordinal-marker assignment
│   └── compose.py                 # editorial-v1 wrapper SVG composition
└── tests/
    ├── conftest.py                # shared fixtures (theme_editorial, theme_technical)
    ├── run.py                     # eval impl + selftest runner (invoked by --selftest)
    ├── golden/                    # technical fixtures + golden/editorial/ subdir
    ├── defects/                   # technical fixtures + defects/editorial/ subdir
    ├── test_theme_schema.py
    ├── test_theme_loader.py
    ├── test_sidecar.py
    ├── test_rubric_loader.py
    ├── test_editorial_theme.py
    ├── test_role_consistency.py
    ├── test_caption_grid.py
    ├── test_anchors.py
    ├── test_wrapper_compose.py
    ├── test_wrapper_rubric.py
    └── test_caption_color_validator.py
```

---

## Apply comment-resolver edit (FR-22, FR-30, FR-60)

This phase is the `/diagram` entrypoint that `/comments resolve` (T10) dispatches into when walking open threads in a diagram artifact's `.comments.json` sidecar. The contract — input/output JSON shapes, closed `error_enum` set, idempotency rules, subagent invocation convention — lives in the shared contract doc and is the single source of truth:

- **Contract (normative):** `plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md` (T6).

Per [NFR-08](../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#nfr-h), this phase MUST cite that file rather than restate the contract. Anything below is `/diagram`-specific implementation guidance only.

### When invoked

The resolver dispatches a subagent with the §9.1 input JSON. The subagent's tools include this skill's Node shim:

- **Shim:** `plugins/pmos-toolkit/skills/diagram/scripts/apply-edit-at-anchor.js` — exports `apply(input)`, returns one of the three output shapes (success / failure / clarification) per §9.1.

### Applyable vs infeasible edits (diagram-specific)

/diagram emits a single SVG file or HTML wrapping an SVG.

- **Applyable:** textual edits to SVG `<text>` elements (node labels, edge labels, annotations). Anchors may use `data-anchor="<id>"` (SVG-native) or `id="<id>"` (HTML wrapper `<section>` elements).
- **Infeasible:** edits to geometry (shape coords, path data, viewBox, dimensions, polygon/polyline coordinates) — SVG-retrofit territory deferred to T23. The shim returns `agent_judged_infeasible` with `system_reply: "Cannot apply: edit targets SVG geometry (shape coords, paths, dimensions). SVG-retrofit is deferred to T23. Regenerate the diagram via /diagram for structural layout changes."`.

### Comments meta tag (FR-01, FR-40) + asset substrate (FR-10)

Every generated diagram HTML wrapper MUST include `<meta name="pmos:skill" content="diagram">` in `<head>`. For standalone `.svg` output, the resolver uses the `<title>` element and the sidecar's `concept` field for routing — but when /diagram produces an HTML wrapper, the meta tag is the canonical routing signal.

**Asset substrate:** copy the inline-doc-comments substrate alongside the diagram output:

```bash
cp -n  "${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/comments.js"          "{output_dir}/assets/"
cp -n  "${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/comments.css"         "{output_dir}/assets/"
install -m 0755 "${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/comments-open.command" "{output_dir}/assets/comments-open.command"
install -m 0755 "${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/comments-open.sh"      "{output_dir}/assets/comments-open.sh"
cp -n  "${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/comments-open.bat"    "{output_dir}/assets/comments-open.bat"
```

### Resolution order

Per the contract (diagram-specific: supports both `id=` and `data-anchor=`):

1. **id-first.** If `anchor.id_anchor` is set, locate `id="<id>"` in the artifact HTML, OR `data-anchor="<id>"` on SVG elements (diagram-native anchor style). Match → success path, `strategy: "id-first"`, `score: 1.0`.
2. **quote-fallback.** Otherwise (or on id miss), substring-contains match `anchor.quote_anchor.text` (≥40 chars) against the candidate's text content. First exact substring hit wins. Useful for matching `<text>` element content.
3. **Neither hits** → emit `{ success: false, error_enum: "anchor_orphaned" }`; do NOT mutate the artifact.

### Closed error_enum

Authoritative list in [§9.2](../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#api-error-enum) / the contract doc:

`anchor_orphaned`, `edit_conflicted`, `agent_judged_infeasible`, `agent_errored`.

### Idempotency (§9.3) — local choice

The shim returns the **`diff_ref` substring** form for no-ops:

```json
{ "success": true, "diff_ref": "no-op: edit already applied", "system_reply": "Edit already present in artifact; marking resolved without changes." }
```

### Tests

- Per-skill contract: `plugins/pmos-toolkit/skills/diagram/tests/apply-edit-at-anchor.test.js` (5 cases: id-first happy, orphan, idempotent, infeasible, clarification).
- Wrapper: `tests/scripts/assert_apply_edit_at_anchor_diagram.sh`.
