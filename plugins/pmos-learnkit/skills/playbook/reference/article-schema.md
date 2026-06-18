# Evolution article schema & outputs (reference)

The shape of a `/playbook` **evolution** article — the story of how one repo (or one skill inside
it) came to be what it is today. Loaded on demand by the Synthesize phase.

## Contents

- Self-sufficiency rule
- Sections (in order) — the evolution schema
- Voice
- Pre-emit self-check
- Tweet / thread
- Output layout

## Self-sufficiency rule (FR-50)

The reader has **no access to the author's repo**. Every artifact the article references must be
embedded inline (excerpts, screenshots). The reader follows the whole arc without opening a
single repo file.

## Sections (in order) — the evolution schema

1. **What this is** *(mandatory, first, cold-reader)* — 2–4 sentences a stranger can read with
   zero prior context: what the repo/skill *is today*, who it's for, and that what follows is the
   story of how it got there. No insider nouns left undefined. This section is what makes the
   article self-contained; a draft that opens mid-story fails the self-check below.

2. **One section per milestone** — the spine (`reference/evolution-sources.md`), in date order.
   Each milestone section:
   - has a **plain, descriptive title** a stranger understands (the thing that changed, not an
     internal codename or epic id);
   - is anchored on **1–2 inflection decisions** — the choices that bent the arc, not a changelog
     dump of everything that shipped;
   - quotes the **verbatim opening prompt** of the session that drove it, *in the narrative*
     ("The author opened with: …") — never invented, never paraphrased into a fake quote;
   - carries a **"Where the pipeline mattered"** callout that names the actual pmos skill(s) used
     at this milestone (e.g. `/spec`, `/grill`, `/feature-sdlc`) and what each did for the
     decision. If no pmos skill was used at a milestone, omit the callout — never fabricate one.

   A milestone with no attributable session still gets a section, grounded in its design doc, and
   says plainly that it leans on the committed record rather than a captured prompt.

3. **How the pipeline shaped the whole arc** — one cross-cutting section stepping back from the
   per-milestone detail: the recurring way the author + the pmos pipeline worked, the patterns
   that repeated across milestones, what the tooling made easy or hard. This is the transferable
   layer for a peer.

4. **Where it stands / what's next** — a **short, understated** close: where the repo/skill is
   now and the honest open edges. No grand summary, no "key takeaways" listicle — the lesson is
   implied by the arc, not announced.

## Voice (FR-52)

Four rules, all enforced by the self-check:

1. **Plain titles** — every section title reads to a stranger. No internal epic ids, branch
   names, or codenames as titles.
2. **Cold-reader context** — the first time any insider noun appears (a skill name, a subsystem,
   a house term), it is defined in-line in one clause. Assume the reader has never seen the repo.
3. **Understated voice** — report what happened and what was decided; let the work speak. No hype
   ("revolutionary", "game-changing"), no self-congratulation, no manufactured drama.
4. **Implied lesson** — the takeaway is carried by the narrative arc, not stated as a bulleted
   "lessons learned" section. Trust the reader.

Never invent prompts, decisions, milestones, or outcomes that aren't in the sources. A verbatim
quote is verbatim; if the logs don't have it, the section says so rather than fabricating one.

## Pre-emit self-check (FR-51) — binary, all must pass

Before emit, verify each — a draft failing any item is revised (or the gap is stated in the
article), never shipped silently:

- [ ] **"What this is" is first** and is readable cold by a stranger.
- [ ] **Every milestone section has a plain title** (no codename/epic-id/branch-name titles).
- [ ] **Every milestone with an attributable session quotes its opening prompt verbatim**
      (in-narrative); milestones without one say so.
- [ ] **Every "Where the pipeline mattered" callout names a real pmos skill** actually used at
      that milestone (none fabricated; absent where no skill was used).
- [ ] **The cross-cutting "How the pipeline shaped the whole arc" section is present.**
- [ ] **No invented content** — every quote, decision, and date traces to a source.
- [ ] **Voice rules hold** (plain titles · cold-reader context · understated · implied lesson).

## Tweet / thread (FR-53)

Emit `tweet-thread.md`: a single standalone tweet (the hook + the one transferable lesson about
how the thing evolved) AND a numbered tweet-thread (5–8 tweets) tracing the arc → a couple of
inflection decisions → where the pipeline mattered → where it stands. v1 emits the HTML article +
this tweet file only; markdown/Substack and LinkedIn variants are deferred post-v1.

## Output layout (FR-70, FR-71)

**One folder per run** — the evolution of one repo or one skill:

```
{docs_path}/playbooks/{YYYY-MM-DD}_<repo-or-skill>-evolution/
  index.html              # artifact-template.html fragment rendered through
                          # _shared/html-authoring/template.html + render.js
                          # (inlines CSS/JS overlay + pmos-comments block)
  index.sections.json     # built via _shared/html-authoring/assets/build_sections_json.js
  screenshots/            # captured images (or empty if degraded)
  tweet-thread.md
  REVIEW-BEFORE-SHARING.md
  assets/                 # copied substrate launchers + serve.js (write-mode
                          # comments); CSS/JS are already inlined by render.js
```

Slug = kebab of the repo basename (or the skill name) + `-evolution` (e.g.
`poker-coach-evolution`, `playbook-evolution`). If the folder exists → prompt overwrite / suffix /
cancel. Atomic temp-then-rename writes; `?v=<plugin-version>` cache-bust on asset URLs;
`<meta name="pmos:skill" content="playbook">` is supplied by the substrate's `pmos_skill` token
(pass `pmosSkill: 'playbook'`).
