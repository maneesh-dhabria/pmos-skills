# Design-Crit Evaluation Rubric

## Contents

- [Per-screen checks](#per-screen-checks-apply-to-every-captured-screenshot)
- [Per-component checks](#per-component-checks)
- [Per-journey checks](#per-journey-checks)
- [How to use this rubric](#how-to-use-this-rubric)
- [Sources](#sources)

The reviewer subagent uses this rubric to critique a single screen, a single component, or a complete journey from screenshots (and, when available, the underlying HTML/DOM). Output is JSON:

```json
[
  {
    "scope": "screen|component|journey",
    "target": "<screen filename | component name | journey id>",
    "heuristic": "<id from the tables below>",
    "severity": "high|medium|low",
    "finding": "<one-sentence description of what's wrong>",
    "evidence": "<what in the screenshot/DOM proves it — element, region, contrast value, click count>",
    "suggested_fix": "<concrete, actionable change — reference a specific element or region>"
  }
]
```

**Severity definitions:**

- **high** — blocks task completion, fails WCAG AA, breaks a journey, hides a required state, or violates the requirements doc
- **medium** — usability friction, weak feedback, broken hierarchy, missing affordance, decision-anchored field violation
- **low** — cosmetic, polish-tier, stylistic

**Output rules:**

- Be specific. "Improve hierarchy" is not a finding. "H1 and H2 share weight 600 and font-size 28/24 — there is no scannable hierarchy on the dashboard header" is.
- `evidence` must reference the concrete observable (region of the screenshot, computed style, click count, contrast ratio). Do not invent measurements you didn't make.
- Skip checks the artifact correctly addresses — do not pad the list.
- An empty array is a valid output for a clean screen.

This rubric was synthesised from `/wireframes` and `/prototype` self-eval rubrics plus external research on Nielsen 10, WCAG 2.2 (Oct 2023), IxDF visual hierarchy, LogRocket cognitive principles, Heurio/Stark/Design Lint Figma plugins, and Adobe/Contentsquare friction-mapping practice. Sources cited in the table footers.

---

## Per-screen checks (apply to every captured screenshot)

### N — Nielsen's 10 usability heuristics

| ID  | Heuristic                       | What to verify in the screenshot/DOM                                                                              |
| --- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| N1  | Visibility of system status     | User knows where they are and what's happening: active nav, breadcrumbs, loading/progress indicators present.     |
| N2  | Match with the real world       | Labels use the user's vocabulary; no implementation jargon (`user_id`, `payload`, `entity`).                       |
| N3  | User control & freedom          | Reversible actions; cancel/back/undo present on destructive or multi-step flows; modals have a close.             |
| N4  | Consistency & standards         | Same intent looks the same everywhere on the screen; conventional metaphors honoured (trash = delete, ✓ = save). |
| N5  | Error prevention                | Risky actions have confirmations, validation, or sensible defaults; destructive CTA isn't the default focus.       |
| N6  | Recognition over recall         | Required context visible — no need to remember values from a previous step. Filter chips persist.                  |
| N7  | Flexibility & efficiency        | Power users have shortcuts (keyboard hints, bulk actions, search) without burdening newcomers.                     |
| N8  | Aesthetic & minimalist          | Every element earns its place; no decorative junk, ornamentation, or unrequested marketing copy.                   |
| N9  | Error recovery                  | Error messages explain WHAT failed, WHY, and HOW to fix; plain language, no error codes alone.                     |
| N10 | Help & documentation            | Inline hints/tooltips for non-obvious controls; help is reachable from where it's needed.                          |

### V — Visual design & hierarchy

| ID  | Check                          | What to verify                                                                                                       |
| --- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| V1  | One dominant focal point       | Each screen has exactly one primary CTA / focal region; secondary actions are visually subordinate.                  |
| V2  | Type ramp                      | H1 > H2 > body > caption distinguishable by size + weight; ramp ratio ≥ 1.2 between adjacent levels.                  |
| V3  | Spacing rhythm                 | Margins and paddings sit on a consistent grid (4 / 8 / 12 / 16 / 24 / 32); no one-off magic numbers.                  |
| V4  | Color system coherence         | ≤ 2 accent hues; semantic colors (success/warn/error/info) used consistently and only for their semantic role.       |
| V5  | Component consistency          | Same intent class (primary button, input, card) uses one style; no near-duplicate variants on a single screen.       |
| V6  | Information density            | ≤ 7±2 primary chunks per screen (Miller); dense data tables OK if intentional and scannable.                          |
| V7  | F/Z scan path                  | Primary CTA sits at a natural scan terminus (top-right hero, bottom-right of content block, end of a list).           |

### G — Gestalt & layout

| ID  | Principle  | What to verify                                                                                  |
| --- | ---------- | ----------------------------------------------------------------------------------------------- |
| G1  | Proximity  | Related elements grouped via spacing, not by drawn boxes. Inter-section gap > intra-section.     |
| G2  | Similarity | Same-purpose elements look the same; different-purpose elements look different.                  |
| G3  | Alignment  | Visible alignment grid; no rogue elements floating off the column.                                |
| G4  | Whitespace | Sections breathe; no edge-to-edge density unless intentional.                                     |

### A — Accessibility (WCAG 2.2 AA, screenshot-checkable subset)

| ID  | Check                  | What to verify                                                                                                                              |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Contrast               | Body text ≥ 4.5:1; large text & UI components ≥ 3:1. Use Stark/axe values when available; otherwise sample dominant text/bg.                  |
| A2  | Target size 2.5.8      | Interactive controls ≥ 24×24 CSS px (≥ 44 on mobile/native).                                                                                  |
| A3  | Focus appearance 2.4.11 | Visible focus ring ≥ 2 px, ≥ 3:1 contrast against adjacent colours; tab-through screenshot shows it.                                          |
| A4  | Semantic structure     | Headings hierarchical (no h1→h3 skip); landmarks present; `<button>` for actions, `<a>` for navigation, not `<div onClick>`.                |
| A5  | Labels                 | Every input has a visible label or aria-label; icon-only buttons have aria-label; placeholders are not the only label.                       |
| A6  | Don't rely on colour   | State is conveyed by icon/text + colour, not colour alone (e.g., red error has an error icon + text, not just red border).                   |
| A7  | Redundant entry 3.3.7  | Multi-step forms don't ask the same info twice unless essential.                                                                              |

### S — State coverage

| ID  | Check                | What to verify                                                                                  |
| --- | -------------------- | ----------------------------------------------------------------------------------------------- |
| S1  | Empty state helpful  | Empty views have an explanatory message and a CTA, not "No data".                                |
| S2  | Error state recoverable | Error states show what went wrong AND how to retry / recover.                                |
| S3  | Loading state bounded | Loading uses skeleton or progress affordance, not a bare spinner with no context.              |
| S4  | Success state acknowledged | Successful actions confirm via toast / inline message — no silent success.                |

### F — Field-earns-its-place

| ID  | Check                         | What to verify                                                                                                                                                  |
| --- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | Decision-anchored fields      | For every visible column / badge / metric / progress indicator, name the user decision it informs in one sentence. If you cannot, the field is decoration.       |
| F2  | No misleading precomputation  | Avoid bars/scores/rings that imply expensive precomputation when the underlying data is generate-on-demand or trivially recomputable.                            |
| F3  | No schema-driven decoration   | `created_at`, `last_modified`, internal IDs, audit metadata don't appear on list/card surfaces unless tied to a user-facing decision; relegate to detail/admin. |

---

## Per-component checks

| ID  | Check                  | What to verify                                                                                                          |
| --- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| C1  | Token-bound            | Uses design-token color/spacing/type, not raw hex/px values (when DOM is available).                                    |
| C2  | States complete        | Default, hover, active, focus-visible, disabled, loading, and error states all defined.                                  |
| C3  | Affordance             | Tappable things look tappable: cursor change, hover style, elevation, or color shift.                                   |
| C4  | Label + control pair   | Inputs have a visible `<label>` (or aria-label); placeholders never substitute for labels.                              |
| C5  | Icon + text pair       | Icons not used alone for primary actions; either accompanied by text or carry an aria-label and tooltip.                |
| C6  | Actionable error copy  | Inline error messages contain a verb and tell the user what to do next, not just "Invalid".                              |
| C7  | Reuse over reinvention | No near-duplicate component variants on the same screen / journey (one primary-button style, one card style).           |

---

## Per-journey checks

| ID  | Check                          | What to verify                                                                                                                                          |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| J1  | Click-economy                  | Primary task fits within a benchmark click budget: signup ≤ 4, daily flow ≤ 6, recovery ≤ 8 (see friction thresholds below).                              |
| J2  | One primary CTA per decision   | Each branching screen has exactly one visually dominant primary action.                                                                                   |
| J3  | Progressive disclosure         | Optional/advanced fields hidden until needed; "Show advanced" pattern over walls-of-fields.                                                                |
| J4  | No dead ends                   | Every screen has a path forward AND back; error states offer recovery; terminal states are explicit ("All done — back to dashboard").                       |
| J5  | Status across steps            | Multi-step flows show "Step N of M" or named-step indicator.                                                                                              |
| J6  | Context preserved on back      | Back navigation does not blow away form data, filter selections, or scroll position.                                                                       |
| J7  | Friction map                   | Each step tagged with interaction (clicks/keystrokes), cognitive (decisions), and emotional (mode switches, interruptions) friction; high-friction flagged. |
| J8  | Drop-off candidates            | Steps with > 1 hard decision OR > 5 required fields OR a modal interruption are flagged as drop-off risks.                                                  |

### J1 — Friction thresholds (mirrors `/prototype/friction-thresholds.md`)

| Journey type              | High threshold                            | Medium threshold                        |
| ------------------------- | ----------------------------------------- | --------------------------------------- |
| First-value (signup→aha)  | > 12 clicks; > 3 form steps; > 5 decisions on any screen | > 60 keystrokes (excl. email/pw); > 2 modal interrupts |
| Daily-flow (return user)  | > 12 clicks                               | > 6 clicks; > 1 form step; any modal interrupt; > 3 decisions on any screen |
| Recovery (error→resolved) | > 8 clicks; any unrecoverable dead end; error without recovery | > 2 screen transitions to recover                       |

Estimation rule: 1 click ≈ 1 s, 1 decision ≈ 2 s, 1 keystroke ≈ 0.3 s.

---

## How to use this rubric

1. **Per screen:** for every screenshot, walk N → V → G → A → S → F. Record findings only where the screen clearly fails. Do not invent issues.
2. **Per component:** identify recurring components (button, card, input). Score once per component, not once per occurrence.
3. **Per journey:** walk each journey end-to-end across the captured screens; count clicks/keystrokes/decisions; populate the J1 friction table.
4. **Severity calibration:**
   - **high** — A1–A4 violations; missing required state (S1–S3); destructive action without confirm (N5); journey dead end (J4); click budget exceeded (J1)
   - **medium** — hierarchy/scan issues (V1, V2, V7), Hick's-Law violations (J2, V6), inconsistent labelling (N4), F1 decoration, friction-table flags
   - **low** — spacing nits (V3), copy polish, minor visual tweaks
5. **Return JSON.** Do not include commentary outside the JSON array.

---

## Sources

- Nielsen Norman Group — *Ten Usability Heuristics* (2020 refresh).
- W3C — WCAG 2.2 (Oct 2023): SC 1.4.3 Contrast, 2.4.11 Focus Appearance, 2.5.8 Target Size (Min), 3.3.7 Redundant Entry.
- IxDF — Visual Hierarchy (2026); Toptal — 12 Principles of Design; Figma Resource Library — Graphic Design Principles.
- LogRocket — *14 Cognitive Principles for UX* (Gestalt, Fitts, Hick, Miller).
- Heurio (Nielsen + Rams), Stark (a11y), Design Lint, FigmaLint AI — heuristic-eval Figma plugin practice.
- Survicate, Contentsquare, Adobe CJA, 383 Group — friction-mapping practice 2024-2025.
- pmos-toolkit `/wireframes` and `/prototype` self-eval rubrics — N, V, G, A, S, F categories adapted from there.
