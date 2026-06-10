---
name: learn-list
description: Turns any topic into a verified, anti-slop, multi-format curated reading list for product managers — organized by a canon-derived topic outline, every link fetched and verified before it ships, each ranked and annotated with a ≤2-sentence why, audience-shaped for senior vs all PMs, closing with a follow-list of people, newsletters, books (with summaries) and practitioners' signature writings plus a copy-ready paste-block. Standalone learnkit utility; effort scales via --depth brief|standard|deep. Use when a PM says "build me a reading list on X", "what should I read to learn Y", "curate the best sources on Z", "get me smart on this topic fast", "who should I follow to learn X", "give me a learning list for Y", or "/learn-list". Verification-first — it never emits a link it has not fetched this run.
user-invocable: true
argument-hint: <topic> [--depth <brief|standard|deep>] [--audience <senior-pms|all-pms>] [--format <html|md|both>] [--non-interactive] [--interactive]
---

# /learn-list

**Announce at start:** "Using /learn-list to curate a verified reading list on the requested topic."

This is a standalone learnkit utility for product managers. It does NOT load workstream
context and does NOT feed the requirements→spec→plan pipeline. It produces one HTML
artifact per topic plus a copy-ready paste-block, and suggests `/primer <topic>` as a
follow-up — it never invokes it.

The one rule everything else serves: **this is a verification-first web pipeline, not a
generate-from-memory one.** A reading list is only worth more than a search query if its
links are real, current, and slop-free. Every emitted link is fetched and verified this
run; the canon is found by live search, never recalled.

The intake → canon → outline → verified-sourcing front half is the **shared
topic-research substrate** under `_shared/topic-research/` (the same mechanism `/primer`
uses). This skill inlines those docs and owns only the **back half**: ranking,
annotation, the adjacency rabbit-holes section, the follow-list, and the paste-block.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No `AskUserQuestion`:** intake (audience) and the outline-confirm gate degrade to
  numbered free-form prompts per `_shared/interactive-prompts.md`. The non-interactive
  auto-pick contract (Recommended → AUTO-PICK; outline gate auto-proceeds; audience
  auto-picks senior-pms) still applies.
- **No `Task` subagents:** Phase 4 fan-out collapses to a sequential in-context pass —
  one topic at a time. Correctness is unchanged; only wall-clock grows.
- **No `WebFetch`:** verification is impossible, so the skill cannot honor its core
  contract — refuse with a clear message naming the missing tool and exit 64. Do NOT
  fall back to emitting unverified links.
- **No `WebSearch`:** fall back to `WebFetch` over user-supplied URLs/curations plus any
  context7 MCP available; warn that canon discovery is degraded.
- **No browser/Playwright MCP:** the free-fetch ladder in
  `_shared/topic-research/sourcing-ladder.md` still runs over `WebFetch`; only the
  optional last rung for JS-heavy social content is lost. Such candidates are dropped,
  never emitted unverified.

## Track Progress

This skill has 8 sequential phases (Setup, Intake, Canon, Outline, Source, Adjacencies +
Follow-list, Eval + Write, Capture Learnings). Create one task per phase using the host
agent's task-tracking tool (e.g., `TaskCreate` in Claude Code). Mark each task
in-progress when you start it and completed as soon as it finishes — do not batch
completions.

## Phase 0: Setup + Load Learnings

1. Inline `_shared/pipeline-setup.md`: read `.pmos/settings.yaml` (require `version` and
   `docs_path`; default `output_format` to `html` when absent), resolve `{docs_path}`, and
   resolve `{learn_list_dir} = {docs_path}/learn-list/` (`mkdir -p` if missing).
2. **Resolve `output_format`.** `--format <html|md|both>` overrides settings (last flag
   wins). Print to stderr once: `output_format: <value> (source: <cli|settings|default>)`.
   `html` (default) and `both` both emit the paste-block; `both` additionally writes a
   full `.md` sidecar.
3. **Resolve mode (interactive vs non-interactive)** per the canonical non-interactive
   block below (edge cases: `_shared/non-interactive.md`).
4. **Read `~/.pmos/learnings.md`** if present; apply any entries under `## /learn-list`
   to this run (e.g., domains that proved sloppy, formats that sourced poorly for a topic
   class). Skill body wins on conflict; surface conflicts to the user.

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

## Phase 1: Intake (shared)

Goal: pin **topic + depth + audience** in one short pass.

1. **Parse arguments.** `<topic>` is required.
2. **Retired-flag rejection.** If `--mode` is present → emit platform-aware error
   `unknown flag '--mode'. Use --depth brief|standard|deep instead.` and exit 64. If
   `--level` is present → `unknown flag '--level'. Use --audience senior-pms|all-pms
   instead.` and exit 64. (These flags were retired when the front half unified with
   `/primer`; there is no silent alias.)
3. **Inline `_shared/topic-research/intake.md`** and follow it — it resolves
   `--depth brief|standard|deep` (default `standard`) and `--audience senior-pms|all-pms`
   (asked once if absent; audience is resolved at every depth, including `brief`), and
   runs the topic-richness classifier. Honor effort phrasing to suggest a depth.
4. **React to the richness verdict (this skill's reaction, FR-12).** `/learn-list`
   consumes the verdict **softly**: any verdict proceeds. `rich` → full list. `thin` →
   produce a smaller honest list and note "thin — little quality material found" rather
   than padding; **never block** and do not force reframings on the user (a thin topic is
   still a valid list, just shorter). `narrow-by-design` → proceed; the outline will be
   shape-different but the list is still useful.
5. **Confirm** topic + depth + audience in a single line and proceed. Do not re-ask
   anything the flags already settled.

## Phase 2: Canon & curations (shared)

**Inline `_shared/topic-research/canon-discovery.md`** and follow it — find the field's
canonical books, top practitioners, and 2–4 existing curations by live search (never from
memory), sized to the resolved depth. Carry forward the emitted `canon` set (books +
practitioners + curation entries) for the outline cascade and the candidate pool.

## Phase 3: Outline (shared)

**Inline `_shared/topic-research/outline.md`** and follow it — derive the outline by
cascade (canonical → curation → provisional), record the provenance rung, dedupe topics
before fan-out, and run the confirm gate. The provenance rung goes in the artifact's
TL;DR. In non-interactive mode the gate auto-proceeds.

## Phase 4: Source per topic (shared)

**Inline `_shared/topic-research/sourcing.md`** and follow it — for each outline topic,
run the rank-then-verify loop and emit a verified, ranked, annotated shortlist. Emit the
est-cost line before sourcing. Fan out one subagent per topic in `standard`/`deep`
(sequential in `brief`).

This skill's back-half use of each shortlist (its own reaction to the substrate output):

- **Render the per-topic shortlist as a ranked list** — keep the substrate's tier tag,
  paywall/free-alt, and the grounded ≤2-sentence annotation (soft ~240-char ceiling)
  saying *why it's here / what you'll get*.
- **Book-summary parity:** for any emitted book that is not free, attach its most
  authoritative summary reference inline (or an explicit "no good summary found — read
  the book" note), per `_shared/topic-research/sourcing-ladder.md` (Book summaries) —
  wherever a paid book appears, not only in the follow-list.
- Do not enforce a per-format quota — include only the formats actually found and
  verified. A fabricated podcast or video to fill a row is a hard failure.

## Phase 5: Adjacencies & follow-list (back half)

1. **Adjacency walk.** Explore adjacent topics to widen coverage — hops keyed to
   `--depth` via the `intake.md` dial matrix (`brief` 0, `standard` 1, `deep` 2). Source
   each via the same shared `sourcing.md` loop. Place results in a **separate "adjacent
   rabbit holes" section** so they never dilute the core list. The paid-book-summary rule
   (Phase 4) applies here too.
2. **Follow-list.** Assemble who/what to follow next: practitioners (with their
   **signature writing** — the piece search and the curations consistently surface,
   labeled "signature / most-referenced," never a fabricated citation count), newsletters
   (subscribe link), podcasts, and books (each with its **most authoritative summary**
   link per `_shared/topic-research/sourcing-ladder.md`, or "no good summary found").
   Deep depth adds book summaries + signature writings for the full practitioner set.

## Phase 6: Eval + Write

1. **Self-review before writing** — a quick reviewer pass over the assembled list:
   - **Dead-link sweep** — re-confirm every emitted URL resolved this run; drop any that
     didn't.
   - **Slop spot-check** — sample links against `_shared/topic-research/source-tiers.md`;
     drop any that slipped the hard gate.
   - **Grounding** — every annotation is supported by fetched content and within the
     ~240-char ceiling.
   - **Coverage** — every outline topic has ≥1 link or an explicit "thin — little quality
     material found" note.
   - **Book-summary parity** — every emitted book that isn't free carries a summary
     reference (or an explicit "no good summary found" note), in the reading-list and
     adjacencies as well as the follow-list. A paid book with no summary ref and no
     none-note is a fail — fix before writing.
2. **Render the artifact** from `reference/artifact-template.html` via the learnkit
   html-authoring substrate (`_shared/html-authoring/`): header → TL;DR (with outline
   provenance) → reading-list-by-topic → adjacent rabbit holes → follow-list →
   **copy-ready paste-block**. Write to `{learn_list_dir}/{YYYY-MM-DD}_<slug>.html`
   (atomic temp-then-rename). When `output_format=both`, also write the `.md` sidecar.
   Resolve the slug from the topic per the host repo's slug conventions; resolve written
   paths via `_shared/resolve-input.md`.
3. **Print the absolute artifact path** in the chat summary, plus a one-line
   `/primer <topic>` handoff suggestion (standalone — never auto-invoke).

## Phase 7: Capture Learnings

**This skill is not complete until the learnings reflection has produced a one-line
output.** Reflect on whether this session surfaced anything worth keeping under
`## /learn-list` in `~/.pmos/learnings.md` — e.g., a topic class where a format sourced
poorly, a slop domain that recurred, a curation that proved unusually high-signal, or a
verification pattern that caught a dead link the search ranking missed.

Emit exactly one of:

- `Learning: <new entry written to ~/.pmos/learnings.md under ## /learn-list>` — when the
  session surfaced a non-obvious lesson.
- `No new learnings this session because <specific reason tied to this session>` — when it
  was routine. The reason must be specific, not boilerplate.

Empty reflection (no line) counts as unfinished work.

## Anti-Patterns (DO NOT)

1. **Emitting a link from memory.** Every URL must be fetched and verified this run. A
   remembered-but-dead link is the single fastest way to destroy trust — the first 404 a
   user hits tells them the whole list is unreliable. If you cannot verify it, drop it.
2. **Fabricating sources or format coverage.** No invented podcasts, talks, or "most-cited
   counts." No fixed per-format quota — honest, uneven coverage beats a complete-looking
   list with a made-up row. Signature writings come from observed search/curation
   consensus, never a fake metric.
3. **Verifying every candidate.** Rank first, then fetch-verify only the survivors that
   will ship (per `_shared/topic-research/sourcing.md`). Fetching the whole candidate pool
   blows the cost budget — especially in deep depth — for no added output.
4. **Anti-slop by gut feel.** Apply `_shared/topic-research/source-tiers.md` as written:
   the hard gate (named author OR recognized publication) is binary; tiering only orders
   what already passed. "It looks fine" is not a quality bar.
5. **Loading workstream context.** This is a standalone utility — workstream pollution
   biases the canon and the outline. Do not call any workstream loader. (Same shape as
   `/primer`, `/diagram`, `/critical-thinking`.)
6. **Auto-invoking `/primer` or any follow-up.** The handoff is a suggestion in the chat
   summary, never a dispatch. The user decides.
7. **Scope-creeping into a course.** This ships a lean annotated list (the 6★ shape), not
   a sequenced learning path with quizzes, time budgets, or spaced repetition. Keep
   annotations to ≤2 sentences; resist turning the list into a curriculum.
8. **Hardcoding paths.** Reference bundled files by their relative path (`reference/…`,
   `_shared/…`); never an absolute `/Users/...` path — it breaks the instant the skill is
   installed elsewhere.
9. **Reaching into the substrate to special-case `/learn-list`.** The
   `_shared/topic-research/` docs are skill-agnostic — they emit typed outputs (richness
   verdict, outline + provenance, per-topic shortlists). This skill's reactions live
   HERE, in its own phases, never as edits to the shared docs.
