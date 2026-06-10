# PSYCH Scoring — Shared Protocol

> Canonical PSYCH walkthrough and output format. Any skill that scores screens for motivational pull follows this file instead of restating the rubric. Consumers cite it by path — "Run the PSYCH walkthrough per `_shared/psych-scoring.md`" — and state only their genuine deltas (target artifact, surfaced-finding caps, entry-context overrides) at the call site. Scores are **directional indicators, not scientific measurements** — they point at where motivation rises or falls, not at exact values.

## The walkthrough

Walk each screen following the user's attention path (left-to-right, top-to-bottom). Score notable UI elements as +Psych or −Psych using the driver palette below. Focus on elements that stand out as clearly positive or negative; **skip neutral / expected elements** (do not record `0`) — padding the score table with forced insights is an anti-pattern, and an empty column for a genuinely neutral screen is a valid output.

## Driver palette (canonical)

These are the labels to use in the Notes / Top Drivers columns. Keep vocabulary consistent across journeys so cross-feature reading is possible.

**+Psych drivers (add motivation):**
- *Positive emotions*: attractive visuals, social proof, credibility signals
- *Motivational boosts*: urgency, progress indicators, value previews, completion cues
- *Rewards*: immediate value delivery, clear outcomes, "aha" moments

**−Psych drivers (drain motivation):**
- *Physical effort*: form fields, data entry, clicks, scrolling, waiting
- *Decisions*: choices, configurations, ambiguous options, unfamiliar terminology
- *Questions*: unclear UI, unknown costs, jargon, missing feedback

## Entry context

The journey's starting score reflects how much motivation the user arrives with:

- High-intent (user chose to act): 60
- Medium-intent (exploring): 40
- Low-intent (casual/first-time): 25

**Default: Medium (40).** Document the assumption as a header line at the top of the findings artifact: `Entry context: Medium (40, default). Override by editing this line and re-running.` The user overrides by editing the line and re-running.

## Score scale

- Element scores: integers in `[+1..+10]` or `[-10..-1]`. Skip neutral elements.
- Screen Δ: sum of element scores on that screen.
- Cumulative: running total starting from the entry-context score.
- No false precision: scores are relative, not scientific. The numbers exist to force enumeration of concrete elements in attention order and to rank drivers — not to be computed against.

## Element collapsing rule

Identical or near-identical elements collapse to one row:

- 5 nav links → "Nav links (5), -5 total" — not 5 separate rows
- A list of 12 settings rows → "Settings rows (12), -3 total"
- 3 social-proof testimonials → "Testimonial set (3), +6 total"

This keeps the audit table scannable without losing the cumulative weight.

## Severity bands — assigned by judgment

Each screen gets one of four bands. **The band is a judgment call, not an arithmetic trigger** — ask "would a user at this entry context stall here, give up entirely, or lose all accumulated momentum on this one screen?" and answer from the walk. The running total is the evidence trail you cite, not the decider: LLM-assigned magnitudes are not stable quantities, and a threshold comparison on them flips across runs and model versions.

- **OK** — momentum holds; nothing on this screen would stall the user.
- **Watch** — the user noticeably stalls; goodwill is draining and the journey can't absorb many more screens like this.
- **Bounce risk** — a user at this entry context plausibly abandons here.
- **Cliff** — this single screen destroys a large share of accumulated momentum (mode switch, surprise cost, wall of required fields), regardless of how healthy the cumulative total still looks.

As *calibration illustrations only*: journeys whose running total drifts toward ~20 have usually earned **Watch**; below ~0, **Bounce risk**; a single-screen drop on the order of −20 is **Cliff** territory. If your judgment and the total disagree, the judgment wins — and the disagreement is itself worth a note. A screen can be both Watch and Cliff simultaneously — report both in the severity cell.

## Output format

The PSYCH section of the findings artifact starts with:

```markdown
# PSYCH Walkthrough — <feature slug>

Generated: <YYYY-MM-DD>
Source: <relative-path or URL>
Entry-context default: Medium-intent (40)   [override here if the source declared otherwise]
Journeys analyzed: <N> of <total>   [if capped]

## Severity bands

OK / Watch / Bounce risk / Cliff — assigned by judgment per `_shared/psych-scoring.md`;
running totals are cited as evidence, not triggers.
```

For each journey, write two tables plus a sparkline:

```markdown
## Journey: <name>   (start: 40, Medium-intent)

Sparkline: 40→35→25→17→11→16   ▆▅▃▂▁▂  (danger from step 3)

### Element table (audit)

| Screen | Element | ± Psych | Running Total | Notes |
|--------|---------|---------|---------------|-------|
| 03_signup-form | "Sign up free" CTA | +5 | 45 | Clear value, no friction |
| 03_signup-form | 6 form fields | -8 | 37 | Above the fold, dense |
| 05_email-verify | "Check your email" copy | -5 | 32 | Mode switch, breaks momentum |
| 09_workspace-empty | No clear next step | -8 | 24 | Empty state without CTA |

### Screen table (stakeholder rollup, primary)

| Step | Screen | Previous | Δ | Cumulative | Severity | Top 2 Drivers |
|------|--------|----------|---|------------|----------|----------------|
| 1 | 03_signup-form | 40 | -3 | 37 | OK | -8 (form density), +5 (CTA clarity) |
| 2 | 05_email-verify | 37 | -5 | 32 | Watch | -5 (mode switch out of app) |
| 3 | 09_workspace-empty | 32 | -8 | 24 | **Watch** | -8 (no clear next step) |
```

**Sparkline rule:** ASCII sparkline uses the eight Unicode block characters `▁▂▃▄▅▆▇█` mapped to the journey's score range — lowest score → `▁`, highest → `▇`, intermediate scores interpolated. Add a one-line summary after the sparkline naming the danger point if any: `(danger from step 3)`.

## Unsurfaced findings section

Consumers that cap how many findings they surface for disposition log the remainder at the end of the findings artifact — evidence for future review, never silently fixed and never silently dropped. (The cap itself, and the requirement to tell the user it fired, live in the consumer.)

```markdown
## Unsurfaced findings (low severity, not presented for disposition)

| Journey | Screen | Element | ± Psych | Note |
|---------|--------|---------|---------|------|
| ... |
```

## Consumers

msf-wf, design-crit

---

*Spec lineage: PSYCH rubric and dual-table format from `2026-05-08_msf-skill-split` (promoted 2026-06-10, skill-design review P2, from `msf-wf/reference/psych-output-format.md` + /msf-wf's inline scoring rules — the split's "one PSYCH implementation" decision, re-asserted after /design-crit grew a third copy). Severity bands converted from arithmetic thresholds (<20 Watch, <0 Bounce, Δ<−20 Cliff) to judgment-assigned per skill-patterns §H — the split had already deferred calibration and softened scores to "directional"; this finishes the thought.*
