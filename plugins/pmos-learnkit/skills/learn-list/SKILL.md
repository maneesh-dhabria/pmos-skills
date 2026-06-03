---
name: learn-list
description: Turns any topic into a verified, anti-slop, multi-format curated reading list — organized by a canon-derived topic outline, every link fetched and verified before it ships, each ranked and annotated with a ≤2-sentence why, closing with a follow-list of people, newsletters, books (with summaries) and practitioners' signature writings plus a copy-ready paste-block. Standalone learnkit utility; effort scales via --mode quick|standard|deep. Use when the user says "build me a reading list on X", "what should I read to learn Y", "curate the best sources on Z", "get me smart on this topic fast", "who should I follow to learn X", "give me a learning list for Y", or "/learn-list". Verification-first — it never emits a link it has not fetched this run.
user-invocable: true
argument-hint: <topic> [--mode <quick|standard|deep>] [--level <beginner|practitioner>] [--format <html|md|both>] [--non-interactive] [--interactive]
---

# /learn-list

**Announce at start:** "Using /learn-list to curate a verified reading list on the requested topic."

This is a standalone learnkit utility. It does NOT load workstream context and does NOT
feed the requirements→spec→plan pipeline. It produces one HTML artifact per topic plus a
copy-ready paste-block, and suggests `/primer <topic>` as a follow-up — it never invokes it.

The one rule everything else serves: **this is a verification-first web pipeline, not a
generate-from-memory one.** A reading list is only worth more than a search query if its
links are real, current, and slop-free. Every emitted link is fetched and verified this
run; the canon is found by live search, never recalled.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No `AskUserQuestion`:** intake confirmation and the outline-confirm gate degrade to
  numbered free-form prompts per `_shared/interactive-prompts.md`. The non-interactive
  auto-pick contract (Recommended → AUTO-PICK; outline gate auto-proceeds) still applies.
- **No `Task` subagents:** Phase 4 fan-out collapses to a sequential in-context pass — one
  topic at a time. Correctness is unchanged; only wall-clock grows.
- **No `WebFetch`:** verification is impossible, so the skill cannot honor its core
  contract — refuse with a clear message naming the missing tool and exit 64. Do NOT
  fall back to emitting unverified links.
- **No `WebSearch`:** fall back to `WebFetch` over user-supplied URLs/curations plus any
  context7 MCP available; warn that canon discovery is degraded.
- **No browser/Playwright MCP:** the free-fetch ladder in `reference/sourcing-ladder.md`
  still runs over `WebFetch`; only the optional last rung for JS-heavy social content is
  lost. Such candidates are dropped, never emitted unverified.

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
3. **Resolve mode (interactive vs non-interactive)** per `_shared/non-interactive.md`
   (`cli_flag > parent_marker > settings.default_mode > "interactive"`). Print
   `mode: <m> (source: <s>)` to stderr.
4. **Read `~/.pmos/learnings.md`** if present; apply any entries under `## /learn-list`
   to this run (e.g., domains that proved sloppy, formats that sourced poorly for a topic
   class). Skill body wins on conflict; surface conflicts to the user.

## Phase 1: Intake

Goal: pin **topic + mode + level** in one short pass.

1. **Parse arguments.** `<topic>` is required. `--mode` sets the effort dial (default
   `standard`); `--level` shapes sourcing depth. See `reference/modes.md` for the full
   dial matrix.
2. **Resolve mode.** Honor `--mode` if passed; else `standard`. If the user's phrasing
   signals effort ("quick list", "go deep / comprehensive"), suggest the matching mode.
3. **Resolve level.** Honor `--level` if passed. Otherwise, in `standard`/`deep`, issue
   one `AskUserQuestion` — **Practitioner (Recommended)** / **Beginner** — so a working
   expert and a newcomer get materially different lists. In `quick`, skip the prompt and
   produce a level-neutral list (speed is the point). Non-interactive auto-picks
   Practitioner.
4. **Confirm** topic + mode + level in a single line and proceed. Do not re-ask anything
   the flags already settled (saving a turn is more polite than ceremony).

## Phase 2: Canon &amp; curations (live search)

Goal: find the experts and the existing curations the field already trusts — by live
search, never from memory. Per the depth set by mode (`reference/modes.md`).

1. **Canonical books** — search for the field's foundational/most-recommended books;
   capture title + author. Verify each exists (a real catalog/author page resolves).
2. **Top practitioners** — the people whose names recur as authorities on this topic.
   Capture name + their primary home (site/newsletter/handle). Verify each is real and
   still active.
3. **Existing curations** — harvest 2–4 "best <topic> resources / reading list / syllabus
   / awesome-<topic>" pages and practitioner "what to read" posts, per
   `reference/sourcing-ladder.md` (Curation-of-curations). Extract their recurring
   entries; an item that recurs across independent curations is strong signal and
   pre-stocks the candidate pool (still subject to the pass-bar later).

Carry forward: book list, practitioner list, curation entries.

## Phase 3: Outline (cascade + confirm gate)

Goal: a topic outline an expert would recognize — with its provenance always shown.

1. **Derive the outline by cascade** (`reference/sourcing-ladder.md`, FR-8):
   - Where ≥2 canonical sources/curations agree on a structure → use it.
   - Else → the consensus structure across the harvested curations.
   - Else → your own best-effort outline, explicitly tagged `provisional — no settled
     canon found`.
   Record which rung produced the outline; it goes in the artifact's TL;DR.
2. **Dedupe topics** before any fan-out — never source the same topic twice.
3. **Outline-confirm gate.** In `standard` and `deep`, present the derived outline and
   let the user add / drop / reorder topics before fan-out — fan-out is the expensive
   step, so confirming first is cheap insurance against sourcing the wrong topics:

   `AskUserQuestion` — **Looks good, source it (Recommended)** / **Edit the outline**
   (user supplies changes next turn).

   In `quick` mode and in non-interactive mode, auto-proceed (log
   `outline-gate: auto-proceeded (<quick|non-interactive>)`).

## Phase 4: Source per topic (fan-out + rank-then-verify)

Goal: for each outline topic, produce a short ranked list of **verified** multi-format
links. Fan out one subagent per topic in `standard`/`deep` (sequential in `quick`).

Each topic's sourcing runs the **rank-then-verify loop** (`reference/sourcing-ladder.md`),
so verification spend scales with output, not with the candidate pool:

1. **Gather candidates** from live search + the harvested curations; cap the pool at ~3×
   the links-to-emit for the mode.
2. **Apply the hard gate** from `reference/source-tiers.md` (attributable + plausibly
   real) — discard failures cheaply on metadata, before any fetch.
3. **Tier-rank** survivors; take the top-N for the mode.
4. **Fetch-verify only those top-N** against the pass-bar — reachable + identity-match +
   annotation grounded in the fetched content. On a failure, pull the next-ranked
   candidate and verify it. Stop at N verified links, or fewer if the topic is genuinely
   thin (honest under-coverage beats padding).
5. **Annotate** each survivor from what you actually read: ≤2 sentences, soft ~240-char
   ceiling, saying *why it's here / what you'll get*. Tag tier; tag `paywalled` and add a
   free alternative when one exists.

Do not enforce a per-format quota — include only the formats actually found and verified.
A fabricated podcast or video to fill a row is a hard failure.

## Phase 5: Adjacencies &amp; follow-list

1. **Adjacency walk.** Explore adjacent topics to widen coverage — `0` hops in `quick`,
   `1` in `standard`, `2` in `deep` (`reference/modes.md`). Source each via the same
   rank-then-verify loop. Place results in a **separate "adjacent rabbit holes" section**
   so they never dilute the core list.
2. **Follow-list.** Assemble who/what to follow next: practitioners (with their
   **signature writing** — the piece search and the curations consistently surface,
   labeled "signature / most-referenced," never a fabricated citation count), newsletters
   (subscribe link), podcasts, and books (with a **sourced summary** link per
   `reference/sourcing-ladder.md`, or "no good summary found"). Deep mode adds book
   summaries + signature writings for the full practitioner set.

## Phase 6: Eval + Write

1. **Self-review before writing** — a quick reviewer pass over the assembled list:
   - **Dead-link sweep** — re-confirm every emitted URL resolved this run; drop any that
     didn't.
   - **Slop spot-check** — sample links against `reference/source-tiers.md`; drop any that
     slipped the hard gate.
   - **Grounding** — every annotation is supported by fetched content and within the
     ~240-char ceiling.
   - **Coverage** — every outline topic has ≥1 link or an explicit "thin — little quality
     material found" note.
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
   will ship. Fetching the whole candidate pool blows the cost budget — especially in
   deep mode — for no added output.
4. **Anti-slop by gut feel.** Apply `reference/source-tiers.md` as written: the hard gate
   (named author OR recognized publication) is binary; tiering only orders what already
   passed. "It looks fine" is not a quality bar.
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
