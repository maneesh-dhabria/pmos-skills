---
name: to-notion-doc
description: Convert a local document into a faithful Notion page. Use when the user wants to turn a Markdown, HTML, or text file into Notion — or says "/to-notion-doc", "put this doc in Notion", "convert this Markdown to a Notion page", "import this HTML into Notion", "push this file to Notion". Parses .md/.html/.txt into a block tree, maps it to Notion blocks via the Notion MCP (headings, lists, tables, code, callouts, toggles, images), remembers your heading + visual-style preferences, never drops table columns/rows, writes in resumable chunks, can create a new page or update an existing one, and verifies the result block-for-block.
user-invocable: true
argument-hint: "<path-to-.md|.html|.txt> [--parent <page>] [--into <page>] [--update-mode rewrite|archive|in-place] [--style minimal|expressive] [--headings toggle|normal] [--image-mode mcp-only|rest-upload] [--non-interactive]"
allowed-tools: Bash, Read
---

# to-notion-doc — faithful local document → Notion page

Convert a local **`.md` / `.html` / `.txt`** file into a Notion page that preserves structure (headings,
lists, tables, code, quotes/callouts, dividers, links, images) instead of dumping flattened text. The
deterministic work — parsing, table-cell padding, chunk arithmetic, language/color validation, and the
post-write reconciliation — lives in four zero-dependency Node scripts under `scripts/` (each with an embedded
`--selftest`); this SKILL.md orchestrates the Notion **MCP** calls, the preference prompts, and `settings.yaml`
I/O. Every Notion-API / Notion-flavored-Markdown fact lives in **`reference/notion-blocks.md`** (one home) —
this body cites it, never restates it.

**Write path (reference/notion-blocks.md §0):** all page content is written through the Notion **content MCP**
(`notion-create-pages`, `notion-update-page`, `notion-fetch`, `notion-search`) as Notion-flavored Markdown —
**no REST block API**. The single capability the MCP cannot express is uploading a *local* image; that is the
opt-in `rest-upload` rung of the image ladder (§3 below), which is disclosed to require a Notion integration
token and otherwise degrades to a placeholder stub.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No `AskUserQuestion` tool:** the preference confirm (Phase 0), ambiguity prompts and image-mode ask
  (Phase 2), and the parent / update-mode picks (Phase 3) degrade to numbered free-form prompts. The
  non-interactive auto-pick contract below still governs unattended runs.
- **No Notion MCP connected:** hard error — this skill writes exclusively through the Notion MCP. Tell the user
  to connect the Notion integration; do not fall back to any REST path.
- **No Bash tool:** the user runs the four `node scripts/*.mjs` invocations themselves and pastes the JSON back;
  the parsing/mapping logic is unchanged.
- **`.pmos/settings.yaml` missing:** treat as a first run — ask the preferences and create the file.

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

## Flags & natural language

Every option also has a natural-language form — infer it from the request; an explicit flag overrides. The
contract flags in the argument-hint are: `--parent <page>` (parent for a new page), `--into <page>` (update an
existing page), `--update-mode rewrite|archive|in-place`, `--style minimal|expressive`,
`--headings toggle|normal`, `--image-mode mcp-only|rest-upload`, and `--non-interactive`. Two spellings are
parsed but not advertised:

<!-- nl-sugar -->
- `--expressive` / `--minimal` — bare aliases for `--style expressive` / `--style minimal`.
<!-- nl-sugar -->
- `--toggle` — alias for `--headings toggle` ("make the headings collapsible" ≡ this).

## Track Progress

This skill has multiple phases. Create one task per phase (Phase 0 → Phase 6) using your agent's
task-tracking tool (e.g. `TaskCreate` / `TodoWrite`). Mark each in-progress when you start it and completed as
soon as it finishes — do not batch completions. The write phase (Phase 3) is the only one with outward-facing
effects; keep its task visible until the verification pass (Phase 4) confirms the page is complete.

## Phase 0: Resolve input + preferences {#resolve-prefs}

0. **Load learnings.** Read `~/.pmos/learnings.md` if present and factor any entries under `## /to-notion-doc`
   into this run (e.g. a parent page the user always targets, or a style they corrected last time). This skill
   body wins on conflict; surface a conflict to the user before applying.

1. **Input.** Take the path argument; confirm it exists and ends `.md` / `.html` / `.txt` (format inferred from
   the extension — `scripts/parse-doc.mjs` `formatFromPath`). No path → usage error, exit 64.
2. **Read preferences.** Read `.pmos/settings.yaml :: to_notion_doc` (keys: `heading_style`, `visual_style`,
   `image_mode`, `last_parent`, `notion_token_env` (default `NOTION_TOKEN`), `updated`).
3. **First run (no `to_notion_doc` block)** — ask preferences, then write the block with today's `updated:`
   date. Each ask carries a `(Recommended)` option so unattended runs AUTO-PICK the first-run default:

   - **Heading style** — `AskUserQuestion`: *Normal headings (Recommended)* vs *Toggle headings* (collapsible;
     body nested under each heading). AUTO-PICK normal.
   - **Visual style** — *Minimal (Recommended)* (plain blocks, no emoji/color/callouts) vs *Expressive* (emoji +
     semantic color + callouts per reference/notion-blocks.md). AUTO-PICK minimal.
   - **Image mode** *(only if the source contains local/relative images)* — *MCP-only (Recommended)* (local
     images become a labeled placeholder stub; no token needed) vs *REST upload* (uploads local images via the
     Notion File Upload API — **this requires a Notion integration token** in the env var
     `notion_token_env`; if absent, falls back to the stub). AUTO-PICK mcp-only. State the token requirement in
     the option description.

4. **Later runs (block present)** — a single confirm-against-last-run, **not** a re-ask from scratch:

   - `AskUserQuestion`: *Use saved preferences (Recommended)* (show the remembered heading/visual/image values)
     vs *Edit preferences* (re-opens the three asks above). AUTO-PICK use-saved.

5. **Flag overrides.** `--headings` / `--style` / `--image-mode` override for this run **without** rewriting
   settings, unless the confirm above chose to save. Print the resolved `(heading, visual, image_mode)` to chat.

## Phase 1: Parse + map {#parse-map}

1. **Parse:** `node scripts/parse-doc.mjs <path>` → normalized block tree JSON (stable `si` source-indices;
   unmappable rich media emitted as `ambiguous` nodes carrying the raw source).
2. **Map:** `node scripts/map-to-notion.mjs --style <minimal|expressive> --headings <normal|toggle> <tree.json>`
   → `{ blocks, nfm, plan }` (the REST-faithful model, its Notion-flavored-Markdown render, and the
   per-source-block reconciliation plan). Table fidelity (cells padded/truncated to `table_width`), the
   code-language enum, and the color enum are all enforced here per reference/notion-blocks.md §3–§4.
3. **Census:** report block counts by type and the count of `ambiguous` nodes + images headed to Phase 2.

## Phase 2: Resolve ambiguities + build images {#resolve-media}

1. **Ambiguities** — for each `ambiguous` node (and each plan entry with disposition `ambiguous-pending`), one
   `AskUserQuestion`. Offer realistic conversions; the always-available fallback is `(Recommended)` so nothing
   is ever silently dropped:

   - Options: *Placeholder callout (Recommended)* (a labeled callout verification can account for) /
     *Bookmark the source* (if a URL is recoverable) / *Upload as image* (only if a renderable asset exists).
     AUTO-PICK placeholder-callout. Record each resolution as `si → {mapped|stubbed|user-skipped}`.

2. **Images** — for each image node, `scripts/upload-image.mjs` `resolveRung` decides the rung from the resolved
   `image_mode` + token presence (reference/notion-blocks.md §5):
   - **external https URL in source** → `buildExternal` (NFM external image).
   - **mcp-only local image** → `buildStub`: copy the file to `./to-notion-doc-assets/<slug>/` (via Bash) and
     emit the callout-path + empty-image-placeholder pair. Counts as *stubbed* in verification.
   - **rest-upload + token present** → `uploadImage` (File Upload API; token read from the env var, **never**
     logged or persisted). On a thrown error / missing token, catch → fall back to `buildStub` and warn.

## Phase 3: Create or update + chunked write {#write}

1. **Target resolution.**
   - **Bare invocation → create a new page.** Parent precedence: `--parent` wins; else `notion-search` and let
     the user pick; `last_parent` is *suggested*, never auto-applied. The parent pick is **defer-only** — in an
     unattended run with no `--parent`, error out (a new page needs an explicit parent); never guess a workspace
     location.

     <!-- defer-only: ambiguous -->
     - `AskUserQuestion`: pick the parent page from `notion-search` results (no Recommended — DEFER; absent
       `--parent` under `--non-interactive` ⇒ error per AC12).

   - **`--into <page>` → update an existing page.** Ask the update mode:

     - `AskUserQuestion`: *Archive then write (Recommended)* (move the page's existing top-level blocks under a
       new collapsed toggleable `heading_1` "Archive", then write the new content above — non-destructive) /
       *Rewrite* (clear the page, then write anew — destructive) / *In-place* (append / reconcile). AUTO-PICK
       archive (the non-destructive default).

2. **Write (chunked + resumable).** `node scripts/chunk-blocks.mjs <map.json>` → an ordered write plan. The
   first `create`-kind batch becomes the `notion-create-pages` `content` (its NFM); every later `append` batch
   becomes a `notion-update-page insert_content` (position `end`), and create-then-append batches target the
   parent block returned by the prior step (reference/notion-blocks.md §6). After each batch, persist
   `{ page_id, last_si }` to `./to-notion-doc-assets/<slug>/.write-cursor.json`; on a re-run with the same
   source + page, skip every batch whose `lastSi ≤` the cursor (idempotent resume, no duplicate blocks).

## Phase 4: Verify {#verify}

1. Re-fetch the page: `notion-fetch <page>` → NFM. Derive the set of source-indices that landed.
2. `node scripts/verify-page.mjs` with the `plan`, the Phase-2 `resolutions`, the mapped `blocks`, and the
   fetched coverage:
   - **Completeness:** every source `si` must reach a terminal disposition `{mapped, stubbed, user-skipped}`;
     any unresolved or dropped block is reported **unaccounted-for** — fail loudly (do not declare success).
   - **Integrity:** no orphaned block, every table row's `cells.length == table_width`, no accidentally-empty
     block where the source had content, all code languages + colors in-enum (reference/notion-blocks.md §7).

## Phase 5: Conversion report {#report}

Emit a report: block counts by type, ambiguities and how each resolved, image dispositions (external / stub /
uploaded), the page URL, and the pass/fail of both verification passes (with the offending source location on
any failure). If verification found unaccounted-for or integrity failures, surface them prominently — a
partial/incorrect conversion must never be reported as clean.

## Phase 6: Capture Learnings {#capture-learnings}

If this run surfaced something reusable — a source pattern the parser mishandled, a Notion-side limit worth
remembering, a parent page or style the user reached for — offer to append it under `## /to-notion-doc` in
`~/.pmos/learnings.md` (create the file/section if absent). Keep entries short and general; never record the
converted document's content, a Notion integration token, or any page-private data. Nothing reusable → skip
silently.
