# Compression model

The compression model the `/summary-tldr` skill applies before it generates anything. It defines the three intent-labeled bands, a length-scaled absolute word cap, and the precise script interface that owns **all** arithmetic. The skill's Phase 3 (Compress) cites this file.

## Table of Contents

- [Intent bands (D2)](#intent-bands-d2)
- [The absolute word cap](#the-absolute-word-cap)
- [The script does the arithmetic (§H)](#the-script-does-the-arithmetic-h)
- [Worked example](#worked-example)
- [Invariant I3 — propose and confirm before generating](#invariant-i3--propose-and-confirm-before-generating)
- [Non-text sources](#non-text-sources)

## Intent bands (D2)

Three intent-labeled bands let the user choose how aggressive the compression is, expressed as an approximate percentage of source length. Design decision **D2** fixes these three and only these three.

| Band | Approx % of source | When to use |
|---|---|---|
| Tight | ~10–20% | Skim / BLUF; high compression. The user wants the gist, fast. |
| Standard | ~20–30% | The empirical sweet spot. **This is the DEFAULT.** |
| Detailed | ~30–40% | Dense technical / legal / scientific material only. **Carries a "this will be long" nudge** to the user before generating, so they can downshift if they didn't mean it. |

The band selects the percentage window (`pct_low`, `pct_high`). The percentage window alone is not the final answer — it is then bounded above by the word cap below.

## The absolute word cap

Compression is non-linear: a fixed percentage of a very long source still produces a sprawling document, which defeats the purpose of a TL;DR. So the percentage target is **bounded above** by an absolute word cap that grows **sub-linearly** with source length. A 50,000-word source does not get a 15,000-word "summary" — it gets a few hundred words.

The exact formula the script uses:

```
cap = max(150, round(200 + 80 × log10(clamp(source_words, 100, 1e7))))
```

`source_words` is clamped to `[100, 1e7]` before the log so tiny and absurd inputs stay well-defined. The `log10` growth is what makes the cap rise slowly: roughly +80 words per 10× of source length.

The final target range the skill quotes to the user is:

```
[ min(target_low, cap), min(target_high, cap) ]
```

The cap is surfaced to the user **alongside the band**, so they see both the percentage intent and the absolute ceiling that may be overriding it.

## The script does the arithmetic (§H)

Per skill-patterns **§H** (arithmetic = script; the model must never compute these numbers), every value above is produced by the companion script `scripts/compression.js`. The model calls the script and reads its output — it does not derive `cap`, `pct_*`, or `target_*` itself.

Interface:

```
node scripts/compression.js <source_word_count> [--band tight|standard|detailed]
```

Prints a single JSON object:

```
{ source_words, band, pct_low, pct_high, target_low, target_high, word_cap, capped, final_low, final_high }
```

- `target_low` / `target_high` — the raw percentage window applied to `source_words`.
- `word_cap` — the cap from the formula above.
- `capped` — `true` when either raw target exceeded `word_cap`.
- `final_low` / `final_high` — the post-cap range, i.e. `[min(target_low, cap), min(target_high, cap)]`.

Self-test:

```
node scripts/compression.js --selftest
```

Asserts the band + cap model; exit `0` on pass, `1` on fail.

The skill calls the script, then renders `final_low`–`final_high` words (and notes `word_cap` when `capped` is `true`) for the user to confirm.

## Worked example

These are the script's actual outputs — quoted verbatim.

| Source words | Band | Raw target | Word cap | Final | Capped? |
|---|---|---|---|---|---|
| 500 | standard | 100–150 | 416 | 100–150 | no |
| 8000 | tight | 800–1600 | 512 | 512–512 | yes — a long source still yields a TL;DR |
| 50000 | detailed | 15000–20000 | 576 | 576–576 | yes — capped hard |

The 8,000- and 50,000-word rows show the cap doing its job: the raw percentage would have produced a long document, and the cap collapses both bounds to the ceiling.

## Invariant I3 — propose and confirm before generating

**I3:** the compression target is **proposed and confirmed with the user** (or set directly by the `--compression` flag) **before any summary is generated**. The skill never summarizes first and trims later — band, cap, and final range are settled up front, then generation happens once against that target.

## Non-text sources

A single image or a short tweet has no meaningful source-length percentage, so the band/percentage model does not apply. For these the skill **proposes a target length directly** rather than a ratio — a small recommended default range, e.g. **40–80 words** for a tweet or an image. No script arithmetic is needed for these tiny targets; the skill states the recommended range and confirms it with the user under I3 just as it would a band.
