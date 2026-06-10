# cross-survey-stats.md — cross-tabs, Holm correction, MoE, weighting

Reference loaded by `/survey-analyse` Phase 6. Covers cross-tabulation construction, the Holm-correction default (and its plain-language framing in the report), the margin-of-error rule (probability samples only), weighting caveats, and the small-N flagging behaviour.

## Table of contents

- [Cross-tabs / banner tables](#crosstabs)
- [Significance: chi-square + column-z-tests](#significance)
- [Holm correction (the multiple-comparisons fix)](#holm)
- [Plain-language framing in the report](#plain-language)
- [Small-N suppression rules](#small-n)
- [Margin of error (probability samples only)](#moe)
- [Weighting](#weighting)
- [Response-rate / completion context](#response-rate)

## Cross-tabs / banner tables

For each user-confirmed segment in `schema.json.segments`, build a 2-way table: rows = the closed question's answer options, columns = segment values. Each cell carries:

- count (the cell `n`)
- column-% (within-segment proportion — the usual reading direction)
- base `n` per segment column (footer)
- `small_n_flag: true` when cell `n < 30` (configurable; spec OQ3)

Helper: `stats.cross_tab(rows, row_col, segment_col)` → `{cells, base_per_segment, chi_square_p}`. Use this; don't roll your own cross-tab in `analysis.py`.

## Significance: chi-square + column-z-tests

Per cross-tab:

1. **Overall test:** chi-square on the full contingency table. Yields `p_raw` for the question as a whole. Use scipy formula equivalents from `stats.chi_square()`.
2. **Pairwise column-proportion z-tests** between each pair of segment columns for each row-option. Yields one `p_raw` per (option × segment-pair). Family for Holm = the full set of these per cross-tab.

Skip significance entirely on ordinal/numeric cells where chi-square is inappropriate — use Mann-Whitney or a `p_raw: null` placeholder with a note.

## Holm correction

**Why:** a 30-question survey × 4 segments × pairwise tests easily fires 100+ tests at p<.05 — about 5 will be "significant" by chance alone. Without correction, the report's stars are noise.

**What we apply by default:** the **Holm-Bonferroni step-down** correction across the family of tests within one cross-tab segment batch. Implementation: `stats.holm_correct(p_raw_list)` returns `p_holm` in the same order. Significance markers (*, **, ***) use the **adjusted** p; raw p is kept in the appendix.

**The family is the segment-batch.** For a segment with K cross-tabs and J z-tests each, family size = K × J + K (the K chi-squares). One Holm pass per segment.

**`--raw-p-only`** opts out — significance markers use raw p; the methodology section flags this loudly ("multiple-comparisons correction disabled by --raw-p-only").

## Plain-language framing in the report

Body of `report.html` MUST use plain language; the technical term "Holm" appears only in the methodology section. Suggested wording:

> *Methodology / Cross-tab section intro:* "We compared subgroups for every question. Because we ran many comparisons at once, some apparent differences would have been chance findings — so we adjusted significance to account for this. Differences marked with * (adjusted p<.05), ** (p<.01), or *** (p<.001) survived the correction. See Methodology for the technical detail."
>
> *Methodology section:* "Significance markers use Holm-Bonferroni-adjusted p-values across each segment's family of tests."

## Small-N suppression rules

- **Cell `n < 30`** → flagged inline (`small_n_flag: true`). The chart annotation shows a warning glyph; the report's narrative MUST NOT headline a small-flag cell without acknowledging it.
- **Segment column total `n < 30`** → suppress that segment column from the cross-tab entirely; record in the methodology section.
- **Total cleaned `n < 30`** → skip Phase 6 entirely; the report has no cross-tab section; methodology section explains.

## Margin of error (probability samples only)

Rough N → MoE (50% estimate at 95% confidence):

| n | approx. MoE (±, pts) |
|---|---|
| 50 | 14 |
| 100 | 10 |
| 200 | 7 |
| 400 | 5 |
| 600 | 4 |
| 1,000 | 3 |
| 2,000 | 2 |
| 4,000 | 1.5 |

MoE for a proportion ≈ `z · √(p(1−p)/n)`. Worst case at p=0.5; smaller for proportions far from 50%. For a *difference* between two subgroups, MoE is larger than for either alone (≈ √2× when groups are similar size).

**For non-probability samples** (opt-in panels, "we emailed our list", convenience): **do not report MoE**. AAPOR-aligned alternative: a clearly-labeled modeled "credibility interval" if you have one; otherwise describe the limitations in the methodology section and don't put a ± number on any estimate.

The skill currently defaults to **suppress MoE** unless the user explicitly tagged the sample as probability (future flag; not in v1). The methodology section explains.

## Weighting

**Respondent weighting is not supported.** None of the stats helpers accepts a weight column; every number in the report is unweighted, and the methodology section MUST say so. Do NOT improvise weighting inside the per-run `analysis.py` — that breaks the reproducibility contract (Anti-Pattern #1 / FR-R03). If the user needs weighted estimates, tell them plainly and point them to a dedicated stats tool.

Weighting also **cannot** fix a sample that systematically excludes a group (no internet, didn't see the email). State who's missing in the methodology section.

## Response-rate / completion context

The methodology section should record (when known — ask the user if not derivable):

- Invitations sent / N completed surveys / completion rate.
- Mode (web, email-link, intercept, panel).
- Field dates.
- Population studied + recruitment method.
- Survey sponsor (AAPOR transparency standard).

If the user can't / won't provide some of these, record "not stated" — don't fabricate.

## Sources cited

- AAPOR Best Practices — https://aapor.org/standards-and-ethics/best-practices/
- AAPOR Transparency / Disclosure Standards — https://aapor.org/standards-and-ethics/disclosure-standards/
- AAPOR MoE / Credibility Interval — https://aapor.org/wp-content/uploads/2023/01/Margin-of-Sampling-Error-508.pdf
- Pew Research, Why and how we weight surveys — https://www.pewresearch.org/decoded/2025/07/23/why-and-how-were-weighting-surveys-for-past-presidential-vote/
- Holm S. (1979), "A simple sequentially rejective multiple test procedure", *Scandinavian Journal of Statistics* 6:65–70.
