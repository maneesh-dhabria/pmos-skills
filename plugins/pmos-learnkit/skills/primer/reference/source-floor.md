# Source-floor protocol, retry-once, sources.json, and degraded modes

**Contents**

- [Source floor = 4](#source-floor--4)
- [Retry-once protocol](#retry-once-protocol)
- [sources.json schema](#sourcesjson-schema)
- [Thin-source disclosure](#thin-source-disclosure)
- [WebFetch unavailable (FR-5.4)](#webfetch-unavailable-fr-54)

Phase-2 (Research) of `/primer` must accumulate enough usable sources before a draft is worth writing. This reference codifies the source-floor gate, the retry-once protocol, the `sources.json` schema the curator and reviewer both read, and the two degraded modes (thin-source disclosure, WebFetch unavailable). Depth-1 reference — self-contained, no chains to other `reference/*.md`.

## Source floor = 4

Phase 2 dispatches two source-discovery strands in parallel:

- `context7:resolve-library-id` (library/framework docs lookup).
- `WebFetch` against 6–10 candidate URLs derived from the topic.

**Short-circuit rule.** The first strand to return ≥3 usable sources short-circuits the other — the orchestrator cancels (or drops on arrival) the pending fetches from the slower strand. This keeps Phase-2 latency bounded on well-covered topics.

**"Usable source" definition.** A source is usable iff all three hold:

1. URL fetched successfully (HTTP 2xx, no fetch error).
2. Response body > 500 chars of non-boilerplate text (strip nav/footer/cookie-banner chrome before measuring).
3. Semantically on-topic — the orchestrator judges this against the resolved topic string; off-topic SEO pages and tangential hits are rejected.

**Gate trigger.** After both strands settle (or one short-circuits the other), count usable sources. If `count < 4`, fire the source-floor gate.

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
  "fetched_at": "<ISO-8601 timestamp>",
  "sources": [
    {
      "url": "<verbatim URL fetched>",
      "title": "<page title or null>",
      "fetched_at": "<ISO-8601 per-source>",
      "byte_size": <int>,
      "takeaway": "<1-2 sentence summary the draft can cite>",
      "tier": "primary" | "secondary"
    }
  ],
  "rejected": [
    {"url": "<url>", "reason": "fetch_error" | "off_topic" | "too_short" | "boilerplate"}
  ]
}
```

**Location and write semantics.** The file lives at `{docs_path}/primer/{date}_{slug}.sources.json` and is written atomically alongside the HTML artifact (write to temp path, then rename).

**Canonical citation key.** `sources[].url` is the canonical citation key. Every inline `<a href=...>` in the final HTML artifact MUST point to one of these URLs. The reviewer's `cites-real-urls` check enforces this — any href not present in `sources[].url` is a hard fail.

## Thin-source disclosure

When the user chooses **Continue with thin-source disclosure**, the artifact ships with a footer banner immediately above the existing attribution footer.

**Banner requirements.**

- Inline CSS only (no JS, no external stylesheet) — the banner must render in the artifact as-shipped, even when opened offline.
- Light-yellow background, dark-yellow border. Suggested inline style:
  `style="background:#fff8d6;border:1px solid #c8a800;padding:0.75rem 1rem;margin:1rem 0;border-radius:4px;"`
- Banner text (substitute `<N>` with the actual usable-source count):

  > Note: this primer was assembled from `<N>` sources (below the source-floor of 4). Treat conclusions as preliminary; the underlying topic may not yet have a stable knowledge base.

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
