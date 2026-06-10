# PSYCH Output Format

The reference for the PSYCH section embedded in `msf-wf-findings.{html,md}` produced by `/msf-wf` Phase 7 (Section B). Output is two tables per journey plus an ASCII sparkline. (Pre-2.22 the PSYCH artifact was a separate `psych-findings.md` produced by `/wireframes` Phase 6; the artifact was unified when PSYCH moved into `/msf-wf`.)

## File header

The PSYCH section of every `msf-wf-findings` doc starts with:

```markdown
# PSYCH Walkthrough — <feature slug>

Generated: <YYYY-MM-DD>
Wireframes folder: <relative-path>
Tier: <1|2|3>
Entry-context default: Medium-intent (40)   [override here if req doc declared otherwise]
Journeys analyzed: <N> of <total>   [if capped via multiSelect]

## Threshold legend

- Cumulative `< 20`  → **Watch**
- Cumulative `< 0`   → **Bounce risk**
- Single-screen Δ drop `> 20` → **Cliff** (flagged regardless of cumulative)
```

## Per-journey block

For each journey, write:

```markdown
## Journey: <name from req doc>   (start: 40, Medium-intent)

Sparkline: 40→35→25→17→11→16   ▆▅▃▂▁▂  (danger from step 3)

### Element table (audit)

| Screen | Element | ± Psych | Running Total | Notes |
|--------|---------|---------|---------------|-------|
| 03_signup-form | "Sign up free" CTA | +5 | 45 | Clear value, no friction |
| 03_signup-form | 6 form fields | -8 | 37 | Above the fold, dense |
| 03_signup-form | Legal copy block | -2 | 35 | Walls of text reduce trust |
| 05_email-verify | "Check your email" copy | -5 | 30 | Mode switch, breaks momentum |
| 05_email-verify | No "resend" affordance | -5 | 25 | Dead-end risk if email is missed |
| 09_workspace-empty | No clear next step | -8 | 17 | Empty state without CTA |
| 11_create-project-modal | 5 required fields | -6 | 11 | Asks before delivering |
| 12_project-detail | "Project saved" toast | +5 | 16 | First reward in flow |

### Screen table (stakeholder rollup, primary)

| Step | Screen | Previous | Δ | Cumulative | Severity | Top 2 Drivers |
|------|--------|----------|---|------------|----------|----------------|
| 1 | 03_signup-form | 40 | -5 | 35 | OK | -8 (form density), +5 (CTA clarity) |
| 2 | 05_email-verify | 35 | -10 | 25 | Watch | -10 (mode switch out of app) |
| 3 | 09_workspace-empty | 25 | -8 | 17 | **Watch** | -8 (no clear next step) |
| 4 | 11_create-project-modal | 17 | -6 | 11 | **Watch** | -6 (5 required fields before value) |
| 5 | 12_project-detail | 11 | +5 | 16 | **Watch** | +5 (project saved confirmation) |
```

## Driver palette (canonical)

These are the labels reviewers should use in the Notes / Top Drivers columns. Keep vocabulary consistent across journeys so cross-feature reading is possible.

**+Psych drivers:**
- *Positive emotions*: attractive visuals, social proof, credibility signals
- *Motivational boosts*: urgency, progress indicators, value previews, completion cues
- *Rewards*: immediate value delivery, clear outcomes, "aha" moments

**-Psych drivers:**
- *Physical effort*: form fields, data entry, clicks, scrolling, waiting
- *Decisions*: choices, configurations, ambiguous options, unfamiliar terminology
- *Questions*: unclear UI, unknown costs, jargon, missing feedback

## Score scale

- Element scores: integers in `[+1..+10]` or `[-10..-1]`. Skip neutral elements (do not record `0`).
- Screen Δ: sum of element scores on that screen.
- Cumulative: running total starting from the entry-context score.
- No false precision: scores are relative, not scientific.

## Element collapsing rule

Identical or near-identical elements collapse to one row:
- 5 nav links → "Nav links (5), -5 total" — not 5 separate rows
- A list of 12 settings rows → "Settings rows (12), -3 total"
- 3 social-proof testimonials → "Testimonial set (3), +6 total"

This keeps the audit table scannable without losing the cumulative weight.

## Severity assignment rule

For each screen, severity is:
- **Bounce risk** → cumulative `< 0`
- **Watch** → cumulative `< 20`
- **Cliff** → single-screen Δ `< -20` (regardless of cumulative)
- **OK** → none of the above

A screen can be both Watch and Cliff simultaneously — report both in the severity cell.

## Sparkline rule

ASCII sparkline uses the eight Unicode block characters `▁▂▃▄▅▆▇█` mapped to the journey's score range. Map the lowest score to `▁` and the highest to `▇`; intermediate scores are interpolated. Add a one-line summary after the sparkline naming the danger point if any: `(danger from step 3)`.

## Applied changes section

After dispositions are applied (SKILL.md Phase 8: Apply Edits), append at the end of the file:

```markdown
## Applied changes

| Journey | Screen | Finding | Fix | Status |
|---------|--------|---------|-----|--------|
| New user creates first project | 09_workspace-empty | No clear next step | Added primary CTA "Create your first project" | Applied |
| New user creates first project | 11_create-project-modal | 5 required fields before value | Reduced to 2 required (name, template); rest moved to project settings post-creation | Applied |
```

## Unsurfaced findings section

Findings beyond the 12-finding AskUserQuestion cap are logged at the end:

```markdown
## Unsurfaced findings (low severity, not presented for disposition)

| Journey | Screen | Element | ± Psych | Note |
|---------|--------|---------|---------|------|
| ... |
```

These are evidence for future review — not silently fixed.
