# Spec + Plan — /primer social sourcing (tweets + LinkedIn)

**Mode:** skill-feedback (streamlined-inline) · **Tier:** 2 · **Target:** `/primer` (pmos-learnkit) · **Date:** 2026-05-29

Acceptance criteria standing reference: `reference/skill-patterns.md §A–§F` (skill must remain conformant).

## Problem

`/primer` Phase 2 (Research) discovers sources via three strands — (a) practitioner, (b) topic-frame, (c) context7 — all fetched through `WebFetch`/`context7`. Frameworks and observations that live **only** on X (tweets/threads) or LinkedIn posts are unreachable: a bare `x.com` WebFetch hits a login wall and returns empty, and plain web search deprioritizes social posts. There is no sanctioned, free way to fetch a tweet thread or a LinkedIn post as a primary source.

## Solution

Treat tweets/threads and LinkedIn posts as a valid **primary source type** in Phase 2, discovered actively-but-bounded and fetched via a free ladder. Cite the original canonical post URL; always paraphrase, never reproduce verbatim.

## Functional requirements

- **FR-SOC-1 — Social as primary source type.** Phase 2 may accept tweets/threads and LinkedIn posts as primary sources (`tier: primary`, `source_strand: social`) when a framework or observation lives only there. They count toward the source-floor like any other usable source (subject to the usable-source definition in `source-floor.md`).

- **FR-SOC-2 — Active + bounded discovery.** A social-discovery sub-step runs within Phase 2:
  - ≤2 topic-level qualifier searches: `<topic> framework (site:x.com OR site:linkedin.com)` and `<topic> (site:linkedin.com/posts)`.
  - ≤1 per named practitioner (from Step 0): `<name> <topic> (site:x.com OR site:linkedin.com)`.
  - Any `x.com` / `twitter.com` / `linkedin.com` URL that surfaces from strand (a) or (b) normal queries is also a social candidate.
  - At `--depth deep`, social searches run to completion; at brief/standard they obey the same short-circuit/bounding as the other strands.

- **FR-SOC-3 — Fetch ladder (free; never paid X API; never bare x.com).** Every social candidate is fetched via the ladder in `reference/social-sourcing.md`:
  - Single tweet → `WebFetch https://api.fxtwitter.com/<user>/status/<id>`.
  - Thread → `WebFetch https://threadreaderapp.com/thread/<root-tweet-id>.html`; if not unrolled, walk the self-reply chain via fxtwitter (fetch each reply by id).
  - LinkedIn post → direct `WebFetch <post-url>` → `WebFetch https://r.jina.ai/<post-url>` fallback.
  - Playwright MCP is **last resort only** (un-unrolled X threads; LinkedIn member-only posts).
  - NEVER the paid X API; NEVER a bare `x.com` WebFetch (login wall → empty body).

- **FR-SOC-4 — Citation discipline.** Store and cite the **original canonical URL** (`x.com/<user>/status/<id>` or the LinkedIn post URL), never the fetch-proxy URL. Always paraphrase into the `takeaway`; never reproduce post text verbatim (reinforces rubric R2 no-plagiarism). LinkedIn is fetched **body-only**; relative dates (`2mo`, `1yr`) are resolved to the absolute **year** in the takeaway/citation.

- **FR-SOC-5 — Schema + floor.** `source-floor.md`: the `source_strand` enum gains `"social"`; the strand list documents the social-primary type; the usable-source definition notes that for social sources the stored `takeaway` is a paraphrase (never the verbatim body).

- **FR-SOC-6 — Anti-patterns + platform.** SKILL.md Anti-Patterns gain: never paid-API/bare-x.com fetch; never verbatim post text; never cite the proxy URL. Platform Adaptation notes Playwright MCP as the social last-resort.

## Non-goals

- No change to strands (b)/(c) behavior beyond social-URL routing.
- No rubric (`rubric.md`) changes — R1/R2 are source-type-agnostic and already enforce the citation/paraphrase contract.
- No new always-on 4th strand (rejected in triage — social discovery is bounded, not blanket).

## Plan / tasks (TDD where applicable; mostly prose-doc edits)

- **T1** — Create `reference/social-sourcing.md` (the ladder, never-do rules, citation discipline, URL-parsing helper, usable-source note). Depth-1 reference, self-contained.
- **T2** — Edit `SKILL.md` Phase 2: add the social-discovery sub-step + ladder reference + citation discipline + `source_strand: social` recording.
- **T3** — Edit `SKILL.md` Platform Adaptation (Playwright last-resort note) + Anti-Patterns (3 new bullets).
- **T4** — Edit `reference/source-floor.md`: strand list, `source_strand` enum, usable-source paraphrase note.
- **T5** — (release-prereq, complete-dev only) version bump pmos-learnkit 0.4.0 → 0.5.0 (minor; new capability), changelog, README. NOT an execute task.

## Verification

- skill-eval (Phase 6a): deterministic `[D]` + LLM-judge `[J]` against `skill-eval.md`.
- /verify (Phase 7): re-run skill-eval fresh; grep that SKILL.md cites `reference/social-sourcing.md`; confirm no rubric regression; confirm reference TOC/contents present.
- Manual: confirm the ladder URLs are well-formed and the never-do rules are explicit.
