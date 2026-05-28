# Source-floor protocol, retry-once, sources.json, and degraded modes

**Contents**

- [Source floor by depth tier](#source-floor-by-depth-tier)
- [Retry-once protocol](#retry-once-protocol)
- [sources.json schema](#sourcesjson-schema)
- [Thin-source disclosure](#thin-source-disclosure)
- [WebFetch unavailable (FR-5.4)](#webfetch-unavailable-fr-54)

Phase-2 (Research) of `/primer` must accumulate enough usable sources before a draft is worth writing. This reference codifies the source-floor gate, the retry-once protocol, the `sources.json` schema the curator and reviewer both read, and the two degraded modes (thin-source disclosure, WebFetch unavailable). Depth-1 reference — self-contained, no chains to other `reference/*.md`.

## Source floor by depth tier

Phase 2 dispatches up to three source-discovery strands in parallel:

- **(a) Primary practitioner+book strand** — for each named practitioner from the Phase-2 Step-0 naming step, queries `<practitioner> <topic>`. For each named book/course, queries `<book title> free entry point` and `<author> <topic>` (targets: First Round Review, Lenny, podcast transcripts, author blogs, publisher excerpts).
- **(b) Secondary topic-frame strand** — `WebFetch` against 6–10 candidate URLs derived from topic frames (`<topic> overview`, `<topic> best practices`, etc.). Demoted relative to strand (a): its sources count toward the floor ONLY AFTER strand (a) settles. No early short-circuit on strand (b).
- **(c) Context7 strand** — `context7:resolve-library-id` (library/framework docs lookup). Unchanged.

**Short-circuit rule.** Strand (a) or strand (c) returning ≥3 usable sources before strand (b) settles does NOT short-circuit strand (b) when the resolved depth tier is `deep` — at deep tier the secondary strand always runs to completion. At `brief` / `standard`, the short-circuit rule applies as before to bound latency.

**"Usable source" definition.** A source is usable iff all three hold:

1. URL fetched successfully (HTTP 2xx, no fetch error).
2. Response body > 500 chars of non-boilerplate text (strip nav/footer/cookie-banner chrome before measuring).
3. Semantically on-topic — the orchestrator judges this against the resolved topic string; off-topic SEO pages and tangential hits are rejected.

**Depth-tier floor table.** The threshold the gate compares against is depth-tier-dependent — read the resolved depth from `state.depth` (set by /primer Phase 0 resolution per S-FR-8.1):

| Depth    | Floor | Rationale                                                  |
|----------|-------|------------------------------------------------------------|
| brief    | 6     | Above the legacy floor of 4; appropriate for narrow topics |
| standard | 10    | Floor for typical senior-PM ramp-up topics                 |
| deep     | 15    | Forces practitioner-by-practitioner coverage of broad topics |

**Gate trigger.** After all strands settle (or strand (a)/(c) short-circuits strand (b) at brief/standard tier), count usable sources merged across strands. If `count < floor`, fire the source-floor gate.

**Gate options (`AskUserQuestion`).**

- **Abort (Recommended)** — exit cleanly. User must broaden the topic or return when more sources exist. Phase-2 work is discarded.
- **Continue with thin-source disclosure** — proceed with the <4 sources; the final artifact gets a thin-source footer banner (see §Thin-source disclosure).
- **Retry with alternate query frame** — single retry (see §Retry-once protocol). On retry-fail, the gate re-surfaces *without* this option.

The orchestrator MUST tag this prompt with `<!-- defer-only: ambiguous -->` because Abort is destructive (loses Phase-2 work) AND the choice is ambiguous (only the user can judge how thin is too thin for their use case).

## Retry-once protocol

Exactly one retry is permitted per Phase-2 invocation. On retry:

1. The orchestrator reformulates the search frame — narrower, broader, or rephrased (e.g., `"feature flagging architecture"` → `"feature flagging implementation patterns"`).
2. The reformulation is shown to the user inline before re-dispatch, so they can sanity-check the new framing.
3. Both strands re-dispatch under the new frame.
4. If the retry still yields `<4` usable sources, the gate re-surfaces with only **Abort** and **Continue with thin-source disclosure** — the Retry option is removed.

The retry counter is per-`/primer`-invocation; it does not persist across re-runs of the skill.

## sources.json schema

Verbatim from FR-5.3:

```json
{
  "topic": "<resolved topic string>",
  "audience": "senior-pms" | "all-pms",
  "depth": "brief" | "standard" | "deep",
  "fetched_at": "<ISO-8601 timestamp>",
  "practitioner_index": [
    {
      "name": "<practitioner|author|institution|book title>",
      "kind": "practitioner" | "book" | "course",
      "why_canonical": "<one-line note>",
      "queries_dispatched": ["<q1>", "<q2>"],
      "usable_source_count": <int>,
      "dropped": <bool>
    }
  ],
  "sources": [
    {
      "url": "<verbatim URL fetched>",
      "title": "<page title or null>",
      "fetched_at": "<ISO-8601 per-source>",
      "byte_size": <int>,
      "takeaway": "<1-2 sentence summary the draft can cite>",
      "tier": "primary" | "secondary",
      "source_strand": "practitioner" | "topic-frame" | "context7"
    }
  ],
  "rejected": [
    {"url": "<url>", "reason": "fetch_error" | "off_topic" | "too_short" | "boilerplate"}
  ]
}
```

**`practitioner_index` field semantics (new in v0.2.0).** The Phase-2 Step-0 practitioner+book naming step writes this array. Each entry that ended with zero usable resolved sources has `dropped: true` and is excluded from citations — its name MUST NOT appear in the draft prose or in any `<a href>` attribution. Dropped entries are RETAINED in the array (not removed) for audit, with their `queries_dispatched` preserved so the OQ-buffer log entry (`reason: practitioner-unresolved`) is reproducible. The `source_strand` field on each accepted source records which strand surfaced it — primary (`practitioner`), secondary (`topic-frame`), or `context7`.

**Location and write semantics.** The file lives at `{docs_path}/primer/{date}_{slug}.sources.json` and is written atomically alongside the HTML artifact (write to temp path, then rename).

**Canonical citation key.** `sources[].url` is the canonical citation key. Every inline `<a href=...>` in the final HTML artifact MUST point to one of these URLs. The reviewer's `cites-real-urls` check enforces this — any href not present in `sources[].url` is a hard fail.

## Thin-source disclosure

When the user chooses **Continue with thin-source disclosure**, the artifact ships with a footer banner immediately above the existing attribution footer.

**Banner requirements.**

- Inline CSS only (no JS, no external stylesheet) — the banner must render in the artifact as-shipped, even when opened offline.
- Light-yellow background, dark-yellow border. Suggested inline style:
  `style="background:#fff8d6;border:1px solid #c8a800;padding:0.75rem 1rem;margin:1rem 0;border-radius:4px;"`
- Banner text (substitute `<N>` with the actual usable-source count):

  > Note: this primer was assembled from `<N>` sources (below the source-floor of `<floor>` for the `<depth>` tier). Treat conclusions as preliminary; the underlying topic may not yet have a stable knowledge base.

- Placement: directly above the attribution footer, never above the article body.

**Artifact frontmatter note.** The artifact's frontmatter MUST include:

```
**thin-source:** true
```

This lets downstream tools (and `/verify`) distinguish a thin-source primer from a full-floor primer without parsing the HTML body.

## WebFetch unavailable (FR-5.4)

If the `WebFetch` tool is not available in the current harness session, Phase-2 degrades as follows:

- **context7 still available** — Phase-2 runs as context7-only. The source-floor (≥4) still applies; if context7 alone cannot meet it, the standard source-floor gate fires (Abort / Continue-with-thin-source / Retry).
- **context7 ALSO unavailable** — surface an *early* gate *before* Phase-2 begins, with two options:
  - **Abort (Recommended)** — exit cleanly; no artifact is written.
  - **Continue with no sources (NOT recommended)** — the artifact is produced as an uncited draft.

**Uncited-draft behavior (Continue with no sources).**

- The artifact is written with a **red** banner above the attribution footer (red border, light-red background — e.g. `style="background:#fde2e2;border:1px solid #b00020;padding:0.75rem 1rem;margin:1rem 0;border-radius:4px;"`).
- Banner text: marks the artifact as an uncited draft and warns that no source-fetching tool was available.
- Frontmatter MUST include `**uncited-draft:** true`.
- The reviewer's `cites-real-urls` check resolves to N/A-fail — the trust-tier hard-block fires, and the artifact ships only via the FR-RECOVERY draft path (no normal-path ship).
