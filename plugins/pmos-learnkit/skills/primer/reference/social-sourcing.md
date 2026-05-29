# Social sourcing — tweets, threads, and LinkedIn posts as primary sources

**Contents**

- [When social counts as a primary source](#when-social-counts-as-a-primary-source)
- [Active + bounded discovery](#active--bounded-discovery)
- [Tweet fetch ladder](#tweet-fetch-ladder)
- [LinkedIn fetch ladder](#linkedin-fetch-ladder)
- [Playwright MCP — last resort only](#playwright-mcp--last-resort-only)
- [Citation discipline](#citation-discipline)
- [Recording in sources.json](#recording-in-sourcesjson)
- [Never do this](#never-do-this)

Phase-2 (Research) of `/primer` treats tweets/threads and LinkedIn posts as valid **primary** sources when a framework or observation lives only there — many practitioners publish their sharpest thinking as a thread or a post and never write it up anywhere fetchable by a normal web crawl. This reference codifies how to discover and fetch that material for free, what URL to cite, and the paraphrase-only rule that keeps the artifact inside the rubric's trust tier. Depth-1 reference — self-contained, no chains to other `reference/*.md`.

## When social counts as a primary source

A tweet/thread or LinkedIn post is a primary source when **the framework, observation, or data lives only there** — i.e., the canonical articulation is the post itself, not a blog/podcast that merely links to it. Treat it exactly like any other primary source: it must clear the usable-source definition in `source-floor.md` (fetched successfully, >500 chars of non-boilerplate text once unrolled, semantically on-topic), and it counts toward the depth-tier source-floor.

Do **not** reach for social when an equally-canonical long-form source exists — a practitioner's own blog post or a podcast transcript is easier to fetch and quote. Social is for the material that has no long-form home.

## Active + bounded discovery

Plain web search deprioritizes social posts, so social-only frameworks rarely surface on their own. Phase 2 therefore searches for them deliberately, but bounded so it does not add noise on topics where social contributes nothing:

- **Topic-level (≤2 searches).** `WebSearch` for `<topic> framework (site:x.com OR site:linkedin.com)` and `<topic> (site:linkedin.com/posts)`.
- **Per named practitioner (≤1 search each).** For each practitioner from the Phase-2 Step-0 naming step, `WebSearch` for `<name> <topic> (site:x.com OR site:linkedin.com)`.
- **Opportunistic.** Any `x.com` / `twitter.com` / `linkedin.com` URL that surfaces from a normal strand-(a) or strand-(b) query is also a social candidate — route it through the ladder below rather than a bare `WebFetch`.

**Depth-tier behavior.** At `--depth deep`, the social searches run to completion (thoroughness over latency, matching the deep-tier no-short-circuit rule in `source-floor.md`). At `brief` / `standard`, social discovery obeys the same short-circuit/bounding as the other strands — once the source-floor is comfortably met by faster strands, pending social searches may be best-effort cancelled.

## Tweet fetch ladder

A bare `x.com` / `twitter.com` URL returns an empty body behind a login wall, and the official X API is paid. Use this free ladder instead. Extract `<user>` and `<id>` from any `https://x.com/<user>/status/<id>` (or `twitter.com`) URL — the trailing numeric segment is `<id>`, the path segment before `status` is `<user>`.

1. **Single tweet.** `WebFetch https://api.fxtwitter.com/<user>/status/<id>` — returns the tweet text (and quoted/replied context) as clean JSON/markdown.
2. **Thread (multi-tweet).** `WebFetch https://threadreaderapp.com/thread/<root-tweet-id>.html` — returns the unrolled thread when ThreadReaderApp has unrolled it.
3. **Thread not unrolled.** If ThreadReaderApp has no unroll for that root id, walk the self-reply chain manually via fxtwitter: fetch the root via step 1, then follow each `replies`/next-tweet id in the same author's chain, fetching each via `https://api.fxtwitter.com/<user>/status/<reply-id>`, until the chain ends. Concatenate the paraphrased takeaways.

If all of the above fail for a thread nobody has unrolled, fall to Playwright (below).

## LinkedIn fetch ladder

1. **Direct.** `WebFetch <post-url>` (the canonical `https://www.linkedin.com/posts/<…>` URL). Public posts often return usable body text directly.
2. **Reader fallback.** If the direct fetch returns empty/boilerplate, `WebFetch https://r.jina.ai/<post-url>` (Jina reader proxy) — prepend `https://r.jina.ai/` to the full canonical post URL.
3. **Member-only.** If both fail (member-only / gated post), fall to Playwright (below).

LinkedIn is fetched **body-only** — capture the post text, ignore the surrounding feed/profile chrome. LinkedIn renders **relative dates** (`2mo`, `1yr`, `3w`); resolve these to the absolute **year** for the takeaway and any in-prose attribution (e.g., "1yr" on a primer authored in 2026 → cite as 2025). When the year cannot be determined confidently, attribute without a year rather than guessing.

## Playwright MCP — last resort only

`mcp__plugin_playwright_playwright__*` (browser automation) is the **last resort**, used only for:

- X threads that nobody has unrolled (ThreadReaderApp miss **and** the self-reply walk via fxtwitter failed).
- LinkedIn member-only posts that neither the direct fetch nor the Jina reader could retrieve.

It is slow and may require an interactive session; never reach for it before the free ladders above. If Playwright is unavailable in the session, drop the source silently (it is not usable) rather than blocking.

## Citation discipline

- **Cite the original canonical URL.** The `<a href>` and the `sources.json[].url` entry MUST be the original human-clickable post URL — `https://x.com/<user>/status/<id>` or the LinkedIn `https://www.linkedin.com/posts/<…>` URL. The fxtwitter / threadreaderapp / r.jina.ai URL is a **fetch mechanism only** and MUST NOT appear as the citation. This keeps rubric R1 (`cites-real-urls`) passing — the href is a verbatim member of `sources.json[].url`.
- **Always paraphrase — never reproduce verbatim.** Capture the post's point as a 1–2 sentence paraphrased `takeaway`; the draft cites that paraphrase with a link to the canonical URL. Do not lift the post's wording sentence-for-sentence. This is both an etiquette/licensing matter for social content and a reinforcement of rubric R2 (`no-plagiarism`) — an unattributed verbatim run of ≥15 words hard-fails the run.
- **Attribute the author in prose.** Name the person and platform ("as Shreyas Doshi noted in a 2024 X thread") so the curator voice (R10) stays intact.

## Recording in sources.json

Each accepted social source records, per the `source-floor.md` §"sources.json schema":

- `url` — the **original canonical** post URL (not the proxy).
- `tier: "primary"`.
- `source_strand: "social"`.
- `takeaway` — the paraphrased 1–2 sentence summary (never the verbatim post body).
- `title` — author + short descriptor where derivable (e.g., `"Shreyas Doshi — X thread on LNO framework"`), else null.

## Never do this

- **Never** fetch a tweet via the paid X API. The free ladder above is the only sanctioned path.
- **Never** `WebFetch` a bare `x.com` / `twitter.com` URL expecting content — the login wall returns an empty body. Always go through fxtwitter / threadreaderapp.
- **Never** cite the fetch-proxy URL (`api.fxtwitter.com`, `threadreaderapp.com`, `r.jina.ai`) — cite the original canonical post URL.
- **Never** reproduce tweet or LinkedIn post text verbatim in the draft — paraphrase into the takeaway and cite the source. Verbatim reproduction is a trust-tier (R2) violation.
- **Never** reach for Playwright before exhausting the free ladders.
