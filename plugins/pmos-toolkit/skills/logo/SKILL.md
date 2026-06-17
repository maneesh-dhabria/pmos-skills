---
name: logo
description: Propose and generate on-brand SVG logo candidates from a brief (free text, a web URL, and/or existing brand assets). Decomposes the brief into N named logo needs (brand mark, feature icon, nav glyph, favicon…), extracts a style-profile, clarifies a thin brief, then explores 2–3 distinct concept directions and candidate styles approved on two separate axes (idea, then look) before authoring 2–3 self-contained SVG variants per need within the approved concept × style. A hybrid evaluator gates every candidate — deterministic code-metrics (mark-type-aware aspect bounds) plus a renderer-backed vision check — and a renderer (Playwright → rsvg-convert → cairosvg) is a hard gate. Emits icon-only and monochrome-fallback deliverables and a single self-contained `logo.html` showcase. Standalone — does not load workstream context. Use when the user says "create a logo", "design a logo", "make an SVG logo", "I need a brand mark", "generate a favicon", or "I need a logo for this feature / brand / nav".
user-invocable: true
argument-hint: "<brief text> [--out <dir>] [--theme <name>] [--ref <url|path>] [--types <list>] [--renderer playwright|rsvg|cairosvg] [--non-interactive | --interactive] [--selftest] [--clear-cache]"
---

# `/logo` — On-brand SVG logo candidate generator

**Announce at start:** "Using the logo skill to generate on-brand SVG logo candidates from your brief."

Turn a brief — free text, a web URL, and/or existing brand assets — into a **set** of logo candidates. The skill decomposes the brief into N named logo needs, extracts a style-profile from any reference inputs, authors 2–3 self-contained `.svg` variants per need, gates each through a hybrid evaluator, and assembles a single self-contained `logo.html` showcase. It is **standalone** — it does not load workstream context and does not gate any pipeline stage. It is a sibling of `/diagram`: same renderer hard-gate, same deterministic-metrics-plus-vision eval shape, same in-session `$0` SVG authoring (no paid generation API, ever).

**NL-first options:** infer flag values from the request — "use the minimal theme" ≡ `--theme flat-minimal`, "match acme.com" ≡ `--ref https://acme.com`, "just a brand mark and a favicon" ≡ `--types brand-mark,favicon`; an explicit flag always overrides. Never infer `--clear-cache` (destructive) or `--renderer` (machine contract / environment override).

---

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No interactive prompt tool:** state your assumption, record it in the `logo.json` sidecar + the open-questions buffer, and proceed.
  - Phase 2 decomposition confirm: accept the auto-decomposition (the Recommended option).
  - Phase 3 clarify + concept/style approvals: skip the clarify gate per its deterministic check; AUTO-PICK the best-fit concept and best-fit style, recording the alternatives to the sidecar + open-questions buffer.
  - Phase 5 refinement findings: present per the platform fallback in `_shared/findings-dispositions.md` (numbered table, structured ask); do NOT silently self-fix beyond the deterministic safe edits.
  - Phase 6 output collision: default to writing a fresh `<run-slug>` run folder (never overwrite an existing run).
  - Phase 7 learnings: do NOT auto-write; record the proposed bullets to the open-questions buffer.
- **No subagents:** run the Phase 4 generation and Phase 5 vision review inline — same prompts, same rubric. Dispatch buys parallelism and fresh-eyes isolation, not different criteria.
- **No Playwright MCP:** use `rsvg-convert` or `cairosvg` per `../diagram/reference/render-to-raster.md`; refuse to run if none are available (Phase 0 hard gate).

---

## Track Progress

This skill has integer phases 0–7 (Phases 0–6 are the functional pipeline; Phase 7 captures learnings). Create one task per phase you'll touch using your agent's task-tracking tool (e.g., `TodoWrite` in Claude Code, equivalent in other agents). Mark each task in-progress when you start it and completed as soon as it finishes — do not batch completions.

---

## Load Learnings

Read `~/.pmos/learnings.md` if it exists. Note any entries under `## /logo` and factor them into your approach for this session.

---

## Phase 0 — Setup, args, hard-gate renderer detection {#setup}

1. **Parse args.**
   - Positional: the free-form brief (required, unless `--clear-cache` or `--selftest` is the only arg).
   - Flags: `--out <dir>`, `--theme <name>` (default `flat-minimal`), `--ref <url|path>` (repeatable — each adds one reference input), `--types <list>` (comma-separated mark-type / need hints that seed the decomposition), `--renderer {playwright|rsvg|cairosvg}` (force one detected renderer; default = auto-detect order), `--selftest`, `--clear-cache`, `--non-interactive | --interactive`.
   - **Enum validation:** `--renderer` not in `{playwright, rsvg, cairosvg}` → print `error: --renderer must be one of {playwright, rsvg, cairosvg}` to stderr, exit 64. `--theme` not a bundled theme name → print the available theme list and exit 2.
   - Derive `<run-slug>` = first 4–5 content words of the brief, kebab-cased (fallback `logo-run` for asset-only briefs).
   - **Resolve `{docs_path}`**: read `.pmos/settings.yaml` in the current repo; if present, use its `docs_path`. If absent, fall back to `docs/pmos/` (create on demand).
   - Default `--out` = `{docs_path}/logo/<run-slug>/` (create on demand). Per-need outputs land under `<out>/<need>/`.

2. **Special-mode shortcuts** (handle and exit):
   - `--clear-cache` → wipe `~/.pmos/logo-cache/` (and only that directory). Print the count of files removed. Exit 0.
   - `--selftest` → run `node "${CLAUDE_PLUGIN_ROOT}/skills/logo/tests/run.mjs"`. Exit with the runner's exit code.

3. **Renderer detection (HARD GATE).** Detect per `../diagram/reference/render-to-raster.md` §Detection — Playwright MCP → `rsvg-convert` → `cairosvg`, first hit wins (or the single renderer named by `--renderer`, which still must be present). If none → REFUSE TO RUN: print that file's install-hint block verbatim and exit 2. The favicon-legibility and monochrome-still-reads checks need a rasterizer; without one half the eval is missing (D2).

4. **Resolve `--theme`** (default `flat-minimal`). Load `themes/<theme>/theme.yaml` and validate it against `themes/_schema.json`. Missing file or schema failure → print the error and exit 2. The theme governs the SVG technique, palette ceiling, stroke floor, and (for non-flat themes) the mandatory flat+mono fallback rule. Read `themes/<theme>/style.md` end-to-end for the rationale behind the tokens.

---

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

## Phase 1 — Intake + style-profile extraction {#intake}

Read every input the brief provides and unify them into one **style-profile** (D3 — all four reference inputs are supported). Each input contributes evidence; the profile is the merged result, threaded into Phases 3–5 (and augmented by the Phase 3 {#explore} clarify answers).

1. **Text brief** — extract the subject (what the logo represents), the intended feel, and any explicit constraints (colors named, "must work in one color", "playful", "enterprise"). Text-only briefs derive the profile from mood adjectives alone.

2. **Web URL** (`--ref <url>`) — drive the renderer's browser path (Playwright MCP) to screenshot the page, and scrape declared brand signals: CSS color custom-properties, prominent `background`/`color` values, and `<meta name="theme-color">`. Quantize the screenshot's dominant colors when CSS scraping is thin.

3. **Local raster asset** (`--ref <path.png|.jpg>`) — run `node "${CLAUDE_PLUGIN_ROOT}/skills/logo/scripts/extract-palette.mjs" <path>` to k-means-quantize the dominant palette (zero runtime dependencies). Use the returned ordered swatches as the seed palette.

4. **Existing SVG seed** (`--ref <path.svg>`) — read the SVG directly: collect `fill`/`stroke` colors, `rx`/`ry` corner radii, `stroke-width`, and the path-command vocabulary (curve-heavy vs. straight-edged) to infer geometry feel. No rasterization needed — vector geometry is read structurally.

Build the style-profile JSON:

```json
{
  "palette": ["#RRGGBB", ...],        // ordered, most-dominant first
  "corner_style": "sharp|soft|round", // from radii / geometry
  "stroke_ratio": 0.0,                // representative stroke-width ÷ viewBox height, or null
  "type_feel": "geometric|humanist|mono|none",
  "mood_adjectives": ["...", "..."]
}
```

Persist the profile (it is written into the `logo.json` sidecar at Phase 6 {#deliver}). Announce the extracted profile so the user can see what every candidate will be conditioned on and checked against.

---

## Phase 2 — Decompose the brief into logo needs {#decompose}

The core verb of this skill is **decomposition**, not single-logo generation (D6). A brief like "I need branding for my reports feature" implies more than one mark.

1. **Carve the brief into N named logo needs.** Each need has: a stable kebab `name` (e.g. `brand-mark`, `feature:reports-icon`, `nav:settings`, `favicon`), a recommended **mark type** (one of the seven — see below), an intended **usage/size context** (brand vs. feature vs. nav/toolbar vs. favicon), and a **suggested theme** (defaulting to the run `--theme`). Seed the carve with any `--types` hints.

2. **Mark types (all seven supported, D4):** `wordmark`, `lettermark/monogram`, `pictorial`, `abstract`, `combination`, `emblem`, `mascot`. Wordmarks use a system-font `<text>` + geometric letterforms (licensed-typeface outline reproduction is out of scope — name the limit, don't silently approximate). `mascot` and detailed-pictorial marks are **best-effort** — flag them as such in the decomposition.

3. **Confirm the decomposition.**
   - Interactive — issue one `AskUserQuestion`: "Here is how I'd break this brief into logo needs. Use it, edit it, or start over?" Options: **Use this decomposition (Recommended)** / **Edit needs** / **Re-decompose**. Show the carve (need name · mark type · usage) in the message so it is self-contained.
   - Non-interactive — AUTO-PICK the Recommended option; record the auto-decomposition (and any alternatives weighed) in the `logo.json` sidecar and the open-questions buffer.

Record the final need list — it is the work queue for Phases 3–6 (explore, generate, evaluate, deliver).

---

## Phase 3 — Clarify + explore: concept & style {#explore}

Before any SVG is drawn, settle the two things the brief usually leaves open: **what the mark should say** (concept) and **how it should look** (style). They are approved on **two separate axes** (D2/D3/D7) so a strong idea is never welded to the first style tried, and so a style choice never quietly redefines the idea.

### 1. Clarify gate (deterministic thin-brief check)

Decide **deterministically** whether the brief is rich enough to proceed without asking. Two signals, drawn from the Phase 1 {#intake} style-profile, the Phase 2 {#decompose} needs, and the raw args:

- **usage signal** — present if any `--ref` was given, any `--types` hint was passed, or the brief / a need carries an explicit usage-or-size context (brand, feature, nav, favicon).
- **color/vibe signal** — present if the brief named colors, a `--ref` supplied a palette, or the profile's `type_feel` / `mood_adjectives` is non-empty.

If **either** signal is present the brief is rich enough → **skip** the gate and log `clarify: skipped (usage=<y/n>, color-vibe=<y/n>)`. Only when the brief **lacks usage AND lacks color/vibe** (FR2), fire **one consolidated** `AskUserQuestion` carrying three questions, each with a **(Recommended)** best-fit option:

- **Usage context** — where will it run? Options: **Brand mark + favicon (Recommended)** / Feature & product icon set / Nav & toolbar glyphs.
- **Color & vibe (+ hard constraints)** — the register, plus any must-use / must-avoid colors. Options: **Modern & minimal (Recommended)** / Playful & friendly / Enterprise & serious. (The free-form "Other" captures named colors or constraints.)
- **Must work in one color?** Options: **Yes — keep it monochrome-safe (Recommended)** / No, color is essential.

Thread the answers back into the Phase 1 {#intake} style-profile (they augment, never erase, extracted evidence). Under `--non-interactive` the classifier AUTO-PICKs the best-fit (Recommended) for each and records the question to the OQ buffer; the run proceeds on those best-fit assumptions (FR2.4).

### 2. Concept exploration + approval — axis 1, the idea

Research the **subject** (what the logo represents) from the brief, the `--ref` signals, and the clarify answers, then propose **2–3 genuinely distinct concept directions**. Each concept is a different idea / metaphor / symbolism, carrying the **conventional colors** that idea usually wears (e.g. a "growth" concept → greens; a "trust / finance" concept → blues). Concepts are distinct **ideas**, not recolors of one mark (FR3).

Approve the concept (axis 1):

- Interactive — one `AskUserQuestion`: "Which concept direction should I develop?" Options = the 2–3 concepts, the strongest framed first as **(Recommended)**, each labelled with its idea + conventional palette in the message so it is self-contained.
- Non-interactive — AUTO-PICK the leading (best-fit) concept; record the runners-up to the `logo.json` sidecar + the OQ buffer.

### 3. Style exploration + approval — axis 2, the look

For the **leading concept**, propose **2–3 candidate styles** drawn from the six bundled themes (`themes/*/style.md`), each chosen to serve that concept. For every candidate, state its **color ceiling** (the theme's `palette.max_colors`) and **flag when the concept's conventional palette exceeds that ceiling** (e.g. a 4-colour concept under a ≤3-colour flat theme — name the trade-off, do not silently drop colours) (FR4).

`--theme <name>` pre-selects that theme as the leading style candidate but **does not skip** this approval (D7) — it only seeds the Recommended option.

Approve the style (axis 2, separate from the concept):

- Interactive — one `AskUserQuestion`: "Which style should I render the concept in?" Options = the candidate styles (the `--theme` pick, or the best concept-fit, first as **(Recommended)**), each noting its colour ceiling.
- Non-interactive — AUTO-PICK the best-fit style; record alternatives to the sidecar + the OQ buffer.

Record the approved **(concept × style)** pair, plus the weighed alternatives, into the run's `logo.json` sidecar. This pair conditions Phase 4 {#generate}.

---

## Phase 4 — Divergent generation (2–3 SVG variants per need) {#generate}

For each need, author **2–3 structurally distinct variants**, each a standalone self-contained `.svg`, conditioned on the **approved concept × style** from Phase 3 {#explore} and the Phase 1 style-profile. The concept (the idea) and the style (the theme) are already settled — variants diverge on **structure**, not on the idea or the look.

1. **Per-variant SVG contract (every file):**
   - Valid XML; a single root `<svg>` carrying `xmlns` + a `viewBox`.
   - No `<image>` / `data:image` raster embeds; no `<script>`; no external references.
   - **Unique, namespaced ids** for every gradient, clipPath, filter, and mask — prefix each with the need + variant (e.g. `id="reports-icon-v2-grad"`). This is critical: Phase 5 inlines many SVGs on one page and colliding `url(#…)` references silently cross-wire fills.
   - A `<title>` first child (a11y) naming the need + variant.
   - Real negative space — never fake a cutout by painting a shape in the page background color; use a `clipPath`/`mask` or genuine path holes (the deterministic gate flags page-colored fills).

2. **Diverge on real dimensions** per variant — literal vs. abstract, enclosed vs. open, symmetric vs. dynamic, positive vs. negative-space-led — all **within the approved concept**. The idea is fixed; the structure varies. Do not re-decide the concept here, and do not emit three recolors of one mark.

3. **Apply the theme technique** from `themes/<theme>/style.md` (flat fills, single-weight strokes, geometric construction, duotone gradient, badge enclosure, or dimensional-flat soft shadow). Honor the theme's palette ceiling and stroke floor.

4. **Required deliverable variants (D1, AC6):**
   - `combination` / `emblem` / `wordmark` needs additionally emit an **icon-only** variant (the mark without the wordmark) — usable at nav/favicon size.
   - Every **non-flat-theme** candidate additionally emits a flat **monochrome** fallback (single `currentColor`/ink fill, no gradient/shadow) — the mark must still read with all color and depth removed.

5. **§L dispatch.** Independent needs (and independent variants within a need) share no state. When a renderer is available and the Task tool is callable, fan out generation as parallel subagents (`model: inherit` — open-ended creative authoring), one per need; fall back to inline sequential authoring otherwise. Deterministic metrics are never computed by the model — they run as the Phase 5 {#evaluate} script (§H).

6. **Carry each need's mark type forward.** Hand the need's mark type (one of the seven) to the Phase 5 {#evaluate} evaluator via `svg-metrics.mjs --mark-type <type>`, so lockup marks (`combination`/`emblem`/`wordmark`) are gated with the wider aspect band and the rest stay square. A lockup's **icon-only** variant is evaluated as a square icon (omit the flag, or pass a square type).

Write each variant to a temp path under `<out>/<need>/` (`.svg.tmp`); Phase 6 {#deliver} finalizes.

---

## Phase 5 — Hybrid evaluator + ≤2 refine loop {#evaluate}

Every candidate is gated by a **hybrid** evaluator: a deterministic code-metrics script (hard gates) plus a renderer-backed vision rubric. Mirrors `/diagram`'s eval shape; definitions live in `eval/code-metrics.md` and `eval/rubric.md`.

1. **Deterministic code-metrics (SCRIPT — hard gates).** Run:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/skills/logo/scripts/svg-metrics.mjs" <variant>.svg.tmp --theme <theme> --mark-type <type>
   ```

   It returns `{ hard_fails[], metrics{}, pass }`. Hard-fail conditions (the arithmetic lives in the script, never the model — §H): not valid XML / not a single root `<svg viewBox>`; any raster embed or `<script>`; distinct-color count over the theme ceiling (≤3 flat / ≤5 gradient); **minimum effective stroke** below ~1px at a 16px render (`stroke-width × 16 ÷ viewBox-height`); viewBox aspect outside the **mark-type band** (`viewbox-not-square` — square types `[0.8, 1.25]`, lockup types `combination`/`emblem`/`wordmark` `[0.8, 4.0]`, flag absent = `[0.8, 1.25]`; an unknown `--mark-type` value exits 64 with the valid list); path-data / node budget exceeded; non-unique or non-namespaced `defs` ids; page-colored fake-negative-space fill. Any hard fail auto-rejects that variant into the refine loop.

2. **Renderer-backed vision rubric.** Rasterize each surviving variant at full size **and** at 16px favicon size (cache under `~/.pmos/logo-cache/<need>-<sha1>.png`). Review (subagent when available per §L, else inline — `model: inherit`) against `eval/rubric.md`: **favicon-16px legibility** (does the mark survive shrinking), **monochrome-still-reads** (mandatory — the mono fallback must hold up), and **brief-fit** (does it match the style-profile + the need). The rubric returns per-item `{verdict, evidence}` + a gating `blocker_count`.

3. **Refine loop (≤2 per candidate).** For a candidate with hard-fails or vision blockers, present findings per `_shared/findings-dispositions.md`:
   - Deterministic safe edits the script re-verifies (collapse a color to a theme token, thicken a hairline stroke, namespace a colliding id, square the viewBox, simplify an over-budget path) → **Fix as proposed (Recommended)**; under `--non-interactive` the classifier AUTO-PICKs these so headless runs self-fix.
   - Concept-level findings (the mark itself doesn't fit the brief, needs a different framing) → tag `<!-- defer-only: ambiguous -->` at the call site; under `--non-interactive` they defer to the OQ buffer.
   - Apply disposed fixes as minimal SVG edits, then re-run steps 1–2. Break early when hard_fails == [] AND blocker_count == 0. After 2 loops, carry any residual fails forward as a recorded warning on that candidate (never a silent retry).

Record every candidate's eval verdict + dispositions for the sidecar.

---

## Phase 6 — Deliverables + `logo.html` showcase {#deliver}

1. **Write every SVG** under `<out>/<need>/`: each variant `<variant>.svg`, plus its `<variant>-icon.svg` (where required) and `<variant>-mono.svg` (for non-flat themes). Re-confirm across the full set that no gradient/clip/filter id collides once all marks share `logo.html`.

2. **Assemble `logo.html`** via the `_shared/html-authoring/` substrate (D7). Use `render.js` → `renderArtifact()`:

   ```js
   const { renderArtifact } = require('${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/render.js');
   const fs = require('fs');
   let template = fs.readFileSync('${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/template.html', 'utf8');
   // GOTCHA: strip template.html's leading <!-- … --> doc-comment before rendering —
   // otherwise the {{content}}/{{inline_css}} tokens inside that comment get
   // substituted too and the body is emitted twice.
   template = template.replace(/^\s*<!--[\s\S]*?-->\s*/, '');
   const html = renderArtifact({ template, title: 'Logo candidates — <run-slug>',
     content, assetPrefix: 'assets/', pluginVersion: '<v>', pmosSkill: 'logo' });
   ```

   The `{{content}}` body embeds **every need × variant inline** (real `<svg>`, not `<img>`), each shown on **light and dark** backgrounds and at **full and favicon (16/24px)** size, with a per-file **download link**, the **eval verdict** for that candidate, and the run's **style-profile**. Follow `_shared/html-authoring/conventions.md`: one `<section id>` per need, kebab `<h2>`/`<h3>` ids, `<figure>` + `<figcaption>` per mark. The substrate bakes in the inline-comments overlay and `<meta name="pmos:skill" content="logo">`; use `assetPrefix: 'assets/'` and `?v=<plugin-version>` cache-bust.

3. **Copy the comment substrate** alongside the output (same six files as `/diagram`):

   ```bash
   cp -n  "${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/comments.js"   "<out>/assets/"
   cp -n  "${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/comments.css"  "<out>/assets/"
   install -m 0755 "${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/comments-open.command" "<out>/assets/comments-open.command"
   install -m 0755 "${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/comments-open.sh"      "<out>/assets/comments-open.sh"
   cp -n  "${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/comments-open.bat" "<out>/assets/"
   ```

4. **Write `<run-slug>.logo.json` sidecar** next to `logo.html`: the decomposition (needs + mark types), the style-profile, per-candidate eval scores + dispositions, and the design rationale. Machine-readable, mirroring `/diagram`'s sidecar.

5. **Print final stdout** — the run folder path, then a one-line summary: `Logos: <N needs>, <M candidates> (<K passed eval>), showcase at <out>/logo.html`.

---

## Phase 7: Capture Learnings {#capture-learnings}

**This skill is not complete until the learnings-capture process has run.** Read and follow `_shared/learnings-capture.md` (relative to the skills directory) for the entry format. Reflect on surprising rendering behaviors, repeated user corrections, eval-rubric drift, concept/style framings that worked unusually well or badly. Proposing zero learnings is valid; the gate is that the reflection happens.

**Approval before any write (FR7).** Surface the proposed learnings to the user as **bullets** and get explicit **y / n / edit** approval before writing anything — **never silently write** a learning. Write only what the user approves. Under `--non-interactive`, do **not** auto-write: record the proposed bullets to the OQ buffer and leave the write for a later interactive run. If the shared file is not found, the approved entries append to `~/.pmos/learnings.md` under `## /logo`.

---

## Anti-patterns (DO NOT)

- Do NOT treat the brief as a single logo. The skill's job is to **decompose** into named needs (Phase 2) — even a one-mark brief is decomposed explicitly so the rationale is visible.
- Do NOT emit three recolors of one concept as "variants". Variants must diverge on real structural dimensions, within the already-approved concept (Phase 4 {#generate}).
- Do NOT re-decide or skip the concept/style approvals. The concept (the idea) and the style (the theme) are approved on **two separate axes** in Phase 3 {#explore}; `--theme` pre-selects a style but never skips its approval.
- Do NOT reuse un-namespaced `defs` ids across variants. Many SVGs share one `logo.html`; colliding `url(#grad)` references cross-wire fills (Phase 4 {#generate}, re-checked in Phase 6 {#deliver}).
- Do NOT fake negative space with a page-colored fill — use a real `clipPath`/`mask` or path holes (the deterministic gate flags it).
- Do NOT let the model compute the eval metrics. Color counts, stroke ratios, and viewBox aspect are script arithmetic (§H); the model only judges vision (legibility, mono-reads, brief-fit).
- Do NOT ship a non-flat-theme candidate without its flat monochrome fallback, or a combination/emblem/wordmark without its icon-only variant (AC6).
- Do NOT add release prerequisites here (version bump, changelog, README, manifest sync) — those are `/complete-dev`'s job; they live under the design's `## Release prerequisites` only.

---

*Spec lineage: `docs/pmos/features/2026-06-13_logos-skill/02_design.html` (decomposition-first brief→needs, hybrid eval, renderer hard-gate, six bundled themes, all-seven mark types, D1–D7). Mirrors `/diagram` for the renderer gate, eval shape, and `$0` in-session SVG authoring; `/explainer-video` for the local-only constraint. Built via the three-loop `/skill-sdlc` build loop (story 0613-36f, epic 0613-kr0).*
