---
name: explainer-video
description: Turns a single document, pmos artifact, or web URL into a narrated slideshow video (.mp4) — distilled to one idea per slide, captured at 1920×1080, narrated locally at $0, and assembled with ffmpeg. Use when someone wants a watchable explainer of something they wrote or found, not just a written summary. Triggers when the user says "make a video from this", "turn this doc into an explainer video", "narrate these slides", "explainer-video <url>", "make a slideshow video of this PDF", "video walkthrough of this spec", "voice this over as a video", or "/explainer-video". Distills the source into one-idea-per-slide decks (reusing the source's own figures), narrates each slide with a local TTS engine (macOS `say` or Kokoro — never cloud), and runs a self-check on the assembled mp4. Requires ffmpeg + ffprobe; Playwright for slide capture.
user-invocable: true
argument-hint: "<source: URL | file path (pdf/md/html/txt) | pmos artifact> [--length quick|standard|deep] [--voice <name>] [--captions | --no-captions] [--non-interactive | --interactive]"
---

# Explainer Video

**Announce at start:** "Using explainer-video to turn your source into a narrated slideshow .mp4 — one idea per slide, narrated locally, assembled with ffmpeg."

The one rule everything else serves: **one idea per slide, narrated in the source's own words and figures — a watchable explainer, not a wall of text read aloud.** `/explainer-video` is a content/authoring utility beside `/summary-tldr`, `/artifact`, and `/diagram`. It is standalone — not a stage in the requirements→spec→plan pipeline, and it does not load workstream context. It turns ONE source per run into ONE video; it does not synthesize across documents, animate sub-slide reveals (that is a v2 candidate), or use any cloud service.

The pipeline is six stages plus learnings capture: **ingest** (source → clean text + figure inventory) → **distill** (text → `deck.json`, the one model-judgment step) → **author + capture** (`deck.html` → `frames/*.png`) → **narrate** (speaker notes → `audio/*.wav` + `durations.json`) → **assemble** (`ffmpeg` → `video.mp4`) → **self-check**.

## Flags & natural language

Natural-language-first (`skill-patterns.md §I`): every option also has a natural-language form — infer it from the request; an explicit flag overrides. Canonical phrasings: "keep it short" / "1–2 minutes" ≡ `--length quick`, "a 3–5 minute video" ≡ `--length standard`, "go deep" / "5–10 minutes" ≡ `--length deep`, "use the <X> voice" ≡ `--voice <name>`, "no captions" / "drop the subtitles" ≡ `--no-captions`. Contract flags (each passes the §I 4-test — typed value or headless determinism): `--length` (typed value that changes output, design D6), `--voice` (typed value passed through to the TTS engine), `--captions`/`--no-captions` (output-changing toggle; captions on by default, D4), `--non-interactive`/`--interactive` (headless determinism). All are listed in `argument-hint`.

<!-- nl-sugar -->
- `--rate <wpm>` — narration pace passed through to `narrate.sh`; a tuning knob, not an output-shape contract. Inferred from "speak slower/faster"; parsed but not advertised in the hint.
<!-- nl-sugar -->
- `--kokoro` — force the Kokoro TTS engine instead of auto-detect; redundant with the whisper-if-installed auto-upgrade. Machine-coupled name; never renamed.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

<!-- defer-only: ambiguous -->
- **No `AskUserQuestion` available:** the length confirm (Phase 1) degrades to a numbered free-form prompt per `_shared/interactive-prompts.md`. The non-interactive auto-pick contract (Recommended → AUTO-PICK) still applies.
- **No `Read` with PDF `pages` / no vision `Read`:** PDF and image sources cannot be ingested in-session — refuse that source with a one-line note pointing at a text/markdown export; never narrate a remembered version of the document.
- **No `WebFetch`:** URL sources cannot be ingested — refuse the URL input and ask for a local file; never ingest a remembered version of the page.
- **No `Task` subagent:** the Phase 2 in-session distiller runs inline in the host conversation instead of as a dispatched subagent.
- **No Playwright on the host:** Phase 4 capture cannot run — the run stops after `deck.html` with the install hint from `reference/eval-rubric.md`; the live smoke (AC7) is recorded **DEFERRED-TO-RELEASE**, never silently passed.
- **Non-Mac host without Kokoro:** macOS `say` is unavailable — Phase 5 errors clearly with the Kokoro install path (`reference/narration-engines.md`); there is no cloud fallback by design.

## Track Progress

This skill has 7 sequential phases (Setup, Ingest, Distill, Author+Capture, Narrate, Assemble, Capture Learnings). Create one task per phase using the host agent's task-tracking tool (e.g., `TaskCreate` in Claude Code). Mark each task in-progress when you start it and completed as soon as it finishes — do not batch completions.

## Phase 1: Setup, load learnings & resolve length {#setup}

Inline `_shared/pipeline-setup.md` to: read `.pmos/settings.yaml` (REQUIRE `version` and `docs_path`), resolve `{docs_path}`, and resolve `{ev_dir} = {docs_path}/explainer-video/` (`mkdir -p` if missing). HTML (the deck) is the only emitted HTML format; print to stderr `output_format: html`.

Read `~/.pmos/learnings.md` if present; factor in any entries under `## /explainer-video`. The skill body wins on conflict — surface conflicts to the user before applying a learning.

**Parse arguments.** Positional `<source>` (a URL, a local file path `pdf/md/html/txt`, or a pmos artifact path). Flags `--length <quick|standard|deep>`, `--voice <name>`, `--captions`/`--no-captions`, `--rate <wpm>`, `--kokoro`, `--non-interactive`, `--interactive`. Any unknown flag, or `--length` with a value outside its enum → platform-aware error naming the valid set (per `_shared/platform-strings.md`); exit 64. Captions default ON (D4).

**Resolve the length dial.** `cli > .pmos/explainer-video.lastrun.yaml > skill default (standard)`. After a run, persist the resolved `--length` atomically (temp-then-rename). Print to stderr `length: <quick|standard|deep> (source: <cli|lastrun|default|confirmed>)`.

**Resolve captions (D6/FR-6).** Precedence `cli (--captions/--no-captions) > .pmos/explainer-video.lastrun.yaml :: captions > default (on, D4)`. The flag, when present, always wins and updates the remembered value. Persist the resolved choice to the same `.pmos/explainer-video.lastrun.yaml` (a single file holding both `length:` and `captions:`, written atomically temp-then-rename after the run). Print to stderr exactly `captions: <on|off> (source: <cli|lastrun|default>)`. No new `settings.yaml` surface. The resolved value is carried into Phase 6 (`assemble.sh` gets `--no-captions` when off).

**Print the run-time estimate (D8/FR-8).** The full pipeline (Playwright capture + local TTS + ffmpeg assemble) is slow and scales with slide count, so print an approximate total to stderr before starting. The slide count is the resolved length band's typical figure (quick ≈ 6, standard ≈ 13, deep ≈ 24); the per-slide cost is a documented rough heuristic — ~4 s capture + ~12 s narration + ~6 s assemble per slide, plus ~20 s fixed overhead. **Arithmetic is script-side, never model-guessed (§H/I2)** — compute and print it with:

```
node -e 'const L=process.argv[1];const S={quick:6,standard:13,deep:24}[L]||13;const sec=Math.round(20+S*(4+12+6));process.stderr.write(`est. run time: ~${sec}s (${L}, ~${S} slides)\n`)' <length>
```

For the **`deep` tier**, additionally ask a one-line confirm before starting (the run is the longest); quick/standard print the estimate without blocking:

- `AskUserQuestion` — `"This deep run is ~<N>s (~24 slides of capture + narration + assemble). Proceed?"` options **Proceed (Recommended)** / **Cancel**. The Recommended option means the non-interactive classifier AUTO-PICKs Proceed; log `explainer-video: deep run auto-proceeded (non-interactive), est ~<N>s`.

If `--length` is unset and mode is interactive, ask once (the distiller needs it to calibrate slide count, `reference/distillation-contract.md`):

- `AskUserQuestion` — `"How long should the video be?"` options **Standard — 3–5 min (Recommended)** / **Quick — 1–2 min** / **Deep — 5–10 min**. `--length` pre-answers this and skips the prompt. Under non-interactive mode, AUTO-PICK Standard (the Recommended option).

The canonical non-interactive block below handles `mode` resolution + per-checkpoint classifier + OQ buffer + end-of-skill summary. Do not paraphrase or move this block.

<!-- non-interactive-block:start -->
1. **Mode resolution.** Compute `(mode, source)` with precedence: `cli_flag > parent_marker > settings.default_mode > builtin-default ("interactive")` (FR-01).
   - `cli_flag` is `--non-interactive` or `--interactive` parsed from this skill's argument string. Last flag wins on conflict (FR-01.1).
   - `parent_marker` is set if the original prompt's first line matches `^\[mode: (interactive|non-interactive)\]$` (FR-06.1).
   - `settings.default_mode` is `.pmos/settings.yaml :: default_mode` if present and one of `interactive`/`non-interactive`. Unknown values → warn on stderr `settings: invalid default_mode value '<v>'; ignoring` and fall through (FR-01.3).
   - If `.pmos/settings.yaml` is malformed (not parseable as YAML, or missing `version`): print to stderr `settings.yaml malformed; fix and re-run` and exit 64 (FR-01.5).
   - On Phase 0 entry, always print to stderr exactly: `mode: <mode> (source: <source>)` (FR-01.2).

2. **Per-checkpoint classifier.** Before issuing any `AskUserQuestion` call, classify it (FR-02):
   - The defer-only tag, if present, is the literal previous non-empty line: `<!-- defer-only: <reason> -->` where `<reason>` ∈ {`destructive`, `free-form`, `ambiguous`} (FR-02.5).
   - Decision (in order): tag adjacent → DEFER; multiSelect with 0 Recommended → DEFER; 0 options OR no option label ends in `(Recommended)` → DEFER; else AUTO-PICK the (Recommended) option (FR-02.2).

3. **Buffer + flush.** Maintain an append-only OQ buffer in conversation memory. On each AUTO-PICK or DEFER classification, append one entry per the schema in spec §11.2. At end-of-skill (or in a caught error before exit), flush (FR-03):
   - Primary artifact is single Markdown → append `## Open Questions (Non-Interactive Run)` section with one fenced YAML block per entry; update prose frontmatter (`**Mode:**`, `**Run Outcome:**`, `**Open Questions:** N` where N counts deferred only — see FR-03.4) (FR-03.1).
   - Skill produces multiple artifacts → write a single `_open_questions.md` aggregator at the artifact directory root; primary artifact's frontmatter `**Open Questions:** N — see _open_questions.md` (FR-03.5).
   - Primary artifact is non-MD (SVG, etc.) → write sidecar `<artifact>.open-questions.md` (FR-03.2).
   - No persistent artifact (chat-only) → emit buffer to stderr at end-of-run as a single block prefixed `--- OPEN QUESTIONS ---` (FR-03.3).
   - Mid-skill error → flush partial buffer under heading `## Open Questions (Non-Interactive Run — partial; skill errored)`; set `**Run Outcome:** error`; exit 1 (E13).

4. **Subagent dispatch.** When dispatching a child skill via Task tool or inline invocation, prepend the literal first line: `[mode: <current-mode>]\n` to the child's prompt (FR-06).

5. **Call-site auditing (CI only).** This runtime classifier reads the call it is about to make — it does not run awk. Static/offline auditing of `AskUserQuestion` call sites across SKILL.md files is performed by `tools/audit-recommended.sh`, which sources the shared call-site extractor from Section D of this file (`_shared/non-interactive.md`). Runtime and audit therefore share one decision contract without inlining the extractor into every skill (FR-02.6).

6. **Refusal check.** If this SKILL.md contains a `<!-- non-interactive: refused; ... -->` marker (regex: `<!--[[:space:]]*non-interactive:[[:space:]]*refused`), and `mode` resolved to `non-interactive`: emit refusal per Section A and exit 64 (FR-07).

7. **Pre-rollout BC.** If the `--non-interactive` argument is present BUT this SKILL.md does NOT contain the `<!-- non-interactive-block:start -->` marker (i.e., this skill hasn't been rolled out yet): emit `WARNING: --non-interactive not yet supported by /<skill>; falling back to interactive.` to stderr; continue in interactive mode (FR-08).

8. **End-of-skill summary.** Print to stderr at exit: `pmos-toolkit: /<skill> finished — outcome=<clean|deferred|error>, open_questions=<N>` (NFR-07).
<!-- non-interactive-block:end -->

## Phase 2: Ingest the source {#ingest}

**Resolve the source argument to a concrete path or URL first (D4/FR-4) — a deterministic order, no silent guessing:**

1. **URL** — `http(s)://…` is used as-is (fetched in step 1 below via `WebFetch`).
2. **Literal path** — the `<source>` exactly as given (relative to cwd) **if it exists** on disk. Use it.
3. **`@artifact` / bare-relative form** — for an `@name/rest` (strip the leading `@`) or a bare relative path that did not exist in step 2, try `{docs_path}/{rest}`. If that exists, use it.
4. **Bounded `find` fallback** — search by basename under the repo root: `find <repo-root> -name '<basename>' -not -path '*/node_modules/*'`. **Exactly one match → use it; 0 matches → error** `explainer-video: source not found: <source> (tried literal, {docs_path}/, and a basename search)`; **>1 match → error** listing the candidates and asking the user to pass an unambiguous path. Exit 64 on either. Never pick one of several silently.

Log the resolved path to stderr: `source: <resolved> (via <literal|docs_path|find>)`.

Then resolve the source to **clean text plus a figure inventory** per `reference/figure-inventory.md`. There is **no bundled PDF parser** (no poppler/`pdftotext`/vendored JS): text comes from the host's native capabilities, figures from `ingest.mjs`.

1. **Dispatch an in-session distiller subagent** (`model: sonnet` per §L — bounded extraction, not frontier judgment) that reads the source directly to clean text: native `Read` for local `.md/.html/.txt` and PDFs (`Read` with `pages` for long PDFs), `WebFetch` for URLs, pmos-artifact section reads for a pmos `.html` artifact. The subagent returns the cleaned plaintext (readability-stripped for web) — never a remembered version of the source.
2. **Run `ingest.mjs` for the figure inventory** (deterministic asset extraction):

   ```
   node ${CLAUDE_PLUGIN_ROOT}/skills/explainer-video/scripts/ingest.mjs <source> --figures-out <ev_dir>/<slug>/figures.json
   ```

   It extracts pmos owned SVGs, local HTML/MD `<img>`/`<figure>`, and fetched web-page images; resolves relative URLs against the page base; and filters by size/role to drop nav/tracking/spacer/decorative images (thresholds in `reference/figure-inventory.md`). Each entry: `{id, source_ref, kind: svg|img, alt, width, height}`. **Inline pmos `<svg>` figures are written to a sibling `figures/` dir** (`figures/<id>.svg`) and their `source_ref` points at that file — so Phase 4 embeds the original asset from disk rather than re-deriving it; `<img>`/markdown figures keep their resolved path/URL `source_ref`.

**Honest degradation:** when extraction confidence is low — a scanned PDF that barely reads, a fetch failure, an unreadable source — FLAG it (proceed only on what was actually extracted, and say so) or REFUSE that source with concrete guidance. Never fabricate source text or figures.

The `--length` dial resolved in Phase 1 is carried into Phase 3.

## Phase 3: Distill to deck.json {#distill}

Produce `deck.json` validated against `reference/distillation-contract.md`. This is the **only model-judgment stage**. The distiller MUST obey:

- **One idea per slide (hard).** Each slide carries exactly one idea; bullets are minimal support (cap 3, prefer 0–1). A slide that reads like two ideas is re-split before proceeding.
- **Length calibration as a starting point, not a quota.** Map the resolved `--length` to its slide-count / words-per-slide band via the table in `reference/distillation-contract.md#length-calibration` (the one home, I1 — do not restate the numbers here); adapt to the source's natural structure rather than padding or truncating to a number.
- **Reuse source figures.** When a figure from the Phase 2 inventory illustrates a slide's idea, reference it by `id` in the slide's `figure` field and place the **original asset** rather than paraphrasing it. Every `figure` reference MUST resolve against the inventory (unresolved → self-check fail in Phase 6).

`deck.json` is a **single top-level object** `{title, length_target, slides:[…]}` — the `slides` array holds the per-slide objects `{idea, title, bullets[≤3], speaker_notes (length-calibrated), figure?: {source, kind}}`. **Write the wrapper, not a bare `[…]` array** — the canonical shape and a worked example live in `reference/distillation-contract.md#schema` (the one home, I1; do not re-specify it divergently here). The narrate/assemble scripts also normalise a bare top-level array as a safety net (D1), but the contract is the wrapped object. Write `deck.json` to `<ev_dir>/<slug>/deck.json` (temp-then-rename).

**JSON-validity gate (D3/FR-3) — run immediately after writing `deck.json`, before Phase 4.** The model authors `deck.json` by hand, so an unescaped `"` in `speaker_notes` yields invalid JSON that would otherwise surface only when a script tries to parse it. **Author guidance:** `speaker_notes` must not contain unescaped double-quotes — prefer curly quotes (`"…"`) or escape them (`\"`). Gate (a parse failure **stops the run** with a clear message — §H/I2, the parse is script-side):

```
node -e 'const fs=require("fs");try{const d=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const sl=Array.isArray(d)?d:d.slides;if(!Array.isArray(sl)||!sl.length)throw new Error("top-level has no slides array");process.stderr.write(`deck.json valid: ${sl.length} slides\n`)}catch(e){process.stderr.write(`deck.json INVALID — ${e.message}. Check for unescaped double-quotes in speaker_notes.\n`);process.exit(1)}' <ev_dir>/<slug>/deck.json
```

A non-zero exit stops the pipeline; fix the offending field and re-run the gate before continuing.

**Outline-approval gate (D9/FR-10 — after the JSON gate, before the expensive Phase 4 capture+narrate half).** Present the deck outline — each slide's `title` + one-line `idea` (numbered) — and let the user trim before paying for capture + TTS + assemble:

- `AskUserQuestion` — `"<N>-slide outline ready. Approve and continue to capture + narration?"` options **Approve & continue (Recommended)** / **Edit the outline**. The Recommended option means the non-interactive classifier AUTO-PICKs Approve; log `explainer-video: outline auto-approved (non-interactive), <N> slides`.
- On **Edit the outline**: take a free-form instruction (which slides to drop or merge — e.g. "drop 4 and 7, merge 9 into 8"), apply it to `slides[]`, **rewrite `deck.json` (temp-then-rename) and re-run the JSON-validity gate above**, then re-present the outline. Loop until Approve. (G3: a free-form drop/merge instruction, not a structured editor.)

Only after approval proceed to Phase 4.

## Phase 4: Author the deck + capture frames {#author-capture}

**Author `deck.html`** as a self-contained pmos artifact per `_shared/html-authoring/README.md` checklist. Deltas: artifact = `<ev_dir>/<slug>/deck.html`, `{{pmos_skill}}` = `explainer-video`, `{{plugin_version}}` read from `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`. One `<section>` per slide (stable kebab `id`); each `<section>` carries its `speaker_notes` in a `data-notes` attribute (the narration source) and places its resolved figure as the original asset — for an inline `<svg>` figure, inline the contents of the extracted `figures/<id>.svg` (its `source_ref`); for an `<img>`, use the resolved path/URL. v1 is **mp4-only** — `deck.html` is the silent slide source the capturer screenshots, not an audio-wired player.

**Watermark (D7/FR-7).** Bake a subtle bottom-right `pmos-toolkit` watermark into `deck.html` via low-opacity CSS so it is captured naturally into every frame at 1920×1080 — no ffmpeg change, no font/logo asset. Add it once (a single element that shows on every `<section>`, e.g. a `position: fixed` corner mark, or a `::after` on each slide), styled `position: fixed; right: 28px; bottom: 20px; opacity: 0.12; font-size: 18px; letter-spacing: 0.04em; pointer-events: none;` with the text `pmos-toolkit`. Keep it **bottom-right and faint** so it stays clear of the bottom-centre burned-in captions (G1 — the low opacity makes any wide-wrap overlap visually benign). Confirm it renders into the captured frames (it is part of the AC7 live smoke).

**Capture frames** with Playwright:

```
node ${CLAUDE_PLUGIN_ROOT}/skills/explainer-video/scripts/render-slides.mjs --deck <ev_dir>/<slug>/deck.html --out <ev_dir>/<slug>/frames
```

It screenshots each `<section>` at 1920×1080 to `frames/slide_NN.png` in deterministic order (patterned on `design-crit/assets/capture.mjs`). Playwright missing → it exits 3 with the install hint; record AC7 smoke DEFERRED-TO-RELEASE and stop (do not silently pass).

## Phase 5: Narrate locally {#narrate}

**Run the ffmpeg + ffprobe hard gate first** — a single up-front probe, because `narrate.sh` needs `ffprobe` for `durations.json` here, before assemble runs in Phase 6:

```
bash ${CLAUDE_PLUGIN_ROOT}/skills/explainer-video/scripts/narrate.sh --check-deps
```

It checks both `ffmpeg` AND `ffprobe` and prints a `brew install ffmpeg` / `apt install ffmpeg` hint naming **whichever binary is missing** (`ffprobe` can be absent even when `ffmpeg` is present). Missing → stop with the hint; do not proceed.

**Then narrate** — one WAV per slide from each slide's speaker notes:

```
bash ${CLAUDE_PLUGIN_ROOT}/skills/explainer-video/scripts/narrate.sh --deck <ev_dir>/<slug>/deck.json --out <ev_dir>/<slug>/audio [--voice <name>] [--rate <wpm>]
```

Engine selection per `reference/narration-engines.md`: macOS `say` with the best available built-in voice by default (auto-preferring an installed Enhanced/Premium voice, with a one-line nudge to install better voices — never auto-downloads), auto-upgrading to Kokoro when `kokoro-onnx` is detected (whisper-if-installed style). **No cloud TTS path exists.** It writes `audio/slide_NN.wav` + `durations.json` (per-WAV `ffprobe` duration). Surface the Enhanced-voice nudge once if it fires.

## Phase 6: Assemble + self-check {#assemble}

**Assemble the video** (the dep gate is already satisfied from Phase 5):

```
bash ${CLAUDE_PLUGIN_ROOT}/skills/explainer-video/scripts/assemble.sh --frames <ev_dir>/<slug>/frames --audio <ev_dir>/<slug>/audio --durations <ev_dir>/<slug>/durations.json --out <ev_dir>/<slug>/video.mp4 [--no-captions]
```

Each slide is held for its narration's `ffprobe` duration (per-slide segment, then `concat`); output is 1920×1080 16:9 H.264/AAC with `+faststart`. Captions (burned-in `.srt` from notes + durations) are ON unless `--no-captions` (D4).

**Run the self-check** per `reference/eval-rubric.md` (binary, arithmetic done by the script, never the model — §H): frame count == slide count; total video duration ≈ Σ `durations.json`; every audio segment non-silent; every `deck.json` figure reference resolved. Any failure → surface it; do not claim success.

Land all six artifacts at `<ev_dir>/<slug>/` (`deck.json`, `deck.html`, `frames/`, `audio/`, `durations.json`, `video.mp4`). **Regenerate the library listing** `{ev_dir}/explainer-video.html` (one row per past video, newest first) per `_shared/html-authoring/index-generator.md`; give every manifest entry the literal `phase: "Videos"` so the viewer renders one flat group; exclude `explainer-video.html` itself; atomic write.

## Phase 7: Capture Learnings {#capture-learnings}

**This skill is not complete until the learnings reflection has produced a one-line output.** Read and follow `_shared/learnings-capture.md`. Reflect on whether this session surfaced anything worth keeping under `## /explainer-video` in `~/.pmos/learnings.md` (create the heading if missing) — a source kind that distilled badly, a figure-filter false positive/negative, a `say`/Kokoro voice surprise, an ffprobe-duration drift, a slide that crammed two ideas. Emit exactly one of:

- `Learning: <new entry written to ~/.pmos/learnings.md under ## /explainer-video>`
- `No new learnings this session because <specific reason tied to this session>` — the reason must be specific, not boilerplate.

Empty reflection (no line) counts as unfinished work. Skip silently only if the run errored before Phase 6 completion (the partial OQ buffer captures the failure context instead).

## Anti-Patterns (DO NOT)

1. **Cramming two ideas onto one slide.** The whole skill exists to make one-idea-per-slide decks. A slide that needs "and also" is two slides. Re-split before capture (Phase 3).
2. **Reading a wall of text aloud.** Bullets are minimal support (0–1 preferred); the narration carries the idea. A slide dense with prose is a failed distillation, not a thorough one.
3. **Paraphrasing a figure the source already drew.** When the source has a figure that illustrates the idea, place the original asset (Phase 3 figure reuse); do not re-describe it in prose.
4. **Computing durations or parity by hand.** The frame/slide parity, duration sum, and silence checks are the script's job (§H, `reference/eval-rubric.md`). The model runs the check and reports; it does not calculate.
5. **Bundling a PDF parser.** Text comes from the host's native `Read`/`WebFetch` in-session (Phase 2); `ingest.mjs` only does deterministic asset/figure extraction. No poppler/`pdftotext`/vendored JS PDF lib, ever.
6. **Any cloud TTS.** Narration is local only — `say` or Kokoro. A non-Mac host without Kokoro errors with the install path; it never reaches for a cloud voice (epic constraint).
7. **Silently passing the smoke when a dep is missing.** Missing Playwright / ffmpeg / ffprobe / narration engine → record the smoke DEFERRED-TO-RELEASE with the missing binary and the exact re-run command. Never mark it passed on a host that cannot run the pipeline.
8. **Narrating a remembered source.** Every slide traces to text actually read or fetched this run (Phase 2). A half-remembered version of a paper is a trust violation, not a shortcut.

## Worked example

`/explainer-video https://example.com/research/main.pdf --length standard`

- **Phase 1.** Settings give `docs_path=docs/pmos`; length `standard` (source: cli). Slug `research-main`.
- **Phase 2.** Distiller subagent (`sonnet`) reads the PDF via native `Read` `pages` → ~6,000 words of clean text; `ingest.mjs` extracts 4 figures from the paper (2 charts, 1 diagram, 1 photo; a tracking pixel and a logo are size/role-filtered out) → `figures.json`.
- **Phase 3.** Distilled to 13 slides, one idea each; slide 5 references `fig_2` (the architecture diagram) and slide 9 `fig_3` (the results chart); bullets average 0.7/slide; `deck.json` validated.
- **Phase 4.** `deck.html` authored (13 `<section>`s, notes in `data-notes`, both figures placed); `render-slides.mjs` → `frames/slide_01.png … slide_13.png` at 1920×1080.
- **Phase 5.** Dep gate passes (ffmpeg + ffprobe present); `say` picks the installed Enhanced voice and nudges once; `narrate.sh` → 13 WAVs + `durations.json` (total ≈ 218 s).
- **Phase 6.** `assemble.sh` → `video.mp4` (1920×1080 H.264/AAC, burned-in captions); self-check: 13 frames == 13 slides, duration 219 s ≈ 218 s, all audio non-silent, both figure refs resolved → PASS. Six artifacts landed; `explainer-video.html` library regenerated.

---

*Spec lineage: epic 0612-gd0 design contract at `docs/pmos/features/2026-06-12_explainer-video/02_design.html` (D1–D7) + grill resolutions (2026-06-13); story 0612-jc5. Authoring + emit substrate reused from `_shared/html-authoring/`, `_shared/non-interactive.md`; capture patterned on `design-crit/assets/capture.mjs`; TTS detection patterned on `/magazine`'s `scripts/transcribe.sh`.*
