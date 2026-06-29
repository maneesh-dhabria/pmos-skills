---
schema_version: 1
id: 260629-9ne
title: "/artifact-critique emit-pathway fixes — self-contained HTML fallback, Node-unavailable gate protocol, always-surfaced reviewer line, no-stderr Phase-0 lines (4 reflect findings)"
type: enhancement
kind: epic
status: defined
route: skill
priority: should
labels: [pmos-toolkit, artifact-critique, skill, from-feedback]
created: 2026-06-29
updated: 2026-06-29
released:
source: "from-feedback (/reflect retro of /artifact-critique, 1 run on pov/pov_v6.html, 2026-06-29). Skill delivered fully on its claimed contract (10-axis scorecard, ≥40-char verbatim quotes, valid embedded findings JSON, published artifact, no critique-content pushback); 4 emit-pathway gaps surfaced — 2 friction (F1 undocumented self-contained HTML fallback, F2 undocumented Node-unavailable gate protocol) + 2 nits (F3 reviewer line not always surfaced, F4 Phase-0 stderr lines invisible on no-stderr harness). Maintainer decisions (define run): D1 conditional self-contained HTML fallback when an Artifact/canvas tool is present, multi-file substrate stays default (grilled via AskUserQuestion); D2 Node-unavailable → skip critique-eval.mjs + manually validate E-checks + ## Limits entry + proceed; D3 Phase-7 Tier-2 always emits one reviewer-outcome line; D4 no-stderr → surface Phase-0 mode/output_format lines inline. All 4 = SKILL.md-only doc/contract edits; rubric substrate, html-authoring substrate, and critique-eval.mjs all byte-unchanged."
design_doc: docs/pmos/features/2026-06-29_artifact-critique-emit-fixes/02_design.html
parent:
dependencies: []
---

## Context

A single `/artifact-critique` run delivered on its claimed contract; the retro surfaced **four gaps in the emit
pathway only** — none touch the critique engine or the `_shared/critique-rubric/` substrate. All four are
documentation / contract fixes in `plugins/pmos-toolkit/skills/artifact-critique/SKILL.md`:

- **F1 [friction]** — the `_shared/html-authoring/` substrate emits a multi-file folder (HTML + linked `assets/`),
  but a standalone shareable critique wants one self-contained file publishable via the platform's Artifact tool.
  No such path was documented, forcing a separate `/artifact`-design invocation + a "Please continue" turn.
- **F2 [friction]** — Phase 7 documents `critique-eval.mjs` exit 0/1/2 but not "Node exec unavailable entirely";
  the skip was surfaced only via Inv-5 judgment, not a documented path.
- **F3 [nit]** — Phase 7 says "surface its notes in the chat summary" but the advisory reviewer produced no
  announced output when it had nothing to say; the contract should require the note even when empty.
- **F4 [nit]** — the Phase 0 `mode:` / `output_format:` stderr lines never appeared (Claude Code has no distinct
  stderr channel).

The four decisions (D1–D4), four FRs, finding→FR map, and five invariants are in the `design_doc:`
(`02_design.html`). This is a revision of an existing skill — SKILL.md-only; the rubric, the html-authoring
substrate, and `critique-eval.mjs` are all byte-unchanged.

## Surfaces

`plugins/pmos-toolkit/skills/artifact-critique/SKILL.md` **only** — `## Platform Adaptation` (FR-1, FR-2, FR-4
bullets) and `## Phase 7` (FR-1/FR-2 cross-references + FR-3 Tier-2 always-emit line).

## Stories

One story — singleton skill epic (same shape as 260629-pd2 / 260629-bm9). All four FRs revise the single
`SKILL.md`; the D24 litmus fails any multi-story split.

- **260629-6j0** (route: skill, planned) — all four FRs in one `/execute` run.

## Decisions (maintainer-approved, this define run)

- **D1** — Conditional self-contained HTML fallback: when the host platform exposes a first-class Artifact/canvas
  publish tool, emit a single self-contained HTML (inline CSS/JS, embedded findings block retained, comments
  overlay inlined best-effort) and publish in the same phase — no separate user turn. The multi-file `assets/`
  substrate stays the **default** for `--out` / pipeline-folder writes; overlay loss noted in `## Limits`.
  *(grilled via AskUserQuestion — chose "conditional fallback, multi-file stays default".)*
- **D2** — Node-unavailable → skip `critique-eval.mjs`, manually validate the deterministic E-checks (esp.
  E-quote-in-source), add a `## Limits` entry, proceed; never block, never silently omit.
- **D3** — Phase 7 Tier-2 always emits one reviewer-outcome sentence, even when empty.
- **D4** — No distinct stderr channel → surface the Phase 0 `mode` + `output_format` resolution lines inline at
  Phase 0 entry. *(cross-skill convention; scoped here, promotion to shared non-interactive block deferred.)*

## Invariants

- **INV-1** `_shared/critique-rubric/` byte-unchanged. **INV-2** `_shared/html-authoring/` not modified (multi-file
  emit stays default). **INV-3** `scripts/critique-eval.mjs` unchanged. **INV-4** embedded
  `pmos-critique-findings/v1` block retained on every emit path incl. the self-contained fallback. **INV-5**
  skill-patterns §A–§L preserved; no new flags; `argument-hint` unchanged.
