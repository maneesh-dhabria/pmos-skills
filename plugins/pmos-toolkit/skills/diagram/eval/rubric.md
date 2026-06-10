# Vision Rubric — Binary Review

This is the rubric the vision reviewer (subagent or inline call) applies to the rendered PNG of a `/diagram` output. The item list and gating flags live in `tests/run.py:RUBRIC_CORE_ITEMS` (one home); this doc explains each item.

**No 0–5 scoring.** Each item is binary `pass | fail` plus a one-sentence justification grounded in concrete pixel/element evidence (coordinates, label text, or quadrant references).

**Gating vs advisory (2026-06-10 rebalance):** only `legibility` — the one genuinely raster-only check — plus any theme `rubricOverrides.add` items **gate**. Every other core item is **advisory**: reported with evidence, surfaced as findings, never blocking. Arrowhead consistency and legend *presence* are no longer vision items at all — they are deterministic code checks (`arrowhead-mix`, `legend-missing` in `eval/code-metrics.md`).

Each item has a **stable ID** (kebab-case). Stable IDs are used in:
- `evalSummary.visionItems` keys in the v2 sidecar (e.g. `"primary-emphasis": "pass"`).
- Theme-level `rubricOverrides.waive` lists (drop the item from this theme's review).
- Theme-level `rubricOverrides.add` entries (inject an extra item for this theme).

---

## Theme-aware items

Themes can customize the rubric via `theme.yaml` `rubricOverrides`:

- `waive: ["<stable-id>", ...]` — drop these items from the reviewer prompt for this theme. Use sparingly.
- `add: [{id, prompt, evidenceHint}, ...]` — append theme-specific items. Each entry produces a new pass/fail item with the same evidence-citation contract.

Examples:
- Editorial theme adds `role-style-consistency` (verifies all edges sharing a `role` use one connector style — see editorial `theme.yaml`).
- Editorial theme adds `eyebrow-mono-uppercase-applied` (verifies the eyebrow text matches the editorial defining-move).

The runtime `build_rubric_prompt(theme)` (in `tests/run.py`) materializes the prompt for the active theme: it iterates the 7 stable items, skips waived IDs, and appends each `add` entry.

---

## Reviewer prompt template

Dispatch is a runtime capability check (SKILL.md Phase 5): subagent tool available AND `high`-rigor → dispatch with `model: sonnet`; otherwise run inline. Either way the prompt is:

```
You are reviewing a rendered diagram against a fixed rubric. You will be given:
- A PNG of the diagram (rendered at canonical canvas dimensions).
- The source SVG (for grounding citations to element ids/coords).
- The diagram's stated `concept` and chosen `approach`.

For each rubric item below (each identified by a stable kebab-case ID), return:
- "pass" or "fail"
- exactly one sentence of justification citing concrete evidence
  (pixel coordinates, label text, named element, or canvas quadrant).
  Examples:
    - "fail — node 'auth-svc' at (~410,288) is occluded by the connector to 'gateway'"
    - "pass — only 'requirements' node uses 8px corner radius and accent fill, others are 4px ink-muted"
    - "fail — top-left and bottom-right quadrants are empty (~38% canvas), nodes cluster center"

Items in the GATING section are gating. Items in the ADVISORY section are reported but do not gate.

Output JSON only:
{
  "items": {
    "primary-emphasis": {"verdict": "pass|fail", "evidence": "..."},
    "clear-entry":      {"verdict": "pass|fail", "evidence": "..."},
    ...
  },
  "blocker_count": <count of gating items that failed>,
  "top_priorities": ["<stable-id of most-important fix>", ...]  // up to 3, in order
}

Do NOT speculate beyond what you can see in the PNG/SVG. If an item is genuinely
ambiguous, lean toward "pass" but state the ambiguity in evidence.
```

---

## The core items (stable IDs)

Mapping notes: numeric keys migrated once (`1 → primary-emphasis`, … `7 → visual-balance`); `arrowhead-consistency` was removed 2026-06-10 — its check lives on as the deterministic `arrowhead-mix` hard-fail.

### `legibility` — Label legibility at 50% scale (GATING)

> Is every text label fully legible at 50% raster scale (no clipping, no occlusion by other elements, no overlap with connectors)?

**Pass** if every word reads at half-size.
**Fail** if any label is clipped, hidden, or runs together with another label/connector.

The 12px-min font rule is enforced separately by the code metric; this item catches occlusion and rendered-text overflow that code can't see — which is exactly why it is the one core item that gates.

### `primary-emphasis` — Primary node emphasis (advisory)

> Is there exactly one visually-emphasized "primary" node, distinguished by size OR weight OR position OR color (theme accent)?

**Pass** if the diagram has a clear hero node — usually the input/start of a flow, the root of a hierarchy, or the question being answered.
**Fail** if every node looks equally important (no hero) OR multiple nodes claim primary status (competing heroes).

Edge case: monochrome diagrams of fully symmetric content (e.g. a 4-node round-trip) may have no primary by design — agent must declare this in the sidecar `approach` field, in which case auto-pass.

### `clear-entry` — Clear starting point (advisory)

> Does the diagram have a clear starting point — top-left node for left-right flows, top-center node for top-down hierarchies, an explicitly labeled "start" / "input" / "user", or the primary node from `primary-emphasis` if it doubles as the entry?

**Pass** if a viewer could finger-trace where to begin reading.
**Fail** if entry is genuinely ambiguous.

Mind-map / radial diagrams pass automatically if the center node is the starting point.

### `legend-coverage` — Legend coverage: meaning (advisory, N/A in monochrome)

> Do the legend labels correctly describe what each color actually encodes? (Auto-pass if only ink + at most one accent is used.)

Legend *presence* when ≥2 categorical colors are used is enforced deterministically by the `legend-missing` code check; this item judges only whether the legend's stated meanings match the diagram.

### `style-atom-match` — Style atoms match (advisory)

> Does the diagram match the active theme's reference style atoms in `themes/<theme>/atoms/` — palette tokens, stroke weights, type scale, corner radii, edge label pill style, legend block style?

**Pass** if a side-by-side with the active theme's atoms shows the same visual vocabulary.
**Fail** if shapes have wrong corner radii, stroke weights deviate, type sizes are off-scale, or legend formatting differs from the reference.

Palette, typography, strokes, and radii are already hard-failed deterministically; this item judges the remaining gestalt. A theme's defining moves gate via its `rubricOverrides.add` items, not via this check.

### `visual-balance` — Visual balance (advisory)

> Is the largest empty quadrant ≤ 35% of canvas area AND the densest 25% region ≤ 60% of nodes?

Mentally split the canvas into a 2×2 grid. Estimate empty-area percentage of the largest empty quadrant. Estimate node density of the densest quartile.

**Pass** if both thresholds hold.
**Fail** report only — does NOT gate.

This item is advisory because some content shapes (deep trees, hub-and-spoke) are intrinsically asymmetric. Failing it is a signal, not a blocker.

---

## Candidate add-items (theme-injected)

These IDs are reserved for themes to inject via `rubricOverrides.add`. Do not use them as core items.

### `role-style-consistency` — All edges sharing a `role` use the same connector style

> For every relationship `role` that appears more than once in the sidecar, do all edges sharing that role render with identical (stroke color, dasharray, shape) on the SVG?

**Pass** if every multi-edge role has consistent connector styling.
**Fail** if any role mixes (e.g. one feedback edge dashed, another solid).

This item is enforced both by code (`check_role_style_consistency` in `tests/run.py`, hard-fail) and by reviewer cross-check. Editorial injects this item; technical does not (its `mixingPermitted` is false, so the question is moot).

### `eyebrow-mono-uppercase-applied` — Editorial eyebrow follows the defining move

> Editorial diagrams use a 12px mono uppercase eyebrow at the top of any container. Does the diagram apply this convention?

Vision-only check. Used by editorial-theme defects.

---

## Pass condition

The vision rubric **passes** when every gating item passes — `legibility` plus items injected by `rubricOverrides.add` (gating unless their definition says otherwise). Advisory items may pass or fail; failures are reported as findings.

If any gating item fails:
- The reviewer's `top_priorities[]` list (stable IDs in order) seeds the Phase 6 findings flow (`_shared/findings-dispositions.md`: Fix as proposed / Modify / Skip / Defer).
- Loop continues until pass OR loop budget exhausted (then the Phase 7 terminal handler).

---

## Wrapper rubric (Phase 8, infographic mode only)

When `--mode infographic` is active, after the wrapper composes the editorial-v1 layout, a separate **slim 4-item rubric** runs as a **single pass** (no refinement loop). It is INLINE regardless of `--rigor`.

| Stable ID | Item |
|---|---|
| `wrapper-typography-hierarchy` | Eyebrow, H1, lede, fig label, captions, and footer read in clear visual hierarchy with no two zones competing for the eye. |
| `wrapper-text-fit` | No lede or caption text overflows its zone; line breaks fall on word boundaries; no clipped or truncated-without-ellipsis text. |
| `wrapper-figure-proportion` | The diagram fills its zone without dominating the page or feeling lost. |
| `wrapper-edge-padding` | No element kisses the canvas edge or a zone boundary; margins are visually consistent. |

**Pass condition:** all 4 items pass.

**Failure handling:** ship-with-warning. Prepend `<!-- WRAPPER QUALITY WARNING: <ids> -->` to the composite SVG immediately after `<?xml`. **Wrapper rubric failures DO NOT GATE.** The Phase 4 code metrics and Phase 5 vision gate have already gated the diagram; this wrapper pass is supplementary insurance, not a second hard gate.

The reviewer prompt is materialized by `tests/run.py:build_wrapper_rubric_prompt()` and uses the JSON shape `{wrapper_items: {<id>: {verdict, evidence}}, wrapper_blocker_count}` — distinct from the diagram rubric's `items` / `blocker_count` keys so callers don't conflate them.

---

## Anti-flake guidance for the reviewer

- **Always cite concrete evidence.** "Looks unbalanced" is not acceptable; "top-right quadrant is empty (~40%) while bottom-left has 6 of 8 nodes" is.
- **Do not invent failures.** If you can't find concrete evidence, the item passes.
- **Do not score politeness.** Items don't have shades; they pass or they don't.
- **When two items would catch the same issue,** report fails on each independently. The deduplication happens later in the Findings Protocol.
