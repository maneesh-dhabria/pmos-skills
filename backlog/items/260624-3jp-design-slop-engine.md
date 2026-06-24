---
schema_version: 1
id: 260624-3jp
kind: epic
title: "Design-slop engine — vendored _shared/slop-engine (pmos-native, NOTICE-credited) + /design-crit detect pre-pass + /verify slop gate + prevention reference & drift-lint"
type: feature
status: defined
priority: should
labels: [pmos-toolkit, design-slop, slop-engine, design-quality, frontend]
route: skill
created: 2026-06-24
updated: 2026-06-24
defined: 2026-06-24
source: docs/pmos/features/2026-06-24_design-slop-engine/02_design.html
feature_folder: docs/pmos/features/2026-06-24_design-slop-engine/
design_doc: docs/pmos/features/2026-06-24_design-slop-engine/02_design.html
parent:
dependencies: []
---

## Context

Port the capability of **impeccable** (`pbakaus/impeccable`, Apache-2.0) — a deterministic
frontend "design-slop" + design-quality detector — into pmos as a **both-faces** capability,
threaded through the pipeline we already own rather than shipped as a standalone plugin.

Impeccable has two faces driven from one source of truth (a 44-rule registry + pure
`checkXxx()` functions doing real contrast/border/font/spacing math — **zero LLM, zero API
key**): a **detector** (CLI / browser overlay / extension) and a **prevention skill** (DON'T
rules grouped by section that a coding agent loads to avoid slop while generating). A build
step cross-validates the two so they never drift.

**Decided in the /shape session (this is a solution-architecture port, not a new problem):**

- **Vendor the engine, once, as shared substrate** — `_shared/slop-engine/`. Copy impeccable's
  check logic verbatim (the proven 44 rules), but rename **every** identifier / global / CSS
  class / user-visible string to pmos-native (no "impeccable" string anywhere in code or UI).
  The only residual tie is one Apache-2.0 `NOTICE` crediting `pbakaus/impeccable` (legally
  required when copying), plus a lineage note in the design doc. (D-NAMING, D-VENDOR.)
- **No new slash command.** The engine is a *script* (skill-patterns §H: deterministic =
  script, never LLM-judged); its homes are skills we already own.
- **Three consumers of the one engine:**
  - **`/design-crit`** gains a deterministic slop **pre-pass** — it already launches Playwright,
    so it injects the browser detector, reads findings from the DOM, then layers its existing
    LLM Nielsen/WCAG/PSYCH critique on top.
  - **`/verify`** frontend-QA **hard gate** calls the *same* engine via the cheap Node/jsdom
    path (no Playwright); findings route through `_shared/findings-dispositions.md`; tiered
    mandatory-for-UI / skipped-for-non-UI.
  - **Prevention reference** `_shared/design-slop-rules.md` (DON'T lines grouped by section,
    generated from the registry's `skillGuideline` fields) cited as a *floor* by `/wireframes`,
    `/prototype`, and frontend `/execute`.
- **Drift-guard lint** in repo-root `tools/`, wired into `skill-hygiene.yml`, asserting every
  engine rule's `skillGuideline` substring appears in the prevention reference (ports
  impeccable's cross-validator — the property that keeps detection and prevention honest).

This complements, does not duplicate, the existing **LLM-judged** `/design-crit` + `/msf-wf`
(Nielsen / WCAG / PSYCH): the slop engine is **deterministic** and taste/freshness-focused
("AI tells").

Note: this repo already carries impeccable's own maintenance agent at
`plugins/pmos-toolkit/agents/anti-patterns.md` (reference only) — but **no engine code is
ported yet**; this epic does the port.

## Stories (carved during define)

- **A · engine-vendor** (substrate, foundational, no dep) — `_shared/slop-engine/` with
  pmos-native registry + verbatim checks + jsdom Node adapter + browser adapter + `NOTICE` +
  ported fixtures/tests.
- **B · design-crit detect pre-pass** (dep: A) — `/design-crit` browser-detector injection +
  findings surfaced ahead of the LLM critique.
- **C · verify slop gate** (dep: A) — `/verify` frontend hard gate via Node/jsdom path,
  findings → dispositions, tiered.
- **D · prevention reference + drift-lint** (dep: A) — `_shared/design-slop-rules.md` generated
  from the registry, cited by generators, + repo-root drift lint in `skill-hygiene.yml`.

Decision log (D1–Dn) lives in `02_design.html`.
