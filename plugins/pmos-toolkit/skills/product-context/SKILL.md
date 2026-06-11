---
name: product-context
description: Create and manage persistent workstream context — product, area, or feature scope — that enriches all pipeline skills across repos and sessions. Stores context globally, links per-repo, and progressively enriches through document ingestion and pipeline sessions. Use when the user says "set up context", "initialize context", "update my workstream", "what context do my skills see", "show context", "link this repo", or runs /product-context init|update|show.
user-invocable: true
argument-hint: "init | update [docs/URLs] | show [--non-interactive | --interactive]"
---

# Workstream Context Manager

**Announce at start:** "Using the context skill to manage workstream context."

Create and maintain persistent workstream context that enriches all pipeline skills across repos and sessions. Context lives globally at `~/.pmos/workstreams/` (one file per workstream) and is linked per-repo via `.pmos/settings.yaml`; pipeline skills load it automatically (`_shared/pipeline-setup.md` Section 0 step 3) and propose enrichment at session end (Section C). Subcommands are NL-first: "set up context" ≡ `init`, "what context do my skills see" ≡ `show`, "add Sarah as a stakeholder" routes through `update`; an explicit subcommand overrides inference.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No `AskUserQuestion` tool:** Degrade prompts to numbered free-form prompts per `_shared/interactive-prompts.md`. The non-interactive auto-pick contract still applies (Recommended → AUTO-PICK).

## Non-interactive behavior (per subcommand)

The inline block below is the shared mode contract; how it lands here differs by subcommand:

- **`show`** — read-only, prompts nothing; runs headless as-is.
- **`update`** — every write prompt is free-form or mutates global state shared across repos: under non-interactive mode, DEFER all of them (record to the OQ buffer; write nothing).
- **`init`** — an interview; it cannot run headless. Under non-interactive mode, emit the refusal per `_shared/non-interactive.md` Section A and exit 64. (The file-global refused marker — block item 6 — is deliberately absent from this file: it would refuse `show` and `update` too, which stay viable. This section is init's self-documenting refusal statement.)

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

## Phase 0: Subcommand routing {#routing}

| Argument | Action |
|----------|--------|
| `init`, or no argument + no `.pmos/settings.yaml` | Phase 1: Init |
| `update`, `update <docs/URLs>`, or an update-shaped request ("add an area/stakeholder…") | Phase 2: Update |
| `show`, or no argument + `.pmos/settings.yaml` exists | Phase 3: Show |

## Phase 1: `/product-context init` {#init}

Creates a new workstream and links the current repo to it.

**Guard:** If `.pmos/settings.yaml` already exists in this repo, stop: "This repo is already linked to workstream '{name}'. Use `/product-context update` to modify it, or `/product-context show` to view it."

1. **Scan the repo before asking anything:** `README*` (product name, description, purpose); `package.json` / `pyproject.toml` / `Cargo.toml` (name, description, tech stack); `CLAUDE.md` / `.cursorrules` (conventions, architecture notes); `docs/` (existing requirements, specs, PRDs); any existing `.pmos/` artifacts.
2. **Present or ask.** Rich signals (clear name + description) → synthesize a draft (product, tech stack, user segments — mark what you couldn't determine) and ask: "Does this look right? Want to adjust anything?" Thin signals → ask exactly two questions: "What's the name of what you're working on?" and "How would you explain it to someone at a dinner party who's genuinely interested?" — keep the dinner-party framing verbatim; it yields richer descriptions than "describe your product".
3. **Scope question:** "Is this the whole product, or are you focused on a specific area within it (like a particular problem space with its own goals)?" Whole product → **Product template**. Specific area → ask what the area is called and what problem it focuses on, plus the parent product's name — if `~/.pmos/workstreams/{parent-slug}.md` exists, link via the `product` field; otherwise record the name there for future linking — then use the **Charter template**. Templates: Read `reference/templates.md` when this step routes.
4. **Offer document ingestion:** "Got any existing docs, links, or notes? I can read files, URLs, or Notion pages — landing pages, pitch decks, strategy docs, research summaries, even a few paragraphs you've written anywhere. Or we can skip this and build context over time." If provided, read/fetch and synthesize into the template sections. Either way, present the draft for review before writing; empty sections fill in over time.
5. **Write files:**
   - Generate a slug from the product/area name (lowercase, hyphenated, e.g. `my-fintech-app`); `mkdir -p ~/.pmos/workstreams/`; write `~/.pmos/workstreams/{slug}.md` from the selected template.
   - Write `.pmos/settings.yaml` per `_shared/pipeline-setup.md` §A.4 — the single settings writer (`version`, `docs_path`, `workstream: {slug}`, `current_feature`). Init creates no feature folder, so set `current_feature: null` (Section 0 step 4 handles its absence). `docs_path` default and legacy-`docs/` detection follow §A.1–A.2; the migration recipe is §D.
   - Confirm: "Created workstream context at `~/.pmos/workstreams/{slug}.md`; linked this repo via `.pmos/settings.yaml`. Pipeline skills will now load this context automatically — empty sections fill in as you use `/requirements`, `/spec`, and other skills."

## Phase 2: `/product-context update` {#update}

Updates an existing workstream.

**Guard:** If no `.pmos/settings.yaml` exists, suggest running `/product-context init` first.

Modes, inferred from the request:

| Input | Mode |
|-------|------|
| No args | Open-ended update |
| Docs, files, or URLs provided | Document ingestion |
| "Add an area/problem area called X" | Charter scaffold |
| "Add X as a stakeholder" | Add stakeholder |

<!-- nl-sugar -->
`--add-charter "Name"` and `--add-stakeholder "Name, Title"` stay parsed as explicit spellings of the last two modes.

- **Open-ended:** load the workstream; identify empty or thin sections; suggest specific areas to enrich. Deeper prompts when relevant: past mistakes/incidents/"scars" that shape decisions; rollout/release process (feature flags, staged rollouts, beta groups); how the product grows.
- **Document ingestion:** read/fetch the provided documents; map new signals to template sections.
- **Charter scaffold:** append under `## Charters` — `### {Name}` with `**Problem** / **North star metric** / **Active initiatives**` stubs; ask the user to fill them in. (The file format says "Charters"; spoken prompts say "area" — see Anti-Patterns.)
- **Add stakeholder:** append to `## Team & Stakeholders` (create the section if missing); ask: "What does {Name} care about most? What kind of feedback do they typically give?"

In every mode: present changes as a concrete diff per `_shared/pipeline-setup.md` §C.2 and get approval before writing. If approved, apply the edits and bump the `updated` frontmatter timestamp.

## Phase 3: `/product-context show` {#show}

1. Read `.pmos/settings.yaml`; if not found: "No workstream linked to this repo. Run `/product-context init` to set one up."
2. Load `~/.pmos/workstreams/{workstream}.md`. If frontmatter `type` is `charter` (or a hand-authored `feature`) and a `product` field exists, also load the parent workstream under a "Parent context" heading.
3. Display the full workstream content.

## Template Rules

The Product and Charter templates live in `reference/templates.md` (Read it from `#init` step 3).

- Empty sections are placeholders for future enrichment, not obligations
- `updated` timestamp changes on every enrichment for staleness visibility
- Users can add custom sections organically — templates are starting points
- Optional sections (Rollout & Release, Constraints & Scars, Team & Stakeholders) only when the user provides real information — never with placeholder text
- `## Key Decisions` holds product-level decisions only; link per-feature decisions to their feature folder rather than copying them (the feature folder and `{docs_path}/session-log.md` are their homes)

## Anti-Patterns (DO NOT)

- Do NOT ask the user to fill out a long form — infer from repo, ask only what's missing
- Do NOT create a workstream file without showing it to the user first
- Do NOT silently update workstream context — always show a concrete diff and get approval
- Do NOT include optional sections with placeholder text — only add them when real information exists
- Do NOT use the word "charter" in user-facing prompts — use "area" or "problem area" instead
- Do NOT block pipeline skills when no context exists — they must work without context
- Do NOT create multiple workstream files for the same product — one file per workstream
- Do NOT overwrite existing sections during enrichment — append or expand, never replace without showing the diff
- Do NOT ask questions that can be answered by reading the repo — scan first, ask second

---

*Spec lineage: founding spec `docs/pmos/features/2026-04-11_context-skill/02_spec.md` (dinner-party framing, no-degradation principle, three-altitude store); mode contract per `2026-05-08_non-interactive-mode`; templates extracted to `reference/templates.md`, the never-instantiated Feature template retired, settings writing unified on `_shared/pipeline-setup.md` §A.4 (closing a 2-key/4-key writer drift), diff format deferred to §C.2, and per-subcommand non-interactive posture stated, per the 2026-06-10 skill-design review.*
