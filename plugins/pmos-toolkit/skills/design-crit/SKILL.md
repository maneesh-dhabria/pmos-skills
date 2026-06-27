---
name: design-crit
description: Critique an existing application, wireframes, or prototype on overall user experience — identifies journeys, captures flow screenshots via packaged Playwright script, evaluates against a Nielsen + WCAG 2.2 + visual-hierarchy + Gestalt + journey-friction rubric, then runs a PSYCH pass and synthesises prioritized UX recommendations. Standalone utility — does not require the requirements→spec→plan pipeline. Use when the user says "critique this UI", "design review", "audit this app", "UX review", "review the wireframes", "evaluate this prototype", "what's wrong with this UX", or provides a URL/HTML files and asks for a design crit.
user-invocable: true
argument-hint: "<URL or path-to-wireframes-folder or path-to-prototype-folder> [--feature <slug>] [--journeys <id1,id2>] [--storage-state <path>] [--out <dir>] [--depth shallow|standard|deep] [--report-only] [--non-interactive | --interactive]"
---

# Design Crit

Critique an existing user experience — application, wireframes, or prototype — and produce a concise, prioritized UX recommendations report.

The skill is **standalone**. It works on three source types:

1. **Live application URL** (with optional auth via Playwright `storageState` or basic-auth)
2. **Wireframes folder** (HTML files produced by `/wireframes` or hand-authored)
3. **Prototype folder** (HTML files produced by `/prototype` or any single-file React prototype)

It captures screenshots, applies a hybrid rubric (`reference/eval.md`), runs a PSYCH pass on captured journeys per `../_shared/psych-scoring.md`, and writes a single recommendations report.

```
                          (standalone utility — runs independently of the pipeline)
/requirements → [/wireframes] → [/prototype] → /spec → /plan → /execute → /verify
                                              ↑
                                         /design-crit  ← can review any of these artifacts or a live app
```

**Announce at start:** "Using design-crit to evaluate the source, capture flow screenshots, and produce a UX recommendations report."

## Flags & natural language

Every option also has a natural-language form — infer it from the request; an explicit flag overrides. Canonical phrasings: "go deep / show me everything" ≡ `--depth deep`, "quick pass / top issues only" ≡ `--depth shallow`, "just give me the crit / go through the flows and share your critique" ≡ `--report-only` (write the report and run the gate, but skip the per-finding disposition Q&A — see Phase 4). `--journeys` takes journey ids — the kebab-cased labels of the journeys proposed in Phase 2 and saved in `journeys.{ext}` — so re-runs and parent invocations can skip the approval prompt. One flag stays parsed for back-compat but is deliberately not advertised:

<!-- nl-sugar -->
- `--format <html|md|both>` — output-format override; `md`/`both` are retired values, treated as `html` (see Phase 0).

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No interactive prompt tool:** State your assumption (default = critique top 3 inferred journeys), document it in the report, and proceed. Findings dispositions fall back to a numbered table the user reviews after. Depth defaults to `standard` (cap 12) unless `--depth` was explicitly set on CLI.
- **No subagents:** Run the heuristic eval, PSYCH pass, and friction pass sequentially in the main agent rather than dispatching parallel reviewers.
- **No Playwright:** If `playwright` is missing on the host (`assets/capture.mjs` exits with code 3), instruct the user to install via `npm i -g playwright && npx playwright install chromium`, then resume. If install isn't possible, ask the user to take screenshots manually and place them in the screenshots folder; proceed with eval-only mode and label the report accordingly.

## Track Progress

This skill has multiple phases. Create one task per phase using your agent's task-tracking tool (e.g., `TaskCreate` in Claude Code, `TodoWrite` in older harnesses, equivalent elsewhere). Mark each task in-progress when you start it and completed as soon as it finishes — do not batch completions.

## Load Learnings

Read `~/.pmos/learnings.md` if it exists. Note any entries under `## /design-crit` and factor them into your approach for this session.

---

## Phase 0: Resolve context, output, and depth {#resolve-context}

**Workstream (optional).** If the user has linked a workstream for this repo via `/product-context`, load it and resolve `docs_path` — the report is written to `{docs_path}/{YYYY-MM-DD}_{feature_slug}/design-crit/`. Fallback when no workstream is linked: `./docs/{YYYY-MM-DD}_{feature_slug}/design-crit/` in the current repo root. If the user passed `--out <path>`, honour that and skip workstream resolution.

<!-- defer-only: ambiguous -->
If `--feature <slug>` is not provided, propose a slug from the source (URL hostname or folder name) and confirm with the user via `AskUserQuestion`.

**Output format.** Read `output_format` from `.pmos/settings.yaml` (default: `html`; valid values: `html`, `md` — legacy `both` is treated as `html` per `_shared/html-authoring/README.md`). A `--format` argument-string flag overrides settings (last flag wins on conflict). Print to stderr exactly: `output_format: <value> (source: <cli|settings|default>)` once at Phase 0 entry. Controls the format of all four artifacts under `{out_dir}/`: `source.{ext}`, `journeys.{ext}`, `psych.{ext}`, and the main `design-crit.{ext}` report. The `eval-findings-review.md` platform-fallback artifact (Phase 4) is read-back-and-edited by the user, so it stays MD regardless.

**Depth — the whole contract.** `--depth` maps `shallow` → cap 5, `standard` → cap 12, `deep` → uncapped (a reviewer-side safety bound of 50 high+medium findings always applies). If `--depth` is unset and the Phase 4 reviewer returns more than 5 findings, ask the user how many to disposition — Top 5 / **Top 12 (Recommended)** / all N; under non-interactive mode, auto-pick standard (12) per the canonical Recommended-pick contract and record the auto-pick in the OQ buffer (FR-DC-DEPTH-04). Never cap silently — after the disposition loop, the surfaced/unsurfaced chat line in Phase 4 MUST fire in all modes (FR-DC-DEPTH-07). Unknown `--depth` value → print `--depth must be one of: shallow, standard, deep (got '<v>')` to stderr and exit 64; echo the resolution once at Phase 0 entry: `depth: <value|unset> (source: <cli|default>)`.

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

## Phase 1: Identify and access the source {#identify-source}

Determine the source type from the argument:

- Starts with `http://` or `https://` → **URL mode**
- Path containing `index.html` or multiple `*.html` files at the root → **wireframes/prototype mode** (treat both the same — they're just static HTML)
- Path with `runtime.js` + `*-device.html` at root → **prototype mode** (subset of static HTML; use the device files as the screen list)

Validate access:

<!-- defer-only: ambiguous -->
- **URL mode:** `curl -sSI <url> | head -1` to confirm reachability. If 401/403, ask the user via `AskUserQuestion` for auth method (storage-state JSON / basic-auth / cookies). If unreachable, abort with a clear message.
- **HTML mode:** confirm the folder exists and contains at least one HTML file. List the discovered files for the user.

Save what you found to `{out_dir}/source.{ext}` (extension follows `output_format`):

```markdown
# Source
- Type: <url | wireframes | prototype>
- Location: <url-or-path>
- Files / routes discovered: <count + list>
- Auth: <none | storage-state | basic-auth>
```

---

## Phase 2: Discover and approve journeys {#discover-journeys}

Identify candidate user journeys to critique. The strategy depends on source type:

### 2a. URL mode — try inference, fall back to user-described

Run an exploratory crawl with `assets/capture.mjs --mode crawl --depth 1 --max 20` against the entry URL. Inspect the resulting `manifest.json` and dump the page titles + URL paths. If at least 5 distinct routes were captured AND no auth wall was hit, propose 3-5 candidate journeys grouped by intent (e.g., "browse → detail → action", "auth → onboarding → first task").

If the crawl returns < 5 routes, hits a redirect loop to a login page, or lands on a single-page app where everything routes through `/`, **fall back** to asking the user to describe journeys plus any auth steps in plain language. Capture their description in `{out_dir}/journeys.{ext}`.

### 2b. Wireframes / prototype mode — read the artifact

For wireframes, read each HTML file's `<title>` and any annotation layer / state-switcher tabs to infer screen purpose. For prototypes, read `runtime.js` for the route table.

Cross-reference with the workstream's `req-doc.md` if available — pull declared journeys directly. Otherwise propose 3-5 inferred journeys grouped by user intent.

### 2c. User approval of journey set

Present candidates and capture which to critique:

```
<!-- defer-only: ambiguous -->
AskUserQuestion (multiSelect):
  question: "Which journeys should I critique? (Recommend ≤5 — more produces shallow output.)"
  header: "Journeys"
  options:
    - <journey-1 label> — <one-line description>
    - <journey-2 label> — <one-line description>
    - ...
```

If `--journeys <id1,id2>` was passed (ids = the kebab-cased journey labels recorded in `journeys.{ext}`), skip the question and use those.

**Recommend ≤5 journeys per session** — more dilutes the rubric pass; if the user insists on more, warn once and proceed.

For each selected journey, define the step-by-step click path (URL or selector per step). For URL mode this becomes a journey-config JSON consumed by the capture script in Phase 3; for HTML mode it's just the ordered list of files.

Save to `{out_dir}/journeys.{ext}` with one section per chosen journey, including the journey's id (kebab-cased label), step path, and entry context (cold visitor / signed-in user / error recovering).

---

## Phase 3: Capture flow screenshots {#capture-screenshots}

Run the packaged Playwright script `assets/capture.mjs` (full usage in the file header). Output goes to `{out_dir}/screenshots/`.

### 3a. URL mode

Build a journey config from Phase 2c and run:

```
node {skill_dir}/assets/capture.mjs \
  --mode journey \
  --config {out_dir}/journeys.json \
  --out {out_dir}/screenshots \
  [--storage-state <path>] [--basic-auth user:pass] \
  --viewport 1440x900
```

<!-- defer-only: ambiguous -->
Repeat per device variant if multi-device crit is requested (default: desktop only; ask the user via `AskUserQuestion` if mobile should be added).

### 3b. Wireframes / prototype mode

```
node {skill_dir}/assets/capture.mjs \
  --mode files \
  --files <comma-separated absolute paths from journeys.{html,md}> \
  --out {out_dir}/screenshots \
  --viewport 1440x900
```

### 3c. Stateful app / SPA / game mode (interactive driver)

When the target is a stateful app, single-page app, or canvas/WebGL game, the journey is **not** a static file list or a crawlable route set — it is a chain of in-canvas interactions (navigate → click/drag/key → screenshot → repeat) where each screen only exists after the prior interaction. Drive it with an **interactive driver**: the Playwright MCP (`browser_navigate` / `browser_click` / `browser_take_screenshot`), or a click-stepped Playwright script in `--mode journey` whose config lists the interaction steps. Capture one screenshot per reached state into `{out_dir}/screenshots/`, naming each by the state it represents.

- **Storage-reset for cold-open capture.** To capture genuine first-run / onboarding state, reset client storage before the first navigation — `indexedDB.deleteDatabase(<db>)` and `localStorage.clear()` / `sessionStorage.clear()` (via the MCP's `browser_evaluate` or a script step) — so a returning-user cache doesn't mask the cold-open UX. Note in the report when a capture was taken cold vs. warm.
- **Composition with the Phase 3.5 gate (A1).** The deterministic pre-pass is **not** bypassed in this mode: `#slop-prepass` STILL runs against the **live URL** once each state is reached (one `slop-prepass.mjs --source <live-url>` run per captured state), and its verbatim evidence line is surfaced before Phase 4 — exactly as in URL mode. An interactive/SPA capture earns no exemption from proof-of-execution.

### 3d. Verify capture quality

Read `{out_dir}/screenshots/manifest.json`. Check:

- One PNG per declared step (no missing journey steps)
- No fatal errors recorded
- File sizes > 5 KB (a 1 KB PNG usually means the page didn't render)

If anything failed, surface the error to the user and decide together: retry with adjusted selectors, skip the journey, or proceed with partial coverage and note the gap in the report.

---

## Phase 3.5: Deterministic slop pre-pass {#slop-prepass}

Before the LLM critique, run the **deterministic slop engine** over the captured source — a machine lane that flags known generated-design tells (side-tab accents, gradient text, monotonous spacing, bounce easing, "theater" framing copy, …) with zero judgement and zero network. This lane runs **first** and stays **distinct** from the LLM heuristic/PSYCH lanes that follow (D-STACK): a reader can always tell a machine-flagged tell from a judged UX issue. It **complements, never replaces**, the LLM critique in Phases 4–5. **This phase is a hard gate (proof-of-execution, §H): the pre-pass MUST run and its literal evidence line MUST be surfaced before Phase 4 may proceed — it is not an optional pre-pass that may be skipped by assertion.**

**You MUST run** the packaged helper **once per captured target** — loop the journey's file list in wireframes/prototype mode (one run per captured screen), or run once against the live URL in URL mode. It drives the same Playwright/Chromium path `assets/capture.mjs` already uses, injects the vendored engine at `_shared/slop-engine/browser.js`, calls `window.pmosDesignScan()`, and reads the `.pmos-slop-*` findings from the **live DOM — programmatically, never from a screenshot**:

```
node {skill_dir}/assets/slop-prepass.mjs \
  --source <captured-url-or-file> \
  --out {out_dir} \
  [--viewport 1440x900]
```

Output: `{out_dir}/slop-findings.json` — an object `{ generated, source, engine, overlaysRendered, findings: [{ id, category, severity, snippet, selector, section }] }`, where each `snippet` carries the offending text/CSS in the engine's straight-double-quote convention (a `skipped: true` + `reason` + empty `findings` shape is written on graceful degradation, below). The `findings` array feeds the report's first lane in Phase 6 ({#synthesise-report}), ahead of the LLM recommendations.

**Surface the evidence, then proceed (the hard gate).** After each run you MUST surface the helper's own literal line VERBATIM in chat before Phase 4 may begin — either the success line `[slop-prepass] N deterministic finding(s), M overlay node(s) → <file>` (stdout) or the skip-note `[slop-prepass] slop-engine unavailable — skipping deterministic pre-pass: <reason>` (stderr). Whether the pre-pass **ran or skipped** is keyed to `slop-findings.json` (the presence of `findings` vs. `skipped: true`) **and** the exit code — never to narrative. Phase 4 may not start until a `slop-findings.json` produced THIS run exists for every captured target. The full helper-output contract — the two literal lines, the JSON shape, and exit codes `0`/`1`/`3` — has one home in `assets/slop-prepass.mjs`'s header (and epic design §5, `02_design.html#helper-output`); cite it, don't restate it here (§K).

**Graceful degradation (Inv-5) — earned, not asserted.** Degradation never flips a correct crit to a failure, but a skip is only *claimable* from the helper's own emitted evidence: it logs the single stderr skip-note above and writes `slop-findings.json` with `skipped: true` + `reason` (exit 0), or it exits non-zero. You may record "engine unavailable / pre-pass skipped" ONLY from that evidence — **never by asserting the engine is absent or "not wired in" without running the helper** (it resolves the engine at `_shared/slop-engine/browser.js` and records the resolved path in `slop-findings.json :: engine`; if you believe it is absent, run it and show the skip-note). A missing Playwright install is a dependency error (exit 3) — the same class `assets/capture.mjs` already surfaces in Phase 3; resolve it there. The machine lane only ever adds findings or an earned skip — it never rolls back or alters the capture → LLM critique flow.

**Determinism + provenance (Inv-3/Inv-4).** The lane makes no LLM or network call; the engine is referenced only by its pmos-native path and the `window.pmosDesignScan` / `.pmos-slop-*` globals.

---

## Phase 4: Heuristic evaluation against the rubric {#heuristic-eval}

**Gate precondition (A1).** Do not begin the heuristic eval until Phase 3.5 (`#slop-prepass`) produced a `slop-findings.json` for every captured target THIS run and you surfaced its verbatim evidence line. The pre-pass is a hard gate, not an optional lane — a missing this-run JSON means the gate did not run; go back and run it.

Read `reference/eval.md` (canonical rubric) into context.

Dispatch a **reviewer subagent** (or run inline if subagents unavailable) per scope:

1. **Per-screen pass** — one subagent receives all screenshots + the rubric, returns the JSON array described in `eval.md`. Instruct the reviewer to cap its output at the cap resolved in Phase 0 when `--depth` was set, else at the 50-finding safety bound (the gate below slices further). Low findings go in an "unsurfaced" appendix regardless of depth.
2. **Per-component pass** — one subagent identifies recurring components (button, card, input, modal) across all screens and scores once per component class.
3. **Per-journey pass** — one subagent per journey walks the screenshot sequence step-by-step, counts clicks / keystrokes / decisions / modal interrupts, and applies J1 thresholds.

Save raw output to `{out_dir}/eval-findings.json`.

**Theater-check escape.** A per-journey pass that reports **no friction** while the per-screen / per-component passes produced ≥3 findings on that journey's screens is suspect — sycophantic "the flow is smooth" theater. Re-dispatch that one journey's pass **once**, instructing the reviewer to re-walk it as an impatient user with alternatives, seconds to spare, and no goodwill toward this UI — where do they hesitate, mis-click, backtrack, or give up? Accept the second result as genuine even if still empty; no second retry.

### Findings dispositions

**`--report-only` (NL: "just give me the crit").** When set, **skip the per-finding disposition loop entirely** — issue no `AskUserQuestion`; every surfaced finding (within the resolved cap) flows straight into the report as a recommendation. The rest of the pipeline is unchanged: the Phase 3.5 slop pre-pass STILL runs (it is a hard gate, orthogonal to disposition), the report is STILL written, and the mandated `<N_surfaced> … <M_unsurfaced>` chat line below STILL fires. `--report-only` is orthogonal to `--non-interactive` (it suppresses the disposition Q&A specifically, where `--non-interactive` auto-picks every prompt); either, both, or neither compose. Resolve the cap as below, then jump past the disposition loop to the surfaced/unsurfaced line.

After the reviewer returns, resolve the cap: if `--depth` was set, it applies as-is; if `N_returned ≤ 5`, nothing would be capped; otherwise run the depth gate from Phase 0 (one `AskUserQuestion` — Top 5 / **Top 12 (Recommended)** / all N; non-interactive auto-picks standard).

<!-- defer-only: ambiguous -->
Sort findings by `severity desc, then file-order`, take the first `cap` entries, and present them per `_shared/findings-dispositions.md` — severity-tagged question per finding, four canonical dispositions, batches of ≤4. Deltas for this skill: dispositions shape the **report**, not the source — **Fix as proposed** enters the report as a high-confidence recommendation; **Skip** is marked "won't-fix" and excluded; **Defer** moves to the report's "Deferred" section. Findings beyond the cap are logged in `eval-findings.json` as unsurfaced.

After the disposition loop completes, print to chat exactly: `<N_surfaced> findings surfaced for disposition, <M_unsurfaced> unsurfaced — see {out_dir}/eval-findings.json` (substitute actual counts). This line MUST fire in all modes including `--non-interactive` — silent capping is forbidden (FR-DC-DEPTH-07; see Anti-patterns).

**Platform fallback** (no interactive prompt tool): emit a numbered findings table with `disposition` column blank, save to `{out_dir}/eval-findings-review.md`, and ask the user to fill it in. Do NOT silently auto-apply. The row count still respects the resolved cap (default `standard`/12 in this fallback unless `--depth` was set).

---

## Phase 5: PSYCH pass {#psych-pass}

Run the PSYCH walkthrough per `../_shared/psych-scoring.md` on each chosen journey — attention-path walk, driver palette, ±1..10 element scores, judgment-assigned severity bands (OK / Watch / Bounce risk / Cliff), and the dual-table output format all live there.

Deltas for this skill:

- Entry context comes from each journey's entry-context line in `journeys.{ext}` (cold visitor → Low 25, signed-in → High 60, otherwise Medium 40 default).
- Save to `{out_dir}/psych.{ext}` (extension follows `output_format`).
- Route every screen banded **Watch**, **Bounce risk**, or **Cliff** through the Phase 4 findings-dispositions flow.

There is no separate MSF scoring pass — journey friction is already covered with evidence by the rubric's J7 (friction map) and J8 (drop-off candidates) checks in Phase 4; unanchored 1–5 scores added no information over them.

---

## Phase 6: Synthesise the recommendations report {#synthesise-report}

**Emit `{out_dir}/design-crit.html` per the `_shared/html-authoring/README.md` checklist** (template slot-fill, atomic write with the `.sections.json` companion, idempotent asset copy — which carries the inline-comments substrate, `comments.js` et al. — cache-busted asset URLs, heading ids per `conventions.md` §3). Deltas for this skill:

- **Asset prefix:** `assets/` when `{out_dir}` is a top-level feature-folder write; `../assets/` when nested under a feature folder (`{feature_folder}/design-crit/` shares the substrate with sibling artifacts).
- **Index regeneration:** only when `{out_dir}` is a sub-folder of a pipeline feature folder, regenerate `{feature_folder}/index.html` per `index-generator.md`. Standalone `--out` invocations outside the pipeline do NOT regenerate an index.
- **Markdown fallback — substrate-unreachability ONLY (A4).** Attempt the HTML emit via `_shared/html-authoring/` first. If and only if that substrate path **cannot be resolved or read** (e.g. the plugin-cache path is missing/unreadable — a real resolution failure, not a preference), write a self-contained markdown `design-crit.md` instead and log one loud stderr note naming the unresolved path: `html-authoring substrate unresolvable at <path>; wrote markdown fallback design-crit.md`. This is a degradation guard mirroring the engine's Inv-5 shape (earned by a genuine failure, surfaced loudly) — it is **NOT** a return of the retired `md`/`both` output-format preference (those values still resolve to `html` per Phase 0; the fallback is keyed strictly off reachability, never off `--format` or settings). <!-- follow-up: the cleaner long-term fix is to make `_shared/html-authoring/` reliably resolvable from the plugin cache so this fallback never fires; track separately. -->

Keep the report concise; recommendations are the deliverable, raw findings are appendices. Structure:

```markdown
# Design Crit — <feature slug>

Generated: YYYY-MM-DD
Source: <url-or-path> (<type>)
Journeys reviewed: <count>
Screens captured: <count>

## Deterministic slop findings (machine-flagged)

Engine lane (from `slop-findings.json`, Phase 3.5) — deterministic tells, no judgement, no network. Reported **first** and kept **separate** from the LLM critique below (D-STACK).

| Rule | Where | Snippet |
|------|-------|---------|
| `<id>` | <section> | <snippet> |

## TL;DR (top 5 recommendations)

1. **[high] <one-line headline>** — <one-line "why" tied to evidence>. <one-line concrete fix>.
2. ...

## Recommendations by journey

### Journey: <name>

- **[high] <finding> ([N5])** — <evidence>. Fix: <concrete fix>.
- **[medium] <finding> ([V1])** — <evidence>. Fix: <concrete fix>.

(Friction stats: clicks=N, keystrokes=N, decisions=N, est. time=Ns, threshold breach=<yes/no>)

## Recommendations by component

- **Primary button** — <finding(s)>. Fix: <concrete fix>.

## Cross-cutting patterns

Findings that recur across ≥ 2 journeys / screens (highest leverage).

## Deferred

Findings the user chose to defer; logged for future review.

## Appendix A — PSYCH journey scores

(Tables from psych.{html,md})

## Appendix B — Raw findings

Pointer to `eval-findings.json`.
```

Render the **Deterministic slop findings** table strictly FROM the `slop-findings.json` produced THIS run (Phase 3.5) — never from narrative, memory, or the LLM lane (A1): one row per finding — rule `id`, its `section`, and `snippet` — and head the lane with the JSON's resolved `engine` path + `findings.length`. If the lane was skipped (`skipped: true`) or empty (`findings: []`), replace the table with a single line — `No deterministic slop tells flagged.` or `Engine lane skipped — <reason>.` (the `<reason>` read from the JSON) — and continue. If no this-run `slop-findings.json` exists, the Phase 3.5 gate did not run — go back and run it; do not synthesise the lane. Never merge engine tells into the LLM recommendation sections below: they are a distinct lane (D-STACK), so the machine lane stays machine-only and the LLM lane stays judgement-only.

Each recommendation must:

- Cite the rubric ID it came from (e.g., `[N5]`, `[A1]`, `[J1]`)
- Reference observable evidence (region of a screenshot, click count, contrast value)
- Propose a concrete fix, not a vague direction

Cap the body at ~400 lines; if there are more findings than that, push the long tail into the appendix with a count.

---

## Phase 7: Workstream Enrichment {#workstream-enrichment}

**Skip if no workstream was loaded in Phase 0.** Otherwise, follow `_shared/pipeline-setup.md` Section C. For this skill, the signals to look for are:

- Recurring high-severity heuristic IDs across journeys → workstream `## Known UX Friction`
- Validated journeys + their entry contexts → workstream `## Journeys` (extend, don't replace)
- Component classes flagged for rework → workstream `## Design System Debt`
- PSYCH "Cliff" or "Bounce risk" screens → workstream `## Drop-off Risks`

This phase is mandatory whenever Phase 0 loaded a workstream — do not skip it just because the report is written.

---

## Phase 8: Capture Learnings {#capture-learnings}

**This skill is not complete until the learnings-capture process has run.** Read and follow `_shared/learnings-capture.md` (relative to the skills directory) now. Reflect on whether this session surfaced anything worth capturing — surprising behaviors, repeated corrections, non-obvious decisions about journey selection, capture failures, or rubric blind spots. Proposing zero learnings is a valid outcome for a smooth session; the gate is that the reflection happens, not that an entry is written.

---

## Anti-patterns

- **Skipping the capture step** because "I can read the HTML." The rubric explicitly grades visual hierarchy, contrast, and Gestalt — those need pixels, not source.
- **Critiquing a single screenshot in isolation.** Per-journey J-checks and friction thresholds need the full step sequence; per-component C-checks need cross-screen comparison.
- **Padding the findings list.** An empty heuristic finding is fine — pad-to-look-thorough produces noise the user has to triage.
- **"Improve hierarchy" / "make it cleaner" / "consider better UX"** — vague recommendations the user can't act on. Every recommendation must reference the offending element/region and propose a concrete change.
<!-- defer-only: ambiguous -->
- **Dumping findings as prose.** Always structure dispositions via `AskUserQuestion` per `_shared/findings-dispositions.md` (Phase 4); prose dumps force the user to hand-write triage and lose structure.
- **Inventing measurements.** If you didn't compute the contrast ratio or click count, don't state one. Cite "Stark says 3.2:1" only if Stark actually returned that value.
- **Critiquing many journeys at once.** Beyond ~5 the rubric pass goes shallow — recommend splitting into sessions.
- **Treating analytical-only friction as live-walk friction.** If Playwright capture failed and you're inferring friction from the HTML alone, label the report accordingly and warn the user the numbers are estimates.
- **Silently capping findings.** Even at `standard` depth, the FR-DC-DEPTH-07 surfaced/unsurfaced chat line MUST fire so the user can decide whether to re-run at `deep` — the original design's silent cap-at-12 is what motivated the depth control in the first place.
- **Asserting the slop engine is absent / "not wired in" without running the helper.** Phase 3.5 (`#slop-prepass`) is a hard gate (proof-of-execution): "skipped / engine unavailable" is claimable ONLY from the helper's own skip-note (`slop-findings.json :: skipped == true`, or a non-zero exit) — never from narrative or belief. The helper resolves and records the engine path in `slop-findings.json :: engine`; if you think the engine is missing, run the helper and surface the skip-note. This — a deterministic pre-pass skipped-by-assertion and rationalised as "engine not wired in" — is the exact failure this gate exists to close.
- **Filling the report's slop lane from prose.** The Phase 6 Deterministic-slop table is populated FROM the this-run `slop-findings.json` (engine path + `findings.length`, or `skipped`+`reason`), never from recollection or the LLM critique. No this-run JSON ⇒ the gate did not run.

---

*Spec lineage: `2026-05-23_design-crit-depth-control` (FR-DC-DEPTH-01..07 — flag mapping, adaptive gate, non-interactive auto-pick, surfaced/unsurfaced echo; the state-machine prose was compressed to the Phase 0 contract in the 2026-06-10 skill-design review), `2026-05-09_html-artifacts` + `2026-05-28_inline-html-artifacts` (FR-10/12/22 emit contract — now cited via `_shared/html-authoring/README.md`; `md`/`both` format retirement per FR-12.1), `2026-05-08_msf-skill-split` via the 2026-06-10 review (PSYCH consumption moved to `_shared/psych-scoring.md`; the inline PSYCH re-implementation and the unanchored MSF 1–5 pass were removed — J7/J8 carry the friction evidence), theater-check pattern from `readme/reference/simulated-reader.md` §3 (FR-SR-5).*
