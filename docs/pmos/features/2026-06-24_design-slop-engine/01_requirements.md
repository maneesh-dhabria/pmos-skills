# Requirements — Design-slop engine (epic 260624-3jp, route: skill)

**Tier:** 3 (multi-surface: new substrate + 4 skill edits + CI lint). **Standing acceptance criteria:** the produced/revised skills must conform to `plugins/pmos-toolkit/skills/feature-sdlc/reference/skill-patterns.md §A–§L`, plus the host-repo `CLAUDE.md` policies (canonical skill path, manifest version-sync, release entry point). This is a light epic-level framing; the cross-skill contract is `02_design.html`.

## Problem

pmos can *generate* UI (`/wireframes`, `/prototype`, frontend `/execute`) and *critique* it with LLM judgement (`/design-crit`, `/msf-wf`), but it has **no deterministic detector** for "AI design slop" (the templated tells — purple/cyan gradients, gradient text, icon-tile-above-heading, thick side-accent borders) or for mechanical design-quality faults (WCAG contrast, line length, line-height, justified text, skipped headings). LLM-by-eye judgement is the wrong tool for contrast-ratio arithmetic and pixel/border checks (skill-patterns §H: deterministic work belongs in a script). The result: pmos-generated frontends can ship templated, sloppy UI that nothing in the pipeline reliably catches, and nothing steers the generators away from slop up front.

## Who feels it, and when

- A PM/dev running `/wireframes` or `/prototype` and getting back generic "AI-looking" UI.
- `/verify` passing a frontend feature that visibly reads as AI-generated slop.
- Anyone reviewing a pmos artifact who can see the tells but has no objective, repeatable check.

## Solution direction (converged in /shape — see 02_design.html)

Port impeccable's deterministic engine **once** as vendored shared substrate (`_shared/slop-engine/`, pmos-native names, Apache-2.0 `NOTICE`), and wire its two faces through skills we already own — **detect** (`/design-crit` pre-pass + `/verify` gate) and **prevent** (a generated `_shared/design-slop-rules.md` floor cited by the generators), kept in sync by a drift-guard lint. **No new slash command.**

## Scope

**In:** vendor + rename the engine; jsdom Node adapter + browser adapter; `/design-crit` pre-pass; `/verify` frontend hard gate (tiered, dispositioned); generated prevention reference; generator citations; repo-root drift lint in CI; ported fixtures/tests; NOTICE attribution.

**Out (this epic):** a standalone `/slop` slash command; a browser extension; a public website/overlay product; live-URL crawling beyond what `/design-crit`'s existing Playwright session already does; authoring net-new rules beyond impeccable's set (extension is post-port).

## User journeys

1. **Generate → prevented:** run `/wireframes`; the generator reads the slop-rules floor and avoids the tells; output is non-templated.
2. **Critique → detected + judged:** run `/design-crit` on an app; the deterministic slop pre-pass flags `side-tab` / `gradient-text` / low-contrast objectively, then the LLM critique adds UX judgement on top.
3. **Verify → gated:** run `/verify` on a frontend feature; the slop gate runs the engine (no browser), surfaces findings as dispositions, blocks on blockers per tier.
4. **Maintain → drift-guarded:** add/edit a rule; CI fails if the rule's guidance substring isn't in the prevention reference.

## Constraints

- Honor the repo's vendored / no-npm posture: drive the Node path via **jsdom** (already a pattern in `agents/anti-patterns.md`), keep `checks.mjs` logic verbatim. (D-VENDOR / D-DEPS — final dep decision in 02_design.html.)
- pmos-native naming everywhere (D-NAMING); the only impeccable string is the `NOTICE`.
- The detector is **deterministic, zero-LLM, offline** (skill-patterns §H hard gate).
- `/verify` is non-skippable; the slop gate must degrade gracefully on non-UI features and when jsdom is unavailable.
