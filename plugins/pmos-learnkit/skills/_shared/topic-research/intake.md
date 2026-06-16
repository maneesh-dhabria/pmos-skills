# intake.md — topic-research intake (dials + richness)

Shared, skill-agnostic intake for any topic-research skill. Inline this file and follow
it; it resolves the two dials, runs the topic-richness classifier, and emits a typed
intake result. **This file knows nothing about which skill inlines it** — it produces a
result; the calling skill decides how to react.

## Contents

- The two dials (`--depth`, `--audience`)
- Depth → coverage dial matrix
- Topic-richness classifier (typed verdict)
- Emitted intake result

## The two dials

Resolve both from the argument string; honor an explicit flag, else fall back as noted.

### `--depth brief | standard | deep` — the effort dial

One dial governs how wide the run fans out and how much it spends. Coverage, source
quality bar, and research spend all scale together with depth. Default `standard`
(a skill may persist its own per-project default and pass it in; honor that as the
fallback before `standard`).

Phrasing cues a skill may use to *suggest* a depth (never auto-apply without the flag):
"just a quick list", "the basics", "5 minutes" → `brief`; "go deep", "comprehensive",
"everything", "I'm specializing" → `deep` (and surface the est-cost line — see
`sourcing.md`).

### `--audience senior-pms | all-pms` — the reader axis

Who the output is shaped for. `senior-pms`: PM-fluent reader; no inline definitions of
common PM terms. `all-pms`: every term-of-art defined on first use; more scaffolding.
Default `senior-pms`. **Always resolve audience, at every depth** — including `brief`;
it is a single cheap prompt and it shapes the whole artifact. When no flag is given and
the run is interactive, ask once:

> Audience? **senior-pms (Recommended)** / **all-pms**

Non-interactive runs auto-pick `senior-pms`.

## Depth → coverage dial matrix

The single source of truth for how the three depths scale. A consuming skill reads the
row for the resolved depth and sizes its outline, sourcing, and adjacency accordingly.

| Dimension | brief | standard | deep |
|---|---|---|---|
| Topics in the outline | 3–5 | 5–8 | 8–12 |
| Verified sources per topic | top 3 | top 5 | top 5–8 |
| Adjacency hops | 0 | 1 | 2 |
| Canon depth (see `canon-discovery.md`) | 2–3 books, ~3 practitioners, 1–2 curations | 3–5 books, ~5 practitioners, 2–4 curations | full: books + practitioner set + 3–5 curations |
| Outline-confirm gate (see `outline.md`) | confirm/edit | confirm/edit | confirm/edit |
| Fan-out (see `sourcing.md`) | sequential / in-context | one unit per topic | one unit per topic + per adjacency cluster |

If an optional curated-references overlay is present (see `curated-references.md`), its
per-topic curated slice rides this **same** row — the same top-N target and depth — as
live sourcing. There is no separate cap or dial for the curated source; it over-supplies
candidates into the same pool, and the "Verified sources per topic" target above still
governs how many survive.

## Topic-richness classifier (typed verdict)

Before building the outline, classify the topic. Run this prompt verbatim and keep the
result; the calling skill decides what to do with each verdict.

```
Topic: "<topic>"

Is this topic broad enough to support all three of:
(a) at least one named framework or model,
(b) a meaningful decision-guide for practitioners (multiple valid paths),
(c) at least one worked example or case study.

Return one of:
- "rich" — supports all three; a useful map can be built.
- "narrow-by-design" — a real topic, but supports at most (a) or (c); no meaningful
   decision-guide exists because there are no live tradeoffs. Still useful, just
   shape-different.
- "thin" — too narrow to support any of the three. ALSO return 2–3 broader reframings
   the user could pick from (each a real, broader topic — not a rephrasing).

Output JSON only:
{"verdict": "rich"|"narrow-by-design"|"thin",
 "rationale": "<1 sentence>",
 "reframings": ["...", "...", "..."]   // present only when verdict == "thin"
}
```

The verdict is a **signal, not a decision.** This file does not branch on it. The
consuming skill reads `intake.verdict` and applies its own reaction (e.g. one skill may
reframe a `thin` topic; another may proceed with a smaller honest output).

## Emitted intake result

After this file runs, the calling skill holds:

```
intake = {
  depth:     brief | standard | deep,
  audience:  senior-pms | all-pms,
  verdict:   rich | narrow-by-design | thin,
  rationale: "<1 sentence>",
  reframings: ["...", ...]   // only when verdict == thin
}
```

These values are held in working memory (this substrate is inlined guidance, not a
file-producing step). Hand `depth` to `canon-discovery.md` and `sourcing.md` (via the
dial matrix), `verdict`/`reframings` to the calling skill's reaction.
