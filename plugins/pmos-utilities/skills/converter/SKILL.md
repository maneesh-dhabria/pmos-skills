---
name: converter
description: Convert files between formats in a local browser UI. Use when the user wants to convert a file or data between formats — JSON↔YAML, CSV↔JSON (and, as the skill grows, HTML↔Markdown, PDF↔Markdown) — or says "/converter", "convert this JSON to YAML", "turn this CSV into JSON", "format converter". Launches a tiny zero-dependency Node server and opens a single self-contained HTML page; everything runs offline on your machine, no npm install, no account, no upload.
user-invocable: true
argument-hint: "(no arguments — launches the converter UI; pick a conversion, paste or drop a file, convert + download, all in the browser)"
allowed-tools: Bash, Read
---

# Converter — local file-format conversion

Launch-only skill. It does not convert anything itself — it starts a tiny
zero-dependency Node server (`scripts/server.js`) and points your browser at a single
self-contained page (`ui/converter.html`) where you pick a conversion, paste text or
drop a file, and get a preview + download. All conversion logic runs server-side in
Node so the vendored converter libraries stay pure and unit-testable, and nothing is
ever uploaded off your machine.

v1 ships two bidirectional pure pairs — **JSON ↔ YAML** and **CSV ↔ JSON** — built on a
converter **registry**: every conversion is one descriptor module under
`lib/converters/`, and the server and UI both derive the conversion list from the
registry (so new conversions need zero server/UI edits). The cross-skill design contract
lives in `docs/pmos/features/2026-06-17_converter/02_design.html` (the registry shape,
the text/binary descriptor modes, the pure-vs-llm backend split, and the launch contract).

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No `AskUserQuestion` tool:** Not used — this skill is prompt-free (a free port is
  auto-selected and a missing Node is a hard error), so there is nothing to degrade. The
  non-interactive contract block below is inlined only to satisfy the repo-wide W14 lint;
  no checkpoint ever fires.
- **No Bash tool:** the user runs the one launch command themselves —
  `node <skill-dir>/scripts/server.js` — and opens the printed
  `http://127.0.0.1:<port>/` URL.
- **No browser auto-open** (headless / SSH): the server prints the
  `http://127.0.0.1:<port>/` URL; open it manually in any browser. There is **no silent
  `file://` fallback** — the conversion backend needs the server (D2/Inv-5).

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

## Load Learnings

Read `~/.pmos/learnings.md` if present and apply any entries under `## /converter` to this
launch (e.g. a host-specific browser-open quirk or a Node path note). The skill body wins
on conflict; surface conflicts before applying. This skill has no persistent artifact, so
there is nothing else to load.

## Phase 0: Launch the converter {#launch}

1. **Resolve paths** relative to this skill's directory (`<skill-dir>`):
   - Server: `<skill-dir>/scripts/server.js`
   - UI (served by the server): `<skill-dir>/ui/converter.html`
2. **Assert Node is present** — run `node --version`. On failure, emit a Node-prerequisite
   hard error (`/converter needs Node.js on PATH — install Node and re-run`) and **stop**.
   There is **no silent `file://` fallback** (D2/Inv-5): the conversion backend runs in Node.
3. **Launch** in the background so the server keeps running while you convert:
   ```bash
   node <skill-dir>/scripts/server.js
   ```
   The server binds a free ephemeral port on `127.0.0.1`, prints
   `Converter ready at http://127.0.0.1:<port>/` plus the list of conversions, and
   auto-opens your default browser. If the browser does not open (headless), open the
   printed URL manually.
4. **Report** to the user: the URL, the supported conversions (JSON↔YAML, CSV↔JSON), that
   they pick a conversion, paste text or drop/choose a file, click **Convert**, then
   preview and **Download** the result, and that **Ctrl-C** in the launch terminal stops
   the server. Nothing is uploaded or persisted — it is a local single-user tool.

## Phase 1: Capture Learnings {#capture-learnings}

If anything about launching was host-specific and worth remembering (a browser that
wouldn't auto-open, a Node path quirk, a port-binding hiccup, a conversion that surprised
you on real input), append a one-line entry under `## /converter` in
`~/.pmos/learnings.md`. Nothing notable → write nothing. Never record converted content —
it is the user's data and stays on their machine.
