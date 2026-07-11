# Wireframe Evaluation Rubric

## Contents

- [Heuristics (the rubric)](#heuristics-the-rubric)
- [How to use this rubric](#how-to-use-this-rubric)

This rubric is **SVG-native and judgment-only.** The reviewer subagent uses it to score a single
monochrome-SVG wireframe. Everything deterministic — the palette allowlist, the ≥44px tap-target geometry,
`<title>`/`<desc>` presence, off-grid coordinates, `viewBox` match, the annotation-red quarantine — is
enforced by `scripts/lint-wireframe-svg.mjs`, **not here** (§H: never ask a reviewer to measure, count, or
total what a script can check deterministically). Nothing in the tables below asks the reviewer to measure a
pixel or tally a number. Output is JSON:

```json
[
  {
    "heuristic": "<id from the table below>",
    "severity": "high|medium|low",
    "finding": "<one-sentence description of what's wrong>",
    "suggested_fix": "<concrete, actionable change — e.g., 'Rename the generic data-region=\"g2\" to data-region=\"account-menu\" so the region is self-describing (C4)'>"
  }
]
```

**Severity definitions:**
- **high** — blocks task completion, hides a required state, leaves an error unrecoverable, or violates the req doc
- **medium** — usability friction, unclear hierarchy, missing affordance, weak feedback
- **low** — cosmetic, polish-tier, or stylistic

**Output rules:**
- Be specific. "Improve hierarchy" is not a finding; "the H1 and H2 use the same type size, so the screen lacks scannable hierarchy" is.
- Suggested fix must reference a concrete element, `data-region`, or annotation.
- Skip findings the wireframe correctly addresses — do not pad the list.
- An empty array is a valid output.

---

## Heuristics (the rubric)

**Survivor id set** — retained from the pre-SVG rubric, this is the **positive allowlist** the epic's
dangling-cite gate checks against (not only a negative denylist): `N1`–`N10`, `F1`–`F2`, `G1`–`G4`, `S1`–`S4`,
`C1`–`C3`.

**SVG-native additions** (this rewrite): `G5` (negative space), `C4` (region naming), `C5` (annotation
text-alternative). The complete id namespace is therefore `N1`–`N10`, `F1`–`F2`, `G1`–`G5`, `S1`–`S4`,
`C1`–`C5` — every id below appears in exactly one row, and every row's id appears in this list, so prose and
inventory cannot drift.

**Retired.** The old Accessibility table (semantic HTML, contrast, focus visibility, form labels, touch
targets) and the Device-Appropriate-Patterns table (Material / HIG / desktop conventions) are **gone**. An
SVG wireframe has no `<label>`, no `:focus-visible`, and no DOM touch target to review — accessibility review
belongs at `/prototype`, which emits real HTML and owns it. Contrast is trivially satisfied by the closed
monochrome palette and is enforced by the lint's colour allowlist, not by a reviewer.

### N — Nielsen's 10 Usability Heuristics

| ID | Heuristic | What to check in the wireframe |
|----|-----------|-------------------------------|
| N1 | Visibility of system status | Loading, success, error states present and visually distinct? Is the user told what's happening? |
| N2 | Match with real world | Language, ordering, and metaphors match user mental model (not implementation jargon)? |
| N3 | User control & freedom | Undo/cancel/back affordances visible where destructive or multi-step actions exist? |
| N4 | Consistency & standards | Same action labeled the same way across screens? Conventions (e.g., trash = delete) followed? |
| N5 | Error prevention | Confirmations on destructive actions? Inline validation before submit? Sensible defaults? |
| N6 | Recognition over recall | Required info visible when needed (don't make users remember from previous step)? |
| N7 | Flexibility & efficiency | Power users have shortcuts (keyboard hints, bulk actions) without burdening newcomers? |
| N8 | Aesthetic & minimalist | No decorative junk; every element earns its place? |
| N9 | Error recovery | Error states explain WHAT failed, WHY, and HOW to fix? Plain language, no codes? |
| N10 | Help & documentation | Inline hints/tooltips for non-obvious controls? Help reachable when needed? |

### F — Fitts & Hick (interaction cost)

| ID | Rule | What to check |
|----|------|---------------|
| F1 | Fitts's Law | Primary actions are large and reachable; destructive actions are NOT adjacent to primary actions. (The numeric ≥44px tap-target minimum is deterministic and owned by the lint, not this rubric — judge reachability, not pixels.) |
| F2 | Hick's Law | No screen presents more than ~7 primary choices; long lists are filtered/grouped |

### G — Gestalt & Hierarchy

| ID | Principle | What to check |
|----|-----------|---------------|
| G1 | Proximity | Related elements grouped via spacing, not boxes |
| G2 | Similarity | Same-purpose elements look the same; different-purpose elements look different |
| G3 | Hierarchy | Type scale clearly distinguishes H1 / H2 / body / caption; primary action is visually dominant |
| G4 | Whitespace | Sections breathe; no edge-to-edge density unless intentional (e.g., data table) |
| G5 | Negative space | The composition respects the negative-space rule in `reference/grid-system.md`: at least one 8px unit (prefer 16) of clear space around every component, and grouping done with spacing rather than load-bearing borders. Judge whether the screen breathes — do not measure the gap (the 8px grid itself is the lint's job). |

### S — State Coverage (skill-specific)

| ID | Check | What to verify |
|----|-------|----------------|
| S1 | All required states present | Every state declared in the inventory is reachable in the wireframe set |
| S2 | Empty state is helpful | Empty state has a CTA or explanation, not just "No data" |
| S3 | Error state is recoverable | Error state shows what went wrong AND how to retry |
| S4 | Loading state is bounded | Loading state has a skeleton or progress affordance, not a bare spinner with no context |

### C — Content & Annotation (skill-specific)

| ID | Check | What to verify |
|----|-------|----------------|
| C1 | Realistic copy | No "Lorem ipsum"; placeholder copy reflects the feature's domain |
| C2 | Annotations layer | Non-obvious interactions explained in the annotations; no critical interaction is undocumented |
| C3 | Footer metadata | Component name, device, file index, generation date present in the footer |
| C4 | Region naming | Each `data-region` group is named meaningfully — a reader (or an anchor consumer) can tell what the region IS from its name (`data-region="primary-nav"`, not `data-region="g1"`). This is the SVG-native replacement for landmark semantics. Judge the names, do not count the regions. |
| C5 | Annotation text-alternative | The numbered annotation list is an adequate text alternative for the screen: someone reading ONLY the annotations understands the screen's structure and its non-obvious interactions. An annotation list that leaves a critical interaction undocumented is a high-severity finding. |

---

## How to use this rubric

1. Open the wireframe SVG. Identify the device variant from the filename and footer.
2. For each screen (and each state variant present), walk every heuristic in the tables above.
3. Record findings only where the wireframe clearly fails. Do not invent issues. **Do not measure or count** —
   the lint (`scripts/lint-wireframe-svg.mjs`) owns all arithmetic; this rubric owns judgment only (§H, §K —
   one deterministic home, cited once, never re-implemented here).
4. Calibrate severity. The deterministic hard-fails — off-grid coordinates, out-of-allowlist colour, the
   annotation red bleeding outside the annotation layer, a missing `<title>`/`<desc>`, a sub-44px mobile tap
   target, a `viewBox` mismatch — are the **lint's** job and never appear as rubric findings. This rubric's
   severity bands are judgment-only:
   - **high**: a missing required state (`S1`); a destructive action with no confirm (`N5`); an error state
     with no recovery path (`S3`); an annotation list that is an inadequate text alternative and leaves a
     critical interaction undocumented (`C5`).
   - **medium**: hierarchy issues (`G3`), Hick's-Law overload (`F2`), inconsistent labeling (`N4`), an unclear
     loading state (`S4`), a meaninglessly-named region (`C4`).
   - **low**: negative-space nits (`G4` / `G5`), copy polish (`C1`), minor structural tweaks.
5. Return the JSON array. Do not include commentary outside the JSON.
