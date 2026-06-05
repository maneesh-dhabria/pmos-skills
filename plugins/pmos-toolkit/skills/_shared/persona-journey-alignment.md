# Persona & Journey Alignment — Shared Contract

Skill-agnostic ceremony for confirming **who** an analysis runs against (personas) and **which flows** it covers (journeys), before any per-journey work. Used by the user-experience analysis skills (`/creativity`, `/msf-req`, `/msf-wf`, and the requirements-review modes). This file is only the align-on-personas-and-journeys step; the analysis that follows (creativity techniques, MSF consideration questions in `msf-heuristics.md`, etc.) is the calling skill's own.

The caller supplies one binding:

- **`source`** — what names the personas/journeys. Examples: a requirements doc (`/msf-req`, `/creativity`); a wireframes folder + sibling `01_requirements.{html,md}` and wireframe copy (`/msf-wf`).

---

## Step 1 — Personas

Propose user personas (**minimum 2, maximum 5**) and typical usage scenarios (**maximum 2 per persona** — usage contexts, not error cases).

- **Extract before inventing.** First pull any personas explicitly named in `source` ("Users", "Personas", "Stakeholders" sections; names in journeys; "for [user-type]" labels in wireframe copy). Propose those.
- **Infer only if absent.** If `source` names none, propose 2–5 inferred personas (≤2 scenarios each) from the goals + flow + workstream context.
- **Priority guidance.** Focus depth on **new users** and **power users**; go lighter on others.
- **Confirmation is mandatory** — never skipped, in standalone or parent-invoked modes (even when the calling skill was passed `--apply-edits`).

Present via `AskUserQuestion`. Format:

> **Proposed personas:**
> 1. **[Name]** — [role, context, goal]. Scenarios: (a) [context 1], (b) [context 2]
> 2. **[Name]** — [role, context, goal]. Scenarios: (a) [context 1], (b) [context 2]
>
> **Approve these personas, or suggest changes?**

## Step 2 — Journeys

List the key user journeys named in `source` that the analysis should cover. Confirm via `AskUserQuestion` before proceeding.

- If `source` names no discrete journeys, propose **2–4 inferred journeys** from the goals + functional sections (or the wireframe screen-flow: entry points, navigation, completion screens), and confirm.
- Confirmation is mandatory.

---

After both steps are confirmed, proceed to the calling skill's per-`persona × scenario × journey` analysis.
