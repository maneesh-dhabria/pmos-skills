# Article schema & outputs (reference)

The shape of a `/playbook` case-study article. Loaded on demand by the Synthesize phase.

## Self-sufficiency rule (FR-50)

The reader has **no access to the author's repo**. Every artifact the article references must be
embedded inline (excerpts, screenshots). The reader must be able to replicate the approach
without opening a single repo file.

## Sections (in order)

1. **TL;DR** — 2–3 sentences: the problem and what AI-assisted approach solved it.
2. **The problem** — the concrete PM problem, in PM language (translate engineering specifics).
3. **How I framed it** — the initial framing / job-to-be-done.
4. **Starting prompts** — a "steal-these" gallery of the **verbatim** prompts the author opened
   with (≥1; the literal first human message of the thread).
5. **How the idea was refined** — the back-and-forth: what changed and why.
6. **Research / exploration done** — what was investigated, what was learned.
7. **Decision ledger** — a table: `Decision | Alternatives weighed | What I chose & why`. The
   highest-value section for a replicating reader.
8. **Artifact excerpts** — inline quoted snippets of what was produced (spec/wireframe/code), so
   the reader sees what "good output" looked like.
9. **Screenshots** — embedded images of visual artifacts (see anonymizer.md for the review gate).
10. **Skills used** — an ordered provenance strip: which skills/tools, in what order, with a
    one-line "why this here" each.
11. **Takeaway for PMs** — the transferable lesson; how a peer applies it to their own problem.

## Quality gate (FR-51)

A synthesized article MUST contain **≥3 real prompts** AND **≥1 decision-ledger row with real
alternatives**. A draft missing either is regenerated; if the source thread genuinely lacks the
material, the candidate is reported as thin rather than padded with invented content.

## Voice

PM-to-PM, concrete, humble. No unexplained engineering jargon — translate ("the AI equivalent of
a PRD review gate"). Never invent prompts, decisions, or outcomes that aren't in the logs.

## Tweet / thread (FR-53)

Emit `tweet-thread.md`: a single standalone tweet (the hook + the one transferable lesson) AND a
numbered tweet-thread (5–8 tweets) distilling problem → approach → key decision → takeaway. v1
emits the HTML article + this tweet file only; markdown/Substack and LinkedIn variants are
deferred post-v1.

## Output layout (FR-70, FR-71)

One folder per playbook:

```
{docs_path}/playbooks/{YYYY-MM-DD}_<slug>/
  index.html              # the article (from artifact-template.html)
  index.sections.json     # built via _shared/html-authoring/assets/build_sections_json.js
  screenshots/            # captured images (or empty if degraded)
  tweet-thread.md
  REVIEW-BEFORE-SHARING.md
  assets/                 # copied HTML substrate (style.css, viewer.js, comments.*, launchers)
```

Slug = kebab of the thread topic (≤4 words). If the folder exists → prompt overwrite / suffix /
cancel. Atomic temp-then-rename writes; `?v=<plugin-version>` cache-bust on asset URLs;
`<meta name="pmos:skill" content="playbook">` in `<head>`.
