---
schema_version: 1
id: 260702-kck
title: "/morning-brief — trustworthy cross-source morning coverage: sweep user-declared sources (email, calendar, doc comments, …) into one ranked show-everything brief with a per-run coverage manifest, observe+correct heuristics, and batch-confirmed actions (create /mytasks tasks, source-native dismiss)"
type: feature
kind: epic
status: defining
route: skill
priority: should
labels: [pmos-toolkit, morning-brief, coverage, connectors, triage, mytasks, skill]
created: 2026-07-02
updated: 2026-07-02
design_doc: docs/pmos/features/2026-07-02_morning-brief/02_design.html
requirements_doc: docs/pmos/features/2026-07-02_morning-brief/01_requirements.html
feature_folder: docs/pmos/features/2026-07-02_morning-brief/
parent:
dependencies: []
---

## Context

New pmos-toolkit skill `/morning-brief` (placed by adjacency to `/mytasks`; charter fit noted as
by-adjacency in the shape brief). Shaped via `/shape`
(`docs/pmos/shape/2026-07-02_morning-brief-skill.html`, untracked on main by design — work-adjacent
artifact) and hardened by a deep `/grill` (8 questions, all resolved; report
`.pmos/grills/2026-07-02_morning-brief-skill.html`, also untracked).

The shaped problem is **trustworthy cross-source coverage**, not "generate a brief": a PM cannot trust
any single tool's picture of what arrived overnight (email, team chat, calendar, doc-collaboration
comments), so they either pay a manual tool-by-tool morning sweep or risk missing commitments; and items
caught in the sweep don't reliably become tracked tasks. The ★ sub-problem is **staying trustworthy in
week 4** — silent heuristic rot, source breakage, or a false sense of coverage is worse than no tool.

Binding decisions (all settled at shape + grill; the design doc carries them as D-numbered decisions):

- **User-declared source abstraction** — sources and their relative priority are user configuration;
  the skill never assumes a channel mix (no Slack MCP in this env; Drive comments unreachable — the
  abstraction is generic, presence is declared, gaps are surfaced).
- **On-demand runs** in a live authed session; no cron dependency.
- **Derive, don't store** — the brief is a pure view over source state + `/mytasks`; no per-item triage
  ledger; only a last-run cursor persists. Dismissal = **confirm-gated source-native action** (archive
  the email, resolve the comment); the source is the state store.
- **Show everything, rank it** — recall is structural (every in-window item at least a one-line FYI
  row); heuristics decide prominence, never inclusion. Prominence tiers + collapsed FYI counts absorb
  volume.
- **Batch review, one confirm** — each run proposes one editable action set, confirmed once (matches
  `/mytasks import` preview→confirm).
- **Read-only `/mytasks` lane** (due/overdue/check-ins/waiting) with a dedupe rule; `/mytasks` stays the
  sole system of record.
- **Per-run coverage manifest** — sources swept, counts, unreached sources, no-heuristic-matched items;
  the week-4 trust mechanism.
- **Observe + correct heuristics** from a small generic GTD-4D seed taxonomy; cold start (no seeded
  priors); corrections at the confirm step become candidate personal rules.
- **Privacy:** all state and emitted briefs live under `~/.pmos/` — work-comms content is never written
  inside any git repo. LLM processing of work content on every run is an explicitly accepted premise.
- The brief **informs and recommends; the user confirms and triggers** every action.

## Acceptance Criteria

- [ ] A user can **declare their sources** (kind, how to read it, relative priority) as configuration
  under `~/.pmos/`; the skill assumes nothing about channel mix or priority and degrades loudly (via the
  manifest) when a declared source is unreachable.
- [ ] Running the skill **sweeps every declared source + the read-only `/mytasks` lane** since the
  last-run cursor (new + still-open-in-source carryover), categorizes items against the heuristics, and
  emits **one HTML brief under `~/.pmos/`** with prominence tiers, collapsed FYI counts, and every
  in-window item present at least as an FYI row (show-everything is structural).
- [ ] Every brief carries a **coverage manifest**: per-source swept/failed status, item counts, cursor
  window, and items no heuristic matched — never a silent gap.
- [ ] The run ends in **one batch-review confirm**: an editable proposed action set (create these
  `/mytasks` tasks with dedupe against existing items; perform these source-native dismissals; leave
  these) — nothing is executed unconfirmed; `/mytasks` remains the sole system of record.
- [ ] **No per-item triage state is stored** — re-running derives the same view from live source state;
  only the last-run cursor (and user config/heuristics) persist under `~/.pmos/`.
- [ ] **Heuristics observe + correct**: seed GTD-4D taxonomy, no seeded priors; user corrections at the
  confirm step are captured as candidate rules the user approves into their personal rule file.
- [ ] Non-interactive: the sweep + brief emit run unattended (Recommended → AUTO-PICK); the batch action
  confirm and any source-native dismissal DEFER (destructive) — never auto-executed.
- [ ] Work content never lands in any repo path; brief artifacts + state live under `~/.pmos/`.
- [ ] Conforms to `skill-patterns.md §A–§L`; passes `skill-eval` (`[D]`+`[J]`); 4 hygiene lints +
  `audit-recommended` green. Single plugin (pmos-toolkit), one release unit.

## Stories

- **260702-b6q** — core coverage (read-only end-to-end): source abstraction + guided setup, sweep,
  GTD-4D categorize/rank, show-everything brief + coverage manifest, `/mytasks` read-only lane, cursor,
  `rules` verb. No deps.
- **260702-ww7** — action lane: batch-review one-confirm, `/mytasks` creation with dedupe, source-native
  dismissals, observe+correct rule capture. Deps: 260702-b6q (same SKILL.md — sequential, D8).

## Release prerequisites

- pmos-toolkit `plugin.json` ×2 version bump (new user-invocable skill → minor bump).
- README row for `/morning-brief`; changelog entry; manifest version-sync.
- All owned by `/complete-dev` (Loop 3) — never in a build wave (§G).
