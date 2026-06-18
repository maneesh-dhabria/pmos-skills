---
name: frameworks
description: Your searchable library of PM frameworks — describe a problem and get the 2–5 most relevant frameworks (RICE, JTBD, Kano, regret-minimization, …) with a one-line "why it fits", a PM's-take commentary, and an owned diagram, or browse the whole filterable collection offline from file://. Each framework carries problem-tags, a decision-type, and when-to-use / when-not-to-use guidance so matching is precise, and a --json mode lets other skills ask "which framework for this?" programmatically. Ships a bundled, directly-authored corpus of 346 frameworks — fully offline, no account or network needed. Use when the user is stuck on a decision and wants a thinking tool, asks which framework applies, or wants to browse the library. Triggers when the user says "/frameworks", "which framework should I use", "find a PM framework for this", "frameworks for prioritization", "what framework helps with this decision", or "browse my framework library".
user-invocable: true
argument-hint: "[\"<problem>\" | browse | list | situations] [--json] [--non-interactive] [--interactive]"
---

# Frameworks

**Announce at start:** "Using frameworks to find the PM thinking tools that fit this problem."

A searchable, offline library of product-management frameworks. The value is
**precise retrieval + trustworthy framing**, not a list dump: describe a problem in
plain words and get the handful of frameworks actually worth reaching for, each with
a one-line reason it fits, the curator's "PM's take", and an owned diagram. Other
skills can ask the same question programmatically via `--json`.

The corpus ships pre-built under `${CLAUDE_SKILL_DIR}/data/` — **346 directly-authored
frameworks**, each a hand-written record + an owned SVG diagram, bundled with the skill.
Runtime retrieval, browse, and `--json` are **fully offline** over that shipped corpus —
no network, no account. To grow the corpus, hand-author new records + diagrams per
`reference/corpus-expansion.md` and re-validate; there is no sync/import step.

`--json` is the machine contract — other skills and scripts pass it literally.

The deep mechanics live one hop away in `reference/` — keep this body lean:

- `${CLAUDE_SKILL_DIR}/reference/corpus-schema.md` — the `frameworks.json` record contract (lean fields + cached match-fields).
- `${CLAUDE_SKILL_DIR}/reference/situation-taxonomy.md` — the closed `problem_tags` registry + the situations design.
- `${CLAUDE_SKILL_DIR}/reference/corpus-expansion.md` — how to grow the corpus: the repeatable research process + the entry-authoring contract (record fields, owned-SVG recipe, the `validate-corpus.mjs` gate).
- `${CLAUDE_SKILL_DIR}/reference/matching.md` — the two-stage ranking algorithm and the `--json` contract.

The scripts under `${CLAUDE_SKILL_DIR}/scripts/` are zero-dep Node `.mjs` with a
`--selftest` mode each. Drive matching, validation, and library-build through them —
never hand-parse `frameworks.json`.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No `AskUserQuestion` tool:** any disambiguation prompt degrades to numbered
  free-form prompts per `_shared/interactive-prompts.md`. The non-interactive
  auto-pick contract (Recommended → AUTO-PICK) still applies. (No runtime path issues
  a confirmation prompt — every path reads the shipped corpus.)
- **No browser / Playwright:** `browse` still writes `index.html`; opening it is a
  manual step the skill prints as a `file://` path.

## Track Progress

Every runtime path (retrieve / browse / situations) is one or two tool calls — no
task ceremony. Growing the corpus is an authoring session, not a runtime path; track
that work with the checklist in `reference/corpus-expansion.md` if you take it on.

## When NOT to use

- The user wants to **learn a topic in depth** (a primer, a reading list, a
  multi-source explainer) → that is `/primer` or `/learn-list`, not a framework
  lookup.
- The user wants to **apply** one specific framework to their data and produce an
  artifact (e.g. "build me a RICE table for these 12 features") → this skill finds
  and explains the framework; building the filled-in artifact is `/artifact` or a
  spreadsheet, not this skill.
- The user wants **adversarial pressure-testing** of a decision they've already made
  → that is `/grill`.
- The framework they want isn't about product management (a software-design pattern,
  a statistical method) → out of corpus scope; say so rather than forcing a match.

## Phase 0: Setup + Load Learnings {#setup}

Inline `_shared/pipeline-setup.md` to read `.pmos/settings.yaml` (require `version`)
and resolve `{docs_path}`. The browse library is written to
`{docs_path}/frameworks/index.html` (`mkdir -p` if missing); the shipped source
corpus lives read-only under `${CLAUDE_SKILL_DIR}/data/`. All output is HTML.

Read `~/.pmos/learnings.md` if present; note any entries under the `## /frameworks`
heading and factor them into your approach. **The skill body wins on conflict** —
surface any conflict between a learning and the body to the user before applying it.

The canonical non-interactive block below handles `mode` resolution, the
per-checkpoint classifier, the OQ buffer, and the end-of-skill summary. Do not
paraphrase or move it.

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

## Phase 1: Resolve command {#resolve-command}

Dispatch the argument string by its first token:

- `browse` | `list` (or bare `/frameworks` with no problem text) → `#browse`.
- `situations` → `#situations`.
- anything else (a quoted or bare problem string) → `#retrieve`.

`--json` is a modifier on the retrieve path (structured output, no chat prose, no
library open), parsed off the argument string before dispatch.

## Phase 2: Retrieve — "<problem>" → ranked frameworks {#retrieve}

Run the two-stage matcher exactly as specified in
`${CLAUDE_SKILL_DIR}/reference/matching.md` (weights, floor, pool semantics, the
`--json` contract — all live there):

1. **Situation shortcut.** Input matches a known situation label/id from
   `data/situations.json` → return that situation's curated `frameworks[]` ranked by
   tag overlap.
2. **Free-text.** Deterministic prefilter, then re-rank:
   ```
   node ${CLAUDE_SKILL_DIR}/scripts/match.mjs --query "<problem>" [--json]
   ```
   Human path: LLM re-rank the full candidate pool against the problem, write a
   ≤1-sentence "why it fits" per pick, cap at 5; on `low_confidence` present ≤2
   closest with an explicit caveat — **never pad**.
3. **Present.** Human path: ranked list (name · why · category · decision_type) in
   chat, then open the library (`index.html`) focused on those ids. `--json` path:
   emit **only** the contract object to stdout — no chat prose; set `reranked: true`
   if you re-ranked it.

## Phase 3: Situations {#situations}

Read `data/situations.json` and list the situations grouped by `super_category`
(Strategy & Business · Product · Analytics, Design & Finance · People, Personal &
Career). Each line: the situation label and the framework names it maps to. This is
the curated "I don't know what to search for" entry point. No network.

## Phase 4: Browse — the filterable library {#browse}

Build (if stale) and open the self-contained library:

```
node ${CLAUDE_SKILL_DIR}/scripts/build-library.mjs --out {docs_path}/frameworks/index.html
```

`build-library.mjs` reads `data/frameworks.json` + `data/diagrams/*.svg` and emits a
single self-contained `index.html` that works offline from `file://`. Print the
`file://` path. Diagrams are owned SVGs inlined into the page — **never** hot-linked
external URLs. The library offers:

- **Three listing views** — List (one bullet per framework; **the default**), Detailed
  (grouped cards with a primary-diagram thumbnail), and Compact (Product Areas →
  comma-separated framework links). Each view toggle carries a representative inline-SVG
  icon. A **group-by** control switches the Detailed/List axis between Product Areas
  (default) and Tags.
- **A sidebar reader** — clicking a framework opens a two-pane reader that shifts the
  listing aside (not an overlay) and **highlights the selected item in the list without
  jumping the page** (the page scroll position is preserved across the open); diagrams
  render **inline** next to the prose they illustrate (placed at each framework's
  `diagram_anchors`), with **Copy markdown** and **Share** buttons (clipboard, offline).
- **Filters** — search · area · and **multi-select dropdowns** for decision type and tags
  (the tags dropdown has a type-to-filter search; each option shows its corpus count).
  Selecting within a facet is OR, across facets is AND. An always-visible
  **applied-filters bar** shows every active filter as a removable, facet-labeled ✕ chip
  plus a **Clear all** control (chips and dropdown checkboxes stay in sync). Decision type
  uses the balanced 8-value cognitive-job taxonomy — see `reference/corpus-schema.md`.
- **Renamed product areas** — the four `super_category` values display under friendlier
  labels (e.g. *Product → Product Management*); this is presentation-only — the corpus,
  `--json`, and matching are unchanged.
- **A PMOS masthead** at the top.

## Phase 5: Capture Learnings {#capture-learnings}

Reflect on whether this session surfaced anything worth recording about `/frameworks`
itself — a matching miss, a taxonomy coverage gap, or a snag hit while authoring a new
corpus entry. If so, append it under the `## /frameworks` heading in
`~/.pmos/learnings.md` (create the heading if missing). Zero learnings is valid — the
gate is that the reflection happens, not that an entry is written.

## Anti-Patterns (DO NOT)

- **DO NOT hot-link external image URLs** into the corpus or library — diagrams are
  owned SVGs authored alongside the record and inlined.
- **DO NOT block any runtime path on the network.** Retrieve / browse / situations /
  `--json` read the shipped corpus only and must work fully offline.
- **DO NOT pad matches past the confidence floor.** Below-floor input presents ≤2
  closest with a `low_confidence` caveat, not a fabricated top-5; nothing-scores
  means zero matches, not invented ones.
- **DO NOT hand-parse `frameworks.json`** — go through the `.mjs` scripts so reads stay
  deterministic and tested; author new records per `reference/corpus-expansion.md`.
- **DO NOT let one `decision_type` value become a mega-bucket** — classify by each
  framework's *primary* cognitive job, preferring the more specific value;
  `validate-corpus.mjs` enforces the distribution gate (see `reference/corpus-expansion.md`).

---

*Spec lineage: `docs/pmos/ideate/2026-06-07_pm-frameworks-skill.html` (problem +
caps/no-pad rationale, OQ2) and the 2026-06-07 frameworks-skill feature worktree
(corpus contract, matcher, `--json`; the per-rule FR-SCHEMA-* / FR-JSON-* / FR-TAX-*
ids live in `reference/`); v0.18.0 browse-UX revamp (views, sidebar reader,
`diagram_anchors`, 8-value `decision_type` + distribution gate); matcher normalization
+ pool/zero-score fixes per the 2026-06-10 skill-design review; story 260617-kac
re-founded the skill on direct authoring — the Notion `sync` pipeline was removed and
the repeatable research/authoring process moved to `reference/corpus-expansion.md`.*
