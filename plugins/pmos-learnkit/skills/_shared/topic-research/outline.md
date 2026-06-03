# outline.md — derive the topic outline (cascade + provenance + dedupe)

Shared, skill-agnostic. Turn the canon set into a topic outline an expert would
recognize, with its provenance always shown. Inline this file and follow it; it emits
an ordered, deduped outline plus the provenance rung that produced it. **This file
knows nothing about which skill inlines it.**

## Contents

- Cascade derivation
- Provenance rung
- Dedupe before downstream
- Confirm gate
- Emitted outline

## Cascade derivation

Derive the outline by cascade, taking the first rung that fires:

1. **Canonical consensus** — where ≥2 canonical sources/books agree on a structure, use
   it.
2. **Curation consensus** — else, the consensus structure across the harvested curations
   (`canon.curations[].recurring_entries`).
3. **Best-effort** — else, your own first-principles outline, explicitly tagged
   `provisional — no settled canon found`.

Size the outline to the depth row in `intake.md`'s dial matrix (brief 3–5, standard
5–8, deep 8–12 topics).

## Provenance rung

Record which rung produced the outline — `canonical-consensus`, `curation-consensus`,
or `provisional`. The consuming skill surfaces this in its artifact (e.g. a TL;DR
line) so a reader knows how settled the structure is. Provenance is a required part of
the emitted result.

## Dedupe before downstream

**Dedupe topics before any downstream work** (sourcing, fan-out, synthesis) — never
source or process the same topic twice. Merge near-duplicate topics into one; a deduped
outline is the contract the rest of the pipeline relies on.

## Confirm gate

Present the derived outline (with its provenance rung) and let the user add / drop /
reorder topics before the expensive sourcing step — confirming first is cheap insurance
against sourcing the wrong topics.

> Outline ready (provenance: `<rung>`). **Looks good, proceed (Recommended)** /
> **Edit the outline** (user supplies changes next turn).

Non-interactive runs auto-proceed; log `outline-gate: auto-proceeded (non-interactive)`.

## Emitted outline

After this file runs, the calling skill holds:

```
outline = {
  topics:         ["<topic 1>", "<topic 2>", ...],   // ordered, deduped, sized to depth
  provenance_rung: canonical-consensus | curation-consensus | provisional
}
```

Hand `topics` to `sourcing.md` (one rank-then-verify pass per topic) and surface
`provenance_rung` in the calling skill's output.
