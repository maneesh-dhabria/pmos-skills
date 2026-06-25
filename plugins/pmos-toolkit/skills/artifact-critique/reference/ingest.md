# Ingest — resolving and reading the doc (Phase 1)

The full extraction contract for `/artifact-critique` Phase 1. The goal of this phase is a clean **source
text + section map** in context that every later quote can cite verbatim — never a summary, never a silent
truncation. Everything downstream (the deep-dive quotes, the `E-quote-in-source` gate) depends on the text
read here being the *literal* doc.

## 1. Resolve the input

The first non-flag argument is the source. Resolve in this order:

| Input shape | How to read it |
|---|---|
| A file path ending `.md` / `.txt` / `.html` | Read the file directly. For `.html`, strip tags to text but keep heading structure for the section map. |
| A file path ending `.pdf` | Extract text per §3. |
| A **directory** (e.g. a Notion export) | Traverse per §2 — concatenate the doc's pages in their export order into one logical document. |
| A path ending in an image extension (`.png`/`.jpg`/…) | Read it as an image (Phase 1 of a screenshotted doc); transcribe the legible text. Unreadable regions → `limits[]` (Inv-5). |
| **Pasted content** (no resolvable path; the argument *is* the doc text) | Use it directly as the source text. Title = first heading, or a slug of the first line. |
| A URL | Fetch it (WebFetch or equivalent); treat the returned text as the source. If fetch is unavailable, say so and ask for a paste — never critique a doc you couldn't read. |

If the path does not resolve and the argument is too short to be a document (< ~200 chars, no headings), treat
it as a mis-typed path: report `could not resolve <arg> as a file, directory, or document` and stop — do not
critique a filename.

## 2. Notion-export / multi-file docs

A Notion export of one page is a folder: a top-level `.md` plus a sibling assets directory, and often
child-page `.md` files for sub-sections. Reconstruct the single logical document:

- The top-level `.md` (the one whose name matches the folder, minus the Notion hash suffix) is the spine.
- Inline-linked child `.md` files are appended **in link order** under their referencing heading, so the
  section map stays faithful to how a reader would traverse the page.
- Image/asset references that don't render are **named in `limits[]`**, not scored (Inv-5).
- A `.csv` database export embedded in the page is summarized as "a <N>-row table of <columns>" for the
  section map — its rows are data, not prose to quote, unless a specific cell is the load-bearing claim.

## 3. PDF / image handling

- Prefer a text-extraction read of the PDF. Keep page boundaries as section anchors (`§p3`) when the doc
  has no headings of its own.
- A **scanned / image-only PDF page** that yields no text → name it in `limits[]` ("page 4 is a scanned
  image — not transcribed") and critique the readable pages. Never infer an axis is `ABSENT` because its
  content might live on an unreadable page (Inv-5).
- An **embedded diagram / figure** that carries a claim (a funnel, a roadmap Gantt, a pricing table as an
  image) → transcribe what is legible; if it isn't, record "Figure N unreadable — may carry <axis>
  content" in `limits[]`.

## 4. Build the section map

Produce a stable **heading → `§N` ref** map so every quote in the critique can record its `quote_section`:

- Number sections by the doc's own heading hierarchy: `## 1. Problem` → `§1`, `### 2.1 …` → `§2.1`.
- Docs with no headings: fall back to page (`§p2`) or paragraph-ordinal (`§¶4`) anchors.
- The map is for *citation*, not navigation — it does not need to be exhaustive, only stable enough that
  a quote's section ref is unambiguous.

Record `char_count` (length of the extracted source text) and `source_path` for the findings `doc` block.

## 5. The full-context default, and the map-reduce fallback

**Default: read the whole doc into context.** Single-pass axis scoring (Phase 3) depends on one reviewer
holding the entire document at once — cross-axis reasoning (a Metrics gap that undercuts the Strategy
claim) only works when the whole thing is in view. Most product docs fit comfortably.

**Only when the doc genuinely exceeds the context limit**, fall back to a **map-reduce evidence pass** —
never a silent truncation:

1. Chunk the doc on section boundaries.
2. For each chunk, a pass extracts **verbatim quotes + section refs** relevant to each of the 10 axes —
   *quotes, never summaries* (a summary can't satisfy `E-quote-in-source`).
3. The reduce step scores the axes over the collected verbatim evidence, exactly as the single-pass would,
   with each quote still carrying its real `§N`.

Whenever the fallback runs, **say so** in the chat summary and add a `limits[]` entry ("doc exceeded a
single context window; scored via a section-chunked evidence pass") so the author knows the read was
chunked. A doc that is merely *long* but fits is read whole — the fallback is for the real ceiling only.

## 6. Honesty about what wasn't read (Inv-5)

The cardinal rule of ingest: **anything you could not read is named, never scored.** An unreadable figure,
a scanned page, a linked annexure the doc references but doesn't contain — each becomes a `limits[]` entry
phrased as "not visible in this doc", and the axis it might have covered is left at its evidenced verdict
(or `ABSENT` only if the doc-type expects it *and* nothing readable addressed it). Manufacturing an
`ABSENT` for content that may live somewhere you couldn't see is the exact failure this invariant exists
to prevent.
