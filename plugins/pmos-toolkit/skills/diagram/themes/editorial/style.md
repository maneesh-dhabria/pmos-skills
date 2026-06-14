# Editorial / Cream — Theme Spec

This file mirrors `themes/editorial/theme.yaml` for human reading. The YAML is the source of truth; this doc explains the why and shows the moves.

---

## 5.1 Surface

- Background: `#F4EFE6` (cream).
- All editorial diagrams have a **dashed outer container** inset 16px from the canvas edge:
  - Stroke `#9CA3AF` 1px, dasharray `4 4`.
  - This is a theme-level aesthetic — every diagram drawn under editorial gets it. It doubles as the safe text area.

## 5.2 Palette (token table)

> **PALETTE HARD CONSTRAINT — only these hex values are permitted** (no off-palette greens/ambers, ever): `#F4EFE6`, `#0F172A`, `#475569`, `#1E3A8A`, `#B8351A`, `#B91C1C`, `#F5C9B8`, `#DCE0F0` (token source of truth: `themes/editorial/theme.yaml`). Choose every fill/stroke from this set **before** picking colors — anything else hard-fails the deterministic palette check.

| Token | Hex | Purpose |
|---|---|---|
| `surface` | `#F4EFE6` | Page + diagram background |
| `ink` | `#0F172A` | Text, primary node strokes, contribution edges |
| `ink-muted` | `#475569` | Eyebrows, dependency / reference edges |
| `accent-primary` | `#1E3A8A` | **Pinned: feedback/memory/loop**. Used for nothing else, ever. |
| `accent-emphasis` | `#B8351A` | **Pinned: emphasis/inject path**. Darkened from the spec's `#D9421C` to pass WCAG AA on cream (5.15:1 vs. 3.86:1). |
| `warn` | `#B91C1C` | Errors / stop states only |
| `chip-warm` | `#F5C9B8` | Pastel category chip (peach) |
| `chip-cool` | `#DCE0F0` | Pastel category chip (lilac) |
| `chip-ink` | `#0F172A` | Solid black "computation block" fill |

**WCAG AA on cream (`#F4EFE6` background) — verified at runtime by the contrast metric:**

| Foreground | Ratio | Pass |
|---|---|---|
| `ink` | 15.59:1 | ✓ |
| `ink-muted` | 6.62:1 | ✓ |
| `accent-primary` | 9.04:1 | ✓ |
| `accent-emphasis` | 5.15:1 | ✓ |
| `warn` | 5.65:1 | ✓ |

## 5.3 Typography

- **Display** — `Inter Tight`, 700 weight, sizes 28 / 36 / 44. Used for headlines in infographic mode (Phase 8).
- **Body** — `Inter`, 400 / 600 weight, sizes 12 / 14 / 16 / 20. Same scale as the technical theme.
- **Eyebrow** — monospace (SFMono / Menlo / Consolas), 400 weight, **size 12**, **uppercase**, letter-spacing 0.08em. Replaces decorative section titles. Every major group inside the dashed container gets one (e.g. `EXTERNAL CONTEXT (objects we populate)`, `HARNESS · system of blocks`).

## 5.4 Connectors (`mixingPermitted: true` — keyed by role)

Editorial is the first theme that permits mixed connector aesthetics. The mixing is **role-keyed**, not free: each relationship has a `role` and the theme dispatches via `connectors.byRole[role]`.

| Role | Shape | Stroke | Dashed | Semantic |
|---|---|---|---|---|
| `contribution` | curved | ink | no | Default narrative arrow ("X contributes to Y") |
| `emphasis` | orthogonal | accent-emphasis | no | Pinned red-orange straight injection / focus path |
| `feedback` | curved | accent-primary | yes | Pinned blue dashed loop / memory / return |
| `dependency` | orthogonal | ink-muted | no | Wiring without semantics |
| `reference` | orthogonal | ink-muted | yes | "See also" / soft pointer |
| `default` | orthogonal | ink-muted | no | Fallback when role is omitted (only valid in technical-style placements) |

**All edges sharing one role MUST render with the same `(shape, stroke, dasharray)` tuple.** This is enforced by the `role-style-consistency` rubric add-item. Mixing within a role is forbidden.

## 5.5 Pinned-role accents (cross-document consistency)

Two accents have permanent semantics across every editorial diagram:

- **`accent-primary` (#1E3A8A)** — feedback / memory / loop. Never inject or "highlight."
- **`accent-emphasis` (#B8351A)** — primary / inject / emphasis. Never feedback.

Authors do NOT reassign per-diagram. A reader who flips through a stack of editorial diagrams should see "blue = loop" and "red = inject" hold every time.

## 5.6 Solid-black computation blocks

Terminal / model / "do the work" nodes use:
- Fill: `chip-ink` (#0F172A).
- Text: `surface` (cream) — single-color reverse for max contrast.
- Radius: 4 (slightly tighter than the 6 used for primary nodes).

These read as endpoints, not waypoints. Use one or two per diagram, not five.

## 5.7 Pastel category chips

Stacked-list rows inside containers use the chip palette instead of plain bordered rectangles:
- `chip-warm` (#F5C9B8 peach) and `chip-cool` (#DCE0F0 lilac) alternate by row.
- Text on chips is always `ink`.
- Chip corner radius 4, padding 8×4.

This is the "pastel-chip-stack" atom.

## 5.8 Inline label-on-top + descriptor-below

Editorial node labels frequently use a two-line pattern:
- Line 1: bold name (`System prompt`).
- Line 2: lowercase italic descriptor (`base + user-appended`).

This replaces single-line all-caps labels.

## 5.9 Atoms

Visual primitives live in `themes/editorial/atoms/`. They are **not templates** — copying their layout is a `style-atom-match` failure. They exist so the reviewer can verify each move is recognizably present.

- `eyebrow-mono.svg` — single-line mono uppercase eyebrow.
- `dashed-container.svg` — dashed outer rect with eyebrow.
- `pastel-chip-stack.svg` — alternating peach / lilac chip rows.
- `computation-block.svg` — solid-black rect with cream text.
- `return-loop-arrow.svg` — dashed blue curved arrow with arrowhead (the feedback edge).

## 5.10 Anti-patterns (DO NOT)

- Reassign `accent-primary` to anything other than feedback edges.
- Reassign `accent-emphasis` to anything other than emphasis edges.
- Use the warn token (`#B91C1C`) decoratively — keep it for errors / stop states.
- Mix curved + orthogonal within a single role (e.g. some `feedback` curves, others orthogonal).
- Drop the dashed outer container — it's a theme defining-move, not optional chrome.
- Use Sentence Case eyebrows. Eyebrows are mono uppercase; lowercase falls under the `eyebrow-mono-uppercase-applied` rubric add-item and fails.
- Author atom-derived templates. Re-derive layout each time; the atoms are vocabulary, not structure.
