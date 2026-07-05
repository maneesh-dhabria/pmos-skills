# Self-eval rubric — interview-guide drafts

The self-review pass (Phase [Self-Review](../SKILL.md#self-review)) scores the drafts against three axes
before handing them to the manager. This is a **self-review, not an enforced gate** (design D6): it
surfaces gaps and axis scores; the **manager is the gate**. Nothing here refuses the run — a low score is
reported, not blocking.

Score each axis 1–4 (1 = major gaps, 4 = clean) and record a one-line justification. Record the summary
as an HTML comment block at the top of the interviewer reference.

## Axis 1 — Completeness

Every stated competency is fully covered across the outputs:
- [ ] each competency has a reference `data-area` in output (a).
- [ ] each competency has a weighted `data-dim` in output (b).
- [ ] (case rounds) the case exercises each competency at least once.
- [ ] the interviewer reference has a round-purpose block; the sheet has a reco control.
- [ ] no orphan sections — every area has a purpose, signals, probes, and calibration.

## Axis 2 — Competency-alignment

The reference and the sheet describe the *same* round:
- [ ] reference `data-area` ids and sheet `data-dim` ids are 1:1 (no area without a dimension; no
      dimension without an area).
- [ ] nothing is **scored that isn't probed** (a sheet dimension with no matching reference area/probes)
      and nothing is **probed that isn't scored** (a reference area with no sheet dimension).
- [ ] weights sum to 100 and reflect this role/seniority's priorities (the anchor validator proves the
      sum; this axis judges whether the *distribution* is defensible).
- [ ] the seniority bar is reflected consistently in both the markers and the scale calibration.

## Axis 3 — Case realism (case rounds only)

If a case was authored:
- [ ] the case is grounded in the supplied business context — not a generic template.
- [ ] it poses a real decision with genuine tradeoffs (not a single obvious answer).
- [ ] the deliverable and time window are explicit and the case is answerable within them.
- [ ] the reference-solution maps each part of the case back to a scoring-sheet dimension
      (`data-maps-dim`).
- [ ] no candidate data; the business context isn't leaked into the candidate-facing file.

For a non-case round, mark Axis 3 **N/A** and note it.

## Output

Report to the manager: the three axis scores (or N/A), the gaps found per axis, and the specific edits
you'd suggest. Do not silently fix and hide — the manager decides what to change. Example summary block:

```html
<!-- interview-guide self-review:
     completeness=4 · alignment=3 (metric-sense area has no sheet dimension — add or drop) · case-realism=N/A
     manager: resolve the alignment gap before using this kit. -->
```
