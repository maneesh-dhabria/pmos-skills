# Wireframe Evaluation Rubric

## Contents

- [Heuristics (the rubric)](#heuristics-the-rubric)
- [How to use this rubric](#how-to-use-this-rubric)

The reviewer subagent uses this rubric to score a single HTML wireframe file. Output is JSON:

```json
[
  {
    "heuristic": "<id from the table below>",
    "severity": "high|medium|low",
    "finding": "<one-sentence description of what's wrong>",
    "suggested_fix": "<concrete, actionable change — e.g., 'Add aria-label=\"Close\" to the X button at line 42'>"
  }
]
```

**Severity definitions:**
- **high** — blocks task completion, breaks accessibility, hides a required state, or violates the req doc
- **medium** — usability friction, unclear hierarchy, missing affordance, weak feedback
- **low** — cosmetic, polish-tier, or stylistic

**Output rules:**
- Be specific. "Improve hierarchy" is not a finding; "H1 and H2 use the same font weight, so the page lacks scannable hierarchy" is.
- Suggested fix must reference a concrete element or section.
- Skip findings the wireframe correctly addresses — do not pad the list.
- An empty array is a valid output.

---

## Heuristics (the rubric)

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
| F1 | Fitts's Law | Primary actions are large and reachable; destructive actions are NOT adjacent to primary actions; touch targets ≥ 44×44 on mobile/native |
| F2 | Hick's Law | No screen presents more than ~7 primary choices; long lists are filtered/grouped |

### A — Accessibility (WCAG 2.1 AA baseline)

| ID | Check | What to verify |
|----|-------|----------------|
| A1 | Semantic HTML | Headings hierarchical (no h1→h3 skip); buttons are `<button>`, links are `<a>`; landmarks (nav, main, footer) present |
| A2 | Color contrast | Text contrast ≥ 4.5:1; UI components ≥ 3:1; never rely on color alone (icons + labels) |
| A3 | Focus visibility | Every interactive element has a visible `:focus-visible` style; tab order is logical |
| A4 | Labels | Every form input has a `<label>` or aria-label; icon-only buttons have aria-label |
| A5 | Touch targets | ≥ 44×44 px on mobile/native variants; spacing prevents mis-taps |

### G — Gestalt & Hierarchy

| ID | Principle | What to check |
|----|-----------|---------------|
| G1 | Proximity | Related elements grouped via spacing, not boxes |
| G2 | Similarity | Same-purpose elements look the same; different-purpose elements look different |
| G3 | Hierarchy | Type scale clearly distinguishes H1 / H2 / body / caption; primary action is visually dominant |
| G4 | Whitespace | Sections breathe; no edge-to-edge density unless intentional (e.g., data table) |

### S — State Coverage (skill-specific)

| ID | Check | What to verify |
|----|-------|----------------|
| S1 | All required states present | Every state declared in the inventory is reachable via the state-switcher tab |
| S2 | Empty state is helpful | Empty state has a CTA or explanation, not just "No data" |
| S3 | Error state is recoverable | Error state shows what went wrong AND how to retry |
| S4 | Loading state is bounded | Loading state has a skeleton or progress affordance, not a bare spinner with no context |

### D — Device-Appropriate Patterns

| ID | Device | Check |
|----|--------|-------|
| D1 | mobile-web / android / ios | Touch targets ≥ 44; thumb-zone respected (primary actions in lower half on mobile); no hover-only affordances |
| D2 | android-app | Material patterns: bottom nav with 3-5 items, FAB for primary action when appropriate, proper system bar |
| D3 | ios-app | HIG patterns: tab bar at bottom, large titles on scroll, sheets for modals, proper safe-area insets |
| D4 | desktop-web / desktop-app | Keyboard navigation hinted; right-click and hover behaviors documented in annotations layer |

### C — Content & Annotation (skill-specific)

| ID | Check | What to verify |
|----|-------|----------------|
| C1 | Realistic copy | No "Lorem ipsum"; placeholder copy reflects the feature's domain |
| C2 | Annotations layer | Non-obvious interactions explained in toggleable annotations; no critical interaction is undocumented |
| C3 | Footer metadata | Component name, device, file index, generation date present in the footer |

---

## How to use this rubric

1. Open the wireframe file. Identify the device variant from filename and footer.
2. For each state in the state-switcher, walk every heuristic in the table.
3. Record findings only where the wireframe clearly fails. Do not invent issues.
4. Calibrate severity:
   - **high**: A1, A4 violations; missing required state (S1); destructive action without confirm (N5); error state with no recovery (S3); device-pattern violations on native (D2/D3)
   - **medium**: hierarchy issues (G3), Hick's Law violations (F2), inconsistent labeling (N4), unclear loading state (S4)
   - **low**: spacing nits (G4), copy polish (C1), minor visual tweaks
5. Return the JSON array. Do not include commentary outside the JSON.
