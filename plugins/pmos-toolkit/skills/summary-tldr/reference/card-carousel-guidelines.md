# Card-carousel house guidelines (shorts mode)

House guidelines for `/summary-tldr --mode shorts` — a swipeable carousel of bite-size cards, one key
takeaway per card. Derived from studying the bite-size-news card-story genre as a *form*; these are
generic craft rules, **not** a clone of any product. **Never name a specific app** anywhere in the skill,
its docs, or its output (maintainer rule). The genre, not any brand, is the reference.

## What the form is for

A reader swipes through a short, ordered stack of single-idea cards and comes away with the source's
actual takeaways in under a minute — without reading the full text and without reading the full narrative
summary either. Shorts is the *most* compressed surface `/summary-tldr` emits: each card is one assertion,
front-loaded, scannable at a glance. It is additive — the canonical grounded text summary still emits first
(D2/INV3); shorts is a sibling rendering, never a replacement.

## The card model

Each card is `{ id, text, keyfact, source_anchor?, media? }`:

- **`text`** — the takeaway, **≤140 characters**, BLUF (the conclusion first, not a wind-up). One idea per
  card. This is the only thing the reader scans, so it must assert, not describe: "Office costs fell 40%
  after the remote shift" — never "This card is about costs."
- **`keyfact`** — the grounded Phase-4 keyfact the card was derived from (claim / number / named
  conclusion / entity). Cards come from the **keyfact extraction**, never the compressed prose and never
  model memory (D3/D7/D12). The keyfact also drives media relevance matching (below).
- **`source_anchor`** *(optional)* — a heading id / locator in the canonical summary the card maps back to.
- **`media`** *(optional)* — a *relevant existing* figure/SVG/video paired to the card (see "Media pairing").
  A card with no relevant media is full-text — that is normal and fine, never a defect to paper over.

## Craft rules

1. **One takeaway per card.** If a card carries two ideas, split it. Sequence the cards so they read as a
   coherent top-to-bottom story (lead with the headline finding, end with the implication / recommendation).
2. **≤140 chars, enforced deterministically.** The limit is a hard gate in `scripts/shorts.js` — a card over
   140 is a *fail to be re-derived shorter*, **never silently truncated** (truncation drops the assertion's
   tail and can invert its meaning). The model supplies the text; the script owns the limit (`§H`).
3. **Front-load (BLUF).** The first ~8 words must carry the point — a reader who only sees the card's top
   line still gets the takeaway.
4. **Assert, don't describe.** Same grounding rule as the narrative summary (I1/I2): state the claim, the
   number, the named conclusion. Meta-description ("the article covers…") is a fail.
5. **≥2-card floor.** A single card is not a carousel. Below two derivable cards the mode degrades with a
   note and ships the canonical text alone (D11/D12) — never pad with filler cards to clear the floor.
6. **Numbers and entities survive verbatim.** A card that rounds "two of nine teams" to "most teams" is a
   faithfulness fail; preserve exact figures and named entities exactly as the keyfact carries them.

## Media pairing

Each card pairs **relevant existing** media when one is available; otherwise it is text-only (D8):

- **Candidate media** = the source's figure inventory (reuse `/explainer-video`'s `ingest.mjs` deterministic
  figure extraction — **no new extractor**) **plus** any artifact *this run* already produced: the mindmap
  SVG (`--mode mindmap` output) and the video (`--mode video` output), when present.
- **Relevance** = a deterministic match of the card's `keyfact`/`text` against a figure's `alt`/caption
  (token overlap), scored in `scripts/shorts.js`. Below the relevance floor → the card is text-only.
- **Never fabricate media**, never embed a broken or re-fetched asset, never stretch an unrelated figure
  onto a card just to fill the slot. A clean text card beats a misleading image.
- A figure is paired to **at most one** card (greedy by best score) so the carousel does not repeat the
  same image across cards.

## Carousel UX (the emitted `<slug>-shorts.html`)

- **Self-contained, zero-dep, offline (no CDN).** The carousel's own CSS + JS are embedded; it works from a
  single file with no network. It rides the `_shared/html-authoring` substrate, so it carries
  `<meta name="pmos:skill" content="summary-tldr">`, the inline `pmos-comments` block, and the comments
  overlay assets copied alongside — compatible with `/comments` without clashing with the carousel JS.
- **Navigation:** horizontal swipe (pointer/touch, native scroll-snap) **and** keyboard (←/→), plus
  accessible prev/next buttons. A **card counter** ("3 / 7") shows position.
- **Accessible:** the track is a labelled `role="region"` carousel; each card is a list item with an
  `aria-label` ("card N of M"); media carries `alt`; buttons have discernible names; focus is managed on nav.
- **Linked both ways:** the canonical summary artifact links to the carousel, and the carousel links back to
  the canonical summary; the `/summary-tldr` library index row reflects the shorts rendering.

## Degradation (D11/D12)

- **<2 derivable cards** → ship the canonical text only, with a one-line note explaining why no carousel
  (too few distinct takeaways). Never fabricate cards.
- **Media-extraction failure** (the figure inventory could not be built) → the carousel still ships
  **text-only**; log the precise reason. The canonical text summary always ships regardless.
