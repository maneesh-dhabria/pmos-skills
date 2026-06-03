# canon-discovery.md — find the field's canon (live search)

Shared, skill-agnostic. Find the experts, the foundational texts, and the curations a
field already trusts — **by live search, never from memory.** Inline this file and
follow it; it emits a canon set the outline cascade and sourcing both consume. **This
file knows nothing about which skill inlines it.**

## Contents

- Why live search (never memory)
- Practitioners
- Canonical books
- Curation harvest (curation-of-curations)
- Emitted canon set

## Why live search (never memory)

A canon recalled from training data is stale and unverifiable. Every name, title, and
curation below is found by live search this run and is later subject to the
verification pass-bar in `sourcing.md`. Discovery is bounded by the depth row in
`intake.md`'s dial matrix (canon depth column).

## Practitioners

Search for the people whose names recur as authorities on the topic. Capture
`{name, primary_home (site/newsletter/handle), why_canonical (one line)}`. Be specific —
"industry experts" is not a practitioner; prefer named individuals. Verify each is real
and still active when sourcing reaches them. Count per the dial matrix (brief ~3,
standard ~5, deep full set).

## Canonical books

Search for the field's foundational / most-recommended books. Capture
`{title, author, why_canonical}`. Verify each exists (a real catalog/author page
resolves). For any book that is not free, a summary reference is sourced later per
`sourcing-ladder.md` (Book summaries) — note the book here; the summary is attached at
sourcing time. Count per the dial matrix (brief 2–3, standard 3–5, deep full).

## Curation harvest (curation-of-curations)

Before deriving the outline, harvest the curations other people already built — they
are the strongest outline signal and pre-stock the candidate pool. Search:
"best <topic> resources / reading list / syllabus", "awesome-<topic>",
"<topic> from first principles", practitioner "what to read" posts. Harvest 2–4 (per
the dial matrix), extract their recurring entries, and **dedupe** — an item that recurs
across independent curations is strong signal. These entries feed `outline.md`'s
cascade and stock `sourcing.md`'s candidate pool (still subject to the hard gate).

## Emitted canon set

After this file runs, the calling skill holds:

```
canon = {
  practitioners: [{name, primary_home, why_canonical}, ...],
  books:         [{title, author, why_canonical}, ...],
  curations:     [{url, recurring_entries: [...]}, ...]   // 2–4 harvested
}
```

Hand the whole `canon` to `outline.md` (the cascade reads `curations` + `books` for
consensus structure) and to `sourcing.md` (the candidate pool is pre-stocked from
`curations[].recurring_entries`).
