# Unify /primer + /learn-list front half via a shared topic-research substrate — Requirements

**Date:** 2026-06-03
**Last updated:** 2026-06-03
**Status:** Approved
**Tier:** 3 — Feature (multi-skill refactor)
**Mode:** skill-new (description-seeded; edits two existing skills + adds substrate)
**Skills affected:** `pmos-learnkit/primer`, `pmos-learnkit/learn-list`, new `pmos-learnkit/_shared/topic-research/`
**Acceptance criteria:** the revised skills MUST conform to `reference/skill-patterns.md §A–§F`.

## Problem

`/primer` and `/learn-list` (both in `pmos-learnkit`) independently implement the **same research front half** — intake → canon discovery → topic outline → verified sourcing — with only cosmetic differences. The duplication is real and load-bearing:

- **Canon discovery is duplicated.** `/primer` Phase 2 Step 0 names practitioners + books; `/learn-list` Phase 2 names books + practitioners + harvests existing curations. Same intent, two implementations.
- **Outline derivation is duplicated** with different garnish — `/primer` builds an audience-biased H2 list; `/learn-list` derives a cascade-from-consensus outline with provenance.
- **Verified sourcing is duplicated** — both fetch-and-verify, but `/primer` counts a topic-wide pool against a floor while `/learn-list` runs an explicit rank-then-verify loop with an anti-slop hard gate.

Because the logic lives in two places, **improvements land in only one skill and the two drift.** `/learn-list` already has discipline `/primer` lacks (the binary anti-slop hard gate, rank-then-verify cost control, curation harvest, outline provenance, an adjacency walk); `/primer` has shaping `/learn-list` lacks (audience presets, a topic-richness classifier). Neither benefits from the other's strengths.

The two skills are not redundant — their **outputs** genuinely differ. `/learn-list` emits a ranked, annotated list of links (it points you at the material). `/primer` reads those sources and synthesizes a teachable prose artifact (it teaches the material). `/learn-list`'s output is, in effect, a **precursor** of the work `/primer` does. The divergence is entirely in the back half; the front half should be one thing.

### Who experiences this?

1. **The PM using the skills** — today gets inconsistent intake vocabulary (`/primer --depth/--audience` vs `/learn-list --mode/--level`), inconsistent source quality (only `/learn-list` enforces the anti-slop gate), and no adjacent-topic awareness in `/primer`.
2. **The skill maintainer (repo owner)** — must apply every research-quality fix twice and watch the two implementations drift.

### Why now?

The user is actively reasoning about how the two skills relate and has fully reconciled a unified design (a prior conversation, four explicit decisions). Extracting the shared substrate now — before more divergence accrues — is cheaper than after, and unblocks landing provenance / dedupe / hard-gate / adjacency in both skills at once.

## Goals & Non-Goals

> Goals are observable outcomes; engineering acceptance criteria belong in `/spec`.

### Goals

- **One front half, two skills.** Both skills inline the same intake → canon → outline → verified-sourcing substrate — measured by: the four substrate docs exist under `_shared/topic-research/` and both `SKILL.md` files reference them rather than restating the logic.
- **Unified, PM-shaped intake vocabulary.** A PM gets identical dials across both skills — measured by: both accept `--depth brief|standard|deep` and `--audience senior-pms|all-pms`; neither accepts `--mode` or `--level`.
- **Source quality parity.** `/primer` sources clear the same anti-slop hard gate `/learn-list` enforces — measured by: both inline the hard gate from the shared `source-tiers.md`.
- **`/primer` gains provenance, dedupe, and adjacency awareness** — measured by: `/primer`'s outline records its cascade provenance rung in the artifact, dedupes topics before sourcing, and emits a closing adjacency *pointer* section scaled by depth.
- **No regression in either skill's deliverable** — measured by: `/primer` still emits a synthesized HTML primer with the R1–R10 reviewer rubric; `/learn-list` still emits a verified, ranked, annotated reading list with a follow-list and paste-block.

### Non-Goals (explicit scope cuts)

- **NOT merging the two skills into one** — because the outputs (synthesized prose vs. annotated list) are genuinely disjoint, the back halves are large, the triggering intents differ, and a merged `SKILL.md` would blow the eval line caps. They stay two skills sharing a substrate.
- **NOT coupling the skills at invocation time** — because both deliberately hold a standalone-utility posture; `/learn-list` continues to *suggest* `/primer` as a follow-up and never invokes it, and `/primer` never invokes `/learn-list`.
- **NOT preserving the retired `--mode`/`--level` flags as aliases** — because the user explicitly accepted the breaking change; retired flags reject with a helpful error pointing at `--depth`/`--audience`.
- **NOT changing either skill's back half** beyond the additive `/primer` adjacency pointer section — synthesis, the R1–R10 rubric, annotation, follow-list, and paste-block are untouched.
- **NOT loading workstream context** in either skill — both remain standalone utilities (same posture as `/diagram`, `/critical-thinking`).

## User Experience Analysis

### Motivation

- **Job to be done (PM):** "Get me smart on a topic" — either as a curated list to read myself (`/learn-list`) or as a primer that teaches me (`/primer`). The PM wants consistent controls and trustworthy sources regardless of which they pick.
- **Job to be done (maintainer):** "Improve research quality once and have it apply everywhere."
- **Importance:** research quality is the entire value proposition of both skills — a slop link or a hallucinated practitioner destroys trust on first contact.
- **Alternatives considered:** (a) leave duplicated — rejected, drift continues; (b) merge into one skill — rejected (see Non-Goals); (c) call one skill from the other — rejected (breaks standalone posture, violates `/primer`'s no-subagents-in-research decision).

### Friction Points

| Friction Point | Cause | Mitigation |
|---|---|---|
| "Why does `/learn-list` use `--mode` but `/primer` use `--depth`?" | Two independently-grown flag vocabularies | Unify to `--depth` + `--audience` across both |
| "My `/primer` cited a content-farm listicle." | `/primer` has no upstream anti-slop gate | Shared hard gate runs in `/primer`'s sourcing too |
| "`/learn-list` worked yesterday with `--mode deep`; today it errors." | Breaking flag retirement | Clear rejection error naming the replacement (`--depth deep`) |
| "`/primer` taught the topic but never told me what to learn next." | No adjacency concept in `/primer` | Closing adjacency pointer section, depth-scaled |

### Satisfaction Signals

- A PM runs `/learn-list` then `/primer` on the same topic and the controls (`--depth`, `--audience`) feel identical.
- A maintainer adds a slop-tell to `source-tiers.md` once and both skills honor it on the next run.
- `/primer` deep runs read every verified source per topic (no early short-circuit), and the artifact shows its outline provenance.

## Solution Direction

Two skills, **one shared front-half substrate**, divergent back halves.

### Shared front half — four substrate docs both skills inline

`_shared/topic-research/` (new), matching the existing `_shared/pipeline-setup.md` / `_shared/html-authoring/` inlinable-markdown pattern:

1. **`intake.md`** — the unified intake. `--depth brief|standard|deep` is the single effort dial (coverage + quality + research spend scale together). `--audience senior-pms|all-pms` is the single reader axis; **both skills are PM-shaped.** Includes the **topic-richness classifier** (`rich` / `narrow-by-design` / `thin`) as a *shared signal with a per-skill reaction* (see Decisions D3).
2. **`canon-discovery.md`** — practitioners + books + **curation harvest** (awesome-lists, syllabi, "best X" posts) for both. Single feeder for the outline cascade.
3. **`outline.md`** — derive the outline by **cascade** from canon/curation consensus, **track the provenance rung** (recorded in each artifact's TL;DR), **dedupe topics before any downstream work**, and present the **confirm gate**.
4. **`sourcing.md`** — **rank-then-verify per-topic shortlists**, the same unit for both. The anti-slop hard gate + tier ranking + pass-bar move here (relocated from `learn-list/reference/{source-tiers,sourcing-ladder}.md`).

### Back half — stays disjoint

- **`/primer` overlay:** consume each topic's verified shortlist as the evidence set for the corresponding H2 → synthesize prose → R1–R10 reviewer rubric → inline SVGs → audience teach-sections → **closing adjacency pointer section** (depth-scaled: brief = none, standard = short, deep = richer).
- **`/learn-list` overlay:** rank → annotate (≤2 sentences) → adjacent rabbit-holes section → follow-list → copy-ready paste-block.

### Relocation

`learn-list/reference/source-tiers.md` and `sourcing-ladder.md` move into `_shared/topic-research/`. `learn-list/reference/modes.md`'s dial content folds into `intake.md` (the dial matrix is re-expressed against `--depth`).

## User Journeys

### Primary Journey A — PM runs `/learn-list "developer relations" --depth standard`

1. Intake (shared): resolves `--depth standard`, prompts `--audience` (senior-pms/all-pms) once, runs the topic-richness classifier → `rich`.
2. Canon discovery (shared): names practitioners + books, harvests 2–4 curations.
3. Outline (shared): cascade-derives 5–8 topics, records provenance rung, dedupes, presents confirm gate → user approves.
4. Verified sourcing (shared): per-topic rank-then-verify shortlists clear the hard gate.
5. Back half (`/learn-list`): annotates each link, walks 1 adjacency hop, builds the follow-list, emits the HTML list + paste-block. **Unchanged in shape from today.**

### Primary Journey B — PM runs `/primer "developer relations" --depth deep`

1–4. **Identical shared front half** as Journey A (same intake, canon, outline, sourcing), at `deep` effort.
5. Back half (`/primer`): for each outline topic, the verified shortlist becomes that H2's evidence set; synthesize prose across **every** verified source (no short-circuit); R1–R10 reviewer; inline SVGs; closing adjacency pointer section (deep = richer). Outline provenance appears in the TL;DR.

### Alternate Journey — `/primer` on a `narrow-by-design` topic

Richness classifier returns `narrow-by-design`; `/primer` reacts as today (outline carve-out, no decision-guide H2). `/learn-list` on the same verdict would simply produce a smaller honest list.

### Error Journey — retired flag

PM runs `/learn-list "X" --mode deep`. Skill rejects with a platform-aware error: `unknown flag '--mode'. Use --depth brief|standard|deep instead.` Exit 64. Same for `--level` → `--audience`.

### Edge Cases & Empty States

| Scenario | Condition | Expected Behavior |
|---|---|---|
| Thin topic in `/primer` | richness = `thin` | `/primer` offers reframings (as today) |
| Thin topic in `/learn-list` | richness = `thin` | `/learn-list` emits a small honest list, never blocks |
| Curation harvest finds nothing | no awesome-lists/syllabi exist | outline falls back to best-effort, tagged `provisional — no settled canon found` (existing `/learn-list` cascade rung 3) |
| `/primer` topic-wide source-floor not met | fewer than floor (6/10/15) verified sources across all topics | floor is now an **eval-time coverage signal** — surface a thin-source disclosure, do NOT block sourcing or short-circuit |

## Design Decisions

| # | Decision | Options Considered | Rationale |
|---|----------|-------------------|-----------|
| D1 | Share a **substrate**, not an invocation | (a) `/primer` calls `/learn-list`; (b) seed `/primer` from a `/learn-list` artifact; (c) extract shared inlinable docs | (c) — (a) violates `/primer`'s no-subagents-in-research decision + both skills' standalone posture; (b) is a fragile artifact-parsing coupling useful only as a later optional accelerator. Shared markdown both inline is clean and matches the existing `_shared/` pattern. |
| D2 | Keep **two skills**, do not merge | (a) one skill with `--format list\|primer`; (b) two skills sharing substrate | (b) — disjoint outputs + large disjoint back halves + different triggering + different eval rubrics; a merged `SKILL.md` would exceed eval line caps. |
| D3 | Unify intake to `--depth` + `--audience`, **both PM-shaped** | (a) shared concept, per-skill flag names; (b) unify flag names + values | (b), per user — single PM-shaped vocabulary. `--mode`→`--depth` (`quick`→`brief`); `--level`→`--audience` (`beginner`≈`all-pms`, `practitioner`≈`senior-pms`). `/learn-list` loses its topic-agnostic identity (accepted consequence). |
| D4 | Sourcing unit = **per-topic ranked shortlists**, no flattening | (a) per-topic shortlist, `/primer` flattens; (b) substrate exposes both aggregation modes | (b)-rejected (god-substrate conditionals). Per user: `/primer` does NOT flatten — it reads + synthesizes **every** verified source per topic; each topic's shortlist maps to the corresponding H2. |
| D5 | `/primer` source-floor (6/10/15) becomes an **eval-time coverage signal** | (a) keep as sourcing short-circuit; (b) demote to coverage signal only | (b), per user — the floor never caps or triggers compilation; `/primer`'s existing "≥3-source short-circuit" is **removed**. Read-everything-per-topic (higher deep latency accepted — depth is the thoroughness dial). |
| D6 | Topic-richness classifier is a **shared signal, per-skill reaction** | (a) shared with divergent reaction; (b) primer-only garnish | (a) — both run the classifier in shared intake; `/primer` reframes thin topics, `/learn-list` consumes softly. Keeps the intake phase genuinely identical. |
| D7 | **Curation harvest for both** | (a) include for both; (b) keep learn-list-only | (a) — gives `/primer` outline provenance + a richer candidate pool; makes the cascade+provenance the single outline-derivation path. |
| D8 | Retired flags **reject**, no back-compat alias | (a) reject with helpful error; (b) silent alias | (a), per user-accepted breaking change — clear error naming the replacement; cheaper than maintaining alias mapping. |
| D9 | `_shared/topic-research/` docs **stand alone** (no README/index) | (a) add a README; (b) stand alone | (b) — matches `_shared/html-authoring/` which has no top README; the four docs are self-describing. |
| D10 | A shared **depth→coverage dial matrix** lives in `intake.md` | (a) shared matrix in intake.md; (b) per-skill overlay | (a) — both skills scale topics-per-outline + sources-per-topic identically off `--depth` (brief/standard/deep), re-expressing `modes.md`'s matrix against the unified dial. |
| D11 | `brief` depth **still prompts `--audience`** | (a) prompt; (b) skip for speed (old `quick` behavior) | (a) — audience is one cheap prompt and shapes the whole artifact; resolved in `intake.md`. Non-interactive auto-picks `senior-pms`. |
| D12 | Shared substrate is **fully skill-agnostic** (grill G3) | (a) substrate documents per-skill reactions in a table; (b) substrate knows nothing about any skill | (b), per user ruling — `_shared/topic-research/*.md` describe only the mechanism + the typed output they emit; **no** `primer`/`learn-list` mention, **no** per-skill reaction tables, **no** skill-name branching. Each `SKILL.md` owns its reaction. Enforced by a grep check (no `primer`/`learn-list` tokens in the substrate). Supersedes the weaker framing in earlier drafts. |
| D13 | `/primer` deep-run cost governed by the depth dial + est-cost log (grill G1) | (a) dial only + est-cost line; (b) hard per-run read cap | (a) — no per-source cap; the `--depth` matrix bounds topics × sources; emit one est-cost line before sourcing (borrowed from `/learn-list` deep) so a big run isn't a silent surprise. |
| D14 | Retired-flag breakage net = repo grep at execute time (grill G2) | (a) grep repo + fix callers; (b) rejection error only | (a) — `/execute` greps the repo for `/learn-list --mode/--level` callers (skills, READMEs, tests, examples) and updates them; the runtime rejection error covers ad-hoc human use. |

## Success Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Front-half logic locations | 2 (one per skill) | 1 (shared substrate) | both `SKILL.md` inline `_shared/topic-research/*`; no restated front-half logic |
| Intake flag vocabularies | 2 (`--mode/--level` + `--depth/--audience`) | 1 (`--depth/--audience`) | both skills' `argument-hint` + parser |
| Skills enforcing the anti-slop hard gate | 1 (`/learn-list`) | 2 | both inline `source-tiers.md` hard gate |
| `/primer` outline provenance + adjacency | absent | present | artifact TL;DR shows provenance rung; closing adjacency section present (depth>brief) |
| Skill-eval rubric | n/a | both skills PASS the binary rubric | Phase 6a `/skill-eval` |

## Research Sources

| Source | Type | Key Takeaway |
|--------|------|-------------|
| `plugins/pmos-learnkit/skills/primer/SKILL.md` | Existing code | 5-phase pipeline; Phase 2 four-strand research + source-floor + ≥3 short-circuit; R1–R10 reviewer; audience presets; no adjacency. |
| `plugins/pmos-learnkit/skills/learn-list/SKILL.md` | Existing code | 8-phase pipeline; canon+curation; cascade outline w/ provenance + confirm gate; rank-then-verify; adjacency 0/1/2; follow-list; paste-block. |
| `learn-list/reference/source-tiers.md` | Existing code | Anti-slop hard gate (attributable + real) + T1–T4 tier ranking + slop tells + per-format notes. Relocates to substrate. |
| `learn-list/reference/sourcing-ladder.md` | Existing code | Verification pass-bar, rank-then-verify loop, curation-of-curations harvest, free-fetch ladder, book summaries, signature writings. Relocates to substrate. |
| `learn-list/reference/modes.md` | Existing code | `--mode` dial matrix (topics/links/hops/canon depth per tier). Folds into `intake.md` re-expressed against `--depth`. |
| `CLAUDE.md ## Canonical skill path` + `## Skill-authoring conventions` | Repo policy | Skills must stay at `plugins/<plugin>/skills/<name>/SKILL.md`; substrate is inlinable markdown; release via `/complete-dev`. |

## Open Questions

None — the three draft open questions were resolved into D9–D11 at requirements review; the focused grill (`grills/2026-06-03_01_requirements.md`) resolved 3 risky decisions into D12–D14 with no new open questions.
