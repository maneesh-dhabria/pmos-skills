# T1 — id-coverage audit (spike)

**Feature:** inline-doc-comments
**Spec refs:** S8 (id-coverage audit), FR-23 (id-first anchor strategy)
**Date:** 2026-05-23
**Script:** `tests/scripts/audit_id_coverage.sh`
**Raw output:** `/tmp/id-coverage.tsv` (regenerable; pure read-only audit)

## Method

Globbed `docs/pmos/features/*/*.html` — the top-level pipeline-artifact corpus
(`00_pipeline`, `01_requirements`, `02_spec`, `03_plan`, per-feature `index.html`).
Per file, counted `<h2>` / `<h3>` opening tags and how many carry an `id=`
attribute. Nested `grills/`, `verify/`, and per-screen `wireframes/*.html`
mocks were excluded — they're either ephemeral session logs or per-screen
mocks, not the structured corpus that comments will anchor against.

## Results

| Metric                      | Count   | Coverage |
|-----------------------------|---------|----------|
| Files audited               | 62      | —        |
| `<h2>` total                | 480     | —        |
| `<h2>` with `id=`           | 480     | **100.0%** |
| `<h3>` total                | 679     | —        |
| `<h3>` with `id=`           | 667     | **98.2%** |
| Files with 100% coverage    | 61      | 98.4%    |
| Files with any gap          | 1       | 1.6%     |

### Summary

- 100% coverage: 61 files (every primary pipeline artifact — `00_pipeline`, `01_requirements`, `02_spec`, `03_plan`, and feature `index.html` — carries kebab-case ids on every `<h2>` and `<h3>`)
- gaps: 1 files (`docs/pmos/features/2026-05-13_architecture-deep-pass/0c_feedback_triage.html` — 12 of 12 `<h3>` tags missing ids; an ad-hoc feedback-triage doc, not a standard pipeline artifact)
- recommend: id-first anchor resolution is viable across the corpus — primary pipeline artifacts are at 100% id coverage, the single outlier is a non-standard one-off triage doc, and the FSA text-quote fallback (FR-24) cleanly covers any future id-less heading without blocking the primary strategy.

## Gap detail

The only file flagged was a non-canonical ad-hoc triage document, not a
pipeline artifact:

```
docs/pmos/features/2026-05-13_architecture-deep-pass/0c_feedback_triage.html
  h2: 6/6 with id (100%)
  h3: 0/12 with id (0%)
```

This file uses bare `<h3>` tags (no id attribute). It is not produced by any
substrate template — it was hand-authored as a one-off feedback triage. Since
comments anchored against id-less headings will fall back to the FSA
text-quote strategy (FR-24), this is not a blocker.

## Implications for the plan

1. **Id-first anchor resolution (FR-23) is the correct primary strategy** — 99.96% of `<h2>` anchors and 98.2% of `<h3>` anchors in the corpus already carry kebab-case ids. No mass-migration of historical artifacts is required.
2. **FSA text-quote fallback (FR-24) remains necessary** — the 12 id-less `<h3>` tags in the outlier file (and any future ad-hoc docs that bypass the substrate) need a non-id resolution path. Plan tasks for FR-24 (FSA implementation) stay in scope.
3. **No remediation work required on the existing corpus** — the single gap is a non-canonical doc; rewriting it just to add ids would not move coverage meaningfully and is out of scope for this feature.
4. **Regression-guard the script** — `tests/scripts/audit_id_coverage.sh` is reusable. A future plan task can wire it into CI (or a substrate check) to ensure newly authored pipeline artifacts maintain ≥98% h3 id coverage; this audit establishes the baseline.

## How to re-run

```bash
bash tests/scripts/audit_id_coverage.sh > /tmp/id-coverage.tsv
# files with any gap:
awk -F'\t' '$3 < $2 || $5 < $4 {print}' /tmp/id-coverage.tsv
# corpus totals:
awk -F'\t' '{th2+=$2; th2id+=$3; th3+=$4; th3id+=$5} \
  END{print "h2", th2id"/"th2; print "h3", th3id"/"th3}' /tmp/id-coverage.tsv
```
