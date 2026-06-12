# Research: substrate reuse map (for /summary-tldr design)

Captured 2026-06-12 during `define` (epic 0612-h2j). Source: repo study of /polish, /diagram, _shared substrate, /magazine, /artifact.

## /polish — borrowable writing guidelines
`/polish` enforces a binary rubric (`plugins/pmos-toolkit/skills/polish/reference/rubric.md`) mixing regex / script-metric / LLM-judge checks. Checks relevant to a summary:
- Clutter words, em-dash overuse, AI-vocab hard-bans + soft-flags, hedging stacks, empty transitions, "not just X, it's Y" rhetoric (regex/judge) — **all apply**.
- Passive-voice ratio, sentence-length variance, header inflation (script-metric) — **apply**.
- Tricolon overuse, bullet abuse (full-sentence bullets), vague modifiers, subject-verb distance (judge) — **apply**.
- Throat-clearing intro (judge) — **reframe** for summaries as "opening states the claim immediately, no filler" (a summary has no author personality to allow).

**Key tension:** `/polish` is built around *preserving an author voice* (presets, `PRESERVE_VOICE_CONFLICT`, voice-sampling). **A summary has no author voice** — it's a neutral distilled artifact. So borrow the *checks*, drop the *voice-preservation* machinery.

**Invocation constraint:** `/polish` is "single-doc only; subagents cannot invoke this skill." `/summary-tldr` is user-invoked so it *could* call `/polish` from the main agent as a finishing pass — but **inlining the relevant checks is cleaner** (no voice machinery, subagent-safe, no extra round-trip). `/artifact` calls `/polish` as a finisher; that's the alternative pattern if we want it.

**Structure to borrow:** rubric in a `reference/` file; regex checks deterministic; script-metric checks via a `scripts/metrics.js` (judge never does arithmetic — §H); judge checks return `{verdict, cited_spans:[{line,excerpt}], rationale}`; a fail with zero citations is treated as pass (quote-grounding). 2-iteration apply cap.

## /diagram — optional handoff
`/diagram <desc> [--source <path>] [--theme technical|editorial] [--non-interactive] [--on-failure drop|ship-with-warning|exit-nonzero]`.
- `--source <md>` → extracts entities/relationships, confirms set.
- Callable from a **parent skill via the main agent** (not from a subagent) — exactly how `/artifact` Phase 3.7 calls it: `/diagram --non-interactive --on-failure drop` per diagram, then validate each SVG (parses, has dark-mode bg `<rect>`, heading-id smoke) before inline insert.
- Handoff for `/summary-tldr`: after the summary lands, offer "convert to diagram?"; on yes call `/diagram --source <summary.md> --theme editorial [--non-interactive] --on-failure drop`; embed validated SVG or link; on failure continue without it.

## Multi-modal input ingestion (what already exists vs new)
- `_shared/resolve-input.md` — path-resolution discipline for upstream pipeline artifacts (prefer `.html`, fall back `.md`). Not a general URL/PDF resolver.
- `/polish` Phase 1 input resolver: local path → `Read`; `http(s)://` → `WebFetch` strip to markdown; `notion://` → Notion MCP; inline quoted text → the argument is the doc. **Directly borrowable** for text/markdown/URL/Notion.
- `/magazine` (pmos-learnkit): podcasts via `scripts/transcribe.sh <enclosure> <guid> --model <whisper-model>` (exit 0 ok / exit 3 no-whisper → keep show-notes + honest hint, never fabricate / exit 1 hard fail); articles via `scripts/extract-article.js <link>` → **redirect to file, never pipe** (pipes truncate at 8–64 KB). Forever-cache of transcripts. This is the reusable media-transcription pattern — but it lives in **pmos-learnkit**, so cross-plugin reuse from a pmos-toolkit skill is awkward.
- `/artifact` ingests via `files_to_read` (glob patterns + user-args attached files) into a `gathered_context` block.
- **Not yet supported anywhere** (would be new): image/vision input, video-URL transcript, tweet/Twitter-thread stitching, email-thread quote-dedup, PDF text extraction. Claude can natively Read PDFs and images (vision) and WebFetch URLs — so text/markdown/URL/PDF/image are achievable with built-in tools; podcast/video transcription + tweet/email parsing need explicit handling.

## HTML output substrate (`_shared/html-authoring/`)
Emit checklist every artifact must satisfy:
1. Author HTML with `<section id=kebab>` + `<h2/h3 id=kebab>` (stable kebab ids — load-bearing for comments + `/verify` smoke; missing id hard-fails verify).
2. Slot-fill `template.html`: `{{title}}`, `{{asset_prefix}}`, `{{plugin_version}}`, `{{pmos_skill}}` (= emitting skill slug; routes `/comments`), `{{source_path}}`, `{{content}}`.
3. Atomic write `<NN>_<artifact>.html` + `<artifact>.sections.json` (via `build_sections_json.js`).
4. Copy `assets/*` idempotently (`cp -n`; launchers via `install -m 0755`).
5. Regenerate `index.html` with inlined manifest (`index-generator.md`).
6. Cache-bust asset URLs with `?v=<plugin-version>`.
7. Frontmatter JSON block: type, generated_at, template_version, sources.

## Reuse map summary
| Concern | Reuse | New |
|---|---|---|
| Writing-quality checks | inline relevant `/polish` rubric checks (drop voice machinery) | summary-specific "no meta-description" check |
| Input: text/md/URL/Notion | `/polish` Phase 1 resolver pattern | — |
| Input: PDF/image | built-in Read (PDF) + vision | confidence/degradation handling |
| Input: podcast/video | `/magazine` transcribe pattern (cross-plugin) | tweet-thread stitch, email dedup, video transcript |
| Optional diagram | `/diagram` main-agent handoff (like `/artifact` 3.7) | — |
| HTML output | `_shared/html-authoring/` checklist | summary library listing |
| Non-interactive | `_shared/non-interactive.md` inline block | — |
| Findings/dispositions | `_shared/findings-dispositions.md` | — |
