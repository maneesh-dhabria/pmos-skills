---
name: product-context
description: Create and manage persistent workstream context — product, area, or feature scope — that enriches all pipeline skills across repos and sessions. Stores context globally, links per-repo, and progressively enriches through document ingestion and pipeline sessions. Use when the user says "set up context", "initialize context", "update my workstream", "what context do my skills see", "show context", "link this repo", or runs /product-context init|update|show.
user-invocable: true
argument-hint: "init | update [--add-charter 'name'] [docs/URLs] | show [--non-interactive | --interactive]"
---

# Workstream Context Manager

Create and maintain persistent workstream context that enriches all pipeline skills (`/requirements`, `/spec`, `/plan`, `/execute`, `/verify`) across repos and sessions.

```
/product-context  →  /requirements  →  [/msf-req, /creativity]  →  /spec  →  /plan  →  /execute  →  /verify
(this skill)                     optional enhancers
```

Context is stored globally at `~/.pmos/workstreams/` (one file per workstream) and linked per-repo via `.pmos/settings.yaml`. Pipeline skills load context automatically and propose enrichment at session end.

**Announce at start:** "Using the context skill to manage workstream context."

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:
- **No interactive prompt tool:** State your assumption, document it in the output, and proceed. The user reviews after completion.
- **No subagents:** Perform research and analysis sequentially as a single agent.
- **No Playwright MCP:** Note browser-based verification as a manual step for the user.

---

## Phase 0: Subcommand Routing

Parse the user's argument to determine which subcommand to run:

| Argument | Action |
|----------|--------|
| `init` or no argument + no `.pmos/settings.yaml` | Run Phase 1: Init |
| `update`, `update --add-charter "X"`, `update <docs/URLs>` | Run Phase 2: Update |
| `show` or no argument + `.pmos/settings.yaml` exists | Run Phase 3: Show |

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

## Phase 1: `/product-context init`

Creates a new workstream and links the current repo to it.

**Guard:** If `.pmos/settings.yaml` already exists in the current repo, inform the user: "This repo is already linked to workstream '{name}'. Use `/product-context update` to modify it, or `/product-context show` to view it." Do not proceed with init.

### Step 1: Auto-Scan the Repo

Scan the current repo for context signals before asking any questions:

- `README.md` or `README` — product name, description, purpose
- `package.json`, `pyproject.toml`, `Cargo.toml` — name, description, dependencies (tech stack)
- `CLAUDE.md`, `.cursorrules` — project conventions, architecture notes
- `docs/` directory — existing requirements, specs, PRDs
- Any existing `.pmos/` artifacts

### Step 2: Present or Ask

**If rich signals found** (clear product name + description from README or manifest):

Synthesize a draft and present it:

> "Based on your repo, here's what I gathered:"
>
> **Product**: BookCompanion — AI-powered reading companion that helps users engage deeply with books
> **Tech stack**: Next.js, Python/FastAPI backend, Postgres, deployed on Vercel
> **User segments**: (couldn't determine — will fill in over time)
>
> "Does this look right? Want to adjust anything?"

**If thin signals** (empty repo, minimal README, no manifest):

Ask two questions:
1. "What's the name of what you're working on?"
2. "How would you explain it to someone at a dinner party who's genuinely interested?" — this framing gets richer, more natural descriptions than "describe your product"

### Step 3: Scope Question

> "Is this the whole product, or are you focused on a specific area within it (like a particular problem space with its own goals)?"
>
> a) This is the whole product
> b) This is a specific area within a larger product

- If **(a)**: Use the **Product Template**
- If **(b)**: Ask:
  - "What's this area called, and what problem does it focus on?"
  - "What's the name of the parent product?" — check if `~/.pmos/workstreams/{parent-slug}.md` exists. If yes, link via `product` field. If no, note the name in `product` field for future linking.
  - Use the **Charter Template**

### Step 4: Document Ingestion

> "Got any existing docs, links, or notes? I can read files, URLs, or Notion pages to build a richer context. Or we can skip this and build context over time."
>
> "Things that work great: landing pages, pitch decks, strategy docs, competitor analyses, product tour transcripts (Loom/video transcripts), user research summaries, or even just a few paragraphs you've written about the product anywhere."

If docs provided:
- Read files with the Read tool
- Fetch URLs with WebFetch
- Synthesize key information into the appropriate template sections
- Present the enriched draft for review before writing

If no docs: proceed with what we have. Empty sections will fill in over time.

### Step 5: Write Files

1. Generate a slug from the product/area name (lowercase, hyphenated, e.g., `my-fintech-app`)
2. Create directory if needed: `mkdir -p ~/.pmos/workstreams/`
3. Write `~/.pmos/workstreams/{slug}.md` using the selected template, filling in all gathered information. Leave sections empty (with placeholder text) where information wasn't available.
4. Create `.pmos/settings.yaml` in the current repo:
   ```yaml
   # Which workstream context to load for this repo
   workstream: {slug}

   # Where pipeline docs (requirements, specs, plans, feature folders) are stored.
   # Default: docs/pmos (committed, namespaced under docs/).
   # Alternatives:
   #   .pmos      — keep artifacts uncommitted/private (note: .pmos is .gitignored by default in many repos)
   #   docs       — legacy layout for repos that started before the docs/pmos default
   docs_path: docs/pmos
   ```
   **Pick `docs/pmos` unless the user explicitly says otherwise.** If the repo already has legacy `docs/{requirements,specs,plans,features}/` folders, set `docs_path: docs` instead so existing artifacts keep working — and tell the user how to migrate (see `_shared/pipeline-setup.md` Section D for the migration recipe).
5. Show what was created:
   > "Created workstream context at `~/.pmos/workstreams/{slug}.md`"
   > "Linked this repo via `.pmos/settings.yaml`"
   >
   > "Pipeline skills will now load this context automatically. Empty sections will fill in as you use `/requirements`, `/spec`, and other skills."

---

## Phase 2: `/product-context update`

Updates an existing workstream.

**Guard:** If no `.pmos/settings.yaml` exists, suggest running `/product-context init` first.

### Determine Mode

| Input | Mode |
|-------|------|
| No args | Open-ended update |
| Docs, files, or URLs provided | Document ingestion |
| `--add-charter "Growth"` | Add charter section |
| `--add-stakeholder "Sarah, Eng Lead"` | Add stakeholder |

### Open-Ended Update (no args)

1. Load the current workstream file
2. Identify which sections are empty or thin
3. Suggest specific areas to enrich. Beyond standard template sections, use these deeper prompts when relevant:
   - "Are there any past mistakes, incidents, or 'scars' that heavily influence how decisions get made?" — surfaces hidden constraints
   - "What does your rollout/release process look like? Feature flags, staged rollouts, beta groups?" — useful for `/spec` and `/plan`
   - "How does your product grow? What's the growth model?" — helps `/requirements` tie features to business impact
4. User provides information
5. Draft edits as a concrete diff showing exactly what would change
6. Present for approval
7. If approved: apply edits, bump `updated` timestamp in frontmatter

### Document Ingestion (with docs/URLs)

1. Read/fetch the provided documents
2. Load the current workstream file
3. Identify new signals that map to template sections
4. Draft additions as a concrete diff
5. Present for approval
6. If approved: apply edits, bump `updated` timestamp

### Flag-Based Updates

**`--add-charter "Name"`**: Add a new charter section to a product workstream's `## Charters` area:
```markdown
### {Name}
- **Problem**:
- **North star metric**:
- **Active initiatives**:
```
Ask the user to fill in the details.

**`--add-stakeholder "Name, Title"`**: Add to `## Team & Stakeholders` section. If the section doesn't exist, create it. Ask: "What does {Name} care about most? What kind of feedback do they typically give?"

### Diff Format

Always present changes in this format:
```
Based on this update, I'd change your workstream context:

  ## User Segments
  + Small business owners (1-50 employees) managing        ← new
    invoices manually                                       ← new

  ## Key Metrics
  + Target: 40% reduction in manual invoice processing      ← new

Apply these updates? (y/n)
```

---

## Phase 3: `/product-context show`

1. Read `.pmos/settings.yaml` from the current repo
2. If not found: "No workstream linked to this repo. Run `/product-context init` to set one up."
3. Load `~/.pmos/workstreams/{workstream}.md`
4. If the workstream type is `charter` or `feature` and has a `product` field, also load the parent workstream and show it under a "Parent context" heading
5. Display the full workstream content

---

## Templates

### Product Template

```markdown
---
name: {product name}
type: product
created: {date}
updated: {date}
---

## Description
{One-line description}

## Value Proposition
{Why does this product exist? What problem does it solve?}

## User Segments
{Who uses this? What are their characteristics?}

## Tech Stack
{Languages, frameworks, infrastructure, deployment}

## Competitors / Alternatives
{What else exists in this space? How is this different?}

## Key Metrics
{How do you measure success?}

## Charters

### {Charter Name}
- **Problem**:
- **North star metric**:
- **Active initiatives**:

## Rollout & Release (optional)
{Feature flags, staged rollout groups, release process, deployment mechanisms}

## Constraints & Scars (optional)
{Past incidents, hard-learned lessons, or organizational constraints that shape decisions}

## Team & Stakeholders (optional)
{Who's involved? What do they care about?}

## Key Decisions
{Significant decisions with rationale, added over time}
```

### Charter Template

```markdown
---
name: {charter name}
type: charter
product: {parent product slug, if applicable}
created: {date}
updated: {date}
---

## Description
{What problem area does this own?}

## North Star Metric
{Primary measure of success}

## User Segments
{Which users does this serve?}

## Current Initiatives
{What's actively being worked on?}

## Constraints & Decisions
{Technical or business constraints, key decisions made}

## Team & Stakeholders (optional)
{Who's involved? What do they care about?}
```

### Feature Template

```markdown
---
name: {feature name}
type: feature
product: {parent product slug, if applicable}
charter: {parent charter slug, if applicable}
created: {date}
updated: {date}
---

## Description
{What is this feature?}

## Problem
{What problem does it solve?}

## Success Metrics
{How do you know it worked?}

## Target Users
{Who benefits?}

## Technical Context
{Relevant tech constraints or dependencies}
```

### Template Rules

- Empty sections are placeholders for future enrichment, not obligations
- `updated` timestamp changes on every enrichment for staleness visibility
- Users can add custom sections organically — templates are starting points
- Optional sections (Rollout & Release, Constraints & Scars, Team & Stakeholders) should only be included if the user provides relevant information. Do not include them with placeholder text.

---

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
