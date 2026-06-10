# Tier Matrix — Shared Sizing Contract

> Canonical definition of the pipeline's three tiers: what each tier means, the signals that detect it, and how the tier travels through the pipeline. Consumers cite this file for the boundary semantics and keep only their per-artifact reactions (which sections to emit, lengths, task lists, tier-gated phases) local.

## Definitions and detection signals

Detect by explicit signals; pick the **highest tier with any firing signal**:

| Tier | Name | Signals (any one fires the tier) |
|---|---|---|
| **1** | Bug / minor fix | Isolated defect; reversible; no new user-visible flow; touches ≤1 surface |
| **2** | Enhancement / UX change | Touches 1–2 existing surfaces; no new persona; no new data model; an existing flow is extended |
| **3** | Feature / new capability | Touches ≥3 surfaces, OR introduces a new persona, OR introduces a new top-level data-model concept, OR is irreversible at the product level |

The signal column is the boundary test. Per-artifact tier *names* may paraphrase ("Feature / Product Launch", "Feature / New System") — the boundary does not.

The `type` frontmatter field maps 1:1: tier 1 → `bugfix`, tier 2 → `enhancement`, tier 3 → `feature`.

## Boundary semantics through the pipeline

- **Detect once, carry forward.** The first pipeline skill to run (usually /requirements) detects the tier, confirms it with the user, and persists `Tier:` in the artifact frontmatter. Downstream skills read the tag and carry it forward **without re-asking** — announce only ("Tier N carried forward from the requirements doc").
- **Untagged entry.** A skill entered mid-pipeline with no tagged upstream doc assesses from the table above and confirms via `AskUserQuestion`, recommending the assessed tier.
- **Override.** The user can override the tier at any phase boundary. Confirm the tier *before* creating phase tasks — re-tiering after task creation forces a clean-and-recreate.

## Tier ↔ depth (the user-facing dial)

Tier is the **internal** sizing concept; `--depth brief|standard|deep` is the **user-facing** effort dial (the single user vocabulary, 2026-06-10 review decision 3). The correspondence:

| `--depth` | Tier |
|---|---|
| `brief` | 1 |
| `standard` | 2 |
| `deep` | 3 |

An explicit `--depth` — or its natural-language equivalent ("go deep on this") — overrides signal detection. Legacy user-facing spellings (`--rigor`, boolean `--deep`, user-facing `--tier` values) are silent aliases for `--depth`; machine-coupled flags keep their names.

## What stays local

Per-artifact sections/length tables, task lists, review-loop counts, and tier-gated phase behavior (e.g. Tier 1 skips folded phases and /prototype; Tier 3 makes /prototype mandatory) are each consumer's own reaction to the tier — stated at the consumer's call site, not here.

## Consumers

requirements, spec, plan, wireframes, prototype, feature-sdlc

---

*Spec lineage: signal table per /requirements (most recently shipped wording wins, review decision 8; originally `2026-05-08_requirements-refactor`); carry-forward + `type` mapping per /spec; depth vocabulary per 2026-06-10 skill-design review decision 3 (converging on `2026-06-03_unify-primer-learnlist`'s `--depth` dial).*
