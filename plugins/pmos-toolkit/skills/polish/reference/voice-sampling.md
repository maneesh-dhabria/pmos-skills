# Voice sampling

The voice marker block is the author's stylistic fingerprint. It's sampled ONCE in Phase 1 from the original document and prepended to every patch prompt in Phase 5. It is NEVER re-sampled between iterations — anchoring to the original prevents iterative voice drift.

## Algorithm

1. **Identify polishable prose regions.** Skip headings, lists, tables, fenced code, inline code, frontmatter, link URLs, footnote refs, Notion placeholders.
2. **Find the densest 200-word contiguous passage.** "Densest" = longest unbroken run of polishable prose. If multiple ties, pick the first.
3. **If <200 words of polishable prose exist anywhere**, sample whatever is available and set `low_confidence: true` on the marker block.
4. **Compute markers** (see table below).
5. **Serialize as JSON** and store for the rest of the run.

## Markers

| Marker                  | How extracted                                                          | Notes                                  |
|-------------------------|------------------------------------------------------------------------|----------------------------------------|
| `avg_sentence_length`   | Word count ÷ sentence count                                            | Use simple `[.!?]` boundary heuristic  |
| `sentence_length_stddev`| StdDev across sentences in the sample                                  | 0 if <2 sentences                      |
| `register`              | LLM tag (single call)                                                  | `formal | conversational | technical | casual` |
| `person`                | Dominant pronoun usage in the sample                                   | `first | second | third`               |
| `idiomatic_phrases`     | LLM extracts up to 5 distinctive author phrases (verbatim, ≤6 words)   | Empty array if none distinctive        |
| `contraction_rate`      | Contractions ("don't", "we're", etc.) ÷ total verbs                    | 0.0 if no verbs                        |
| `low_confidence`        | `true` if <200 polishable words; `false` otherwise                     | Exempts the run from the voice-conflict abort cap (`reference/patch-contract.md`) |

## Marker extraction LLM prompt (single call, returns JSON)

```
Below is a 200-word passage from a document. Analyze it and return JSON ONLY:

{
  "register": "formal" | "conversational" | "technical" | "casual",
  "person": "first" | "second" | "third",
  "idiomatic_phrases": [up to 5 distinctive phrases, ≤6 words each, verbatim from the passage]
}

Passage:
<200-word sample>
```

Reject malformed responses; on second failure, fall back to defaults: `{register: "conversational", person: "third", idiomatic_phrases: []}`.

## Final voice marker block (example)

```json
{
  "avg_sentence_length": 14.3,
  "sentence_length_stddev": 6.1,
  "register": "conversational",
  "person": "first",
  "idiomatic_phrases": [
    "the trick is",
    "as it turns out",
    "give it a minute",
    "no surprise there"
  ],
  "contraction_rate": 0.34,
  "low_confidence": false
}
```

## How patches use the markers

The patch generator receives the JSON above and instruction:

> *"Preserve these voice markers when fixing the violation. Match avg sentence length within ±25%, match register and person exactly, prefer rewrites that use the listed idiomatic phrases when natural. If preserving the markers conflicts with fixing the violation, output `PRESERVE_VOICE_CONFLICT` followed by `{conflicting_marker: <key>, reason: <one sentence>}`. Do not silently flatten voice."*

## Low-confidence runs

When `low_confidence: true`:
- The patch prompt receives an additional caveat: *"Voice markers are derived from a small sample and may not fully represent author style."*
- `PRESERVE_VOICE_CONFLICT` emissions in this run do NOT count toward the 30% abort cap (see `reference/patch-contract.md` — the markers are unreliable on small samples).
- Test fixtures use `low_confidence: true` to assert the exemption works.
