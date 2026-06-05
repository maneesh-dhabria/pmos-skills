# MSF Shared Heuristics

Shared module consumed by `/msf-req` and `/msf-wf`. Contains the persona-alignment template, the M/F/S 24-consideration list, and the executive-summary template. Each invoking skill is responsible for adding mode-specific overrides at the end of its own SKILL.md.

Scope: motivation, friction, and satisfaction analysis only. Wireframe-specific scoring rubrics live in their owning skill, not here.

---

## Persona Alignment

Persona **and** journey alignment is the skill-agnostic ceremony in [`persona-journey-alignment.md`](persona-journey-alignment.md) — follow it with `source` bound per the calling skill (the requirements doc for `/msf-req`; the wireframes folder + sibling `01_requirements.{html,md}` + wireframe copy for `/msf-wf`). It covers proposing 2–5 personas (≤2 scenarios each, extract-before-invent, new/power-user priority), the mandatory `AskUserQuestion` confirmation, and journey confirmation. The MSF consideration questions below run once personas and journeys are confirmed.

---

## Motivation Considerations

- What is the job the user is trying to do?
- How important is the job for the user?
- How urgent is the job?
- What else could be more important or urgent for them?
- What are benefits of action to do this job?
- What are consequences if the user doesn't perform any action to fulfil this job?
- What are alternatives and how good are they?

---

## Friction Considerations

- Will the user understand this product?
- When does the user need to make this decision to act?
- How complex is the decision to act or use this product?
- What is the cost of making a wrong decision?
- Do they understand what their next action is?
- How difficult is it to initiate this action?
- How difficult will they think it is to complete this action?
- What else is going on in their life or at work or in front of them?
- What do they stand to lose?
- How inconsistent is this with their expectations or habits or experiences?
- How much thought do they need to put into this before initiating action?

---

## Satisfaction Considerations

- Did it fulfill the promised job?
- Did it live up to their expectations?
- Did it generate "happy hormones"?
- Did it feel reassuring?
- Did it raise their prestige, self-esteem, or security?
- Did it make them feel smart?

---

## Executive Summary Template

The chat summary is bounded (≤200 lines). The saved findings doc has no line cap.

**Recommendations grouped by priority:**

- **Must** — Critical friction or motivation gaps that will block adoption
- **Should** — Significant UX improvements worth the effort
- **Nice-to-Have** — Polish items that enhance but aren't essential

Each recommendation must include:

- Severity (Must / Should / Nice-to-Have)
- Affected screens/journeys
- Implementation effort (Low / Medium / High)

**Recommendation table format:**

| ID | Severity | Recommendation | Affected | Effort |
|----|----------|----------------|----------|--------|
| R1 | Must     | [Action]       | [Where]  | Low/Med/High |

**No actionable findings — terminal state.** When analysis surfaces nothing rated Must / Should / Nice, emit an explicit "no actionable findings" message and save the findings doc with empty recommendation tables. Do not pad with manufactured items.

> **Mode-specific overrides:** see invoking skill's "Summary Overrides" section.
