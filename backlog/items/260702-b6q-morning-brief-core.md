---
schema_version: 1
id: 260702-b6q
title: "/morning-brief core coverage — source abstraction + sweep, GTD-4D categorize/rank, show-everything brief with coverage manifest, /mytasks read-only lane, cursor"
type: feature
kind: story
status: done
released: 2.101.0
route: skill
priority: should
labels: [pmos-toolkit, morning-brief, coverage, connectors, skill]
created: 2026-07-02
updated: 2026-07-05
parent: 260702-kck
dependencies: []
design_doc: docs/pmos/features/2026-07-02_morning-brief/02_design.html
plan_doc: docs/pmos/features/2026-07-02_morning-brief/stories/260702-b6q/03_plan.html
feature_folder: docs/pmos/features/2026-07-02_morning-brief/
worktree:
branch: feat/260702-b6q
claimed_by: "build:b0e236c5-8aab-4a88-8bd7-4d40d8d8e0bc"
driver_holder: "build:b0e236c5-8aab-4a88-8bd7-4d40d8d8e0bc"
---

## Context

The read-only half of the NEW pmos-toolkit skill `/morning-brief`: everything from declared sources to an
emitted brief, with zero mutations. Grounded in the epic `design_doc:` (`02_design.html`) — data model (§3),
source abstraction (§4), verbs (§5), pipeline steps 1–4 + 8 (§6), manifest (§7), artifact (§8), policy notes
(§11), decisions D1–D3, D5–D7, D9–D10. Invariants INV-1 (derive, don't store), INV-2 (show everything,
structurally), INV-3 (user-declared, never assumed), INV-4 (privacy residency) all bind here. The batch
confirm / act / correct lane (§6 steps 5–7, §9) is story 260702-ww7, which extends this SKILL.md.

## Acceptance Criteria

- [ ] **AC1 — skill + verbs.** `plugins/pmos-toolkit/skills/morning-brief/SKILL.md` exists at the canonical
  path with the three-verb surface (bare run · `sources` · `rules` — D1); bare run with no `sources.yaml`
  routes into guided setup. In this story the bare run executes §6 steps 1–4 + 8 and then STOPS after
  emitting the brief (prints the action-proposal lane as informational only; the confirm/act lane lands in
  ww7).
- [ ] **AC2 — sources verb + config.** Guided setup writes `~/.pmos/morning-brief/sources.yaml` per §3:
  per-source id/kind/connector/priority/dismiss/scope plus `settings.first_window_days` (default 7, D9) and
  `settings.carryover_horizon_days` (default 14, D10). Priority is user-indicated, never suggested from
  observed volume (INV-3).
- [ ] **AC3 — sweep.** The run resolves each declared source's connector at run time (ToolSearch by hint,
  D5) and sweeps per the §4 kind contracts: new-since-cursor + still-unresolved-in-source carryover within
  the horizon. An unreachable source is recorded as failed-with-reason and never aborts the run.
- [ ] **AC4 — categorize + rank.** Items are categorized against `rules.md` (seeded GTD-4D taxonomy on
  first use; cold start, no priors); un-matched items are flagged `no-rule-matched`. Ranking places every
  item in exactly one of three prominence tiers; heuristics affect prominence only, never inclusion (INV-2).
- [ ] **AC5 — brief artifact.** A self-contained static HTML brief is written to
  `~/.pmos/morning-brief/briefs/YYYY-MM-DD.html` (same-day suffixing, D7) with the §8 layout: header with
  window + one-line coverage status, manifest, three tiers, `/mytasks` read-only lane, per-source collapsed
  FYI counts, per-item source badge / category / why-this-tier / deep link. No external requests; nothing
  written inside any repo (INV-4).
- [ ] **AC6 — coverage manifest.** Per §7: per-source swept/failed status, script-computed counts (§H),
  cursor window, `no-rule-matched` list, and per-source beyond-horizon counts (D10).
- [ ] **AC7 — /mytasks lane.** Due / overdue / check-ins / waiting-on read from the `/mytasks` store via its
  own lib, rendered read-only (INV-6).
- [ ] **AC8 — cursor.** `cursor.yaml` written atomically at end of run, only when all reachable sources
  swept cleanly (D6); no other run-state persists (INV-1).
- [ ] **AC9 — rules verb.** `/morning-brief rules` shows `rules.md` and supports add / edit / retire
  (delete) — FR-10.
- [ ] **AC10 — scripts + tests.** Deterministic work (cursor I/O, sources parse/validate, manifest counts,
  brief render from a JSON model) in zero-dependency Node scripts, each with `--selftest`, all green.
- [ ] **AC11 — non-interactive.** Steps 1–4 run unattended; setup DEFERs (free-form); W14 block inlined
  byte-identical; `audit-recommended.sh` green.
- [ ] **AC12 — conformance.** `skill-patterns.md §A–§L`; `skill-eval` `[D]`+`[J]` pass (or residuals proven
  pre-existing); 4 hygiene lints green.

## Build outcome (Loop-2, 2026-07-05)

BUILT via `/feature-sdlc build --next --non-interactive` (route:skill). Impl on **feat/260702-b6q `d9351585`,
UNMERGED** (for Loop-3); this write-back on main. Claim `build:b0e236c5-…` released. deps=[] so no dep-merge.
Worktree fresh from main (`7dc29109`).

New pmos-toolkit skill authored under `plugins/pmos-toolkit/skills/morning-brief/`:
- `SKILL.md` — 3 verbs (bare run · `sources` · `rules`, D1); INV-1/2/3/4/6 stated up front; integer phases with
  stable `{#anchor}` slugs (§J); NI block byte-identical to canonical; §H/§I/§L notes. Bare run = sweep →
  categorize → rank → emit brief + manifest → advance cursor (D6), then STOP (action lane = ww7).
- `scripts/lib.mjs` (`--selftest` 33/33) — store-dir resolve + INV-4 repo-write guard (refuses writing inside a
  code repo; allows `~/.pmos`), `sources.yaml`/`cursor.yaml` parse/validate/atomic-serialize, window math
  (D9/D10 — first_window_days/carryover_horizon_days), `/mytasks` read-only lane via its own lib (INV-6, local
  frontmatter fallback), manifest count assembly (§7/§H — script-computed, never LLM-estimated).
- `scripts/render-brief.mjs` (`--selftest` 18/18) — run-model JSON → self-contained static HTML brief + coverage
  manifest (inline CSS, zero external requests, no repo substrate payload), D7 same-day suffixing, INV-2 render
  self-check (every item rendered).
- `reference/rules-seed.md` (GTD-4D seed copied to `rules.md` on first use) + `reference/source-contracts.md`
  (per-kind read contracts + normalized item + the run-model schema render-brief consumes).

All 12 ACs met:
- **AC1** SKILL.md at canonical path, three-verb surface (D1); bare-run-no-config routes to guided setup, then
  runs steps 1–4 + 8 and STOPS (action lane deferred to ww7).
- **AC2** `sources` verb writes `sources.yaml` per §3 (id/kind/connector/priority/dismiss/scope +
  settings.first_window_days=7 / carryover_horizon_days=14); priority user-indicated, never volume-suggested (INV-3).
- **AC3** Sweep resolves each connector at run time (ToolSearch by hint, D5); per-kind read contracts; failed
  source → `status:failed,reason` record, run continues (never aborts).
- **AC4** Categorize against `rules.md` (GTD-4D seed on first use); unmatched → `no_rule_matched`; rank into
  exactly one of three tiers; prominence never inclusion (INV-2).
- **AC5** Self-contained HTML brief to `briefs/YYYY-MM-DD[-N].html` (D7 suffixing), §8 layout; no external
  requests; nothing written in any repo (INV-4, script-enforced).
- **AC6** Manifest: per-source swept/failed, script-computed counts, cursor window, no-rule-matched list,
  per-source beyond-horizon (D10) — all deterministic in `assembleManifest`.
- **AC7** `/mytasks` lane read-only from the mytasks store via its own lib (INV-6); degrades to empty lane +
  note when absent.
- **AC8** `cursor.yaml` written atomically at end-of-run only when all reachable sources swept cleanly (D6); no
  other run-state (INV-1).
- **AC9** `rules` verb views + add/edit/retire (retire=delete).
- **AC10** Deterministic work in two zero-dep Node scripts, each `--selftest` green (33/33, 18/18).
- **AC11** Steps 1–4 unattended; setup + rule-edit asks tagged `<!-- defer-only: free-form -->` (DEFER under
  NI); NI block byte-identical (`lint-non-interactive-inline` → `morning-brief OK`); `audit-recommended` green.
- **AC12** `skill-eval [D] --target claude-code` exit 0 (fixed `d-capture-learnings-phase` — heading needs a
  colon: `## Phase 9: Capture Learnings`); 4 hygiene lints green; §G clean (no plugin.json / CHANGELOG / README).

**Dogfood (offline, gates-blind, 12/12):** fixture 3-source config (1 failed) + fixture `/mytasks` store →
brief rendered under a scratch `$PMOS_MORNING_BRIEF_DIR` outside any repo. Verified: all 5 items rendered (INV-2);
failed source flagged in header + manifest reason; no-rule-matched surfaced; beyond-horizon counted; lane
overdue+waiting rendered; self-contained (no external requests); proposals marked informational; **live INV-4
guard refuses an in-repo store path**; scratch store outside repo.

**Build catches (reusable):** (1) `d-capture-learnings-phase` requires a **colon** after the phase number
(`Phase[[:space:]]+[0-9N][^:]*:.*Capture Learnings`) — an em-dash heading fails; used `## Phase 9: Capture
Learnings`. (2) A machine-wide `fork: Resource temporarily unavailable` (RLIMIT_NPROC saturation) blocked ALL
subprocesses mid-verify — not a code failure; left the story `in-progress` + claimed (the reconcile-in-flight
crash-recovery state) and resumed cleanly once the env recovered. (3) A naive `sed '/start/,/end/p'` NI-block
diff double-counts because Section D's awk extractor contains literal sentinel strings — use the real lint, not
an ad-hoc sed diff.

Unblocks **260702-ww7** (action lane — batch confirm → act → correct, extends this SKILL.md). Epic 260702-kck
now 1/2 stories built.
