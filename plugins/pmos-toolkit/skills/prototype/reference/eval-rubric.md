# Prototype Evaluation Rubric

The reviewer subagent uses this rubric to score a single per-device prototype HTML file. Output is JSON:

```json
[
  {
    "heuristic": "<id from the table below>",
    "severity": "high|medium|low",
    "finding": "<one-sentence description of what's wrong>",
    "suggested_fix": "<concrete, actionable change — reference a specific element, screen, or line>"
  }
]
```

**Severity definitions:**
- **high** — blocks task completion, breaks a user journey, hides a required state, runtime error on load or navigation, or violates the req doc
- **medium** — usability friction, weak feedback, missing affordance, mock-data realism gap that breaks the illusion
- **low** — cosmetic, polish-tier, stylistic

**Output rules:**
- Be specific. "Improve hierarchy" is not a finding; "Dashboard primary CTA uses the same weight as secondary actions, breaking scannability" is.
- Suggested fix must reference a concrete element/screen/line.
- Skip findings the prototype correctly addresses — do not pad the list.
- An empty array is a valid output.

---

## Heuristics

### I — Interactivity

| ID | Heuristic | What to check |
|----|-----------|---------------|
| I1 | Navigation works end-to-end | Every wireframe screen reachable via the router; no dead-end routes; back/cancel works from every modal/detail. |
| I2 | Forms validate + submit | Inputs have validation rules; submit triggers simulated latency then success/error; validation errors render inline. |
| I3 | CRUD persists in-session | Create/edit/delete operations update the in-memory store and reflect immediately in list/detail views. Persisted within session, lost on reload (correct behavior). |
| I4 | Loading/error/empty states | Every async call shows a loading state; deterministic-failure routes show error states with recovery affordances; empty entities show empty-state UI not blank screens. |
| I5 | No console errors | First paint and every navigation transition produces zero `console.error` and zero React warning logs. Babel compile errors are also high. |

### J — Journey Coverage

| ID | Heuristic | What to check |
|----|-----------|---------------|
| J1 | Every wireframe screen reachable | Static count of screen components matches wireframe inventory count for this device. |
| J2 | Every required journey completable | Walk each journey from req doc click-by-click; every step terminates in a meaningful state. |
| J3 | No dead ends | Every screen has at least one path to another screen OR an explicit terminal-state marker (e.g., "All done — back to dashboard"). |

### M — Mock Data

| ID | Heuristic | What to check |
|----|-----------|---------------|
| M1 | Domain-real | Names, copy, prices, dates feel like the actual product domain. No generic "User 1 / Item A". |
| M2 | Sufficient volume | List/table/feed views show ≥20 records when the wireframe implies scrolling/pagination. Sparse views (detail pages) can have fewer. |
| M3 | Referential integrity | Foreign keys resolve (orders.userId points to a real user record); relationships display consistently across screens. |
| M4 | No Lorem ipsum | Zero occurrences of `lorem`, `ipsum`, `placeholder text`, `sample data`. |

### A — Accessibility

A1/A3/A4 are **advisory**: the reviewer may note them, but they never drive a refinement loop — a prototype is throwaway demo code, and stakeholders walking it won't exercise screen readers or measure contrast. A2/A5 remain loop-driving because they overlap the x-interaction contract (focus visibility, keyboard-reachable CTAs).

| ID | Heuristic | What to check |
|----|-----------|---------------|
| A1 (advisory) | Semantic HTML | Headings hierarchical, `<button>` for actions (not `<div onClick>`), `<nav>` for navigation, `<form>` for forms. |
| A2 | Focus-visible | Keyboard focus produces a visible outline on interactive elements. |
| A3 (advisory) | Aria labels on icon-only buttons | `<button aria-label="Close">×</button>` pattern applied. |
| A4 (advisory) | Contrast ≥ 4.5:1 | Body text and primary actions hit the threshold against their background. |
| A5 | Keyboard nav for primary CTAs | Tab order reaches primary actions; Enter activates them. |

### V — Visual Consistency

| ID | Heuristic | What to check |
|----|-----------|---------------|
| V1 | High-fi palette applied | Real brand colors from `design-overlay.css` (generated from DESIGN.md `colors`); no neutral wireframe-only grays unless the brand is genuinely neutral. |
| V2 | Typography stack matches DESIGN.md | Font family from DESIGN.md `typography.body.fontFamily` applied via `--wf-font-sans`; weights and sizes form a clear ramp consistent with `typography.*` entries. |
| V3 | Components.js atoms used consistently | Buttons all use `Button` atom; inputs all use `Input` atom; no one-off inline styling that diverges. |
| V4 | No wireframe annotations | Zero `.annotation`, `.state-tab`, `.wireframe-frame` artifacts; this is the prototype, not the wireframe. |

### F — Field-Earns-Its-Place

Every visible data field on a screen must anchor a decision the user actually makes on that screen. Fields that exist only because they're in the schema are decoration and degrade scannability.

| ID | Heuristic | What to check |
|----|-----------|---------------|
| F1 | Decision-anchored fields | For every column/badge/metric/progress-indicator on each screen: name the user decision it informs ("user picks which item to open", "user judges freshness before resuming", "user confirms safe to delete"). If you cannot name the decision in one sentence, the field is decoration. Severity: medium. Suggested fix: remove or relocate to a detail/expanded view. |
| F2 | Pre-computed metrics that have no cost-of-display rationale | Flag indicators that imply expensive precomputation (coverage bars, freshness scores, completeness rings) when the underlying data is generate-on-demand or trivially recomputable in the user's mental model. These mislead about system cost. Severity: medium. Suggested fix: replace with on-demand action ("Generate now" button) or remove. |
| F3 | Schema-driven decoration | Fields displayed solely because they exist in the entity (created_at, last_modified, internal IDs, audit metadata) without a user-facing decision tied to them. Severity: low–medium. Suggested fix: hide on list/card surfaces; expose only in admin/debug views. |

This category exists because a retro flagged a library-card audio-coverage bar that misrepresented the system (audio was generate-on-the-fly, not pre-computed) and added no decision value. The reviewer should ask for each visible field: *what does the user do with this number?* If the answer is "nothing", flag it.

### X — x-interaction contract

Score the file against the key-by-key mapping in `components-template.md` §"x-interaction contract" (the single home for it) using the DESIGN.md `x-interaction` / `x-content` blocks the dispatcher provides. Violations are severity ≥ medium and are hard-fails (loop-driving). Tag findings `x-interaction:<key>`.

### R — Runtime

| ID | Heuristic | What to check |
|----|-----------|---------------|
| R1 | file:// portability | Inline `<script type="application/json" id="mock-*">` blocks present for every entity; loader uses fetch-with-fallback. Opening the file directly in Chrome works without a server. |
| R2 | No Babel compile errors | `<script type="text/babel">` blocks parse cleanly; no JSX syntax errors visible in console. |
| R3 | Latency within 200–800ms | Simulated API calls fall within range; not instant (breaks loading-state demo) and not >1s (frustrating). |
