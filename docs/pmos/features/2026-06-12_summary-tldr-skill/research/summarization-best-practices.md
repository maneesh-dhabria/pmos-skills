# Research: summarization best practices (for /summary-tldr design)

Captured 2026-06-12 during `define` (epic 0612-h2j). Source: web research pass.

## 1. Compression ratio / length
- Empirical sweet spot ≈ **15–30%** of source length. Literature bands: high compression <15%, medium 15–30%, low ≥30% (Stanford CS224N compression-controlled summarization).
- Governing tradeoff: too much compression → incoherent; too little → little reading-time benefit. **Higher compression is a harder task** (more abstraction → more hallucination risk).
- Compression is **non-linear**: 20% of a 50k-word book = 10k words (not a TL;DR); 20% of a 600-word article = 120 words (ideal). Optimal rate is context/audience-dependent (ACL R19-1145).
- On the proposed bands: 10–20% and 20–30% map well to high/medium; **30–40% is generously long** — past the sweet spot, defensible only for dense technical/legal/scientific sources. Keep three bands but reframe as *intent* + **cap absolute length**.

## 2. Extractive vs abstractive vs hybrid
- More extractive ⇒ more faithful (copied text can't fabricate) but choppy; extraction can still mislead via juxtaposition ("Extractive is not Faithful", 2209.03549).
- Abstractive reads better but shows low factual-consistency / invents content (Faithfulness & Factuality, ACL 2020).
- **Winning pattern: hybrid extract-then-generate** — extract salient source spans first, abstract over only those. "Effectively alleviates hallucination" (2304.04193).
- **"Meta-description" failure** = "this article discusses X" — a table of contents, not a bottom line (BLUF). Good summaries state the source's **claims, numbers, conclusions directly**.

## 3. Faithfulness & grounding
- **Keyfact-list grounding** (FineSurE, 2407.00908): derive keyfacts from source first → build summary to cover them → verify each summary sentence maps back to source. Grounding-by-construction.
- Per-sentence fact-check categories (7 error types): entity, predicate, circumstance, coreference, discourse-link, grammatical, out-of-context. Doubles as a hallucination checklist.
- Filter irrelevant source content before generating (2212.09726).
- **Lost-in-the-middle**: summary faithfulness is positionally biased; LLMs under-use the middle of long docs (2410.23609). Mitigate with **map-reduce chunking** (segment → summarize each → synthesize) and relevance-reordering.

## 4. Output structures
- NN/G inverted pyramid: **lead with the conclusion**; first sentence most important; supports F-pattern scanning. NN/G recommends a summary + bulleted key points.
- Format → content map:
  - **BLUF / one-liner** — decisions, alerts, emails, tweets (omits nuance)
  - **TL;DR + key-takeaways bullets** — articles/blogs (good default)
  - **Executive narrative/abstract** — work/business docs (needs prose coherence)
  - **Nested/hierarchical bullets** — long/structured docs, transcripts (can fragment)
  - **Layered/progressive** (one-liner → bullets → detail) — very long sources (books/episodes); most build cost
- Exec summary (whole-doc distillation) ≠ key-takeaways (section points). Both valid, different tools.

## 5. Quality evaluation / first-time-reader review
- Four dimensions: **faithfulness, completeness/coverage, conciseness, coherence** (FineSurE, G-Eval).
- FineSurE makes them computable: faithfulness = error-free sentences / total; completeness = matched keyfacts / total; conciseness = keyfact-aligned sentences / total.
- **First-time-reader checklist**:
  1. Key-fact coverage — main claims/numbers/conclusions captured?
  2. No fabrication — every sentence traces to source (7 error types)?
  3. Standalone — no dangling refs/undefined pronouns for a reader who never saw the original?
  4. Asserts, not describes — conveys claims, not "the article discusses…"?
  5. Coherence — organized, not stitched fragments?

## 6. Multi-modal source handling
- **Transcribe/extract to clean text first, then summarize** — preprocessing quality gates summary quality.
- Podcasts/video: transcribe → **chunk long transcripts** (map-reduce).
- PDFs/images (OCR): ≥200–300 DPI; avoid heavy manual preprocessing (modern engines self-preprocess).
- Email threads: **dedup quoted/forwarded text** so repeats don't inflate importance.
- Tweet threads: **stitch in posting order** before summarizing.

## Design implications for /summary-tldr
- **Default band = Standard (~20–30%)**; reframe bands as intent (Tight / Standard / Detailed); **cap absolute length** scaled to source length so long sources stay TL;DRs; long-source nudge on Detailed.
- **Pipeline = hybrid extract-then-generate**: preprocess → (map-reduce chunk if long) → extract keyfacts → generate to cover + assert keyfacts → verify.
- **Output styles**: default BLUF line + key-takeaways bullets; offer executive narrative, nested bullets, progressive/layered. Always front-load the conclusion.
- **First-time-reader review pass** = FineSurE-style gate: coverage, faithfulness (7 error types), standalone, asserts-not-describes, coherence. Fail any meta-description and rewrite to the actual claim.
- **Grounding rules**: no claim absent from source; preserve exact numbers/entities/named conclusions; prefer the source's own framing of its thesis; chunk-and-synthesize for long sources; flag low transcription/OCR confidence rather than silently summarizing degraded text.

Load-bearing sources: FineSurE (2407.00908), Faithfulness/Factuality ACL 2020, Extractive-is-not-Faithful (2209.03549), Positional-Bias-of-Faithfulness (2410.23609), Stanford CS224N compression bands, NN/G Inverted Pyramid.
