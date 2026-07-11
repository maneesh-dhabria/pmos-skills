# Output shapes — the three interview-guide artifacts

The three artifacts `/interview-guide` authors, their machine anchors, and a per-output section
checklist. The anchor sets are **the** interop contract with `/interview-feedback` — an area id in the
reference MUST equal the matching dimension id in the sheet, and the sheet's anchors are what
`/interview-feedback score` parses. Do not invent new anchor names; instantiate the canonical skeletons
under `../_shared/interview-guidelines/`.

All three are self-contained HTML (inline `<style>`, no external assets), print-friendly, editable in a
browser. Reuse the corpus palette so the kit is visually consistent with `/interview-feedback` output:
`--bg:#f8f5ef; --surface:#fff; --border:#e2dac9; --accent:#b8431a; --green:#16a34a; --red:#b91c1c;`
`--serif:Georgia,serif; --sans:-apple-system,Segoe UI,Roboto,sans-serif`.

---

## (a) Interviewer reference — `interviewer-reference.html`

Instantiate `../_shared/interview-guidelines/reference-skeleton.html`. The interviewer-only guide to
running the round.

**Machine anchors (required):**
- `data-ref="round"` on the root `<main>` (+ `data-archetype="<id>"`).
- one `<section class="area" data-area="<id>">` per competency — **`<id>` MUST match the sheet's
  `data-dim` id 1:1**.
- per area: `data-signals="green"` and `data-signals="red"` lists; `data-probes="<id>"` list (each `<li>`
  one probe the `/interview-feedback` questionnaire can lift).

**Section checklist (every area):**
- [ ] purpose line — what this area tests and why it matters for the role.
- [ ] ✓ strong-looks-like signals (≥2) and ✕ watch-for signals (≥2).
- [ ] a suggested-probe ladder (2–4 probes, opening → deepening).
- [ ] a `.calib` line: good / average / poor, plus the **common interviewer mistake** for this area.
- [ ] a `.purpose` block at the top: what the whole round tests and how to score it.

Model to match: `../_shared/interview-guidelines/guidelines/product-sense/interviewer-reference.html`
(5 fully-worked areas).

---

## (b) Scoring sheet — `scoring-sheet.html`

Instantiate `../_shared/interview-guidelines/scorecard-skeleton.html` — **THE anchor contract**. This is
the file `/interview-feedback score` fills after the round, so every anchor must be present and correct.

**Machine anchors (required — validated by `scripts/validate-scorecard-anchors.mjs`):**
- `data-card="scorecard"` on the root `<main>` (+ `data-archetype="<id>"`).
- one `<section class="dim" data-dim="<id>">` per competency — **ids match the reference `data-area`
  ids**.
- per dim: `data-weight="<n>"` (integer; **all weights sum to exactly 100**); a `data-scale="1-4"`
  container whose options each carry `data-v="<n>"`; a `data-input="notes:<dim>"` slot; and
  `data-flags="green"` + `data-flags="red"` `<ul>` containers.
- one overall `<div ... data-input="reco">` with four options carrying
  `data-reco="strong-yes|yes|no|strong-no"`, plus a `data-input="notes:reco"` slot.

**Machine anchors (optional — time budget, emitted only when a round duration was confirmed):**
- `data-duration="<int>"` on the root `<main data-card="scorecard">` — the confirmed live-round length in
  whole minutes (a positive integer).
- `data-budget="<int>"` on each `<section class="dim">` — the minutes allotted to that competency
  (positive integers **summing to ≤ `data-duration`**).
- The scoring sheet is the **single machine-readable home** for the round's time plan — the interviewer
  reference renders these numbers as prose, it does not author its own (§K). Emit **both** anchors or
  **neither**; a sheet with no confirmed duration carries neither and validates byte-identically to the
  pre-duration contract.

**Section checklist:**
- [ ] every reference area has a matching sheet dimension (and vice-versa) — 1:1 by id.
- [ ] weights reflect competency importance for this role/seniority and sum to 100.
- [ ] each dimension names 1–3 green flags and 1–3 red flags (what a strong/weak answer shows).
- [ ] the reco control lists all four options and has a notes slot.
- [ ] (duration confirmed) root `data-duration` + per-dim `data-budget` present; budgets sum to ≤ duration.
- [ ] `node scripts/validate-scorecard-anchors.mjs scoring-sheet.html` exits 0.

The validator is the §H hard gate — the model never totals the weights or the minute budgets by hand; the
script does.

---

## (c) Case document — `case-document.html` + `case-reference-solution.html`

**Case rounds only** (`case-study` / `case-presentation`, or `--case`). Authored from the operator's
business context per `case-authoring.md`. Two files, authored together from the same context:

- **`case-document.html`** — candidate-facing. The scenario, the deliverable asked for, constraints,
  the time window. **No solution, no rubric.** This is exactly what the candidate receives.
- **`case-reference-solution.html`** — interviewer-only. What a strong answer looks like, the traps the
  prompt sets, and a `data-maps-dim="<id>"` note per section tying the case back to the scoring-sheet
  dimensions it exercises.

**Section checklist:**
- [ ] the case is grounded in the supplied business context (not a generic template).
- [ ] it poses a real decision with genuine tradeoffs (not a single obvious answer).
- [ ] the deliverable + time window are explicit and answerable in that window.
- [ ] the reference-solution maps each part of the case to a scoring-sheet dimension.
- [ ] no candidate data anywhere; the business context is never leaked into the candidate-facing file
      beyond what the candidate is meant to see.
