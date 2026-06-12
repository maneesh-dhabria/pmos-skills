# Input dispatcher — per-source-kind detection, preprocessing, and honest degradation

The Ingest phase (Phase 2) of `/summary-tldr` cites this file. It defines how each declared source kind is **detected**, **preprocessed into clean text**, and how it **degrades honestly** when extraction or transcription is partial or impossible. The dispatcher records a `source_kind` label and an `extraction_confidence` signal that flow into the emitted artifact's provenance block.

## Table of Contents

- Shared resolver (delta over `/polish`)
- Source-kind handlers
- Cross-plugin transcription (decision D1)
- Honest degradation (invariant I5)
- Source-kind → handling → degradation table
- Confidence signal

## Shared resolver (delta over `/polish`)

`/summary-tldr` **reuses** the `/polish` Phase 1 input-resolver — see `polish/SKILL.md` Phase 1 "Ingest". That resolver already covers: local path → `Read`; `http(s)://` → `WebFetch` (strip to markdown); `notion://<id>` → Notion MCP read-only; quoted inline text → the argument **is** the doc. Do not restate or re-implement that logic here.

The **delta** this dispatcher adds on top of the shared resolver is the media / email / tweet preprocessors below — source kinds the prose-only `/polish` resolver does not handle: PDFs, images, email threads, tweet threads, podcast episodes, and video URLs.

Resolution order: first match the shared resolver's path/URL/notion/inline cases; then, before summarizing, apply the matching preprocessor below to produce clean text.

## Source-kind handlers

### Raw text / pasted
**Detect:** the argument is free-form prose with no path-, URL-, or notion-scheme prefix and no media markers. **Preprocess:** none — the argument **is** the document. **Degrade:** not applicable; confidence `high`.

### Markdown file
**Detect:** local path ending `.md`/`.markdown` (shared resolver's local-path case). **Preprocess:** `Read` the file; use the markdown as-is. **Degrade:** a missing/unreadable file is a hard error, not a degradation — report the path and stop.

### Web / document URL
**Detect:** `http(s)://` (shared resolver's URL case). **Preprocess:** `WebFetch`, strip the page to text. **Degrade:** on fetch failure, **report it and ask the user for a paste** — never summarize an empty or error body. Confidence `high` on clean fetch.

### PDF
**Detect:** local path or URL ending `.pdf`. **Preprocess:** built-in native `Read` — Claude reads PDFs natively; no bundled parser. **Degrade:** a scanned or otherwise low-text PDF yields little or no extractable text — flag **low** confidence, summarize **only** what actually extracted, and **say so** in the output. Never infer page content that did not extract.

### Image
**Detect:** local path or URL ending in an image extension (`.png`/`.jpg`/`.jpeg`/`.webp`/`.gif`), or an explicitly attached image. **Preprocess:** built-in vision `Read`. **Degrade:** on low legibility (blur, low resolution, dense/handwritten text), **flag** it and summarize only the legible content — **never invent text** that cannot be read. Confidence `medium`/`low` by legibility.

### Email thread
**Detect:** pasted text with email markers — `From:`/`Sent:`/`To:`/`Subject:` headers, `>`-quoted blocks, or `-----Original Message-----` / "On <date> … wrote:" separators. **Preprocess:** **dedup** quoted and forwarded blocks so each message appears once, then **order the distinct messages chronologically (oldest → newest)** before summarizing. **Degrade:** if ordering is ambiguous (missing timestamps), summarize in best-effort order and note the uncertainty. Confidence `high` when headers are clean, `medium` when reconstructed.

### Tweet / Twitter thread
**Detect:** pasted post text or an `x.com`/`twitter.com` status URL. **Preprocess:** **stitch** the posts into a single text in **posting order** before summarizing. **Degrade:** a URL behind auth (login wall, protected account) cannot be fetched — **ask the user for a paste**; do not summarize an auth-redirect page.

### Podcast episode
**Detect:** an audio enclosure URL/path, or an episode reference the user marks as a podcast. **Preprocess:** transcribe via the `/magazine` `scripts/transcribe.sh` script (cross-plugin — see D1 below), then summarize the **transcript**; **chunk** a long transcript and summarize per-chunk before composing. **Degrade:** see D1 + I5 — no transcriber on PATH or pmos-learnkit not installed ⇒ degrade to a "paste a transcript / link the show-notes" input with an honest install hint.

### Video URL
**Detect:** a video-platform URL (e.g. YouTube and similar) or a video file. **Preprocess:** prefer an **available transcript / captions** track; if none, transcribe the **audio** exactly like a podcast (D1). **Degrade:** no captions and no transcriber ⇒ degrade to "paste a transcript" with the same honest hint.

## Cross-plugin transcription (decision D1)

`transcribe.sh` lives in **`pmos-learnkit`**, not pmos-toolkit. Resolve its path at **runtime**: search the installed-plugins cache for a `pmos-learnkit/.../magazine/scripts/transcribe.sh` entry. If pmos-learnkit is **not installed**, podcast and video inputs **degrade** to "paste a transcript" inputs — state this plainly to the user; **never fail silently**.

The `/magazine` transcription contract (canonical home — state only the delta here): invoke

`scripts/transcribe.sh <enclosure> <guid> --model <whisper-model>`

It detects `whisper` / `whisper.cpp` on PATH, and on **absence EXITS 3** so the caller falls back to show-notes / a pasted transcript plus an **honest install hint** — never fabricate audio content. When crawling an article body, **redirect to a file, never pipe** (pipes truncate audio/text at ~8–64 KB).

Delta for `/summary-tldr`: treat exit 3 (no whisper) and an absent `pmos-learnkit` install identically at the UX layer — both surface as "I can't transcribe this here; paste a transcript or link the show-notes," with the install hint when the script exists but whisper is missing.

## Honest degradation (invariant I5)

This is the skill's **central trust rule**. When extraction or transcription confidence is **low**, or the text is **absent**, the skill either:

1. **Flags** it — summarizes **only what it actually has** and **says so** in the output and provenance block; or
2. **Refuses** that input with **concrete guidance** (paste the transcript, paste the thread, link the show-notes, supply a higher-resolution image).

It **never** fabricates content and **never** silently summarizes degraded or absent text. A summary that looks complete but rests on un-extracted pages, illegible image regions, or an un-transcribed podcast is the exact failure this rule exists to prevent.

## Source-kind → handling → degradation table

| Source kind | v1 handling | Degradation behavior |
|---|---|---|
| Raw text / pasted | Argument **is** the doc | None (confidence `high`) |
| Markdown file | `Read` the file | Missing file = hard error, report path |
| Web / doc URL | `WebFetch`, strip to text | Fetch fail → report + ask for paste |
| PDF | Native `Read` | Scanned/low-text → flag `low`, summarize only what extracted, say so |
| Image | Vision `Read` | Low legibility → flag, never invent text |
| Email thread | Dedup quotes, order oldest→newest | Ambiguous order → best-effort + note |
| Tweet / thread | Stitch in posting order | Auth-walled URL → ask for paste |
| Podcast episode | `transcribe.sh` (D1) → summarize transcript, chunk if long | No whisper / no pmos-learnkit → "paste a transcript" + install hint |
| Video URL | Captions if available; else transcribe audio like a podcast | No captions + no transcriber → "paste a transcript" + hint |

## Confidence signal

The dispatcher records `extraction_confidence` — one of `high` / `medium` / `low` — into the artifact's provenance block alongside `source_kind`:

- **high** — text was obtained cleanly and in full: pasted/inline text, a read markdown file, a clean `WebFetch`, a text-native PDF, captions/transcript fetched whole, or a clean whisper transcript.
- **medium** — text was obtained but reconstructed or partial: a legible-but-imperfect image, an email thread re-ordered from incomplete timestamps, a chunked long transcript, or a partial fetch.
- **low** — extraction was largely unsuccessful: a scanned/low-text PDF, an illegible image, or any input where only a fragment of the source text was recovered. A `low` signal **must** be reflected in the summary prose ("summarized only the extractable portion") — it is never silent.

Refused inputs (auth-walled tweet, no-transcriber podcast with no paste) do not get a confidence value — they are not summarized at all until the user supplies clean text.
