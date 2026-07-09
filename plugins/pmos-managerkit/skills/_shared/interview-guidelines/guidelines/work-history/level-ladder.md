# Work-history level ladder — competency→weight table (design D7)

The **static, hardcoded** mapping from PM seniority level to a per-competency weight row for the
work-history scorecard. `--seniority` selects a row; the model **reads** the row's weights verbatim
into the scorecard's `data-weight` anchors — it never computes or re-derives them (§H: arithmetic is
not the model's job; every row here is pre-summed to 100 and gated by
`scripts/validate-scorecard-anchors.mjs`).

The competency taxonomy is the **Ravi Mehta / Reforge PM competency framework** — four buckets of
three competencies each (12 total). The weight *shape* shifts predictably up the ladder:
execution- and craft-heavy early (an APM is judged on shipping well), strategy-, influence-, and
people-heavy late (a Director/VP is judged on outcomes, org leverage, and leadership). The row totals
always equal 100 so the scorecard's weight-sum gate passes unchanged.

## The ladder

Six levels. `--seniority` maps onto them (nearest match; the CLI aliases in the right column are the
values operators actually pass). When `--seniority` is absent, infer the level from the role title;
when neither resolves, default to **`senior-pm`** (the shipped default row, also used by the checked-in
`scorecard.html`).

| Level key      | Title(s)                    | `--seniority` aliases                     |
|----------------|-----------------------------|-------------------------------------------|
| `apm`          | APM / Associate PM          | `new-grad`, `apm`, `associate`            |
| `pm`           | Product Manager             | `pm`, `mid`                               |
| `senior-pm`    | Senior PM                   | `senior`, `senior-pm`, `sr`  ← **default**|
| `group-pm`     | Group PM / Lead PM          | `staff`, `lead`, `gpm`, `group`           |
| `director`     | Director of Product         | `director`, `dir`, `principal`            |
| `vp`           | VP / Head of Product        | `vp`, `head`, `exec`                      |

## The weight table

Each **column** is one level's weight row; every column sums to **100**. Competencies are grouped by
their Reforge bucket for reading only — the scorecard carries one `data-dim` per competency (kebab
key in the first column), each with the `data-weight` from the selected level's column.

| Competency (`data-dim` key)                 | Bucket             | apm | pm | senior-pm | group-pm | director | vp |
|---------------------------------------------|--------------------|----:|---:|----------:|---------:|---------:|---:|
| `feature-specification`                     | Product Execution  |  15 | 12 |         9 |        6 |        4 |  3 |
| `product-delivery`                          | Product Execution  |  15 | 13 |        10 |        7 |        5 |  3 |
| `quality-assurance`                         | Product Execution  |  10 |  9 |         7 |        5 |        3 |  2 |
| `fluency-with-data`                         | Customer Insight   |  12 | 11 |         9 |        8 |        7 |  5 |
| `voice-of-customer`                         | Customer Insight   |  10 | 10 |         9 |        7 |        5 |  4 |
| `user-experience-design`                    | Customer Insight   |   8 |  7 |         6 |        5 |        4 |  3 |
| `business-outcome-ownership`                | Product Strategy   |   6 |  8 |        11 |       13 |       15 | 16 |
| `product-vision`                            | Product Strategy   |   5 |  7 |        10 |       11 |       13 | 15 |
| `strategic-impact`                          | Product Strategy   |   4 |  5 |         7 |        8 |        8 |  9 |
| `stakeholder-management`                    | Influencing People |   7 |  8 |         9 |       11 |       12 | 13 |
| `team-leadership`                           | Influencing People |   3 |  4 |         7 |       12 |       16 | 18 |
| `managing-up`                               | Influencing People |   5 |  6 |         6 |        7 |        8 |  9 |
| **Column total**                            |                    | **100** | **100** | **100** | **100** | **100** | **100** |

Bucket subtotals (for sanity, not for the model to compute — they follow from the rows above):

| Bucket             | apm | pm | senior-pm | group-pm | director | vp |
|--------------------|----:|---:|----------:|---------:|---------:|---:|
| Product Execution  |  40 | 34 |        26 |       18 |       12 |  8 |
| Customer Insight   |  30 | 28 |        24 |       20 |       16 | 12 |
| Product Strategy   |  15 | 20 |        28 |       32 |       36 | 40 |
| Influencing People |  15 | 18 |        22 |       30 |       36 | 40 |

## Scope anchors (the arc `trajectory-synthesis` reads against)

Level is read as much from **scope** as from title. Use these as the `data-v` calibration for the
scope-arc read and the `level-verdict`:

| Level       | Scope of ownership              | Ownership language ("I…")                         |
|-------------|---------------------------------|--------------------------------------------------|
| `apm`       | a feature                       | "I shipped the feature"                           |
| `pm`        | a feature area / surface        | "I owned the area end-to-end"                     |
| `senior-pm` | a product / major surface       | "I set the direction for the product"            |
| `group-pm`  | a portfolio, **through PMs**    | "I led a squad of PMs / I led through people"     |
| `director`  | an org's product line           | "I built the team and the operating model"        |
| `vp`        | the org + strategy              | "I own the P&L / the product org's north star"    |

A candidate whose *stories* live one rung below their *title* (a "Senior PM" whose every example is a
single feature they specced) is the classic **partial-arc / inflation** catch — surface it in
`level-verdict` as **below**, with the role-evidence blocks as the receipts.

## Per-level marker deltas (great / average / poor)

The 1–4 scale on each competency shifts with level — a "4 on strategy" means something different for an
APM than a VP. Tailor each dimension's low/high anchors from these deltas:

- **`apm` / `pm`** — a **4** is *excellent craft*: crisp specs, clean delivery, quality bar held, real
  user/data grounding. Strategy and people are *emerging*; a 3 there is strong for level.
- **`senior-pm`** — a **4** requires *owned outcomes* on a product surface and *influence without
  authority*, on top of execution. Execution is table-stakes (a 2 on delivery is now disqualifying).
- **`group-pm`** — a **4** is *leverage through other PMs* and a *portfolio-level* bet that paid off.
  Individual-contribution stories (however good) cap the leadership dims at 2–3.
- **`director` / `vp`** — a **4** is *org-level outcomes, team building, and strategy that shaped the
  roadmap*. Hands-on feature work is not scored up; the question is what moved because they led.

## Operator override extension point (consumed by `--level-rubric`, design D8)

`--level-rubric <path>` lets an operator supply their **own** competency→weight set (e.g. their
company's PM leveling guide) instead of this default ladder. The override is free-form markdown; the
skill interprets it into a per-level weight set and hands the result to
`validate-scorecard-anchors.mjs`'s **override sum-gate** (`--check-override <json>`), which
deterministically refuses any set whose weights are not non-negative integers **summing to 100**. On a
refusal the run does **not** emit a malformed sheet — it re-prompts (interactive) or falls back to the
matching row of *this* default ladder with a stderr error (non-interactive). The model never totals the
override by hand; the script owns that arithmetic. See `/interview-guide` `SKILL.md` §
[Scoring Sheet](../../../../interview-guide/SKILL.md#scoring-sheet) for the flag's phase wiring.
